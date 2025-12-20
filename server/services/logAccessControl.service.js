/**
 * Log Access Control Service
 * 
 * Implements user authorization for log access with company-specific restrictions
 * and role-based log viewing permissions
 * 
 * Requirements: 3.2 - Log access authorization system
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// User roles and their log access permissions
const ROLE_PERMISSIONS = {
    'super_admin': {
        canAccessAllCompanies: true,
        canAccessPlatformLogs: true,
        canAccessAuditLogs: true,
        canAccessSecurityLogs: true,
        canAccessErrorLogs: true,
        canAccessPerformanceLogs: true,
        canExportLogs: true,
        canDeleteLogs: true
    },
    'platform_admin': {
        canAccessAllCompanies: false,
        canAccessPlatformLogs: true,
        canAccessAuditLogs: true,
        canAccessSecurityLogs: true,
        canAccessErrorLogs: true,
        canAccessPerformanceLogs: true,
        canExportLogs: true,
        canDeleteLogs: false
    },
    'company_admin': {
        canAccessAllCompanies: false,
        canAccessPlatformLogs: false,
        canAccessAuditLogs: true,
        canAccessSecurityLogs: true,
        canAccessErrorLogs: true,
        canAccessPerformanceLogs: true,
        canExportLogs: true,
        canDeleteLogs: false
    },
    'hr_manager': {
        canAccessAllCompanies: false,
        canAccessPlatformLogs: false,
        canAccessAuditLogs: true,
        canAccessSecurityLogs: false,
        canAccessErrorLogs: false,
        canAccessPerformanceLogs: false,
        canExportLogs: true,
        canDeleteLogs: false
    },
    'employee': {
        canAccessAllCompanies: false,
        canAccessPlatformLogs: false,
        canAccessAuditLogs: false,
        canAccessSecurityLogs: false,
        canAccessErrorLogs: false,
        canAccessPerformanceLogs: false,
        canExportLogs: false,
        canDeleteLogs: false
    }
};

// Log types and their sensitivity levels
const LOG_TYPES = {
    'audit': { sensitivity: 'high', requiresSpecialPermission: true },
    'security': { sensitivity: 'high', requiresSpecialPermission: true },
    'error': { sensitivity: 'medium', requiresSpecialPermission: false },
    'performance': { sensitivity: 'low', requiresSpecialPermission: false },
    'general': { sensitivity: 'low', requiresSpecialPermission: false },
    'platform': { sensitivity: 'critical', requiresSpecialPermission: true }
};

/**
 * User Access Context
 * Represents a user's access permissions and context
 */
class UserAccessContext {
    constructor(userId, userRole, tenantId, companyId, additionalPermissions = {}) {
        this.userId = userId;
        this.userRole = userRole;
        this.tenantId = tenantId;
        this.companyId = companyId;
        this.permissions = { ...ROLE_PERMISSIONS[userRole] || {}, ...additionalPermissions };
        this.accessTime = new Date().toISOString();
    }

    /**
     * Check if user can access logs for a specific company
     */
    canAccessCompany(targetCompanyId) {
        if (this.permissions.canAccessAllCompanies) {
            return true;
        }
        return this.companyId === targetCompanyId;
    }

    /**
     * Check if user can access a specific log type
     */
    canAccessLogType(logType) {
        const typeInfo = LOG_TYPES[logType] || LOG_TYPES['general'];
        
        switch (logType) {
            case 'audit':
                return this.permissions.canAccessAuditLogs;
            case 'security':
                return this.permissions.canAccessSecurityLogs;
            case 'error':
                return this.permissions.canAccessErrorLogs;
            case 'performance':
                return this.permissions.canAccessPerformanceLogs;
            case 'platform':
                return this.permissions.canAccessPlatformLogs;
            default:
                return true; // General logs accessible to all authenticated users
        }
    }

    /**
     * Check if user can perform a specific action
     */
    canPerformAction(action) {
        switch (action) {
            case 'export':
                return this.permissions.canExportLogs;
            case 'delete':
                return this.permissions.canDeleteLogs;
            case 'read':
                return true; // All authenticated users can read logs they have access to
            default:
                return false;
        }
    }
}

/**
 * Access Control Decision
 * Represents the result of an access control check
 */
class AccessControlDecision {
    constructor(allowed, reason, restrictions = {}) {
        this.allowed = allowed;
        this.reason = reason;
        this.restrictions = restrictions;
        this.timestamp = new Date().toISOString();
    }

    static allow(reason = 'Access granted', restrictions = {}) {
        return new AccessControlDecision(true, reason, restrictions);
    }

    static deny(reason = 'Access denied') {
        return new AccessControlDecision(false, reason);
    }
}

