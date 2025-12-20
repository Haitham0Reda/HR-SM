/**
 * Enhanced Rate Limiting Middleware with Redis Support
 * 
 * Provides tenant-specific rate limiting based on license type with Redis persistence
 * Implements different rate limits for different endpoint categories
 * 
 * Requirements: 6.2 - Rate limiting by license type with Redis storage
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisService from '../core/services/redis.service.js';
import logger from '../utils/logger.js';

/**
 * Rate limit configurations by license type
 */
const RATE_LIMITS = {
    trial: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 50,
        message: 'Trial license rate limit exceeded'
    },
    basic: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 200,
        message: 'Basic license rate limit exceeded'
    },
    professional: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 500,
        message: 'Professional license rate limit exceeded'
    },
    enterprise: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 2000,
        message: 'Enterprise license rate limit exceeded'
    },
    unlimited: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10000,
        message: 'Rate limit exceeded'
    }
};

/**
 * Endpoint category rate limits
 */
const ENDPOINT_CATEGORIES = {
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10, // Strict for authentication
        skipSuccessfulRequests: true
    },
    sensitive: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 20, // Very strict for sensitive operations
        skipSuccessfulRequests: false
    },
    api: {
        // Uses license-based limits
        skipSuccessfulRequests: false
    },
    public: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000, // Lenient for public endpoints
        skipSuccessfulRequests: true
    }
};

/**
 * Create Redis store for rate limiting
 */
const createRedisStore = () => {
    if (redisService.isEnabled && redisService.isConnected) {
        try {
            return new RedisStore({
                client: redisService.client,
                prefix: 'rate_limit:',
                sendCommand: (...args) => redisService.client.sendCommand(args)
            });
        } catch (error) {
            logger.warn('Failed to create Redis store for rate limiting, using memory store', {
                error: error.message
            });
            return undefined; // Fall back to memory store
        }
    }
    return undefined; // Use memory store
};

/**
 * Enhanced rate limiter with tenant-specific limits based on license type
 */
export const createTenantRateLimit = (options = {}) => {
    const {
        category = 'api',
        customLimits = {},
        skipPaths = [],
        skipMethods = ['OPTIONS']
    } = options;

    return rateLimit({
        store: createRedisStore(),
        
        // Dynamic window and max based on license type
        windowMs: (req) => {
            const licenseType = req.tenant?.licenseType || req.user?.licenseType || 'trial';
            const categoryConfig = ENDPOINT_CATEGORIES[category];
            
            if (categoryConfig && categoryConfig.windowMs) {
                return categoryConfig.windowMs;
            }
            
            return customLimits.windowMs || RATE_LIMITS[licenseType]?.windowMs || RATE_LIMITS.trial.windowMs;
        },
        
        max: (req) => {
            const licenseType = req.tenant?.licenseType || req.user?.licenseType || 'trial';
            const categoryConfig = ENDPOINT_CATEGORIES[category];
            
            if (categoryConfig && categoryConfig.maxRequests) {
                return categoryConfig.maxRequests;
            }
            
            return customLimits.maxRequests || RATE_LIMITS[licenseType]?.maxRequests || RATE_LIMITS.trial.maxRequests;
        },
        
        // Use tenant ID + IP for key generation
        keyGenerator: (req) => {
            const tenantId = req.tenant?.tenantId || req.user?.tenantId || 'unknown';
            const ip = req.ip || req.connection.remoteAddress;
            return `${category}:${tenantId}:${ip}`;
        },
        
        // Custom message based on license type
        message: (req) => {
            const licenseType = req.tenant?.licenseType || req.user?.licenseType || 'trial';
            const categoryConfig = ENDPOINT_CATEGORIES[category];
            
            if (categoryConfig && categoryConfig.message) {
                return {
                    success: false,
                    error: categoryConfig.message,
                    retryAfter: Math.ceil(categoryConfig.windowMs / 1000)
                };
            }
            
            return {
                success: false,
                error: customLimits.message || RATE_LIMITS[licenseType]?.message || RATE_LIMITS.trial.message,
                retryAfter: Math.ceil((customLimits.windowMs || RATE_LIMITS[licenseType]?.windowMs || RATE_LIMITS.trial.windowMs) / 1000),
                licenseType,
                category
            };
        },
        
        // Skip certain conditions
        skip: (req) => {
            // Skip for certain paths
            if (skipPaths.some(path => req.path.includes(path))) {
                return true;
            }
            
            // Skip for certain methods
            if (skipMethods.includes(req.method)) {
                return true;
            }
            
            // Skip for super admin in development
            if (process.env.NODE_ENV === 'development' && req.user?.role === 'super_admin') {
                return true;
            }
            
            return false;
        },
        
        // Skip successful requests for certain categories
        skipSuccessfulRequests: (req) => {
            const categoryConfig = ENDPOINT_CATEGORIES[category];
            return categoryConfig?.skipSuccessfulRequests || false;
        },
        
        skipFailedRequests: false,
        
        // Standard headers
        standardHeaders: true,
        legacyHeaders: false,
        
        // Custom handler for rate limit exceeded
        handler: (req, res) => {
            const tenantId = req.tenant?.tenantId || req.user?.tenantId || 'unknown';
            const licenseType = req.tenant?.licenseType || req.user?.licenseType || 'trial';
            const ip = req.ip || req.connection.remoteAddress;
            
            // Log rate limit violation
            logger.warn('Rate limit exceeded', {
                tenantId,
                licenseType,
                category,
                ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString()
            });
            
            // Send response
            const windowMs = customLimits.windowMs || RATE_LIMITS[licenseType]?.windowMs || RATE_LIMITS.trial.windowMs;
            res.status(429).json({
                success: false,
                error: customLimits.message || RATE_LIMITS[licenseType]?.message || RATE_LIMITS.trial.message,
                retryAfter: Math.ceil(windowMs / 1000),
                licenseType,
                category,
                timestamp: new Date().toISOString()
            });
        }
    });
};

