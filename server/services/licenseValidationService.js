import axios from 'axios';
import crypto from 'crypto';
import os from 'os';
import cron from 'node-cron';
import Tenant from '../platform/tenants/models/Tenant.js';
import logger from '../utils/logger.js';
import auditLoggerService from './auditLogger.service.js';

/**
 * License Validation Service
 * Handles periodic validation of licenses with the separate license server
 * Provides background validation, health monitoring, and tenant license management
 */

class LicenseValidationService {
  constructor() {
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
    this.validationInterval = process.env.LICENSE_VALIDATION_INTERVAL || '*/15 * * * *'; // Every 15 minutes
    this.isRunning = false;
    this.cronJob = null;
    this.machineId = null;
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      lastValidationTime: null,
      serverStatus: 'unknown'
    };
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      this.machineId = this.generateMachineId();
      logger.info('License validation service initialized', {
        licenseServerUrl: this.licenseServerUrl,
        validationInterval: this.validationInterval,
        machineId: this.machineId.substring(0, 8) + '...'
      });
      return true;
    } catch (error) {
      logger.error('Failed to initialize license validation service', { error: error.message });
      return false;
    }
  }

  /**
   * Start periodic validation
   */
  start() {
    if (this.isRunning) {
      logger.warn('License validation service is already running');
      return;
    }

    try {
      this.cronJob = cron.schedule(this.validationInterval, async () => {
        await this.performPeriodicValidation();
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.cronJob.start();
      this.isRunning = true;

      logger.info('License validation service started', {
        interval: this.validationInterval
      });

      // Perform initial validation
      setTimeout(() => this.performPeriodicValidation(), 5000);

    } catch (error) {
      logger.error('Failed to start license validation service', { error: error.message });
    }
  }

  /**
   * Stop periodic validation
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
    }

    this.isRunning = false;
    logger.info('License validation service stopped');
  }

  /**
   * Generate machine ID for hardware fingerprinting
   * @returns {string} Machine ID hash
   */
  generateMachineId() {
    try {
      const systemInfo = {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalmem: os.totalmem(),
        networkInterfaces: Object.keys(os.networkInterfaces()).sort().join(',')
      };

      return crypto
        .createHash('sha256')
        .update(JSON.stringify(systemInfo))
        .digest('hex')
        .substring(0, 32);
    } catch (error) {
      logger.error('Failed to generate machine ID', { error: error.message });
      return crypto.createHash('sha256').update(os.hostname()).digest('hex').substring(0, 32);
    }
  }

  /**
   * Perform periodic validation of all tenant licenses
   */
  async performPeriodicValidation() {
    const startTime = Date.now();
    logger.debug('Starting periodic license validation');

    try {
      // Check license server health first
      const serverHealth = await this.checkLicenseServerHealth();
      this.stats.serverStatus = serverHealth.status;

      if (!serverHealth.healthy) {
        logger.warn('License server is not healthy, skipping validation', {
          status: serverHealth.status,
          error: serverHealth.error
        });
        return;
      }

      // Get all active tenants with licenses
      const tenants = await Tenant.find({
        status: 'active',
        'license.licenseKey': { $exists: true, $ne: null }
      }).select('tenantId license billing usage');

      logger.debug(`Found ${tenants.length} tenants with licenses to validate`);

      const validationPromises = tenants.map(tenant => 
        this.validateTenantLicense(tenant).catch(error => {
          logger.error('Tenant license validation failed', {
            tenantId: tenant.tenantId,
            error: error.message
          });
          return { tenantId: tenant.tenantId, success: false, error: error.message };
        })
      );

      const results = await Promise.allSettled(validationPromises);
      
      // Process results
      let successful = 0;
      let failed = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.success) {
          successful++;
        } else {
          failed++;
          const tenant = tenants[index];
          logger.warn('Periodic validation failed for tenant', {
            tenantId: tenant?.tenantId,
            error: result.reason?.message || result.value?.error
          });
        }
      });

      // Update stats
      this.stats.totalValidations += tenants.length;
      this.stats.successfulValidations += successful;
      this.stats.failedValidations += failed;
      this.stats.lastValidationTime = new Date();

      const duration = Date.now() - startTime;
      logger.info('Periodic license validation completed', {
        totalTenants: tenants.length,
        successful,
        failed,
        duration: `${duration}ms`
      });

    } catch (error) {
      logger.error('Periodic license validation error', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Validate a specific tenant's license
   * @param {Object} tenant - Tenant document
   * @returns {Promise<Object>} Validation result
   */
  async validateTenantLicense(tenant) {
    const startTime = Date.now();
    
    try {
      const validationResult = await this.callLicenseServer(
        tenant.license.licenseKey,
        this.machineId
      );

      const duration = Date.now() - startTime;

      if (!validationResult.success) {
        // Log failed validation attempt
        await auditLoggerService.logLicenseValidation({
          licenseId: tenant.license.licenseId,
          licenseNumber: tenant.license.licenseNumber,
          tenantId: tenant.tenantId,
          licenseType: tenant.license.licenseType,
          machineId: this.machineId,
          valid: false,
          error: validationResult.error,
          duration
        });

        // Update tenant license status
        await this.updateTenantLicenseStatus(tenant.tenantId, {
          lastValidatedAt: new Date(),
          validationError: validationResult.error
        });

        return {
          tenantId: tenant.tenantId,
          success: false,
          error: validationResult.error
        };
      }

      const { data: validationData } = validationResult;

      // Log successful validation
      await auditLoggerService.logLicenseValidation({
        licenseId: tenant.license.licenseId,
        licenseNumber: tenant.license.licenseNumber,
        tenantId: tenant.tenantId,
        licenseType: tenant.license.licenseType,
        machineId: this.machineId,
        valid: validationData.valid,
        error: validationData.valid ? null : validationData.error,
        duration
      });

      // Update tenant with validation results
      const updateData = {
        lastValidatedAt: new Date(),
        validationCount: (tenant.license.validationCount || 0) + 1
      };

      if (!validationData.valid) {
        updateData.validationError = validationData.error || 'License invalid';
        
        // If license is expired or revoked, update tenant status
        if (validationData.error === 'LICENSE_EXPIRED' || validationData.error === 'LICENSE_REVOKED') {
          await Tenant.findOneAndUpdate(
            { tenantId: tenant.tenantId },
            { 
              status: 'suspended',
              'license': { ...tenant.license, ...updateData }
            }
          );

          // Log tenant suspension
          await auditLoggerService.logTenantManagement({
            action: 'tenant_suspend',
            tenantId: tenant.tenantId,
            performedBy: 'system',
            changes: {
              before: { status: 'active' },
              after: { status: 'suspended', reason: validationData.error },
              fields: ['status', 'suspensionReason']
            },
            licenseInfo: {
              licenseNumber: tenant.license.licenseNumber,
              tenantId: tenant.tenantId,
              licenseType: tenant.license.licenseType
            }
          });

          logger.warn('Tenant suspended due to license issue', {
            tenantId: tenant.tenantId,
            error: validationData.error
          });
        }
      } else {
        // License is valid, ensure tenant is active
        if (tenant.status === 'suspended') {
          await Tenant.findOneAndUpdate(
            { tenantId: tenant.tenantId },
            { 
              status: 'active',
              'license': { ...tenant.license, ...updateData }
            }
          );

          // Log tenant reactivation
          await auditLoggerService.logTenantManagement({
            action: 'tenant_reactivate',
            tenantId: tenant.tenantId,
            performedBy: 'system',
            changes: {
              before: { status: 'suspended' },
              after: { status: 'active', reason: 'license_validated' },
              fields: ['status', 'reactivationReason']
            },
            licenseInfo: {
              licenseNumber: tenant.license.licenseNumber,
              tenantId: tenant.tenantId,
              licenseType: tenant.license.licenseType
            }
          });

          logger.info('Tenant reactivated after successful license validation', {
            tenantId: tenant.tenantId
          });
        } else {
          await this.updateTenantLicenseStatus(tenant.tenantId, updateData);
        }
      }

      return {
        tenantId: tenant.tenantId,
        success: true,
        valid: validationData.valid,
        features: validationData.features,
        expiresAt: validationData.expiresAt
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log validation error
      await auditLoggerService.logLicenseValidation({
        licenseId: tenant.license.licenseId,
        licenseNumber: tenant.license.licenseNumber,
        tenantId: tenant.tenantId,
        licenseType: tenant.license.licenseType,
        machineId: this.machineId,
        valid: false,
        error: error.message,
        duration
      });

      logger.error('Tenant license validation error', {
        tenantId: tenant.tenantId,
        error: error.message
      });

      await this.updateTenantLicenseStatus(tenant.tenantId, {
        lastValidatedAt: new Date(),
        validationError: error.message
      });

      return {
        tenantId: tenant.tenantId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update tenant license status
   * @param {string} tenantId - Tenant ID
   * @param {Object} updateData - Data to update
   */
  async updateTenantLicenseStatus(tenantId, updateData) {
    try {
      await Tenant.findOneAndUpdate(
        { tenantId },
        { 
          $set: Object.keys(updateData).reduce((acc, key) => {
            acc[`license.${key}`] = updateData[key];
            return acc;
          }, {})
        }
      );
    } catch (error) {
      logger.error('Failed to update tenant license status', {
        tenantId,
        error: error.message
      });
    }
  }

  /**
   * Check license server health
   * @returns {Promise<Object>} Health check result
   */
  async checkLicenseServerHealth() {
    try {
      const response = await axios.get(`${this.licenseServerUrl}/health`, {
        timeout: 5000
      });

      return {
        healthy: true,
        status: 'online',
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'offline',
        error: error.message
      };
    }
  }

  /**
   * Call license server validation endpoint
   * @param {string} licenseToken - JWT license token
   * @param {string} machineId - Machine identifier
   * @returns {Promise<Object>} Validation result
   */
  async callLicenseServer(licenseToken, machineId) {
    try {
      // Get API key from environment
      const apiKey = process.env.LICENSE_SERVER_API_KEY;
      
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'HR-SM-Background-Validator/1.0'
      };

      // Add API key authentication if available
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      } else {
        logger.warn('LICENSE_SERVER_API_KEY not configured for background validation');
      }

      const response = await axios.post(`${this.licenseServerUrl}/licenses/validate`, {
        token: licenseToken,
        machineId: machineId
      }, {
        timeout: 10000, // 10 second timeout for background validation
        headers
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.response?.status
      };
    }
  }

  /**
   * Manually validate a specific tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Validation result
   */
  async validateSpecificTenant(tenantId) {
    try {
      const tenant = await Tenant.findOne({ tenantId }).select('tenantId license');
      
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      if (!tenant.license?.licenseKey) {
        throw new Error('Tenant has no license key');
      }

      return await this.validateTenantLicense(tenant);
    } catch (error) {
      logger.error('Manual tenant validation failed', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      validationInterval: this.validationInterval,
      licenseServerUrl: this.licenseServerUrl,
      machineId: this.machineId ? this.machineId.substring(0, 8) + '...' : null
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      lastValidationTime: null,
      serverStatus: 'unknown'
    };
    logger.info('License validation service stats reset');
  }
}

// Create singleton instance
const licenseValidationService = new LicenseValidationService();

export default licenseValidationService;