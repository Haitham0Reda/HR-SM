import CompanyLicense from '../models/CompanyLicense.js';
import licenseSyncService from './licenseSyncService.js';
import logger from '../utils/logger.js';

/**
 * License Validation Service - Platform Side
 * Handles license validation with fallback mechanisms
 */
class LicenseValidationService {
  constructor() {
    this.validationCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 1000;
    this.initialized = false;
    this.maintenanceInterval = null;
  }

  /**
   * Initialize the license validation service
   */
  async initialize() {
    try {
      logger.info('Initializing license validation service...');
      
      // Test database connection
      await CompanyLicense.findOne().limit(1);
      
      // Initialize sync service
      await licenseSyncService.initialize();
      
      this.initialized = true;
      logger.info('License validation service initialized successfully');
      return true;
      
    } catch (error) {
      logger.error('Failed to initialize license validation service', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Start the license validation service
   */
  start() {
    if (!this.initialized) {
      logger.warn('Cannot start license validation service - not initialized');
      return false;
    }

    // Start maintenance interval
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenance();
    }, 60 * 60 * 1000); // Run every hour

    logger.info('License validation service started');
    return true;
  }

  /**
   * Stop the license validation service
   */
  stop() {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    
    this.clearCache();
    this.initialized = false;
    logger.info('License validation service stopped');
  }

  /**
   * Validate license with multi-tier fallback
   * 1. Try online validation with License Server
   * 2. Fall back to local encrypted copy
   * 3. Fall back to offline mode if available
   */
  async validateLicense(companyId, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check cache first (if enabled)
      if (options.useCache !== false) {
        const cached = this.getCachedValidation(companyId);
        if (cached) {
          logger.debug('License validation served from cache', { companyId });
          return cached;
        }
      }

      // Get local license
      const companyLicense = await CompanyLicense.findActiveForCompany(companyId);
      
      if (!companyLicense) {
        return this.createValidationResult({
          valid: false,
          reason: 'no_license_found',
          companyId,
          processingTime: Date.now() - startTime
        });
      }

      // Try online validation first
      if (options.forceOffline !== true) {
        const onlineResult = await this.validateOnline(companyLicense, options);
        if (onlineResult.success) {
          const result = this.createValidationResult({
            valid: onlineResult.valid,
            online: true,
            license: onlineResult.license,
            companyId,
            processingTime: Date.now() - startTime
          });
          
          this.setCachedValidation(companyId, result);
          return result;
        }
      }

      // Fall back to local validation
      const localResult = await this.validateLocal(companyLicense, options);
      const result = this.createValidationResult({
        valid: localResult.valid,
        online: false,
        offline: localResult.offline,
        license: localResult.license,
        reason: localResult.reason,
        companyId,
        processingTime: Date.now() - startTime,
        fallbackUsed: true
      });

      this.setCachedValidation(companyId, result);
      return result;

    } catch (error) {
      logger.error('License validation failed', {
        companyId,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return this.createValidationResult({
        valid: false,
        error: error.message,
        companyId,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Validate license online with License Server
   */
  async validateOnline(companyLicense, options = {}) {
    try {
      const usageData = options.usageData || await this.getCurrentUsage(companyLicense.companyId);
      
      const result = await licenseSyncService.validateLicenseWithServer(
        companyLicense.licenseId,
        usageData
      );

      if (result.online && result.valid) {
        // Update local license with validation result
        companyLicense.recordValidation({
          valid: true,
          online: true
        });
        await companyLicense.save();

        return {
          success: true,
          valid: true,
          license: this.extractLicenseInfo(companyLicense),
          usage: usageData,
          serverResponse: result.result
        };
      }

      return {
        success: false,
        error: result.error || 'Online validation failed'
      };

    } catch (error) {
      logger.warn('Online license validation failed', {
        licenseId: companyLicense.licenseId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate license locally using encrypted copy
   */
  async validateLocal(companyLicense, options = {}) {
    try {
      // Check basic validity
      if (!companyLicense.isValid()) {
        return {
          valid: false,
          reason: companyLicense.isExpired() ? 'license_expired' : 'license_invalid',
          license: this.extractLicenseInfo(companyLicense)
        };
      }

      // Check if offline mode is available
      if (!companyLicense.canOperateOffline()) {
        return {
          valid: false,
          reason: 'offline_mode_unavailable',
          license: this.extractLicenseInfo(companyLicense)
        };
      }

      // Perform offline validation
      const offlineResult = await licenseSyncService.validateLicenseLocally(companyLicense.licenseId);
      
      return {
        valid: offlineResult.valid,
        offline: true,
        reason: offlineResult.reason,
        license: this.extractLicenseInfo(companyLicense),
        validationsRemaining: offlineResult.validationsRemaining,
        gracePeriodUntil: offlineResult.gracePeriodUntil
      };

    } catch (error) {
      logger.error('Local license validation failed', {
        licenseId: companyLicense.licenseId,
        error: error.message
      });

      return {
        valid: false,
        reason: 'validation_error',
        error: error.message
      };
    }
  }

  /**
   * Check if specific module is licensed
   */
  async validateModule(companyId, moduleId) {
    try {
      const validation = await this.validateLicense(companyId, { useCache: true });
      
      if (!validation.valid) {
        return {
          valid: false,
          reason: validation.reason || 'license_invalid',
          moduleId
        };
      }

      const enabledModules = validation.license?.enabledModules || [];
      const moduleEnabled = enabledModules.includes(moduleId);

      return {
        valid: moduleEnabled,
        reason: moduleEnabled ? 'module_licensed' : 'module_not_licensed',
        moduleId,
        licenseValid: validation.valid,
        online: validation.online
      };

    } catch (error) {
      logger.error('Module validation failed', {
        companyId,
        moduleId,
        error: error.message
      });

      return {
        valid: false,
        reason: 'validation_error',
        moduleId,
        error: error.message
      };
    }
  }

  /**
   * Check license limits
   */
  async checkLimits(companyId, currentUsage) {
    try {
      const validation = await this.validateLicense(companyId, { 
        useCache: true,
        usageData: currentUsage 
      });

      if (!validation.valid) {
        return {
          withinLimits: false,
          reason: 'license_invalid',
          violations: []
        };
      }

      const license = validation.license;
      const violations = [];

      // Check user limit
      if (license.maxUsers && currentUsage.users > license.maxUsers) {
        violations.push({
          type: 'users',
          current: currentUsage.users,
          limit: license.maxUsers,
          severity: 'high'
        });
      }

      // Check storage limit
      if (license.maxStorage && currentUsage.storage > license.maxStorage) {
        violations.push({
          type: 'storage',
          current: currentUsage.storage,
          limit: license.maxStorage,
          severity: 'medium'
        });
      }

      // Check API calls limit
      if (license.maxApiCallsPerMonth && currentUsage.apiCallsThisMonth > license.maxApiCallsPerMonth) {
        violations.push({
          type: 'apiCalls',
          current: currentUsage.apiCallsThisMonth,
          limit: license.maxApiCallsPerMonth,
          severity: 'low'
        });
      }

      return {
        withinLimits: violations.length === 0,
        violations,
        license: license,
        usage: currentUsage
      };

    } catch (error) {
      logger.error('License limits check failed', {
        companyId,
        error: error.message
      });

      return {
        withinLimits: false,
        reason: 'check_failed',
        error: error.message,
        violations: []
      };
    }
  }

  /**
   * Get current usage statistics
   */
  async getCurrentUsage(companyId) {
    try {
      // This would typically query your application's usage data
      // For now, return mock data - implement based on your needs
      
      const User = (await import('../modules/hr-core/users/models/user.model.js')).default;
      const userCount = await User.countDocuments({ tenantId: companyId });

      return {
        users: userCount,
        storage: 0, // Implement storage calculation
        apiCallsThisMonth: 0, // Implement API calls tracking
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.warn('Failed to get current usage', {
        companyId,
        error: error.message
      });

      return {
        users: 0,
        storage: 0,
        apiCallsThisMonth: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Extract license information for response
   */
  extractLicenseInfo(companyLicense) {
    return {
      licenseId: companyLicense.licenseId,
      licenseNumber: companyLicense.licenseNumber,
      licenseType: companyLicense.quickAccess.licenseType,
      status: companyLicense.quickAccess.status,
      expiresAt: companyLicense.quickAccess.expiresAt,
      maxUsers: companyLicense.quickAccess.maxUsers,
      enabledModules: companyLicense.quickAccess.enabledModules,
      lastSync: companyLicense.syncStatus.lastSuccessfulSync,
      lastValidation: companyLicense.validationStatus.lastValidated
    };
  }

  /**
   * Create standardized validation result
   */
  createValidationResult(data) {
    return {
      valid: data.valid,
      companyId: data.companyId,
      online: data.online || false,
      offline: data.offline || false,
      fallbackUsed: data.fallbackUsed || false,
      license: data.license || null,
      reason: data.reason || null,
      error: data.error || null,
      processingTime: data.processingTime || 0,
      timestamp: new Date(),
      cached: data.cached || false
    };
  }

  /**
   * Cache management
   */
  getCachedValidation(companyId) {
    const cached = this.validationCache.get(companyId);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return { ...cached, cached: true };
    }
    
    this.validationCache.delete(companyId);
    return null;
  }

  setCachedValidation(companyId, result) {
    // Implement LRU eviction if cache is full
    if (this.validationCache.size >= this.maxCacheSize) {
      const firstKey = this.validationCache.keys().next().value;
      this.validationCache.delete(firstKey);
    }
    
    this.validationCache.set(companyId, {
      ...result,
      cachedAt: Date.now()
    });
  }

  /**
   * Clear validation cache
   */
  clearCache(companyId = null) {
    if (companyId) {
      this.validationCache.delete(companyId);
    } else {
      this.validationCache.clear();
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      cacheSize: this.validationCache.size,
      maxCacheSize: this.maxCacheSize,
      cacheTimeout: this.cacheTimeout
    };
  }

  /**
   * Periodic maintenance tasks
   */
  async performMaintenance() {
    try {
      // Clean expired cache entries
      const now = Date.now();
      for (const [key, value] of this.validationCache.entries()) {
        if ((now - value.cachedAt) > this.cacheTimeout) {
          this.validationCache.delete(key);
        }
      }

      // Sync licenses that need updating
      await licenseSyncService.cleanupExpiredOfflineValidations();

      logger.debug('License validation maintenance completed', {
        cacheSize: this.validationCache.size
      });

    } catch (error) {
      logger.error('License validation maintenance failed', {
        error: error.message
      });
    }
  }
}

// Create and export the service instance
const licenseValidationService = new LicenseValidationService();

export default licenseValidationService;