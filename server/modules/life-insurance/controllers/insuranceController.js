import asyncHandler from '../../../core/utils/asyncHandler.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import { ROLES } from '../../../shared/constants/modules.js';
import mongoose from 'mongoose';
import logger from '../../../utils/logger.js';
import employeeService from '../services/employeeService.js';
import moduleConfigService from '../services/moduleConfigService.js';
import auditService from '../services/auditService.js';
import multiTenantDB from '../../../config/multiTenant.js';

/**
 * Get InsurancePolicy model for tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<mongoose.Model>} - InsurancePolicy model for the tenant
 */
const getInsurancePolicyModel = async (tenantId) => {
    try {
        const connection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register InsurancePolicy model if it doesn't exist
        if (!connection.models.InsurancePolicy) {
            const { default: InsurancePolicy } = await import('../models/InsurancePolicy.js');
            connection.model('InsurancePolicy', InsurancePolicy.schema);
        }
        
        // Register related models
        const modelsToRegister = [
            { name: 'FamilyMember', path: '../models/FamilyMember.js' },
            { name: 'Beneficiary', path: '../models/Beneficiary.js' },
            { name: 'InsuranceClaim', path: '../models/InsuranceClaim.js' },
            { name: 'User', path: '../../hr-core/users/models/user.model.js' },
            { name: 'Department', path: '../../hr-core/users/models/department.model.js' },
            { name: 'Position', path: '../../hr-core/users/models/position.model.js' }
        ];

        for (const modelInfo of modelsToRegister) {
            if (!connection.models[modelInfo.name]) {
                try {
                    const { default: Model } = await import(modelInfo.path);
                    connection.model(modelInfo.name, Model.schema);
                } catch (error) {
                    console.warn(`Could not register ${modelInfo.name} model:`, error.message);
                }
            }
        }
        
        return connection.model('InsurancePolicy');
    } catch (error) {
        console.error('Error getting InsurancePolicy model for tenant:', tenantId, error);
        throw error;
    }
};

/**
 * Get FamilyMember model for tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<mongoose.Model>} - FamilyMember model for the tenant
 */
const getFamilyMemberModel = async (tenantId) => {
    try {
        const connection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register FamilyMember model if it doesn't exist
        if (!connection.models.FamilyMember) {
            const { default: FamilyMember } = await import('../models/FamilyMember.js');
            connection.model('FamilyMember', FamilyMember.schema);
        }
        
        return connection.model('FamilyMember');
    } catch (error) {
        console.error('Error getting FamilyMember model for tenant:', tenantId, error);
        throw error;
    }
};

/**
 * Helper function to apply role-based access control filtering
 * @param {Object} user - The authenticated user
 * @param {Object} baseQuery - Base query object to extend
 * @returns {Object} - Extended query with role-based filtering
 */
const applyRoleBasedFiltering = async (user, baseQuery = {}) => {
    return await employeeService.applyRoleBasedEmployeeFilter(baseQuery, user);
};



/**
 * Create a new insurance policy
 * @route POST /api/v1/life-insurance/policies
 * @access Private (Employee can create for self, Manager/HR/Admin can create for any employee)
 */
