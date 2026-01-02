import express from 'express';
import {
    getAllVacations,
    createVacation,
    getVacationById,
    updateVacation,
    deleteVacation,
    approveVacation,
    rejectVacation,
    cancelVacation
} from './controllers/vacation.controller.js';
// TODO: Import policy controllers when implemented
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { ROLES } from '../../../shared/constants/modules.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// ===== VACATION ROUTES =====

// Get all vacations - All authenticated users can view
router.get('/', getAllVacations);

// Create vacation - All authenticated users can create
router.post('/', createVacation);

// Approve vacation - HR/Admin only
router.post('/:id/approve', requireRole(ROLES.ADMIN, ROLES.HR), approveVacation);

// Reject vacation - HR/Admin only
router.post('/:id/reject', requireRole(ROLES.ADMIN, ROLES.HR), rejectVacation);

// Cancel vacation - All authenticated users can cancel their own
router.post('/:id/cancel', cancelVacation);

// Get vacation by ID - All authenticated users
router.get('/:id', getVacationById);

// Update vacation - All authenticated users can update their own
router.put('/:id', updateVacation);

// Delete vacation - All authenticated users can delete their own
router.delete('/:id', deleteVacation);

// ===== MIXED VACATION POLICY ROUTES =====
// TODO: Implement policy routes with proper middleware

export default router;