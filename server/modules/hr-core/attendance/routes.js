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
} from './controllers/attendance.controller.js';
import {
    getAllForgetChecks,
    createForgetCheck,
    getForgetCheckById,
    updateForgetCheck,
    deleteForgetCheck,
    approveForgetCheck,
    rejectForgetCheck
} from './controllers/forgetCheck.controller.js';
import { protect, checkActive, checkRole } from '../../../middleware/index.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply license validation to all attendance routes
router.use(requireModuleLicense(MODULES.ATTENDANCE));

// Attendance routes
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

// Forget Check routes
// Get all forget check requests
router.get('/forget-checks', protect, getAllForgetChecks);

// Create forget check request
router.post('/forget-checks', protect, checkActive, createForgetCheck);

// Approve forget check request
router.post('/forget-checks/:id/approve', protect, approveForgetCheck);

// Reject forget check request
router.post('/forget-checks/:id/reject', protect, rejectForgetCheck);

// Get forget check by ID
router.get('/forget-checks/:id', protect, getForgetCheckById);

// Update forget check
router.put('/forget-checks/:id', protect, updateForgetCheck);

// Delete forget check
router.delete('/forget-checks/:id', protect, deleteForgetCheck);

export default router;