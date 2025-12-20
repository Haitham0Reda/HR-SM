/**
 * Log Ingestion API Routes
 * 
 * Provides endpoints for frontend log ingestion with authentication,
 * validation, and processing pipeline integration
 * 
 * Requirements: 8.1, 4.2, 1.1
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import logIngestionController from '../controllers/logIngestion.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { extractCompanyContext } from '../middleware/company.middleware.js';
import { rateLimitByCompany } from '../middleware/rateLimit.middleware.js';
import { enforceLogAccessControl, enforceTenantIsolation } from '../middleware/logAccessControl.middleware.js';
import { requireModuleLicense } from '../middleware/licenseValidation.middleware.js';
import { 
    requireLoggingLicense, 
    enforceUsageLimits, 
    trackLoggingOperation,
    enforcePlatformPolicies 
} from '../middleware/licenseControlledLogging.middleware.js';
import { MODULES } from '../platform/system/models/license.model.js';

const router = express.Router();

// Validation rules for log ingestion
const logIngestionValidation = [
    body('logs')
        .isArray({ min: 1, max: 100 })
        .withMessage('logs must be an array with 1-100 entries'),
    
    body('logs.*.timestamp')
        .isISO8601()
        .withMessage('timestamp must be a valid ISO 8601 date'),
    
    body('logs.*.level')
        .isIn(['debug', 'info', 'warn', 'error'])
        .withMessage('level must be one of: debug, info, warn, error'),
    
    body('logs.*.message')
        .isString()
        .isLength({ min: 1, max: 10000 })
        .withMessage('message must be a string between 1-10000 characters'),
    
    body('logs.*.source')
        .equals('frontend')
        .withMessage('source must be "frontend"'),
    
    body('logs.*.correlationId')
        .optional()
        .isUUID()
        .withMessage('correlationId must be a valid UUID'),
    
    body('logs.*.sessionId')
        .optional()
        .isString()
        .isLength({ min: 1, max: 255 })
        .withMessage('sessionId must be a string up to 255 characters'),
    
    body('logs.*.userAgent')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('userAgent must be a string up to 1000 characters'),
    
    body('logs.*.url')
        .optional()
        .isURL()
        .withMessage('url must be a valid URL'),
    
    body('logs.*.meta')
        .optional()
        .isObject()
        .withMessage('meta must be an object'),
    
    // Security-related fields
    body('logs.*.securityLevel')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('securityLevel must be one of: low, medium, high, critical'),
    
    body('logs.*.threatIndicators')
        .optional()
        .isArray()
        .withMessage('threatIndicators must be an array'),
    
    // Performance-related fields
    body('logs.*.performanceMetrics')
        .optional()
        .isObject()
        .withMessage('performanceMetrics must be an object'),
    
    body('logs.*.performanceMetrics.duration')
        .optional()
        .isNumeric()
        .withMessage('performanceMetrics.duration must be a number'),
    
    body('logs.*.performanceMetrics.memory')
        .optional()
        .isNumeric()
        .withMessage('performanceMetrics.memory must be a number')
];

// Rate limiting configuration for log ingestion
const logIngestionRateLimit = rateLimitByCompany({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute per company
    message: 'Too many log ingestion requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * POST /api/v1/logs
 * 
 * Ingests frontend logs with authentication and validation
 * 
 * @route POST /api/v1/logs
 * @access Private (JWT required)
 * @param {Object} req.body - Log ingestion request
 * @param {Array} req.body.logs - Array of log entries
 * @returns {Object} Ingestion result with processing status
 */
router.post('/logs',
    logIngestionRateLimit,
    authenticateJWT,
    extractCompanyContext,
    requireModuleLicense(MODULES.LOGGING),
    requireLoggingLicense(),
    enforceUsageLimits(),
    enforcePlatformPolicies(),
    enforceTenantIsolation,
    enforceLogAccessControl,
    trackLoggingOperation(),
    logIngestionValidation,
    logIngestionController.ingestLogs
);

/**
 * GET /api/v1/logs/health
 * 
 * Health check endpoint for log ingestion service
 * 
 * @route GET /api/v1/logs/health
 * @access Public
 * @returns {Object} Service health status
 */
router.get('/logs/health', logIngestionController.healthCheck);

/**
 * GET /api/v1/logs/stats
 * 
 * Get log ingestion statistics for the authenticated company
 * 
 * @route GET /api/v1/logs/stats
 * @access Private (JWT required)
 * @returns {Object} Log ingestion statistics
 */
router.get('/logs/stats',
    authenticateJWT,
    extractCompanyContext,
    requireModuleLicense(MODULES.LOGGING),
    requireLoggingLicense(),
    enforceTenantIsolation,
    trackLoggingOperation(),
    logIngestionController.getIngestionStats
);

export default router;