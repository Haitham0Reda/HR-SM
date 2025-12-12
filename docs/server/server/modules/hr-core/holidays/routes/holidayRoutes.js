import express from 'express';
import {
    getAllHolidays,
    createHoliday,
    getHolidayById,
    updateHoliday,
    deleteHoliday
} from '../controllers/holidayController.js';
import { protect, checkRole } from '../../../../middleware/index.js';
import { tenantContext } from '../../../../core/middleware/tenantContext.js';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

// Get all holidays
router.get('/', protect, getAllHolidays);

// Create holiday - admin/HR only
router.post('/', protect, checkRole(['admin', 'hr']), createHoliday);

// Get holiday by ID
router.get('/:id', protect, getHolidayById);

// Update holiday - admin/HR only
router.put('/:id', protect, checkRole(['admin', 'hr']), updateHoliday);

// Delete holiday - admin only
router.delete('/:id', protect, checkRole(['admin']), deleteHoliday);

export default router;
