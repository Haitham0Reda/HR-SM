/**
 * Mixed Vacation Controller
 * 
 * Manages mixed vacation policies and applications
 */
import MixedVacation from '../models/mixedVacation.model.js';
import Holiday from '../../holidays/models/holiday.model.js';
import VacationBalance from '../models/vacationBalance.model.js';
import User from '../../users/models/user.model.js';
import multiTenantDB from '../../../../config/multiTenant.js';
import { registerHRModels } from '../../../../utils/tenantModelRegistry.js';

// Helper function to get tenant-specific models with safe registration
export const getTenantModels = async (tenantId) => {
    try {
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);

        // Register all HR models (User, Department, Position)
        const hrModels = await registerHRModels(tenantConnection);

        // Register MixedVacation model
        let TenantMixedVacation;
        if (tenantConnection.models.MixedVacation) {
            TenantMixedVacation = tenantConnection.models.MixedVacation;
        } else {
            TenantMixedVacation = tenantConnection.model('MixedVacation', MixedVacation.schema);
        }

        // Register VacationBalance model
        let TenantVacationBalance;
        if (tenantConnection.models.VacationBalance) {
            TenantVacationBalance = tenantConnection.models.VacationBalance;
        } else {
            TenantVacationBalance = tenantConnection.model('VacationBalance', VacationBalance.schema);
        }

        // Register Holiday model
        let TenantHoliday;
        if (tenantConnection.models.Holiday) {
            TenantHoliday = tenantConnection.models.Holiday;
        } else {
            TenantHoliday = tenantConnection.model('Holiday', Holiday.schema);
        }

        return {
            MixedVacation: TenantMixedVacation,
            VacationBalance: TenantVacationBalance,
            Holiday: TenantHoliday,
            User: hrModels.User,
            Department: hrModels.Department,
            Position: hrModels.Position
        };
    } catch (error) {
        console.error(`Error getting tenant models for ${tenantId}:`, error.message);
        throw new Error(`Failed to get tenant models: ${error.message}`);
    }
};

/**
 * Get all mixed vacation policies
 */
