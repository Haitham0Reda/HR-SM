/**
 * License Audit Model - PostgreSQL (Sequelize)
 * Comprehensive audit logging for license-related events
 */

import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

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

const LicenseAudit = sequelize.define('LicenseAudit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id'
  },
  moduleKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'module_key'
  },
  eventType: {
    type: DataTypes.ENUM(...EVENT_TYPES),
    allowNull: false,
    field: 'event_type'
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  severity: {
    type: DataTypes.ENUM(...SEVERITY_LEVELS),
    defaultValue: 'info'
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'license_audits',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['tenant_id', 'timestamp'] },
    { fields: ['module_key', 'timestamp'] },
    { fields: ['tenant_id', 'module_key', 'timestamp'] },
    { fields: ['event_type', 'timestamp'] },
    { fields: ['severity', 'timestamp'] },
    { fields: ['tenant_id', 'event_type', 'timestamp'] }
  ]
});

/**
 * Static method to create an audit log entry
 * @param {Object} params - Audit log parameters
 * @returns {Promise<LicenseAudit>} Created audit log
 */
LicenseAudit.createLog = async function ({
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
LicenseAudit.logValidationSuccess = function (tenantId, moduleKey, details = {}) {
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
LicenseAudit.logValidationFailure = function (tenantId, moduleKey, reason, details = {}) {
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
LicenseAudit.logLicenseExpired = function (tenantId, moduleKey, details = {}) {
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
LicenseAudit.logLimitWarning = function (
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
LicenseAudit.logLimitExceeded = function (
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
LicenseAudit.logModuleActivated = function (tenantId, moduleKey, details = {}) {
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
LicenseAudit.logModuleDeactivated = function (tenantId, moduleKey, details = {}) {
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
LicenseAudit.logLicenseUpdated = function (
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
LicenseAudit.queryLogs = function ({
    tenantId = null,
    moduleKey = null,
    eventType = null,
    severity = null,
    startDate = null,
    endDate = null,
    limit = 100,
    skip = 0
}) {
    const where = {};

    if (tenantId) where.tenantId = tenantId;
    if (moduleKey) where.moduleKey = moduleKey;
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;

    if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp[Op.gte] = new Date(startDate);
        if (endDate) where.timestamp[Op.lte] = new Date(endDate);
    }

    return this.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit,
        offset: skip
    });
};

/**
 * Static method to get audit log statistics
 * @param {string} tenantId - Tenant ID (optional)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Audit statistics
 */
LicenseAudit.getStatistics = async function (tenantId = null, startDate = null, endDate = null) {
    const where = {};

    if (tenantId) where.tenantId = tenantId;

    if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp[Op.gte] = new Date(startDate);
        if (endDate) where.timestamp[Op.lte] = new Date(endDate);
    }

    // Get event type statistics
    const eventTypeStats = await this.findAll({
        where,
        attributes: [
            'eventType',
            'severity',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['eventType', 'severity'],
        raw: true
    });

    // Process results into structured format
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

    eventTypeStats.forEach(stat => {
        const count = parseInt(stat.count);
        statistics.totalEvents += count;

        if (!statistics.byEventType[stat.eventType]) {
            statistics.byEventType[stat.eventType] = {
                total: 0,
                bySeverity: {}
            };
        }

        statistics.byEventType[stat.eventType].total += count;
        statistics.byEventType[stat.eventType].bySeverity[stat.severity] = count;
        statistics.bySeverity[stat.severity] += count;
    });

    return statistics;
};

/**
 * Static method to get recent violations
 * @param {string} tenantId - Tenant ID (optional)
 * @param {number} limit - Number of records to return
 * @returns {Promise<LicenseAudit[]>} Recent violations
 */
LicenseAudit.getRecentViolations = function (tenantId = null, limit = 50) {
    const where = {
        severity: { [Op.in]: ['error', 'critical'] }
    };

    if (tenantId) {
        where.tenantId = tenantId;
    }

    return this.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit
    });
};

/**
 * Static method to get audit trail for a specific module
 * @param {string} tenantId - Tenant ID
 * @param {string} moduleKey - Module key
 * @param {number} days - Number of days to look back
 * @returns {Promise<LicenseAudit[]>} Audit trail
 */
LicenseAudit.getModuleAuditTrail = function (tenantId, moduleKey, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.findAll({
        where: {
            tenantId,
            moduleKey,
            timestamp: { [Op.gte]: startDate }
        },
        order: [['timestamp', 'DESC']]
    });
};

/**
 * Static method to clean up old audit logs
 * @param {number} daysToKeep - Number of days to keep
 * @returns {Promise<Object>} Deletion result
 */
LicenseAudit.cleanupOldLogs = async function (daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedCount = await this.destroy({
        where: {
            timestamp: { [Op.lt]: cutoffDate },
            severity: { [Op.notIn]: ['critical'] } // Keep critical logs longer
        }
    });

    return {
        deletedCount,
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
LicenseAudit.logSubscriptionEvent = function (tenantId, moduleKey, eventType, details = {}) {
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
        details,
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
LicenseAudit.logTrialEvent = function (tenantId, moduleKey, eventType, details = {}) {
    const validEvents = ['TRIAL_STARTED', 'TRIAL_ENDED'];

    if (!validEvents.includes(eventType)) {
        throw new Error('Invalid trial event type');
    }

    return this.createLog({
        tenantId,
        moduleKey,
        eventType,
        details,
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
LicenseAudit.logUsageTracked = function (tenantId, moduleKey, usageType, count, details = {}) {
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
LicenseAudit.logDependencyViolation = function (tenantId, moduleKey, dependencyType, details = {}) {
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

export default LicenseAudit;
export { EVENT_TYPES, SEVERITY_LEVELS };
