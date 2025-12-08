// middleware/licenseValidation.middleware.js
import licenseValidator from '../services/licenseValidator.service.js';
import { MODULES } from '../models/license.model.js';
import logger from '../utils/logger.js';

/**
 * Rate limiting cache for license validation endpoints
 * Key: `${tenantId}:${ip}`
 * Value: { count, resetTime }
 */
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per tenant/IP

/**
 * Middleware to validate module license before route access
 * @param {string} moduleKey - The module key to validate
 * @returns {Function} Express middleware function
 */
export const requireModuleLicense = (moduleKey) => {
    return async (req, res, next) => {
        try {
            // Core HR always bypasses validation
            if (moduleKey === MODULES.CORE_HR) {
                return next();
            }

            // Extract tenant ID from various possible sources
            const tenantId = req.tenant?.id ||
                req.tenant?._id?.toString() ||
                req.user?.tenant?.toString() ||
                req.headers['x-tenant-id'] ||
                req.query?.tenantId;

            if (!tenantId) {
                logger.warn('License validation failed: No tenant ID found', {
                    moduleKey,
                    path: req.path,
                    method: req.method
                });
                return res.status(400).json({
                    error: 'TENANT_ID_REQUIRED',
                    message: 'Tenant ID is required for license validation',
                    moduleKey
                });
            }

            // Apply rate limiting
            const rateLimitResult = checkRateLimit(tenantId, req.ip);
            if (!rateLimitResult.allowed) {
                logger.warn('Rate limit exceeded for license validation', {
                    tenantId,
                    ip: req.ip,
                    moduleKey
                });
                return res.status(429).json({
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many license validation requests. Please try again later.',
                    retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
                });
            }

            // Prepare request info for audit logging
            const requestInfo = {
                userId: req.user?._id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path,
                method: req.method
            };

            // Validate module access
            const validation = await licenseValidator.validateModuleAccess(
                tenantId,
                moduleKey,
                { requestInfo }
            );

            if (!validation.valid) {
                // Determine appropriate status code and response
                let statusCode = 403;
                let upgradeUrl = `/pricing?module=${moduleKey}`;

                if (validation.error === 'LICENSE_EXPIRED') {
                    statusCode = 403;
                    upgradeUrl = `/settings/license?action=renew&module=${moduleKey}`;
                } else if (validation.error === 'LIMIT_EXCEEDED') {
                    statusCode = 429;
                    upgradeUrl = `/settings/license?action=upgrade&module=${moduleKey}`;
                } else if (validation.error === 'LICENSE_VALIDATION_FAILED') {
                    statusCode = 500;
                    upgradeUrl = null;
                }

                logger.info('License validation failed', {
                    tenantId,
                    moduleKey,
                    error: validation.error,
                    reason: validation.reason
                });

                const errorResponse = {
                    error: validation.error,
                    message: validation.reason,
                    moduleKey,
                    details: validation.details
                };

                if (upgradeUrl) {
                    errorResponse.upgradeUrl = upgradeUrl;
                }

                if (validation.expiresAt) {
                    errorResponse.expiresAt = validation.expiresAt;
                }

                return res.status(statusCode).json(errorResponse);
            }

            // Attach license info to request object for downstream use
            req.moduleLicense = {
                moduleKey,
                tier: validation.license.tier,
                limits: validation.license.limits,
                expiresAt: validation.license.expiresAt,
                activatedAt: validation.license.activatedAt
            };

            // Log successful validation at debug level
            logger.debug('License validation successful', {
                tenantId,
                moduleKey,
                tier: validation.license.tier
            });

            next();

        } catch (error) {
            logger.error('License validation middleware error', {
                moduleKey,
                error: error.message,
                stack: error.stack,
                path: req.path
            });

            return res.status(500).json({
                error: 'LICENSE_VALIDATION_FAILED',
                message: 'An error occurred during license validation',
                moduleKey
            });
        }
    };
};

/**
 * Middleware to check usage limits before allowing an operation
 * @param {string} moduleKey - The module key
 * @param {string} limitType - The type of limit to check (employees, storage, apiCalls)
 * @param {Function} amountExtractor - Optional function to extract requested amount from request
 * @returns {Function} Express middleware function
 */
export const checkUsageLimit = (moduleKey, limitType, amountExtractor = null) => {
    return async (req, res, next) => {
        try {
            // Core HR has no limits
            if (moduleKey === MODULES.CORE_HR) {
                return next();
            }

            const tenantId = req.tenant?.id ||
                req.tenant?._id?.toString() ||
                req.user?.tenant?.toString() ||
                req.headers['x-tenant-id'];

            if (!tenantId) {
                return res.status(400).json({
                    error: 'TENANT_ID_REQUIRED',
                    message: 'Tenant ID is required for usage limit check'
                });
            }

            // Extract requested amount if extractor function is provided
            const requestedAmount = amountExtractor ? amountExtractor(req) : 0;

            // Check limit
            const limitCheck = await licenseValidator.checkLimit(
                tenantId,
                moduleKey,
                limitType,
                requestedAmount
            );

            if (!limitCheck.allowed) {
                logger.warn('Usage limit check failed', {
                    tenantId,
                    moduleKey,
                    limitType,
                    currentUsage: limitCheck.currentUsage,
                    limit: limitCheck.limit,
                    requestedAmount
                });

                return res.status(429).json({
                    error: limitCheck.error || 'LIMIT_EXCEEDED',
                    message: limitCheck.reason,
                    moduleKey,
                    limitType,
                    currentUsage: limitCheck.currentUsage,
                    limit: limitCheck.limit,
                    upgradeUrl: `/settings/license?action=upgrade&module=${moduleKey}`
                });
            }

            // Attach limit info to request
            req.usageLimit = {
                limitType,
                currentUsage: limitCheck.currentUsage,
                limit: limitCheck.limit,
                percentage: limitCheck.percentage,
                isApproachingLimit: limitCheck.isApproachingLimit
            };

            // Warn if approaching limit
            if (limitCheck.isApproachingLimit) {
                logger.warn('Usage approaching limit', {
                    tenantId,
                    moduleKey,
                    limitType,
                    percentage: limitCheck.percentage
                });
            }

            next();

        } catch (error) {
            logger.error('Usage limit check middleware error', {
                moduleKey,
                limitType,
                error: error.message,
                stack: error.stack
            });

            return res.status(500).json({
                error: 'LIMIT_CHECK_FAILED',
                message: 'An error occurred during usage limit check'
            });
        }
    };
};

