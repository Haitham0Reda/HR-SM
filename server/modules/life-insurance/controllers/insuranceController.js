import asyncHandler from '../../../core/utils/asyncHandler.js';
import InsurancePolicy from '../models/InsurancePolicy.js';
import FamilyMember from '../models/FamilyMember.js';
import User from '../../hr-core/users/models/user.model.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import logger from '../../../utils/logger.js';

/**
 * Create a new insurance policy
 * @route POST /api/v1/life-insurance/policies
 * @access Private (Manager, HR, Admin)
 */
export const createPolicy = asyncHandler(async (req, res) => {
    const { employeeId, policyType, coverageAmount, premium, startDate, endDate, deductible = 0 } = req.body;
    
    // Validate employee exists and belongs to tenant
    const employee = await User.findOne({
        _id: employeeId,
        tenantId: req.tenant.id
    });
    
    if (!employee) {
        return sendError(res, 'Employee not found', 404);
    }
    
    // Check for existing active policy for this employee
    const existingPolicy = await InsurancePolicy.findOne({
        tenantId: req.tenant.id,
        employeeId,
        status: 'active'
    });
    
    if (existingPolicy) {
        return sendError(res, 'Employee already has an active insurance policy', 400);
    }
    
    // Validate dates
    const policyStartDate = new Date(startDate);
    const policyEndDate = new Date(endDate);
    
    if (policyStartDate >= policyEndDate) {
        return sendError(res, 'End date must be after start date', 400);
    }
    
    // Create new policy
    const policy = new InsurancePolicy({
        tenantId: req.tenant.id,
        employeeId,
        employeeNumber: employee.employeeId || employee._id.toString(),
        policyType,
        coverageAmount,
        premium,
        deductible,
        startDate: policyStartDate,
        endDate: policyEndDate
    });
    
    // Add creation history entry
    policy.history.push({
        action: 'created',
        performedBy: req.user._id,
        timestamp: new Date(),
        notes: 'Initial policy creation'
    });
    
    await policy.save();
    
    // Populate employee information for response
    await policy.populate('employeeId', 'firstName lastName email employeeId');
    
    logger.info('Insurance policy created', {
        tenantId: req.tenant.id,
        policyId: policy._id,
        policyNumber: policy.policyNumber,
        employeeId,
        createdBy: req.user._id
    });
    
    sendSuccess(res, policy, 'Insurance policy created successfully', 201);
});

/**
 * Get all insurance policies for tenant
 * @route GET /api/v1/life-insurance/policies
 * @access Private
 */
export const getPolicies = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        status, 
        policyType, 
        employeeId,
        search 
    } = req.query;
    
    // Build query
    const query = { tenantId: req.tenant.id };
    
    if (status) {
        query.status = status;
    }
    
    if (policyType) {
        query.policyType = policyType;
    }
    
    if (employeeId) {
        query.employeeId = employeeId;
    }
    
    // Handle search across employee names and policy numbers
    if (search) {
        // First find employees matching the search term
        const matchingEmployees = await User.find({
            tenantId: req.tenant.id,
            $or: [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } }
            ]
        }).select('_id');
        
        const employeeIds = matchingEmployees.map(emp => emp._id);
        
        query.$or = [
            { policyNumber: { $regex: search, $options: 'i' } },
            { employeeId: { $in: employeeIds } }
        ];
    }
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [policies, total] = await Promise.all([
        InsurancePolicy.find(query)
            .populate('employeeId', 'firstName lastName email employeeId department position')
            .populate('familyMembers')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        InsurancePolicy.countDocuments(query)
    ]);
    
    const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
    };
    
    sendSuccess(res, {
        policies,
        pagination
    }, 'Policies retrieved successfully');
});

/**
 * Get single insurance policy by ID
 * @route GET /api/v1/life-insurance/policies/:id
 * @access Private
 */
