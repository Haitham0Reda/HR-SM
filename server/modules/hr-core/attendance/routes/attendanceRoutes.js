import express from 'express';
import {
    getAllAttendance,
    createAttendance,
    getAttendanceById,
    updateAttendance,
    deleteAttendance,
    getTodayAttendance,
    getMonthlyAttendance,
    manualCheckIn,
    manualCheckOut
} from '../controllers/attendanceController.js';
import { protect, checkActive, checkRole } from '../../../../middleware/index.js';
import { requireModuleLicense } from '../../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../../platform/system/models/license.model.js';
import { tenantContext } from '../../../../core/middleware/tenantContext.js';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

// Apply license validation to all attendance routes
router.use(requireModuleLicense(MODULES.ATTENDANCE));

// Get all attendance records - protected
router.get('/', protect, getAllAttendance);

// Get today's attendance
router.get('/today', protect, getTodayAttendance);

// Get monthly attendance
router.get('/monthly', protect, getMonthlyAttendance);

// Manual check-in/check-out
router.post('/manual/checkin', protect, checkRole(['admin', 'hr']), manualCheckIn);
router.post('/manual/checkout', protect, checkRole(['admin', 'hr']), manualCheckOut);

// Create attendance record - protected, requires active employee
router.post('/', protect, checkActive, createAttendance);

// Get attendance by ID
router.get('/:id', protect, getAttendanceById);

// Update attendance record
router.put('/:id', protect, updateAttendance);

// Delete attendance record - admin only recommended
router.delete('/:id', protect, deleteAttendance);

export default router;
