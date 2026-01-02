import express from 'express';
import {
    getAllForgetChecks,
    createForgetCheck,
    getForgetCheckById,
    updateForgetCheck,
    deleteForgetCheck,
    approveForgetCheck,
    rejectForgetCheck
} from '../controllers/forgetCheck.controller.js';
import { requireAuth, requireRole } from '../../../../shared/middleware/auth.js';
import { ROLES } from '../../../../shared/constants/modules.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all forget check requests - All authenticated users can view
router.get('/', getAllForgetChecks);

// Create forget check request - All authenticated users can create
router.post('/', createForgetCheck);

// Approve forget check request - HR/Admin only
router.post('/:id/approve', requireRole(ROLES.ADMIN, ROLES.HR), approveForgetCheck);

// Reject forget check request - HR/Admin only
router.post('/:id/reject', requireRole(ROLES.ADMIN, ROLES.HR), rejectForgetCheck);

// Get forget check by ID - All authenticated users
router.get('/:id', getForgetCheckById);

// Update forget check - All authenticated users can update their own
router.put('/:id', updateForgetCheck);

// Delete forget check - All authenticated users can delete their own
router.delete('/:id', deleteForgetCheck);

export default router;
