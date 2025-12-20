/**
 * Enhanced Cache Service for HR-SM Platform
 * Implements comprehensive Redis caching for frequently accessed MongoDB data
 * with intelligent cache invalidation strategies and performance optimization
 */

import redisService from '../core/services/redis.service.js';
import logger from '../utils/logger.js';

class CacheService {
    constructor() {
        this.defaultTTL = 300; // 5 minutes
        this.longTTL = 3600; // 1 hour
        this.shortTTL = 60; // 1 minute
        this.inMemoryCache = new Map(); // Fallback for when Redis is unavailable
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.cacheErrors = 0;
    }

    /**
     * Generate cache key with namespace
     * @param {string} namespace - Cache namespace (e.g., 'tenant', 'user', 'license')
     * @param {string} key - Specific key
     * @param {string} tenantId - Optional tenant ID for multi-tenant isolation
     * @returns {string} Formatted cache key
     */
    generateKey(namespace, key, tenantId = null) {
        const parts = ['hrms', namespace];
        if (tenantId) {
            parts.push(`tenant:${tenantId}`);
        }
        parts.push(key);
        return parts.join(':');
    }

    /**
     * Get value from cache with fallback to in-memory cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>} Cached value or null
     */
    async get(key) {
        try {
            // Try Redis first
            const redisValue = await redisService.get(key);
            if (redisValue !== null) {
                this.cacheHits++;
                logger.debug('Cache hit (Redis)', { key });
                return redisValue;
            }

            // Fallback to in-memory cache
            if (this.inMemoryCache.has(key)) {
                const cached = this.inMemoryCache.get(key);
                if (cached.expires > Date.now()) {
                    this.cacheHits++;
                    logger.debug('Cache hit (Memory)', { key });
                    return cached.value;
                } else {
                    this.inMemoryCache.delete(key);
                }
            }

            this.cacheMisses++;
            logger.debug('Cache miss', { key });
            return null;
        } catch (error) {
            this.cacheErrors++;
            logger.error('Cache get error', { key, error: error.message });
            return null;
        }
    }

    /**
     * Set value in cache with TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            // Set in Redis
            const redisSuccess = await redisService.set(key, value, ttl);
            
            // Also set in in-memory cache as fallback
            this.inMemoryCache.set(key, {
                value,
                expires: Date.now() + (ttl * 1000)
            });

            // Clean up expired in-memory entries periodically
            if (this.inMemoryCache.size > 1000) {
                this.cleanupInMemoryCache();
            }

            logger.debug('Cache set', { key, ttl, redisSuccess });
            return redisSuccess;
        } catch (error) {
            this.cacheErrors++;
            logger.error('Cache set error', { key, ttl, error: error.message });
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async del(key) {
        try {
            const redisSuccess = await redisService.del(key);
            this.inMemoryCache.delete(key);
            logger.debug('Cache delete', { key, redisSuccess });
            return redisSuccess;
        } catch (error) {
            this.cacheErrors++;
            logger.error('Cache delete error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete multiple keys matching a pattern
     * @param {string} pattern - Key pattern
     * @returns {Promise<number>} Number of keys deleted
     */
    async delPattern(pattern) {
        try {
            const deletedCount = await redisService.delPattern(pattern);
            
            // Also clean matching keys from in-memory cache
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            let memoryDeleted = 0;
            for (const key of this.inMemoryCache.keys()) {
                if (regex.test(key)) {
                    this.inMemoryCache.delete(key);
                    memoryDeleted++;
                }
            }

            logger.debug('Cache pattern delete', { pattern, redisDeleted: deletedCount, memoryDeleted });
            return deletedCount;
        } catch (error) {
            this.cacheErrors++;
            logger.error('Cache pattern delete error', { pattern, error: error.message });
            return 0;
        }
    }

    /**
     * Cache Mongoose query results
     * @param {string} namespace - Cache namespace
     * @param {string} key - Cache key
     * @param {Function} queryFn - Function that returns Mongoose query promise
     * @param {number} ttl - Time to live in seconds
     * @param {string} tenantId - Optional tenant ID
     * @returns {Promise<any>} Query result (cached or fresh)
     */
    async cacheQuery(namespace, key, queryFn, ttl = this.defaultTTL, tenantId = null) {
        const cacheKey = this.generateKey(namespace, key, tenantId);
        
        try {
            // Try to get from cache first
            const cached = await this.get(cacheKey);
            if (cached !== null) {
                return cached;
            }

            // Execute query and cache result
            const result = await queryFn();
            if (result !== null && result !== undefined) {
                await this.set(cacheKey, result, ttl);
            }

            return result;
        } catch (error) {
            logger.error('Cache query error', { namespace, key, tenantId, error: error.message });
            // Return fresh query result on cache error
            return await queryFn();
        }
    }

    /**
     * Invalidate cache for specific tenant
     * @param {string} tenantId - Tenant ID
     * @param {string} namespace - Optional namespace to limit invalidation
     * @returns {Promise<number>} Number of keys invalidated
     */
    async invalidateTenant(tenantId, namespace = '*') {
        const pattern = this.generateKey(namespace, '*', tenantId);
        return await this.delPattern(pattern);
    }

    /**
     * Invalidate cache for specific namespace
     * @param {string} namespace - Cache namespace
     * @returns {Promise<number>} Number of keys invalidated
     */
    async invalidateNamespace(namespace) {
        const pattern = this.generateKey(namespace, '*');
        return await this.delPattern(pattern);
    }

    /**
     * Clean up expired entries from in-memory cache
     */
    cleanupInMemoryCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, cached] of this.inMemoryCache.entries()) {
            if (cached.expires <= now) {
                this.inMemoryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('In-memory cache cleanup', { cleaned, remaining: this.inMemoryCache.size });
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache performance statistics
     */
    getStats() {
        const hitRate = this.cacheHits + this.cacheMisses > 0 
            ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2)
            : 0;

        return {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            errors: this.cacheErrors,
            hitRate: `${hitRate}%`,
            inMemorySize: this.inMemoryCache.size,
            redis: redisService.getStats()
        };
    }

    /**
     * Reset cache statistics
     */
    resetStats() {
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.cacheErrors = 0;
    }

    /**
     * Warm up cache with frequently accessed data
     * @param {string} tenantId - Tenant ID
     */
    async warmupCache(tenantId) {
        try {
            logger.info('Starting cache warmup', { tenantId });
            
            // This will be implemented with specific data loading
            // For now, just log the warmup attempt
            logger.info('Cache warmup completed', { tenantId });
        } catch (error) {
            logger.error('Cache warmup failed', { tenantId, error: error.message });
        }
    }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;