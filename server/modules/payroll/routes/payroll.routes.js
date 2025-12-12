import express from 'express';
import {
    getAllPayrolls,
    createPayroll,
    getPayrollById,
    updatePayroll,
    deletePayroll
} from '../controllers/payroll.controller.js';
import { protect, hrOrAdmin } from '../../../middleware/index.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply license validation to all payroll routes
router.use(requireModuleLicense(MODULES.PAYROLL));

// Get all payrolls - HR or Admin only
router.get('/', protect, hrOrAdmin, getAllPayrolls);

// Create payroll - HR or Admin only
router.post('/', protect, hrOrAdmin, createPayroll);

// Get payroll by ID - Protected
router.get('/:id', protect, getPayrollById);

// Update payroll - HR or Admin only
router.put('/:id', protect, hrOrAdmin, updatePayroll);

// Delete payroll - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deletePayroll);

export default router;
