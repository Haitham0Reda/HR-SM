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
} from '../controller/vacation.controller.js';
import { protect, checkActive } from '../middleware/index.js';
import upload from '../config/multer.config.js';
import { requireModuleLicense } from '../middleware/licenseValidation.middleware.js';
import { MODULES } from '../models/license.model.js';

const router = express.Router();

// Apply license validation to all vacation routes
router.use(requireModuleLicense(MODULES.LEAVE));

// Get all vacations - protected route
router.get('/', protect, getAllVacations);

// Create vacation - with authentication and file upload support
router.post('/',
    protect,
    checkActive,
    upload.array('attachments', 5), // Allow up to 5 attachments
    createVacation
);

// Approve vacation
router.post('/:id/approve', protect, approveVacation);

// Reject vacation
router.post('/:id/reject', protect, rejectVacation);

// Cancel vacation
router.post('/:id/cancel', protect, cancelVacation);

// Get vacation by ID
router.get('/:id', protect, getVacationById);

// Update vacation
router.put('/:id', protect, updateVacation);

// Delete vacation
router.delete('/:id', protect, deleteVacation);

export default router;
