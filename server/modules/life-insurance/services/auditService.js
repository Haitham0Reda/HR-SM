/**
 * Insurance Module Audit Service
 * 
 * Provides comprehensive audit logging for insurance module operations
 * Requirements: 6.2, 6.4, 6.5, 7.5
 */

import SecurityAudit from '../../../platform/system/models/securityAudit.model.js';
import logger from '../../../utils/logger.js';
import { 
    logAuthenticationEvent, 
    logDataAccess, 
    logSecurityEvent,
    logAdminAction 
} from '../../../utils/controllerLogger.js';

/**
 * Extract request metadata for audit logging
 */
const getRequestMetadata = (req) => ({
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    requestUrl: req.originalUrl,
    requestMethod: req.method,
    sessionId: req.sessionID || req.headers['x-session-id'],
    correlationId: req.correlationId
});

/**
 * Extract user metadata for audit logging
 */
const getUserMetadata = (user) => ({
    user: user?._id,
    username: user?.username,
    userEmail: user?.email,
    userRole: user?.role
});

/**
 * Extract tenant metadata for audit logging
 */
const getTenantMetadata = (req) => ({
    tenantId: req.tenant?.id,
    companyName: req.tenant?.companyName || req.companyName
});

/**
 * Log authentication events for insurance module
 */
