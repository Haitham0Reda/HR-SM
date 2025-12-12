/**
 * Request Logging Middleware
 * 
 * Adds request ID tracking and logs all requests with tenant context
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging/logger.js';

/**
 * Generate a unique request ID
 * @returns {string} Request ID
 */
function generateRequestId() {
    return `req_${uuidv4()}`;
}

/**
 * Request logging middleware
 * Adds request ID and logs all incoming requests
 */
export const requestLogger = (req, res, next) => {
    // Generate request ID
    const requestId = req.headers['x-request-id'] || generateRequestId();
    req.id = requestId;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Build context
    const context = {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    };
    
    // Add tenant context if available
    if (req.tenant) {
        context.tenantId = req.tenant.id || req.tenant.tenantId;
    }
    
    // Add user context if available
    if (req.user) {
        context.userId = req.user.id || req.user._id;
    }
    
    // Create request-scoped logger
    req.logger = logger.withContext(context);
    
    // Log request start
    req.logger.info('Request started', {
        query: req.query,
        body: sanitizeBody(req.body)
    });
    
    // Track response time
    const startTime = Date.now();
    
    // Log response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        
        req.logger.info('Request completed', {
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
        
        return originalSend.call(this, data);
    };
    
    // Log errors
    res.on('finish', () => {
        if (res.statusCode >= 400) {
            const duration = Date.now() - startTime;
            
            req.logger.warn('Request failed', {
                statusCode: res.statusCode,
                duration: `${duration}ms`
            });
        }
    });
    
    next();
};

/**
 * Sanitize request body for logging
 * Removes sensitive fields like passwords
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
function sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
        return body;
    }
    
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    
    return sanitized;
}

/**
 * Error logging middleware
 * Logs all errors with full context
 */
export const errorLogger = (err, req, res, next) => {
    const context = {
        requestId: req.id,
        method: req.method,
        path: req.path,
        tenantId: req.tenant?.id || req.tenant?.tenantId,
        userId: req.user?.id || req.user?._id
    };
    
    logger.error('Request error', {
        context,
        error: {
            message: err.message,
            code: err.code,
            statusCode: err.statusCode,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
    
    next(err);
};

export default requestLogger;
