import express from 'express';
import { body, param, query } from 'express-validator';
import { protect } from '../../../middleware/authMiddleware.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { validateRequest } from '../../../core/middleware/validation.js';
import { requireRole } from '../../../shared/middleware/auth.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import insuranceController from '../controllers/insuranceController.js';
import familyMemberController from '../controllers/familyMemberController.js';
import claimController from '../controllers/claimController.js';
import reportController from '../controllers/reportController.js';
import employeeController from '../controllers/employeeController.js';
import configController from '../controllers/configController.js';
import * as insuranceProviderController from '../controllers/insuranceProviderController.js';
import { 
    validateCreateProvider, 
    validateUpdateProvider, 
    validateProviderId, 
    validateDeactivateProvider, 
    validateProviderQuery,
    validateContractDates 
} from '../middleware/insuranceProviderValidation.js';
import { insuranceUpload } from '../config/multer.config.js';
import { MODULES, ROLES } from '../../../shared/constants/modules.js';
import { 
    requireFeature, 
    requireFeatures, 
    attachModuleConfig, 
    requireModuleAvailable 
} from '../middleware/featureGuard.js';
import { 
    requireActiveTenant, 
    logTenantAccess 
} from '../middleware/tenantStatusGuard.js';

const router = express.Router();

// Apply authentication first
router.use(protect);

// Apply license validation for life insurance module
// router.use(requireModuleLicense(MODULES.LIFE_INSURANCE)); // Temporarily disabled

// Check tenant status and log tenant access for audit
// router.use(requireActiveTenant()); // Temporarily disabled
// router.use(logTenantAccess()); // Temporarily disabled

// Check if module is available for tenant
// router.use(requireModuleAvailable()); // Temporarily disabled

// Attach module configuration to all requests
// router.use(attachModuleConfig()); // Temporarily disabled

// Simple test endpoint to verify authentication works
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Life insurance module is accessible',
        user: {
            id: req.user?.id || req.user?._id,
            role: req.user?.role,
            tenantId: req.user?.tenantId || req.tenantId
        },
        timestamp: new Date().toISOString()
    });
});



// Root route for life insurance
router.get('/', async (req, res) => {
    try {
        const moduleConfig = req.moduleConfig;
        const availableFeatures = req.availableFeatures;
        
        // Build feature list based on availability
        const features = [];
        if (availableFeatures.policyManagement) features.push('policies');
        if (availableFeatures.claimsProcessing) features.push('claims');
        if (availableFeatures.familyMembers) features.push('family-members');
        if (availableFeatures.insuranceReports) features.push('reports');
        if (availableFeatures.beneficiaryManagement) features.push('beneficiaries');
        
        // Build endpoint list based on available features
        const endpoints = ['GET /policies - List all policies'];
        if (availableFeatures.policyManagement) {
            endpoints.push('POST /policies - Create new policy');
        }
        if (availableFeatures.claimsProcessing) {
            endpoints.push('GET /claims - List all claims');
            endpoints.push('POST /claims - Create new claim');
        }
        if (availableFeatures.familyMembers) {
            endpoints.push('GET /family-members - List family members');
        }
        
        sendSuccess(res, {
            module: 'life-insurance',
            version: '1.0.0',
            tenant: {
                id: req.tenant.id,
                subscriptionPlan: moduleConfig.subscription.plan,
                subscriptionStatus: moduleConfig.subscription.status
            },
            features,
            availableFeatures,
            endpoints,
            moduleSettings: req.moduleSettings
        }, 'Life Insurance module is available');
    } catch (error) {
        return sendError(res, 'Failed to access life insurance module', 500);
    }
});

// Employee Lookup Routes for Insurance Operations
router.route('/employees/search')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            query('q')
                .optional()
                .trim()
                .isLength({ min: 1, max: 100 })
                .withMessage('Search query must be between 1 and 100 characters'),
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('Limit must be between 1 and 100'),
            query('page')
                .optional()
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer')
        ],
        validateRequest,
        employeeController.searchEmployees
    );

router.route('/employees/validate')
    .post(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            body('employeeId')
                .notEmpty()
                .withMessage('Employee ID is required')
        ],
        validateRequest,
        employeeController.validateEmployeeIdentifier
    );

