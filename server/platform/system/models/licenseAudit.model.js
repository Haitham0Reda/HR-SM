// models/licenseAudit.model.js
import mongoose from 'mongoose';

const EVENT_TYPES = [
    'VALIDATION_SUCCESS',
    'VALIDATION_FAILURE',
    'LICENSE_EXPIRED',
    'LIMIT_WARNING',
    'LIMIT_EXCEEDED',
    'MODULE_ACTIVATED',
    'MODULE_DEACTIVATED',
    'LICENSE_UPDATED',
    'LICENSE_CREATED',
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_UPGRADED',
    'SUBSCRIPTION_DOWNGRADED',
    'SUBSCRIPTION_EXPIRED',
    'SUBSCRIPTION_CANCELLED',
    'TRIAL_STARTED',
    'TRIAL_ENDED',
    'USAGE_TRACKED',
    'DEPENDENCY_VIOLATION'
];

const SEVERITY_LEVELS = ['info', 'warning', 'error', 'critical'];

const auditDetailsSchema = new mongoose.Schema({
    reason: {
        type: String,
        default: null
    },
    limitType: {
        type: String,
        default: null
    },
    currentValue: {
        type: Number,
        default: null
    },
    limitValue: {
        type: Number,
        default: null
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    previousValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    additionalInfo: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: false });

const licenseAuditSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    moduleKey: {
        type: String,
        required: true,
        index: true
    },
    eventType: {
        type: String,
        enum: EVENT_TYPES,
        required: true,
        index: true
    },
    details: {
        type: auditDetailsSchema,
        default: () => ({})
    },
    severity: {
        type: String,
        enum: SEVERITY_LEVELS,
        default: 'info',
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false // Using custom timestamp field
});

// Compound indexes for efficient queries
licenseAuditSchema.index({ tenantId: 1, timestamp: -1 });
licenseAuditSchema.index({ moduleKey: 1, timestamp: -1 });
licenseAuditSchema.index({ tenantId: 1, moduleKey: 1, timestamp: -1 });
licenseAuditSchema.index({ eventType: 1, timestamp: -1 });
licenseAuditSchema.index({ severity: 1, timestamp: -1 });
licenseAuditSchema.index({ tenantId: 1, eventType: 1, timestamp: -1 });

/**
 * Static method to create an audit log entry
 * @param {Object} params - Audit log parameters
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.createLog = async function ({
    tenantId,
    moduleKey,
    eventType,
    details = {},
    severity = 'info'
}) {
    return await this.create({
        tenantId,
        moduleKey,
        eventType,
        details,
        severity,
        timestamp: new Date()
    });
};

/**
 * Static method to log validation success
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logValidationSuccess = function (tenantId, moduleKey, details = {}) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'VALIDATION_SUCCESS',
        details,
        severity: 'info'
    });
};

/**
 * Static method to log validation failure
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {string} reason - Failure reason
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logValidationFailure = function (tenantId, moduleKey, reason, details = {}) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'VALIDATION_FAILURE',
        details: { ...details, reason },
        severity: 'warning'
    });
};

/**
 * Static method to log license expiration
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logLicenseExpired = function (tenantId, moduleKey, details = {}) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'LICENSE_EXPIRED',
        details,
        severity: 'critical'
    });
};

/**
 * Static method to log usage limit warning
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {string} limitType - Type of limit
 * @param {number} currentValue - Current usage value
 * @param {number} limitValue - Limit value
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logLimitWarning = function (
    tenantId,
    moduleKey,
    limitType,
    currentValue,
    limitValue,
    details = {}
) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'LIMIT_WARNING',
        details: {
            ...details,
            limitType,
            currentValue,
            limitValue
        },
        severity: 'warning'
    });
};

/**
 * Static method to log usage limit exceeded
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {string} limitType - Type of limit
 * @param {number} currentValue - Current usage value
 * @param {number} limitValue - Limit value
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logLimitExceeded = function (
    tenantId,
    moduleKey,
    limitType,
    currentValue,
    limitValue,
    details = {}
) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'LIMIT_EXCEEDED',
        details: {
            ...details,
            limitType,
            currentValue,
            limitValue
        },
        severity: 'critical'
    });
};

/**
 * Static method to log module activation
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logModuleActivated = function (tenantId, moduleKey, details = {}) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'MODULE_ACTIVATED',
        details,
        severity: 'info'
    });
};

/**
 * Static method to log module deactivation
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logModuleDeactivated = function (tenantId, moduleKey, details = {}) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'MODULE_DEACTIVATED',
        details,
        severity: 'info'
    });
};

/**
 * Static method to log license update
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {Object} previousValue - Previous license state
 * @param {Object} newValue - New license state
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logLicenseUpdated = function (
    tenantId,
    moduleKey,
    previousValue,
    newValue,
    details = {}
) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'LICENSE_UPDATED',
        details: {
            ...details,
            previousValue,
            newValue
        },
        severity: 'info'
    });
};

/**
 * Static method to query audit logs with filters
 * @param {Object} filters - Query filters
 * @returns {Promise<LicenseAudit[]>} Array of audit logs
 */
licenseAuditSchema.statics.queryLogs = function ({
    tenantId = null,
    moduleKey = null,
    eventType = null,
    severity = null,
    startDate = null,
    endDate = null,
    limit = 100,
    skip = 0
}) {
    const query = {};

    if (tenantId) query.tenantId = tenantId;
    if (moduleKey) query.moduleKey = moduleKey;
    if (eventType) query.eventType = eventType;
    if (severity) query.severity = severity;

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);
};

