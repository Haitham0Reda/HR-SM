import asyncHandler from '../../../core/utils/asyncHandler.js';
import InsuranceClaim from '../models/InsuranceClaim.js';
import InsurancePolicy from '../models/InsurancePolicy.js';
import FamilyMember from '../models/FamilyMember.js';
import User from '../../hr-core/users/models/user.model.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import { ROLES } from '../../../shared/constants/modules.js';
import logger from '../../../utils/logger.js';
import path from 'path';
import fs from 'fs';
import employeeService from '../services/employeeService.js';

/**
 * Helper function to apply role-based access control filtering for claims
 * @param {Object} user - The authenticated user
 * @param {Object} baseQuery - Base query object to extend
 * @returns {Object} - Extended query with role-based filtering
 */
const applyRoleBasedFiltering = async (user, baseQuery = {}) => {
    return await employeeService.applyRoleBasedEmployeeFilter(baseQuery, user);
};

/**
 * Create a new insurance claim
 * @route POST /api/v1/life-insurance/claims
 * @access Private
 */
export const createClaim = asyncHandler(async (req, res) => {
    const {
        policyId,
        claimantType,
        claimantId,
        claimType,
        incidentDate,
        claimAmount,
        description,
        priority = 'medium'
    } = req.body;

    // Validate policy exists and belongs to tenant with automatic tenant scoping
    const policy = await InsurancePolicy.withTenant(req.tenant.id).findOne({
        _id: policyId,
        status: 'active'
    }).populate('employeeId');

    if (!policy) {
        return sendError(res, 'Active insurance policy not found', 404);
    }

    // Self-service restriction: Employees can only create claims for their own policies
    if (req.user.role === ROLES.EMPLOYEE) {
        if (policy.employeeId._id.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only create claims for their own policies', 403);
        }
        
        // Additional validation for employee claims: ensure claimant is either themselves or their family member
        if (claimantType === 'employee') {
            if (claimantId !== req.user._id.toString()) {
                return sendError(res, 'Employees can only create employee claims for themselves', 403);
            }
        } else if (claimantType === 'family_member') {
            // Verify the family member belongs to the employee's policy
            const familyMember = await FamilyMember.withTenant(req.tenant.id).findOne({
                _id: claimantId,
                policyId: policyId,
                employeeId: req.user._id,
                status: 'active'
            });
            
            if (!familyMember) {
                return sendError(res, 'Employees can only create claims for their own family members', 403);
            }
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, policy.employeeId._id, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to create claims for this policy', 403);
        }
    }

    // Validate claimant based on type
    let claimant;
    if (claimantType === 'employee') {
        claimant = await User.withTenant(req.tenant.id).findOne({
            _id: claimantId
        });
        
        if (!claimant || claimant._id.toString() !== policy.employeeId._id.toString()) {
            return sendError(res, 'Claimant must be the policy holder for employee claims', 400);
        }
    } else if (claimantType === 'family_member') {
        claimant = await FamilyMember.withTenant(req.tenant.id).findOne({
            _id: claimantId,
            policyId: policyId,
            status: 'active'
        });
        
        if (!claimant) {
            return sendError(res, 'Family member not found or not covered under this policy', 404);
        }
    } else {
        return sendError(res, 'Invalid claimant type', 400);
    }

    // Validate incident date
    const incident = new Date(incidentDate);
    if (incident > new Date()) {
        return sendError(res, 'Incident date cannot be in the future', 400);
    }

    // Check if incident occurred during policy coverage period
    if (incident < policy.startDate || incident > policy.endDate) {
        return sendError(res, 'Incident must have occurred during policy coverage period', 400);
    }

    // Validate claim amount against policy coverage
    if (claimAmount > policy.coverageAmount) {
        return sendError(res, 'Claim amount cannot exceed policy coverage amount', 400);
    }

    // Set deadlines based on claim type
    const now = new Date();
    const submissionDeadline = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    const reviewDeadline = new Date(now.getTime() + (45 * 24 * 60 * 60 * 1000)); // 45 days

    // Create new claim with automatic tenant context
    const claim = new InsuranceClaim({
        policyId,
        employeeId: policy.employeeId._id,
        claimantType,
        claimantId,
        claimType,
        incidentDate: incident,
        claimAmount,
        description,
        priority,
        submissionDeadline,
        reviewDeadline,
        status: 'pending'
    });

    // Set tenant context for automatic tenant scoping
    claim._tenantId = req.tenant.id;

    // Add initial workflow entry
    claim.workflow.push({
        status: 'pending',
        performedBy: req.user._id,
        timestamp: new Date(),
        notes: 'Claim submitted'
    });

    await claim.save();

    // Populate for response
    await claim.populate([
        { path: 'policyId', select: 'policyNumber policyType coverageAmount' },
        { path: 'employeeId', select: 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position' },
        { path: 'claimantId', refPath: 'claimantModel' }
    ]);

    logger.info('Insurance claim created', {
        tenantId: req.tenant.id,
        claimId: claim._id,
        claimNumber: claim.claimNumber,
        policyId,
        claimType,
        claimAmount,
        createdBy: req.user._id
    });

    sendSuccess(res, claim, 'Insurance claim created successfully', 201);
});

/**
 * Get all claims for tenant
 * @route GET /api/v1/life-insurance/claims
 * @access Private
 */
export const getClaims = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        status,
        claimType,
        priority,
        employeeId,
        policyId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Build base query with automatic tenant scoping
    let query = {};

    if (status) {
        query.status = status;
    }

    if (claimType) {
        query.claimType = claimType;
    }

    if (priority) {
        query.priority = priority;
    }

    if (employeeId) {
        query.employeeId = employeeId;
    }

    if (policyId) {
        query.policyId = policyId;
    }

    // Apply role-based filtering
    query = await applyRoleBasedFiltering(req.user, query);

    // Handle search across claim numbers and descriptions
    if (search) {
        query.$or = [
            { claimNumber: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    // Execute query with pagination and automatic tenant scoping
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [claims, total] = await Promise.all([
        InsuranceClaim.withTenant(req.tenant.id).find(query)
            .populate('policyId', 'policyNumber policyType coverageAmount')
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
            .populate('claimantId', 'firstName lastName relationship')
            .populate('reviewedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit)),
        InsuranceClaim.withTenant(req.tenant.id).countDocuments(query)
    ]);

    const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
    };

    sendSuccess(res, {
        claims,
        pagination
    }, 'Claims retrieved successfully');
});

/**
 * Get single claim by ID
 * @route GET /api/v1/life-insurance/claims/:id
 * @access Private
 */
export const getClaimById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    })
    .populate('policyId', 'policyNumber policyType coverageAmount startDate endDate')
    .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
    .populate('claimantId', 'firstName lastName relationship dateOfBirth')
    .populate('reviewedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email')
    .populate('workflow.performedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName');

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees can only view claims for their own policies
    if (req.user.role === ROLES.EMPLOYEE) {
        if (claim.employeeId._id.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only view claims for their own policies', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId._id, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to view this claim', 403);
        }
    }

    sendSuccess(res, claim, 'Claim retrieved successfully');
});

