import { getModelForConnection } from '../config/sharedModels.js';
import logger from '../utils/logger.js';

/**
 * License Cache Service
 * 
 * Manages local caching of license data from the License Server for performance optimization.
 * Implements a 6-hour TTL cache strategy with fallback support when License Server is unavailable.
 * 
 * Requirements: 5.1, 5.2, 5.3, 4.4, 4.5, 5.5
 */

// Cache TTL: 6 hours in milliseconds
const CACHE_TTL = 6 * 60 * 60 * 1000;

/**
 * Get cached license data for a tenant
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {object} connection - MongoDB connection for the tenant database
 * @returns {Promise<object|null>} Cached license data or null if not found
 * 
 * Requirements: 5.1
 */
export async function getCachedLicense(tenantId, connection = null) {
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Get the CompanyLicense model for this connection
    const CompanyLicense = connection 
      ? getModelForConnection(connection, 'CompanyLicense')
      : (await import('../modules/licensing/models/companyLicense.model.js')).default;

    const cached = await CompanyLicense.findOne({ companyId: tenantId });

    if (!cached) {
      // Requirement: 9.6 - Log cache miss
      logger.info('License cache miss', { 
        type: 'cache_miss',
        tenantId,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    // Requirement: 9.6 - Log cache hit
    logger.info('License cache hit', {
      type: 'cache_hit',
      tenantId,
      lastSyncedAt: cached.quickAccess?.lastSyncedAt || cached.cacheInfo?.lastSyncedFromServer,
      enabledModules: cached.quickAccess?.enabledModules?.length || 0,
      subscriptionStatus: cached.quickAccess?.subscriptionStatus,
      timestamp: new Date().toISOString()
    });

    return cached;
  } catch (error) {
    logger.error('Failed to get cached license', {
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Check if cached license data is stale (older than 6 hours)
 * 
 * @param {object} cachedLicense - The cached license document
 * @returns {boolean} True if cache is stale, false if fresh
 * 
 * Requirements: 5.2
 */
export function isCacheStale(cachedLicense) {
  try {
    if (!cachedLicense) {
      logger.debug('Cache staleness check: no cached license provided', {
        type: 'cache_staleness_check',
        result: 'stale',
        reason: 'no_cache',
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // Check for lastSyncedAt in quickAccess (new format) or cacheInfo (existing format)
    const lastSyncedAt = cachedLicense.quickAccess?.lastSyncedAt || 
                         cachedLicense.cacheInfo?.lastSyncedFromServer;

    if (!lastSyncedAt) {
      logger.debug('Cache staleness check: no lastSyncedAt timestamp', {
        type: 'cache_staleness_check',
        result: 'stale',
        reason: 'no_timestamp',
        companyId: cachedLicense.companyId,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    const lastSyncDate = new Date(lastSyncedAt);
    const age = Date.now() - lastSyncDate.getTime();
    const isStale = age > CACHE_TTL;

    // Requirement: 9.6 - Log cache staleness check
    logger.debug('Cache staleness check', {
      type: 'cache_staleness_check',
      result: isStale ? 'stale' : 'fresh',
      companyId: cachedLicense.companyId,
      lastSyncedAt: lastSyncDate.toISOString(),
      ageHours: (age / (60 * 60 * 1000)).toFixed(2),
      ttlHours: (CACHE_TTL / (60 * 60 * 1000)),
      isStale,
      timestamp: new Date().toISOString()
    });

    return isStale;
  } catch (error) {
    logger.error('Error checking cache staleness', {
      error: error.message,
      companyId: cachedLicense?.companyId
    });
    // If we can't determine staleness, assume it's stale to be safe
    return true;
  }
}

/**
 * Update license cache with fresh data from License Server
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {object} licenseData - Fresh license data from License Server
 * @param {object} connection - MongoDB connection for the tenant database
 * @returns {Promise<object>} Updated cache document
 * 
 * Requirements: 5.1, 5.3
 */
export async function updateLicenseCache(tenantId, licenseData, connection = null) {
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    if (!licenseData) {
      throw new Error('License data is required');
    }

    // Get the CompanyLicense model for this connection
    const CompanyLicense = connection 
      ? getModelForConnection(connection, 'CompanyLicense')
      : (await import('../modules/licensing/models/companyLicense.model.js')).default;

    const now = new Date();

    // Prepare cache update data
    const cacheUpdate = {
      'quickAccess.enabledModules': licenseData.enabledModules || [],
      'quickAccess.subscriptionStatus': licenseData.subscription?.status || 'unknown',
      'quickAccess.licenseValid': licenseData.subscription?.status === 'active',
      'quickAccess.lastSyncedAt': now,
      'quickAccess.status': licenseData.subscription?.status || 'unknown',
      'quickAccess.expiresAt': licenseData.subscription?.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      'cacheInfo.lastSyncedFromServer': now,
      'cacheInfo.syncVersion': { $inc: 1 },
      updatedAt: now
    };

    // Update or create cache entry
    const result = await CompanyLicense.findOneAndUpdate(
      { companyId: tenantId },
      {
        $set: cacheUpdate,
        $setOnInsert: {
          companyId: tenantId,
          licenseId: licenseData.licenseId || `license_${tenantId}`,
          licenseNumber: licenseData.licenseNumber || `LIC-${tenantId.toUpperCase()}`,
          createdAt: now
        }
      },
      { 
        upsert: true, 
        new: true,
        runValidators: false // Skip validation for cache updates
      }
    );

    // Requirement: 9.6 - Log cache refresh operation
    logger.info('License cache refresh completed', {
      type: 'cache_refresh',
      operation: 'update',
      tenantId,
      enabledModules: licenseData.enabledModules?.length || 0,
      subscriptionStatus: licenseData.subscription?.status,
      lastSyncedAt: now.toISOString(),
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    logger.error('Failed to update license cache', {
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Invalidate cache for a tenant (force refresh on next request)
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {object} connection - MongoDB connection for the tenant database
 * @returns {Promise<object>} Update result
 * 
 * Requirements: 5.3
 */
export async function invalidateCache(tenantId, connection = null) {
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Get the CompanyLicense model for this connection
    const CompanyLicense = connection 
      ? getModelForConnection(connection, 'CompanyLicense')
      : (await import('../modules/licensing/models/companyLicense.model.js')).default;

    // Set lastSyncedAt to epoch (January 1, 1970) to force refresh
    const result = await CompanyLicense.updateOne(
      { companyId: tenantId },
      {
        $set: {
          'quickAccess.lastSyncedAt': new Date(0),
          'cacheInfo.lastSyncedFromServer': new Date(0)
        }
      }
    );

    if (result.matchedCount === 0) {
      logger.warn('Cache invalidation: no cache entry found', { 
        type: 'cache_invalidation',
        result: 'not_found',
        tenantId,
        timestamp: new Date().toISOString()
      });
      return { invalidated: false, reason: 'not_found' };
    }

    // Requirement: 9.6 - Log cache invalidation
    logger.info('License cache invalidated', {
      type: 'cache_invalidation',
      operation: 'invalidate',
      tenantId,
      modifiedCount: result.modifiedCount,
      timestamp: new Date().toISOString()
    });

    return { 
      invalidated: true, 
      modifiedCount: result.modifiedCount 
    };
  } catch (error) {
    logger.error('Failed to invalidate license cache', {
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get cache statistics for monitoring
 * 
 * @param {object} connection - MongoDB connection for the tenant database
 * @returns {Promise<object>} Cache statistics
 */
export async function getCacheStats(connection = null) {
  try {
    const CompanyLicense = connection 
      ? getModelForConnection(connection, 'CompanyLicense')
      : (await import('../modules/licensing/models/companyLicense.model.js')).default;

    const now = Date.now();
    const staleThreshold = new Date(now - CACHE_TTL);

    const [total, fresh, stale] = await Promise.all([
      CompanyLicense.countDocuments({}),
      CompanyLicense.countDocuments({
        $or: [
          { 'quickAccess.lastSyncedAt': { $gte: staleThreshold } },
          { 'cacheInfo.lastSyncedFromServer': { $gte: staleThreshold } }
        ]
      }),
      CompanyLicense.countDocuments({
        $and: [
          {
            $or: [
              { 'quickAccess.lastSyncedAt': { $lt: staleThreshold } },
              { 'cacheInfo.lastSyncedFromServer': { $lt: staleThreshold } }
            ]
          }
        ]
      })
    ]);

    const stats = {
      total,
      fresh,
      stale,
      cacheTtlHours: CACHE_TTL / (60 * 60 * 1000),
      timestamp: new Date().toISOString()
    };

    logger.debug('Cache statistics retrieved', stats);

    return stats;
  } catch (error) {
    logger.error('Failed to get cache statistics', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Export cache TTL constant for testing
export { CACHE_TTL };
