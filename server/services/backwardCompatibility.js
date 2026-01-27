import logger from '../utils/logger.js';
import { getModelForConnection } from '../config/sharedModels.js';

/**
 * Backward Compatibility Service
 * 
 * Provides backward compatibility mode during migration transition.
 * Supports reading tenant data from both License Server (via cache) and local database.
 * Prioritizes License Server data when available.
 * 
 * Requirements: 6.1, 6.2, 6.5
 */

/**
 * Configuration for backward compatibility mode
 */
const compatibilityConfig = {
  // Enable/disable compatibility mode
  enabled: process.env.BACKWARD_COMPATIBILITY_MODE === 'true',
  
  // Data source priority: 'license_server' or 'local_database'
  primarySource: process.env.PRIMARY_DATA_SOURCE || 'license_server',
  
  // Whether to log data source being used
  logDataSource: process.env.LOG_DATA_SOURCE !== 'false', // Default true
  
  // Fallback behavior when primary source fails
  enableFallback: process.env.ENABLE_DATA_SOURCE_FALLBACK !== 'false' // Default true
};

/**
 * Get compatibility mode configuration
 * 
 * @returns {object} Current compatibility configuration
 */
export function getCompatibilityConfig() {
  return { ...compatibilityConfig };
}

/**
 * Check if backward compatibility mode is enabled
 * 
 * @returns {boolean} True if compatibility mode is enabled
 */
export function isCompatibilityModeEnabled() {
  return compatibilityConfig.enabled;
}

/**
 * Get tenant data with backward compatibility support
 * 
 * Reads from both License Server (via cache) and local database.
 * Prioritizes License Server data when available.
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {object} licenseDataService - License Data Service instance
 * @param {object} connection - MongoDB connection
 * @returns {Promise<object>} Tenant data
 * 
 * Requirements: 6.1, 6.2, 6.5
 */
export async function getTenantWithCompatibility(tenantId, licenseDataService, connection = null) {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  // If compatibility mode is disabled, use License Server only
  if (!compatibilityConfig.enabled) {
    if (compatibilityConfig.logDataSource) {
      logger.debug('Compatibility mode disabled, using License Server only', {
        tenantId,
        source: 'license_server'
      });
    }
    return await licenseDataService.getTenant(tenantId, connection);
  }

  // Compatibility mode enabled - try both sources
  let licenseServerData = null;
  let localDatabaseData = null;
  let dataSource = null;

  // Try primary source first
  if (compatibilityConfig.primarySource === 'license_server') {
    try {
      licenseServerData = await licenseDataService.getTenant(tenantId, connection);
      dataSource = 'license_server';
      
      if (compatibilityConfig.logDataSource) {
        logger.info('Retrieved tenant from License Server (primary source)', {
          tenantId,
          source: 'license_server',
          mode: 'compatibility'
        });
      }
    } catch (error) {
      logger.warn('Failed to retrieve tenant from License Server (primary source)', {
        tenantId,
        error: error.message,
        willTryFallback: compatibilityConfig.enableFallback
      });

      // Try fallback to local database
      if (compatibilityConfig.enableFallback) {
        localDatabaseData = await getTenantFromLocalDatabase(tenantId, connection);
        if (localDatabaseData) {
          dataSource = 'local_database_fallback';
          
          if (compatibilityConfig.logDataSource) {
            logger.info('Retrieved tenant from local database (fallback)', {
              tenantId,
              source: 'local_database',
              mode: 'compatibility_fallback'
            });
          }
        }
      }
    }
  } else {
    // Primary source is local database
    try {
      localDatabaseData = await getTenantFromLocalDatabase(tenantId, connection);
      dataSource = 'local_database';
      
      if (compatibilityConfig.logDataSource) {
        logger.info('Retrieved tenant from local database (primary source)', {
          tenantId,
          source: 'local_database',
          mode: 'compatibility'
        });
      }
    } catch (error) {
      logger.warn('Failed to retrieve tenant from local database (primary source)', {
        tenantId,
        error: error.message,
        willTryFallback: compatibilityConfig.enableFallback
      });

      // Try fallback to License Server
      if (compatibilityConfig.enableFallback) {
        licenseServerData = await licenseDataService.getTenant(tenantId, connection);
        if (licenseServerData) {
          dataSource = 'license_server_fallback';
          
          if (compatibilityConfig.logDataSource) {
            logger.info('Retrieved tenant from License Server (fallback)', {
              tenantId,
              source: 'license_server',
              mode: 'compatibility_fallback'
            });
          }
        }
      }
    }
  }

  // Prioritize License Server data if both are available
  if (licenseServerData && localDatabaseData) {
    if (compatibilityConfig.logDataSource) {
      logger.info('Both data sources available, prioritizing License Server', {
        tenantId,
        primarySource: 'license_server',
        secondarySource: 'local_database',
        mode: 'compatibility'
      });
    }
    return {
      ...licenseServerData,
      _dataSource: 'license_server',
      _compatibilityMode: true
    };
  }

  // Return whichever data is available
  if (licenseServerData) {
    return {
      ...licenseServerData,
      _dataSource: dataSource,
      _compatibilityMode: true
    };
  }

  if (localDatabaseData) {
    return {
      ...localDatabaseData,
      _dataSource: dataSource,
      _compatibilityMode: true
    };
  }

  // No data available from either source
  throw new Error(`Tenant ${tenantId} not found in License Server or local database`);
}