router.route('/employees')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            query('includeInactive')
                .optional()
                .isBoolean()
                .withMessage('Include inactive must be a boolean'),
            query('limit')
                .optional()
                .isInt({ min: 1, max: 200 })
                .withMessage('Limit must be between 1 and 200')
        ],
        validateRequest,
        employeeController.getAccessibleEmployees
    );

router.route('/employees/:id')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .custom(async (value) => {
                    // Allow either MongoDB ObjectId or employeeId string
                    const mongoose = await import('mongoose');
                    if (mongoose.default.Types.ObjectId.isValid(value)) {
                        return true; // Valid ObjectId
                    }
                    if (typeof value === 'string' && value.length > 0) {
                        return true; // Valid string employeeId
                    }
                    return Promise.reject('Valid employee ID is required (either MongoDB ObjectId or employeeId string)');
                })
        ],
        validateRequest,
        employeeController.getEmployeeById
    );

// Policy Management Routes
router.route('/policies')
    .post(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            body('employeeId')
                .custom(async (value) => {
                    // Allow either MongoDB ObjectId or employeeId string
                    const mongoose = await import('mongoose');
                    if (mongoose.default.Types.ObjectId.isValid(value)) {
                        return true; // Valid ObjectId
                    }
                    if (typeof value === 'string' && value.length > 0) {
                        return true; // Valid string employeeId
                    }
                    return Promise.reject('Valid employee ID is required (either MongoDB ObjectId or employeeId string)');
                }),
            body('policyType')
                .isIn(['CAT_A', 'CAT_B', 'CAT_C'])
                .withMessage('Policy type must be CAT_A, CAT_B, or CAT_C'),
            body('coverageAmount')
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Coverage amount must be a positive number'),
            body('premium')
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Premium must be a positive number'),
            body('startDate')
                .isISO8601()
                .withMessage('Valid start date is required'),
            body('endDate')
                .isISO8601()
                .withMessage('Valid end date is required'),
            body('deductible')
                .optional()
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Deductible must be a positive number')
        ],
        validateRequest,
        insuranceController.createPolicy
    )
    .get(
        // requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), // Temporarily disabled for debugging
        [
            query('page')
                .optional()
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer'),
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('Limit must be between 1 and 100'),
            query('status')
                .optional()
                .isIn(['active', 'inactive', 'suspended', 'expired', 'cancelled'])
                .withMessage('Invalid status'),
            query('policyType')
                .optional()
                .isIn(['CAT_A', 'CAT_B', 'CAT_C'])
                .withMessage('Invalid policy type'),
            query('employeeId')
                .optional()
                .isMongoId()
                .withMessage('Invalid employee ID')
        ],
        validateRequest,
        insuranceController.getPolicies
    );

router.route('/policies/expiring')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            query('days')
                .optional()
                .isInt({ min: 1, max: 365 })
                .withMessage('Days must be between 1 and 365')
        ],
        validateRequest,
        insuranceController.getExpiringPolicies
    );

router.route('/policies/statistics')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        insuranceController.getPolicyStatistics
    );



router.route('/policies/:id')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid policy ID is required')
        ],
        validateRequest,
        insuranceController.getPolicyById
    )
    .put(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid policy ID is required'),
            body('policyType')
                .optional()
                .isIn(['CAT_A', 'CAT_B', 'CAT_C'])
                .withMessage('Policy type must be CAT_A, CAT_B, or CAT_C'),
            body('coverageAmount')
                .optional()
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Coverage amount must be a positive number'),
            body('premium')
                .optional()
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Premium must be a positive number'),
            body('deductible')
                .optional()
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Deductible must be a positive number'),
            body('endDate')
                .optional()
                .isISO8601()
                .withMessage('Valid end date is required'),
            body('status')
                .optional()
                .isIn(['active', 'inactive', 'suspended', 'expired', 'cancelled'])
                .withMessage('Invalid status')
        ],
        validateRequest,
        insuranceController.updatePolicy
    )
    .delete(
        requireRole(ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid policy ID is required')
        ],
        validateRequest,
        insuranceController.deletePolicy
    );

