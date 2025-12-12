import express from 'express';
import {
    getAllResignedEmployees,
    getResignedEmployeeById,
    createResignedEmployee,
    updateResignationType,
    addPenalty,
    removePenalty,
    generateLetter,
    generateArabicDisclaimer,
    lockResignedEmployee,
    updateStatus,
    deleteResignedEmployee
} from './controllers/resignedEmployee.controller.js';
import {
    protect,
    hrOrAdmin,
    validateResignationDates,
    validatePenalty,
    checkCanModify,
    validateEmployee,
    validateResignationType
} from '../../../middleware/index.js';

const router = express.Router();

// Get all resigned employees - HR or Admin only
router.get('/', protect, hrOrAdmin, getAllResignedEmployees);

// Create resigned employee record - HR or Admin only with validation
router.post('/',
    protect,
    hrOrAdmin,
    validateEmployee,
    validateResignationType,
    validateResignationDates,
    createResignedEmployee
);

// Get resigned employee by ID - HR or Admin only
router.get('/:id', protect, hrOrAdmin, getResignedEmployeeById);

// Update resignation type - HR or Admin only (within 24 hours)
router.put('/:id/resignation-type',
    protect,
    hrOrAdmin,
    checkCanModify,
    validateResignationType,
    updateResignationType
);

// Add penalty - HR or Admin only (within 24 hours)
router.post('/:id/penalties',
    protect,
    hrOrAdmin,
    checkCanModify,
    validatePenalty,
    addPenalty
);

// Remove penalty - HR or Admin only (within 24 hours)
router.delete('/:id/penalties/:penaltyId',
    protect,
    hrOrAdmin,
    checkCanModify,
    removePenalty
);

// Generate letter - HR or Admin only
router.post('/:id/generate-letter', protect, hrOrAdmin, generateLetter);

// Generate Arabic disclaimer - HR or Admin only
router.post('/:id/generate-disclaimer', protect, hrOrAdmin, generateArabicDisclaimer);

// Lock resigned employee record - HR or Admin only
router.post('/:id/lock', protect, hrOrAdmin, lockResignedEmployee);

// Update status - HR or Admin only
router.put('/:id/status', protect, hrOrAdmin, updateStatus);

// Delete resigned employee record - Admin only
router.delete('/:id', protect, hrOrAdmin, deleteResignedEmployee);

export default router;