/**
 * Log Access Control Engine
 * Main service for managing log access permissions
 */
class LogAccessControlEngine {
    constructor() {
        this.accessAuditLog = [];
        this.maxAuditEntries = 10000;
    }

    /**
     * Create user access context from request
     */
    createUserContext(req) {
        const userId = req.user?.id;
        const userRole = req.user?.role || 'employee';
        const tenantId = req.tenant?.tenantId || req.tenantId;
        const companyId = req.tenant?.id || req.companyId;

        if (!userId || !tenantId) {
            throw new Error('Invalid user context: missing userId or tenantId');
        }

        return new UserAccessContext(userId, userRole, tenantId, companyId);
    }

    /**
     * Check if user can access logs for a specific company
     */
    checkCompanyAccess(userContext, targetCompanyId, logType = 'general') {
        try {
            // Check company access
            if (!userContext.canAccessCompany(targetCompanyId)) {
                const decision = AccessControlDecision.deny(
                    `User ${userContext.userId} cannot access logs for company ${targetCompanyId}`
                );
                this.auditAccess(userContext, 'company_access_denied', { targetCompanyId, logType });
                return decision;
            }

            // Check log type access
            if (!userContext.canAccessLogType(logType)) {
                const decision = AccessControlDecision.deny(
                    `User ${userContext.userId} cannot access ${logType} logs`
                );
                this.auditAccess(userContext, 'log_type_access_denied', { targetCompanyId, logType });
                return decision;
            }

            // Apply restrictions based on role and log type
            const restrictions = this.calculateRestrictions(userContext, logType);
            
            const decision = AccessControlDecision.allow(
                `Access granted for ${logType} logs in company ${targetCompanyId}`,
                restrictions
            );
            
            this.auditAccess(userContext, 'access_granted', { targetCompanyId, logType, restrictions });
            return decision;

        } catch (error) {
            const decision = AccessControlDecision.deny(`Access check failed: ${error.message}`);
            this.auditAccess(userContext, 'access_check_error', { error: error.message });
            return decision;
        }
    }

    /**
     * Check if user can perform a specific action on logs
     */
    checkActionPermission(userContext, action, targetCompanyId, logType = 'general') {
        try {
            // First check basic access
            const accessDecision = this.checkCompanyAccess(userContext, targetCompanyId, logType);
            if (!accessDecision.allowed) {
                return accessDecision;
            }

            // Check action permission
            if (!userContext.canPerformAction(action)) {
                const decision = AccessControlDecision.deny(
                    `User ${userContext.userId} cannot perform ${action} action`
                );
                this.auditAccess(userContext, 'action_denied', { action, targetCompanyId, logType });
                return decision;
            }

            const decision = AccessControlDecision.allow(
                `Action ${action} granted for ${logType} logs in company ${targetCompanyId}`
            );
            
            this.auditAccess(userContext, 'action_granted', { action, targetCompanyId, logType });
            return decision;

        } catch (error) {
            const decision = AccessControlDecision.deny(`Action check failed: ${error.message}`);
            this.auditAccess(userContext, 'action_check_error', { error: error.message });
            return decision;
        }
    }

    /**
     * Get list of companies user can access
     */
    getAccessibleCompanies(userContext) {
        try {
            if (userContext.permissions.canAccessAllCompanies) {
                // Super admin can access all companies - return special indicator
                return { all: true, companies: [] };
            }

            // Regular users can only access their own company
            return { 
                all: false, 
                companies: [userContext.companyId].filter(Boolean) 
            };

        } catch (error) {
            this.auditAccess(userContext, 'company_list_error', { error: error.message });
            return { all: false, companies: [] };
        }
    }

    /**
     * Get list of log types user can access
     */
    getAccessibleLogTypes(userContext) {
        const accessibleTypes = [];

        for (const [logType, typeInfo] of Object.entries(LOG_TYPES)) {
            if (userContext.canAccessLogType(logType)) {
                accessibleTypes.push({
                    type: logType,
                    sensitivity: typeInfo.sensitivity,
                    requiresSpecialPermission: typeInfo.requiresSpecialPermission
                });
            }
        }

        return accessibleTypes;
    }

