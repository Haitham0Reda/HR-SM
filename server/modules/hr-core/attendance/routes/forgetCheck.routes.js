import express from 'express';
import {
    getAllForgetChecks,
    createForgetCheck,
    getForgetCheckById,
    updateForgetCheck,
    deleteForgetCheck,
    approveForgetCheck,
    rejectForgetCheck
} from '../controllers/forgetCheck.controller.js';
import { requireAuth, requireRole } from '../../../../shared/middleware/auth.js';
import { requireModuleLicense } from '../../../../middleware/licenseValidation.middleware.js';
import { MODULES, ROLES } from '../../../../shared/constants/modules.js';

const router = express.Router();

// Add debugging for route registration
console.log('🔍 FORGET-CHECK ROUTES: Loading routes...');

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

// Get all forget check requests - All authenticated users can view
router.get('/', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), (req, res, next) => {
    console.log('🔍 FORGET-CHECK: GET / route hit');
    getAllForgetChecks(req, res, next);
});

// Create forget check request - All authenticated users can create
router.post('/', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), (req, res, next) => {
    console.log('🔍 FORGET-CHECK: POST / route hit');
    console.log('🔍 Request URL:', req.originalUrl);
    console.log('🔍 Request method:', req.method);
    createForgetCheck(req, res, next);
});

// Approve forget check request - HR/Admin only
router.post('/:id/approve', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), requireRole(ROLES.ADMIN, ROLES.HR), (req, res, next) => {
    console.log('🔍 FORGET-CHECK: POST /:id/approve route hit');
    approveForgetCheck(req, res, next);
});

// Reject forget check request - HR/Admin only
router.post('/:id/reject', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), requireRole(ROLES.ADMIN, ROLES.HR), (req, res, next) => {
    console.log('🔍 FORGET-CHECK: POST /:id/reject route hit');
    rejectForgetCheck(req, res, next);
});

// Get forget check by ID - All authenticated users
router.get('/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), (req, res, next) => {
    console.log('🔍 FORGET-CHECK: GET /:id route hit');
    getForgetCheckById(req, res, next);
});

// Update forget check - All authenticated users can update their own
router.put('/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), (req, res, next) => {
    console.log('🔍 FORGET-CHECK: PUT /:id route hit');
    updateForgetCheck(req, res, next);
});

// Delete forget check - All authenticated users can delete their own
router.delete('/:id', requireAuth, conditionalLicenseMiddleware(MODULES.HR_CORE), (req, res, next) => {
    console.log('🔍 FORGET-CHECK: DELETE /:id route hit');
    deleteForgetCheck(req, res, next);
});

console.log('🔍 FORGET-CHECK ROUTES: All routes registered');

export default router;
