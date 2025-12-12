/**
 * Mixed Vacation Controller
 * 
 * Manages mixed vacation policies and applications
 */
import MixedVacation from '../models/mixedVacation.model.js';
import Holiday from '../../holidays/models/holiday.model.js';
import VacationBalance from '../models/vacationBalance.model.js';
import User from '../../users/models/user.model.js';

/**
 * Get all mixed vacation policies
 */
export const getAllPolicies = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;

        const query = {};
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const policies = await MixedVacation.find(query)
            .populate('createdBy', 'username email')
            .populate('applicableTo.departments', 'name')
            .sort({ startDate: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await MixedVacation.countDocuments(query);

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
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get policy by ID
 */
export const getPolicyById = async (req, res) => {
    try {
        const policy = await MixedVacation.findById(req.params.id)
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
        res.status(500).json({ error: err.message });
    }
};

/**
/**
 * Create mixed vacation policy
 */
export const createPolicy = async (req, res) => {
    try {
        const policy = new MixedVacation({
            ...req.body,
            createdBy: req.user._id
        });

        // Detect official holidays using default organization
        await policy.detectOfficialHolidays('default-organization');

        // Calculate personal days
        policy.calculatePersonalDays();

        await policy.save();
        await policy.populate('createdBy', 'username email');

        res.status(201).json({
            success: true,
            message: 'Mixed vacation policy created successfully',
            policy
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update policy
 */
export const updatePolicy = async (req, res) => {
    try {
        const policy = await MixedVacation.findById(req.params.id);

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
        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete policy
 */
export const deletePolicy = async (req, res) => {
    try {
        const policy = await MixedVacation.findById(req.params.id);

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
        res.status(500).json({ error: err.message });
    }
};

/**
 * Test policy on employee
 */
export const testPolicyOnEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const policy = await MixedVacation.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        const result = await policy.testOnEmployee(employeeId);

        res.json({
            success: true,
            test: result
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Apply policy to employee
 */
export const applyToEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const policy = await MixedVacation.findById(req.params.id);

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
        res.status(400).json({ error: err.message });
    }
};

/**
 * Apply policy to all eligible employees
 */
export const applyToAll = async (req, res) => {
    try {
        const policy = await MixedVacation.findById(req.params.id);

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
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get policy breakdown for employee
 */
export const getPolicyBreakdown = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const policy = await MixedVacation.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        // Get employee balance
        const balance = await VacationBalance.findOne({ employee: employeeId });

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
        res.status(400).json({ error: err.message });
    }
};

/**
 * Get employee applications
 */
export const getEmployeeApplications = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const policies = await MixedVacation.find({
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
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get active policies
 */
export const getActivePolicies = async (req, res) => {
    try {
        const policies = await MixedVacation.findActivePolicies();

        res.json({
            success: true,
            policies
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get upcoming policies
 */
export const getUpcomingPolicies = async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const policies = await MixedVacation.findUpcomingPolicies(parseInt(days));

        res.json({
            success: true,
            policies,
            period: `Next ${days} days`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Cancel policy
 */
export const cancelPolicy = async (req, res) => {
    try {
        const policy = await MixedVacation.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        policy.status = 'cancelled';
        await policy.save();

        res.json({
            success: true,
            message: 'Policy cancelled successfully',
            policy
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Activate policy
 */
export const activatePolicy = async (req, res) => {
    try {
        const policy = await MixedVacation.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        if (policy.status !== 'draft') {
            return res.status(400).json({ error: 'Only draft policies can be activated' });
        }

        policy.status = 'active';
        await policy.save();

        res.json({
            success: true,
            message: 'Policy activated successfully',
            policy
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
