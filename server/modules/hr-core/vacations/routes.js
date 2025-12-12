import express from 'express';
import {
    getAllVacations,
    createVacation,
    getVacationById,
    updateVacation,
    deleteVacation,
    approveVacation,
    rejectVacation,
    cancelVacation
} from './controllers/vacation.controller.js';
import {
    getAllPolicies,
    getPolicyById,
    createPolicy,
    updatePolicy,
    deletePolicy,
    testPolicyOnEmployee,
    applyToEmployee,
    applyToAll,
    getPolicyBreakdown,
    getEmployeeApplications,
    getActivePolicies,
    getUpcomingPolicies,
    cancelPolicy,
    activatePolicy
} from './controllers/mixedVacation.controller.js';
import {
    protect,
    checkActive,
    hrOrAdmin,
    validateDateRange,
    validateTotalDays,
    validateDeductionStrategy,
    validateApplicableScope,
    validateEmployeeId,
    validatePolicyStatus,
    checkPolicyExists,
    checkEmployeeExists
} from '../../../middleware/index.js';
import upload from '../../../config/multer.config.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply license validation to all vacation routes
router.use(requireModuleLicense(MODULES.LEAVE));

// ===== VACATION ROUTES =====

// Get all vacations - protected route
router.get('/', protect, getAllVacations);

// Create vacation - with authentication and file upload support
router.post('/',
    protect,
    checkActive,
    upload.array('attachments', 5), // Allow up to 5 attachments
    createVacation
);

// Approve vacation
router.post('/:id/approve', protect, approveVacation);

// Reject vacation
router.post('/:id/reject', protect, rejectVacation);

// Cancel vacation
router.post('/:id/cancel', protect, cancelVacation);

// Get vacation by ID
router.get('/:id', protect, getVacationById);

// Update vacation
router.put('/:id', protect, updateVacation);

// Delete vacation
router.delete('/:id', protect, deleteVacation);

// ===== MIXED VACATION POLICY ROUTES =====

// Get all policies - HR or Admin
router.get('/policies',
    protect,
    hrOrAdmin,
    getAllPolicies
);

// Get active policies - HR or Admin
router.get('/policies/active',
    protect,
    hrOrAdmin,
    getActivePolicies
);

// Get upcoming policies - HR or Admin
router.get('/policies/upcoming',
    protect,
    hrOrAdmin,
    getUpcomingPolicies
);

// Get policy by ID - HR or Admin
router.get('/policies/:id',
    protect,
    hrOrAdmin,
    getPolicyById
);

// Create policy with validation - HR or Admin
router.post('/policies',
    protect,
    hrOrAdmin,
    validateDateRange,
    validateTotalDays,
    validateDeductionStrategy,
    validateApplicableScope,
    validatePolicyStatus,
    createPolicy
);

// Update policy with validation - HR or Admin
router.put('/policies/:id',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    validateDateRange,
    validateTotalDays,
    validateDeductionStrategy,
    validateApplicableScope,
    validatePolicyStatus,
    updatePolicy
);

// Delete policy - HR or Admin
router.delete('/policies/:id',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    deletePolicy
);

// Test policy on employee - HR or Admin
router.post('/policies/:id/test/:employeeId',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    validateEmployeeId,
    checkEmployeeExists,
    testPolicyOnEmployee
);

// Get policy breakdown for employee - HR or Admin
router.get('/policies/:id/breakdown/:employeeId',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    validateEmployeeId,
    checkEmployeeExists,
    getPolicyBreakdown
);

// Apply policy to employee - HR or Admin
router.post('/policies/:id/apply/:employeeId',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    validateEmployeeId,
    checkEmployeeExists,
    applyToEmployee
);

// Apply policy to all eligible employees - HR or Admin
router.post('/policies/:id/apply-all',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    applyToAll
);

// Get employee applications - Protected
router.get('/policies/employee/:employeeId/applications',
    protect,
    validateEmployeeId,
    getEmployeeApplications
);

// Activate policy - HR or Admin
router.post('/policies/:id/activate',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    activatePolicy
);

// Cancel policy - HR or Admin
router.post('/policies/:id/cancel',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    cancelPolicy
);

export default router;