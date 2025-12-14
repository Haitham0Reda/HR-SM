import express from 'express';
import {
    getAllOvertime,
    createOvertime,
    getOvertimeById,
    updateOvertime,
    deleteOvertime
} from './controllers/overtimeController.js';
import {
    approveOvertime,
    rejectOvertime
} from './controllers/overtime.controller.js';
import { requireAuth } from '../../../shared/middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all overtime
router.get('/', getAllOvertime);

// Create overtime
router.post('/', createOvertime);

// Get overtime by ID
router.get('/:id', getOvertimeById);

// Update overtime
router.put('/:id', updateOvertime);

// Delete overtime
router.delete('/:id', deleteOvertime);

// Approve overtime
router.post('/:id/approve', approveOvertime);

// Reject overtime
router.post('/:id/reject', rejectOvertime);

export default router;