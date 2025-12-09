/**
 * Feature Flag Service
 * 
 * Manages feature flags for tenants with optional Redis caching
 * Supports runtime feature flag updates without restart
 * 
 * Requirements: 7.3, 7.4
 */

import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';
import logger from '../../utils/logger.js';

class FeatureFlagService {
    constructor() {
        this.cache = new Map(); // tenantId -> feature flags
        this.redisClient = null;
        this.cacheEnabled = false;
        this.cacheTTL = 300; // 5 minutes default TTL
    }

    /**
     * Initialize the service with optional Redis client
     * 
     * @param {Object} redisClient - Redis client instance (optional)
     * @param {number} cacheTTL - Cache TTL in seconds (default: 300)
     */
    initialize(redisClient = null, cacheTTL = 300) {
        if (redisClient) {
            this.redisClient = redisClient;
            this.cacheEnabled = true;
            this.cacheTTL = cacheTTL;
            logger.info('Feature flag service initialized with Redis caching');
        } else {
            logger.info('Feature flag service initialized with in-memory caching');
        }
    }

    /**
     * Get feature flags for a tenant
     * 
     * @param {Object} tenant - Tenant object
     * @returns {Promise<Object>} Feature flags object
     */
    async getFeatureFlags(tenant) {
        const tenantId = tenant.tenantId;
        const cacheKey = `feature_flags:${tenantId}`;

        try {
            // Try Redis cache first if enabled
            if (this.cacheEnabled && this.redisClient) {
                try {
                    const cached = await this.redisClient.get(cacheKey);
                    if (cached) {
                        logger.debug(`Feature flags cache hit for tenant ${tenantId}`);
                        return JSON.parse(cached);
                    }
                } catch (error) {
                    logger.warn(`Redis cache read failed for tenant ${tenantId}:`, error);
                    // Fall through to in-memory cache
                }
            }

            // Try in-memory cache
            if (this.cache.has(tenantId)) {
                logger.debug(`Feature flags in-memory cache hit for tenant ${tenantId}`);
                return this.cache.get(tenantId);
            }

            // Get from tenant configuration
            const featureFlags = tenant.config?.features || {};

            // Cache the result
            await this.cacheFeatureFlags(tenantId, featureFlags);

            return featureFlags;
        } catch (error) {
            logger.error(`Error getting feature flags for tenant ${tenantId}:`, error);
            // Return empty object as fallback
            return {};
        }
    }

    /**
     * Check if a specific feature is enabled for a tenant
     * 
     * @param {Object} tenant - Tenant object
     * @param {string} featureName - Feature name to check
     * @returns {Promise<boolean>} True if feature is enabled
     */
    async isFeatureEnabled(tenant, featureName) {
        const flags = await this.getFeatureFlags(tenant);
        return flags[featureName] === true;
    }

    /**
     * Check if a module is enabled for a tenant
     * 
     * @param {Object} tenant - Tenant object
     * @param {string} moduleName - Module name to check
     * @returns {boolean} True if module is enabled
     */
    isModuleEnabled(tenant, moduleName) {
        // HR-Core is always enabled
        if (moduleName === 'hr-core') {
            return true;
        }

        // Check if module is in tenant's enabled modules
        return tenant.enabledModules.some(m => m.moduleId === moduleName);
    }

    /**
     * Update feature flags for a tenant
     * 
     * @param {string} tenantId - Tenant ID
     * @param {Object} featureFlags - New feature flags object
     * @returns {Promise<void>}
     */
    async updateFeatureFlags(tenantId, featureFlags) {
        try {
            logger.info(`Updating feature flags for tenant ${tenantId}`);

            // Update cache
            await this.cacheFeatureFlags(tenantId, featureFlags);

            logger.info(`Feature flags updated for tenant ${tenantId}`);
        } catch (error) {
            logger.error(`Error updating feature flags for tenant ${tenantId}:`, error);
            throw new AppError(
                'Failed to update feature flags',
                500,
                ERROR_TYPES.INTERNAL_ERROR,
                { tenantId, error: error.message }
            );
        }
    }

    /**
     * Cache feature flags for a tenant
     * 
     * @param {string} tenantId - Tenant ID
     * @param {Object} featureFlags - Feature flags to cache
     * @returns {Promise<void>}
     */
    async cacheFeatureFlags(tenantId, featureFlags) {
        const cacheKey = `feature_flags:${tenantId}`;

        // Update in-memory cache
        this.cache.set(tenantId, featureFlags);

        // Update Redis cache if enabled
        if (this.cacheEnabled && this.redisClient) {
            try {
                await this.redisClient.setex(
                    cacheKey,
                    this.cacheTTL,
                    JSON.stringify(featureFlags)
                );
                logger.debug(`Feature flags cached in Redis for tenant ${tenantId}`);
            } catch (error) {
                logger.warn(`Failed to cache feature flags in Redis for tenant ${tenantId}:`, error);
                // Continue with in-memory cache only
            }
        }
    }

    /**
     * Invalidate cache for a tenant
     * 
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    async invalidateCache(tenantId) {
        const cacheKey = `feature_flags:${tenantId}`;

        // Clear in-memory cache
        this.cache.delete(tenantId);

        // Clear Redis cache if enabled
        if (this.cacheEnabled && this.redisClient) {
            try {
                await this.redisClient.del(cacheKey);
                logger.debug(`Feature flags cache invalidated for tenant ${tenantId}`);
            } catch (error) {
                logger.warn(`Failed to invalidate Redis cache for tenant ${tenantId}:`, error);
            }
        }
    }

    /**
     * Clear all cached feature flags
     * Useful for testing or system maintenance
     * 
     * @returns {Promise<void>}
     */
    async clearAllCache() {
        logger.info('Clearing all feature flag caches');

        // Clear in-memory cache
        this.cache.clear();

        // Clear Redis cache if enabled
        if (this.cacheEnabled && this.redisClient) {
            try {
                const keys = await this.redisClient.keys('feature_flags:*');
                if (keys.length > 0) {
                    await this.redisClient.del(...keys);
                }
                logger.info(`Cleared ${keys.length} feature flag entries from Redis`);
            } catch (error) {
                logger.warn('Failed to clear Redis cache:', error);
            }
        }
    }

    /**
     * Get cache statistics
     * 
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            cacheEnabled: this.cacheEnabled,
            inMemoryCacheSize: this.cache.size,
            cacheTTL: this.cacheTTL,
            redisEnabled: this.redisClient !== null
        };
    }
}

// Export singleton instance
const featureFlagService = new FeatureFlagService();
export default featureFlagService;
