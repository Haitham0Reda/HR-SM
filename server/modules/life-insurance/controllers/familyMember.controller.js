import asyncHandler from '../../../core/utils/asyncHandler.js';
import FamilyMember from '../models/FamilyMember.js';
import InsurancePolicy from '../models/InsurancePolicy.js';
import User from '../../hr-core/users/models/user.model.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import { ROLES } from '../../../shared/constants/modules.js';
import logger from '../../../utils/logger.js';
import employeeService from '../services/employeeService.js';
import auditService from '../services/auditService.js';

/**
 * Helper function to apply role-based access control filtering for family members
 * @param {Object} user - The authenticated user
 * @param {Object} baseQuery - Base query object to extend
 * @returns {Object} - Extended query with role-based filtering
 */
const applyRoleBasedFiltering = async (user, baseQuery = {}) => {
    return await employeeService.applyRoleBasedEmployeeFilter(baseQuery, user);
};

/**
 * Update family member information
 * @route PUT /api/v1/life-insurance/family-members/:id
 * @access Private
 */
export const updateFamilyMember = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Log authentication event for family member update attempt
    await auditService.logInsuranceAuthEvent(req, 'family-member-update-attempt', {
        familyMemberId: id,
        updates: Object.keys(updates)
    });
    
    const familyMember = await FamilyMember.withTenant(req.tenant.id).findOne({
        _id: id
    });
    
    if (!familyMember) {
        await auditService.logAccessDenied(req, 'family-member-update', 'family-member-not-found', {
            familyMemberId: id
        });
        return sendError(res, 'Family member not found', 404);
    }
    
    // Self-service restriction: Employees can only update family members on their own policies
    if (req.user.role === ROLES.EMPLOYEE) {
        if (familyMember.employeeId.toString() !== req.user._id.toString()) {
            await auditService.logAccessDenied(req, 'family-member-update', 'self-service-violation', {
                familyMemberId: id,
                familyMemberEmployeeId: familyMember.employeeId,
                requestingUserId: req.user._id,
                userRole: req.user.role
            });
            return sendError(res, 'Employees can only update family members on their own policies', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, familyMember.employeeId, req.tenant.id);
        if (!canAccess) {
            await auditService.logAccessDenied(req, 'family-member-update', 'insufficient-permissions', {
                familyMemberId: id,
                familyMemberEmployeeId: familyMember.employeeId,
                userRole: req.user.role
            });
            return sendError(res, 'Insufficient permissions to update this family member', 403);
        }
    }

    // Log successful authorization
    await auditService.logInsuranceAuthorizationEvent(req, 'update-family-member', `family-member:${id}`, true, {
        familyMemberEmployeeId: familyMember.employeeId,
        relationship: familyMember.relationship
    });
    
    // Validate relationship and age for children if being updated
    if (updates.relationship === 'child' || (familyMember.relationship === 'child' && updates.dateOfBirth)) {
        const birthDate = new Date(updates.dateOfBirth || familyMember.dateOfBirth);
        const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (age >= 25) {
            return sendError(res, 'Children must be under 25 years old for coverage', 400);
        }
    }
    
    // Update allowed fields
    const allowedUpdates = [
        'firstName', 'lastName', 'dateOfBirth', 'gender', 'relationship',
        'phone', 'email', 'address', 'coverageAmount', 'status', 'notes', 'emergencyContact'
    ];
    
    allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
            familyMember[field] = updates[field];
        }
    });
    
    await familyMember.save();
    
    logger.info('Family member updated', {
        tenantId: req.tenant.id,
        familyMemberId: familyMember._id,
        insuranceNumber: familyMember.insuranceNumber,
        updatedBy: req.user._id
    });
    
    sendSuccess(res, familyMember, 'Family member updated successfully');
});

/**
 * Remove family member from policy
 * @route DELETE /api/v1/life-insurance/family-members/:id
 * @access Private (Manager, HR, Admin)
 */