// Family Member Routes
router.route('/policies/:policyId/family-members')
    .post(
        requireFeature('familyMembers'),
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('policyId')
                .isMongoId()
                .withMessage('Valid policy ID is required'),
            body('firstName')
                .trim()
                .isLength({ min: 1, max: 50 })
                .withMessage('First name is required and must be less than 50 characters'),
            body('lastName')
                .trim()
                .isLength({ min: 1, max: 50 })
                .withMessage('Last name is required and must be less than 50 characters'),
            body('dateOfBirth')
                .isISO8601()
                .withMessage('Valid date of birth is required'),
            body('gender')
                .isIn(['male', 'female', 'other'])
                .withMessage('Gender must be male, female, or other'),
            body('relationship')
                .isIn(['spouse', 'child', 'parent'])
                .withMessage('Relationship must be spouse, child, or parent'),
            body('phone')
                .optional()
                .isMobilePhone()
                .withMessage('Valid phone number is required'),
            body('email')
                .optional()
                .isEmail()
                .withMessage('Valid email is required'),
            body('coverageAmount')
                .optional()
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Coverage amount must be a positive number')
        ],
        validateRequest,
        insuranceController.addFamilyMember
    )
    .get(
        requireFeature('familyMembers'),
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('policyId')
                .isMongoId()
                .withMessage('Valid policy ID is required')
        ],
        validateRequest,
        insuranceController.getFamilyMembers
    );

router.route('/family-members')
    .get(
        requireFeature('familyMembers'),
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            query('page')
                .optional()
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer'),
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('Limit must be between 1 and 100'),
            query('relationship')
                .optional()
                .isIn(['spouse', 'child', 'parent'])
                .withMessage('Invalid relationship'),
            query('status')
                .optional()
                .isIn(['active', 'inactive', 'suspended', 'removed', 'all'])
                .withMessage('Invalid status'),
            query('employeeId')
                .optional()
                .isMongoId()
                .withMessage('Invalid employee ID'),
            query('policyId')
                .optional()
                .isMongoId()
                .withMessage('Invalid policy ID')
        ],
        validateRequest,
        familyMemberController.getFamilyMembers
    );

router.route('/family-members/statistics')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        familyMemberController.getFamilyMemberStatistics
    );

router.route('/family-members/by-relationship/:relationship')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('relationship')
                .isIn(['spouse', 'child', 'parent'])
                .withMessage('Relationship must be spouse, child, or parent'),
            query('employeeId')
                .optional()
                .isMongoId()
                .withMessage('Invalid employee ID')
        ],
        validateRequest,
        familyMemberController.getFamilyMembersByRelationship
    );

router.route('/family-members/children-under-age')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            query('maxAge')
                .optional()
                .isInt({ min: 1, max: 30 })
                .withMessage('Max age must be between 1 and 30')
        ],
        validateRequest,
        familyMemberController.getChildrenUnderAge
    );

router.route('/family-members/:id')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid family member ID is required')
        ],
        validateRequest,
        familyMemberController.getFamilyMemberById
    )
    .put(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid family member ID is required'),
            body('firstName')
                .optional()
                .trim()
                .isLength({ min: 1, max: 50 })
                .withMessage('First name must be less than 50 characters'),
            body('lastName')
                .optional()
                .trim()
                .isLength({ min: 1, max: 50 })
                .withMessage('Last name must be less than 50 characters'),
            body('dateOfBirth')
                .optional()
                .isISO8601()
                .withMessage('Valid date of birth is required'),
            body('gender')
                .optional()
                .isIn(['male', 'female', 'other'])
                .withMessage('Gender must be male, female, or other'),
            body('relationship')
                .optional()
                .isIn(['spouse', 'child', 'parent'])
                .withMessage('Relationship must be spouse, child, or parent'),
            body('phone')
                .optional()
                .isMobilePhone()
                .withMessage('Valid phone number is required'),
            body('email')
                .optional()
                .isEmail()
                .withMessage('Valid email is required'),
            body('coverageAmount')
                .optional()
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Coverage amount must be a positive number'),
            body('status')
                .optional()
                .isIn(['active', 'inactive', 'suspended'])
                .withMessage('Invalid status')
        ],
        validateRequest,
        familyMemberController.updateFamilyMember
    )
    .delete(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid family member ID is required')
        ],
        validateRequest,
        familyMemberController.removeFamilyMember
    );

