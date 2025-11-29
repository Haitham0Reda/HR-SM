import express from 'express';
import {
    getAllSickLeaves,
    getPendingDoctorReview,
    createSickLeave,
    getSickLeaveById,
    updateSickLeave,
    deleteSickLeave,
    approveBySupervisor,
    approveByDoctor,
    rejectBySupervisor,
    rejectByDoctor
} from '../controller/sickLeave.controller.js';
import { protect, checkActive } from '../middleware/index.js';
import upload from '../config/multer.config.js';

const router = express.Router();

// Get all sick leaves - protected route
router.get('/', protect, getAllSickLeaves);

// Get sick leaves pending doctor review - doctor role only
router.get('/pending-doctor-review', protect, getPendingDoctorReview);

// Create sick leave - with authentication and file upload support for medical documents
router.post('/',
    protect,
    checkActive,
    upload.array('medicalDocuments', 5), // Allow up to 5 medical documents
    createSickLeave
);

// Approve sick leave by supervisor
router.post('/:id/approve-supervisor', protect, approveBySupervisor);

// Approve sick leave by doctor
router.post('/:id/approve-doctor', protect, approveByDoctor);

// Reject sick leave by supervisor
router.post('/:id/reject-supervisor', protect, rejectBySupervisor);

// Reject sick leave by doctor
router.post('/:id/reject-doctor', protect, rejectByDoctor);

// Get sick leave by ID
router.get('/:id', protect, getSickLeaveById);

// Update sick leave
router.put('/:id', protect, updateSickLeave);

// Delete sick leave
router.delete('/:id', protect, deleteSickLeave);

export default router;
