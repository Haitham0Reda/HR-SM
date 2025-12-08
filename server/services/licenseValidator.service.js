// services/licenseValidator.service.js
import License, { MODULES } from '../models/license.model.js';
import LicenseAudit from '../models/licenseAudit.model.js';
import UsageTracking from '../models/usageTracking.model.js';
import licenseFileLoader from './licenseFileLoader.service.js';
import logger from '../utils/logger.js';

/**
 * Cache for license validation results
 * Key: `${tenantId}:${moduleKey}`
 * Value: { valid, license, timestamp }
 */
const validationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * License Validator Service
 * Handles all license validation, usage limit checking, and audit logging
 * Supports both SaaS (database) and On-Premise (file) modes
 */
class LicenseValidator {
    constructor() {
        this.isOnPremiseMode = process.env.DEPLOYMENT_MODE === 'on-premise';
    }

    /**
     * Validate module access for a tenant
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module to validate
     * @param {Object} options - Additional options
     * @param {boolean} options.skipCache - Skip cache lookup
     * @param {Object} options.requestInfo - Request information for audit logging
     * @returns {Promise<ValidationResult>}
     */
    async validateModuleAccess(tenantId, moduleKey, options = {}) {
        const { skipCache = false, requestInfo = {} } = options;

        try {
            // Core HR always bypasses validation
            if (moduleKey === MODULES.CORE_HR) {
                await this._logValidation(tenantId, moduleKey, true, 'Core HR bypass', requestInfo);
                return {
                    valid: true,
                    bypassedValidation: true,
                    moduleKey,
                    reason: 'Core HR is always accessible'
                };
            }

            // Check cache first (unless skipCache is true)
            if (!skipCache) {
                const cached = this._getCachedValidation(tenantId, moduleKey);
                if (cached) {
                    logger.debug('License validation cache hit', { tenantId, moduleKey });
                    return cached;
                }
            }

            // Route to appropriate validation method based on deployment mode
            if (this.isOnPremiseMode) {
                return await this._validateOnPremiseLicense(tenantId, moduleKey, requestInfo);
            } else {
                return await this._validateSaaSLicense(tenantId, moduleKey, requestInfo);
            }

        } catch (error) {
            logger.error('License validation error', {
                tenantId,
                moduleKey,
                error: error.message,
                stack: error.stack
            });

            // Log validation failure
            await this._logValidation(
                tenantId,
                moduleKey,
                false,
                `Validation error: ${error.message}`,
                requestInfo
            );

            return {
                valid: false,
                moduleKey,
                reason: 'License validation failed',
                error: 'LICENSE_VALIDATION_FAILED',
                details: error.message
            };
        }
    }

    /**
     * Validate license from database (SaaS mode)
     * @private
     */
    async _validateSaaSLicense(tenantId, moduleKey, requestInfo) {
        // Fetch license from database
        const license = await License.findByTenantId(tenantId);

        if (!license) {
            await this._logValidation(
                tenantId,
                moduleKey,
                false,
                'No license found for tenant',
                requestInfo
            );
            return {
                valid: false,
                moduleKey,
                reason: 'No license found for tenant',
                error: 'MODULE_NOT_LICENSED'
            };
        }

        // Check if module is enabled first
        const moduleLicense = license.getModuleLicense(moduleKey);

        if (!moduleLicense) {
            await this._logValidation(
                tenantId,
                moduleKey,
                false,
                'Module not found in license',
                requestInfo
            );
            return {
                valid: false,
                moduleKey,
                reason: 'Module not included in license',
                error: 'MODULE_NOT_LICENSED'
            };
        }

        if (!moduleLicense.enabled) {
            await this._logValidation(
                tenantId,
                moduleKey,
                false,
                'Module is disabled',
                requestInfo
            );
            return {
                valid: false,
                moduleKey,
                reason: 'Module is disabled',
                error: 'MODULE_NOT_LICENSED'
            };
        }

        // Check if overall license status is expired
        if (license.status === 'expired') {
            await LicenseAudit.logLicenseExpired(tenantId, moduleKey, {
                ...requestInfo,
                licenseStatus: license.status
            });
            return {
                valid: false,
                moduleKey,
                reason: 'License has expired',
                error: 'LICENSE_EXPIRED',
                expiresAt: moduleLicense.expiresAt
            };
        }

        // Check if module license is expired
        if (moduleLicense.expiresAt && new Date(moduleLicense.expiresAt) < new Date()) {
            await LicenseAudit.logLicenseExpired(tenantId, moduleKey, {
                ...requestInfo,
                expiresAt: moduleLicense.expiresAt
            });
            return {
                valid: false,
                moduleKey,
                reason: 'Module license has expired',
                error: 'LICENSE_EXPIRED',
                expiresAt: moduleLicense.expiresAt
            };
        }

        // Validation successful
        const result = {
            valid: true,
            moduleKey,
            license: {
                tier: moduleLicense.tier,
                limits: moduleLicense.limits,
                expiresAt: moduleLicense.expiresAt,
                activatedAt: moduleLicense.activatedAt
            }
        };

        // Cache the result
        this._cacheValidation(tenantId, moduleKey, result);

        // Log successful validation
        await this._logValidation(tenantId, moduleKey, true, 'Validation successful', requestInfo);

        return result;
    }

