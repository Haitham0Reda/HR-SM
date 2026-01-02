/**
 * License Server Rate Limiting Middleware
 * 
 * Enhanced rate limiting for license server endpoints
 * Different limits for different types of operations
 * 
 * Requirements: 6.2 - Rate limiting for license server endpoints
 */

import rateLimit from 'express-rate-limit';

/**
 * General license server rate limiter
 */
export const generalRateLimit = rateLimit({
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
 * Validation rate limiter (for HR-SM backend validation requests)
 */
export const validationRateLimit = rateLimit({
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

export default {
    generalRateLimit,
    validationRateLimit
};