import express from 'express';
import {
    getAllPermissionRequests,
    createPermissionRequest,
    getPermissionRequestById,
    updatePermissionRequest,
    deletePermissionRequest,
    approvePermissionRequest,
    rejectPermissionRequest
} from '../controllers/permissionRequest.controller.js';
import { requireAuth } from '../../../../shared/middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all permission requests - All authenticated users can view
router.get('/', getAllPermissionRequests);

// Create permission request
router.post('/', createPermissionRequest);

// Get single permission request
router.get('/:id', getPermissionRequestById);

// Update permission request
router.put('/:id', updatePermissionRequest);

// Delete permission request
router.delete('/:id', deletePermissionRequest);

// Approve permission request
router.post('/:id/approve', approvePermissionRequest);

// Reject permission request
router.post('/:id/reject', rejectPermissionRequest);

export default router;
