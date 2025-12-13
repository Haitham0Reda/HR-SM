import express from 'express';
import {
    getAllPositions,
    createPosition,
    getPositionById,
    updatePosition,
    deletePosition
} from '../controllers/position.controller.js';
import { requireAuth, requireRole } from '../../../../shared/middleware/auth.js';
import { ROLES } from '../../../../shared/constants/modules.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all positions - All authenticated users can view
router.get('/', getAllPositions);

// Create position - Admin/HR only
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR]), createPosition);

// Get position by ID - All authenticated users
router.get('/:id', getPositionById);

// Update position - Admin/HR only
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.HR]), updatePosition);

// Delete position - Admin only
router.delete('/:id', requireRole(ROLES.ADMIN), deletePosition);

export default router;
