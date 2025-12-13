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
} from '../controllers/role.controller.js';
import { requireAuth, requireRole } from '../../../../shared/middleware/auth.js';
import { ROLES } from '../../../../shared/constants/modules.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all roles - Admin only with query parameter support
router.get('/', requireRole(ROLES.ADMIN), getAllRoles);

// Get role statistics - Admin only
router.get('/stats', requireRole(ROLES.ADMIN), getRoleStats);

// Get all available permissions - Admin only
router.get('/permissions', requireRole(ROLES.ADMIN), getAllPermissions);

// Get role audit logs - Admin only
router.get('/audit/logs', requireRole(ROLES.ADMIN), getRoleAuditLogs);

// Get role audit statistics - Admin only
router.get('/audit/stats', requireRole(ROLES.ADMIN), getRoleAuditStats);

// Sync system roles - Admin only
router.post('/sync', requireRole(ROLES.ADMIN), syncSystemRoles);

// Get role by ID - Admin only
router.get('/:id', requireRole(ROLES.ADMIN), getRoleById);

// Get user count for a specific role - Admin only
router.get('/:id/users/count', requireRole(ROLES.ADMIN), getRoleUserCount);

// Get audit history for a specific role - Admin only
router.get('/:id/audit', requireRole(ROLES.ADMIN), getRoleAuditHistory);

// Create role - Admin only with validation
router.post('/', requireRole(ROLES.ADMIN), createRole);

// Update role - Admin only with validation
router.put('/:id', requireRole(ROLES.ADMIN), updateRole);

// Delete role - Admin only
router.delete('/:id', requireRole(ROLES.ADMIN), deleteRole);

export default router;
