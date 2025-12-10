import express from 'express';
import {
    getAllPermissions,
    getRolePermissionsList,
    getUserPermissions,
    addPermissionsToUser,
    removePermissionsFromUser,
    resetUserPermissions,
    changeUserRole,
    getPermissionAuditLog,
    getRecentPermissionChanges
} from '../controller/permission.controller.js';
import {
    protect,
    admin,
    canManagePermissions,
    canManageRoles,
    canViewAudit
} from '../middleware/index.js';

const router = express.Router();

// Get all available permissions - Admin only
router.get('/all', protect, admin, getAllPermissions);

// Get role permissions - Admin and HR
router.get('/role/:role', protect, getRolePermissionsList);

// Get user's permissions - Admin, HR, or self
router.get('/user/:userId', protect, getUserPermissions);

// Add permissions to user - Requires permission management access
router.post('/user/:userId/add',
    protect,
    canManagePermissions,
    addPermissionsToUser
);

// Remove permissions from user - Requires permission management access
router.post('/user/:userId/remove',
    protect,
    canManagePermissions,
    removePermissionsFromUser
);

// Reset user permissions - Requires permission management access
router.post('/user/:userId/reset',
    protect,
    canManagePermissions,
    resetUserPermissions
);

// Change user role - Requires role management access
router.put('/user/:userId/role',
    protect,
    canManageRoles,
    changeUserRole
);

// Get user's permission audit log - Requires audit access
router.get('/audit/:userId',
    protect,
    canViewAudit,
    getPermissionAuditLog
);

// Get recent permission changes - Admin only
router.get('/audit/recent',
    protect,
    admin,
    getRecentPermissionChanges
);

export default router;