/**
 * Review claim (approve/reject)
 * @route PATCH /api/v1/life-insurance/claims/:id/review
 * @access Private (Manager, HR, Admin)
 */
export const reviewClaim = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, approvedAmount, reviewNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
        return sendError(res, 'Action must be either approve or reject', 400);
    }

    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    }).populate('policyId');

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees cannot review claims (only managers and above)
    if (req.user.role === ROLES.EMPLOYEE) {
        return sendError(res, 'Employees cannot review claims. Only managers, HR, and admins can review claims', 403);
    }

    // Role-based access control using employee service for other roles
    const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId, req.tenant.id);
    if (!canAccess) {
        return sendError(res, 'Insufficient permissions to review this claim', 403);
    }

    if (!['pending', 'under_review'].includes(claim.status)) {
        return sendError(res, 'Only pending or under review claims can be reviewed', 400);
    }

    if (action === 'approve') {
        if (!approvedAmount || approvedAmount <= 0) {
            return sendError(res, 'Approved amount is required for approval', 400);
        }

        if (approvedAmount > claim.claimAmount) {
            return sendError(res, 'Approved amount cannot exceed claimed amount', 400);
        }

        if (approvedAmount > claim.policyId.coverageAmount) {
            return sendError(res, 'Approved amount cannot exceed policy coverage', 400);
        }

        // Approve the claim
        await claim.approve(approvedAmount, req.user._id, reviewNotes);

        logger.info('Insurance claim approved', {
            tenantId: req.tenant.id,
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            approvedAmount,
            reviewedBy: req.user._id
        });

        sendSuccess(res, claim, 'Claim approved successfully');
    } else {
        // Reject the claim
        if (!reviewNotes) {
            return sendError(res, 'Review notes are required for rejection', 400);
        }

        await claim.reject(req.user._id, reviewNotes);

        logger.info('Insurance claim rejected', {
            tenantId: req.tenant.id,
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            reason: reviewNotes,
            reviewedBy: req.user._id
        });

        sendSuccess(res, claim, 'Claim rejected successfully');
    }
});

