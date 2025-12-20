/**
 * Enhanced Validation Middleware
 * 
 * Comprehensive input validation and sanitization middleware for enterprise security
 * Implements express-validator rules with XSS prevention and NoSQL injection protection
 * 
 * Requirements: 6.3 - Input validation and sanitization
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
        console.warn('Validation failed:', {
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
 * Comprehensive HTML sanitization to prevent XSS attacks
 */
export const sanitizeHtmlContent = (field, options = {}) => {
    const defaultOptions = {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: {},
        allowedSchemes: ['http', 'https', 'mailto'],
        disallowedTagsMode: 'discard',
        allowedClasses: {},
        ...options
    };

    return body(field).customSanitizer((value) => {
        if (typeof value === 'string') {
            return sanitizeHtml(value, defaultOptions);
        }
        return value;
    });
};

/**
 * Strict HTML sanitization for high-security fields
 */
export const sanitizeStrictHtml = (field) => {
    return sanitizeHtmlContent(field, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard'
    });
};

/**
 * Enhanced MongoDB ID validation with existence check
 */
export const validateMongoIdWithExistence = (field, model) => {
    return [
        param(field)
            .isMongoId()
            .withMessage(`Invalid ${field} format`)
            .custom(async (value, { req }) => {
                if (!mongoose.Types.ObjectId.isValid(value)) {
                    throw new Error(`Invalid ${field} format`);
                }
                
                // Check if document exists (if model is provided)
                if (model) {
                    const doc = await model.findById(value);
                    if (!doc) {
                        throw new Error(`${field} not found`);
                    }
                    req.validatedDocument = doc;
                }
                return true;
            })
    ];
};

/**
 * Enhanced email validation with domain restrictions
 */
export const validateEmailEnhanced = (field = 'email', options = {}) => {
    const { 
        allowedDomains = [], 
        blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'],
        required = true 
    } = options;

    const validator = body(field)
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .custom((value) => {
            const domain = value.split('@')[1];
            
            // Check blocked domains
            if (blockedDomains.includes(domain)) {
                throw new Error('Email domain is not allowed');
            }
            
            // Check allowed domains (if specified)
            if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
                throw new Error('Email domain is not in the allowed list');
            }
            
            return true;
        });

    return required ? validator : validator.optional();
};

/**
 * Enhanced password validation with comprehensive security rules
 */
export const validatePasswordEnhanced = (field = 'password', options = {}) => {
    const {
        minLength = 12,
        maxLength = 128,
        requireUppercase = true,
        requireLowercase = true,
        requireNumbers = true,
        requireSpecialChars = true,
        forbiddenPatterns = ['password', '123456', 'qwerty', 'admin'],
        maxRepeatingChars = 3
    } = options;

    return body(field)
        .isLength({ min: minLength, max: maxLength })
        .withMessage(`Password must be between ${minLength} and ${maxLength} characters`)
        .custom((value) => {
            // Check character requirements
            if (requireUppercase && !/[A-Z]/.test(value)) {
                throw new Error('Password must contain at least one uppercase letter');
            }
            if (requireLowercase && !/[a-z]/.test(value)) {
                throw new Error('Password must contain at least one lowercase letter');
            }
            if (requireNumbers && !/\d/.test(value)) {
                throw new Error('Password must contain at least one number');
            }
            if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
                throw new Error('Password must contain at least one special character');
            }
            
            // Check forbidden patterns
            const lowerValue = value.toLowerCase();
            for (const pattern of forbiddenPatterns) {
                if (lowerValue.includes(pattern.toLowerCase())) {
                    throw new Error(`Password cannot contain common patterns like "${pattern}"`);
                }
            }
            
            // Check for excessive repeating characters
            const repeatingRegex = new RegExp(`(.)\\1{${maxRepeatingChars},}`, 'i');
            if (repeatingRegex.test(value)) {
                throw new Error(`Password cannot have more than ${maxRepeatingChars} repeating characters`);
            }
            
            return true;
        });
};

/**
 * Enhanced name validation with international character support
 */
