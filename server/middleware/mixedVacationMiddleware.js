/**
 * Mixed Vacation Middleware
 * 
 * Validation and business logic for mixed vacation policies
 */
import mongoose from 'mongoose';

/**
 * Validate date range
 */
export const validateDateRange = (req, res, next) => {
    const { startDate, endDate } = req.body;

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Check if date range is reasonable (not more than 30 days)
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
            return res.status(400).json({
                success: false,
                message: 'Mixed vacation period cannot exceed 30 days'
            });
        }
    }

    next();
};

/**
 * Validate total days
 */
export const validateTotalDays = (req, res, next) => {
    const { totalDays } = req.body;

    if (totalDays !== undefined) {
        if (typeof totalDays !== 'number' || totalDays < 1 || totalDays > 30) {
            return res.status(400).json({
                success: false,
                message: 'Total days must be between 1 and 30'
            });
        }
    }

    next();
};

/**
 * Validate deduction strategy
 */
export const validateDeductionStrategy = (req, res, next) => {
    const { deductionStrategy } = req.body;

    if (deductionStrategy) {
        const validStrategies = ['annual-first', 'casual-first', 'proportional', 'auto'];

        if (!validStrategies.includes(deductionStrategy)) {
            return res.status(400).json({
                success: false,
                message: `Invalid deduction strategy. Valid strategies: ${validStrategies.join(', ')}`
            });
        }
    }

    next();
};

/**
 * Validate applicable scope
 */
export const validateApplicableScope = (req, res, next) => {
    const { applicableTo } = req.body;

    if (applicableTo) {
        const { campuses, departments, allEmployees } = applicableTo;

        if (!allEmployees && (!campuses || campuses.length === 0) && (!departments || departments.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Must specify campuses, departments, or select all employees'
            });
        }

        // Validate ObjectIds
        if (campuses && campuses.length > 0) {
            const invalidIds = campuses.filter(id => !mongoose.Types.ObjectId.isValid(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid campus IDs',
                    invalidIds
                });
            }
        }

        if (departments && departments.length > 0) {
            const invalidIds = departments.filter(id => !mongoose.Types.ObjectId.isValid(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid department IDs',
                    invalidIds
                });
            }
        }
    }

    next();
};

/**
 * Validate employee ID
 */
export const validateEmployeeId = (req, res, next) => {
    const { employeeId } = req.params;

    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid employee ID'
        });
    }

    next();
};

/**
 * Validate policy status
 */
export const validatePolicyStatus = (req, res, next) => {
    const { status } = req.body;

    if (status) {
        const validStatuses = ['draft', 'active', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
            });
        }
    }

    next();
};

/**
 * Check policy exists
 */
export const checkPolicyExists = async (req, res, next) => {
    try {
        const MixedVacation = mongoose.model('MixedVacation');
        const policy = await MixedVacation.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Mixed vacation policy not found'
            });
        }

        req.policy = policy;
        next();
    } catch (error) {
        console.error('Error checking policy:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking policy'
        });
    }
};

/**
 * Check employee exists
 */
export const checkEmployeeExists = async (req, res, next) => {
    try {
        const { employeeId } = req.params;

        const User = mongoose.model('User');
        const employee = await User.findById(employeeId);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        if (!employee.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Employee is not active'
            });
        }

        req.employee = employee;
        next();
    } catch (error) {
        console.error('Error checking employee:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking employee'
        });
    }
};

export default {
    validateDateRange,
    validateTotalDays,
    validateDeductionStrategy,
    validateApplicableScope,
    validateEmployeeId,
    validatePolicyStatus,
    checkPolicyExists,
    checkEmployeeExists
};
