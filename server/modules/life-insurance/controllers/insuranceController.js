import asyncHandler from '../../../core/utils/asyncHandler.js';
import InsurancePolicy from '../models/InsurancePolicy.js';
import FamilyMember from '../models/FamilyMember.js';
import User from '../../hr-core/users/models/user.model.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import logger from '../../../utils/logger.js';

/**
 * Create a new insurance policy
 * @route POST /api/v1/life-insurance/policies
 * @access Private (Employee can create for self, Manager/HR/Admin can create for any employee)
 */
export const createPolicy = asyncHandler(async (req, res) => {
    const { employeeId, policyType, coverageAmount, premium, startDate, endDate, deductible = 0 } = req.body;

    console.log('🔍 CREATE POLICY - Received employeeId:', employeeId);
    console.log('🔍 CREATE POLICY - Tenant ID:', req.tenant.id);

    // Find employee by either MongoDB ObjectId or employeeId string
    let employee;
    
    // Check if employeeId is a valid MongoDB ObjectId
    const mongoose = await import('mongoose');
    if (mongoose.default.Types.ObjectId.isValid(employeeId)) {
        console.log('🔍 Searching by MongoDB ObjectId...');
        // Search by MongoDB _id
        employee = await User.findOne({
            _id: employeeId,
            tenantId: req.tenant.id
        });
    } else {
        console.log('🔍 Searching by employeeId string...');
        // Search by employeeId string field
        employee = await User.findOne({
            employeeId: employeeId,
            tenantId: req.tenant.id
        });
    }

    console.log('🔍 Found employee:', employee ? {
        id: employee._id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email
    } : 'NOT FOUND');

    if (!employee) {
        // Debug: Show available employees to help identify correct IDs
        const availableEmployees = await User.find({ tenantId: req.tenant.id }).select('_id employeeId email firstName lastName');
        console.log('🔍 Available employees in database:');
        availableEmployees.forEach(emp => {
            console.log(`  - MongoDB ID: ${emp._id}`);
            console.log(`  - Employee ID: ${emp.employeeId || 'NOT SET'}`);
            console.log(`  - Name: ${emp.firstName} ${emp.lastName}`);
            console.log(`  - Email: ${emp.email}`);
            console.log('  ---');
        });
        
        return sendError(res, `Employee not found. Frontend is sending: "${employeeId}" but database has different IDs. Check server logs for available employee IDs.`, 404);
    }

    // If user is an employee, they can only create policies for themselves
    if (req.user.role === 'employee' && employee._id.toString() !== req.user._id.toString()) {
        return sendError(res, 'Employees can only create policies for themselves', 403);
    }

    // Check for existing active policy for this employee
    const existingPolicy = await InsurancePolicy.findOne({
        tenantId: req.tenant.id,
        employeeId: employee._id,
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
        employeeId: employee._id,
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
        notes: req.user.role === 'employee' ? 'Self-enrollment' : 'Initial policy creation'
    });

    await policy.save();

    // Populate employee information for response
    await policy.populate('employeeId', 'firstName lastName email employeeId');

    logger.info('Insurance policy created', {
        tenantId: req.tenant.id,
        policyId: policy._id,
        policyNumber: policy.policyNumber,
        employeeId: employee._id,
        createdBy: req.user._id,
        selfEnrollment: req.user.role === 'employee'
    });

    sendSuccess(res, policy, 'Insurance policy created successfully', 201);
});

/**
 * Get all insurance policies for tenant
 * @route GET /api/v1/life-insurance/policies
 * @access Private
 */
export const getPolicies = asyncHandler(async (req, res) => {
    console.log('🔍 getPolicies called');
    console.log('🔍 Query params:', req.query);
    console.log('🔍 User:', req.user?.email, req.user?._id);
    console.log('🔍 Tenant:', req.tenant?.id);

    const {
        page = 1,
        limit = 10,
        status,
        policyType,
        employeeId,
        search
    } = req.query;

    try {
        // Build query
        const query = { tenantId: req.tenant.id };
        console.log('🔍 Base query:', query);

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
            console.log('🔍 Search term:', search);
            // First find employees matching the search term
            const matchingEmployees = await User.find({
                tenantId: req.tenant.id,
                $or: [
                    { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
                    { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
                    { 'personalInfo.fullName': { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { employeeId: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            const employeeIds = matchingEmployees.map(emp => emp._id);
            console.log('🔍 Matching employee IDs:', employeeIds);

            query.$or = [
                { policyNumber: { $regex: search, $options: 'i' } },
                { employeeId: { $in: employeeIds } }
            ];
        }

        console.log('🔍 Final query:', JSON.stringify(query, null, 2));

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        console.log('🔍 Pagination - skip:', skip, 'limit:', limit);

const [policies, total] = await Promise.all([
            InsurancePolicy.find(query)
                .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
                .populate('familyMembers')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            InsurancePolicy.countDocuments(query)
        ]);

        console.log('✅ Found policies:', policies.length);
        console.log('✅ Total matching query:', total);

        if (policies.length > 0) {
            console.log('✅ First policy:', {
                id: policies[0]._id,
                policyNumber: policies[0].policyNumber,
                tenantId: policies[0].tenantId,
                employeeId: policies[0].employeeId
            });
        }

        const pagination = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
        };

        console.log('✅ Pagination:', pagination);

        sendSuccess(res, {
            policies,
            pagination
        }, 'Policies retrieved successfully');

    } catch (error) {
        console.error('❌ Error in getPolicies:', error);
        throw error;
    }
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
        .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
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
    await policy.populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId');

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
    policy.familyMembers.push(familyMember._id);
    await policy.save();

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
    ).populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId');

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