router.route('/family-members/:id/coverage')
    .patch(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid family member ID is required'),
            body('coverageStartDate')
                .optional()
                .isISO8601()
                .withMessage('Valid coverage start date is required'),
            body('coverageEndDate')
                .optional()
                .isISO8601()
                .withMessage('Valid coverage end date is required'),
            body('coverageAmount')
                .optional()
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Coverage amount must be a positive number')
        ],
        validateRequest,
        familyMemberController.updateFamilyMemberCoverage
    );

// Claims Management Routes
router.route('/claims')
    .post(
        requireFeature('claimsProcessing'),
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            body('policyId')
                .isMongoId()
                .withMessage('Valid policy ID is required'),
            body('claimantType')
                .isIn(['employee', 'family_member'])
                .withMessage('Claimant type must be employee or family_member'),
            body('claimantId')
                .isMongoId()
                .withMessage('Valid claimant ID is required'),
            body('claimType')
                .isIn(['death', 'disability', 'medical', 'accident', 'other'])
                .withMessage('Invalid claim type'),
            body('incidentDate')
                .isISO8601()
                .withMessage('Valid incident date is required'),
            body('claimAmount')
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Claim amount must be a positive number'),
            body('description')
                .trim()
                .isLength({ min: 10, max: 1000 })
                .withMessage('Description must be between 10 and 1000 characters'),
            body('priority')
                .optional()
                .isIn(['low', 'medium', 'high', 'urgent'])
                .withMessage('Invalid priority level')
        ],
        validateRequest,
        claimController.createClaim
    )
    .get(
        requireFeature('claimsProcessing'),
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            query('page')
                .optional()
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer'),
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('Limit must be between 1 and 100'),
            query('status')
                .optional()
                .isIn(['pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'])
                .withMessage('Invalid status'),
            query('claimType')
                .optional()
                .isIn(['death', 'disability', 'medical', 'accident', 'other'])
                .withMessage('Invalid claim type'),
            query('priority')
                .optional()
                .isIn(['low', 'medium', 'high', 'urgent'])
                .withMessage('Invalid priority'),
            query('employeeId')
                .optional()
                .isMongoId()
                .withMessage('Invalid employee ID'),
            query('policyId')
                .optional()
                .isMongoId()
                .withMessage('Invalid policy ID'),
            query('sortBy')
                .optional()
                .isIn(['createdAt', 'incidentDate', 'claimAmount', 'status', 'priority'])
                .withMessage('Invalid sort field'),
            query('sortOrder')
                .optional()
                .isIn(['asc', 'desc'])
                .withMessage('Sort order must be asc or desc')
        ],
        validateRequest,
        claimController.getClaims
    );

router.route('/claims/by-status/:status')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('status')
                .isIn(['pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'])
                .withMessage('Invalid status'),
            query('employeeId')
                .optional()
                .isMongoId()
                .withMessage('Invalid employee ID')
        ],
        validateRequest,
        claimController.getClaimsByStatus
    );

router.route('/claims/overdue')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        claimController.getOverdueClaims
    );

router.route('/claims/statistics')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            query('startDate')
                .optional()
                .isISO8601()
                .withMessage('Valid start date is required'),
            query('endDate')
                .optional()
                .isISO8601()
                .withMessage('Valid end date is required')
        ],
        validateRequest,
        claimController.getClaimsStatistics
    );

router.route('/claims/:id')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required')
        ],
        validateRequest,
        claimController.getClaimById
    )
    .delete(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required'),
            body('reason')
                .optional()
                .trim()
                .isLength({ max: 500 })
                .withMessage('Reason must be less than 500 characters')
        ],
        validateRequest,
        claimController.cancelClaim
    );

