/**
 * License Server Validation Middleware
 * 
 * Comprehensive input validation and sanitization for license server endpoints
 * Implements express-validator rules with XSS prevention and injection protection
 * 
 * Requirements: 6.3 - Input validation and sanitization for license API endpoints
 */

import { body, param, query, validationResult, matchedData } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';

/**
 * Enhanced error handler for validation results
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Log validation failures for security monitoring
        console.warn('License Server - Validation failed:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            errors: errors.array(),
            timestamp: new Date().toISOString()
        });

        return res.status(400).json({
            success: false,
            message: 'Input validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    
    // Only pass validated data to the next middleware
    req.validatedData = matchedData(req);
    next();
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtmlContent = (field) => {
    return body(field).customSanitizer((value) => {
        if (typeof value === 'string') {
            return sanitizeHtml(value, {
                allowedTags: [],
                allowedAttributes: {},
                disallowedTagsMode: 'discard'
            });
        }
        return value;
    });
};

/**
 * Validate license creation request
 */
export const validateLicenseCreate = [
    body('tenantId')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Tenant ID is required and must be less than 100 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Tenant ID can only contain alphanumeric characters, underscores, and hyphens'),
    
    body('tenantName')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Tenant name must be between 2 and 200 characters')
        .matches(/^[\p{L}\p{M}\s\-'\.&,()0-9]+$/u)
        .withMessage('Tenant name contains invalid characters'),
    
    body('type')
        .isIn(['trial', 'basic', 'professional', 'enterprise', 'unlimited'])
        .withMessage('Invalid license type'),
    
    body('expiresAt')
        .isISO8601({ strict: true })
        .withMessage('Expiry date must be a valid ISO 8601 date')
        .custom((value) => {
            const expiryDate = new Date(value);
            const now = new Date();
            const maxFuture = new Date();
            maxFuture.setFullYear(maxFuture.getFullYear() + 10); // Max 10 years in future
            
            if (expiryDate <= now) {
                throw new Error('Expiry date must be in the future');
            }
            if (expiryDate > maxFuture) {
                throw new Error('Expiry date cannot be more than 10 years in the future');
            }
            return true;
        }),
    
    body('modules')
        .optional()
        .isArray({ min: 1, max: 20 })
        .withMessage('Modules must be an array with 1-20 items')
        .custom((modules) => {
            const validModules = ['hr-core', 'tasks', 'clinic', 'payroll', 'reports', 'life-insurance'];
            for (const module of modules) {
                if (!validModules.includes(module)) {
                    throw new Error(`Invalid module: ${module}`);
                }
            }
            return true;
        }),
    
    body('maxUsers')
        .optional()
        .isInt({ min: 1, max: 100000 })
        .withMessage('Max users must be between 1 and 100,000')
        .toInt(),
    
    body('maxStorage')
        .optional()
        .isInt({ min: 100, max: 1000000 })
        .withMessage('Max storage must be between 100MB and 1TB (1,000,000MB)')
        .toInt(),
    
    body('maxAPICallsPerMonth')
        .optional()
        .isInt({ min: 1000, max: 10000000 })
        .withMessage('Max API calls per month must be between 1,000 and 10,000,000')
        .toInt(),
    
    body('domain')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/)
        .withMessage('Invalid domain format'),
    
    body('machineHash')
        .optional()
        .trim()
        .isLength({ min: 32, max: 128 })
        .withMessage('Machine hash must be between 32 and 128 characters')
        .matches(/^[a-fA-F0-9]+$/)
        .withMessage('Machine hash must be a valid hexadecimal string'),
    
    body('ipWhitelist')
        .optional()
        .isArray({ max: 100 })
        .withMessage('IP whitelist cannot exceed 100 entries')
        .custom((ips) => {
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
            for (const ip of ips) {
                if (!ipRegex.test(ip)) {
                    throw new Error(`Invalid IP address format: ${ip}`);
                }
                // Validate IP octets
                const parts = ip.split('/')[0].split('.');
                for (const part of parts) {
                    const num = parseInt(part);
                    if (num < 0 || num > 255) {
                        throw new Error(`Invalid IP address: ${ip}`);
                    }
                }
            }
            return true;
        }),
    
    body('maxActivations')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Max activations must be between 1 and 100')
        .toInt(),
    
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters'),
    
    sanitizeHtmlContent('notes'),
    handleValidationErrors
];

/**
 * Validate license validation request
 */
export const validateLicenseValidation = [
    body('token')
        .trim()
        .isLength({ min: 100, max: 2000 })
        .withMessage('License token is required and must be a valid JWT')
        .matches(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
        .withMessage('Invalid JWT token format'),
    
    body('machineId')
        .optional()
        .trim()
        .isLength({ min: 16, max: 128 })
        .withMessage('Machine ID must be between 16 and 128 characters')
        .matches(/^[a-fA-F0-9-]+$/)
        .withMessage('Machine ID must be a valid hexadecimal string with optional hyphens'),
    
    body('ipAddress')
        .optional()
        .trim()
        .matches(/^(\d{1,3}\.){3}\d{1,3}$/)
        .withMessage('Invalid IP address format')
        .custom((value) => {
            const octets = value.split('.');
            for (const octet of octets) {
                const num = parseInt(octet);
                if (num < 0 || num > 255) {
                    throw new Error('Invalid IP address');
                }
            }
            return true;
        }),
    
    handleValidationErrors
];

/**
 * Validate license number parameter
 */
export const validateLicenseNumber = [
    param('licenseNumber')
        .trim()
        .matches(/^HRSM-[A-F0-9]+-[A-F0-9]+$/)
        .withMessage('Invalid license number format'),
    
    handleValidationErrors
];

/**
 * Validate tenant ID parameter
 */
export const validateTenantId = [
    param('tenantId')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Tenant ID is required and must be less than 100 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Tenant ID can only contain alphanumeric characters, underscores, and hyphens'),
    
    handleValidationErrors
];

/**
 * Validate license renewal request
 */
export const validateLicenseRenewal = [
    body('expiresAt')
        .isISO8601({ strict: true })
        .withMessage('New expiry date must be a valid ISO 8601 date')
        .custom((value) => {
            const expiryDate = new Date(value);
            const now = new Date();
            const maxFuture = new Date();
            maxFuture.setFullYear(maxFuture.getFullYear() + 10);
            
            if (expiryDate <= now) {
                throw new Error('New expiry date must be in the future');
            }
            if (expiryDate > maxFuture) {
                throw new Error('New expiry date cannot be more than 10 years in the future');
            }
            return true;
        }),
    
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Renewal notes cannot exceed 500 characters'),
    
    sanitizeHtmlContent('notes'),
    handleValidationErrors
];

/**
 * Validate license revocation request
 */
export const validateLicenseRevocation = [
    body('reason')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Revocation reason must be between 5 and 500 characters'),
    
    body('revokedBy')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Revoked by field must be less than 100 characters'),
    
    sanitizeHtmlContent('reason'),
    handleValidationErrors
];

/**
 * Validate pagination parameters
 */
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Page must be between 1 and 10,000')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Limit must be between 1 and 1,000')
        .toInt(),
    
    query('sort')
        .optional()
        .matches(/^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?$/)
        .withMessage('Sort must be a valid field name with optional .asc or .desc'),
    
    query('status')
        .optional()
        .isIn(['active', 'suspended', 'expired', 'revoked'])
        .withMessage('Invalid status filter'),
    
    query('type')
        .optional()
        .isIn(['trial', 'basic', 'professional', 'enterprise', 'unlimited'])
        .withMessage('Invalid type filter'),
    
    handleValidationErrors
];

