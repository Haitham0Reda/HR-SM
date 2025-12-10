import express from 'express';
import {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getRoleStats,
    syncSystemRoles,
    getAllPermissions,
    getRoleAuditLogs,
    getRoleAuditHistory,
    getRoleAuditStats,
    getRoleUserCount
} from '../controller/role.controller.js';
import { protect, admin } from '../middleware/index.js';

const router = express.Router();

// Get all roles - Admin only with query parameter support
router.get('/', protect, admin, getAllRoles);

// Get role statistics - Admin only
router.get('/stats', protect, admin, getRoleStats);

// Get all available permissions - Admin only
router.get('/permissions', protect, admin, getAllPermissions);

// Get role audit logs - Admin only
router.get('/audit/logs', protect, admin, getRoleAuditLogs);

// Get role audit statistics - Admin only
router.get('/audit/stats', protect, admin, getRoleAuditStats);

// Sync system roles - Admin only
router.post('/sync', protect, admin, syncSystemRoles);

// Get role by ID - Admin only
router.get('/:id', protect, admin, getRoleById);

// Get user count for a specific role - Admin only
router.get('/:id/users/count', protect, admin, getRoleUserCount);

// Get audit history for a specific role - Admin only
router.get('/:id/audit', protect, admin, getRoleAuditHistory);

// Create role - Admin only with validation
router.post('/', protect, admin, createRole);

// Update role - Admin only with validation
router.put('/:id', protect, admin, updateRole);

// Delete role - Admin only
router.delete('/:id', protect, admin, deleteRole);

export default router;