export const getAllPolicies = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const { status, page = 1, limit = 50 } = req.query;

        const query = { tenantId: tenantId };
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const policies = await TenantMixedVacation.find(query)
            .populate({
                path: 'createdBy',
                select: 'username email',
                options: { lean: true }
            })
            .populate({
                path: 'applicableTo.departments',
                select: 'name',
                options: { lean: true }
            })
            .sort({ startDate: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .lean();

        const total = await TenantMixedVacation.countDocuments(query);

        res.json({
            success: true,
            policies,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Get mixed vacation policies error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get policy by ID
 */
export const getPolicyById = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const policy = await TenantMixedVacation.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        })
            .populate('createdBy', 'username email employeeId personalInfo')
            .populate('applicableTo.departments', 'name')
            .populate('applications.employee', 'username email employeeId personalInfo')
            .populate('applications.approvedBy', 'username email employeeId personalInfo');

        if (!policy) {
            return res.status(404).json({ error: 'Mixed vacation policy not found' });
        }

        res.json({
            success: true,
            policy
        });
    } catch (err) {
        console.error('Get mixed vacation policy by ID error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create mixed vacation policy
 */
export const createPolicy = async (req, res) => {
    try {
        console.log('🔍 Create mixed vacation policy - Request body:', JSON.stringify(req.body, null, 2));
        console.log('🔍 User:', req.user);
        console.log('🔍 TenantId from req:', req.tenantId);
        
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            console.log('❌ No tenantId found');
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        console.log('🔍 Using tenantId:', tenantId);

        // Validate required fields
        const { name, startDate, endDate, totalDays } = req.body;
        
        if (!name || !startDate || !endDate || !totalDays) {
            console.log('❌ Missing required fields:', { name: !!name, startDate: !!startDate, endDate: !!endDate, totalDays: !!totalDays });
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, startDate, endDate, totalDays'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        console.log('🔍 Creating policy with data:', {
            ...req.body,
            tenantId: tenantId,
            createdBy: req.user._id
        });

        const policyData = {
            ...req.body,
            tenantId: tenantId,
            createdBy: req.user._id,
            // Set default values to avoid validation issues
            officialHolidays: [],
            officialHolidayCount: 0,
            personalDaysRequired: totalDays, // Default to total days
            status: 'draft'
        };

        const policy = new TenantMixedVacation(policyData);

        console.log('🔍 Policy created, now saving...');

        await policy.save();
        console.log('✅ Policy saved to database');

        // Try to populate createdBy
        try {
            await policy.populate('createdBy', 'username email');
        } catch (populateError) {
            console.log('⚠️ Could not populate createdBy:', populateError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Mixed vacation policy created successfully',
            policy
        });
    } catch (err) {
        console.error('Create mixed vacation policy error:', err);
        console.error('Error stack:', err.stack);
        res.status(400).json({ 
            success: false,
            error: err.message,
            details: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
    }
};

/**
 * Update policy
 */
export const updatePolicy = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const policy = await TenantMixedVacation.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        // Don't allow updates if already applied
        if (policy.applications.length > 0) {
            return res.status(400).json({
                error: 'Cannot update policy that has been applied to employees'
            });
        }

        Object.assign(policy, req.body);
        policy.lastModifiedBy = req.user._id;
        policy.tenantId = tenantId; // Ensure tenantId is maintained

        // Recalculate if dates changed
        await policy.detectOfficialHolidays('default-organization');

        policy.calculatePersonalDays();

        await policy.save();

        res.json({
            success: true,
            message: 'Policy updated successfully',
            policy
        });
    } catch (err) {
        console.error('Update mixed vacation policy error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete policy
 */
export const deletePolicy = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const policy = await TenantMixedVacation.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        // Don't allow deletion if applied
        if (policy.applications.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete policy that has been applied. Cancel it instead.'
            });
        }

        // Use deleteOne() instead of remove() for newer Mongoose versions
        await policy.deleteOne();

        res.json({
            success: true,
            message: 'Policy deleted successfully'
        });
    } catch (err) {
        console.error('Delete mixed vacation policy error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Test policy on employee
 */
export const testPolicyOnEmployee = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const { employeeId } = req.params;

        const policy = await TenantMixedVacation.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        const result = await policy.testOnEmployee(employeeId);

        res.json({
            success: true,
            test: result
        });
    } catch (err) {
        console.error('Test mixed vacation policy on employee error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Apply policy to employee
 */
export const applyToEmployee = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const { employeeId } = req.params;

        const policy = await TenantMixedVacation.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        if (policy.status !== 'active') {
            return res.status(400).json({ error: 'Policy must be active to apply' });
        }

        await policy.applyToEmployee(employeeId, req.user._id);

        res.json({
            success: true,
            message: 'Policy applied successfully to employee',
            policy
        });
    } catch (err) {
        console.error('Apply mixed vacation policy to employee error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Apply policy to all eligible employees
 */
export const applyToAll = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const policy = await TenantMixedVacation.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        if (policy.status !== 'active') {
            return res.status(400).json({ error: 'Policy must be active to apply' });
        }

        const results = await policy.applyToAll(req.user._id);

        res.json({
            success: true,
            message: `Applied policy to ${results.success} employees`,
            results
        });
    } catch (err) {
        console.error('Apply mixed vacation policy to all error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get policy breakdown for employee
 */
export const getPolicyBreakdown = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation, VacationBalance: TenantVacationBalance } = await getTenantModels(tenantId);

        const { employeeId } = req.params;

        const policy = await TenantMixedVacation.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        // Get employee balance
        const balance = await TenantVacationBalance.findOne({ 
            employee: employeeId, 
            tenantId: tenantId 
        });

        if (!balance) {
            return res.status(404).json({ error: 'Employee balance not found' });
        }

        // Calculate deduction
        const deduction = await policy.calculateDeduction(employeeId);

        const breakdown = {
            policy: {
                name: policy.name,
                totalDays: policy.totalDays,
                startDate: policy.startDate,
                endDate: policy.endDate
            },
            officialHolidays: {
                count: policy.officialHolidayCount,
                holidays: policy.officialHolidays
            },
            personalDays: {
                required: policy.personalDaysRequired,
                deduction: {
                    annual: deduction.annualDays,
                    casual: deduction.casualDays,
                    total: deduction.totalDeducted
                }
            },
            currentBalance: {
                annual: {
                    allocated: balance.annual.allocated,
                    used: balance.annual.used,
                    available: balance.annual.available
                },
                casual: {
                    allocated: balance.casual.allocated,
                    used: balance.casual.used,
                    available: balance.casual.available
                }
            },
            balanceAfterApplication: deduction.balanceAfter,
            canApply: deduction.sufficient
        };

        res.json({
            success: true,
            breakdown
        });
    } catch (err) {
        console.error('Get mixed vacation policy breakdown error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Get employee applications
 */
export const getEmployeeApplications = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const { employeeId } = req.params;

        const policies = await TenantMixedVacation.find({
            tenantId: tenantId,
            'applications.employee': employeeId
        })
            .populate('createdBy', 'username email')
            .sort({ startDate: -1 });

        const applications = [];

        policies.forEach(policy => {
            const app = policy.applications.find(
                a => a.employee.toString() === employeeId
            );

            if (app) {
                applications.push({
                    policy: {
                        _id: policy._id,
                        name: policy.name,
                        startDate: policy.startDate,
                        endDate: policy.endDate,
                        totalDays: policy.totalDays
                    },
                    application: app
                });
            }
        });

        res.json({
            success: true,
            applications
        });
    } catch (err) {
        console.error('Get employee mixed vacation applications error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get active policies
 */
export const getActivePolicies = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const now = new Date();

        const policies = await TenantMixedVacation.find({
            tenantId: tenantId,
            status: 'active',
            startDate: { $lte: now },
            endDate: { $gte: now }
        })
            .populate('createdBy', 'username email')
            .lean();

        res.json({
            success: true,
            policies
        });
    } catch (err) {
        console.error('Get active mixed vacation policies error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get upcoming policies
 */
export const getUpcomingPolicies = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get tenant-specific models
        const { MixedVacation: TenantMixedVacation } = await getTenantModels(tenantId);

        const { days = 30 } = req.query;

        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + parseInt(days));

        const policies = await TenantMixedVacation.find({
            tenantId: tenantId,
            status: 'active',
            startDate: { $gte: now, $lte: future }
        })
            .populate('createdBy', 'username email')
            .lean();

        res.json({
            success: true,
            policies,
            period: `Next ${days} days`
        });
    } catch (err) {
        console.error('Get upcoming mixed vacation policies error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Cancel policy
 */
export const cancelPolicy = async (req, res) => {
    try {
        // Policy is already validated and available from middleware
        const policy = req.policy;

        policy.status = 'cancelled';
        await policy.save();

        res.json({
            success: true,
            message: 'Policy cancelled successfully',
            policy
        });
    } catch (err) {
        console.error('Cancel mixed vacation policy error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Activate policy
 */
export const activatePolicy = async (req, res) => {
    try {
        console.log('🔍 ACTIVATE - Policy ID:', req.params.id);
        
        // Policy is already validated and available from middleware
        const policy = req.policy;
        
        console.log('🔍 ACTIVATE - Policy before update:', {
            id: policy._id,
            name: policy.name,
            status: policy.status,
            tenantId: policy.tenantId
        });

        if (policy.status !== 'draft') {
            console.log('❌ ACTIVATE - Policy is not draft, current status:', policy.status);
            return res.status(400).json({ 
                success: false,
                error: `Only draft policies can be activated. Current status: ${policy.status}` 
            });
        }

        console.log('🔍 ACTIVATE - Setting status to active...');
        policy.status = 'active';
        
        console.log('🔍 ACTIVATE - Saving policy...');
        const savedPolicy = await policy.save();
        
        console.log('✅ ACTIVATE - Policy saved successfully:', {
            id: savedPolicy._id,
            name: savedPolicy.name,
            status: savedPolicy.status,
            tenantId: savedPolicy.tenantId
        });

        res.json({
            success: true,
            message: 'Policy activated successfully',
            policy: savedPolicy
        });
    } catch (err) {
        console.error('❌ ACTIVATE - Error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};