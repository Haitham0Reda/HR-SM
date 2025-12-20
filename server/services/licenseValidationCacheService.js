/**
 * License Validation Cache Service
 * Implements caching for license validation results with appropriate TTL
 * Reduces load on license server while maintaining security
 */

import cacheService from './cacheService.js';
import logger from '../utils/logger.js';

class LicenseValidationCacheService {
    constructor() {
        this.validationTTL = parseInt(process.env.LICENSE_CACHE_TTL) || 900; // 15 minutes default
        this.shortTTL = 60; // 1 minute for failed validations
        this.longTTL = 3600; // 1 hour for successful validations
        this.cachePrefix = 'license_validation';
    }

    /**
     * Generate cache key for license validation
     * @param {string} tenantId - Tenant ID
     * @param {string} licenseKey - License key (hashed for security)
     * @returns {string} Cache key
     */
    generateValidationKey(tenantId, licenseKey) {
        // Use hash of license key for security (don't store actual key in cache key)
        const crypto = require('crypto');
        const keyHash = crypto.createHash('sha256').update(licenseKey).digest('hex').substring(0, 16);
        return cacheService.generateKey(this.cachePrefix, `${tenantId}:${keyHash}`);
    }

    /**
     * Generate cache key for tenant license status
     * @param {string} tenantId - Tenant ID
     * @returns {string} Cache key
     */
    generateTenantLicenseKey(tenantId) {
        return cacheService.generateKey(this.cachePrefix, `tenant:${tenantId}:status`);
    }

    /**
     * Generate cache key for license features
     * @param {string} tenantId - Tenant ID
     * @returns {string} Cache key
     */
    generateFeaturesKey(tenantId) {
        return cacheService.generateKey(this.cachePrefix, `tenant:${tenantId}:features`);
    }

