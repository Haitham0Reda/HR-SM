// services/auditLogger.service.js
import LicenseAudit, { EVENT_TYPES, SEVERITY_LEVELS } from '../models/licenseAudit.model.js';
import logger from '../../../utils/logger.js';

/**
 * Audit Logger Service
 * Centralized service for creating and querying license audit logs
 * Provides structured logging with required fields and high-priority logging for violations
 */
class AuditLoggerService {
    /**
     * Create a generic audit log entry
     * @param {Object} params - Audit log parameters
     * @param {string} params.tenantId - Tenant identifier
     * @param {string} params.moduleKey - Module key
     * @param {string} params.eventType - Event type (from EVENT_TYPES)
     * @param {Object} params.details - Additional details
     * @param {string} params.severity - Severity level (from SEVERITY_LEVELS)
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async createLog({ tenantId, moduleKey, eventType, details = {}, severity = 'info' }) {
        try {
            // Validate event type
            if (!EVENT_TYPES.includes(eventType)) {
                logger.warn('Invalid event type for audit log', { eventType, validTypes: EVENT_TYPES });
                throw new Error(`Invalid event type: ${eventType}`);
            }

            // Validate severity
            if (!SEVERITY_LEVELS.includes(severity)) {
                logger.warn('Invalid severity level for audit log', { severity, validLevels: SEVERITY_LEVELS });
                throw new Error(`Invalid severity level: ${severity}`);
            }

            // Create audit log entry
            const auditLog = await LicenseAudit.createLog({
                tenantId,
                moduleKey,
                eventType,
                details,
                severity
            });

            // Log to application logger for high-priority events
            if (severity === 'critical' || severity === 'error') {
                logger.error('High-priority audit event', {
                    tenantId,
                    moduleKey,
                    eventType,
                    severity,
                    details
                });
            }

            return auditLog;
        } catch (error) {
            logger.error('Failed to create audit log', {
                tenantId,
                moduleKey,
                eventType,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Log validation success
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logValidationSuccess(tenantId, moduleKey, details = {}) {
        return await this.createLog({
            tenantId,
            moduleKey,
            eventType: 'VALIDATION_SUCCESS',
            details,
            severity: 'info'
        });
    }

    /**
     * Log validation failure
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {string} reason - Failure reason
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logValidationFailure(tenantId, moduleKey, reason, details = {}) {
        return await this.createLog({
            tenantId,
            moduleKey,
            eventType: 'VALIDATION_FAILURE',
            details: { ...details, reason },
            severity: 'warning'
        });
    }

    /**
     * Log license expiration
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logLicenseExpired(tenantId, moduleKey, details = {}) {
        return await this.createLog({
            tenantId,
            moduleKey,
            eventType: 'LICENSE_EXPIRED',
            details,
            severity: 'critical'
        });
    }

    /**
     * Log usage limit warning
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {string} limitType - Type of limit
     * @param {number} currentValue - Current usage value
     * @param {number} limitValue - Limit value
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logLimitWarning(tenantId, moduleKey, limitType, currentValue, limitValue, details = {}) {
        return await this.createLog({
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
    }

    /**
     * Log usage limit exceeded (violation)
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {string} limitType - Type of limit
     * @param {number} currentValue - Current usage value
     * @param {number} limitValue - Limit value
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logLimitExceeded(tenantId, moduleKey, limitType, currentValue, limitValue, details = {}) {
        return await this.createLog({
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
    }

    /**
     * Log module activation
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {Object} details - Additional details (tier, limits, etc.)
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logModuleActivated(tenantId, moduleKey, details = {}) {
        return await this.createLog({
            tenantId,
            moduleKey,
            eventType: 'MODULE_ACTIVATED',
            details,
            severity: 'info'
        });
    }

    /**
     * Log module deactivation
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logModuleDeactivated(tenantId, moduleKey, details = {}) {
        return await this.createLog({
            tenantId,
            moduleKey,
            eventType: 'MODULE_DEACTIVATED',
            details,
            severity: 'info'
        });
    }

    /**
     * Log license update with change tracking
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {Object} previousValue - Previous license state
     * @param {Object} newValue - New license state
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logLicenseUpdated(tenantId, moduleKey, previousValue, newValue, details = {}) {
        return await this.createLog({
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
    }

    /**
     * Log license creation
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logLicenseCreated(tenantId, moduleKey, details = {}) {
        return await this.createLog({
            tenantId,
            moduleKey,
            eventType: 'LICENSE_CREATED',
            details,
            severity: 'info'
        });
    }

    /**
     * Log subscription events
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {string} eventType - Subscription event type
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logSubscriptionEvent(tenantId, moduleKey, eventType, details = {}) {
        const validSubscriptionEvents = [
            'SUBSCRIPTION_CREATED',
            'SUBSCRIPTION_UPGRADED',
            'SUBSCRIPTION_DOWNGRADED',
            'SUBSCRIPTION_EXPIRED',
            'SUBSCRIPTION_CANCELLED'
        ];

        if (!validSubscriptionEvents.includes(eventType)) {
            throw new Error(`Invalid subscription event type: ${eventType}`);
        }

        const severity = eventType === 'SUBSCRIPTION_EXPIRED' || eventType === 'SUBSCRIPTION_CANCELLED'
            ? 'warning'
            : 'info';

        return await this.createLog({
            tenantId,
            moduleKey,
            eventType,
            details,
            severity
        });
    }

    /**
     * Log trial events
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {string} eventType - Trial event type ('TRIAL_STARTED' or 'TRIAL_ENDED')
     * @param {Object} details - Additional details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logTrialEvent(tenantId, moduleKey, eventType, details = {}) {
        const validTrialEvents = ['TRIAL_STARTED', 'TRIAL_ENDED'];

        if (!validTrialEvents.includes(eventType)) {
            throw new Error(`Invalid trial event type: ${eventType}`);
        }

        return await this.createLog({
            tenantId,
            moduleKey,
            eventType,
            details,
            severity: 'info'
        });
    }

    /**
     * Log usage tracking event
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {Object} details - Usage details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logUsageTracked(tenantId, moduleKey, details = {}) {
        return await this.createLog({
            tenantId,
            moduleKey,
            eventType: 'USAGE_TRACKED',
            details,
            severity: 'info'
        });
    }

    /**
     * Log dependency violation
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {Object} details - Violation details
     * @returns {Promise<LicenseAudit>} Created audit log
     */
    async logDependencyViolation(tenantId, moduleKey, details = {}) {
        return await this.createLog({
            tenantId,
            moduleKey,
            eventType: 'DEPENDENCY_VIOLATION',
            details,
            severity: 'error'
        });
    }