export const logInsuranceAuthEvent = async (req, eventType, details = {}) => {
    try {
        // Use existing authentication logging utility
        logAuthenticationEvent(req, eventType, {
            module: 'life-insurance',
            ...details
        });

        // Also log to SecurityAudit for centralized audit trail
        const auditData = {
            eventType: `insurance-${eventType}`,
            ...getUserMetadata(req.user),
            ...getRequestMetadata(req),
            details: {
                module: 'life-insurance',
                ...getTenantMetadata(req),
                ...details
            },
            severity: eventType.includes('denied') || eventType.includes('failed') ? 'warning' : 'info',
            success: !eventType.includes('denied') && !eventType.includes('failed')
        };

        await SecurityAudit.logEvent(auditData);

        logger.audit(`Insurance authentication event: ${eventType}`, {
            ...auditData.details,
            userId: req.user?._id,
            eventType
        });

    } catch (error) {
        logger.error('Failed to log insurance authentication event', {
            eventType,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Log authorization events (access control)
 */
export const logInsuranceAuthorizationEvent = async (req, action, resource, granted, details = {}) => {
    try {
        const eventType = granted ? 'authorization-granted' : 'authorization-denied';
        
        // Use existing security logging utility
        logSecurityEvent(req, eventType, {
            module: 'life-insurance',
            action,
            resource,
            granted,
            severity: granted ? 'info' : 'warning',
            ...details
        });

        // Log to SecurityAudit for centralized audit trail
        const auditData = {
            eventType: `insurance-${eventType}`,
            ...getUserMetadata(req.user),
            ...getRequestMetadata(req),
            details: {
                module: 'life-insurance',
                action,
                resource,
                granted,
                ...getTenantMetadata(req),
                ...details
            },
            severity: granted ? 'info' : 'warning',
            success: granted
        };

        await SecurityAudit.logEvent(auditData);

        logger.audit(`Insurance authorization: ${action} on ${resource} - ${granted ? 'GRANTED' : 'DENIED'}`, {
            ...auditData.details,
            userId: req.user?._id,
            granted
        });

    } catch (error) {
        logger.error('Failed to log insurance authorization event', {
            action,
            resource,
            granted,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Log data access events for insurance operations
 */
export const logInsuranceDataAccess = async (req, operation, dataType, recordIds = [], details = {}) => {
    try {
        // Use existing data access logging utility
        logDataAccess(req, dataType, {
            module: 'life-insurance',
            operation,
            recordIds: Array.isArray(recordIds) ? recordIds : [recordIds],
            recordsAccessed: Array.isArray(recordIds) ? recordIds.length : (recordIds ? 1 : 0),
            sensitiveData: ['policy', 'claim', 'family-member', 'beneficiary'].includes(dataType),
            ...details
        });

        // Log to SecurityAudit for centralized audit trail
        const auditData = {
            eventType: 'insurance-data-accessed',
            ...getUserMetadata(req.user),
            ...getRequestMetadata(req),
            details: {
                module: 'life-insurance',
                operation,
                dataType,
                recordIds: Array.isArray(recordIds) ? recordIds : [recordIds],
                recordsAccessed: Array.isArray(recordIds) ? recordIds.length : (recordIds ? 1 : 0),
                ...getTenantMetadata(req),
                ...details
            },
            severity: 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);

        logger.audit(`Insurance data access: ${operation} ${dataType}`, {
            ...auditData.details,
            userId: req.user?._id
        });

    } catch (error) {
        logger.error('Failed to log insurance data access event', {
            operation,
            dataType,
            recordIds,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Log policy operations
 */
export const logPolicyOperation = async (req, operation, policyId, policyData = {}, details = {}) => {
    try {
        const auditData = {
            eventType: `insurance-policy-${operation}`,
            ...getUserMetadata(req.user),
            ...getRequestMetadata(req),
            details: {
                module: 'life-insurance',
                operation,
                policyId,
                policyNumber: policyData.policyNumber,
                employeeId: policyData.employeeId,
                policyType: policyData.policyType,
                coverageAmount: policyData.coverageAmount,
                ...getTenantMetadata(req),
                ...details
            },
            severity: 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);

        logger.audit(`Insurance policy ${operation}`, {
            ...auditData.details,
            userId: req.user?._id
        });

        // Log data access for policy operations
        await logInsuranceDataAccess(req, operation, 'policy', policyId, {
            policyNumber: policyData.policyNumber,
            employeeId: policyData.employeeId
        });

    } catch (error) {
        logger.error('Failed to log policy operation', {
            operation,
            policyId,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Log claim operations
 */
export const logClaimOperation = async (req, operation, claimId, claimData = {}, details = {}) => {
    try {
        const auditData = {
            eventType: `insurance-claim-${operation}`,
            ...getUserMetadata(req.user),
            ...getRequestMetadata(req),
            details: {
                module: 'life-insurance',
                operation,
                claimId,
                claimNumber: claimData.claimNumber,
                policyId: claimData.policyId,
                claimType: claimData.claimType,
                claimAmount: claimData.claimAmount,
                status: claimData.status,
                ...getTenantMetadata(req),
                ...details
            },
            severity: operation === 'approved' || operation === 'paid' ? 'info' : 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);

        logger.audit(`Insurance claim ${operation}`, {
            ...auditData.details,
            userId: req.user?._id
        });

        // Log data access for claim operations
        await logInsuranceDataAccess(req, operation, 'claim', claimId, {
            claimNumber: claimData.claimNumber,
            policyId: claimData.policyId,
            claimAmount: claimData.claimAmount
        });

    } catch (error) {
        logger.error('Failed to log claim operation', {
            operation,
            claimId,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Log family member operations
 */
export const logFamilyMemberOperation = async (req, operation, familyMemberId, familyMemberData = {}, details = {}) => {
    try {
        const auditData = {
            eventType: `insurance-family-member-${operation}`,
            ...getUserMetadata(req.user),
            ...getRequestMetadata(req),
            details: {
                module: 'life-insurance',
                operation,
                familyMemberId,
                policyId: familyMemberData.policyId,
                relationship: familyMemberData.relationship,
                firstName: familyMemberData.firstName,
                lastName: familyMemberData.lastName,
                ...getTenantMetadata(req),
                ...details
            },
            severity: 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);

        logger.audit(`Insurance family member ${operation}`, {
            ...auditData.details,
            userId: req.user?._id
        });

        // Log data access for family member operations
        await logInsuranceDataAccess(req, operation, 'family-member', familyMemberId, {
            policyId: familyMemberData.policyId,
            relationship: familyMemberData.relationship
        });

    } catch (error) {
        logger.error('Failed to log family member operation', {
            operation,
            familyMemberId,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Log access denial events with context
 */
export const logAccessDenied = async (req, resource, reason, details = {}) => {
    try {
        // Log authorization denial
        await logInsuranceAuthorizationEvent(req, 'access', resource, false, {
            reason,
            ...details
        });

        // Log as security event for monitoring
        logSecurityEvent(req, 'access-denied', {
            module: 'life-insurance',
            resource,
            reason,
            severity: 'warning',
            blocked: true,
            actionTaken: 'request-blocked',
            ...details
        });

        logger.warn(`Insurance access denied: ${resource}`, {
            resource,
            reason,
            userId: req.user?._id,
            tenantId: req.tenant?.id,
            userRole: req.user?.role,
            ...details
        });

    } catch (error) {
        logger.error('Failed to log access denial', {
            resource,
            reason,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Log module configuration changes
 */
export const logConfigurationChange = async (req, configType, changes, details = {}) => {
    try {
        // Use admin action logging for configuration changes
        logAdminAction(req, `insurance-config-${configType}`, {
            module: 'life-insurance',
            configType,
            changes,
            ...details
        });

        const auditData = {
            eventType: 'insurance-configuration-changed',
            ...getUserMetadata(req.user),
            ...getRequestMetadata(req),
            details: {
                module: 'life-insurance',
                configType,
                changes,
                ...getTenantMetadata(req),
                ...details
            },
            severity: 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);

        logger.audit(`Insurance configuration changed: ${configType}`, {
            ...auditData.details,
            userId: req.user?._id
        });

    } catch (error) {
        logger.error('Failed to log configuration change', {
            configType,
            changes,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Log tenant status access control events
 */
export const logTenantStatusAccess = async (req, tenantStatus, allowed, details = {}) => {
    try {
        const eventType = allowed ? 'tenant-access-granted' : 'tenant-access-denied';
        
        const auditData = {
            eventType: `insurance-${eventType}`,
            ...getUserMetadata(req.user),
            ...getRequestMetadata(req),
            details: {
                module: 'life-insurance',
                tenantStatus,
                allowed,
                ...getTenantMetadata(req),
                ...details
            },
            severity: allowed ? 'info' : 'warning',
            success: allowed
        };

        await SecurityAudit.logEvent(auditData);

        if (!allowed) {
            logSecurityEvent(req, 'tenant-status-access-denied', {
                module: 'life-insurance',
                tenantStatus,
                severity: 'warning',
                blocked: true,
                actionTaken: 'request-blocked',
                ...details
            });
        }

        logger.audit(`Insurance tenant access: ${tenantStatus} - ${allowed ? 'ALLOWED' : 'DENIED'}`, {
            ...auditData.details,
            userId: req.user?._id
        });

    } catch (error) {
        logger.error('Failed to log tenant status access event', {
            tenantStatus,
            allowed,
            error: error.message,
            tenantId: req.tenant?.id,
            userId: req.user?._id
        });
    }
};

/**
 * Get audit logs for insurance module
 */
export const getInsuranceAuditLogs = async (tenantId, options = {}) => {
    try {
        const {
            limit = 100,
            skip = 0,
            eventType,
            userId,
            startDate,
            endDate,
            severity
        } = options;

        const query = {
            'details.module': 'life-insurance',
            'details.tenantId': tenantId
        };

        if (eventType) {
            query.eventType = { $regex: eventType, $options: 'i' };
        }

        if (userId) {
            query.user = userId;
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        if (severity) {
            query.severity = severity;
        }

        const logs = await SecurityAudit.find(query)
            .populate('user', 'username email role')
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip);

        const total = await SecurityAudit.countDocuments(query);

        return {
            logs,
            total,
            limit,
            skip,
            hasMore: total > skip + limit
        };

    } catch (error) {
        logger.error('Failed to retrieve insurance audit logs', {
            tenantId,
            error: error.message
        });
        throw error;
    }
};

export default {
    logInsuranceAuthEvent,
    logInsuranceAuthorizationEvent,
    logInsuranceDataAccess,
    logPolicyOperation,
    logClaimOperation,
    logFamilyMemberOperation,
    logAccessDenied,
    logConfigurationChange,
    logTenantStatusAccess,
    getInsuranceAuditLogs
};