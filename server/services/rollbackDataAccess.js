import logger from '../utils/logger.js';
import { getModelForConnection } from '../config/sharedModels.js';

/**
 * Rollback Data Access Service
 * 
 * Provides functionality to rollback to original data access patterns
 * (querying local database directly instead of License Server).
 * Used when migration needs to be reverted.
 * 
 * Requirements: 6.4, 12.2
 */

/**
 * Get tenant data from local database (original pattern)
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {object} connection - MongoDB connection
 * @returns {Promise<object>} Tenant data
 * 
 * Requirements: 6.4, 12.2
 */
export async function getTenantFromLocalDatabase(tenantId, connection = null) {
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    logger.debug('Retrieving tenant from local database (rollback mode)', {
      tenantId,
      source: 'local_database',
      mode: 'rollback'
    });

    // Get the Tenant model for this connection
    const Tenant = connection 
      ? getModelForConnection(connection, 'Tenant')
      : (await import('../platform/tenants/models/Tenant.js')).default;

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found in local database`);
    }

    logger.info('Retrieved tenant from local database (rollback mode)', {
      tenantId,
      source: 'local_database',
      mode: 'rollback'
    });

    // Return tenant data in consistent format
    return {
      tenantId: tenant.tenantId,
      name: tenant.name,
      domain: tenant.domain,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
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
      deploymentMode: tenant.deploymentMode,
      config: tenant.config,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      _source: 'local_database',
      _rollbackMode: true
    };
  } catch (error) {
    logger.error('Failed to get tenant from local database (rollback mode)', {
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get enabled modules from local database (original pattern)
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {object} connection - MongoDB connection
 * @returns {Promise<string[]>} Array of enabled module IDs
 * 
 * Requirements: 6.4, 12.2
 */
export async function getEnabledModulesFromLocalDatabase(tenantId, connection = null) {
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    logger.debug('Retrieving enabled modules from local database (rollback mode)', {
      tenantId,
      source: 'local_database',
      mode: 'rollback'
    });

    // Get the Tenant model for this connection
    const Tenant = connection 
      ? getModelForConnection(connection, 'Tenant')
      : (await import('../platform/tenants/models/Tenant.js')).default;

    const tenant = await Tenant.findOne({ tenantId }).select('enabledModules');

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found in local database`);
    }

    const modules = tenant.enabledModules?.map(m => m.moduleId) || [];

    logger.info('Retrieved enabled modules from local database (rollback mode)', {
      tenantId,
      moduleCount: modules.length,
      source: 'local_database',
      mode: 'rollback'
    });

    return modules;
  } catch (error) {
    logger.error('Failed to get enabled modules from local database (rollback mode)', {
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Check if module is enabled using local database (original pattern)
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {string} moduleId - The module identifier
 * @param {object} connection - MongoDB connection
 * @returns {Promise<boolean>} True if module is enabled
 * 
 * Requirements: 6.4, 12.2
 */
export async function isModuleEnabledInLocalDatabase(tenantId, moduleId, connection = null) {
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    if (!moduleId) {
      throw new Error('Module ID is required');
    }

    const modules = await getEnabledModulesFromLocalDatabase(tenantId, connection);
    const isEnabled = modules.includes(moduleId);

    logger.debug('Module enablement check from local database (rollback mode)', {
      tenantId,
      moduleId,
      isEnabled,
      source: 'local_database',
      mode: 'rollback'
    });

    return isEnabled;
  } catch (error) {
    logger.error('Failed to check module enablement in local database (rollback mode)', {
      tenantId,
      moduleId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get subscription details from local database (original pattern)
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {object} connection - MongoDB connection
 * @returns {Promise<object>} Subscription details
 * 
 * Requirements: 6.4, 12.2
 */
export async function getSubscriptionFromLocalDatabase(tenantId, connection = null) {
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    logger.debug('Retrieving subscription from local database (rollback mode)', {
      tenantId,
      source: 'local_database',
      mode: 'rollback'
    });

    // Get the Tenant model for this connection
    const Tenant = connection 
      ? getModelForConnection(connection, 'Tenant')
      : (await import('../platform/tenants/models/Tenant.js')).default;

    const tenant = await Tenant.findOne({ tenantId }).select('subscription');

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found in local database`);
    }

    const subscription = {
      status: tenant.subscription?.status || 'unknown',
      plan: tenant.subscription?.planId || 'unknown',
      expiresAt: tenant.subscription?.expiresAt,
      startDate: tenant.subscription?.startDate,
      autoRenew: tenant.subscription?.autoRenew,
      billingCycle: tenant.subscription?.billingCycle
    };

    logger.info('Retrieved subscription from local database (rollback mode)', {
      tenantId,
      subscriptionStatus: subscription.status,
      source: 'local_database',
      mode: 'rollback'
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to get subscription from local database (rollback mode)', {
      tenantId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Verify rollback functionality by testing local database access
 * 
 * @param {string} tenantId - Test tenant ID
 * @param {object} connection - MongoDB connection
 * @returns {Promise<object>} Verification result
 * 
 * Requirements: 6.4, 12.2
 */
export async function verifyRollbackFunctionality(tenantId, connection = null) {
  try {
    logger.info('Verifying rollback functionality', {
      tenantId,
      mode: 'rollback_verification'
    });

    const results = {
      tenantId,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Get tenant data
    try {
      const tenant = await getTenantFromLocalDatabase(tenantId, connection);
      results.tests.getTenant = {
        success: true,
        tenantFound: !!tenant,
        source: tenant._source
      };
    } catch (error) {
      results.tests.getTenant = {
        success: false,
        error: error.message
      };
    }

    // Test 2: Get enabled modules
    try {
      const modules = await getEnabledModulesFromLocalDatabase(tenantId, connection);
      results.tests.getEnabledModules = {
        success: true,
        moduleCount: modules.length,
        modules
      };
    } catch (error) {
      results.tests.getEnabledModules = {
        success: false,
        error: error.message
      };
    }

    // Test 3: Check module enablement (if modules exist)
    if (results.tests.getEnabledModules.success && results.tests.getEnabledModules.modules.length > 0) {
      const testModuleId = results.tests.getEnabledModules.modules[0];
      try {
        const isEnabled = await isModuleEnabledInLocalDatabase(tenantId, testModuleId, connection);
        results.tests.isModuleEnabled = {
          success: true,
          moduleId: testModuleId,
          isEnabled
        };
      } catch (error) {
        results.tests.isModuleEnabled = {
          success: false,
          error: error.message
        };
      }
    }

    // Test 4: Get subscription
    try {
      const subscription = await getSubscriptionFromLocalDatabase(tenantId, connection);
      results.tests.getSubscription = {
        success: true,
        subscriptionStatus: subscription.status
      };
    } catch (error) {
      results.tests.getSubscription = {
        success: false,
        error: error.message
      };
    }

    // Calculate overall success
    const allTests = Object.values(results.tests);
    const successfulTests = allTests.filter(t => t.success).length;
    results.overallSuccess = successfulTests === allTests.length;
    results.successRate = `${successfulTests}/${allTests.length}`;

    logger.info('Rollback functionality verification complete', {
      tenantId,
      overallSuccess: results.overallSuccess,
      successRate: results.successRate
    });

    return results;
  } catch (error) {
    logger.error('Failed to verify rollback functionality', {
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Create a rollback-compatible data service wrapper
 * 
 * This wrapper provides the same interface as LicenseDataService
 * but uses local database queries instead of License Server API.
 * 
 * Requirements: 6.4, 12.2
 */
export class RollbackDataService {
  constructor() {
    logger.info('RollbackDataService initialized - using local database queries');
  }

  /**
   * Get tenant information from local database
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {object} connection - MongoDB connection
   * @returns {Promise<object>} Tenant data
   */
  async getTenant(tenantId, connection = null) {
    return await getTenantFromLocalDatabase(tenantId, connection);
  }

  /**
   * Get enabled modules from local database
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {object} connection - MongoDB connection
   * @returns {Promise<string[]>} Array of enabled module IDs
   */
  async getEnabledModules(tenantId, connection = null) {
    return await getEnabledModulesFromLocalDatabase(tenantId, connection);
  }

  /**
   * Check if module is enabled using local database
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {string} moduleId - The module identifier
   * @param {object} connection - MongoDB connection
   * @returns {Promise<boolean>} True if module is enabled
   */
  async isModuleEnabled(tenantId, moduleId, connection = null) {
    return await isModuleEnabledInLocalDatabase(tenantId, moduleId, connection);
  }

  /**
   * Get subscription details from local database
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {object} connection - MongoDB connection
   * @returns {Promise<object>} Subscription details
   */
  async getSubscription(tenantId, connection = null) {
    return await getSubscriptionFromLocalDatabase(tenantId, connection);
  }

  /**
   * Validate license using local database
   * Note: This is a simplified version for rollback mode
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {string} licenseKey - The license key (not used in rollback mode)
   * @param {object} connection - MongoDB connection
   * @returns {Promise<object>} Validation result
   */
  async validateLicense(tenantId, licenseKey, connection = null) {
    logger.warn('License validation in rollback mode - using local database', {
      tenantId,
      mode: 'rollback'
    });

    const tenant = await getTenantFromLocalDatabase(tenantId, connection);
    const subscription = tenant.subscription;

    return {
      valid: subscription.status === 'active',
      rollbackMode: true,
      warning: 'Validation performed using local database - rollback mode active',
      subscription,
      enabledModules: tenant.enabledModules,
      _source: 'local_database'
    };
  }
}

export default {
  getTenantFromLocalDatabase,
  getEnabledModulesFromLocalDatabase,
  isModuleEnabledInLocalDatabase,
  getSubscriptionFromLocalDatabase,
  verifyRollbackFunctionality,
  RollbackDataService
};
