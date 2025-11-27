/**
 * Role Audit Logger Utility
 * 
 * Provides specialized audit logging functions for role management operations
 */
import SecurityAudit from '../models/securityAudit.model.js';
import logger from './logger.js';

/**
 * Extract request metadata for audit logging
 */
const getRequestMetadata = (req) => ({
    ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    requestUrl: req.originalUrl || req.url,
    requestMethod: req.method
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
 * Log role creation event
 */
export const logRoleCreation = async (role, user, req) => {
    try {
        const auditData = {
            eventType: 'role-created',
            ...getUserMetadata(user),
            ...getRequestMetadata(req),
            details: {
                roleId: role._id,
                roleName: role.name,
                displayName: role.displayName,
                description: role.description,
                permissions: role.permissions,
                permissionCount: role.permissions?.length || 0,
                isSystemRole: role.isSystemRole
            },
            severity: 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);
        
        logger.info('Role created - audit logged', {
            roleId: role._id,
            roleName: role.name,
            userId: user?._id
        });
    } catch (error) {
        logger.error('Failed to log role creation audit:', error);
    }
};

/**
 * Log role update event
 */
export const logRoleUpdate = async (role, oldValues, newValues, user, req) => {
    try {
        // Calculate what changed
        const changes = {};
        
        if (oldValues.displayName !== newValues.displayName) {
            changes.displayName = {
                old: oldValues.displayName,
                new: newValues.displayName
            };
        }
        
        if (oldValues.description !== newValues.description) {
            changes.description = {
                old: oldValues.description,
                new: newValues.description
            };
        }
        
        // Check permission changes
        const oldPerms = new Set(oldValues.permissions);
        const newPerms = new Set(newValues.permissions);
        
        const addedPermissions = [...newPerms].filter(p => !oldPerms.has(p));
        const removedPermissions = [...oldPerms].filter(p => !newPerms.has(p));
        
        if (addedPermissions.length > 0 || removedPermissions.length > 0) {
            changes.permissions = {
                added: addedPermissions,
                removed: removedPermissions,
                oldCount: oldValues.permissions.length,
                newCount: newValues.permissions.length
            };
        }

        const auditData = {
            eventType: 'role-updated',
            ...getUserMetadata(user),
            ...getRequestMetadata(req),
            details: {
                roleId: role._id,
                roleName: role.name,
                displayName: role.displayName,
                isSystemRole: role.isSystemRole,
                changes,
                oldValues: {
                    displayName: oldValues.displayName,
                    description: oldValues.description,
                    permissionCount: oldValues.permissions.length
                },
                newValues: {
                    displayName: newValues.displayName,
                    description: newValues.description,
                    permissionCount: newValues.permissions.length
                }
            },
            severity: 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);
        
        logger.info('Role updated - audit logged', {
            roleId: role._id,
            roleName: role.name,
            userId: user?._id,
            changesCount: Object.keys(changes).length
        });
    } catch (error) {
        logger.error('Failed to log role update audit:', error);
    }
};

/**
 * Log role deletion event
 */
export const logRoleDeletion = async (roleData, user, req) => {
    try {
        const auditData = {
            eventType: 'role-deleted',
            ...getUserMetadata(user),
            ...getRequestMetadata(req),
            details: {
                roleId: roleData._id || roleData.id,
                roleName: roleData.name,
                displayName: roleData.displayName,
                description: roleData.description,
                permissions: roleData.permissions,
                permissionCount: roleData.permissions?.length || 0,
                isSystemRole: roleData.isSystemRole
            },
            severity: 'warning',
            success: true
        };

        await SecurityAudit.logEvent(auditData);
        
        logger.info('Role deleted - audit logged', {
            roleName: roleData.name,
            userId: user?._id
        });
    } catch (error) {
        logger.error('Failed to log role deletion audit:', error);
    }
};

/**
 * Log role view event (optional - for sensitive roles)
 */
export const logRoleView = async (role, user, req) => {
    try {
        // Only log views for system roles or roles with many permissions
        if (!role.isSystemRole && role.permissions.length < 10) {
            return; // Skip logging for simple custom roles
        }

        const auditData = {
            eventType: 'role-viewed',
            ...getUserMetadata(user),
            ...getRequestMetadata(req),
            details: {
                roleId: role._id,
                roleName: role.name,
                displayName: role.displayName,
                isSystemRole: role.isSystemRole,
                permissionCount: role.permissions?.length || 0
            },
            severity: 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);
    } catch (error) {
        logger.error('Failed to log role view audit:', error);
    }
};

/**
 * Log system roles sync event
 */
export const logRolesSync = async (syncResults, user, req) => {
    try {
        const auditData = {
            eventType: 'roles-synced',
            ...getUserMetadata(user),
            ...getRequestMetadata(req),
            details: {
                created: syncResults.created,
                updated: syncResults.updated,
                total: syncResults.created + syncResults.updated,
                timestamp: new Date()
            },
            severity: 'info',
            success: true
        };

        await SecurityAudit.logEvent(auditData);
        
        logger.info('System roles synced - audit logged', {
            created: syncResults.created,
            updated: syncResults.updated,
            userId: user?._id
        });
    } catch (error) {
        logger.error('Failed to log roles sync audit:', error);
    }
};

/**
 * Log failed role operation
 */
export const logRoleOperationFailure = async (operation, error, user, req, additionalDetails = {}) => {
    try {
        const auditData = {
            eventType: `role-${operation}`,
            ...getUserMetadata(user),
            ...getRequestMetadata(req),
            details: {
                operation,
                error: error.message,
                ...additionalDetails
            },
            severity: 'warning',
            success: false,
            errorMessage: error.message
        };

        await SecurityAudit.logEvent(auditData);
        
        logger.warn('Role operation failed - audit logged', {
            operation,
            error: error.message,
            userId: user?._id
        });
    } catch (auditError) {
        logger.error('Failed to log role operation failure:', auditError);
    }
};

export default {
    logRoleCreation,
    logRoleUpdate,
    logRoleDeletion,
    logRoleView,
    logRolesSync,
    logRoleOperationFailure
};