export const validateNameEnhanced = (field, options = {}) => {
    const { minLength = 2, maxLength = 100, allowNumbers = false } = options;
    
    const pattern = allowNumbers 
        ? /^[\p{L}\p{M}\s\-'\.0-9]+$/u  // Allow Unicode letters, marks, spaces, hyphens, apostrophes, dots, numbers
        : /^[\p{L}\p{M}\s\-'\.]+$/u;    // Allow Unicode letters, marks, spaces, hyphens, apostrophes, dots

    return body(field)
        .trim()
        .isLength({ min: minLength, max: maxLength })
        .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
        .matches(pattern)
        .withMessage(`${field} contains invalid characters`)
        .custom((value) => {
            // Additional checks
            if (value.trim() !== value) {
                throw new Error(`${field} cannot start or end with whitespace`);
            }
            if (/\s{2,}/.test(value)) {
                throw new Error(`${field} cannot contain multiple consecutive spaces`);
            }
            return true;
        });
};

/**
 * Enhanced phone number validation with international support
 */
export const validatePhoneEnhanced = (field = 'phone', options = {}) => {
    const { required = false, allowInternational = true } = options;
    
    const validator = body(field)
        .trim()
        .custom((value) => {
            if (!value && !required) return true;
            
            // Basic international phone number pattern
            const internationalPattern = /^\+?[1-9]\d{1,14}$/;
            // US phone number pattern
            const usPattern = /^(\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
            
            if (allowInternational) {
                if (!internationalPattern.test(value.replace(/[-.\s()]/g, ''))) {
                    throw new Error('Please provide a valid phone number');
                }
            } else {
                if (!usPattern.test(value)) {
                    throw new Error('Please provide a valid US phone number');
                }
            }
            
            return true;
        });

    return required ? validator : validator.optional();
};

/**
 * Enhanced date validation with range restrictions
 */
export const validateDateEnhanced = (field, options = {}) => {
    const { 
        minDate = null, 
        maxDate = null, 
        allowPast = true, 
        allowFuture = true,
        required = true 
    } = options;

    const validator = body(field)
        .isISO8601({ strict: true })
        .withMessage(`${field} must be a valid ISO 8601 date`)
        .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            
            // Check past/future restrictions
            if (!allowPast && date < now) {
                throw new Error(`${field} cannot be in the past`);
            }
            if (!allowFuture && date > now) {
                throw new Error(`${field} cannot be in the future`);
            }
            
            // Check date range
            if (minDate && date < new Date(minDate)) {
                throw new Error(`${field} cannot be before ${minDate}`);
            }
            if (maxDate && date > new Date(maxDate)) {
                throw new Error(`${field} cannot be after ${maxDate}`);
            }
            
            return true;
        });

    return required ? validator : validator.optional();
};

/**
 * Enhanced pagination validation
 */
export const validatePaginationEnhanced = [
    query('page')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Page must be between 1 and 10000')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Limit must be between 1 and 1000')
        .toInt(),
    query('sort')
        .optional()
        .matches(/^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?$/)
        .withMessage('Sort must be a valid field name with optional .asc or .desc'),
    query('search')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Search query cannot exceed 200 characters')
        .customSanitizer((value) => {
            // Remove potentially dangerous characters for search
            return value.replace(/[<>'"&]/g, '');
        })
];

/**
 * File upload validation
 */
export const validateFileUpload = (options = {}) => {
    const {
        allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        maxFileSize = 10 * 1024 * 1024, // 10MB
        required = false
    } = options;

    return (req, res, next) => {
        if (!req.file && required) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        if (req.file) {
            // Check file size
            if (req.file.size > maxFileSize) {
                return res.status(400).json({
                    success: false,
                    message: `File size cannot exceed ${Math.round(maxFileSize / 1024 / 1024)}MB`
                });
            }

            // Check MIME type
            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
                });
            }

            // Sanitize filename
            req.file.originalname = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        }

        next();
    };
};

/**
 * JSON schema validation middleware
 */
export const validateJsonSchema = (schema) => {
    return (req, res, next) => {
        try {
            // Basic JSON structure validation
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
                        checkDepth(obj[key], depth + 1);
                    }
                }
            };

            checkDepth(req.body);
            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid JSON structure: ' + error.message
            });
        }
    };
};

/**
 * Rate limiting by user/tenant
 */
export const validateRateLimitByUser = (options = {}) => {
    const { windowMs = 15 * 60 * 1000, maxRequests = 100 } = options;
    const userRequests = new Map();

    return (req, res, next) => {
        const userId = req.user?.id || req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        if (userRequests.has(userId)) {
            const requests = userRequests.get(userId).filter(time => time > windowStart);
            userRequests.set(userId, requests);
        } else {
            userRequests.set(userId, []);
        }

        const requests = userRequests.get(userId);
        
        if (requests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Rate limit exceeded',
                retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000)
            });
        }

        requests.push(now);
        next();
    };
};

/**
 * SQL/NoSQL injection prevention
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
                /function\(/i
            ];

            for (const pattern of injectionPatterns) {
                if (pattern.test(obj)) {
                    throw new Error(`Potential injection detected in ${path || 'request'}`);
                }
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                // Check key names for injection
                if (key.startsWith('$') || key.includes('.')) {
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
        console.warn('Injection attempt detected:', {
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

export default {
    handleValidationErrors,
    sanitizeHtmlContent,
    sanitizeStrictHtml,
    validateMongoIdWithExistence,
    validateEmailEnhanced,
    validatePasswordEnhanced,
    validateNameEnhanced,
    validatePhoneEnhanced,
    validateDateEnhanced,
    validatePaginationEnhanced,
    validateFileUpload,
    validateJsonSchema,
    validateRateLimitByUser,
    preventInjection
};