/**
 * Process claim payment
 * @route PATCH /api/v1/life-insurance/claims/:id/process-payment
 * @access Private (Manager, HR, Admin)
 */
export const processClaim = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { paymentMethod, paymentReference, paymentDate } = req.body;

    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    });

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees cannot process claim payments (only managers and above)
    if (req.user.role === ROLES.EMPLOYEE) {
        return sendError(res, 'Employees cannot process claim payments. Only managers, HR, and admins can process payments', 403);
    }

    // Role-based access control using employee service for other roles
    const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId, req.tenant.id);
    if (!canAccess) {
        return sendError(res, 'Insufficient permissions to process this claim', 403);
    }

    if (claim.status !== 'approved') {
        return sendError(res, 'Only approved claims can be processed for payment', 400);
    }

    // Update claim with payment information
    claim.status = 'paid';
    claim.paymentMethod = paymentMethod;
    claim.paymentReference = paymentReference;
    claim.paymentDate = paymentDate ? new Date(paymentDate) : new Date();

    // Add workflow entry
    claim.workflow.push({
        status: 'paid',
        performedBy: req.user._id,
        timestamp: new Date(),
        notes: `Payment processed via ${paymentMethod}. Reference: ${paymentReference}`
    });

    await claim.save();

    logger.info('Insurance claim payment processed', {
        tenantId: req.tenant.id,
        claimId: claim._id,
        claimNumber: claim.claimNumber,
        paymentMethod,
        paymentReference,
        paymentAmount: claim.approvedAmount,
        processedBy: req.user._id
    });

    sendSuccess(res, claim, 'Claim payment processed successfully');
});

/**
 * Update claim status
 * @route PATCH /api/v1/life-insurance/claims/:id/status
 * @access Private (Manager, HR, Admin)
 */
export const updateClaimStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return sendError(res, 'Invalid status', 400);
    }

    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    });

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees cannot update claim status (only managers and above)
    if (req.user.role === ROLES.EMPLOYEE) {
        return sendError(res, 'Employees cannot update claim status. Only managers, HR, and admins can update claim status', 403);
    }

    // Role-based access control using employee service for other roles
    const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId, req.tenant.id);
    if (!canAccess) {
        return sendError(res, 'Insufficient permissions to update this claim status', 403);
    }

    // Update status using the model method
    await claim.updateStatus(status, req.user._id, notes);

    logger.info('Insurance claim status updated', {
        tenantId: req.tenant.id,
        claimId: claim._id,
        claimNumber: claim.claimNumber,
        previousStatus: claim.workflow[claim.workflow.length - 2]?.status,
        newStatus: status,
        updatedBy: req.user._id
    });

    sendSuccess(res, claim, 'Claim status updated successfully');
});

/**
 * Get claims by status
 * @route GET /api/v1/life-insurance/claims/by-status/:status
 * @access Private
 */
export const getClaimsByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;
    const { employeeId } = req.query;

    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return sendError(res, 'Invalid status', 400);
    }

    // Build base query
    let query = { status };
    
    if (employeeId) {
        query.employeeId = employeeId;
    }

    // Apply role-based filtering
    query = await applyRoleBasedFiltering(req.user, query);

    const claims = await InsuranceClaim.withTenant(req.tenant.id).find(query)
        .populate('policyId', 'policyNumber policyType')
        .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
        .populate('claimantId', 'firstName lastName relationship');

    sendSuccess(res, claims, `${status} claims retrieved successfully`);
});

/**
 * Get overdue claims
 * @route GET /api/v1/life-insurance/claims/overdue
 * @access Private (Manager, HR, Admin)
 */
