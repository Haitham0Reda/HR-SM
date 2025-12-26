/**
 * Global Input Validation and Sanitization Middleware
 * 
 * Ensures all API endpoints have comprehensive input validation and sanitization
 * Applied globally to prevent XSS, NoSQL injection, and other security vulnerabilities
 * 
 * Requirements: 6.3 - Input validation and sanitization for all API endpoints
 */

import { body, param, query, validationResult } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';

/**
 * Global input sanitization middleware
 * Applied to all requests to sanitize potentially dangerous content
 */
export const globalInputSanitization = (req, res, next) => {
    try {
        // Sanitize function for recursive object cleaning
        const sanitizeValue = (value) => {
            if (typeof value === 'string') {
                // Remove null bytes and control characters
                value = value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                
                // Sanitize HTML content
                value = sanitizeHtml(value, {
                    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
                    allowedAttributes: {},
                    disallowedTagsMode: 'discard',
                    allowedSchemes: ['http', 'https', 'mailto']
                });
                
                // Trim whitespace
                return value.trim();
            }
            
            if (Array.isArray(value)) {
                return value.map(item => sanitizeValue(item));
            }
            
            if (value && typeof value === 'object') {
                const sanitized = {};
                for (const [key, val] of Object.entries(value)) {
                    // Sanitize key names to prevent prototype pollution
                    const cleanKey = key.replace(/[^a-zA-Z0-9_$]/g, '');
                    if (cleanKey && !['__proto__', 'constructor', 'prototype'].includes(cleanKey)) {
                        sanitized[cleanKey] = sanitizeValue(val);
                    }
                }
                return sanitized;
            }
            
            return value;
        };

        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeValue(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeValue(req.query);
        }

        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeValue(req.params);
        }

        next();
    } catch (error) {
        console.error('Global sanitization error:', error);
        return res.status(400).json({
            success: false,
            message: 'Invalid request format'
        });
    }
};

/**
 * NoSQL injection prevention middleware
 * Detects and blocks common NoSQL injection patterns
 */
export const preventNoSQLInjection = (req, res, next) => {
    const checkForInjection = (obj, path = '') => {
        if (typeof obj === 'string') {
            // Check for MongoDB operators and dangerous patterns
            const injectionPatterns = [
                /\$where/i,
                /\$ne/i,
                /\$gt/i,
                /\$lt/i,
                /\$gte/i,
                /\$lte/i,
                /\$regex/i,
                /\$or/i,
                /\$and/i,
                /\$nor/i,
                /\$not/i,
                /\$exists/i,
                /\$type/i,
                /\$mod/i,
                /\$all/i,
                /\$size/i,
                /\$elemMatch/i,
                /javascript:/i,
                /eval\(/i,
                /function\(/i,
                /setTimeout/i,
                /setInterval/i
            ];

            for (const pattern of injectionPatterns) {
                if (pattern.test(obj)) {
                    throw new Error(`Potential NoSQL injection detected in ${path || 'request'}: ${pattern.source}`);
                }
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                // Check key names for injection patterns
                if (key.startsWith('$') || key.includes('.') || key.includes('\\')) {
                    throw new Error(`Invalid key format detected: ${key}`);
                }
                
                // Recursively check values
                checkForInjection(value, path ? `${path}.${key}` : key);
            }
        }
    };

    try {
        checkForInjection(req.body, 'body');
        checkForInjection(req.query, 'query');
        checkForInjection(req.params, 'params');
        next();
    } catch (error) {
        // Log security incident
        console.warn('NoSQL injection attempt detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            error: error.message,
            timestamp: new Date().toISOString(),
            body: req.body,
            query: req.query,
            params: req.params
        });

        return res.status(400).json({
            success: false,
            message: 'Invalid request format detected'
        });
    }
};

/**
 * XSS prevention middleware
 * Additional layer of XSS protection beyond HTML sanitization
 */
export const preventXSS = (req, res, next) => {
    const checkForXSS = (obj, path = '') => {
        if (typeof obj === 'string') {
            // Check for XSS patterns that might have bypassed sanitization
            const xssPatterns = [
                /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
                /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
                /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
                /<embed[\s\S]*?>/gi,
                /<link[\s\S]*?>/gi,
                /<meta[\s\S]*?>/gi,
                /javascript:/gi,
                /vbscript:/gi,
                /data:text\/html/gi,
                /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
                /<svg[\s\S]*?onload/gi,
                /<img[\s\S]*?onerror/gi
            ];

            for (const pattern of xssPatterns) {
                if (pattern.test(obj)) {
                    throw new Error(`Potential XSS detected in ${path || 'request'}`);
                }
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                checkForXSS(value, path ? `${path}.${key}` : key);
            }
        }
    };

    try {
        checkForXSS(req.body, 'body');
        checkForXSS(req.query, 'query');
        checkForXSS(req.params, 'params');
        next();
    } catch (error) {
        // Log security incident
        console.warn('XSS attempt detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            error: error.message,
            timestamp: new Date().toISOString()
        });

        return res.status(400).json({
            success: false,
            message: 'Invalid content detected'
        });
    }
};

