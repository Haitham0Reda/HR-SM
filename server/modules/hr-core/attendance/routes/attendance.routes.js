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
} from '../controllers/attendance.controller.js';
import { protect, checkActive, checkRole } from '../../../../middleware/index.js';
import { requireModuleLicense } from '../../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../../models/license.model.js';

const router = express.Router();

// Apply authentication to all routes first
router.use(protect);

// Apply license validation to all attendance routes (after authentication)
router.use(requireModuleLicense(MODULES.ATTENDANCE));

// Get all attendance records - protected
router.get('/', getAllAttendance);

// Get today's attendance
router.get('/today', getTodayAttendance);

// Get monthly attendance
router.get('/monthly', getMonthlyAttendance);

// Manual check-in/check-out
router.post('/manual/checkin', checkRole(['admin', 'hr']), manualCheckIn);
router.post('/manual/checkout', checkRole(['admin', 'hr']), manualCheckOut);

// Create attendance record - protected, requires active employee
router.post('/', checkActive, createAttendance);

// Get attendance by ID
router.get('/:id', getAttendanceById);

// Update attendance record
router.put('/:id', updateAttendance);

// Delete attendance record - admin only recommended
router.delete('/:id', deleteAttendance);

export default router;