/**
 * Middleware to validate multiple modules (for features that span modules)
 * @param {Array<string>} moduleKeys - Array of module keys to validate
 * @returns {Function} Express middleware function
 */
export const requireMultipleModuleLicenses = (moduleKeys) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenant?.id ||
                req.tenant?._id?.toString() ||
                req.user?.tenant?.toString() ||
                req.headers['x-tenant-id'];

            if (!tenantId) {
                return res.status(400).json({
                    error: 'TENANT_ID_REQUIRED',
                    message: 'Tenant ID is required for license validation'
                });
            }

            const requestInfo = {
                userId: req.user?._id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path,
                method: req.method
            };

            // Validate all modules
            const validations = await Promise.all(
                moduleKeys.map(moduleKey =>
                    licenseValidator.validateModuleAccess(tenantId, moduleKey, { requestInfo })
                )
            );

            // Check if any validation failed
            const failedValidation = validations.find(v => !v.valid);

            if (failedValidation) {
                const moduleKey = failedValidation.moduleKey;
                const upgradeUrl = `/pricing?modules=${moduleKeys.join(',')}`;

                return res.status(403).json({
                    error: failedValidation.error,
                    message: `This feature requires multiple modules. ${failedValidation.reason}`,
                    requiredModules: moduleKeys,
                    failedModule: moduleKey,
                    upgradeUrl
                });
            }

            // Attach all license info to request
            req.moduleLicenses = validations.map(v => ({
                moduleKey: v.moduleKey,
                tier: v.license.tier,
                limits: v.license.limits,
                expiresAt: v.license.expiresAt
            }));

            next();

        } catch (error) {
            logger.error('Multiple module license validation error', {
                moduleKeys,
                error: error.message,
                stack: error.stack
            });

            return res.status(500).json({
                error: 'LICENSE_VALIDATION_FAILED',
                message: 'An error occurred during license validation'
            });
        }
    };
};

/**
 * Middleware to attach license info to request without blocking
 * Useful for optional features or informational purposes
 * @param {string} moduleKey - The module key
 * @returns {Function} Express middleware function
 */
export const attachLicenseInfo = (moduleKey) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenant?.id ||
                req.tenant?._id?.toString() ||
                req.user?.tenant?.toString() ||
                req.headers['x-tenant-id'];

            if (!tenantId) {
                // Don't block if no tenant ID, just continue
                return next();
            }

            const validation = await licenseValidator.validateModuleAccess(
                tenantId,
                moduleKey,
                { skipCache: false }
            );

            req.moduleLicense = {
                moduleKey,
                valid: validation.valid,
                tier: validation.license?.tier,
                limits: validation.license?.limits,
                error: validation.error,
                reason: validation.reason
            };

            next();

        } catch (error) {
            logger.error('Attach license info error', {
                moduleKey,
                error: error.message
            });
            // Don't block on error, just continue
            next();
        }
    };
};

/**
 * Check rate limit for a tenant/IP combination
 * @param {string} tenantId - Tenant ID
 * @param {string} ip - IP address
 * @returns {Object} Rate limit result
 */
function checkRateLimit(tenantId, ip) {
    const key = `${tenantId}:${ip}`;
    const now = Date.now();

    let entry = rateLimitCache.get(key);

    if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired entry
        entry = {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW
        };
        rateLimitCache.set(key, entry);
        return { allowed: true };
    }

    entry.count++;

    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        return {
            allowed: false,
            resetTime: entry.resetTime
        };
    }

    return { allowed: true };
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of rateLimitCache.entries()) {
        if (now > entry.resetTime) {
            keysToDelete.push(key);
        }
    }

    keysToDelete.forEach(key => rateLimitCache.delete(key));

    if (keysToDelete.length > 0) {
        logger.debug('Cleaned up rate limit cache', {
            entriesRemoved: keysToDelete.length
        });
    }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Get rate limit statistics
 * @returns {Object} Rate limit statistics
 */
export function getRateLimitStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of rateLimitCache.entries()) {
        if (now > entry.resetTime) {
            expiredEntries++;
        } else {
            activeEntries++;
        }
    }

    return {
        totalEntries: rateLimitCache.size,
        activeEntries,
        expiredEntries,
        rateLimitWindow: RATE_LIMIT_WINDOW,
        maxRequestsPerWindow: RATE_LIMIT_MAX_REQUESTS
    };
}

/**
 * Clear rate limit cache (useful for testing)
 */
export function clearRateLimitCache() {
    const size = rateLimitCache.size;
    rateLimitCache.clear();
    logger.debug('Rate limit cache cleared', { entriesCleared: size });
}

export default {
    requireModuleLicense,
    checkUsageLimit,
    requireMultipleModuleLicenses,
    attachLicenseInfo,
    getRateLimitStats,
    clearRateLimitCache
};