export const getPolicyById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const policy = await InsurancePolicy.findOne({
        _id: id,
        tenantId: req.tenant.id
    })
    .populate('employeeId', 'firstName lastName email employeeId department position')
    .populate('familyMembers')
    .populate('beneficiaries')
    .populate('claims');
    
    if (!policy) {
        return sendError(res, 'Insurance policy not found', 404);
    }
    
    sendSuccess(res, policy, 'Policy retrieved successfully');
});

/**
 * Update insurance policy
 * @route PUT /api/v1/life-insurance/policies/:id
 * @access Private (Manager, HR, Admin)
 */
export const updatePolicy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const policy = await InsurancePolicy.findOne({
        _id: id,
        tenantId: req.tenant.id
    });
    
    if (!policy) {
        return sendError(res, 'Insurance policy not found', 404);
    }
    
    // Store previous values for history
    const previousValues = {};
    const allowedUpdates = ['policyType', 'coverageAmount', 'premium', 'deductible', 'endDate', 'status', 'notes'];
    
    allowedUpdates.forEach(field => {
        if (updates[field] !== undefined && updates[field] !== policy[field]) {
            previousValues[field] = policy[field];
            policy[field] = updates[field];
        }
    });
    
    // Add history entry if there were changes
    if (Object.keys(previousValues).length > 0) {
        policy.history.push({
            action: 'updated',
            performedBy: req.user._id,
            timestamp: new Date(),
            notes: updates.notes || 'Policy updated',
            previousValues
        });
    }
    
    await policy.save();
    
    // Populate for response
    await policy.populate('employeeId', 'firstName lastName email employeeId');
    
    logger.info('Insurance policy updated', {
        tenantId: req.tenant.id,
        policyId: policy._id,
        policyNumber: policy.policyNumber,
        updatedBy: req.user._id,
        changes: Object.keys(previousValues)
    });
    
    sendSuccess(res, policy, 'Policy updated successfully');
});

/**
 * Delete insurance policy
 * @route DELETE /api/v1/life-insurance/policies/:id
 * @access Private (Admin only)
 */
export const deletePolicy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const policy = await InsurancePolicy.findOne({
        _id: id,
        tenantId: req.tenant.id
    });
    
    if (!policy) {
        return sendError(res, 'Insurance policy not found', 404);
    }
    
    // Check if policy has active claims
    const activeClaims = await policy.populate('claims');
    const hasActiveClaims = activeClaims.claims.some(
        claim => ['pending', 'under_review', 'approved'].includes(claim.status)
    );
    
    if (hasActiveClaims) {
        return sendError(res, 'Cannot delete policy with active claims', 400);
    }
    
    // Soft delete by setting status to cancelled
    policy.status = 'cancelled';
    policy.history.push({
        action: 'cancelled',
        performedBy: req.user._id,
        timestamp: new Date(),
        notes: 'Policy deleted by admin'
    });
    
    await policy.save();
    
    logger.info('Insurance policy deleted', {
        tenantId: req.tenant.id,
        policyId: policy._id,
        policyNumber: policy.policyNumber,
        deletedBy: req.user._id
    });
    
    sendSuccess(res, null, 'Policy deleted successfully');
});

/**
 * Add family member to policy
 * @route POST /api/v1/life-insurance/policies/:policyId/family-members
 * @access Private
 */
