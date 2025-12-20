/**
 * License Server Rate Limiting Middleware
 * 
 * Enhanced rate limiting with Redis support for license server endpoints
 * Different limits for different types of operations
 * 
 * Requirements: 6.2 - Rate limiting for license server endpoints
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisService from '../../../server/core/services/redis.service.js';

/**
 * Create Redis store for rate limiting
 */
const createRedisStore = () => {
    if (redisService.isEnabled && redisService.isConnected) {
        try {
            return new RedisStore({
                client: redisService.client,
                prefix: 'license_rate_limit:',
                sendCommand: (...args) => redisService.client.sendCommand(args)
            });
        } catch (error) {
            console.warn('Failed to create Redis store for license server rate limiting, using memory store');
            return undefined; // Fall back to memory store
        }
    }
    return undefined; // Use memory store
};

/**
 * General license server rate limiter
 */
export const generalRateLimit = rateLimit({
    store: createRedisStore(),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Higher limit for license operations
    
    keyGenerator: (req) => {
        // Use API key or IP for rate limiting
        const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
        const ip = req.ip || req.connection.remoteAddress;
        return `general:${apiKey ? 'api_key' : 'ip'}:${apiKey || ip}`;
    },
    
    message: {
        success: false,
        error: 'License server rate limit exceeded, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW) || 900000) / 1000)
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    skip: (req) => {
        // Skip health checks
        return req.path.includes('/health');
    },
    
    handler: (req, res) => {
        const ip = req.ip || req.connection.remoteAddress;
        const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
        
        console.warn(`License server rate limit exceeded for ${apiKey ? 'API key' : 'IP'}: ${apiKey || ip}`);
        
        res.status(429).json({
            success: false,
            error: 'License server rate limit exceeded, please try again later.',
            retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW) || 900000) / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Strict rate limiter for license creation (admin operations)
 */
export const adminRateLimit = rateLimit({
    store: createRedisStore(),
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Strict limit for admin operations
    
    keyGenerator: (req) => {
        const adminId = req.admin?.id || req.headers['x-api-key'] || req.ip;
        return `admin:${adminId}`;
    },
    
    message: {
        success: false,
        error: 'Admin operation rate limit exceeded',
        retryAfter: Math.ceil(5 * 60) // 5 minutes
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    handler: (req, res) => {
        const adminId = req.admin?.id || 'unknown';
        const ip = req.ip || req.connection.remoteAddress;
        
        console.warn(`Admin rate limit exceeded for admin: ${adminId}, IP: ${ip}`);
        
        res.status(429).json({
            success: false,
            error: 'Admin operation rate limit exceeded',
            retryAfter: Math.ceil(5 * 60),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Validation rate limiter (for HR-SM backend validation requests)
 */
export const validationRateLimit = rateLimit({
    store: createRedisStore(),
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Allow frequent validation requests
    
    keyGenerator: (req) => {
        // Use tenant ID from token or IP
        const tenantId = req.body?.tenantId || req.ip;
        return `validation:${tenantId}`;
    },
    
    message: {
        success: false,
        valid: false,
        error: 'License validation rate limit exceeded',
        retryAfter: 60 // 1 minute
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    skipSuccessfulRequests: false, // Count all validation requests
    skipFailedRequests: false,
    
    handler: (req, res) => {
        const tenantId = req.body?.tenantId || 'unknown';
        const ip = req.ip || req.connection.remoteAddress;
        
        console.warn(`Validation rate limit exceeded for tenant: ${tenantId}, IP: ${ip}`);
        
        res.status(429).json({
            success: false,
            valid: false,
            error: 'License validation rate limit exceeded',
            retryAfter: 60,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Lenient rate limiter for read operations
 */
export const readRateLimit = rateLimit({
    store: createRedisStore(),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // High limit for read operations
    
    keyGenerator: (req) => {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
        const ip = req.ip || req.connection.remoteAddress;
        return `read:${apiKey ? 'api_key' : 'ip'}:${apiKey || ip}`;
    },
    
    message: {
        success: false,
        error: 'Read operation rate limit exceeded',
        retryAfter: Math.ceil(15 * 60)
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    skipSuccessfulRequests: true, // Don't count successful reads
    
    handler: (req, res) => {
        const ip = req.ip || req.connection.remoteAddress;
        
        console.warn(`Read rate limit exceeded for IP: ${ip}`);
        
        res.status(429).json({
            success: false,
            error: 'Read operation rate limit exceeded',
            retryAfter: Math.ceil(15 * 60),
            timestamp: new Date().toISOString()
        });
    }
});

export default {
    generalRateLimit,
    adminRateLimit,
    validationRateLimit,
    readRateLimit
};