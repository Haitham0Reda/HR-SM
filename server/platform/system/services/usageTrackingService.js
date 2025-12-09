/**
 * Usage Tracking Service
 * 
 * Tracks API calls, storage usage, and active users per tenant
 * Updates tenant usage metrics in real-time
 */

import { logger } from '../../../core/logging/logger.js';
import Tenant from '../../tenants/models/Tenant.js';

class UsageTrackingService {
    constructor() {
        // In-memory cache for usage metrics (reset daily)
        this.cache = new Map();
        
        // Cache expiry time (24 hours)
        this.cacheExpiry = 24 * 60 * 60 * 1000;
        
        // Start cache cleanup interval
        this.startCacheCleanup();
        
        logger.info('UsageTrackingService initialized');
    }
    
    /**
     * Track an API call for a tenant
     * @param {string} tenantId - Tenant identifier
     * @param {Object} options - Additional options
     * @param {string} options.endpoint - API endpoint
     * @param {string} options.method - HTTP method
     * @param {number} options.duration - Request duration in ms
     * @returns {Promise<void>}
     */
    async trackApiCall(tenantId, options = {}) {
        try {
            const { endpoint, method, duration } = options;
            
            // Update in-memory cache
            const cacheKey = `api:${tenantId}`;
            const cached = this.cache.get(cacheKey) || {
                count: 0,
                lastUpdated: Date.now(),
                endpoints: {}
            };
            
            cached.count++;
            cached.lastUpdated = Date.now();
            
            // Track per-endpoint stats
            if (endpoint) {
                if (!cached.endpoints[endpoint]) {
                    cached.endpoints[endpoint] = {
                        count: 0,
                        totalDuration: 0,
                        avgDuration: 0
                    };
                }
                
                cached.endpoints[endpoint].count++;
                if (duration) {
                    cached.endpoints[endpoint].totalDuration += duration;
                    cached.endpoints[endpoint].avgDuration = 
                        cached.endpoints[endpoint].totalDuration / cached.endpoints[endpoint].count;
                }
            }
            
            this.cache.set(cacheKey, cached);
            
            // Update database every 100 calls or every 5 minutes
            if (cached.count % 100 === 0 || Date.now() - cached.lastUpdated > 5 * 60 * 1000) {
                await this.flushApiCallsToDatabase(tenantId);
            }
            
            logger.debug('API call tracked', {
                context: { tenantId, endpoint, method, duration }
            });
            
        } catch (error) {
            logger.error('Failed to track API call', {
                context: { tenantId },
                error: error.message,
                stack: error.stack
            });
        }
    }
    
    /**
     * Track storage usage for a tenant
     * @param {string} tenantId - Tenant identifier
     * @param {number} bytes - Bytes used (positive for add, negative for remove)
     * @param {Object} options - Additional options
     * @param {string} options.resource - Resource type (documents, uploads, etc.)
     * @returns {Promise<void>}
     */
    async trackStorageUsage(tenantId, bytes, options = {}) {
        try {
            const { resource } = options;
            
            // Update tenant storage usage
            const tenant = await Tenant.findOne({ tenantId });
            
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            
            // Update storage used
            tenant.usage.storageUsed = (tenant.usage.storageUsed || 0) + bytes;
            
            // Ensure storage doesn't go negative
            if (tenant.usage.storageUsed < 0) {
                tenant.usage.storageUsed = 0;
            }
            
            await tenant.save();
            
            logger.info('Storage usage tracked', {
                context: { 
                    tenantId, 
                    bytes, 
                    resource,
                    totalStorage: tenant.usage.storageUsed
                }
            });
            
            // Check if approaching storage limit
            if (tenant.limits.maxStorage) {
                const percentage = (tenant.usage.storageUsed / tenant.limits.maxStorage) * 100;
                
                if (percentage >= 90) {
                    logger.warn('Tenant approaching storage limit', {
                        context: { 
                            tenantId,
                            storageUsed: tenant.usage.storageUsed,
                            maxStorage: tenant.limits.maxStorage,
                            percentage: percentage.toFixed(2)
                        }
                    });
                }
            }
            
        } catch (error) {
            logger.error('Failed to track storage usage', {
                context: { tenantId, bytes },
                error: error.message,
                stack: error.stack
            });
        }
    }
    
    /**
     * Track active user for a tenant
     * @param {string} tenantId - Tenant identifier
     * @param {string} userId - User identifier
     * @returns {Promise<void>}
     */
    async trackActiveUser(tenantId, userId) {
        try {
            // Update in-memory cache
            const cacheKey = `users:${tenantId}`;
            const cached = this.cache.get(cacheKey) || {
                activeUsers: new Set(),
                lastUpdated: Date.now()
            };
            
            cached.activeUsers.add(userId);
            cached.lastUpdated = Date.now();
            
            this.cache.set(cacheKey, cached);
            
            // Update database periodically
            if (Date.now() - cached.lastUpdated > 5 * 60 * 1000) {
                await this.flushActiveUsersToDatabase(tenantId);
            }
            
            logger.debug('Active user tracked', {
                context: { tenantId, userId }
            });
            
        } catch (error) {
            logger.error('Failed to track active user', {
                context: { tenantId, userId },
                error: error.message,
                stack: error.stack
            });
        }
    }
    
    /**
     * Get usage metrics for a tenant
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<Object>} Usage metrics
     */
    async getUsageMetrics(tenantId) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            
            // Get cached API call data
            const apiCache = this.cache.get(`api:${tenantId}`) || { count: 0, endpoints: {} };
            const userCache = this.cache.get(`users:${tenantId}`) || { activeUsers: new Set() };
            