    /**
     * Validate license from file (On-Premise mode)
     * @private
     */
    async _validateOnPremiseLicense(tenantId, moduleKey, requestInfo) {
        // Get license from file loader
        const licenseData = licenseFileLoader.getLicense();

        if (!licenseData) {
            await this._logValidation(
                tenantId,
                moduleKey,
                false,
                'No license file found or license file is invalid',
                requestInfo
            );
            return {
                valid: false,
                moduleKey,
                reason: 'No valid license file found',
                error: 'MODULE_NOT_LICENSED'
            };
        }

        // Check if license is expired
        if (licenseFileLoader.isLicenseExpired()) {
            await LicenseAudit.logLicenseExpired(tenantId, moduleKey, {
                ...requestInfo,
                expiresAt: licenseData.expiresAt,
                source: 'license-file'
            });
            return {
                valid: false,
                moduleKey,
                reason: 'License file has expired',
                error: 'LICENSE_EXPIRED',
                expiresAt: licenseData.expiresAt
            };
        }

        // Check if module exists in license
        const moduleLicense = licenseData.modules[moduleKey];

        if (!moduleLicense) {
            await this._logValidation(
                tenantId,
                moduleKey,
                false,
                'Module not found in license file',
                requestInfo
            );
            return {
                valid: false,
                moduleKey,
                reason: 'Module not included in license file',
                error: 'MODULE_NOT_LICENSED'
            };
        }

        // Check if module is enabled
        if (!moduleLicense.enabled) {
            await this._logValidation(
                tenantId,
                moduleKey,
                false,
                'Module is disabled in license file',
                requestInfo
            );
            return {
                valid: false,
                moduleKey,
                reason: 'Module is disabled',
                error: 'MODULE_NOT_LICENSED'
            };
        }

        // Validation successful
        const result = {
            valid: true,
            moduleKey,
            license: {
                tier: moduleLicense.tier,
                limits: moduleLicense.limits || {},
                expiresAt: licenseData.expiresAt,
                source: 'license-file',
                licenseKey: licenseData.licenseKey,
                companyName: licenseData.companyName
            }
        };

        // Cache the result
        this._cacheValidation(tenantId, moduleKey, result);

        // Log successful validation
        await this._logValidation(tenantId, moduleKey, true, 'Validation successful (license file)', requestInfo);

        return result;
    }