export const getOverdueClaims = asyncHandler(async (req, res) => {
    // Apply role-based filtering to overdue claims
    let baseQuery = {};
    baseQuery = await applyRoleBasedFiltering(req.user, baseQuery);

    // Get overdue claims with role-based filtering
    let overdueClaims;
    if (Object.keys(baseQuery).length > 0) {
        // If there are role-based filters, we need to manually filter
        const now = new Date();
        
        const query = {
            ...baseQuery,
            $or: [
                { 
                    status: { $in: ['pending', 'under_review'] },
                    reviewDeadline: { $lt: now }
                },
                {
                    status: 'approved',
                    paymentDate: null,
                    createdAt: { $lt: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)) } // 30 days old
                }
            ]
        };

        overdueClaims = await InsuranceClaim.withTenant(req.tenant.id).find(query)
            .populate('policyId', 'policyNumber policyType')
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
            .populate('claimantId', 'firstName lastName relationship');
    } else {
        // HR/Admin case - use the model method
        overdueClaims = await InsuranceClaim.findOverdueClaims(req.tenant.id)
            .populate('policyId', 'policyNumber policyType')
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
            .populate('claimantId', 'firstName lastName relationship');
    }

    sendSuccess(res, overdueClaims, 'Overdue claims retrieved successfully');
});

/**
 * Get claims statistics
 * @route GET /api/v1/life-insurance/claims/statistics
 * @access Private (Manager, HR, Admin)
 */
export const getClaimsStatistics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let dateRange = null;
    if (startDate && endDate) {
        dateRange = {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        };
    }

    // Apply role-based filtering to statistics
    let baseQuery = {};
    baseQuery = await applyRoleBasedFiltering(req.user, baseQuery);

    const [
        totalClaims,
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        paidClaims,
        statusStats,
        typeStats,
        overdueClaims
    ] = await Promise.all([
        InsuranceClaim.withTenant(req.tenant.id).countDocuments(baseQuery),
        InsuranceClaim.withTenant(req.tenant.id).countDocuments({ ...baseQuery, status: 'pending' }),
        InsuranceClaim.withTenant(req.tenant.id).countDocuments({ ...baseQuery, status: 'approved' }),
        InsuranceClaim.withTenant(req.tenant.id).countDocuments({ ...baseQuery, status: 'rejected' }),
        InsuranceClaim.withTenant(req.tenant.id).countDocuments({ ...baseQuery, status: 'paid' }),
        InsuranceClaim.withTenant(req.tenant.id).aggregate([
            { $match: baseQuery },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        InsuranceClaim.withTenant(req.tenant.id).aggregate([
            { $match: baseQuery },
            { $group: { _id: '$claimType', count: { $sum: 1 }, totalAmount: { $sum: '$claimAmount' } } }
        ]),
        // For overdue claims count, we need to apply the same logic as getOverdueClaims
        (async () => {
            if (Object.keys(baseQuery).length > 0) {
                const now = new Date();
                const overdueQuery = {
                    ...baseQuery,
                    $or: [
                        { 
                            status: { $in: ['pending', 'under_review'] },
                            reviewDeadline: { $lt: now }
                        },
                        {
                            status: 'approved',
                            paymentDate: null,
                            createdAt: { $lt: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)) }
                        }
                    ]
                };
                return await InsuranceClaim.withTenant(req.tenant.id).countDocuments(overdueQuery);
            } else {
                return await InsuranceClaim.findOverdueClaims(req.tenant.id).countDocuments();
            }
        })()
    ]);

    const statistics = {
        totalClaims,
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        paidClaims,
        overdueClaims,
        statusBreakdown: statusStats,
        typeBreakdown: typeStats,
        averageProcessingTime: null // Could be calculated from workflow data
    };

    sendSuccess(res, statistics, 'Claims statistics retrieved successfully');
});

/**
 * Cancel claim
 * @route DELETE /api/v1/life-insurance/claims/:id
 * @access Private (Manager, HR, Admin)
 */
export const cancelClaim = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    });

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees can only cancel their own claims
    if (req.user.role === ROLES.EMPLOYEE) {
        if (claim.employeeId.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only cancel their own claims', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to cancel this claim', 403);
        }
    }

    if (['paid', 'cancelled'].includes(claim.status)) {
        return sendError(res, 'Cannot cancel paid or already cancelled claims', 400);
    }

    // Update status to cancelled
    await claim.updateStatus('cancelled', req.user._id, reason || 'Claim cancelled');

    logger.info('Insurance claim cancelled', {
        tenantId: req.tenant.id,
        claimId: claim._id,
        claimNumber: claim.claimNumber,
        reason,
        cancelledBy: req.user._id
    });

    sendSuccess(res, claim, 'Claim cancelled successfully');
});

/**
 * Upload documents to a claim
 * @route POST /api/v1/life-insurance/claims/:id/documents
 * @access Private
 */