export const addFamilyMember = asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    const familyMemberData = req.body;
    
    // Find and validate policy
    const policy = await InsurancePolicy.findOne({
        _id: policyId,
        tenantId: req.tenant.id
    });
    
    if (!policy) {
        return sendError(res, 'Insurance policy not found', 404);
    }
    
    if (policy.status !== 'active') {
        return sendError(res, 'Can only add family members to active policies', 400);
    }
    
    // Validate relationship and age for children
    if (familyMemberData.relationship === 'child') {
        const birthDate = new Date(familyMemberData.dateOfBirth);
        const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (age >= 25) {
            return sendError(res, 'Children must be under 25 years old for coverage', 400);
        }
    }
    
    // Create family member
    const familyMember = new FamilyMember({
        tenantId: req.tenant.id,
        employeeId: policy.employeeId,
        policyId: policy._id,
        ...familyMemberData,
        coverageStartDate: policy.startDate,
        coverageEndDate: policy.endDate,
        coverageAmount: familyMemberData.coverageAmount || policy.coverageAmount * 0.5 // Default to 50% of policy amount
    });
    
    await familyMember.save();
    
    // Add family member to policy
    await policy.addFamilyMember(familyMember._id);
    
    logger.info('Family member added to policy', {
        tenantId: req.tenant.id,
        policyId: policy._id,
        familyMemberId: familyMember._id,
        insuranceNumber: familyMember.insuranceNumber,
        addedBy: req.user._id
    });
    
    sendSuccess(res, familyMember, 'Family member added successfully', 201);
});

/**
 * Get family members for a policy
 * @route GET /api/v1/life-insurance/policies/:policyId/family-members
 * @access Private
 */
export const getFamilyMembers = asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    
    // Verify policy exists and belongs to tenant
    const policy = await InsurancePolicy.findOne({
        _id: policyId,
        tenantId: req.tenant.id
    });
    
    if (!policy) {
        return sendError(res, 'Insurance policy not found', 404);
    }
    
    const familyMembers = await FamilyMember.find({
        policyId,
        tenantId: req.tenant.id,
        status: { $ne: 'removed' }
    }).sort({ relationship: 1, createdAt: 1 });
    
    sendSuccess(res, familyMembers, 'Family members retrieved successfully');
});

/**
 * Get policies expiring soon
 * @route GET /api/v1/life-insurance/policies/expiring
 * @access Private (Manager, HR, Admin)
 */
export const getExpiringPolicies = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    
    const expiringPolicies = await InsurancePolicy.findExpiringPolicies(
        req.tenant.id, 
        parseInt(days)
    ).populate('employeeId', 'firstName lastName email employeeId');
    
    sendSuccess(res, expiringPolicies, `Policies expiring in next ${days} days retrieved successfully`);
});

/**
 * Get policy statistics
 * @route GET /api/v1/life-insurance/policies/statistics
 * @access Private (Manager, HR, Admin)
 */
export const getPolicyStatistics = asyncHandler(async (req, res) => {
    const tenantId = req.tenant.id;
    
    const [
        totalPolicies,
        activePolicies,
        expiredPolicies,
        policyTypeStats,
        coverageStats
    ] = await Promise.all([
        InsurancePolicy.countDocuments({ tenantId }),
        InsurancePolicy.countDocuments({ tenantId, status: 'active' }),
        InsurancePolicy.countDocuments({ tenantId, status: 'expired' }),
        InsurancePolicy.aggregate([
            { $match: { tenantId: req.tenant.id } },
            { $group: { _id: '$policyType', count: { $sum: 1 } } }
        ]),
        InsurancePolicy.aggregate([
            { $match: { tenantId: req.tenant.id, status: 'active' } },
            {
                $group: {
                    _id: null,
                    totalCoverage: { $sum: '$coverageAmount' },
                    averageCoverage: { $avg: '$coverageAmount' },
                    totalPremiums: { $sum: '$premium' }
                }
            }
        ])
    ]);
    
    const statistics = {
        totalPolicies,
        activePolicies,
        expiredPolicies,
        inactivePolicies: totalPolicies - activePolicies - expiredPolicies,
        policyTypeBreakdown: policyTypeStats,
        coverage: coverageStats[0] || {
            totalCoverage: 0,
            averageCoverage: 0,
            totalPremiums: 0
        }
    };
    
    sendSuccess(res, statistics, 'Policy statistics retrieved successfully');
});

export default {
    createPolicy,
    getPolicies,
    getPolicyById,
    updatePolicy,
    deletePolicy,
    addFamilyMember,
    getFamilyMembers,
    getExpiringPolicies,
    getPolicyStatistics
};