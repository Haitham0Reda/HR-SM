/**
 * Rate Limiting Middleware
 * 
 * Provides company-specific rate limiting for API endpoints
 * to prevent abuse and ensure fair resource usage
 * 
 * Requirements: 4.2, 5.4
 */

import rateLimit from 'express-rate-limit';
import companyLogger from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';

/**
 * Create rate limiter with company-specific tracking
 * 
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.message - Error message for rate limit exceeded
 * @param {boolean} options.standardHeaders - Include standard rate limit headers
 * @param {boolean} options.legacyHeaders - Include legacy rate limit headers
 * @returns {Function} Express middleware function
 */
export function rateLimitByCompany(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes default
        maxRequests = 100,
        message = 'Too many requests from this company, please try again later',
        standardHeaders = true,
        legacyHeaders = false,
        skipSuccessfulRequests = false,
        skipFailedRequests = false
    } = options;

    return rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            error: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders,
        legacyHeaders,
        skipSuccessfulRequests,
        skipFailedRequests,
        
        // Use company ID as the key for rate limiting
        keyGenerator: (req) => {
            const companyId = req.tenant?.tenantId || req.user?.tenantId || 'unknown';
            return `company:${companyId}`;
        },
        
        // Custom handler for rate limit exceeded
        handler: (req, res) => {
            const companyId = req.tenant?.tenantId || req.user?.tenantId || 'unknown';
            const companyName = req.tenant?.companyName || 'Unknown Company';
            
            // Log rate limit violation
            const logger = await companyLogger.getLoggerForTenant(companyId, companyName);
            logger.warn('Rate limit exceeded', {
                correlationId: req.correlationId,
                userId: req.user?.id,
                userRole: req.user?.role,
                endpoint: req.originalUrl,
                method: req.method,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                windowMs,
                maxRequests
            });

            // Platform logging for monitoring
            platformLogger.systemPerformance({
                component: 'rate-limiter',
                companyId,
                event: 'rate_limit_exceeded',
                endpoint: req.originalUrl,
                method: req.method,
                windowMs,
                maxRequests,
                ipAddress: req.ip
            });

            res.status(429).json({
                success: false,
                error: message,
                retryAfter: Math.ceil(windowMs / 1000),
                correlationId: req.correlationId
            });
        },
        
        // Skip rate limiting for certain conditions
        skip: (req) => {
            // Skip for super admin users in development
            if (process.env.NODE_ENV === 'development' && req.user?.role === 'super_admin') {
                return true;
            }
            
            // Skip for health check endpoints
            if (req.originalUrl.includes('/health')) {
                return true;
            }
            
            return false;
        },
        
        // Store rate limit data in memory (could be enhanced with Redis)
        store: undefined // Uses default memory store
    });
}

/**
 * Strict rate limiter for sensitive operations
 * 
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
export function strictRateLimit(options = {}) {
    const {
        windowMs = 5 * 60 * 1000, // 5 minutes
        maxRequests = 10,
        message = 'Too many sensitive operations, please try again later'
    } = options;

    return rateLimitByCompany({
        windowMs,
        maxRequests,
        message,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    });
}

/**
 * Lenient rate limiter for read operations
 * 
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
export function lenientRateLimit(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 1000,
        message = 'Too many requests, please try again later'
    } = options;

    return rateLimitByCompany({
        windowMs,
        maxRequests,
        message,
        skipSuccessfulRequests: true,
        skipFailedRequests: false
    });
}

/**
 * Authentication rate limiter
 * 
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
export function authRateLimit(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 5,
        message = 'Too many authentication attempts, please try again later'
    } = options;

    return rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            error: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // Don't count successful logins
        skipFailedRequests: false,
        
        // Use IP address for authentication rate limiting
        keyGenerator: (req) => {
            return `auth:${req.ip}`;
        },
        
        handler: (req, res) => {
            // Log authentication rate limit violation
            platformLogger.platformSecurity('auth_rate_limit_exceeded', {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                endpoint: req.originalUrl,
                method: req.method,
                windowMs,
                maxRequests,
                timestamp: new Date().toISOString()
            });

            res.status(429).json({
                success: false,
                error: message,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
}

export default {
    rateLimitByCompany,
    strictRateLimit,
    lenientRateLimit,
    authRateLimit
};