export const createPolicy = asyncHandler(async (req, res) => {
    const { employeeId, policyType, coverageAmount, premium, startDate, endDate, deductible = 0 } = req.body;

    // Debug: Check authentication
    console.log('Request user:', {
        user: req.user,
        tenant: req.tenant,
        headers: req.headers.authorization ? 'Present' : 'Missing'
    });

    // Log authentication event for policy creation attempt (non-blocking)
    auditService.logInsuranceAuthEvent(req, 'policy-creation-attempt', {
        employeeId,
        policyType,
        coverageAmount
    }).catch(err => {
        console.warn('Audit logging failed:', err.message);
    });

    // Check if policy management feature is available
    if (!req.availableFeatures?.policyManagement) {
        auditService.logAccessDenied(req, 'policy-creation', 'feature-not-available', {
            requestedFeature: 'policyManagement',
            subscriptionPlan: req.moduleConfig?.subscription?.plan
        }).catch(err => console.warn('Audit logging failed:', err.message));
        return sendError(res, 'Policy management feature is not available for your subscription plan', 403);
    }

    // Get module settings for validation
    const moduleSettings = req.moduleSettings;
    
    // Validate employee identifier format
    const validation = employeeService.validateEmployeeIdentifier(employeeId);
    if (!validation.isValid) {
        auditService.logAccessDenied(req, 'policy-creation', 'invalid-employee-id', {
            employeeId,
            validationError: validation.message
        }).catch(err => console.warn('Audit logging failed:', err.message));
        return sendError(res, validation.message, 400);
    }

    // Debug: Log what we're looking for
    console.log('Looking for employee:', {
        employeeId,
        tenantId: req.tenant.id,
        userRole: req.user.role,
        userId: req.user._id || req.user.id
    });

    console.log('About to call employeeService.findEmployeeForPolicy...');
    
    // Find employee using standardized employee lookup service
    const employee = await employeeService.findEmployeeForPolicy(employeeId, req.tenant.id, req.user);
    
    console.log('employeeService.findEmployeeForPolicy returned:', employee ? 'Found employee' : 'No employee found');

    console.log('Employee lookup result:', employee ? 'Found' : 'Not found');
    if (employee) {
        console.log('Found employee:', {
            id: employee._id,
            employeeId: employee.employeeId,
            name: employee.personalInfo?.fullName || employee.name
        });
    }

    if (!employee) {
        auditService.logAccessDenied(req, 'policy-creation', 'employee-not-found-or-access-denied', {
            employeeId,
            userRole: req.user.role
        }).catch(err => console.warn('Audit logging failed:', err.message));
        return sendError(res, 'Employee not found or access denied', 404);
    }

    // Log authorization event for employee access (non-blocking)
    auditService.logInsuranceAuthorizationEvent(req, 'create-policy', `employee:${employee._id}`, true, {
        employeeId: employee._id,
        employeeNumber: employee.employeeId
    }).catch(err => console.warn('Audit logging failed:', err.message));

    // Get tenant-specific InsurancePolicy model
    const InsurancePolicy = await getInsurancePolicyModel(req.tenant.id);

    // Check for existing active policy for this employee
    const existingPolicy = await InsurancePolicy.findOne({
        employeeId: employee._id,
        status: 'active'
    });

    if (existingPolicy) {
        await auditService.logAccessDenied(req, 'policy-creation', 'existing-active-policy', {
            employeeId: employee._id,
            existingPolicyId: existingPolicy._id,
            existingPolicyNumber: existingPolicy.policyNumber
        });
        return sendError(res, 'Employee already has an active insurance policy', 400);
    }

    // Validate dates
    const policyStartDate = new Date(startDate);
    const policyEndDate = new Date(endDate);

    if (policyStartDate >= policyEndDate) {
        await auditService.logAccessDenied(req, 'policy-creation', 'invalid-date-range', {
            startDate: policyStartDate,
            endDate: policyEndDate
        });
        return sendError(res, 'End date must be after start date', 400);
    }

    // Apply module configuration constraints
    if (moduleSettings.maxCoverageAmount && coverageAmount > moduleSettings.maxCoverageAmount) {
        await auditService.logAccessDenied(req, 'policy-creation', 'coverage-amount-exceeded', {
            requestedAmount: coverageAmount,
            maxAllowed: moduleSettings.maxCoverageAmount
        });
        return sendError(res, `Coverage amount exceeds maximum allowed: ${moduleSettings.maxCoverageAmount}`, 400);
    }

    // Create new policy with tenant-specific model
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
        performedBy: req.user._id || req.user.id,
        timestamp: new Date(),
        notes: req.user.role === ROLES.EMPLOYEE ? 'Self-enrollment' : 'Initial policy creation'
    });

    await policy.save();

    // Populate employee information for response using consistent formatting
    await policy.populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position');

    // Log successful policy creation
    await auditService.logPolicyOperation(req, 'created', policy._id, {
        policyNumber: policy.policyNumber,
        employeeId: employee._id,
        policyType,
        coverageAmount,
        premium
    }, {
        selfEnrollment: req.user.role === ROLES.EMPLOYEE,
        subscriptionPlan: req.moduleConfig?.subscription?.plan
    });

    logger.info('Insurance policy created', {
        tenantId: req.tenant.id,
        policyId: policy._id,
        policyNumber: policy.policyNumber,
        employeeId: employee._id,
        createdBy: req.user._id || req.user.id,
        selfEnrollment: req.user.role === ROLES.EMPLOYEE,
        subscriptionPlan: req.moduleConfig?.subscription?.plan
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

    try {
        // Build base query with automatic tenant scoping
        let query = {};

        if (status) {
            query.status = status;
        }

        if (policyType) {
            query.policyType = policyType;
        }

        if (employeeId) {
            query.employeeId = employeeId;
        }

        // Apply role-based filtering
        query = await applyRoleBasedFiltering(req.user, query);

        // Handle search across employee names and policy numbers
        if (search) {
            // Use standardized employee search service
            const matchingEmployees = await employeeService.searchEmployeesForPolicy(
                search, 
                req.tenant.id, 
                req.user, 
                { limit: 100 }
            );

            const employeeIds = matchingEmployees.map(emp => emp._id);

            // Combine search criteria with existing query
            const searchQuery = {
                $or: [
                    { policyNumber: { $regex: search, $options: 'i' } },
                    { employeeId: { $in: employeeIds } }
                ]
            };

            // If there's already an employeeId filter from role-based access, combine them
            if (query.employeeId) {
                if (query.employeeId.$in) {
                    // Manager case - intersect the search results with allowed employees
                    const allowedEmployeeIds = query.employeeId.$in.map(id => id.toString());
                    const searchEmployeeIds = employeeIds.map(id => id.toString());
                    const intersectedIds = allowedEmployeeIds.filter(id => searchEmployeeIds.includes(id));
                    
                    query.$or = [
                        { policyNumber: { $regex: search, $options: 'i' } },
                        { employeeId: { $in: intersectedIds.map(id => new mongoose.Types.ObjectId(id)) } }
                    ];
                } else {
                    // Employee case - only search within their own policies
                    query.$or = [
                        { policyNumber: { $regex: search, $options: 'i' }, employeeId: query.employeeId }
                    ];
                }
                delete query.employeeId; // Remove the original employeeId filter as it's now in $or
            } else {
                // HR/Admin case - search across all policies
                query.$or = searchQuery.$or;
            }
        }

        // Get tenant-specific InsurancePolicy model
        const InsurancePolicy = await getInsurancePolicyModel(req.tenant.id);

        // Execute query with pagination using tenant-specific model
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [policies, total] = await Promise.all([
            InsurancePolicy.find(query)
                .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
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

    } catch (error) {
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
    
    console.log('getPolicyById called with ID:', id);
    console.log('Request tenant:', req.tenant?.id);

    // Log data access attempt
    await auditService.logInsuranceDataAccess(req, 'read', 'policy', id, {
        operation: 'get-policy-by-id'
    });

    // Get tenant-specific InsurancePolicy model
    const InsurancePolicy = await getInsurancePolicyModel(req.tenant.id);

    const policy = await InsurancePolicy.findOne({
        _id: id
    })
        .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position')
        .populate('familyMembers')
        .populate('beneficiaries')
        .populate('claims');

    if (!policy) {
        await auditService.logAccessDenied(req, 'policy-access', 'policy-not-found', {
            policyId: id
        });
        return sendError(res, 'Insurance policy not found', 404);
    }

    // Role-based access control using employee service
    const canAccess = await employeeService.canAccessEmployee(req.user, policy.employeeId._id, req.tenant.id);
    if (!canAccess) {
        await auditService.logAccessDenied(req, 'policy-access', 'insufficient-permissions', {
            policyId: id,
            policyNumber: policy.policyNumber,
            employeeId: policy.employeeId._id,
            userRole: req.user.role
        });
        return sendError(res, 'Insufficient permissions to view this policy', 403);
    }

    // Log successful authorization
    await auditService.logInsuranceAuthorizationEvent(req, 'view-policy', `policy:${id}`, true, {
        policyNumber: policy.policyNumber,
        employeeId: policy.employeeId._id
    });

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

    // Log authentication event for policy update attempt
    await auditService.logInsuranceAuthEvent(req, 'policy-update-attempt', {
        policyId: id,
        updates: Object.keys(updates)
    });

    // Get tenant-specific InsurancePolicy model
    const InsurancePolicy = await getInsurancePolicyModel(req.tenant.id);

    const policy = await InsurancePolicy.findOne({
        _id: id
    });

    if (!policy) {
        await auditService.logAccessDenied(req, 'policy-update', 'policy-not-found', {
            policyId: id
        });
        return sendError(res, 'Insurance policy not found', 404);
    }

    // Role-based access control using employee service
    const canAccess = await employeeService.canAccessEmployee(req.user, policy.employeeId, req.tenant.id);
    if (!canAccess) {
        await auditService.logAccessDenied(req, 'policy-update', 'insufficient-permissions', {
            policyId: id,
            policyNumber: policy.policyNumber,
            employeeId: policy.employeeId,
            userRole: req.user.role
        });
        return sendError(res, 'Insufficient permissions to update this policy', 403);
    }

    // Log successful authorization
    await auditService.logInsuranceAuthorizationEvent(req, 'update-policy', `policy:${id}`, true, {
        policyNumber: policy.policyNumber,
        employeeId: policy.employeeId
    });

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

    // Populate for response with consistent field selection
    await policy.populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId department position');

    // Log successful policy update
    await auditService.logPolicyOperation(req, 'updated', policy._id, {
        policyNumber: policy.policyNumber,
        employeeId: policy.employeeId._id,
        policyType: policy.policyType,
        coverageAmount: policy.coverageAmount
    }, {
        changes: Object.keys(previousValues),
        previousValues
    });

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

    // Log authentication event for policy deletion attempt
    await auditService.logInsuranceAuthEvent(req, 'policy-deletion-attempt', {
        policyId: id
    });

    // Get tenant-specific InsurancePolicy model
    const InsurancePolicy = await getInsurancePolicyModel(req.tenant.id);

    const policy = await InsurancePolicy.findOne({
        _id: id
    });

    if (!policy) {
        await auditService.logAccessDenied(req, 'policy-deletion', 'policy-not-found', {
            policyId: id
        });
        return sendError(res, 'Insurance policy not found', 404);
    }

    // Role-based access control using employee service
    const canAccess = await employeeService.canAccessEmployee(req.user, policy.employeeId, req.tenant.id);
    if (!canAccess) {
        await auditService.logAccessDenied(req, 'policy-deletion', 'insufficient-permissions', {
            policyId: id,
            policyNumber: policy.policyNumber,
            employeeId: policy.employeeId,
            userRole: req.user.role
        });
        return sendError(res, 'Insufficient permissions to delete this policy', 403);
    }

    // Log successful authorization
    await auditService.logInsuranceAuthorizationEvent(req, 'delete-policy', `policy:${id}`, true, {
        policyNumber: policy.policyNumber,
        employeeId: policy.employeeId
    });

    // Check if policy has active claims
    const activeClaims = await policy.populate('claims');
    const hasActiveClaims = activeClaims.claims.some(
        claim => ['pending', 'under_review', 'approved'].includes(claim.status)
    );

    if (hasActiveClaims) {
        await auditService.logAccessDenied(req, 'policy-deletion', 'has-active-claims', {
            policyId: id,
            policyNumber: policy.policyNumber,
            activeClaimsCount: activeClaims.claims.filter(
                claim => ['pending', 'under_review', 'approved'].includes(claim.status)
            ).length
        });
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

    // Log successful policy deletion
    await auditService.logPolicyOperation(req, 'deleted', policy._id, {
        policyNumber: policy.policyNumber,
        employeeId: policy.employeeId,
        policyType: policy.policyType,
        coverageAmount: policy.coverageAmount
    }, {
        deletionMethod: 'soft-delete',
        newStatus: 'cancelled'
    });

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

    // Log authentication event for family member addition attempt
    await auditService.logInsuranceAuthEvent(req, 'family-member-addition-attempt', {
        policyId,
        relationship: familyMemberData.relationship
    });

    // Check if family members feature is available
    if (!req.availableFeatures?.familyMembers) {
        await auditService.logAccessDenied(req, 'family-member-addition', 'feature-not-available', {
            requestedFeature: 'familyMembers',
            subscriptionPlan: req.moduleConfig?.subscription?.plan
        });
        return sendError(res, 'Family members feature is not available for your subscription plan', 403);
    }

    // Get module settings for validation
    const moduleSettings = req.moduleSettings;

    // Get tenant-specific InsurancePolicy model
    const InsurancePolicy = await getInsurancePolicyModel(req.tenant.id);

    // Find and validate policy using tenant-specific model
    const policy = await InsurancePolicy.findOne({
        _id: policyId
    });

    if (!policy) {
        await auditService.logAccessDenied(req, 'family-member-addition', 'policy-not-found', {
            policyId
        });
        return sendError(res, 'Insurance policy not found', 404);
    }

    // Self-service restriction: Employees can only add family members to their own policies
    if (req.user.role === ROLES.EMPLOYEE) {
        if (policy.employeeId.toString() !== (req.user._id || req.user.id).toString()) {
            auditService.logAccessDenied(req, 'family-member-addition', 'self-service-violation', {
                policyId,
                policyEmployeeId: policy.employeeId,
                requestingUserId: req.user._id || req.user.id,
                userRole: req.user.role
            }).catch(err => console.warn('Audit logging failed:', err.message));
            return sendError(res, 'Employees can only add family members to their own policies', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, policy.employeeId, req.tenant.id);
        if (!canAccess) {
            await auditService.logAccessDenied(req, 'family-member-addition', 'insufficient-permissions', {
                policyId,
                policyEmployeeId: policy.employeeId,
                userRole: req.user.role
            });
            return sendError(res, 'Insufficient permissions to add family members to this policy', 403);
        }
    }

    // Log successful authorization
    await auditService.logInsuranceAuthorizationEvent(req, 'add-family-member', `policy:${policyId}`, true, {
        policyNumber: policy.policyNumber,
        employeeId: policy.employeeId,
        relationship: familyMemberData.relationship
    });

    if (policy.status !== 'active') {
        await auditService.logAccessDenied(req, 'family-member-addition', 'policy-not-active', {
            policyId,
            policyStatus: policy.status
        });
        return sendError(res, 'Can only add family members to active policies', 400);
    }

    // Get tenant-specific FamilyMember model
    const FamilyMember = await getFamilyMemberModel(req.tenant.id);

    // Check maximum family members limit from module configuration
    const currentFamilyMemberCount = await FamilyMember.countDocuments({
        policyId: policy._id,
        status: { $ne: 'removed' }
    });

    if (currentFamilyMemberCount >= moduleSettings.maxFamilyMembers) {
        await auditService.logAccessDenied(req, 'family-member-addition', 'max-family-members-exceeded', {
            policyId,
            currentCount: currentFamilyMemberCount,
            maxAllowed: moduleSettings.maxFamilyMembers
        });
        return sendError(res, `Maximum family members limit reached (${moduleSettings.maxFamilyMembers})`, 400);
    }

    // Validate relationship and age for children
    if (familyMemberData.relationship === 'child') {
        const birthDate = new Date(familyMemberData.dateOfBirth);
        const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

        if (age >= 25) {
            await auditService.logAccessDenied(req, 'family-member-addition', 'child-age-limit-exceeded', {
                policyId,
                childAge: age,
                maxAge: 25
            });
            return sendError(res, 'Children must be under 25 years old for coverage', 400);
        }
    }

    // Create family member with tenant-specific model
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

    // Log successful family member addition
    await auditService.logFamilyMemberOperation(req, 'added', familyMember._id, {
        policyId: policy._id,
        relationship: familyMember.relationship,
        firstName: familyMember.firstName,
        lastName: familyMember.lastName
    }, {
        subscriptionPlan: req.moduleConfig?.subscription?.plan,
        familyMemberCount: currentFamilyMemberCount + 1,
        maxAllowed: moduleSettings.maxFamilyMembers
    });

    logger.info('Family member added to policy', {
        tenantId: req.tenant.id,
        policyId: policy._id,
        familyMemberId: familyMember._id,
        insuranceNumber: familyMember.insuranceNumber,
        addedBy: req.user._id,
        subscriptionPlan: req.moduleConfig?.subscription?.plan,
        familyMemberCount: currentFamilyMemberCount + 1,
        maxAllowed: moduleSettings.maxFamilyMembers
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
    
    console.log('getFamilyMembers called with policyId:', policyId);
    console.log('Request tenant:', req.tenant?.id);

    // Log data access attempt
    await auditService.logInsuranceDataAccess(req, 'read', 'family-members', [], {
        operation: 'get-family-members-by-policy',
        policyId
    });

    // Get tenant-specific InsurancePolicy model
    const InsurancePolicy = await getInsurancePolicyModel(req.tenant.id);

    // Verify policy exists and belongs to tenant using tenant-specific model
    const policy = await InsurancePolicy.findOne({
        _id: policyId
    });

    if (!policy) {
        await auditService.logAccessDenied(req, 'family-members-access', 'policy-not-found', {
            policyId
        });
        return sendError(res, 'Insurance policy not found', 404);
    }

    // Self-service restriction: Employees can only view family members for their own policies
    if (req.user.role === ROLES.EMPLOYEE) {
        if (policy.employeeId.toString() !== (req.user._id || req.user.id).toString()) {
            auditService.logAccessDenied(req, 'family-members-access', 'self-service-violation', {
                policyId,
                policyEmployeeId: policy.employeeId,
                requestingUserId: req.user._id || req.user.id,
                userRole: req.user.role
            }).catch(err => console.warn('Audit logging failed:', err.message));
            return sendError(res, 'Employees can only view family members for their own policies', 403);
        }
    } else {
        // Role-based access control using employee service for other roles
        const canAccess = await employeeService.canAccessEmployee(req.user, policy.employeeId, req.tenant.id);
        if (!canAccess) {
            await auditService.logAccessDenied(req, 'family-members-access', 'insufficient-permissions', {
                policyId,
                policyEmployeeId: policy.employeeId,
                userRole: req.user.role
            });
            return sendError(res, 'Insufficient permissions to view family members for this policy', 403);
        }
    }

    // Log successful authorization
    await auditService.logInsuranceAuthorizationEvent(req, 'view-family-members', `policy:${policyId}`, true, {
        policyNumber: policy.policyNumber,
        employeeId: policy.employeeId
    });

    // Get tenant-specific FamilyMember model
    const FamilyMember = await getFamilyMemberModel(req.tenant.id);

    const familyMembers = await FamilyMember.find({
        policyId,
        status: { $ne: 'removed' }
    }).sort({ relationship: 1, createdAt: 1 });

    // Log successful data access
    await auditService.logInsuranceDataAccess(req, 'read', 'family-members', 
        familyMembers.map(fm => fm._id), {
            operation: 'get-family-members-by-policy',
            policyId,
            familyMembersCount: familyMembers.length
        });

    sendSuccess(res, familyMembers, 'Family members retrieved successfully');
});

/**
 * Get policies expiring soon
 * @route GET /api/v1/life-insurance/policies/expiring
 * @access Private (Manager, HR, Admin)
 */
export const getExpiringPolicies = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    // Get tenant-specific InsurancePolicy model
    const InsurancePolicy = await getInsurancePolicyModel(req.tenant.id);

    // Apply role-based filtering to expiring policies query
    let baseQuery = {};
    baseQuery = await applyRoleBasedFiltering(req.user, baseQuery);

    // Get expiring policies with role-based filtering
    let expiringPolicies;
    if (Object.keys(baseQuery).length > 0) {
        // If there are role-based filters, we need to manually filter
        const now = new Date();
        const futureDate = new Date(now.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
        
        const query = {
            ...baseQuery,
            status: 'active',
            endDate: {
                $gte: now,
                $lte: futureDate
            }
        };

        expiringPolicies = await InsurancePolicy.find(query)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId');
    } else {
        // HR/Admin case - use a direct query
        const now = new Date();
        const futureDate = new Date(now.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
        
        expiringPolicies = await InsurancePolicy.find({
            status: 'active',
            endDate: {
                $gte: now,
                $lte: futureDate
            }
        }).populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.fullName email employeeId');
    }

    sendSuccess(res, expiringPolicies, `Policies expiring in next ${days} days retrieved successfully`);
});

/**
 * Get policy statistics
 * @route GET /api/v1/life-insurance/policies/statistics
 * @access Private (Manager, HR, Admin)
 */
export const getPolicyStatistics = asyncHandler(async (req, res) => {
    const tenantId = req.tenant.id;

    // Get tenant-specific InsurancePolicy model
    const InsurancePolicy = await getInsurancePolicyModel(tenantId);

    // Apply role-based filtering to statistics
    let baseQuery = {};
    baseQuery = await applyRoleBasedFiltering(req.user, baseQuery);

    const [
        totalPolicies,
        activePolicies,
        expiredPolicies,
        policyTypeStats,
        coverageStats
    ] = await Promise.all([
        InsurancePolicy.countDocuments(baseQuery),
        InsurancePolicy.countDocuments({ ...baseQuery, status: 'active' }),
        InsurancePolicy.countDocuments({ ...baseQuery, status: 'expired' }),
        InsurancePolicy.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$policyType', count: { $sum: 1 } } }
        ]),
        InsurancePolicy.aggregate([
            { $match: { ...baseQuery, status: 'active' } },
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