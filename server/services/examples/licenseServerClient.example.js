/**
 * License Server Client Usage Examples
 * 
 * This file demonstrates how to use the LicenseServerClient to communicate
 * with the License Server API for tenant metadata management.
 */

import { LicenseServerClient, LicenseServerError } from '../licenseServerClient.js';
import logger from '../../utils/logger.js';

// ============================================================================
// 1. INITIALIZATION
// ============================================================================

/**
 * Create a License Server client instance
 * 
 * The client requires:
 * - baseUrl: The License Server URL (from environment variable)
 * - apiKey: API key for authentication (from environment variable)
 * - options: Optional configuration (timeout, retries, etc.)
 */
function createLicenseServerClient() {
  const baseUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
  const apiKey = process.env.LICENSE_SERVER_API_KEY;

  if (!apiKey) {
    throw new Error('LICENSE_SERVER_API_KEY environment variable is required');
  }

  // Create client with custom configuration
  const client = new LicenseServerClient(baseUrl, apiKey, {
    timeout: 5000,        // 5 seconds timeout
    maxRetries: 3,        // Retry up to 3 times on failure
    retryDelay: 1000      // 1 second delay between retries
  });

  return client;
}

// ============================================================================
// 2. GET TENANT INFORMATION
// ============================================================================

/**
 * Retrieve complete tenant information including subscription and modules
 */
async function getTenantExample() {
  const client = createLicenseServerClient();
  const tenantId = 'techcorp_solutions';

  try {
    const tenant = await client.getTenant(tenantId);
    
    logger.info('Tenant information retrieved', {
      tenantId: tenant.tenantId,
      name: tenant.name,
      subscriptionStatus: tenant.subscription.status,
      enabledModules: tenant.enabledModules
    });

    return tenant;
  } catch (error) {
    if (error instanceof LicenseServerError) {
      logger.error('Failed to retrieve tenant', {
        tenantId,
        statusCode: error.statusCode,
        message: error.message
      });
    }
    throw error;
  }
}

// ============================================================================
// 3. GET ENABLED MODULES
// ============================================================================

/**
 * Retrieve list of enabled modules for a tenant
 */
async function getEnabledModulesExample() {
  const client = createLicenseServerClient();
  const tenantId = 'techcorp_solutions';

  try {
    const modules = await client.getEnabledModules(tenantId);
    
    logger.info('Enabled modules retrieved', {
      tenantId,
      modules,
      count: modules.length
    });

    return modules;
  } catch (error) {
    if (error instanceof LicenseServerError) {
      logger.error('Failed to retrieve enabled modules', {
        tenantId,
        message: error.message
      });
    }
    throw error;
  }
}

// ============================================================================
// 4. CHECK MODULE ENABLEMENT
// ============================================================================

/**
 * Check if a specific module is enabled for a tenant
 */
async function checkModuleEnabledExample() {
  const client = createLicenseServerClient();
  const tenantId = 'techcorp_solutions';
  const moduleId = 'surveys';

  try {
    const isEnabled = await client.isModuleEnabled(tenantId, moduleId);
    
    if (isEnabled) {
      logger.info('Module is enabled', { tenantId, moduleId });
    } else {
      logger.warn('Module is not enabled', { tenantId, moduleId });
    }

    return isEnabled;
  } catch (error) {
    if (error instanceof LicenseServerError) {
      logger.error('Failed to check module enablement', {
        tenantId,
        moduleId,
        message: error.message
      });
    }
    throw error;
  }
}

// ============================================================================
// 5. VALIDATE LICENSE
// ============================================================================

/**
 * Validate a license key for a tenant
 */
async function validateLicenseExample() {
  const client = createLicenseServerClient();
  const tenantId = 'techcorp_solutions';
  const licenseKey = 'TECH-CORP-2024-ENTERPRISE';

  try {
    const validation = await client.validateLicense(tenantId, licenseKey);
    
    if (validation.valid) {
      logger.info('License is valid', {
        tenantId,
        subscriptionStatus: validation.subscription?.status
      });
    } else {
      logger.warn('License is invalid', {
        tenantId,
        reason: validation.reason
      });
    }

    return validation;
  } catch (error) {
    if (error instanceof LicenseServerError) {
      logger.error('License validation failed', {
        tenantId,
        message: error.message
      });
    }
    throw error;
  }
}

// ============================================================================
// 6. GET SUBSCRIPTION DETAILS
// ============================================================================

/**
 * Retrieve subscription details for a tenant
 */