/**
 * Static method to get audit log statistics
 * @param {string} tenantId - Tenant ID (optional)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Audit statistics
 */
licenseAuditSchema.statics.getStatistics = async function (tenantId = null, startDate = null, endDate = null) {
    const matchStage = {};

    if (tenantId) matchStage.tenantId = new mongoose.Types.ObjectId(tenantId);

    if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: {
                    eventType: '$eventType',
                    severity: '$severity'
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.eventType',
                total: { $sum: '$count' },
                bySeverity: {
                    $push: {
                        severity: '$_id.severity',
                        count: '$count'
                    }
                }
            }
        }
    ];

    const results = await this.aggregate(pipeline);

    const statistics = {
        totalEvents: 0,
        byEventType: {},
        bySeverity: {
            info: 0,
            warning: 0,
            error: 0,
            critical: 0
        }
    };

    results.forEach(result => {
        statistics.totalEvents += result.total;
        statistics.byEventType[result._id] = {
            total: result.total,
            bySeverity: {}
        };

        result.bySeverity.forEach(sev => {
            statistics.byEventType[result._id].bySeverity[sev.severity] = sev.count;
            statistics.bySeverity[sev.severity] += sev.count;
        });
    });

    return statistics;
};

/**
 * Static method to get recent violations
 * @param {string} tenantId - Tenant ID (optional)
 * @param {number} limit - Number of records to return
 * @returns {Promise<LicenseAudit[]>} Recent violations
 */
licenseAuditSchema.statics.getRecentViolations = function (tenantId = null, limit = 50) {
    const query = {
        severity: { $in: ['error', 'critical'] }
    };

    if (tenantId) {
        query.tenantId = tenantId;
    }

    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
};

/**
 * Static method to get audit trail for a specific module
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {number} days - Number of days to look back
 * @returns {Promise<LicenseAudit[]>} Audit trail
 */
licenseAuditSchema.statics.getModuleAuditTrail = function (tenantId, moduleKey, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.find({
        tenantId,
        moduleKey,
        timestamp: { $gte: startDate }
    })
        .sort({ timestamp: -1 });
};

/**
 * Static method to clean up old audit logs
 * @param {number} daysToKeep - Number of days to keep
 * @returns {Promise<Object>} Deletion result
 */
licenseAuditSchema.statics.cleanupOldLogs = async function (daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.deleteMany({
        timestamp: { $lt: cutoffDate },
        severity: { $nin: ['critical'] } // Keep critical logs longer
    });

    return {
        deletedCount: result.deletedCount,
        cutoffDate
    };
};

/**
 * Static method to log subscription events
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {string} eventType - Event type (SUBSCRIPTION_CREATED, SUBSCRIPTION_UPGRADED, etc.)
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logSubscriptionEvent = function (tenantId, moduleKey, eventType, details = {}) {
    const validEvents = [
        'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPGRADED', 'SUBSCRIPTION_DOWNGRADED',
        'SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_CANCELLED'
    ];

    if (!validEvents.includes(eventType)) {
        throw new Error('Invalid subscription event type');
    }

    const severityMap = {
        'SUBSCRIPTION_CREATED': 'info',
        'SUBSCRIPTION_UPGRADED': 'info',
        'SUBSCRIPTION_DOWNGRADED': 'warning',
        'SUBSCRIPTION_EXPIRED': 'error',
        'SUBSCRIPTION_CANCELLED': 'warning'
    };

    return this.createLog({
        tenantId,
        moduleKey,
        eventType,
        details: {
            ...details
        },
        severity: severityMap[eventType] || 'info'
    });
};

/**
 * Static method to log trial events
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {string} eventType - Event type (TRIAL_STARTED, TRIAL_ENDED)
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logTrialEvent = function (tenantId, moduleKey, eventType, details = {}) {
    const validEvents = ['TRIAL_STARTED', 'TRIAL_ENDED'];

    if (!validEvents.includes(eventType)) {
        throw new Error('Invalid trial event type');
    }

    return this.createLog({
        tenantId,
        moduleKey,
        eventType,
        details: {
            ...details
        },
        severity: eventType === 'TRIAL_ENDED' ? 'warning' : 'info'
    });
};

/**
 * Static method to log usage tracking
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {string} usageType - Type of usage
 * @param {number} count - Usage count
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logUsageTracked = function (tenantId, moduleKey, usageType, count, details = {}) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'USAGE_TRACKED',
        details: {
            usageType,
            count,
            ...details
        },
        severity: 'info'
    });
};

/**
 * Static method to log dependency violations
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {string} dependencyType - Type of dependency
 * @param {Object} details - Additional details
 * @returns {Promise<LicenseAudit>} Created audit log
 */
licenseAuditSchema.statics.logDependencyViolation = function (tenantId, moduleKey, dependencyType, details = {}) {
    return this.createLog({
        tenantId,
        moduleKey,
        eventType: 'DEPENDENCY_VIOLATION',
        details: {
            dependencyType,
            ...details
        },
        severity: 'error'
    });
};

export default mongoose.model('LicenseAudit', licenseAuditSchema);
export { EVENT_TYPES, SEVERITY_LEVELS };