/**
 * Request size validation middleware
 * Prevents DoS attacks through oversized requests
 */
export const validateRequestSize = (options = {}) => {
    const {
        maxBodySize = 10 * 1024 * 1024, // 10MB
        maxQueryParams = 100,
        maxUrlLength = 2048,
        maxHeaderSize = 8192
    } = options;

    return (req, res, next) => {
        try {
            // Check URL length
            if (req.url.length > maxUrlLength) {
                return res.status(414).json({
                    success: false,
                    message: 'URL too long'
                });
            }

            // Check query parameter count
            if (Object.keys(req.query).length > maxQueryParams) {
                return res.status(400).json({
                    success: false,
                    message: 'Too many query parameters'
                });
            }

            // Check header size
            const headerSize = JSON.stringify(req.headers).length;
            if (headerSize > maxHeaderSize) {
                return res.status(431).json({
                    success: false,
                    message: 'Request headers too large'
                });
            }

            // Body size is handled by express.json() middleware with limit option
            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request format'
            });
        }
    };
};

/**
 * Content-Type validation middleware
 * Ensures requests have appropriate content types
 */
export const validateContentType = (req, res, next) => {
    // Skip validation for GET, DELETE, and HEAD requests
    if (['GET', 'DELETE', 'HEAD'].includes(req.method)) {
        return next();
    }

    // Skip validation for file upload endpoints
    if (req.path.includes('/upload') || req.path.includes('/files')) {
        return next();
    }

    const contentType = req.get('Content-Type');
    
    // Allow requests without body or with empty body
    if (!req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
        return next();
    }

    // Check if there's actual content in the request
    const hasContent = req.get('Content-Length') && parseInt(req.get('Content-Length')) > 0;
    if (!hasContent) {
        return next();
    }

    // Validate content type for requests with body
    const allowedTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
    ];

    const isValidType = allowedTypes.some(type => 
        contentType && contentType.toLowerCase().includes(type)
    );

    if (!isValidType) {
        return res.status(415).json({
            success: false,
            message: 'Unsupported content type'
        });
    }

    next();
};

/**
 * Parameter validation middleware
 * Validates common parameter formats
 */
export const validateCommonParameters = (req, res, next) => {
    try {
        // Validate MongoDB ObjectId parameters
        for (const [key, value] of Object.entries(req.params)) {
            if (key.endsWith('Id') || key === 'id') {
                if (value && !mongoose.Types.ObjectId.isValid(value)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid ${key} format`
                    });
                }
            }
        }

        // Validate pagination parameters
        if (req.query.page) {
            const page = parseInt(req.query.page);
            if (isNaN(page) || page < 1 || page > 10000) {
                return res.status(400).json({
                    success: false,
                    message: 'Page must be between 1 and 10000'
                });
            }
        }

        if (req.query.limit) {
            const limit = parseInt(req.query.limit);
            if (isNaN(limit) || limit < 1 || limit > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Limit must be between 1 and 1000'
                });
            }
        }

        // Validate date parameters
        const dateFields = ['startDate', 'endDate', 'date', 'createdAt', 'updatedAt'];
        for (const field of dateFields) {
            if (req.query[field] || req.body[field]) {
                const dateValue = req.query[field] || req.body[field];
                if (dateValue && isNaN(Date.parse(dateValue))) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid ${field} format. Use ISO 8601 format.`
                    });
                }
            }
        }

        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Parameter validation failed'
        });
    }
};

/**
 * Security headers middleware
 * Adds comprehensive security headers to all responses
 * Validates: Requirements 6.3 - Enhanced security features
 */
export const addSecurityHeaders = (req, res, next) => {
    // Prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Strict transport security (HTTPS only) - Enhanced for production
    if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Enhanced Content Security Policy for HR-SM platform
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for React
        "style-src 'self' 'unsafe-inline'", // Allow inline styles for Material-UI
        "img-src 'self' data: https: blob:", // Allow images from various sources
        "font-src 'self' https: data:", // Allow fonts from CDNs
        "connect-src 'self' wss: https:", // Allow WebSocket and HTTPS connections
        "media-src 'self'", // Restrict media sources
        "object-src 'none'", // Block object/embed/applet
        "frame-ancestors 'none'", // Prevent framing
        "base-uri 'self'", // Restrict base URI
        "form-action 'self'", // Restrict form submissions
        "upgrade-insecure-requests" // Upgrade HTTP to HTTPS
    ];
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    
    // Referrer Policy - Enhanced for privacy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Additional security headers for enterprise environment
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    
    // Cache control for security-sensitive responses
    if (req.path.includes('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    next();
};

/**
 * Comprehensive validation middleware stack
 * Combines all validation and sanitization middlewares
 */
export const comprehensiveValidation = [
    validateRequestSize(),
    validateContentType,
    globalInputSanitization,
    preventNoSQLInjection,
    preventXSS,
    validateCommonParameters,
    addSecurityHeaders
];

export default {
    globalInputSanitization,
    preventNoSQLInjection,
    preventXSS,
    validateRequestSize,
    validateContentType,
    validateCommonParameters,
    addSecurityHeaders,
    comprehensiveValidation
};