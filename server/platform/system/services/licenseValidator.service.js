// services/licenseValidator.service.js
import License, { MODULES } from '../models/license.model.js';
import LicenseAudit from '../models/licenseAudit.model.js';
import UsageTracking from '../models/usageTracking.model.js';
import licenseFileLoader from './licenseFileLoader.service.js';
import redisService from './redis.service.js';
import logger from '../utils/logger.js';
import licenseWebSocketService from './licenseWebSocket.service.js';
import metricsService from './metrics.service.js';
import alertManager from './alertManager.service.js';

/**
 * In-memory cache for license validation results (fallback when Redis is unavailable)
 * Key: `${tenantId}:${moduleKey}`
 * Value: { valid, license, timestamp }
 */
const validationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const REDIS_CACHE_TTL = 300; // 5 minutes in seconds

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
        const startTime = Date.now();

        try {
            // Core HR always bypasses validation
            if (moduleKey === MODULES.CORE_HR) {
                await this._logValidation(tenantId, moduleKey, true, 'Core HR bypass', requestInfo);
                
                const duration = (Date.now() - startTime) / 1000;
                metricsService.recordLicenseValidation(
                    tenantId,
                    moduleKey,
                    true,
                    this.isOnPremiseMode ? 'on-premise' : 'saas',
                    duration
                );
                
                return {
                    valid: true,
                    bypassedValidation: true,
                    moduleKey,
                    reason: 'Core HR is always accessible'
                };
            }

            // Check cache first (unless skipCache is true)
            if (!skipCache) {
                const cached = await this._getCachedValidation(tenantId, moduleKey);
                if (cached) {
                    const duration = (Date.now() - startTime) / 1000;
                    metricsService.recordLicenseValidation(
                        tenantId,
                        moduleKey,
                        cached.valid,
                        this.isOnPremiseMode ? 'on-premise' : 'saas',
                        duration
                    );
                    return cached;
                }
            }

            // Route to appropriate validation method based on deployment mode
            let result;
            if (this.isOnPremiseMode) {
                result = await this._validateOnPremiseLicense(tenantId, moduleKey, requestInfo);
            } else {
                result = await this._validateSaaSLicense(tenantId, moduleKey, requestInfo);
            }

            // Record metrics
            const duration = (Date.now() - startTime) / 1000;
            metricsService.recordLicenseValidation(
                tenantId,
                moduleKey,
                result.valid,
                this.isOnPremiseMode ? 'on-premise' : 'saas',
                duration
            );

            if (!result.valid && result.error) {
                metricsService.recordLicenseValidationError(tenantId, moduleKey, result.error);
            }

            return result;

        } catch (error) {
            logger.error('License validation error', {
                tenantId,
                moduleKey,
                error: error.message,
                stack: error.stack
            });

            // Record error metrics
            const duration = (Date.now() - startTime) / 1000;
            metricsService.recordLicenseValidation(
                tenantId,
                moduleKey,
                false,
                this.isOnPremiseMode ? 'on-premise' : 'saas',
                duration
            );
            metricsService.recordLicenseValidationError(tenantId, moduleKey, 'VALIDATION_ERROR');

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
            
            // Emit real-time notification
            licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);
            
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
            
            // Emit real-time notification
            licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);
            
            return {
                valid: false,
                moduleKey,
                reason: 'Module license has expired',
                error: 'LICENSE_EXPIRED',
                expiresAt: moduleLicense.expiresAt
            };
        }
        
        // Check if license is expiring soon and emit warning
        if (moduleLicense.expiresAt) {
            const expiresAt = new Date(moduleLicense.expiresAt);
            const now = new Date();
            const daysUntilExpiration = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            
            // Notify if expiring within 30 days
            if (daysUntilExpiration > 0 && daysUntilExpiration <= 30) {
                licenseWebSocketService.notifyLicenseExpiring(
                    tenantId,
                    moduleKey,
                    expiresAt,
                    daysUntilExpiration
                );
            }
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
        await this._cacheValidation(tenantId, moduleKey, result);

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
            
            // Emit real-time notification
            licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);
            
            return {
                valid: false,
                moduleKey,
                reason: 'License file has expired',
                error: 'LICENSE_EXPIRED',
                expiresAt: licenseData.expiresAt
            };
        }
        
        // Check if license is expiring soon and emit warning
        if (licenseData.expiresAt) {
            const expiresAt = new Date(licenseData.expiresAt);
            const now = new Date();
            const daysUntilExpiration = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            
            // Notify if expiring within 30 days
            if (daysUntilExpiration > 0 && daysUntilExpiration <= 30) {
                licenseWebSocketService.notifyLicenseExpiring(
                    tenantId,
                    moduleKey,
                    expiresAt,
                    daysUntilExpiration
                );
            }
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
        await this._cacheValidation(tenantId, moduleKey, result);

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
                
                // Record metrics
                metricsService.recordUsageLimitExceeded(tenantId, moduleKey, limitType);
                
                // Emit real-time notification
                licenseWebSocketService.notifyUsageLimitExceeded(
                    tenantId,
                    moduleKey,
                    limitType,
                    projectedUsage,
                    limit
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

            // Update usage metrics
            metricsService.updateUsageLimitPercentage(tenantId, moduleKey, limitType, percentage);

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
                    
                    // Record metrics
                    metricsService.recordUsageLimitWarning(tenantId, moduleKey, limitType);
                    
                    // Send alert
                    await alertManager.checkUsageLimitAlerts(
                        tenantId,
                        moduleKey,
                        limitType,
                        currentUsage,
                        limit,
                        percentage
                    );
                    
                    // Emit real-time notification
                    licenseWebSocketService.notifyUsageLimitWarning(
                        tenantId,
                        moduleKey,
                        limitType,
                        currentUsage,
                        limit,
                        percentage
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
    async invalidateCache(tenantId, moduleKey = null) {
        // Invalidate Redis cache
        if (redisService.isEnabled && redisService.isConnected) {
            try {
                if (moduleKey) {
                    const cacheKey = `license:validation:${tenantId}:${moduleKey}`;
                    await redisService.del(cacheKey);
                } else {
                    // Clear all cache entries for this tenant
                    const pattern = `license:validation:${tenantId}:*`;
                    const deletedCount = await redisService.delPattern(pattern);
                    logger.debug('Redis cache invalidated for tenant', { tenantId, deletedCount });
                }
            } catch (error) {
                logger.warn('Redis cache invalidation failed', {
                    tenantId,
                    moduleKey,
                    error: error.message
                });
            }
        }

        // Invalidate in-memory cache
        if (moduleKey) {
            const cacheKey = `${tenantId}:${moduleKey}`;
            validationCache.delete(cacheKey);
            logger.debug('In-memory cache invalidated', { tenantId, moduleKey });
        } else {
            // Clear all cache entries for this tenant
            const keysToDelete = [];
            for (const key of validationCache.keys()) {
                if (key.startsWith(`${tenantId}:`)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => validationCache.delete(key));
            logger.debug('All in-memory cache invalidated for tenant', { tenantId, count: keysToDelete.length });
        }
    }

    /**
     * Clear all cache entries
     */
    async clearCache() {
        // Clear Redis cache
        if (redisService.isEnabled && redisService.isConnected) {
            try {
                const pattern = 'license:validation:*';
                const deletedCount = await redisService.delPattern(pattern);
                logger.debug('All Redis cache cleared', { entriesCleared: deletedCount });
            } catch (error) {
                logger.warn('Redis cache clear failed', { error: error.message });
            }
        }

        // Clear in-memory cache
        const size = validationCache.size;
        validationCache.clear();
        logger.debug('All in-memory cache cleared', { entriesCleared: size });
    }

    /**
     * Get cached validation result
     * @private
     */
    async _getCachedValidation(tenantId, moduleKey) {
        const cacheKey = `license:validation:${tenantId}:${moduleKey}`;

        // Try Redis first
        if (redisService.isEnabled && redisService.isConnected) {
            try {
                const cached = await redisService.get(cacheKey);
                if (cached) {
                    logger.debug('License validation Redis cache hit', { tenantId, moduleKey });
                    metricsService.recordCacheHit('redis');
                    return cached;
                }
            } catch (error) {
                logger.warn('Redis cache get failed, falling back to in-memory', {
                    tenantId,
                    moduleKey,
                    error: error.message
                });
            }
        }

        // Fallback to in-memory cache
        const memCacheKey = `${tenantId}:${moduleKey}`;
        const cached = validationCache.get(memCacheKey);

        if (!cached) {
            metricsService.recordCacheMiss('memory');
            return null;
        }

        // Check if cache entry is still valid
        const now = Date.now();
        if (now - cached.timestamp > CACHE_TTL) {
            validationCache.delete(memCacheKey);
            metricsService.recordCacheMiss('memory');
            return null;
        }

        logger.debug('License validation in-memory cache hit', { tenantId, moduleKey });
        metricsService.recordCacheHit('memory');
        return cached.result;
    }

    /**
     * Cache validation result
     * @private
     */
    async _cacheValidation(tenantId, moduleKey, result) {
        const cacheKey = `license:validation:${tenantId}:${moduleKey}`;

        // Try Redis first
        if (redisService.isEnabled && redisService.isConnected) {
            try {
                await redisService.set(cacheKey, result, REDIS_CACHE_TTL);
                logger.debug('License validation cached in Redis', { tenantId, moduleKey });
                return;
            } catch (error) {
                logger.warn('Redis cache set failed, falling back to in-memory', {
                    tenantId,
                    moduleKey,
                    error: error.message
                });
            }
        }

        // Fallback to in-memory cache
        const memCacheKey = `${tenantId}:${moduleKey}`;
        validationCache.set(memCacheKey, {
            result,
            timestamp: Date.now()
        });
        logger.debug('License validation cached in-memory', { tenantId, moduleKey });
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

