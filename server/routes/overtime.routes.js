import express from 'express';
import {
    getAllOvertime,
    createOvertime,
    getOvertimeById,
    updateOvertime,
    deleteOvertime,
    approveOvertime,
    rejectOvertime
} from '../controller/overtime.controller.js';
import { protect, checkActive } from '../middleware/index.js';

const router = express.Router();

// Get all overtime - protected route
router.get('/', protect, getAllOvertime);

// Create overtime - with authentication
router.post('/',
    protect,
    checkActive,
    createOvertime
);

// Approve overtime
router.post('/:id/approve', protect, approveOvertime);

// Reject overtime
router.post('/:id/reject', protect, rejectOvertime);

// Get overtime by ID
router.get('/:id', protect, getOvertimeById);

// Update overtime
router.put('/:id', protect, updateOvertime);

// Delete overtime
router.delete('/:id', protect, deleteOvertime);

export default router;
