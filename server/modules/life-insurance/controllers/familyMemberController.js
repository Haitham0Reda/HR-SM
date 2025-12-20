import asyncHandler from '../../../core/utils/asyncHandler.js';
import FamilyMember from '../models/FamilyMember.js';
import InsurancePolicy from '../models/InsurancePolicy.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import logger from '../../../utils/logger.js';

/**
 * Update family member information
 * @route PUT /api/v1/life-insurance/family-members/:id
 * @access Private
 */
export const updateFamilyMember = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const familyMember = await FamilyMember.findOne({
        _id: id,
        tenantId: req.tenant.id
    });
    
    if (!familyMember) {
        return sendError(res, 'Family member not found', 404);
    }
    
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
    
    const familyMember = await FamilyMember.findOne({
        _id: id,
        tenantId: req.tenant.id
    });
    
    if (!familyMember) {
        return sendError(res, 'Family member not found', 404);
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
    
    const familyMember = await FamilyMember.findOne({
        _id: id,
        tenantId: req.tenant.id,
        status: { $ne: 'removed' }
    })
    .populate('employeeId', 'firstName lastName email employeeId')
    .populate('policyId', 'policyNumber policyType coverageAmount');
    
    if (!familyMember) {
        return sendError(res, 'Family member not found', 404);
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
    
    // Build query
    const query = { 
        tenantId: req.tenant.id,
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
    
    // Handle search across names
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { insuranceNumber: { $regex: search, $options: 'i' } }
        ];
    }
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [familyMembers, total] = await Promise.all([
        FamilyMember.find(query)
            .populate('employeeId', 'firstName lastName email employeeId')
            .populate('policyId', 'policyNumber policyType')
            .sort({ relationship: 1, firstName: 1 })
            .skip(skip)
            .limit(parseInt(limit)),
        FamilyMember.countDocuments(query)
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
    
    const familyMembers = await FamilyMember.findByRelationship(
        req.tenant.id, 
        relationship, 
        employeeId
    )
    .populate('employeeId', 'firstName lastName email employeeId')
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
    
    const children = await FamilyMember.findChildrenUnderAge(
        req.tenant.id, 
        parseInt(maxAge)
    )
    .populate('employeeId', 'firstName lastName email employeeId')
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
    
    const familyMember = await FamilyMember.findOne({
        _id: id,
        tenantId: req.tenant.id
    });
    
    if (!familyMember) {
        return sendError(res, 'Family member not found', 404);
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
    
    const [
        totalFamilyMembers,
        activeFamilyMembers,
        relationshipStats,
        ageStats
    ] = await Promise.all([
        FamilyMember.countDocuments({ tenantId, status: { $ne: 'removed' } }),
        FamilyMember.countDocuments({ tenantId, status: 'active' }),
        FamilyMember.aggregate([
            { $match: { tenantId: req.tenant.id, status: 'active' } },
            { $group: { _id: '$relationship', count: { $sum: 1 } } }
        ]),
        FamilyMember.aggregate([
            { $match: { tenantId: req.tenant.id, status: 'active' } },
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