    /**
     * Cache license validation result
     * @param {string} tenantId - Tenant ID
     * @param {string} licenseKey - License key
     * @param {Object} validationResult - Validation result from license server
     * @returns {Promise<boolean>} Success status
     */
    async cacheValidationResult(tenantId, licenseKey, validationResult) {
        try {
            const cacheKey = this.generateValidationKey(tenantId, licenseKey);
            
            // Determine TTL based on validation result
            let ttl = this.validationTTL;
            if (validationResult.valid) {
                ttl = this.longTTL;
                
                // Also cache tenant license status and features separately
                await this.cacheTenantLicenseStatus(tenantId, validationResult);
                await this.cacheLicenseFeatures(tenantId, validationResult.features || []);
            } else {
                ttl = this.shortTTL; // Short TTL for failed validations
            }

            const cached = await cacheService.set(cacheKey, {
                ...validationResult,
                cachedAt: new Date().toISOString(),
                tenantId
            }, ttl);

            if (cached) {
                logger.debug('License validation result cached', { 
                    tenantId, 
                    valid: validationResult.valid, 
                    ttl 
                });
            }

            return cached;
        } catch (error) {
            logger.error('Error caching license validation result', { 
                tenantId, 
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Get cached license validation result
     * @param {string} tenantId - Tenant ID
     * @param {string} licenseKey - License key
     * @returns {Promise<Object|null>} Cached validation result or null
     */
    async getCachedValidationResult(tenantId, licenseKey) {
        try {
            const cacheKey = this.generateValidationKey(tenantId, licenseKey);
            const cached = await cacheService.get(cacheKey);

            if (cached) {
                logger.debug('License validation cache hit', { tenantId });
                return cached;
            }

            logger.debug('License validation cache miss', { tenantId });
            return null;
        } catch (error) {
            logger.error('Error getting cached license validation', { 
                tenantId, 
                error: error.message 
            });
            return null;
        }
    }

    /**
     * Cache tenant license status
     * @param {string} tenantId - Tenant ID
     * @param {Object} validationResult - Validation result
     * @returns {Promise<boolean>} Success status
     */
    async cacheTenantLicenseStatus(tenantId, validationResult) {
        try {
            const cacheKey = this.generateTenantLicenseKey(tenantId);
            const status = {
                valid: validationResult.valid,
                licenseType: validationResult.licenseType,
                expiresAt: validationResult.expiresAt,
                status: validationResult.status,
                lastValidated: new Date().toISOString()
            };

            return await cacheService.set(cacheKey, status, this.longTTL);
        } catch (error) {
            logger.error('Error caching tenant license status', { 
                tenantId, 
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Get cached tenant license status
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Cached license status or null
     */
    async getCachedTenantLicenseStatus(tenantId) {
        try {
            const cacheKey = this.generateTenantLicenseKey(tenantId);
            return await cacheService.get(cacheKey);
        } catch (error) {
            logger.error('Error getting cached tenant license status', { 
                tenantId, 
                error: error.message 
            });
            return null;
        }
    }

    /**
     * Cache license features for a tenant
     * @param {string} tenantId - Tenant ID
     * @param {Array} features - Array of enabled features/modules
     * @returns {Promise<boolean>} Success status
     */
    async cacheLicenseFeatures(tenantId, features) {
        try {
            const cacheKey = this.generateFeaturesKey(tenantId);
            const featureData = {
                features: features || [],
                cachedAt: new Date().toISOString()
            };

            return await cacheService.set(cacheKey, featureData, this.longTTL);
        } catch (error) {
            logger.error('Error caching license features', { 
                tenantId, 
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Get cached license features for a tenant
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array|null>} Cached features array or null
     */
    async getCachedLicenseFeatures(tenantId) {
        try {
            const cacheKey = this.generateFeaturesKey(tenantId);
            const cached = await cacheService.get(cacheKey);
            
            if (cached && cached.features) {
                return cached.features;
            }

            return null;
        } catch (error) {
            logger.error('Error getting cached license features', { 
                tenantId, 
                error: error.message 
            });
            return null;
        }
    }

    /**
     * Invalidate license cache for a tenant
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<number>} Number of cache keys invalidated
     */
    async invalidateTenantLicenseCache(tenantId) {
        try {
            const patterns = [
                cacheService.generateKey(this.cachePrefix, `${tenantId}:*`),
                cacheService.generateKey(this.cachePrefix, `tenant:${tenantId}:*`)
            ];

            let totalInvalidated = 0;
            for (const pattern of patterns) {
                const invalidated = await cacheService.delPattern(pattern);
                totalInvalidated += invalidated;
            }

            logger.info('License cache invalidated for tenant', { tenantId, count: totalInvalidated });
            return totalInvalidated;
        } catch (error) {
            logger.error('Error invalidating tenant license cache', { 
                tenantId, 
                error: error.message 
            });
            return 0;
        }
    }

    /**
     * Invalidate all license validation cache
     * @returns {Promise<number>} Number of cache keys invalidated
     */
    async invalidateAllLicenseCache() {
        try {
            const pattern = cacheService.generateKey(this.cachePrefix, '*');
            const invalidated = await cacheService.delPattern(pattern);
            
            logger.info('All license cache invalidated', { count: invalidated });
            return invalidated;
        } catch (error) {
            logger.error('Error invalidating all license cache', { error: error.message });
            return 0;
        }
    }

    /**
     * Check if license validation is cached and still valid
     * @param {string} tenantId - Tenant ID
     * @param {string} licenseKey - License key
     * @returns {Promise<boolean>} True if cached and valid
     */
    async isValidationCached(tenantId, licenseKey) {
        try {
            const cached = await this.getCachedValidationResult(tenantId, licenseKey);
            return cached !== null && cached.valid === true;
        } catch (error) {
            logger.error('Error checking if validation is cached', { 
                tenantId, 
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Warm up license cache for active tenants
     * @param {Array} tenantIds - Array of tenant IDs to warm up
     * @returns {Promise<number>} Number of tenants warmed up
     */
    async warmupLicenseCache(tenantIds) {
        try {
            logger.info('Starting license cache warmup', { tenantCount: tenantIds.length });
            
            let warmedUp = 0;
            for (const tenantId of tenantIds) {
                try {
                    // This would typically involve calling the license validation service
                    // to populate the cache for active tenants
                    // For now, we'll just log the warmup attempt
                    logger.debug('Warming up license cache for tenant', { tenantId });
                    warmedUp++;
                } catch (error) {
                    logger.error('Error warming up license cache for tenant', { 
                        tenantId, 
                        error: error.message 
                    });
                }
            }

            logger.info('License cache warmup completed', { warmedUp, total: tenantIds.length });
            return warmedUp;
        } catch (error) {
            logger.error('Error during license cache warmup', { error: error.message });
            return 0;
        }
    }

    /**
     * Get license validation cache statistics
     * @returns {Promise<Object>} Cache statistics
     */
    async getStats() {
        try {
            const baseStats = cacheService.getStats();
            
            return {
                ...baseStats,
                validationTTL: this.validationTTL,
                shortTTL: this.shortTTL,
                longTTL: this.longTTL,
                cachePrefix: this.cachePrefix
            };
        } catch (error) {
            logger.error('Error getting license validation cache stats', { error: error.message });
            return {};
        }
    }

    /**
     * Monitor license cache performance
     * @returns {Promise<Object>} Performance metrics
     */
    async getPerformanceMetrics() {
        try {
            const stats = await this.getStats();
            
            return {
                hitRate: stats.hitRate,
                totalRequests: stats.hits + stats.misses,
                cacheSize: stats.inMemorySize,
                redisConnected: stats.redis?.connected || false,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error getting license cache performance metrics', { error: error.message });
            return {};
        }
    }
}

// Export singleton instance
const licenseValidationCacheService = new LicenseValidationCacheService();
export default licenseValidationCacheService;