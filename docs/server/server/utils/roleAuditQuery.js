/**
 * Role Audit Query Utility
 * 
 * Provides functions to query and retrieve role audit logs
 */
import SecurityAudit from '../platform/system/models/securityAudit.model.js';

/**
 * Get all role-related audit logs
 */
export const getRoleAuditLogs = async (options = {}) => {
    const {
        limit = 100,
        skip = 0,
        startDate,
        endDate,
        eventType,
        userId,
        roleId,
        roleName
    } = options;

    const query = {
        eventType: {
            $in: ['role-created', 'role-updated', 'role-deleted', 'role-viewed', 'roles-synced']
        }
    };

    // Filter by date range
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Filter by specific event type
    if (eventType) {
        query.eventType = eventType;
    }

    // Filter by user who performed the action
    if (userId) {
        query.user = userId;
    }

    // Filter by role ID
    if (roleId) {
        query['details.roleId'] = roleId;
    }

    // Filter by role name
    if (roleName) {
        query['details.roleName'] = roleName;
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
};

/**
 * Get audit logs for a specific role
 */
export const getRoleAuditHistory = async (roleId, options = {}) => {
    const { limit = 50, skip = 0 } = options;

    const logs = await SecurityAudit.find({
        eventType: {
            $in: ['role-created', 'role-updated', 'role-deleted', 'role-viewed']
        },
        'details.roleId': roleId
    })
        .populate('user', 'username email role')
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);

    return logs;
};

/**
 * Get role audit statistics
 */
export const getRoleAuditStats = async (days = 30) => {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const stats = await SecurityAudit.aggregate([
        {
            $match: {
                eventType: {
                    $in: ['role-created', 'role-updated', 'role-deleted', 'roles-synced']
                },
                timestamp: { $gte: dateThreshold }
            }
        },
        {
            $group: {
                _id: '$eventType',
                count: { $sum: 1 },
                failures: {
                    $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
                }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    // Get most active users
    const activeUsers = await SecurityAudit.aggregate([
        {
            $match: {
                eventType: {
                    $in: ['role-created', 'role-updated', 'role-deleted']
                },
                timestamp: { $gte: dateThreshold }
            }
        },
        {
            $group: {
                _id: '$user',
                username: { $first: '$username' },
                actionCount: { $sum: 1 }
            }
        },
        {
            $sort: { actionCount: -1 }
        },
        {
            $limit: 10
        }
    ]);

    // Get most modified roles
    const modifiedRoles = await SecurityAudit.aggregate([
        {
            $match: {
                eventType: {
                    $in: ['role-updated', 'role-deleted']
                },
                timestamp: { $gte: dateThreshold }
            }
        },
        {
            $group: {
                _id: '$details.roleId',
                roleName: { $first: '$details.roleName' },
                modificationCount: { $sum: 1 }
            }
        },
        {
            $sort: { modificationCount: -1 }
        },
        {
            $limit: 10
        }
    ]);

    return {
        eventStats: stats,
        activeUsers,
        modifiedRoles,
        period: `Last ${days} days`
    };
};

/**
 * Get recent role changes
 */
export const getRecentRoleChanges = async (limit = 20) => {
    const logs = await SecurityAudit.find({
        eventType: {
            $in: ['role-created', 'role-updated', 'role-deleted']
        }
    })
        .populate('user', 'username email role')
        .sort({ timestamp: -1 })
        .limit(limit);

    return logs;
};

/**
 * Get permission change history across all roles
 */
export const getPermissionChangeHistory = async (options = {}) => {
    const { limit = 50, skip = 0, startDate, endDate } = options;

    const query = {
        eventType: 'role-updated',
        'details.changes.permissions': { $exists: true }
    };

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await SecurityAudit.find(query)
        .populate('user', 'username email role')
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);

    return logs;
};

/**
 * Check if a role has been modified recently
 */
export const hasRecentModifications = async (roleId, minutes = 5) => {
    const dateThreshold = new Date();
    dateThreshold.setMinutes(dateThreshold.getMinutes() - minutes);

    const count = await SecurityAudit.countDocuments({
        eventType: { $in: ['role-updated', 'role-deleted'] },
        'details.roleId': roleId,
        timestamp: { $gte: dateThreshold }
    });

    return count > 0;
};

export default {
    getRoleAuditLogs,
    getRoleAuditHistory,
    getRoleAuditStats,
    getRecentRoleChanges,
    getPermissionChangeHistory,
    hasRecentModifications
};
