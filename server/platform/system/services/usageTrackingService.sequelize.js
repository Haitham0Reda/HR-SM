/**
 * Usage Tracking Service (Sequelize)
 * 
 * Tracks API calls, storage usage, and active users per tenant
 * Updates tenant usage metrics in real-time
 */

import { logger } from '../../../core/logging/logger.js';
import Tenant from '../../tenants/models/Tenant.sequelize.js';
import { Op } from 'sequelize';

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
            
    