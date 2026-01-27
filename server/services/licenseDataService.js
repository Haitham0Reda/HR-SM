import { LicenseServerClient, LicenseServerError } from './licenseServerClient.js';
import { 
  getCachedLicense, 
  isCacheStale, 
  updateLicenseCache, 
  invalidateCache 
} from './licenseCache.js';
import logger from '../utils/logger.js';

/**
 * License Data Service
 * 
 * High-level service that integrates License Server API calls with local caching.
 * Implements fallback logic to use cached data when License Server is unavailable.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.5
 */
class LicenseDataService {
  /**
   * Create a new License Data Service
   * 
   * @param {LicenseServerClient} licenseServerClient - Configured License Server client
   */
  constructor(licenseServerClient) {
    if (!licenseServerClient) {
      throw new Error('License Server client is required');
    }

    this.licenseServerClient = licenseServerClient;
  }

  /**
   * Get tenant information with caching and fallback
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {object} connection - MongoDB connection for the tenant database
   * @param {object} options - Additional options
   * @param {boolean} options.forceRefresh - Force refresh from License Server
   * @returns {Promise<object>} Tenant data
   * 
   * Requirements: 4.1, 4.4, 5.1
   */
  async getTenant(tenantId, connection = null, options = {}) {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Check cache first unless force refresh is requested
      if (!options.forceRefresh) {
        const cachedLicense = await getCachedLicense(tenantId, connection);

        if (cachedLicense && !isCacheStale(cachedLicense)) {
          logger.debug('Using fresh cached license data', {
            tenantId,
            source: 'cache'
          });

          return this._formatTenantFromCache(cachedLicense);
        }
      }

      // Cache miss or stale - query License Server
      try {
        const tenantData = await this.licenseServerClient.getTenant(tenantId);
        
        // Update cache with fresh data
        await updateLicenseCache(tenantId, tenantData, connection);

        logger.info('Retrieved tenant from License Server and updated cache', {
          tenantId,
          source: 'license_server'
        });

        return tenantData;
      } catch (error) {
        // License Server unavailable - fallback to stale cache
        return await this._handleLicenseServerFailure(
          'getTenant',
          tenantId,
          connection,
          error
        );
      }
    } catch (error) {
      logger.error('Failed to get tenant data', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get enabled modules with caching and fallback
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {object} connection - MongoDB connection for the tenant database
   * @param {object} options - Additional options
   * @param {boolean} options.forceRefresh - Force refresh from License Server
   * @returns {Promise<string[]>} Array of enabled module IDs
   * 
   * Requirements: 4.2, 4.4, 5.1
   */
  async getEnabledModules(tenantId, connection = null, options = {}) {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Check cache first unless force refresh is requested
      if (!options.forceRefresh) {
        const cachedLicense = await getCachedLicense(tenantId, connection);

        if (cachedLicense && !isCacheStale(cachedLicense)) {
          const modules = cachedLicense.quickAccess?.enabledModules || [];
          
          logger.debug('Using cached enabled modules', {
            tenantId,
            moduleCount: modules.length,
            source: 'cache'
          });

          return modules;
        }
      }

      // Cache miss or stale - query License Server
      try {
        const modules = await this.licenseServerClient.getEnabledModules(tenantId);
        
        // Update cache with fresh data
        await updateLicenseCache(
          tenantId, 
          { enabledModules: modules },
          connection
        );

        logger.info('Retrieved enabled modules from License Server and updated cache', {
          tenantId,
          moduleCount: modules.length,
          source: 'license_server'
        });

        return modules;
      } catch (error) {
        // License Server unavailable - fallback to stale cache
        const fallbackData = await this._handleLicenseServerFailure(
          'getEnabledModules',
          tenantId,
          connection,
          error
        );

        return fallbackData.enabledModules || [];
      }
    } catch (error) {
      logger.error('Failed to get enabled modules', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check if a specific module is enabled with caching and fallback
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {string} moduleId - The module identifier to check
   * @param {object} connection - MongoDB connection for the tenant database
   * @param {object} options - Additional options
   * @returns {Promise<boolean>} True if module is enabled
   * 
   * Requirements: 4.2, 4.4, 5.1
   */
  async isModuleEnabled(tenantId, moduleId, connection = null, options = {}) {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      if (!moduleId) {
        throw new Error('Module ID is required');
      }

      const modules = await this.getEnabledModules(tenantId, connection, options);
      const isEnabled = modules.includes(moduleId);

      logger.debug('Module enablement check', {
        tenantId,
        moduleId,
        isEnabled
      });

      return isEnabled;
    } catch (error) {
      logger.error('Failed to check module enablement', {
        tenantId,
        moduleId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate license with caching and fallback
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {string} licenseKey - The license key to validate
   * @param {object} connection - MongoDB connection for the tenant database
   * @returns {Promise<object>} Validation result
   * 
   * Requirements: 4.3, 4.4
   */
  async validateLicense(tenantId, licenseKey, connection = null) {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      if (!licenseKey) {
        throw new Error('License key is required');
      }

      // Always try License Server for validation (security-critical operation)
      try {
        const validationResult = await this.licenseServerClient.validateLicense(
          tenantId,
          licenseKey
        );

        // Update cache with validation result
        if (validationResult.valid) {
          await updateLicenseCache(tenantId, validationResult, connection);
        }

        logger.info('License validated via License Server', {
          tenantId,
          valid: validationResult.valid
        });

        return validationResult;
      } catch (error) {
        // License Server unavailable - use cached data with warning
        logger.warn('License Server unavailable during validation, using cached data', {
          tenantId,
          error: error.message
        });

        const cachedLicense = await getCachedLicense(tenantId, connection);

        if (!cachedLicense) {
          throw new Error('License Server unavailable and no cached license data available');
        }

        // Return cached validation result with warning
        return {
          valid: cachedLicense.quickAccess?.licenseValid || false,
          cached: true,
          warning: 'Validation performed using cached data - License Server unavailable',
          subscription: {
            status: cachedLicense.quickAccess?.subscriptionStatus || 'unknown',
            expiresAt: cachedLicense.quickAccess?.expiresAt
          },
          enabledModules: cachedLicense.quickAccess?.enabledModules || []
        };
      }
    } catch (error) {
      logger.error('Failed to validate license', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get subscription details with caching and fallback
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {object} connection - MongoDB connection for the tenant database
   * @param {object} options - Additional options
   * @returns {Promise<object>} Subscription details
   * 
   * Requirements: 4.1, 4.4, 5.1
   */
  async getSubscription(tenantId, connection = null, options = {}) {
    try {
      const tenant = await this.getTenant(tenantId, connection, options);
      return tenant.subscription || null;
    } catch (error) {
      logger.error('Failed to get subscription', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Invalidate cache for a tenant
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {object} connection - MongoDB connection for the tenant database
   * @returns {Promise<object>} Invalidation result
   * 
   * Requirements: 5.3
   */
  async invalidateTenantCache(tenantId, connection = null) {
    try {
      const result = await invalidateCache(tenantId, connection);
      
      logger.info('Tenant cache invalidated', {
        tenantId,
        result
      });

      return result;
    } catch (error) {
      logger.error('Failed to invalidate tenant cache', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle License Server failure by falling back to cached data
   * 
   * @private
   * @param {string} operation - The operation that failed
   * @param {string} tenantId - The tenant identifier
   * @param {object} connection - MongoDB connection
   * @param {Error} error - The original error
   * @returns {Promise<object>} Cached data
   * @throws {Error} If no cached data is available
   * 
   * Requirements: 4.4, 4.5, 5.5
   */
  async _handleLicenseServerFailure(operation, tenantId, connection, error) {
    logger.warn('License Server unavailable, attempting fallback to cached data', {
      operation,
      tenantId,
      error: error.message,
      errorType: error.constructor.name
    });

    // Try to get cached data (even if stale)
    const cachedLicense = await getCachedLicense(tenantId, connection);

    if (!cachedLicense) {
      logger.error('License Server unavailable and no cached data available', {
        operation,
        tenantId
      });
      throw new Error(
        `License Server unavailable and no cached license data available for tenant ${tenantId}`
      );
    }

    // Log warning about using stale cache
    const cacheAge = this._getCacheAge(cachedLicense);
    logger.warn('Using stale cached license data due to License Server unavailability', {
      operation,
      tenantId,
      cacheAgeHours: cacheAge.hours,
      cacheAgeMinutes: cacheAge.minutes,
      lastSyncedAt: cachedLicense.quickAccess?.lastSyncedAt || 
                    cachedLicense.cacheInfo?.lastSyncedFromServer,
      warning: 'Data may be outdated'
    });

    // Return formatted cached data
    return this._formatTenantFromCache(cachedLicense);
  }

  /**
   * Format tenant data from cached license
   * 
   * @private
   * @param {object} cachedLicense - Cached license document
   * @returns {object} Formatted tenant data
   */
  _formatTenantFromCache(cachedLicense) {
    return {
      tenantId: cachedLicense.companyId,
      name: cachedLicense.companyName || cachedLicense.companyId,
      subscription: {
        status: cachedLicense.quickAccess?.subscriptionStatus || 
                cachedLicense.quickAccess?.status || 
                'unknown',
        expiresAt: cachedLicense.quickAccess?.expiresAt,
        plan: cachedLicense.quickAccess?.licenseType || 'unknown'
      },
      enabledModules: cachedLicense.quickAccess?.enabledModules || [],
      cached: true,
      lastSyncedAt: cachedLicense.quickAccess?.lastSyncedAt || 
                    cachedLicense.cacheInfo?.lastSyncedFromServer
    };
  }

  /**
   * Calculate cache age
   * 
   * @private
   * @param {object} cachedLicense - Cached license document
   * @returns {object} Cache age in hours and minutes
   */
  _getCacheAge(cachedLicense) {
    const lastSyncedAt = cachedLicense.quickAccess?.lastSyncedAt || 
                         cachedLicense.cacheInfo?.lastSyncedFromServer;

    if (!lastSyncedAt) {
      return { hours: Infinity, minutes: Infinity };
    }

    const ageMs = Date.now() - new Date(lastSyncedAt).getTime();
    const hours = Math.floor(ageMs / (60 * 60 * 1000));
    const minutes = Math.floor((ageMs % (60 * 60 * 1000)) / (60 * 1000));

    return { hours, minutes };
  }
}

/**
 * Create a configured License Data Service instance
 * 
 * @param {object} config - Configuration options
 * @param {string} config.licenseServerUrl - License Server base URL
 * @param {string} config.licenseServerApiKey - API key for authentication
 * @param {object} config.clientOptions - Additional client options
 * @returns {LicenseDataService} Configured service instance
 */
export function createLicenseDataService(config) {
  if (!config) {
    throw new Error('Configuration is required');
  }

  if (!config.licenseServerUrl) {
    throw new Error('License Server URL is required');
  }

  if (!config.licenseServerApiKey) {
    throw new Error('License Server API key is required');
  }

  const licenseServerClient = new LicenseServerClient(
    config.licenseServerUrl,
    config.licenseServerApiKey,
    config.clientOptions || {}
  );

  return new LicenseDataService(licenseServerClient);
}

export default LicenseDataService;
