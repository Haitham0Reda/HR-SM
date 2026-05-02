/**
 * Vacation Balance Middleware
 * 
 * Validates vacation balance operations and calculations.
 */
import VacationBalance from '../modules/hr-core/vacations/models/vacationBalance.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

/**
 * Validate balance operation middleware
 * Ensures sufficient balance for operations
 */
export const validateSufficientBalance = (leaveType) => {
    return async (req, res, next) => {
        try {
            if (req.body.employee && req.body.days) {
                const year = req.body.year || new Date().getFullYear();

                const balance = await VacationBalance.findOne({
                    where: {
                        employee_id: req.body.employee,
                        year
                    }
                });

                if (!balance) {
                    return res.status(404).json({
                        success: false,
                        message: 'Vacation balance not found for this year'
                    });
                }

                const typeBalance = balance.leave_types?.[leaveType];
                if (!typeBalance || typeBalance.available < req.body.days) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient ${leaveType} balance. Available: ${typeBalance?.available || 0}, Requested: ${req.body.days}`
                    });
                }
            }
            next();
        } catch (error) {
            console.error('Validate sufficient balance error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error validating vacation balance'
            });
        }
    };
};

/**
 * Calculate tenure middleware
 * Calculates years of service for balance allocation
 */
export const calculateTenure = async (req, res, next) => {
    try {
        if (req.body.employee) {
            const employee = await User.findByPk(req.body.employee, {
                attributes: ['id', 'hire_date']
            });

            if (employee?.hire_date) {
                const hireDate = new Date(employee.hire_date);
                const now = new Date();
                const diffMs = now - hireDate;
                const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
                const months = (diffMs / (1000 * 60 * 60 * 24 * 30.44));

                req.employeeTenure = {
                    years: Math.floor(years),
                    months: Math.floor(months),
                    hireDate: hireDate
                };
            }
        }
        next();
    } catch (error) {
        console.error('Calculate tenure error:', error);
        next();
    }
};

/**
 * Validate carry over middleware
 * Ensures carry over limits are not exceeded
 */
export const validateCarryOver = (req, res, next) => {
    if (req.body.carryOver !== undefined) {
        const maxCarryOver = 5; // Maximum days that can be carried over

        if (req.body.carryOver > maxCarryOver) {
            return res.status(400).json({
                success: false,
                message: `Cannot carry over more than ${maxCarryOver} days`
            });
        }

        if (req.body.carryOver < 0) {
            return res.status(400).json({
                success: false,
                message: 'Carry over cannot be negative'
            });
        }
    }
    next();
};
