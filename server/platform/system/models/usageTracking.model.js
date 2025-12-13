// models/usageTracking.model.js
import mongoose from 'mongoose';

const usageMetricsSchema = new mongoose.Schema({
    employees: {
        type: Number,
        default: 0,
        min: 0
    },
    storage: {
        type: Number,
        default: 0,
        min: 0
    },
    apiCalls: {
        type: Number,
        default: 0,
        min: 0
    },
    customMetrics: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: false });

const limitsSchema = new mongoose.Schema({
    employees: {
        type: Number,
        default: null
    },
    storage: {
        type: Number,
        default: null
    },
    apiCalls: {
        type: Number,
        default: null
    },
    customLimits: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: false });

const warningSchema = new mongoose.Schema({
    limitType: {
        type: String,
        required: true,
        enum: ['employees', 'storage', 'apiCalls', 'custom']
    },
    percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    triggeredAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const violationSchema = new mongoose.Schema({
    limitType: {
        type: String,
        required: true,
        enum: ['employees', 'storage', 'apiCalls', 'custom']
    },
    attemptedValue: {
        type: Number,
        required: true
    },
    limit: {
        type: Number,
        required: true
    },
    occurredAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const usageTrackingSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    moduleKey: {
        type: String,
        required: true,
        index: true
    },
    period: {
        type: String,
        required: true,
        index: true,
        validate: {
            validator: function (v) {
                return /^\d{4}-\d{2}$/.test(v);
            },
            message: 'Period must be in YYYY-MM format'
        }
    },
    usage: {
        type: usageMetricsSchema,
        default: () => ({})
    },
    limits: {
        type: limitsSchema,
        default: () => ({})
    },
    warnings: {
        type: [warningSchema],
        default: []
    },
    violations: {
        type: [violationSchema],
        default: []
    }
}, {
    timestamps: true
});

// Compound index for efficient queries (unique per tenant, module, and period)
usageTrackingSchema.index(
    { tenantId: 1, moduleKey: 1, period: 1 },
    { unique: true }
);

// Additional indexes for common queries
usageTrackingSchema.index({ tenantId: 1, period: 1 });
usageTrackingSchema.index({ moduleKey: 1, period: 1 });
usageTrackingSchema.index({ 'warnings.triggeredAt': 1 });
usageTrackingSchema.index({ 'violations.occurredAt': 1 });

/**
 * Get current period string (YYYY-MM)
 * @returns {string} Current period
 */
usageTrackingSchema.statics.getCurrentPeriod = function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

/**
 * Calculate usage percentage for a limit type
 * @param {string} limitType - The limit type (employees, storage, apiCalls)
 * @returns {number|null} Percentage used or null if no limit
 */
usageTrackingSchema.methods.getUsagePercentage = function (limitType) {
    const currentUsage = this.usage[limitType];
    const limit = this.limits[limitType];

    if (!limit || limit === 0) {
        return null;
    }

    return Math.round((currentUsage / limit) * 100);
};

/**
 * Check if usage is approaching limit (>= 80%)
 * @param {string} limitType - The limit type
 * @returns {boolean} True if approaching limit
 */
usageTrackingSchema.methods.isApproachingLimit = function (limitType) {
    const percentage = this.getUsagePercentage(limitType);
    return percentage !== null && percentage >= 80;
};

/**
 * Check if usage has exceeded limit
 * @param {string} limitType - The limit type
 * @returns {boolean} True if limit exceeded
 */
usageTrackingSchema.methods.hasExceededLimit = function (limitType) {
    const currentUsage = this.usage[limitType];
    const limit = this.limits[limitType];

    if (!limit) {
        return false;
    }

    return currentUsage >= limit;
};

/**
 * Increment usage for a specific metric
 * @param {string} limitType - The limit type
 * @param {number} amount - Amount to increment
 * @returns {Promise<UsageTracking>} Updated usage tracking
 */
usageTrackingSchema.methods.incrementUsage = async function (limitType, amount = 1) {
    if (!this.usage[limitType]) {
        this.usage[limitType] = 0;
    }

    this.usage[limitType] += amount;

    // Check for warnings and violations
    const percentage = this.getUsagePercentage(limitType);

    if (percentage !== null && percentage >= 80) {
        // Add warning if not already present for this threshold
        const hasRecentWarning = this.warnings.some(
            w => w.limitType === limitType &&
                w.percentage >= 80 &&
                (Date.now() - w.triggeredAt.getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
        );

        if (!hasRecentWarning) {
            // Cap percentage at 100 for validation
            const cappedPercentage = Math.min(percentage, 100);
            this.warnings.push({
                limitType,
                percentage: cappedPercentage,
                triggeredAt: new Date()
            });
        }
    }

    if (this.hasExceededLimit(limitType)) {
        // Add violation
        this.violations.push({
            limitType,
            attemptedValue: this.usage[limitType],
            limit: this.limits[limitType],
            occurredAt: new Date()
        });
    }

    return await this.save();
};

/**
 * Set usage for a specific metric
 * @param {string} limitType - The limit type
 * @param {number} value - New value
 * @returns {Promise<UsageTracking>} Updated usage tracking
 */
usageTrackingSchema.methods.setUsage = async function (limitType, value) {
    this.usage[limitType] = value;
    return await this.save();
};

/**
 * Get usage summary with percentages
 * @returns {Object} Usage summary
 */
usageTrackingSchema.methods.getUsageSummary = function () {
    const summary = {};

    ['employees', 'storage', 'apiCalls'].forEach(limitType => {
        const current = this.usage[limitType] || 0;
        const limit = this.limits[limitType];
        const percentage = this.getUsagePercentage(limitType);

        summary[limitType] = {
            current,
            limit,
            percentage,
            isApproachingLimit: this.isApproachingLimit(limitType),
            hasExceeded: this.hasExceededLimit(limitType)
        };
    });

    return summary;
};

/**
 * Static method to find or create usage tracking for current period
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {Object} limits - Usage limits
 * @returns {Promise<UsageTracking>} Usage tracking document
 */
usageTrackingSchema.statics.findOrCreateForCurrentPeriod = async function (tenantId, moduleKey, limits = {}) {
    const period = this.getCurrentPeriod();

    let usageTracking = await this.findOne({ tenantId, moduleKey, period });

    if (!usageTracking) {
        usageTracking = await this.create({
            tenantId,
            moduleKey,
            period,
            limits
        });
    }

    return usageTracking;
};

/**
 * Static method to get usage for a tenant across all modules
 * @param {string} tenantId - Tenant ID
 * @param {string} period - Period (YYYY-MM), defaults to current
 * @returns {Promise<UsageTracking[]>} Array of usage tracking documents
 */
usageTrackingSchema.statics.getTenantUsage = function (tenantId, period = null) {
    const queryPeriod = period || this.getCurrentPeriod();
    return this.find({ tenantId, period: queryPeriod });
};

/**
 * Static method to get usage for a module across all tenants
 * @param {string} moduleKey - Module key
 * @param {string} period - Period (YYYY-MM), defaults to current
 * @returns {Promise<UsageTracking[]>} Array of usage tracking documents
 */
usageTrackingSchema.statics.getModuleUsage = function (moduleKey, period = null) {
    const queryPeriod = period || this.getCurrentPeriod();
    return this.find({ moduleKey, period: queryPeriod });
};

/**
 * Static method to find all usage tracking with warnings
 * @param {string} period - Period (YYYY-MM), defaults to current
 * @returns {Promise<UsageTracking[]>} Array of usage tracking with warnings
 */
usageTrackingSchema.statics.findWithWarnings = function (period = null) {
    const queryPeriod = period || this.getCurrentPeriod();
    return this.find({
        period: queryPeriod,
        warnings: { $exists: true, $ne: [] }
    });
};

/**
 * Static method to find all usage tracking with violations
 * @param {string} period - Period (YYYY-MM), defaults to current
 * @returns {Promise<UsageTracking[]>} Array of usage tracking with violations
 */
usageTrackingSchema.statics.findWithViolations = function (period = null) {
    const queryPeriod = period || this.getCurrentPeriod();
    return this.find({
        period: queryPeriod,
        violations: { $exists: true, $ne: [] }
    });
};

/**
 * Static method to aggregate usage across periods
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {number} months - Number of months to aggregate
 * @returns {Promise<Object>} Aggregated usage data
 */
usageTrackingSchema.statics.aggregateUsage = async function (tenantId, moduleKey, months = 6) {
    const periods = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        periods.push(`${year}-${month}`);
    }

    const usageData = await this.find({
        tenantId,
        moduleKey,
        period: { $in: periods }
    }).sort({ period: -1 });

    return {
        periods,
        data: usageData,
        summary: {
            totalEmployees: Math.max(...usageData.map(u => u.usage.employees || 0)),
            totalStorage: usageData.reduce((sum, u) => sum + (u.usage.storage || 0), 0),
            totalApiCalls: usageData.reduce((sum, u) => sum + (u.usage.apiCalls || 0), 0)
        }
    };
};

export default mongoose.model('UsageTracking', usageTrackingSchema);
