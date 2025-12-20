import express from 'express';
import { body, param, query } from 'express-validator';
import { requireModule } from '../../../middleware/licenseFeatureGuard.middleware.js';
import { validateRequest } from '../../../core/middleware/validation.js';
import { requireRole } from '../../../shared/middleware/auth.js';
import insuranceController from '../controllers/insuranceController.js';
import familyMemberController from '../controllers/familyMemberController.js';
import claimController from '../controllers/claimController.js';
import reportController from '../controllers/reportController.js';
import { insuranceUpload } from '../config/multer.config.js';

const router = express.Router();

// Apply license feature guard to all routes in this module
router.use(requireModule('life-insurance'));

// Policy Management Routes
router.route('/policies')
    .post(
        requireRole(['Manager', 'HR', 'Admin']),
        [
            body('employeeId')
                .isMongoId()
                .withMessage('Valid employee ID is required'),
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
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
        insuranceController.getPolicyStatistics
    );

router.route('/policies/:id')
    .get(
        [
            param('id')
                .isMongoId()
                .withMessage('Valid policy ID is required')
        ],
        validateRequest,
        insuranceController.getPolicyById
    )
    .put(
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
        familyMemberController.getFamilyMemberStatistics
    );

router.route('/family-members/by-relationship/:relationship')
    .get(
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
        requireRole(['Manager', 'HR', 'Admin']),
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
        [
            param('id')
                .isMongoId()
                .withMessage('Valid family member ID is required')
        ],
        validateRequest,
        familyMemberController.getFamilyMemberById
    )
    .put(
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
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
        claimController.getOverdueClaims
    );

router.route('/claims/statistics')
    .get(
        requireRole(['Manager', 'HR', 'Admin']),
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
        [
            param('id')
                .isMongoId()
                .withMessage('Valid claim ID is required')
        ],
        validateRequest,
        claimController.getClaimById
    )
    .delete(
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
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

// Reports Routes
router.route('/reports/pdf')
    .post(
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
        reportController.getAvailableReports
    );

router.route('/reports/download/:filename')
    .get(
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
        requireRole(['Admin']),
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
        requireRole(['Manager', 'HR', 'Admin']),
        [
            param('filename')
                .matches(/^[a-zA-Z0-9\-_.]+$/)
                .withMessage('Invalid filename format')
        ],
        validateRequest,
        reportController.deleteReport
    );

export default router;