    /**
     * Check usage against limits
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     * @param {string} limitType - Type of limit (employees, storage, apiCalls)
     * @param {number} requestedAmount - Amount being requested (optional, for pre-check)
     * @returns {Promise<LimitCheckResult>}
     */
    async checkLimit(tenantId, moduleKey, limitType, requestedAmount = 0) {
        try {
            // Core HR has no limits
            if (moduleKey === MODULES.CORE_HR) {
                return {
                    allowed: true,
                    limitType,
                    reason: 'Core HR has no usage limits'
                };
            }

            // Get limits based on deployment mode
            let moduleLimits;

            if (this.isOnPremiseMode) {
                // Get limits from license file
                const moduleLicense = licenseFileLoader.getModuleLicense(moduleKey);

                if (!moduleLicense || !moduleLicense.enabled) {
                    return {
                        allowed: false,
                        limitType,
                        reason: 'Module not licensed',
                        error: 'MODULE_NOT_LICENSED'
                    };
                }

                moduleLimits = moduleLicense.limits || {};
            } else {
                // Get limits from database
                const license = await License.findByTenantId(tenantId);

                if (!license) {
                    return {
                        allowed: false,
                        limitType,
                        reason: 'No license found',
                        error: 'MODULE_NOT_LICENSED'
                    };
                }

                const moduleLicense = license.getModuleLicense(moduleKey);

                if (!moduleLicense || !moduleLicense.enabled) {
                    return {
                        allowed: false,
                        limitType,
                        reason: 'Module not licensed',
                        error: 'MODULE_NOT_LICENSED'
                    };
                }

                moduleLimits = moduleLicense.limits;
            }

            // Get or create usage tracking for current period
            const usageTracking = await UsageTracking.findOrCreateForCurrentPeriod(
                tenantId,
                moduleKey,
                moduleLimits
            );

            const currentUsage = usageTracking.usage[limitType] || 0;
            const limit = usageTracking.limits[limitType];

            // If no limit is set, allow unlimited usage
            if (!limit || limit === null || limit === 0) {
                return {
                    allowed: true,
                    limitType,
                    currentUsage,
                    limit: null,
                    percentage: null,
                    reason: 'No limit configured'
                };
            }

            // Calculate projected usage if requestedAmount is provided
            const projectedUsage = currentUsage + requestedAmount;
            const percentage = Math.round((currentUsage / limit) * 100);
            const projectedPercentage = Math.round((projectedUsage / limit) * 100);

            // Check if limit would be exceeded
            if (projectedUsage > limit) {
                // Log limit exceeded
                await LicenseAudit.logLimitExceeded(
                    tenantId,
                    moduleKey,
                    limitType,
                    projectedUsage,
                    limit,
                    {
                        currentUsage,
                        requestedAmount
                    }
                );

                return {
                    allowed: false,
                    limitType,
                    currentUsage,
                    limit,
                    percentage,
                    projectedUsage,
                    projectedPercentage,
                    reason: 'Usage limit exceeded',
                    error: 'LIMIT_EXCEEDED'
                };
            }

            // Check if approaching limit (>= 80%)
            if (percentage >= 80) {
                // Log warning if not already logged recently
                const hasRecentWarning = usageTracking.warnings.some(
                    w => w.limitType === limitType &&
                        (Date.now() - w.triggeredAt.getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
                );

                if (!hasRecentWarning) {
                    await LicenseAudit.logLimitWarning(
                        tenantId,
                        moduleKey,
                        limitType,
                        currentUsage,
                        limit,
                        { percentage }
                    );
                }
            }

            return {
                allowed: true,
                limitType,
                currentUsage,
                limit,
                percentage,
                projectedUsage,
                projectedPercentage,
                isApproachingLimit: percentage >= 80,
                reason: 'Within usage limits'
            };

        } catch (error) {
            logger.error('Limit check error', {
                tenantId,
                moduleKey,
                limitType,
                error: error.message,
                stack: error.stack
            });

            return {
                allowed: false,
                limitType,
                reason: 'Limit check failed',
                error: 'LIMIT_CHECK_FAILED',
                details: error.message
            };
        }
    }

    /**
     * Invalidate cache for a tenant and module
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key (optional, clears all if not provided)
     */
    invalidateCache(tenantId, moduleKey = null) {
        if (moduleKey) {
            const cacheKey = `${tenantId}:${moduleKey}`;
            validationCache.delete(cacheKey);
            logger.debug('Cache invalidated', { tenantId, moduleKey });
        } else {
            // Clear all cache entries for this tenant
            const keysToDelete = [];
            for (const key of validationCache.keys()) {
                if (key.startsWith(`${tenantId}:`)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => validationCache.delete(key));
            logger.debug('All cache invalidated for tenant', { tenantId, count: keysToDelete.length });
        }
    }

    /**
     * Clear all cache entries
     */
    clearCache() {
        const size = validationCache.size;
        validationCache.clear();
        logger.debug('All cache cleared', { entriesCleared: size });
    }

    /**
     * Get cached validation result
     * @private
     */
    _getCachedValidation(tenantId, moduleKey) {
        const cacheKey = `${tenantId}:${moduleKey}`;
        const cached = validationCache.get(cacheKey);

        if (!cached) {
            return null;
        }

        // Check if cache entry is still valid
        const now = Date.now();
        if (now - cached.timestamp > CACHE_TTL) {
            validationCache.delete(cacheKey);
            return null;
        }

        return cached.result;
    }

    /**
     * Cache validation result
     * @private
     */
    _cacheValidation(tenantId, moduleKey, result) {
        const cacheKey = `${tenantId}:${moduleKey}`;
        validationCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Log validation attempt
     * @private
     */
    async _logValidation(tenantId, moduleKey, success, reason, requestInfo = {}) {
        try {
            if (success) {
                await LicenseAudit.logValidationSuccess(tenantId, moduleKey, {
                    reason,
                    ...requestInfo
                });
            } else {
                await LicenseAudit.logValidationFailure(tenantId, moduleKey, reason, {
                    ...requestInfo
                });
            }
        } catch (error) {
            // Don't throw on audit logging errors, just log them
            logger.error('Failed to log validation audit', {
                tenantId,
                moduleKey,
                success,
                error: error.message
            });
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [key, value] of validationCache.entries()) {
            if (now - value.timestamp > CACHE_TTL) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }

        return {
            totalEntries: validationCache.size,
            validEntries,
            expiredEntries,
            cacheTTL: CACHE_TTL
        };
    }
}

// Export singleton instance
const licenseValidator = new LicenseValidator();
export default licenseValidator;

