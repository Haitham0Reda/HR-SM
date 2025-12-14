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
} from '../controllers/sickLeave.controller.js';
import { requireAuth, requireRole } from '../../../../shared/middleware/auth.js';
import { ROLES } from '../../../../shared/constants/modules.js';
import upload from '../../../../config/multer.config.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all sick leaves - All authenticated users can view
router.get('/', getAllSickLeaves);

// Get sick leaves pending doctor review - HR/Admin/Doctor only
router.get('/pending-doctor-review', requireRole([ROLES.ADMIN, ROLES.HR, 'doctor']), getPendingDoctorReview);

// Create sick leave - All authenticated users can create (with file upload support)
router.post('/', upload.array('medicalDocuments', 5), createSickLeave);

// Approve sick leave by supervisor - HR/Admin only
router.post('/:id/approve-supervisor', requireRole([ROLES.ADMIN, ROLES.HR]), approveBySupervisor);

// Approve sick leave by doctor - HR/Admin/Doctor only
router.post('/:id/approve-doctor', requireRole([ROLES.ADMIN, ROLES.HR, 'doctor']), approveByDoctor);

// Reject sick leave by supervisor - HR/Admin only
router.post('/:id/reject-supervisor', requireRole([ROLES.ADMIN, ROLES.HR]), rejectBySupervisor);

// Reject sick leave by doctor - HR/Admin/Doctor only
router.post('/:id/reject-doctor', requireRole([ROLES.ADMIN, ROLES.HR, 'doctor']), rejectByDoctor);

// Get sick leave by ID - All authenticated users
router.get('/:id', getSickLeaveById);

// Update sick leave - All authenticated users can update their own
router.put('/:id', updateSickLeave);

// Delete sick leave - All authenticated users can delete their own
router.delete('/:id', deleteSickLeave);

export default router;