async function getSubscriptionExample() {
  const client = createLicenseServerClient();
  const tenantId = 'techcorp_solutions';

  try {
    const subscription = await client.getSubscription(tenantId);
    
    logger.info('Subscription details retrieved', {
      tenantId,
      status: subscription.status,
      plan: subscription.plan,
      expiresAt: subscription.expiresAt
    });

    return subscription;
  } catch (error) {
    if (error instanceof LicenseServerError) {
      logger.error('Failed to retrieve subscription', {
        tenantId,
        message: error.message
      });
    }
    throw error;
  }
}

// ============================================================================
// 7. ERROR HANDLING PATTERNS
// ============================================================================

/**
 * Comprehensive error handling example
 */
async function errorHandlingExample() {
  const client = createLicenseServerClient();
  const tenantId = 'nonexistent_tenant';

  try {
    const tenant = await client.getTenant(tenantId);
    return tenant;
  } catch (error) {
    if (error instanceof LicenseServerError) {
      // Handle specific HTTP status codes
      switch (error.statusCode) {
        case 404:
          logger.warn('Tenant not found', { tenantId });
          // Handle tenant not found (e.g., return default values)
          return null;
        
        case 401:
          logger.error('Authentication failed - invalid API key');
          // Handle authentication failure (e.g., refresh API key)
          throw new Error('License Server authentication failed');
        
        case 403:
          logger.error('Authorization failed - insufficient permissions');
          // Handle authorization failure
          throw new Error('Insufficient permissions to access tenant data');
        
        case 500:
        case 502:
        case 503:
          logger.error('License Server error', {
            statusCode: error.statusCode,
            message: error.message
          });
          // Handle server errors (e.g., use cached data)
          throw new Error('License Server temporarily unavailable');
        
        default:
          logger.error('Unexpected License Server error', {
            statusCode: error.statusCode,
            message: error.message
          });
          throw error;
      }
    } else {
      // Handle non-LicenseServerError errors
      logger.error('Unexpected error', {
        error: error.message
      });
      throw error;
    }
  }
}

// ============================================================================
// 8. FALLBACK TO CACHE PATTERN
// ============================================================================

/**
 * Example of using License Server with cache fallback
 */
async function getTenantWithCacheFallback(tenantId, getCachedLicense) {
  const client = createLicenseServerClient();

  try {
    // Try to get fresh data from License Server
    const tenant = await client.getTenant(tenantId);
    
    // Update cache with fresh data
    // (cache update logic would go here)
    
    return tenant;
  } catch (error) {
    if (error instanceof LicenseServerError) {
      logger.warn('License Server unavailable, using cached data', {
        tenantId,
        error: error.message
      });

      // Fall back to cached data
      const cachedLicense = await getCachedLicense(tenantId);
      
      if (cachedLicense) {
        logger.info('Using cached license data', {
          tenantId,
          cacheAge: Date.now() - new Date(cachedLicense.lastSyncedAt).getTime()
        });
        return cachedLicense;
      }

      // No cache available
      logger.error('No cached data available for tenant', { tenantId });
      throw new Error('License Server unavailable and no cache available');
    }
    throw error;
  }
}

// ============================================================================
// 9. TEST CONNECTION
// ============================================================================

/**
 * Test connection to License Server
 */
async function testConnectionExample() {
  const client = createLicenseServerClient();

  try {
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      logger.info('License Server connection successful');
    } else {
      logger.error('License Server connection failed');
    }

    return isConnected;
  } catch (error) {
    logger.error('Failed to test License Server connection', {
      error: error.message
    });
    return false;
  }
}

// ============================================================================
// 10. MIDDLEWARE INTEGRATION EXAMPLE
// ============================================================================

/**
 * Express middleware to check module access using License Server
 */
function createModuleAccessMiddleware(moduleId) {
  const client = createLicenseServerClient();

  return async (req, res, next) => {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID is required'
      });
    }

    try {
      const isEnabled = await client.isModuleEnabled(tenantId, moduleId);

      if (!isEnabled) {
        return res.status(403).json({
          error: `Module '${moduleId}' is not enabled for this tenant`,
          moduleId,
          tenantId
        });
      }

      // Module is enabled, continue
      next();
    } catch (error) {
      if (error instanceof LicenseServerError) {
        logger.error('Failed to check module access', {
          tenantId,
          moduleId,
          error: error.message
        });

        // On License Server error, you might want to:
        // 1. Deny access (fail closed)
        // 2. Allow access (fail open)
        // 3. Use cached data
        
        // Example: Fail closed
        return res.status(503).json({
          error: 'Unable to verify module access',
          message: 'License Server temporarily unavailable'
        });
      }

      next(error);
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createLicenseServerClient,
  getTenantExample,
  getEnabledModulesExample,
  checkModuleEnabledExample,
  validateLicenseExample,
  getSubscriptionExample,
  errorHandlingExample,
  getTenantWithCacheFallback,
  testConnectionExample,
  createModuleAccessMiddleware
};