router.route('/claims/:id/review')
    .patch(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required'),
            body('action')
                .isIn(['approve', 'reject'])
                .withMessage('Action must be approve or reject'),
            body('approvedAmount')
                .if(body('action').equals('approve'))
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Approved amount is required for approval'),
            body('reviewNotes')
                .if(body('action').equals('reject'))
                .trim()
                .isLength({ min: 10, max: 1000 })
                .withMessage('Review notes are required for rejection (10-1000 characters)')
        ],
        validateRequest,
        claimController.reviewClaim
    );

router.route('/claims/:id/process-payment')
    .patch(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required'),
            body('paymentMethod')
                .isIn(['bank_transfer', 'check', 'cash', 'other'])
                .withMessage('Invalid payment method'),
            body('paymentReference')
                .trim()
                .isLength({ min: 1, max: 100 })
                .withMessage('Payment reference is required'),
            body('paymentDate')
                .optional()
                .isISO8601()
                .withMessage('Valid payment date is required')
        ],
        validateRequest,
        claimController.processClaim
    );

router.route('/claims/:id/status')
    .patch(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required'),
            body('status')
                .isIn(['pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'])
                .withMessage('Invalid status'),
            body('notes')
                .optional()
                .trim()
                .isLength({ max: 500 })
                .withMessage('Notes must be less than 500 characters')
        ],
        validateRequest,
        claimController.updateClaimStatus
    );

// Claims Document Management Routes
router.route('/claims/:id/documents')
    .post(
        requireFeature('documentUpload'),
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        insuranceUpload.array('documents', 5), // Allow up to 5 files
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required'),
            body('documentType')
                .optional()
                .isIn(['medical_report', 'death_certificate', 'police_report', 'invoice', 'receipt', 'other'])
                .withMessage('Invalid document type'),
            body('description')
                .optional()
                .trim()
                .isLength({ max: 500 })
                .withMessage('Description must be less than 500 characters')
        ],
        validateRequest,
        claimController.uploadClaimDocuments
    )
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required')
        ],
        validateRequest,
        claimController.getClaimDocuments
    );

router.route('/claims/:id/documents/:documentId/download')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required'),
            param('documentId')
                .isMongoId()
                .withMessage('Valid document ID is required')
        ],
        validateRequest,
        claimController.downloadClaimDocument
    );

router.route('/claims/:id/documents/:documentId')
    .delete(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required'),
            param('documentId')
                .isMongoId()
                .withMessage('Valid document ID is required')
        ],
        validateRequest,
        claimController.deleteClaimDocument
    );

// Insurance Provider Management Routes
router.route('/providers')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        validateProviderQuery,
        validateRequest,
        insuranceProviderController.getInsuranceProviders
    )
    .post(
        requireRole(ROLES.HR, ROLES.ADMIN),
        validateCreateProvider,
        validateContractDates,
        validateRequest,
        insuranceProviderController.createInsuranceProvider
    );

router.route('/providers/statistics')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        insuranceProviderController.getProviderStatistics
    );

router.route('/providers/:id')
    .get(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        validateProviderId,
        validateRequest,
        insuranceProviderController.getInsuranceProvider
    )
    .put(
        requireRole(ROLES.HR, ROLES.ADMIN),
        validateUpdateProvider,
        validateContractDates,
        validateRequest,
        insuranceProviderController.updateInsuranceProvider
    )
    .delete(
        requireRole(ROLES.ADMIN),
        validateProviderId,
        validateRequest,
        insuranceProviderController.deleteInsuranceProvider
    );

router.route('/providers/:id/activate')
    .patch(
        requireRole(ROLES.HR, ROLES.ADMIN),
        validateProviderId,
        validateRequest,
        insuranceProviderController.activateInsuranceProvider
    );

router.route('/providers/:id/deactivate')
    .patch(
        requireRole(ROLES.HR, ROLES.ADMIN),
        validateDeactivateProvider,
        validateRequest,
        insuranceProviderController.deactivateInsuranceProvider
    );

