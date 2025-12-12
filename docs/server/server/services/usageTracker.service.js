// services/usageTracker.service.js
import UsageTracking from '../platform/system/models/usageTracking.model.js';
import License, { MODULES } from '../platform/system/models/license.model.js';
import LicenseAudit from '../platform/system/models/licenseAudit.model.js';
import logger from '../utils/logger.js';
import EventEmitter from 'events';

/**
 * Usage Tracker Service
 * Handles usage tracking with batch updates, warning detection, and limit enforcement
 */
class UsageTracker extends EventEmitter {
    constructor() {
        super();

        // Batch update queue
        // Key: `${tenantId}:${moduleKey}:${limitType}`
        // Value: { tenantId, moduleKey, limitType, amount, timestamp }
        this.batchQueue = new Map();

        // Batch processing interval (60 seconds)
        this.batchInterval = 60 * 1000;

        // Batch processing timer
        this.batchTimer = null;

        // Flag to track if batch processing is running
        this.isProcessing = false;

        // Start batch processing
        this._startBatchProcessing();

        logger.info('UsageTracker service initialized', {
            batchInterval: this.batchInterval
        });
    }

    /**
     * Track module usage event
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     * @param {string} usageType - Type of usage (employees, storage, apiCalls)
     * @param {number} amount - Amount to track (default: 1)
     * @param {Object} options - Additional options
     * @param {boolean} options.immediate - Process immediately instead of batching
     * @returns {Promise<TrackingResult>}
     */
    async trackUsage(tenantId, moduleKey, usageType, amount = 1, options = {}) {
        const { immediate = false } = options;

        try {
            // Core HR has no usage tracking
            if (moduleKey === MODULES.CORE_HR) {
                return {
                    success: true,
                    tracked: false,
                    reason: 'Core HR has no usage limits'
                };
            }

            // Validate inputs
            if (!tenantId || !moduleKey || !usageType) {
                throw new Error('Missing required parameters: tenantId, moduleKey, or usageType');
            }

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Validate usage type
            const validTypes = ['employees', 'storage', 'apiCalls'];
            if (!validTypes.includes(usageType)) {
                throw new Error(`Invalid usage type: ${usageType}. Must be one of: ${validTypes.join(', ')}`);
            }

            // If immediate processing is requested, process now
            if (immediate) {
                return await this._processUsageImmediate(tenantId, moduleKey, usageType, amount);
            }

            // Add to batch queue
            const queueKey = `${tenantId}:${moduleKey}:${usageType}`;
            const existing = this.batchQueue.get(queueKey);

            if (existing) {
                // Accumulate amount
                existing.amount += amount;
                existing.timestamp = Date.now();
            } else {
                // Add new entry
                this.batchQueue.set(queueKey, {
                    tenantId,
                    moduleKey,
                    limitType: usageType,
                    amount,
                    timestamp: Date.now()
                });
            }

            logger.debug('Usage queued for batch processing', {
                tenantId,
                moduleKey,
                usageType,
                amount,
                queueSize: this.batchQueue.size
            });

            return {
                success: true,
                tracked: true,
                batched: true,
                queueSize: this.batchQueue.size
            };

        } catch (error) {
            logger.error('Usage tracking error', {
                tenantId,
                moduleKey,
                usageType,
                amount,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                tracked: false,
                error: error.message
            };
        }
    }

    /**
     * Get current usage for a module
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     * @param {Object} options - Additional options
     * @param {string} options.period - Period (YYYY-MM), defaults to current
     * @returns {Promise<UsageReport>}
     */
    async getUsage(tenantId, moduleKey, options = {}) {
        const { period = null } = options;

        try {
            // Get license to retrieve limits
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                return {
                    success: false,
                    error: 'No license found for tenant'
                };
            }

            const moduleLicense = license.getModuleLicense(moduleKey);

            if (!moduleLicense) {
                return {
                    success: false,
                    error: 'Module not found in license'
                };
            }

            // Get usage tracking for the period
            const queryPeriod = period || UsageTracking.getCurrentPeriod();
            let usageTracking = await UsageTracking.findOne({
                tenantId,
                moduleKey,
                period: queryPeriod
            });

            // If no usage tracking exists, create one with zero usage
            if (!usageTracking) {
                usageTracking = await UsageTracking.create({
                    tenantId,
                    moduleKey,
                    period: queryPeriod,
                    limits: moduleLicense.limits
                });
            }

            // Build usage report
            const report = {
                success: true,
                tenantId,
                moduleKey,
                period: queryPeriod,
                usage: {}
            };

            // Process each limit type
            ['employees', 'storage', 'apiCalls'].forEach(limitType => {
                const current = usageTracking.usage[limitType] || 0;
                const limit = usageTracking.limits[limitType];
                const percentage = usageTracking.getUsagePercentage(limitType);

                report.usage[limitType] = {
                    current,
                    limit: limit || null,
                    percentage: percentage !== null ? percentage : null,
                    isApproachingLimit: usageTracking.isApproachingLimit(limitType),
                    hasExceeded: usageTracking.hasExceededLimit(limitType)
                };
            });

            // Add warnings and violations
            report.warnings = usageTracking.warnings.map(w => ({
                limitType: w.limitType,
                percentage: w.percentage,
                triggeredAt: w.triggeredAt
            }));

            report.violations = usageTracking.violations.map(v => ({
                limitType: v.limitType,
                attemptedValue: v.attemptedValue,
                limit: v.limit,
                occurredAt: v.occurredAt
            }));

            return report;

        } catch (error) {
            logger.error('Get usage error', {
                tenantId,
                moduleKey,
                period,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get usage for all modules of a tenant
     * @param {string} tenantId - Tenant identifier
     * @param {Object} options - Additional options
     * @param {string} options.period - Period (YYYY-MM), defaults to current
     * @returns {Promise<Object>}
     */
    async getTenantUsage(tenantId, options = {}) {
        const { period = null } = options;

        try {
            const queryPeriod = period || UsageTracking.getCurrentPeriod();
            const usageTrackings = await UsageTracking.getTenantUsage(tenantId, queryPeriod);

            const report = {
                success: true,
                tenantId,
                period: queryPeriod,
                modules: {}
            };

            for (const tracking of usageTrackings) {
                const moduleReport = {
                    usage: tracking.getUsageSummary(),
                    warnings: tracking.warnings.length,
                    violations: tracking.violations.length
                };

                report.modules[tracking.moduleKey] = moduleReport;
            }

            return report;

        } catch (error) {
            logger.error('Get tenant usage error', {
                tenantId,
                period,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if usage would exceed limit before tracking
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     * @param {string} limitType - Type of limit
     * @param {number} amount - Amount to check
     * @returns {Promise<LimitCheckResult>}
     */
    async checkBeforeTrack(tenantId, moduleKey, limitType, amount = 1) {
        try {
            // Core HR has no limits
            if (moduleKey === MODULES.CORE_HR) {
                return {
                    allowed: true,
                    reason: 'Core HR has no usage limits'
                };
            }

            // Get license
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                return {
                    allowed: false,
                    reason: 'No license found',
                    error: 'MODULE_NOT_LICENSED'
                };
            }

            const moduleLicense = license.getModuleLicense(moduleKey);

            if (!moduleLicense || !moduleLicense.enabled) {
                return {
                    allowed: false,
                    reason: 'Module not licensed',
                    error: 'MODULE_NOT_LICENSED'
                };
            }

            // Get or create usage tracking
            const usageTracking = await UsageTracking.findOrCreateForCurrentPeriod(
                tenantId,
                moduleKey,
                moduleLicense.limits
            );

            const currentUsage = usageTracking.usage[limitType] || 0;
            const limit = usageTracking.limits[limitType];

            // If no limit, allow
            if (!limit || limit === null || limit === 0) {
                return {
                    allowed: true,
                    limitType,
                    currentUsage,
                    limit: null,
                    reason: 'No limit configured'
                };
            }

            // Check if would exceed
            const projectedUsage = currentUsage + amount;
            const percentage = Math.round((currentUsage / limit) * 100);
            const projectedPercentage = Math.round((projectedUsage / limit) * 100);

            if (projectedUsage > limit) {
                return {
                    allowed: false,
                    limitType,
                    currentUsage,
                    limit,
                    percentage,
                    projectedUsage,
                    projectedPercentage,
                    reason: 'Would exceed usage limit',
                    error: 'LIMIT_EXCEEDED'
                };
            }

            return {
                allowed: true,
                limitType,
                currentUsage,
                limit,
                percentage,
                projectedUsage,
                projectedPercentage,
                isApproachingLimit: projectedPercentage >= 80,
                reason: 'Within usage limits'
            };

        } catch (error) {
            logger.error('Check before track error', {
                tenantId,
                moduleKey,
                limitType,
                amount,
                error: error.message,
                stack: error.stack
            });

            return {
                allowed: false,
                reason: 'Check failed',
                error: error.message
            };
        }
    }

    /**
     * Flush batch queue immediately
     * @returns {Promise<Object>}
     */
    async flushBatch() {
        if (this.isProcessing) {
            logger.warn('Batch processing already in progress, skipping flush');
            return {
                success: false,
                reason: 'Already processing'
            };
        }

        return await this._processBatch();
    }

    /**
     * Get batch queue statistics
     * @returns {Object}
     */
    getBatchStats() {
        const stats = {
            queueSize: this.batchQueue.size,
            isProcessing: this.isProcessing,
            batchInterval: this.batchInterval,
            items: []
        };

        for (const [key, value] of this.batchQueue.entries()) {
            stats.items.push({
                key,
                tenantId: value.tenantId,
                moduleKey: value.moduleKey,
                limitType: value.limitType,
                amount: value.amount,
                age: Date.now() - value.timestamp
            });
        }

        return stats;
    }

    /**
     * Stop batch processing (for cleanup)
     */
    stopBatchProcessing() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = null;
            logger.info('Batch processing stopped');
        }
    }

    /**
     * Start batch processing timer
     * @private
     */
    _startBatchProcessing() {
        // Clear any existing timer
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
        }

        // Start new timer
        this.batchTimer = setInterval(async () => {
            await this._processBatch();
        }, this.batchInterval);

        logger.info('Batch processing started', {
            interval: this.batchInterval
        });
    }

    /**
     * Process batch queue
     * @private
     */
    async _processBatch() {
        if (this.batchQueue.size === 0) {
            return {
                success: true,
                processed: 0,
                reason: 'Queue empty'
            };
        }

        if (this.isProcessing) {
            logger.warn('Batch processing already in progress');
            return {
                success: false,
                reason: 'Already processing'
            };
        }

        this.isProcessing = true;
        const startTime = Date.now();
        const items = Array.from(this.batchQueue.entries());
        let processed = 0;
        let failed = 0;

        logger.info('Starting batch processing', {
            queueSize: items.length
        });

        try {
            for (const [key, item] of items) {
                try {
                    await this._processUsageImmediate(
                        item.tenantId,
                        item.moduleKey,
                        item.limitType,
                        item.amount
                    );

                    // Remove from queue
                    this.batchQueue.delete(key);
                    processed++;

                } catch (error) {
                    logger.error('Batch item processing error', {
                        key,
                        item,
                        error: error.message
                    });
                    failed++;

                    // Remove failed items from queue to prevent infinite retries
                    this.batchQueue.delete(key);
                }
            }

            const duration = Date.now() - startTime;

            logger.info('Batch processing completed', {
                processed,
                failed,
                duration,
                remainingQueue: this.batchQueue.size
            });

            // Emit batch processed event
            this.emit('batchProcessed', {
                processed,
                failed,
                duration
            });

            return {
                success: true,
                processed,
                failed,
                duration
            };

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process usage immediately (not batched)
     * @private
     */
    async _processUsageImmediate(tenantId, moduleKey, limitType, amount) {
        try {
            // Get license to retrieve limits
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                throw new Error('No license found for tenant');
            }

            const moduleLicense = license.getModuleLicense(moduleKey);

            if (!moduleLicense || !moduleLicense.enabled) {
                throw new Error('Module not licensed or disabled');
            }

            // Get or create usage tracking for current period
            const usageTracking = await UsageTracking.findOrCreateForCurrentPeriod(
                tenantId,
                moduleKey,
                moduleLicense.limits
            );

            const currentUsage = usageTracking.usage[limitType] || 0;
            const limit = usageTracking.limits[limitType];

            // Check if would exceed limit
            if (limit && limit > 0 && (currentUsage + amount) > limit) {
                // Log violation
                await LicenseAudit.logLimitExceeded(
                    tenantId,
                    moduleKey,
                    limitType,
                    currentUsage + amount,
                    limit,
                    {
                        currentUsage,
                        requestedAmount: amount
                    }
                );

                // Emit limit exceeded event
                this.emit('limitExceeded', {
                    tenantId,
                    moduleKey,
                    limitType,
                    currentUsage,
                    limit,
                    attemptedAmount: amount
                });

                return {
                    success: false,
                    tracked: false,
                    blocked: true,
                    reason: 'Usage limit exceeded',
                    error: 'LIMIT_EXCEEDED',
                    currentUsage,
                    limit
                };
            }

            const newUsage = currentUsage + amount;
            const percentage = limit ? Math.round((newUsage / limit) * 100) : null;

            // Check for warning threshold (80%) BEFORE incrementing
            const shouldEmitWarning = percentage !== null && percentage >= 80;
            const hasRecentWarning = usageTracking.warnings.some(
                w => w.limitType === limitType &&
                    (Date.now() - w.triggeredAt.getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
            );

            // Increment usage (this will also add warnings to the model)
            await usageTracking.incrementUsage(limitType, amount);

            // Emit warning event if needed
            if (shouldEmitWarning && !hasRecentWarning) {
                // Log warning
                await LicenseAudit.logLimitWarning(
                    tenantId,
                    moduleKey,
                    limitType,
                    newUsage,
                    limit,
                    { percentage }
                );

                // Emit warning event
                this.emit('limitWarning', {
                    tenantId,
                    moduleKey,
                    limitType,
                    currentUsage: newUsage,
                    limit,
                    percentage
                });
            }

            logger.debug('Usage tracked successfully', {
                tenantId,
                moduleKey,
                limitType,
                amount,
                newUsage,
                limit,
                percentage
            });

            return {
                success: true,
                tracked: true,
                currentUsage: newUsage,
                limit,
                percentage,
                isApproachingLimit: percentage !== null && percentage >= 80,
                hasExceeded: false
            };

        } catch (error) {
            logger.error('Process usage immediate error', {
                tenantId,
                moduleKey,
                limitType,
                amount,
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }
}

// Export singleton instance
const usageTracker = new UsageTracker();
export default usageTracker;
