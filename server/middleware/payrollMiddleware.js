/**
 * Payroll Middleware
 * 
 * Validates and processes payroll-related requests.
 */
import mongoose from 'mongoose';

/**
 * Validate payroll period middleware
 * Ensures valid payroll period dates
 */
export const validatePayrollPeriod = (req, res, next) => {
    if (req.body.period?.startDate && req.body.period?.endDate) {
        const start = new Date(req.body.period.startDate);
        const end = new Date(req.body.period.endDate);

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'Payroll end date must be after start date'
            });
        }

        // Typical payroll period should not exceed 31 days
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        if (diffDays > 31) {
            return res.status(400).json({
                success: false,
                message: 'Payroll period cannot exceed 31 days'
            });
        }
    }
    next();
};

/**
 * Check duplicate payroll middleware
 * Prevents duplicate payroll for same employee/period
 */
export const checkDuplicatePayroll = async (req, res, next) => {
    try {
        if (req.body.employee && req.body.period?.startDate && req.body.period?.endDate) {
            const Payroll = mongoose.model('Payroll');

            const existing = await Payroll.findOne({
                employee: req.body.employee,
                'period.startDate': req.body.period.startDate,
                'period.endDate': req.body.period.endDate
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Payroll already exists for this employee and period',
                    existingPayroll: existing._id
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error checking duplicate payroll:', error);
        next();
    }
};

/**
 * Validate payroll amounts middleware
 * Ensures all amounts are non-negative
 */
export const validatePayrollAmounts = (req, res, next) => {
    const amounts = ['basicSalary', 'allowances', 'deductions', 'overtime', 'bonus'];

    for (const field of amounts) {
        if (req.body[field] !== undefined && req.body[field] < 0) {
            return res.status(400).json({
                success: false,
                message: `${field} cannot be negative`
            });
        }
    }
    next();
};

/**
 * Calculate payroll totals middleware
 * Auto-calculates gross and net salary
 */
export const calculatePayrollTotals = (req, res, next) => {
    const basicSalary = parseFloat(req.body.basicSalary) || 0;
    const allowances = parseFloat(req.body.allowances) || 0;
    const overtime = parseFloat(req.body.overtime) || 0;
    const bonus = parseFloat(req.body.bonus) || 0;
    const deductions = parseFloat(req.body.deductions) || 0;

    req.body.grossSalary = basicSalary + allowances + overtime + bonus;
    req.body.netSalary = req.body.grossSalary - deductions;

    next();
};