export const uploadClaimDocuments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { documentType, description } = req.body;

    // Find the claim with automatic tenant scoping
    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    });

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees can only upload documents to their own claims
    if (req.user.role === ROLES.EMPLOYEE) {
        if (claim.employeeId.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only upload documents to their own claims', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to upload documents to this claim', 403);
        }
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
        return sendError(res, 'No files uploaded', 400);
    }

    // Validate document type
    const validDocumentTypes = ['medical_report', 'death_certificate', 'police_report', 'invoice', 'receipt', 'other'];
    if (documentType && !validDocumentTypes.includes(documentType)) {
        return sendError(res, 'Invalid document type', 400);
    }

    // Process uploaded files
    const uploadedDocuments = [];
    
    for (const file of req.files) {
        const documentData = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            uploadedBy: req.user._id,
            documentType: documentType || 'other',
            description: description || ''
        };

        // Add document to claim
        claim.documents.push(documentData);
        uploadedDocuments.push(documentData);
    }

    await claim.save();

    logger.info('Documents uploaded to insurance claim', {
        tenantId: req.tenant.id,
        claimId: claim._id,
        claimNumber: claim.claimNumber,
        documentCount: uploadedDocuments.length,
        uploadedBy: req.user._id
    });

    sendSuccess(res, {
        claim: claim._id,
        uploadedDocuments
    }, 'Documents uploaded successfully');
});

/**
 * Get claim documents
 * @route GET /api/v1/life-insurance/claims/:id/documents
 * @access Private
 */
export const getClaimDocuments = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    })
    .select('documents employeeId')
    .populate('documents.uploadedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName');

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees can only view documents for their own claims
    if (req.user.role === ROLES.EMPLOYEE) {
        if (claim.employeeId.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only view documents for their own claims', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to view documents for this claim', 403);
        }
    }

    sendSuccess(res, claim.documents, 'Claim documents retrieved successfully');
});

/**
 * Download claim document
 * @route GET /api/v1/life-insurance/claims/:id/documents/:documentId/download
 * @access Private
 */
export const downloadClaimDocument = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;

    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    });

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees can only download documents from their own claims
    if (req.user.role === ROLES.EMPLOYEE) {
        if (claim.employeeId.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only download documents from their own claims', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to download documents from this claim', 403);
        }
    }

    // Find the document
    const document = claim.documents.id(documentId);
    if (!document) {
        return sendError(res, 'Document not found', 404);
    }

    // Check if file exists
    const filePath = path.join(process.cwd(), 'uploads', 'insurance-documents', document.filename);
    
    if (!fs.existsSync(filePath)) {
        return sendError(res, 'File not found on server', 404);
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimetype);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    logger.info('Insurance claim document downloaded', {
        tenantId: req.tenant.id,
        claimId: claim._id,
        documentId,
        filename: document.originalName,
        downloadedBy: req.user._id
    });
});

/**
 * Delete claim document
 * @route DELETE /api/v1/life-insurance/claims/:id/documents/:documentId
 * @access Private (Manager, HR, Admin)
 */
export const deleteClaimDocument = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;

    const claim = await InsuranceClaim.withTenant(req.tenant.id).findOne({
        _id: id
    });

    if (!claim) {
        return sendError(res, 'Insurance claim not found', 404);
    }

    // Self-service restriction: Employees can only delete documents from their own claims
    if (req.user.role === ROLES.EMPLOYEE) {
        if (claim.employeeId.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only delete documents from their own claims', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, claim.employeeId, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to delete documents from this claim', 403);
        }
    }

    // Find the document
    const document = claim.documents.id(documentId);
    if (!document) {
        return sendError(res, 'Document not found', 404);
    }

    // Store document info for logging
    const documentInfo = {
        filename: document.filename,
        originalName: document.originalName
    };

    // Remove document from database
    claim.documents.pull(documentId);
    await claim.save();

    // Delete physical file
    const filePath = path.join(process.cwd(), 'uploads', 'insurance-documents', document.filename);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            logger.error('Failed to delete physical file', {
                filePath,
                error: error.message
            });
        }
    }

    logger.info('Insurance claim document deleted', {
        tenantId: req.tenant.id,
        claimId: claim._id,
        documentId,
        filename: documentInfo.originalName,
        deletedBy: req.user._id
    });

    sendSuccess(res, null, 'Document deleted successfully');
});

export default {
    createClaim,
    getClaims,
    getClaimById,
    reviewClaim,
    processClaim,
    updateClaimStatus,
    getClaimsByStatus,
    getOverdueClaims,
    getClaimsStatistics,
    cancelClaim,
    uploadClaimDocuments,
    getClaimDocuments,
    downloadClaimDocument,
    deleteClaimDocument
};