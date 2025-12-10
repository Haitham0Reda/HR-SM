import express from 'express';
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
} from '../controller/mixedVacation.controller.js';
import {
    protect,
    hrOrAdmin,
    validateDateRange,
    validateTotalDays,
    validateDeductionStrategy,
    validateApplicableScope,
    validateEmployeeId,
    validatePolicyStatus,
    checkPolicyExists,
    checkEmployeeExists
} from '../middleware/index.js';

const router = express.Router();

// Get all policies - HR or Admin
router.get('/',
    protect,
    hrOrAdmin,
    getAllPolicies
);

// Get active policies - HR or Admin
router.get('/active',
    protect,
    hrOrAdmin,
    getActivePolicies
);

// Get upcoming policies - HR or Admin
router.get('/upcoming',
    protect,
    hrOrAdmin,
    getUpcomingPolicies
);

// Get policy by ID - HR or Admin
router.get('/:id',
    protect,
    hrOrAdmin,
    getPolicyById
);

// Create policy with validation - HR or Admin
router.post('/',
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
router.put('/:id',
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
router.delete('/:id',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    deletePolicy
);

// Test policy on employee - HR or Admin
router.post('/:id/test/:employeeId',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    validateEmployeeId,
    checkEmployeeExists,
    testPolicyOnEmployee
);

// Get policy breakdown for employee - HR or Admin
router.get('/:id/breakdown/:employeeId',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    validateEmployeeId,
    checkEmployeeExists,
    getPolicyBreakdown
);

// Apply policy to employee - HR or Admin
router.post('/:id/apply/:employeeId',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    validateEmployeeId,
    checkEmployeeExists,
    applyToEmployee
);

// Apply policy to all eligible employees - HR or Admin
router.post('/:id/apply-all',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    applyToAll
);

// Get employee applications - Protected
router.get('/employee/:employeeId/applications',
    protect,
    validateEmployeeId,
    getEmployeeApplications
);

// Activate policy - HR or Admin
router.post('/:id/activate',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    activatePolicy
);

// Cancel policy - HR or Admin
router.post('/:id/cancel',
    protect,
    hrOrAdmin,
    checkPolicyExists,
    cancelPolicy
);

export default router;
