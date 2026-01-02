import express from 'express';
import {
    getAllAttendance,
    createAttendance,
    getAttendanceById,
    updateAttendance,
    deleteAttendance,
    getTodayAttendance,
    getMonthlyAttendance,
    getAttendanceByDepartment,
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
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { checkActive } from '../../../middleware/index.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../shared/constants/modules.js';
import { ROLES } from '../../../shared/constants/modules.js';

const router = express.Router();

// Create a conditional middleware for license validation
const conditionalLicenseMiddleware = (moduleKey) => {
    return (req, res, next) => {
        // Skip license validation in development mode
        if (process.env.NODE_ENV === 'development' && process.env.LICENSE_VALIDATION_ENABLED === 'false') {
            return next();
        }
        // Otherwise, use the normal license middleware
        return requireModuleLicense(moduleKey)(req, res, next);
    };
};

// Attendance routes
// Get all attendance records - protected
router.get('/', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), getAllAttendance);

// Get today's attendance
router.get('/today', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), getTodayAttendance);

// Get monthly attendance
router.get('/monthly', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), getMonthlyAttendance);

// Get attendance statistics by department
router.get('/departments', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), getAttendanceByDepartment);

// Manual check-in/check-out
router.post('/manual/checkin', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), requireRole(ROLES.ADMIN, ROLES.HR), manualCheckIn);
router.post('/manual/checkout', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), requireRole(ROLES.ADMIN, ROLES.HR), manualCheckOut);

// Create attendance record - protected, requires active employee
router.post('/', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), checkActive, createAttendance);

// Get attendance by ID
router.get('/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), getAttendanceById);

// Update attendance record
router.put('/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), updateAttendance);

// Delete attendance record - admin only recommended
router.delete('/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), deleteAttendance);

// Forget Check routes
// Get all forget check requests
router.get('/forget-checks', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), getAllForgetChecks);

// Create forget check request
router.post('/forget-checks', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), checkActive, createForgetCheck);

// Approve forget check request
router.post('/forget-checks/:id/approve', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), approveForgetCheck);

// Reject forget check request
router.post('/forget-checks/:id/reject', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), rejectForgetCheck);

// Get forget check by ID
router.get('/forget-checks/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), getForgetCheckById);

// Update forget check
router.put('/forget-checks/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), updateForgetCheck);

// Delete forget check
router.delete('/forget-checks/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), deleteForgetCheck);

export default router;