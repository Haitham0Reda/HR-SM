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
} from '../controllers/vacation.controller.js';
import { protect, checkActive } from '../../../../middleware/index.js';
import upload from '../../../../config/multer.config.js';
import { requireModuleLicense } from '../../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../../models/license.model.js';

const router = express.Router();

// Apply authentication to all routes first
router.use(protect);

// Apply license validation to all vacation routes (after authentication)
router.use(requireModuleLicense(MODULES.LEAVE));

// Get all vacations - protected route
router.get('/', getAllVacations);

// Create vacation - with authentication and file upload support
router.post('/',
    checkActive,
    upload.array('attachments', 5), // Allow up to 5 attachments
    createVacation
);

// Approve vacation
router.post('/:id/approve', approveVacation);

// Reject vacation
router.post('/:id/reject', rejectVacation);

// Cancel vacation
router.post('/:id/cancel', cancelVacation);

// Get vacation by ID
router.get('/:id', getVacationById);

// Update vacation
router.put('/:id', updateVacation);

// Delete vacation
router.delete('/:id', deleteVacation);

export default router;