    /**
     * Calculate access restrictions based on user role and log type
     */
    calculateRestrictions(userContext, logType) {
        const restrictions = {};

        // Time-based restrictions for sensitive logs
        if (LOG_TYPES[logType]?.sensitivity === 'high' && userContext.userRole !== 'super_admin') {
            restrictions.maxTimeRange = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        // Result size restrictions
        if (userContext.userRole === 'employee') {
            restrictions.maxResults = 100;
        } else if (userContext.userRole === 'hr_manager') {
            restrictions.maxResults = 1000;
        } else {
            restrictions.maxResults = 10000;
        }

        // Field filtering for sensitive data
        if (logType === 'audit' && !userContext.permissions.canAccessAllCompanies) {
            restrictions.excludeFields = ['ip', 'userAgent', 'sessionId'];
        }

        return restrictions;
    }

    /**
     * Validate log file path for security
     */
    validateLogPath(filePath, userContext, targetCompanyId) {
        try {
            if (!filePath || !userContext || !targetCompanyId) {
                return AccessControlDecision.deny('File path, user context, and company ID are required');
            }

            // Normalize path to prevent directory traversal
            const normalizedPath = path.normalize(filePath);
            
            // Check for directory traversal attempts
            if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
                return AccessControlDecision.deny('Invalid file path: directory traversal detected');
            }

            // For relative paths starting with ../logs/, validate tenant isolation
            if (normalizedPath.startsWith('../logs/') || normalizedPath.startsWith('logs/')) {
                // Extract the path after logs/
                const logsIndex = normalizedPath.indexOf('logs/');
                const pathAfterLogs = normalizedPath.substring(logsIndex + 5); // 5 = 'logs/'.length
                
                // Check if user can access all companies or if path matches their company
                if (!userContext.permissions.canAccessAllCompanies) {
                    if (!pathAfterLogs.startsWith(targetCompanyId + '/') && pathAfterLogs !== targetCompanyId) {
                        return AccessControlDecision.deny('Invalid file path: cross-company access denied');
                    }
                }
                
                return AccessControlDecision.allow('File path validated');
            }

            // For absolute paths, resolve and check
            const resolvedPath = path.resolve(normalizedPath);
            
            // Check both server/logs and root logs directories
            const serverLogsDir = path.resolve(__dirname, '../logs');
            const rootLogsDir = path.resolve(process.cwd(), 'logs');
            
            if (!resolvedPath.startsWith(serverLogsDir) && !resolvedPath.startsWith(rootLogsDir)) {
                return AccessControlDecision.deny('Invalid file path: outside logs directory');
            }
            
            // Use the appropriate logs directory
            const logsDir = resolvedPath.startsWith(serverLogsDir) ? serverLogsDir : rootLogsDir;

            // Check if path contains company-specific directory
            if (!userContext.permissions.canAccessAllCompanies) {
                const companyPath = path.join(logsDir, targetCompanyId);
                if (!resolvedPath.startsWith(companyPath)) {
                    return AccessControlDecision.deny('Invalid file path: cross-company access denied');
                }
            }

            return AccessControlDecision.allow('File path validated');

        } catch (error) {
            return AccessControlDecision.deny(`Path validation failed: ${error.message}`);
        }
    }

    /**
     * Audit access attempts
     */
    auditAccess(userContext, eventType, details = {}) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            userId: userContext.userId,
            userRole: userContext.userRole,
            tenantId: userContext.tenantId,
            companyId: userContext.companyId,
            eventType,
            details
        };

        this.accessAuditLog.push(auditEntry);

        // Trim audit log if it gets too large
        if (this.accessAuditLog.length > this.maxAuditEntries) {
            this.accessAuditLog = this.accessAuditLog.slice(-this.maxAuditEntries);
        }
    }

    /**
     * Get access audit log (for super admins only)
     */
    getAccessAuditLog(userContext, filters = {}) {
        if (!userContext.permissions.canAccessAllCompanies) {
            throw new Error('Insufficient permissions to access audit log');
        }

        let filteredLog = [...this.accessAuditLog];

        // Apply filters
        if (filters.userId) {
            filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
        }
        if (filters.eventType) {
            filteredLog = filteredLog.filter(entry => entry.eventType === filters.eventType);
        }
        if (filters.startTime) {
            filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.startTime);
        }
        if (filters.endTime) {
            filteredLog = filteredLog.filter(entry => entry.timestamp <= filters.endTime);
        }

        return filteredLog;
    }

    /**
     * Clear access audit log (for maintenance)
     */
    clearAccessAuditLog(userContext) {
        if (!userContext.permissions.canAccessAllCompanies) {
            throw new Error('Insufficient permissions to clear audit log');
        }

        const clearedCount = this.accessAuditLog.length;
        this.accessAuditLog = [];
        
        this.auditAccess(userContext, 'audit_log_cleared', { clearedCount });
        return clearedCount;
    }
}

// Create singleton instance
const logAccessControl = new LogAccessControlEngine();

// Export classes and singleton
export {
    UserAccessContext,
    AccessControlDecision,
    LogAccessControlEngine,
    ROLE_PERMISSIONS,
    LOG_TYPES
};

export default logAccessControl;