/**
 * Get enabled modules with backward compatibility support
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {object} licenseDataService - License Data Service instance
 * @param {object} connection - MongoDB connection
 * @returns {Promise<string[]>} Array of enabled module IDs
 * 
 * Requirements: 6.1, 6.2, 6.5
 */
export async function getEnabledModulesWithCompatibility(tenantId, licenseDataService, connection = null) {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  // If compatibility mode is disabled, use License Server only
  if (!compatibilityConfig.enabled) {
    if (compatibilityConfig.logDataSource) {
      logger.debug('Compatibility mode disabled, using License Server only', {
        tenantId,
        source: 'license_server'
      });
    }
    return await licenseDataService.getEnabledModules(tenantId, connection);
  }

  // Compatibility mode enabled - try both sources
  let licenseServerModules = null;
  let localDatabaseModules = null;
  let dataSource = null;

  // Try primary source first
  if (compatibilityConfig.primarySource === 'license_server') {
    try {
      licenseServerModules = await licenseDataService.getEnabledModules(tenantId, connection);
      dataSource = 'license_server';
      
      if (compatibilityConfig.logDataSource) {
        logger.info('Retrieved enabled modules from License Server (primary source)', {
          tenantId,
          moduleCount: licenseServerModules.length,
          source: 'license_server',
          mode: 'compatibility'
        });
      }
    } catch (error) {
      logger.warn('Failed to retrieve modules from License Server (primary source)', {
        tenantId,
        error: error.message,
        willTryFallback: compatibilityConfig.enableFallback
      });

      // Try fallback to local database
      if (compatibilityConfig.enableFallback) {
        localDatabaseModules = await getEnabledModulesFromLocalDatabase(tenantId, connection);
        if (localDatabaseModules) {
          dataSource = 'local_database_fallback';
          
          if (compatibilityConfig.logDataSource) {
            logger.info('Retrieved enabled modules from local database (fallback)', {
              tenantId,
              moduleCount: localDatabaseModules.length,
              source: 'local_database',
              mode: 'compatibility_fallback'
            });
          }
        }
      }
    }
  } else {
    // Primary source is local database
    try {
      localDatabaseModules = await getEnabledModulesFromLocalDatabase(tenantId, connection);
      dataSource = 'local_database';
      
      if (compatibilityConfig.logDataSource) {
        logger.info('Retrieved enabled modules from local database (primary source)', {
          tenantId,
          moduleCount: localDatabaseModules.length,
          source: 'local_database',
          mode: 'compatibility'
        });
      }
    } catch (error) {
      logger.warn('Failed to retrieve modules from local database (primary source)', {
        tenantId,
        error: error.message,
        willTryFallback: compatibilityConfig.enableFallback
      });

      // Try fallback to License Server
      if (compatibilityConfig.enableFallback) {
        licenseServerModules = await licenseDataService.getEnabledModules(tenantId, connection);
        if (licenseServerModules) {
          dataSource = 'license_server_fallback';
          
          if (compatibilityConfig.logDataSource) {
            logger.info('Retrieved enabled modules from License Server (fallback)', {
              tenantId,
              moduleCount: licenseServerModules.length,
              source: 'license_server',
              mode: 'compatibility_fallback'
            });
          }
        }
      }
    }
  }

  // Prioritize License Server data if both are available
  if (licenseServerModules && localDatabaseModules) {
    if (compatibilityConfig.logDataSource) {
      logger.info('Both data sources available, prioritizing License Server', {
        tenantId,
        primarySource: 'license_server',
        secondarySource: 'local_database',
        mode: 'compatibility'
      });
    }
    return licenseServerModules;
  }

  // Return whichever data is available
  if (licenseServerModules) {
    return licenseServerModules;
  }

  if (localDatabaseModules) {
    return localDatabaseModules;
  }

  // No data available from either source
  throw new Error(`Enabled modules for tenant ${tenantId} not found in License Server or local database`);
}

