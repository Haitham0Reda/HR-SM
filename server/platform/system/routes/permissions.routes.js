import express from 'express';
import {
    getAllPermissions,
    createPermission,
    getPermissionById,
    updatePermission,
    deletePermission,
    approvePermission,
    rejectPermission
} from '../controller/permissions.controller.js';
import { protect, checkActive } from '../middleware/index.js';

const router = express.Router();

// Get all permissions - protected route
router.get('/', protect, getAllPermissions);

// Create permission - with authentication
router.post('/',
    protect,
    checkActive,
    createPermission
);

// Approve permission
router.post('/:id/approve', protect, approvePermission);

// Reject permission
router.post('/:id/reject', protect, rejectPermission);

// Get permission by ID
router.get('/:id', protect, getPermissionById);

// Update permission
router.put('/:id', protect, updatePermission);

// Delete permission
router.delete('/:id', protect, deletePermission);

export default router;