export const removeFamilyMember = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const familyMember = await FamilyMember.withTenant(req.tenant.id).findOne({
        _id: id
    });
    
    if (!familyMember) {
        return sendError(res, 'Family member not found', 404);
    }
    
    // Self-service restriction: Employees can only remove family members from their own policies
    if (req.user.role === ROLES.EMPLOYEE) {
        if (familyMember.employeeId.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only remove family members from their own policies', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, familyMember.employeeId, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to remove this family member', 403);
        }
    }
    
    // Soft delete by setting status to removed
    familyMember.status = 'removed';
    await familyMember.save();
    
    // Remove from policy's family members array
    const policy = await InsurancePolicy.findById(familyMember.policyId);
    if (policy) {
        await policy.removeFamilyMember(familyMember._id);
    }
    
    logger.info('Family member removed', {
        tenantId: req.tenant.id,
        familyMemberId: familyMember._id,
        insuranceNumber: familyMember.insuranceNumber,
        policyId: familyMember.policyId,
        removedBy: req.user._id
    });
    
    sendSuccess(res, null, 'Family member removed successfully');
});

/**
 * Get family member by ID
 * @route GET /api/v1/life-insurance/family-members/:id
 * @access Private
 */
export const getFamilyMemberById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const familyMember = await FamilyMember.withTenant(req.tenant.id).findOne({
        _id: id,
        status: { $ne: 'removed' }
    })
    .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
    .populate('policyId', 'policyNumber policyType coverageAmount');
    
    if (!familyMember) {
        return sendError(res, 'Family member not found', 404);
    }
    
    // Self-service restriction: Employees can only view family members on their own policies
    if (req.user.role === ROLES.EMPLOYEE) {
        if (familyMember.employeeId._id.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only view family members on their own policies', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, familyMember.employeeId._id, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to view this family member', 403);
        }
    }
    
    sendSuccess(res, familyMember, 'Family member retrieved successfully');
});

/**
 * Get all family members for tenant (with filtering)
 * @route GET /api/v1/life-insurance/family-members
 * @access Private
 */
export const getFamilyMembers = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        relationship, 
        status = 'active',
        employeeId,
        policyId,
        search 
    } = req.query;
    
    // Build base query with automatic tenant scoping
    let query = { 
        status: { $ne: 'removed' }
    };
    
    if (status && status !== 'all') {
        query.status = status;
    }
    
    if (relationship) {
        query.relationship = relationship;
    }
    
    if (employeeId) {
        query.employeeId = employeeId;
    }
    
    if (policyId) {
        query.policyId = policyId;
    }
    
    // Apply role-based filtering
    query = await applyRoleBasedFiltering(req.user, query);
    
    // Handle search across names
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { insuranceNumber: { $regex: search, $options: 'i' } }
        ];
    }
    
    // Execute query with pagination and automatic tenant scoping
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [familyMembers, total] = await Promise.all([
        FamilyMember.withTenant(req.tenant.id).find(query)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
            .populate('policyId', 'policyNumber policyType')
            .sort({ relationship: 1, firstName: 1 })
            .skip(skip)
            .limit(parseInt(limit)),
        FamilyMember.withTenant(req.tenant.id).countDocuments(query)
    ]);
    
    const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
    };
    
    sendSuccess(res, {
        familyMembers,
        pagination
    }, 'Family members retrieved successfully');
});

/**
 * Get family members by relationship type
 * @route GET /api/v1/life-insurance/family-members/by-relationship/:relationship
 * @access Private
 */
export const getFamilyMembersByRelationship = asyncHandler(async (req, res) => {
    const { relationship } = req.params;
    const { employeeId } = req.query;
    
    const validRelationships = ['spouse', 'child', 'parent'];
    if (!validRelationships.includes(relationship)) {
        return sendError(res, 'Invalid relationship type', 400);
    }
    
    // Build base query
    let query = {
        relationship,
        status: 'active'
    };
    
    if (employeeId) {
        query.employeeId = employeeId;
    }
    
    // Apply role-based filtering
    query = await applyRoleBasedFiltering(req.user, query);
    
    const familyMembers = await FamilyMember.withTenant(req.tenant.id).find(query)
        .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
        .populate('policyId', 'policyNumber policyType');
    
    sendSuccess(res, familyMembers, `${relationship} family members retrieved successfully`);
});

/**
 * Get children under age limit
 * @route GET /api/v1/life-insurance/family-members/children-under-age
 * @access Private (Manager, HR, Admin)
 */
