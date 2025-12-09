import express from 'express';
import {
    getAllOvertime,
    createOvertime,
    getOvertimeById,
    updateOvertime,
    deleteOvertime
} from '../controllers/overtimeController.js';
import { protect, checkActive, checkRole } from '../../../../middleware/index.js';
import { tenantContext } from '../../../../core/middleware/tenantContext.js';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

// Get all overtime records
router.get('/', protect, getAllOvertime);

// Create overtime record
router.post('/', protect, checkActive, createOvertime);

// Get overtime by ID
router.get('/:id', protect, getOvertimeById);

// Update overtime
router.put('/:id', protect, updateOvertime);

// Delete overtime
router.delete('/:id', protect, checkRole(['admin', 'hr']), deleteOvertime);

export default router;