/**
 * Prevent injection attacks
 */
export const preventInjection = (req, res, next) => {
    const checkForInjection = (obj, path = '') => {
        if (typeof obj === 'string') {
            // Check for common injection patterns
            const injectionPatterns = [
                /\$where/i,
                /\$ne/i,
                /\$gt/i,
                /\$lt/i,
                /\$regex/i,
                /\$or/i,
                /\$and/i,
                /javascript:/i,
                /<script/i,
                /eval\(/i,
                /function\(/i,
                /\{\s*\$.*\}/i
            ];

            for (const pattern of injectionPatterns) {
                if (pattern.test(obj)) {
                    throw new Error(`Potential injection detected in ${path || 'request'}`);
                }
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                // Check key names for injection
                if (key.startsWith('$') || key.includes('.') || key.includes('__proto__')) {
                    throw new Error(`Invalid key format: ${key}`);
                }
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
        console.warn('License Server - Injection attempt detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            error: error.message,
            timestamp: new Date().toISOString()
        });

        return res.status(400).json({
            success: false,
            message: 'Invalid request format'
        });
    }
};

/**
 * Validate JSON structure
 */
export const validateJsonStructure = (req, res, next) => {
    try {
        // Check if request body is valid JSON object
        if (req.method !== 'GET' && req.method !== 'DELETE') {
            if (typeof req.body !== 'object' || req.body === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Request body must be a valid JSON object'
                });
            }

            // Check for deeply nested objects (potential DoS attack)
            const maxDepth = 10;
            const checkDepth = (obj, depth = 0) => {
                if (depth > maxDepth) {
                    throw new Error('Object nesting too deep');
                }
                if (typeof obj === 'object' && obj !== null) {
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            checkDepth(obj[key], depth + 1);
                        }
                    }
                }
            };

            checkDepth(req.body);
        }
        
        next();
    } catch (error) {
        console.warn('License Server - Invalid JSON structure:', {
            ip: req.ip,
            path: req.path,
            error: error.message,
            timestamp: new Date().toISOString()
        });

        return res.status(400).json({
            success: false,
            message: 'Invalid JSON structure: ' + error.message
        });
    }
};

export default {
    handleValidationErrors,
    sanitizeHtmlContent,
    validateLicenseCreate,
    validateLicenseValidation,
    validateLicenseNumber,
    validateTenantId,
    validateLicenseRenewal,
    validateLicenseRevocation,
    validatePagination,
    preventInjection,
    validateJsonStructure
};