export const getChildrenUnderAge = asyncHandler(async (req, res) => {
    const { maxAge = 25 } = req.query;
    
    // Build base query for children under age
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - parseInt(maxAge));
    
    let query = {
        relationship: 'child',
        status: 'active',
        dateOfBirth: { $gte: cutoffDate }
    };
    
    // Apply role-based filtering
    query = await applyRoleBasedFiltering(req.user, query);
    
    const children = await FamilyMember.withTenant(req.tenant.id).find(query)
        .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
        .populate('policyId', 'policyNumber policyType');
    
    sendSuccess(res, children, `Children under ${maxAge} years retrieved successfully`);
});

/**
 * Update family member coverage
 * @route PATCH /api/v1/life-insurance/family-members/:id/coverage
 * @access Private (Manager, HR, Admin)
 */
export const updateFamilyMemberCoverage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { coverageStartDate, coverageEndDate, coverageAmount } = req.body;
    
    const familyMember = await FamilyMember.withTenant(req.tenant.id).findOne({
        _id: id
    });
    
    if (!familyMember) {
        return sendError(res, 'Family member not found', 404);
    }
    
    // Self-service restriction: Employees can only update coverage for family members on their own policies
    if (req.user.role === ROLES.EMPLOYEE) {
        if (familyMember.employeeId.toString() !== req.user._id.toString()) {
            return sendError(res, 'Employees can only update coverage for family members on their own policies', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, familyMember.employeeId, req.tenant.id);
        if (!canAccess) {
            return sendError(res, 'Insufficient permissions to update coverage for this family member', 403);
        }
    }
    
    // Validate dates if provided
    if (coverageStartDate && coverageEndDate) {
        const startDate = new Date(coverageStartDate);
        const endDate = new Date(coverageEndDate);
        
        if (startDate >= endDate) {
            return sendError(res, 'Coverage end date must be after start date', 400);
        }
    }
    
    await familyMember.updateCoverage(
        coverageStartDate ? new Date(coverageStartDate) : familyMember.coverageStartDate,
        coverageEndDate ? new Date(coverageEndDate) : familyMember.coverageEndDate,
        coverageAmount
    );
    
    logger.info('Family member coverage updated', {
        tenantId: req.tenant.id,
        familyMemberId: familyMember._id,
        insuranceNumber: familyMember.insuranceNumber,
        updatedBy: req.user._id
    });
    
    sendSuccess(res, familyMember, 'Family member coverage updated successfully');
});

/**
 * Get family member statistics
 * @route GET /api/v1/life-insurance/family-members/statistics
 * @access Private (Manager, HR, Admin)
 */
export const getFamilyMemberStatistics = asyncHandler(async (req, res) => {
    const tenantId = req.tenant.id;
    
    // Apply role-based filtering to statistics
    let baseQuery = {};
    baseQuery = await applyRoleBasedFiltering(req.user, baseQuery);
    
    const [
        totalFamilyMembers,
        activeFamilyMembers,
        relationshipStats,
        ageStats
    ] = await Promise.all([
        FamilyMember.withTenant(req.tenant.id).countDocuments({ ...baseQuery, status: { $ne: 'removed' } }),
        FamilyMember.withTenant(req.tenant.id).countDocuments({ ...baseQuery, status: 'active' }),
        FamilyMember.withTenant(req.tenant.id).aggregate([
            { $match: { ...baseQuery, status: 'active' } },
            { $group: { _id: '$relationship', count: { $sum: 1 } } }
        ]),
        FamilyMember.withTenant(req.tenant.id).aggregate([
            { $match: { ...baseQuery, status: 'active' } },
            {
                $project: {
                    relationship: 1,
                    age: {
                        $floor: {
                            $divide: [
                                { $subtract: [new Date(), '$dateOfBirth'] },
                                365.25 * 24 * 60 * 60 * 1000
                            ]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$relationship',
                    averageAge: { $avg: '$age' },
                    minAge: { $min: '$age' },
                    maxAge: { $max: '$age' }
                }
            }
        ])
    ]);
    
    const statistics = {
        totalFamilyMembers,
        activeFamilyMembers,
        inactiveFamilyMembers: totalFamilyMembers - activeFamilyMembers,
        relationshipBreakdown: relationshipStats,
        ageStatistics: ageStats
    };
    
    sendSuccess(res, statistics, 'Family member statistics retrieved successfully');
});

export default {
    updateFamilyMember,
    removeFamilyMember,
    getFamilyMemberById,
    getFamilyMembers,
    getFamilyMembersByRelationship,
    getChildrenUnderAge,
    updateFamilyMemberCoverage,
    getFamilyMemberStatistics
};