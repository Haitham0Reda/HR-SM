/**
 * Permission Management Controller
 * 
 * Handles user permission overrides and role management
 */
import User from '../../users/models/user.model.js';
import PermissionAudit from '../../../../platform/system/models/permissionAudit.model.js';
import { PERMISSIONS, ROLE_PERMISSIONS, PERMISSION_CATEGORIES, getRolePermissions } from '../../../../platform/system/models/permission.system.js';

/**
 * Get all available permissions
 */
export const getAllPermissions = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            permissions: PERMISSIONS,
            categories: PERMISSION_CATEGORIES
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get role permissions
 */
export const getRolePermissionsList = async (req, res) => {
    try {
        const { role } = req.params;

        if (!ROLE_PERMISSIONS[role]) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.status(200).json({
            success: true,
            role,
            permissions: getRolePermissions(role)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get user's effective permissions
 */
export const getUserPermissions = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const effectivePermissions = await user.getEffectivePermissions();
        const rolePermissions = getRolePermissions(user.role);

        res.status(200).json({
            success: true,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role
            },
            permissions: {
                role: rolePermissions,
                added: user.addedPermissions || [],
                removed: user.removedPermissions || [],
                effective: effectivePermissions
            },
            metadata: {
                permissionNotes: user.permissionNotes,
                permissionLastModified: user.permissionLastModified,
                permissionModifiedBy: user.permissionModifiedBy
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Add permissions to user
 */
export const addPermissionsToUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions, reason } = req.body;

        if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
            return res.status(400).json({ error: 'Permissions array is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add new permissions (avoid duplicates)
        const currentAdded = new Set(user.addedPermissions || []);
        permissions.forEach(p => currentAdded.add(p));
        user.addedPermissions = Array.from(currentAdded);

        // Remove from removed permissions if exists
        user.removedPermissions = (user.removedPermissions || []).filter(
            p => !permissions.includes(p)
        );

        user.permissionLastModified = new Date();
        user.permissionModifiedBy = req.user._id;
        if (reason) user.permissionNotes = reason;

        await user.save();

        // Log audit trail
        await PermissionAudit.logChange({
            user: userId,
            modifiedBy: req.user._id,
            action: 'permission-added',
            changes: {
                permissionsAdded: permissions
            },
            reason,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: 'Permissions added successfully',
            user: {
                id: user._id,
                username: user.username,
                addedPermissions: user.addedPermissions,
                removedPermissions: user.removedPermissions
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Remove permissions from user
 */
export const removePermissionsFromUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions, reason } = req.body;

        if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
            return res.status(400).json({ error: 'Permissions array is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add to removed permissions (avoid duplicates)
        const currentRemoved = new Set(user.removedPermissions || []);
        permissions.forEach(p => currentRemoved.add(p));
        user.removedPermissions = Array.from(currentRemoved);

        // Remove from added permissions if exists
        user.addedPermissions = (user.addedPermissions || []).filter(
            p => !permissions.includes(p)
        );

        user.permissionLastModified = new Date();
        user.permissionModifiedBy = req.user._id;
        if (reason) user.permissionNotes = reason;

        await user.save();

        // Log audit trail
        await PermissionAudit.logChange({
            user: userId,
            modifiedBy: req.user._id,
            action: 'permission-removed',
            changes: {
                permissionsRemoved: permissions
            },
            reason,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: 'Permissions removed successfully',
            user: {
                id: user._id,
                username: user.username,
                addedPermissions: user.addedPermissions,
                removedPermissions: user.removedPermissions
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Reset user permissions to role defaults
 */
export const resetUserPermissions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const previousAdded = user.addedPermissions || [];
        const previousRemoved = user.removedPermissions || [];

        user.addedPermissions = [];
        user.removedPermissions = [];
        user.permissionLastModified = new Date();
        user.permissionModifiedBy = req.user._id;
        if (reason) user.permissionNotes = reason;

        await user.save();

        // Log audit trail
        await PermissionAudit.logChange({
            user: userId,
            modifiedBy: req.user._id,
            action: 'permission-reset',
            changes: {
                addedPermissions: previousAdded,
                removedPermissions: previousRemoved
            },
            reason,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: 'Permissions reset to role defaults',
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Change user role
 */
export const changeUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, reason } = req.body;

        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const previousRole = user.role;
        user.role = role;
        user.permissionLastModified = new Date();
        user.permissionModifiedBy = req.user._id;

        await user.save();

        // Log audit trail
        await PermissionAudit.logChange({
            user: userId,
            modifiedBy: req.user._id,
            action: 'role-change',
            changes: {
                previousRole,
                newRole: role
            },
            reason,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            user: {
                id: user._id,
                username: user.username,
                previousRole,
                newRole: role
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Get permission audit log
 */
export const getPermissionAuditLog = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const auditLog = await PermissionAudit.getUserAuditTrail(userId, {
            limit: parseInt(limit),
            skip: parseInt(skip)
        });

        const total = await PermissionAudit.countDocuments({ user: userId });

        res.status(200).json({
            success: true,
            auditLog,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get recent permission changes (admin only)
 */
export const getRecentPermissionChanges = async (req, res) => {
    try {
        const { days = 30, limit = 100 } = req.query;

        const recentChanges = await PermissionAudit.getRecentChanges(
            parseInt(days),
            { limit: parseInt(limit) }
        );

        res.status(200).json({
            success: true,
            changes: recentChanges,
            period: `Last ${days} days`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