/**
 * Authentication rate limiter (IP-based, very strict)
 */
export const authRateLimit = createTenantRateLimit({
    category: 'auth',
    skipPaths: ['/health', '/metrics']
});

/**
 * Sensitive operations rate limiter (very strict)
 */
export const sensitiveRateLimit = createTenantRateLimit({
    category: 'sensitive',
    skipPaths: ['/health', '/metrics']
});

/**
 * General API rate limiter (license-based)
 */
export const apiRateLimit = createTenantRateLimit({
    category: 'api',
    skipPaths: ['/health', '/metrics', '/auth/refresh']
});

/**
 * Public endpoints rate limiter (lenient)
 */
export const publicRateLimit = createTenantRateLimit({
    category: 'public',
    skipPaths: ['/health', '/metrics']
});

/**
 * License server specific rate limiter
 */
export const licenseServerRateLimit = () => {
    return rateLimit({
        store: createRedisStore(),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500, // Higher limit for license server
        
        keyGenerator: (req) => {
            // Use API key or IP for license server
            const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
            const ip = req.ip || req.connection.remoteAddress;
            return `license_server:${apiKey ? 'api_key' : 'ip'}:${apiKey || ip}`;
        },
        
        message: {
            success: false,
            error: 'License server rate limit exceeded',
            retryAfter: Math.ceil(15 * 60) // 15 minutes
        },
        
        skip: (req) => {
            // Skip health checks
            if (req.path.includes('/health')) {
                return true;
            }
            return false;
        },
        
        standardHeaders: true,
        legacyHeaders: false,
        
        handler: (req, res) => {
            const ip = req.ip || req.connection.remoteAddress;
            const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
            
            logger.warn('License server rate limit exceeded', {
                ip,
                hasApiKey: !!apiKey,
                path: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            
            res.status(429).json({
                success: false,
                error: 'License server rate limit exceeded',
                retryAfter: Math.ceil(15 * 60),
                timestamp: new Date().toISOString()
            });
        }
    });
};

/**
 * Global rate limiter for all requests (fallback)
 */
export const globalRateLimit = () => {
    return rateLimit({
        store: createRedisStore(),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10000, // Very high limit as fallback
        
        keyGenerator: (req) => {
            return `global:${req.ip}`;
        },
        
        message: {
            success: false,
            error: 'Global rate limit exceeded',
            retryAfter: Math.ceil(15 * 60)
        },
        
        skip: (req) => {
            // Skip health checks and metrics
            return req.path.includes('/health') || req.path.includes('/metrics');
        },
        
        standardHeaders: true,
        legacyHeaders: false,
        
        handler: (req, res) => {
            logger.error('Global rate limit exceeded - potential attack', {
                ip: req.ip,
                path: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            
            res.status(429).json({
                success: false,
                error: 'Global rate limit exceeded',
                retryAfter: Math.ceil(15 * 60),
                timestamp: new Date().toISOString()
            });
        }
    });
};

/**
 * Get rate limit status for a tenant
 */
export const getRateLimitStatus = async (tenantId, category = 'api', ip = 'unknown') => {
    if (!redisService.isEnabled || !redisService.isConnected) {
        return {
            enabled: false,
            message: 'Rate limiting using memory store'
        };
    }
    
    try {
        const key = `rate_limit:${category}:${tenantId}:${ip}`;
        const current = await redisService.get(key) || 0;
        const ttl = await redisService.ttl(key);
        
        return {
            enabled: true,
            current,
            ttl,
            key,
            category
        };
    } catch (error) {
        logger.error('Failed to get rate limit status', {
            tenantId,
            category,
            ip,
            error: error.message
        });
        
        return {
            enabled: false,
            error: error.message
        };
    }
};

/**
 * Clear rate limit for a tenant (admin function)
 */
export const clearRateLimit = async (tenantId, category = null, ip = null) => {
    if (!redisService.isEnabled || !redisService.isConnected) {
        return {
            success: false,
            message: 'Redis not available'
        };
    }
    
    try {
        let pattern;
        if (category && ip) {
            pattern = `rate_limit:${category}:${tenantId}:${ip}`;
        } else if (category) {
            pattern = `rate_limit:${category}:${tenantId}:*`;
        } else {
            pattern = `rate_limit:*:${tenantId}:*`;
        }
        
        const deletedCount = await redisService.delPattern(pattern);
        
        logger.info('Rate limit cleared', {
            tenantId,
            category,
            ip,
            deletedCount,
            pattern
        });
        
        return {
            success: true,
            deletedCount,
            pattern
        };
    } catch (error) {
        logger.error('Failed to clear rate limit', {
            tenantId,
            category,
            ip,
            error: error.message
        });
        
        return {
            success: false,
            error: error.message
        };
    }
};

export default {
    createTenantRateLimit,
    authRateLimit,
    sensitiveRateLimit,
    apiRateLimit,
    publicRateLimit,
    licenseServerRateLimit,
    globalRateLimit,
    getRateLimitStatus,
    clearRateLimit
};