/**
 * Check if module is enabled with backward compatibility support
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {string} moduleId - The module identifier
 * @param {object} licenseDataService - License Data Service instance
 * @param {object} connection - MongoDB connection
 * @returns {Promise<boolean>} True if module is enabled
 * 
 * Requirements: 6.1, 6.2, 6.5
 */
export async function isModuleEnabledWithCompatibility(tenantId, moduleId, licenseDataService, connection = null) {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  if (!moduleId) {
    throw new Error('Module ID is required');
  }

  const modules = await getEnabledModulesWithCompatibility(tenantId, licenseDataService, connection);
  const isEnabled = modules.includes(moduleId);

  if (compatibilityConfig.logDataSource) {
    logger.debug('Module enablement check with compatibility mode', {
      tenantId,
      moduleId,
      isEnabled,
      mode: 'compatibility'
    });
  }

  return isEnabled;
}

/**
 * Get tenant data from local database
 * 
 * @private
 * @param {string} tenantId - The tenant identifier
 * @param {object} connection - MongoDB connection
 * @returns {Promise<object|null>} Tenant data or null if not found
 */
async function getTenantFromLocalDatabase(tenantId, connection = null) {
  try {
    // Get the Tenant model for this connection
    const Tenant = connection 
      ? getModelForConnection(connection, 'Tenant')
      : (await import('../platform/tenants/models/Tenant.js')).default;

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      logger.debug('Tenant not found in local database', { tenantId });
      return null;
    }

    // Format tenant data to match License Server format
    return {
      tenantId: tenant.tenantId,
      name: tenant.name,
      domain: tenant.domain,
      subscription: {
        status: tenant.subscription?.status || 'unknown',
        plan: tenant.subscription?.planId || 'unknown',
        expiresAt: tenant.subscription?.expiresAt,
        startDate: tenant.subscription?.startDate,
        autoRenew: tenant.subscription?.autoRenew,
        billingCycle: tenant.subscription?.billingCycle
      },
      enabledModules: tenant.enabledModules?.map(m => m.moduleId) || [],
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      _source: 'local_database'
    };
  } catch (error) {
    logger.error('Failed to get tenant from local database', {
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get enabled modules from local database
 * 
 * @private
 * @param {string} tenantId - The tenant identifier
 * @param {object} connection - MongoDB connection
 * @returns {Promise<string[]|null>} Array of enabled module IDs or null if not found
 */
async function getEnabledModulesFromLocalDatabase(tenantId, connection = null) {
  try {
    const tenant = await getTenantFromLocalDatabase(tenantId, connection);
    
    if (!tenant) {
      return null;
    }

    return tenant.enabledModules || [];
  } catch (error) {
    logger.error('Failed to get enabled modules from local database', {
      tenantId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update compatibility mode configuration at runtime
 * 
 * @param {object} newConfig - New configuration values
 * @param {boolean} newConfig.enabled - Enable/disable compatibility mode
 * @param {string} newConfig.primarySource - Primary data source ('license_server' or 'local_database')
 * @param {boolean} newConfig.logDataSource - Whether to log data source
 * @param {boolean} newConfig.enableFallback - Enable fallback to secondary source
 * @returns {object} Updated configuration
 */
export function updateCompatibilityConfig(newConfig) {
  if (newConfig.enabled !== undefined) {
    compatibilityConfig.enabled = newConfig.enabled;
  }

  if (newConfig.primarySource !== undefined) {
    if (!['license_server', 'local_database'].includes(newConfig.primarySource)) {
      throw new Error('Primary source must be "license_server" or "local_database"');
    }
    compatibilityConfig.primarySource = newConfig.primarySource;
  }

  if (newConfig.logDataSource !== undefined) {
    compatibilityConfig.logDataSource = newConfig.logDataSource;
  }

  if (newConfig.enableFallback !== undefined) {
    compatibilityConfig.enableFallback = newConfig.enableFallback;
  }

  logger.info('Compatibility mode configuration updated', {
    config: compatibilityConfig
  });

  return { ...compatibilityConfig };
}

export default {
  getCompatibilityConfig,
  isCompatibilityModeEnabled,
  getTenantWithCompatibility,
  getEnabledModulesWithCompatibility,
  isModuleEnabledWithCompatibility,
  updateCompatibilityConfig
};