// Reports Routes
router.route('/reports/pdf')
    .post(
        requireFeature('insuranceReports'),
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            body('startDate')
                .optional()
                .isISO8601()
                .withMessage('Valid start date is required'),
            body('endDate')
                .optional()
                .isISO8601()
                .withMessage('Valid end date is required'),
            body('includeExpired')
                .optional()
                .isBoolean()
                .withMessage('Include expired must be a boolean'),
            body('includeClaims')
                .optional()
                .isBoolean()
                .withMessage('Include claims must be a boolean'),
            body('includeFamilyMembers')
                .optional()
                .isBoolean()
                .withMessage('Include family members must be a boolean'),
            body('reportTitle')
                .optional()
                .trim()
                .isLength({ min: 1, max: 100 })
                .withMessage('Report title must be between 1 and 100 characters')
        ],
        validateRequest,
        reportController.generatePDFReport
    );

router.route('/reports/excel')
    .post(
        requireFeature('insuranceReports'),
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            body('startDate')
                .optional()
                .isISO8601()
                .withMessage('Valid start date is required'),
            body('endDate')
                .optional()
                .isISO8601()
                .withMessage('Valid end date is required'),
            body('includeExpired')
                .optional()
                .isBoolean()
                .withMessage('Include expired must be a boolean'),
            body('includeClaims')
                .optional()
                .isBoolean()
                .withMessage('Include claims must be a boolean'),
            body('includeFamilyMembers')
                .optional()
                .isBoolean()
                .withMessage('Include family members must be a boolean')
        ],
        validateRequest,
        reportController.generateExcelReport
    );

router.route('/reports')
    .get(
        requireFeature('insuranceReports'),
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        reportController.getAvailableReports
    );

router.route('/reports/download/:filename')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('filename')
                .matches(/^[a-zA-Z0-9\-_.]+$/)
                .withMessage('Invalid filename format')
        ],
        validateRequest,
        reportController.downloadReport
    );

router.route('/reports/cleanup')
    .post(
        requireRole(ROLES.ADMIN),
        [
            body('maxAgeHours')
                .optional()
                .isInt({ min: 1, max: 8760 })
                .withMessage('Max age hours must be between 1 and 8760 (1 year)')
        ],
        validateRequest,
        reportController.cleanupOldReports
    );

router.route('/reports/:filename')
    .delete(
        requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('filename')
                .matches(/^[a-zA-Z0-9\-_.]+$/)
                .withMessage('Invalid filename format')
        ],
        validateRequest,
        reportController.deleteReport
    );

// Module Configuration Routes
router.route('/config')
    .get(
        requireRole(ROLES.HR, ROLES.ADMIN),
        configController.getModuleConfig
    );

router.route('/config/settings')
    .put(
        requireRole(ROLES.ADMIN),
        [
            body('settings')
                .isObject()
                .withMessage('Settings must be an object'),
            body('settings.emailNotifications')
                .optional()
                .isBoolean()
                .withMessage('Email notifications must be a boolean'),
            body('settings.autoApproveSmallClaims')
                .optional()
                .isBoolean()
                .withMessage('Auto approve small claims must be a boolean'),
            body('settings.smallClaimThreshold')
                .optional()
                .isNumeric()
                .isFloat({ min: 0 })
                .withMessage('Small claim threshold must be a positive number'),
            body('settings.requireDocumentsForClaims')
                .optional()
                .isBoolean()
                .withMessage('Require documents for claims must be a boolean'),
            body('settings.maxFamilyMembers')
                .optional()
                .isInt({ min: 1, max: 50 })
                .withMessage('Max family members must be between 1 and 50')
        ],
        validateRequest,
        configController.updateModuleSettings
    );

router.route('/config/features')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        configController.getFeatureAvailability
    );

router.route('/config/features/:featureName')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        [
            param('featureName')
                .isIn(['policyManagement', 'familyMembers', 'claimsProcessing', 'beneficiaryManagement', 'insuranceReports', 'documentUpload', 'emailNotifications', 'policyAnalytics'])
                .withMessage('Invalid feature name')
        ],
        validateRequest,
        configController.checkFeatureAvailability
    );

router.route('/config/availability')
    .get(
        requireRole(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN),
        configController.getModuleAvailability
    );

router.route('/config/cache/clear')
    .post(
        requireRole(ROLES.ADMIN),
        configController.clearConfigCache
    );

router.route('/config/cache/stats')
    .get(
        requireRole(ROLES.ADMIN),
        configController.getCacheStats
    );

export default router;