import express from 'express';
import {
    getAllLeaves,
    createLeave,
    getLeaveById,
    updateLeave,
    deleteLeave
} from '../controller/leave.controller.js';
import { protect, checkActive } from '../middleware/index.js';
import {
    populateDepartmentPosition,
    calculateDuration,
    setMedicalDocRequirement,
    reserveVacationBalance,
    initializeWorkflow
} from '../middleware/index.js';

const router = express.Router();

// Get all leaves - protected route
router.get('/', protect, getAllLeaves);

// Create leave - with validation middleware chain
router.post('/',
    protect,
    checkActive,
    calculateDuration,
    setMedicalDocRequirement,
    populateDepartmentPosition,
    reserveVacationBalance,
    initializeWorkflow,
    createLeave
);

// Get leave by ID
router.get('/:id', protect, getLeaveById);

// Update leave
router.put('/:id', protect, updateLeave);

// Delete leave
router.delete('/:id', protect, deleteLeave);

export default router;
