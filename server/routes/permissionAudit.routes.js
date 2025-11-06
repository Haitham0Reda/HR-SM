import express from 'express';
import {
    getAllPermissionAudits,
    getPermissionAuditById,
    getUserPermissionAuditTrail,
    getRecentPermissionChanges,
    getPermissionChangesByAction,
    getPermissionChangesByUser,
    getPermissionChangesByModifier,
    exportPermissionAuditLogs,
    cleanupOldPermissionAudits
} from '../controller/permissionAudit.controller.js';
import {
    protect,
    admin,
    hrOrAdmin,
    canViewAudit
} from '../middleware/index.js';

const router = express.Router();

// Get all permission audits - Admin only
router.get('/',
    protect,
    admin,
    canViewAudit,
    getAllPermissionAudits
);

// Get permission audit by ID - Admin only
router.get('/:id',
    protect,
    admin,
    canViewAudit,
    getPermissionAuditById
);

// Get user's permission audit trail - Admin or HR
router.get('/user/:userId/trail',
    protect,
    hrOrAdmin,
    canViewAudit,
    getUserPermissionAuditTrail
);

// Get recent permission changes - Admin only
router.get('/recent',
    protect,
    admin,
    canViewAudit,
    getRecentPermissionChanges
);

// Get permission changes by action type - Admin only
router.get('/action/:action',
    protect,
    admin,
    canViewAudit,
    getPermissionChangesByAction
);

// Get permission changes for a specific user - Admin only
router.get('/user/:userId/changes',
    protect,
    admin,
    canViewAudit,
    getPermissionChangesByUser
);

// Get permission changes made by a specific modifier - Admin only
router.get('/modifier/:modifierId/changes',
    protect,
    admin,
    canViewAudit,
    getPermissionChangesByModifier
);

// Export permission audit logs - Admin only
router.get('/export/logs',
    protect,
    admin,
    canViewAudit,
    exportPermissionAuditLogs
);

// Cleanup old permission audits - Admin only
router.post('/cleanup',
    protect,
    admin,
    cleanupOldPermissionAudits
);

export default router;