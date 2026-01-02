import axios from 'axios';
import mongoose from 'mongoose';
import CompanyLicense from '../models/CompanyLicense.js';
import logger from '../utils/logger.js';

/**
 * License Synchronization Service
 * Handles syncing licenses between License Server and Company Databases
 */
class LicenseSyncService {
  constructor() {
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:3001';
    this.syncInterval = parseInt(process.env.LICENSE_SYNC_INTERVAL) || 6 * 60 * 60 * 1000; // 6 hours
    this.maxRetries = 5;
    this.syncInProgress = false;
  }

  /**
   * Initialize the sync service
   */
  async initialize() {
    logger.info('Initializing License Sync Service');
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Sync on startup
    await this.syncLicenseFromServer();
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync() {
    setInterval(async () => {
      if (!this.syncInProgress) {
        await this.syncLicenseFromServer();
      }
    }, this.syncInterval);
    
    logger.info(`License sync scheduled every ${this.syncInterval / 1000 / 60} minutes`);
  }

  /**
   * Sync license from License Server to Company Database
   */
  async syncLicenseFromServer(companyId = null) {
    if (this.syncInProgress) {
      logger.warn('License sync already in progress, skipping');
      return { success: false, reason: 'sync_in_progress' };
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      // Get company ID from environment or parameter
      const targetCompanyId = companyId || process.env.COMPANY_ID;
      if (!targetCompanyId) {
        throw new Error('Company ID not provided');
      }

      logger.info(`Starting license sync for company: ${targetCompanyId}`);

      // Fetch license from License Server
      const licenseData = await this.fetchLicenseFromServer(targetCompanyId);
      
      if (!licenseData) {
        throw new Error('No license data received from server');
      }

      // Update or create local license copy
      const result = await this.updateLocalLicense(licenseData);
      
      const duration = Date.now() - startTime;
      
      logger.info(`License sync completed successfully in ${duration}ms`, {
        companyId: targetCompanyId,
        licenseId: licenseData.licenseId,
        duration
      });

      return {
        success: true,
        licenseId: licenseData.licenseId,
        duration,
        result
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('License sync failed', {
        error: error.message,
        duration,
        companyId: companyId || process.env.COMPANY_ID
      });

      // Handle sync failure
      await this.handleSyncFailure(error);

      return {
        success: false,
        error: error.message,
        duration
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Fetch license data from License Server
   */
  async fetchLicenseFromServer(companyId) {
    const url = `${this.licenseServerUrl}/api/licenses/company/${companyId}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${process.env.LICENSE_SERVER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Company-ID': companyId
        },
        timeout: 30000 // 30 seconds timeout
      });

      if (response.status !== 200) {
        throw new Error(`License server returned status ${response.status}`);
      }

      return response.data.license;
    } catch (error) {
      if (error.response) {
        throw new Error(`License server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        throw new Error('License server unreachable');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Update local license copy in company database
   */
  async updateLocalLicense(licenseData) {
    try {
      // Find existing license
      let companyLicense = await CompanyLicense.findOne({
        licenseId: licenseData.licenseId
      }).select('+encryptedLicenseData');

      const encryptionKey = licenseData.encryptionKey;
      
      if (companyLicense) {
        // Update existing license
        companyLicense.updateEncryptedData(licenseData, encryptionKey);
        companyLicense.recordSyncAttempt({ successful: true });
        
        await companyLicense.save();
        
        logger.info('Updated existing company license', {
          licenseId: licenseData.licenseId,
          licenseNumber: licenseData.licenseNumber
        });

        return { action: 'updated', licenseId: licenseData.licenseId };
      } else {
        // Create new license
        companyLicense = CompanyLicense.createFromServerData(licenseData, encryptionKey);
        companyLicense.recordSyncAttempt({ successful: true });
        
        await companyLicense.save();
        
        logger.info('Created new company license', {
          licenseId: licenseData.licenseId,
          licenseNumber: licenseData.licenseNumber
        });

        return { action: 'created', licenseId: licenseData.licenseId };
      }
    } catch (error) {
      logger.error('Failed to update local license', {
        error: error.message,
        licenseId: licenseData.licenseId
      });
      throw error;
    }
  }

  /**
   * Handle sync failure
   */
  async handleSyncFailure(error) {
    try {
      // Find all licenses that need sync retry
      const licenses = await CompanyLicense.find({
        'syncStatus.syncRetryCount': { $lt: this.maxRetries }
      });

      for (const license of licenses) {
        license.recordSyncAttempt({
          successful: false,
          error: error.message
        });
        
        // Enable offline mode if sync failures are persistent
        if (license.syncStatus.syncFailureCount >= 3) {
          license.enableOfflineMode(72); // 72 hours grace period
          logger.warn('Enabled offline mode for license due to sync failures', {
            licenseId: license.licenseId,
            failureCount: license.syncStatus.syncFailureCount
          });
        }
        
        await license.save();
      }
    } catch (saveError) {
      logger.error('Failed to handle sync failure', {
        originalError: error.message,
        saveError: saveError.message
      });
    }
  }

  /**
   * Validate license with License Server
   */
  async validateLicenseWithServer(licenseId, usageData = null) {
    const url = `${this.licenseServerUrl}/api/licenses/${licenseId}/validate`;
    
    try {
      const payload = {
        licenseId,
        timestamp: new Date().toISOString(),
        usage: usageData
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${process.env.LICENSE_SERVER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 seconds timeout
      });

      return {
        valid: response.data.valid,
        online: true,
        result: response.data,
        timestamp: new Date()
      };
    } catch (error) {
      logger.warn('Online license validation failed, falling back to offline', {
        licenseId,
        error: error.message
      });

      return {
        valid: false,
        online: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate license locally (offline mode)
   */
  async validateLicenseLocally(licenseId) {
    try {
      const companyLicense = await CompanyLicense.findOne({
        licenseId
      }).select('+encryptedLicenseData');

      if (!companyLicense) {
        return {
          valid: false,
          reason: 'license_not_found',
          offline: true
        };
      }

      // Check if license can operate offline
      if (!companyLicense.canOperateOffline()) {
        return {
          valid: false,
          reason: 'offline_mode_not_available',
          offline: true
        };
      }

      // Validate license integrity and expiry
      const isValid = companyLicense.isValid() && !companyLicense.isExpired();
      
      // Record offline validation
      companyLicense.recordValidation({
        valid: isValid,
        online: false
      });
      
      await companyLicense.save();

      return {
        valid: isValid,
        offline: true,
        validationsRemaining: companyLicense.offlineMode.offlineValidationsRemaining,
        gracePeriodUntil: companyLicense.offlineMode.gracePeriodUntil
      };
    } catch (error) {
      logger.error('Local license validation failed', {
        licenseId,
        error: error.message
      });

      return {
        valid: false,
        offline: true,
        error: error.message
      };
    }
  }

  /**
   * Get license status and information
   */
  async getLicenseStatus(companyId) {
    try {
      const companyLicense = await CompanyLicense.findActiveForCompany(companyId);
      
      if (!companyLicense) {
        return {
          found: false,
          message: 'No active license found for company'
        };
      }

      return {
        found: true,
        license: {
          licenseId: companyLicense.licenseId,
          licenseNumber: companyLicense.licenseNumber,
          licenseType: companyLicense.quickAccess.licenseType,
          status: companyLicense.quickAccess.status,
          expiresAt: companyLicense.quickAccess.expiresAt,
          maxUsers: companyLicense.quickAccess.maxUsers,
          enabledModules: companyLicense.quickAccess.enabledModules,
          isValid: companyLicense.isValid(),
          isExpired: companyLicense.isExpired(),
          needsValidation: companyLicense.needsValidation(),
          needsSync: companyLicense.needsSync(),
          offlineMode: companyLicense.offlineMode,
          lastSync: companyLicense.syncStatus.lastSuccessfulSync,
          lastValidation: companyLicense.validationStatus.lastValidated
        }
      };
    } catch (error) {
      logger.error('Failed to get license status', {
        companyId,
        error: error.message
      });

      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Force sync for specific license
   */
  async forceSyncLicense(licenseId) {
    try {
      const companyLicense = await CompanyLicense.findOne({ licenseId });
      
      if (!companyLicense) {
        throw new Error('License not found');
      }

      return await this.syncLicenseFromServer(companyLicense.companyId);
    } catch (error) {
      logger.error('Force sync failed', {
        licenseId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update usage data to License Server
   */
  async updateUsageToServer(licenseId, usageData) {
    const url = `${this.licenseServerUrl}/api/licenses/${licenseId}/usage`;
    
    try {
      const response = await axios.put(url, {
        licenseId,
        usage: usageData,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.LICENSE_SERVER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      return {
        success: true,
        result: response.data
      };
    } catch (error) {
      logger.warn('Failed to update usage to server', {
        licenseId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup expired offline validations
   */
  async cleanupExpiredOfflineValidations() {
    try {
      const result = await CompanyLicense.updateMany(
        {
          'offlineMode.enabled': true,
          'offlineMode.gracePeriodUntil': { $lt: new Date() }
        },
        {
          $set: {
            'offlineMode.enabled': false,
            'offlineMode.gracePeriodUntil': null,
            'offlineMode.offlineValidationsRemaining': 0
          }
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Disabled offline mode for ${result.modifiedCount} expired licenses`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to cleanup expired offline validations', {
        error: error.message
      });
      throw error;
    }
  }
}

export default new LicenseSyncService();