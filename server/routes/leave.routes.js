import express from 'express';
import {
    getAllLeaves,
    createLeave,
    getLeaveById,
    updateLeave,
    deleteLeave,
    approveLeave,
    rejectLeave,
    approveSickLeaveByDoctor,
    rejectSickLeaveByDoctor,
    getPendingDoctorReview
} from '../controller/leave.controller.js';
import { protect, checkActive } from '../middleware/index.js';
import {
    populateDepartmentPosition,
    calculateDuration,
    setMedicalDocRequirement,
    reserveVacationBalance,
    initializeWorkflow
} from '../middleware/index.js';
import { mapLeaveFields } from '../middleware/mapLeaveFields.js';
import upload from '../config/multer.config.js';

const router = express.Router();

// Get all leaves - protected route
router.get('/', protect, getAllLeaves);

// Get leaves pending doctor review (for doctors only)
router.get('/pending-doctor-review', protect, getPendingDoctorReview);

// Create leave - with validation middleware chain and file upload
router.post('/',
    protect,
    checkActive,
    upload.single('document'),
    mapLeaveFields,
    calculateDuration,
    setMedicalDocRequirement,
    populateDepartmentPosition,
    reserveVacationBalance,
    initializeWorkflow,
    createLeave
);

// Approve leave by supervisor/HR/admin
router.post('/:id/approve', protect, approveLeave);

// Reject leave by supervisor/HR/admin
router.post('/:id/reject', protect, rejectLeave);

// Approve sick leave by doctor
router.post('/:id/approve-doctor', protect, approveSickLeaveByDoctor);

// Reject sick leave by doctor
router.post('/:id/reject-doctor', protect, rejectSickLeaveByDoctor);

// Get leave by ID
router.get('/:id', protect, getLeaveById);

// Update leave
router.put('/:id', protect, updateLeave);

// Delete leave
router.delete('/:id', protect, deleteLeave);

export default router;
