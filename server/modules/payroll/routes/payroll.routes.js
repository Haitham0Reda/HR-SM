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

// Apply authentication to all payroll routes first
router.use(protect);

// Apply license validation after authentication (so tenant ID is available)
router.use(requireModuleLicense(MODULES.PAYROLL));

// Get all payrolls - HR or Admin only
router.get('/', hrOrAdmin, getAllPayrolls);

// Create payroll - HR or Admin only
router.post('/', hrOrAdmin, createPayroll);

// Get payroll by ID - Protected (already authenticated)
router.get('/:id', getPayrollById);

// Update payroll - HR or Admin only
router.put('/:id', hrOrAdmin, updatePayroll);

// Delete payroll - HR or Admin only
router.delete('/:id', hrOrAdmin, deletePayroll);

export default router;