            return {
                tenantId,
                apiCalls: {
                    thisMonth: tenant.usage.apiCallsThisMonth || 0,
                    cached: apiCache.count,
                    byEndpoint: apiCache.endpoints
                },
                storage: {
                    used: tenant.usage.storageUsed || 0,
                    limit: tenant.limits.maxStorage,
                    percentage: tenant.limits.maxStorage 
                        ? ((tenant.usage.storageUsed / tenant.limits.maxStorage) * 100).toFixed(2)
                        : null
                },
                users: {
                    total: tenant.usage.userCount || 0,
                    active: userCache.activeUsers.size,
                    limit: tenant.limits.maxUsers
                }
            };
            
        } catch (error) {
            logger.error('Failed to get usage metrics', {
                context: { tenantId },
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }
    
    /**
     * Get usage metrics for all tenants
     * @returns {Promise<Array>} Array of usage metrics
     */
    async getAllTenantsUsage() {
        try {
            const tenants = await Tenant.find({ status: 'active' });
            
            const metrics = await Promise.all(
                tenants.map(tenant => this.getUsageMetrics(tenant.tenantId))
            );
            
            return metrics;
            
        } catch (error) {
            logger.error('Failed to get all tenants usage', {
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }
    
    /**
     * Update tenant user count
     * @param {string} tenantId - Tenant identifier
     * @param {number} count - New user count
     * @returns {Promise<void>}
     */
    async updateUserCount(tenantId, count) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            
            tenant.usage.userCount = count;
            await tenant.save();
            
            logger.info('User count updated', {
                context: { tenantId, count }
            });
            
            // Check if approaching user limit
            if (tenant.limits.maxUsers) {
                const percentage = (count / tenant.limits.maxUsers) * 100;
                
                if (percentage >= 90) {
                    logger.warn('Tenant approaching user limit', {
                        context: { 
                            tenantId,
                            userCount: count,
                            maxUsers: tenant.limits.maxUsers,
                            percentage: percentage.toFixed(2)
                        }
                    });
                }
            }
            
        } catch (error) {
            logger.error('Failed to update user count', {
                context: { tenantId, count },
                error: error.message,
                stack: error.stack
            });
        }
    }
    
    /**
     * Flush API call cache to database
     * @param {string} tenantId - Tenant identifier
     * @private
     */
    async flushApiCallsToDatabase(tenantId) {
        try {
            const cacheKey = `api:${tenantId}`;
            const cached = this.cache.get(cacheKey);
            
            if (!cached || cached.count === 0) {
                return;
            }
            
            const tenant = await Tenant.findOne({ tenantId });
            
            if (!tenant) {
                return;
            }
            
            // Update API calls count
            tenant.usage.apiCallsThisMonth = (tenant.usage.apiCallsThisMonth || 0) + cached.count;
            await tenant.save();
            
            // Reset cache
            this.cache.set(cacheKey, {
                count: 0,
                lastUpdated: Date.now(),
                endpoints: {}
            });
            
            logger.debug('API calls flushed to database', {
                context: { tenantId, count: cached.count }
            });
            
        } catch (error) {
            logger.error('Failed to flush API calls to database', {
                context: { tenantId },
                error: error.message
            });
        }
    }
    
    /**
     * Flush active users cache to database
     * @param {string} tenantId - Tenant identifier
     * @private
     */
    async flushActiveUsersToDatabase(tenantId) {
        try {
            const cacheKey = `users:${tenantId}`;
            const cached = this.cache.get(cacheKey);
            
            if (!cached || cached.activeUsers.size === 0) {
                return;
            }
            
            // For now, we just log active users
            // In the future, this could update a separate active users collection
            logger.debug('Active users flushed', {
                context: { 
                    tenantId, 
                    activeUserCount: cached.activeUsers.size 
                }
            });
            
            // Reset cache
            this.cache.set(cacheKey, {
                activeUsers: new Set(),
                lastUpdated: Date.now()
            });
            
        } catch (error) {
            logger.error('Failed to flush active users to database', {
                context: { tenantId },
                error: error.message
            });
        }
    }
    
    /**
     * Start cache cleanup interval
     * Removes expired cache entries
     * @private
     */
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            
            for (const [key, value] of this.cache.entries()) {
                if (now - value.lastUpdated > this.cacheExpiry) {
                    this.cache.delete(key);
                    logger.debug('Cache entry expired', { key });
                }
            }
        }, 60 * 60 * 1000); // Run every hour
    }
    
    /**
     * Flush all cached data to database
     * @returns {Promise<void>}
     */
    async flushAll() {
        try {
            const tenantIds = new Set();
            
            // Collect all tenant IDs from cache
            for (const key of this.cache.keys()) {
                const [type, tenantId] = key.split(':');
                if (tenantId) {
                    tenantIds.add(tenantId);
                }
            }
            
            // Flush each tenant
            for (const tenantId of tenantIds) {
                await this.flushApiCallsToDatabase(tenantId);
                await this.flushActiveUsersToDatabase(tenantId);
            }
            
            logger.info('All usage data flushed to database', {
                tenantCount: tenantIds.size
            });
            
        } catch (error) {
            logger.error('Failed to flush all usage data', {
                error: error.message,
                stack: error.stack
            });
        }
    }
}

// Export singleton instance
const usageTrackingService = new UsageTrackingService();
export default usageTrackingService;
