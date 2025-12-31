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
    async getTenantUsage(tenantId) {
        return await this.getUsageMetrics(tenantId);
    }
    
    /**
     * Get aggregated usage statistics
     * @returns {Promise<Object>} Aggregated statistics
     */
    async getAggregatedStats() {
        try {
            const tenants = await Tenant.find({ status: 'active' });
            
            let totalApiCalls = 0;
            let totalStorage = 0;
            let totalUsers = 0;
            let totalRevenue = 0;
            
            const tenantStats = [];
            
            for (const tenant of tenants) {
                const apiCalls = tenant.usage.apiCallsThisMonth || 0;
                const storage = tenant.usage.storageUsed || 0;
                const users = tenant.usage.userCount || 0;
                
                totalApiCalls += apiCalls;
                totalStorage += storage;
                totalUsers += users;
                
                if (tenant.subscription && tenant.subscription.plan && tenant.subscription.plan.price) {
                    totalRevenue += tenant.subscription.plan.price;
                }
                
                tenantStats.push({
                    tenantId: tenant.tenantId,
                    name: tenant.name,
                    apiCalls,
                    storage,
                    users,
                    plan: tenant.subscription?.plan?.name || 'Free'
                });
            }
            
            return {
                totals: {
                    tenants: tenants.length,
                    apiCalls: totalApiCalls,
                    storage: totalStorage,
                    users: totalUsers,
                    revenue: totalRevenue
                },
                averages: {
                    apiCallsPerTenant: tenants.length > 0 ? Math.round(totalApiCalls / tenants.length) : 0,
                    storagePerTenant: tenants.length > 0 ? Math.round(totalStorage / tenants.length) : 0,
                    usersPerTenant: tenants.length > 0 ? Math.round(totalUsers / tenants.length) : 0
                },
                tenantStats
            };
            
        } catch (error) {
            logger.error('Failed to get aggregated stats', {
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }
    
    /**
     * Get tenants exceeding their limits
     * @returns {Promise<Array>} Array of tenants exceeding limits
     */
    async getTenantsExceedingLimits() {
        try {
            const tenants = await Tenant.find({ status: 'active' });
            const exceedingLimits = [];
            
            for (const tenant of tenants) {
                const issues = [];
                
                // Check user limit
                if (tenant.limits.maxUsers && tenant.usage.userCount > tenant.limits.maxUsers) {
                    issues.push({
                        type: 'users',
                        current: tenant.usage.userCount,
                        limit: tenant.limits.maxUsers,
                        percentage: ((tenant.usage.userCount / tenant.limits.maxUsers) * 100).toFixed(2)
                    });
                }
                
                // Check storage limit
                if (tenant.limits.maxStorage && tenant.usage.storageUsed > tenant.limits.maxStorage) {
                    issues.push({
                        type: 'storage',
                        current: tenant.usage.storageUsed,
                        limit: tenant.limits.maxStorage,
                        percentage: ((tenant.usage.storageUsed / tenant.limits.maxStorage) * 100).toFixed(2)
                    });
                }
                
                // Check API calls limit
                if (tenant.limits.maxApiCalls && tenant.usage.apiCallsThisMonth > tenant.limits.maxApiCalls) {
                    issues.push({
                        type: 'apiCalls',
                        current: tenant.usage.apiCallsThisMonth,
                        limit: tenant.limits.maxApiCalls,
                        percentage: ((tenant.usage.apiCallsThisMonth / tenant.limits.maxApiCalls) * 100).toFixed(2)
                    });
                }
                
                if (issues.length > 0) {
                    exceedingLimits.push({
                        tenantId: tenant.tenantId,
                        name: tenant.name,
                        issues
                    });
                }
            }
            
            return exceedingLimits;
            
        } catch (error) {
            logger.error('Failed to get tenants exceeding limits', {
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }
    
    /**
     * Get usage trends for a tenant
     * @param {string} tenantId - Tenant identifier
     * @param {number} days - Number of days to look back
     * @returns {Promise<Object>} Usage trends
     */
    async getUsageTrends(tenantId, days = 30) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            
            // For now, return current usage as trends
            // In a real implementation, you'd query historical data
            const currentUsage = await this.getUsageMetrics(tenantId);
            
            return {
                tenantId,
                period: `${days} days`,
                trends: {
                    users: {
                        current: currentUsage.users.total,
                        trend: 'stable', // This would be calculated from historical data
                        change: 0
                    },
                    apiCalls: {
                        current: currentUsage.apiCalls.thisMonth,
                        trend: 'stable',
                        change: 0
                    },
                    storage: {
                        current: currentUsage.storage.used,
                        trend: 'stable',
                        change: 0
                    }
                }
            };
            
        } catch (error) {
            logger.error('Failed to get usage trends', {
                context: { tenantId, days },
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }
    
    /**
     * Get top tenants by usage metric
     * @param {string} metric - Metric to sort by (users, storage, apiCalls)
     * @param {number} limit - Number of tenants to return
     * @returns {Promise<Array>} Top tenants
     */
    async getTopTenants(metric = 'users', limit = 10) {
        try {
            const tenants = await Tenant.find({ status: 'active' });
            
            // Sort tenants by the specified metric
            const sortedTenants = tenants.sort((a, b) => {
                let valueA = 0;
                let valueB = 0;
                
                switch (metric) {
                    case 'users':
                        valueA = a.usage.userCount || 0;
                        valueB = b.usage.userCount || 0;
                        break;
                    case 'storage':
                        valueA = a.usage.storageUsed || 0;
                        valueB = b.usage.storageUsed || 0;
                        break;
                    case 'apiCalls':
                        valueA = a.usage.apiCallsThisMonth || 0;
                        valueB = b.usage.apiCallsThisMonth || 0;
                        break;
                    default:
                        valueA = a.usage.userCount || 0;
                        valueB = b.usage.userCount || 0;
                }
                
                return valueB - valueA; // Descending order
            });
            
            // Return top tenants with their metrics
            return sortedTenants.slice(0, limit).map(tenant => ({
                tenantId: tenant.tenantId,
                name: tenant.name,
                value: tenant.usage[metric === 'apiCalls' ? 'apiCallsThisMonth' : metric === 'users' ? 'userCount' : 'storageUsed'] || 0,
                plan: tenant.subscription?.plan?.name || 'Free',
                createdAt: tenant.createdAt
            }));
            
        } catch (error) {
            logger.error('Failed to get top tenants', {
                context: { metric, limit },
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }
    
    /**
     * Reset monthly usage counters for all tenants
     * @returns {Promise<number>} Number of tenants reset
     */
    async resetMonthlyUsage() {
        try {
            const result = await Tenant.updateMany(
                { status: 'active' },
                { 
                    $set: { 
                        'usage.apiCallsThisMonth': 0 
                    } 
                }
            );
            
            logger.info('Monthly usage counters reset', {
                tenantsReset: result.modifiedCount
            });
            
            return result.modifiedCount;
            
        } catch (error) {
            logger.error('Failed to reset monthly usage', {
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }
    
    /**
     * Update storage usage for a tenant
     * @param {string} tenantId - Tenant identifier
     * @param {number} bytes - New storage usage in bytes
     * @returns {Promise<void>}
     */
    async updateStorageUsage(tenantId, bytes) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            
            tenant.usage.storageUsed = bytes;
            await tenant.save();
            
            logger.info('Storage usage updated', {
                context: { tenantId, bytes }
            });
            
        } catch (error) {
            logger.error('Failed to update storage usage', {
                context: { tenantId, bytes },
                error: error.message,
                stack: error.stack
            });
            
            throw error;
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
     * @param {number} count - New user count (optional, will count from database if not provided)
     * @returns {Promise<void>}
     */
    async updateUserCount(tenantId, count = null) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            
            // If count is not provided, we could count users from the database
            // For now, we'll just use the provided count or keep the existing count
            if (count !== null) {
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
            } else {
                logger.info('User count update requested but no count provided', {
                    context: { tenantId, currentCount: tenant.usage.userCount }
                });
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
     * Get system-wide statistics
     * @returns {Promise<Object>} System statistics
     */
    async getSystemStats() {
        try {
            // Get all active tenants
            const tenants = await Tenant.find({ status: 'active' });
            
            // Calculate totals
            let totalTenants = tenants.length;
            let totalUsers = 0;
            let totalRevenue = 0;
            let totalApiCalls = 0;
            let totalStorage = 0;
            
            for (const tenant of tenants) {
                totalUsers += tenant.usage.userCount || 0;
                totalApiCalls += tenant.usage.apiCallsThisMonth || 0;
                totalStorage += tenant.usage.storageUsed || 0;
                
                // Calculate revenue based on subscription plan
                if (tenant.subscription && tenant.subscription.plan) {
                    const plan = tenant.subscription.plan;
                    if (plan.price) {
                        totalRevenue += plan.price;
                    }
                }
            }
            
            // System uptime in seconds
            const systemUptime = process.uptime();
            
            return {
                totalTenants,
                totalUsers,
                totalRevenue,
                systemUptime,
                totalApiCalls,
                totalStorage,
                averageUsersPerTenant: totalTenants > 0 ? Math.round(totalUsers / totalTenants) : 0,
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            logger.error('Failed to get system stats', {
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
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