    /**
     * Query audit logs with filters
     * @param {Object} filters - Query filters
     * @param {string} filters.tenantId - Tenant ID (optional)
     * @param {string} filters.moduleKey - Module key (optional)
     * @param {string} filters.eventType - Event type (optional)
     * @param {string} filters.severity - Severity level (optional)
     * @param {Date|string} filters.startDate - Start date (optional)
     * @param {Date|string} filters.endDate - End date (optional)
     * @param {number} filters.limit - Maximum number of results (default: 100)
     * @param {number} filters.skip - Number of results to skip (default: 0)
     * @returns {Promise<LicenseAudit[]>} Array of audit logs
     */
    async queryLogs(filters = {}) {
        try {
            return await LicenseAudit.queryLogs(filters);
        } catch (error) {
            logger.error('Failed to query audit logs', {
                filters,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get audit log statistics
     * @param {string} tenantId - Tenant ID (optional)
     * @param {Date|string} startDate - Start date (optional)
     * @param {Date|string} endDate - End date (optional)
     * @returns {Promise<Object>} Audit statistics
     */
    async getStatistics(tenantId = null, startDate = null, endDate = null) {
        try {
            return await LicenseAudit.getStatistics(tenantId, startDate, endDate);
        } catch (error) {
            logger.error('Failed to get audit statistics', {
                tenantId,
                startDate,
                endDate,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get recent violations (high-priority events)
     * @param {string} tenantId - Tenant ID (optional)
     * @param {number} limit - Number of records to return (default: 50)
     * @returns {Promise<LicenseAudit[]>} Recent violations
     */
    async getRecentViolations(tenantId = null, limit = 50) {
        try {
            return await LicenseAudit.getRecentViolations(tenantId, limit);
        } catch (error) {
            logger.error('Failed to get recent violations', {
                tenantId,
                limit,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get audit trail for a specific module
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleKey - Module key
     * @param {number} days - Number of days to look back (default: 30)
     * @returns {Promise<LicenseAudit[]>} Audit trail
     */
    async getModuleAuditTrail(tenantId, moduleKey, days = 30) {
        try {
            return await LicenseAudit.getModuleAuditTrail(tenantId, moduleKey, days);
        } catch (error) {
            logger.error('Failed to get module audit trail', {
                tenantId,
                moduleKey,
                days,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Clean up old audit logs
     * @param {number} daysToKeep - Number of days to keep (default: 365)
     * @returns {Promise<Object>} Deletion result
     */
    async cleanupOldLogs(daysToKeep = 365) {
        try {
            const result = await LicenseAudit.cleanupOldLogs(daysToKeep);
            logger.info('Old audit logs cleaned up', result);
            return result;
        } catch (error) {
            logger.error('Failed to cleanup old audit logs', {
                daysToKeep,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get available event types
     * @returns {string[]} Array of event types
     */
    getEventTypes() {
        return [...EVENT_TYPES];
    }

    /**
     * Get available severity levels
     * @returns {string[]} Array of severity levels
     */
    getSeverityLevels() {
        return [...SEVERITY_LEVELS];
    }
}

// Export singleton instance
const auditLoggerService = new AuditLoggerService();
export default auditLoggerService;
