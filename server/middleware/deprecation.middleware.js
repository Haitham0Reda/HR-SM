/**
 * Deprecation Middleware
 * 
 * Adds deprecation warnings to legacy endpoints and logs their usage
 * for monitoring during the transition period.
 */

import logger from '../utils/logger.js';
import { FEATURES, DEPRECATION_CONFIG, getReplacementEndpoint } from '../config/features.config.js';

/**
 * Middleware to add deprecation headers to legacy leave endpoints
 * 
 * Adds the following headers:
 * - X-Deprecated: true
 * - X-Deprecation-Date: Date when endpoint was deprecated
 * - X-Sunset: Date when endpoint will be removed
 * - X-Replacement: Suggested replacement endpoint(s)
 * - Warning: HTTP Warning header with deprecation message
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.endpoint - The endpoint being deprecated
 * @param {string} options.leaveType - Optional leave type for specific replacement
 */
export const addDeprecationHeaders = (options = {}) => {
    return (req, res, next) => {
        // Only add headers if deprecation warnings are enabled
        if (!FEATURES.SEND_DEPRECATION_HEADERS) {
            return next();
        }

        const { endpoint = 'legacy leave endpoint', leaveType } = options;

        // Add deprecation headers
        res.setHeader('X-Deprecated', 'true');
        res.setHeader('X-Deprecation-Date', DEPRECATION_CONFIG.DEPRECATION_DATE);
        res.setHeader('X-Sunset', DEPRECATION_CONFIG.SUNSET_DATE);

        // Add replacement endpoint information
        const replacement = leaveType 
            ? getReplacementEndpoint(leaveType)
            : DEPRECATION_CONFIG.REPLACEMENT_MESSAGE;
        
        res.setHeader('X-Replacement', replacement);

        // Add standard HTTP Warning header (RFC 7234)
        const warningMessage = `299 - "Deprecated API: ${endpoint} will be removed on ${DEPRECATION_CONFIG.SUNSET_DATE}. ${replacement}"`;
        res.setHeader('Warning', warningMessage);

        next();
    };
};

/**
 * Middleware to log usage of legacy endpoints
 * 
 * Logs information about who is using legacy endpoints to help
 * track migration progress and identify clients that need updating.
 * 
 * @param {string} endpoint - The endpoint being accessed
 */
export const logLegacyUsage = (endpoint) => {
    return (req, res, next) => {
        // Only log if legacy usage logging is enabled
        if (!FEATURES.LOG_LEGACY_USAGE) {
            return next();
        }

        // Extract useful information for tracking
        const logData = {
            endpoint,
            method: req.method,
            path: req.path,
            userId: req.user?._id?.toString(),
            userRole: req.user?.role,
            userAgent: req.get('user-agent'),
            ip: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString(),
            leaveType: req.body?.leaveType || req.query?.leaveType
        };

        // Log the legacy endpoint usage
        logger.warn('Legacy endpoint accessed', {
            category: 'LEGACY_API_USAGE',
            ...logData
        });

        // Also log to console in development for visibility
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[LEGACY API] ${req.method} ${endpoint} - User: ${logData.userId || 'anonymous'} - Type: ${logData.leaveType || 'N/A'}`);
        }

        next();
    };
};

/**
 * Combined middleware that adds both deprecation headers and logging
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.endpoint - The endpoint being deprecated
 * @param {string} options.leaveType - Optional leave type for specific replacement
 */
export const deprecateEndpoint = (options = {}) => {
    return (req, res, next) => {
        // Apply both deprecation headers and logging
        addDeprecationHeaders(options)(req, res, () => {
            logLegacyUsage(options.endpoint || 'legacy endpoint')(req, res, next);
        });
    };
};

/**
 * Middleware to check if legacy endpoints are enabled
 * Returns 410 Gone if legacy endpoints are disabled
 */
export const checkLegacyEnabled = (req, res, next) => {
    if (!FEATURES.ENABLE_LEGACY_LEAVE) {
        return res.status(410).json({
            error: 'This endpoint has been removed',
            message: `The legacy leave endpoint has been sunset as of ${DEPRECATION_CONFIG.SUNSET_DATE}`,
            replacement: DEPRECATION_CONFIG.REPLACEMENT_MESSAGE,
            documentation: '/api/docs/leave-migration'
        });
    }
    next();
};

export default {
    addDeprecationHeaders,
    logLegacyUsage,
    deprecateEndpoint,
    checkLegacyEnabled
};
