// Payroll Controller - Refactored to use PayrollService
import PayrollService from '../services/PayrollService.js';
import logger from '../../../utils/logger.js';

const payrollService = new PayrollService();

export const getAllPayrolls = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userRole = req.user?.role;
        const userId = req.user?._id;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        const { page = 1, limit = 50, period } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Role-based access control
        if (!['finance-manager', 'finance', 'hr', 'admin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to access payroll data'
            });
        }

        const options = {
            limit: parseInt(limit),
            offset: skip
        };

        if (period) {
            options.where = { period };
        }

        const payrolls = await payrollService.getAllPayrolls(tenantId, options);
        const total = payrolls.length; // TODO: Add count method to service

        // Transform payroll data to include permissions
        const transformedPayrolls = payrolls.map(payroll => ({
            ...payroll.toJSON(),
            _permissions: {
                canEdit: userRole === 'finance-manager' && payroll.createdBy?.toString() === userId?.toString(),
                canDelete: userRole === 'finance-manager' && payroll.createdBy?.toString() === userId?.toString(),
                canView: true
            }
        }));

        res.json({
            success: true,
            payrolls: transformedPayrolls,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            },
            userPermissions: {
                canCreate: userRole === 'finance-manager',
                canViewAll: ['hr', 'admin', 'finance'].includes(userRole),
                role: userRole
            }
        });
    } catch (err) {
        logger.error('Get payrolls error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};

export const createPayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Validate required fields
        const { employee, period, deductions = [] } = req.body;
        
        if (!employee || !period) {
            return res.status(400).json({
                success: false,
                error: 'Employee and period are required'
            });
        }

        // Calculate total deductions
        logger.debug('Deductions received:', JSON.stringify(deductions, null, 2));
        const totalDeductions = deductions.reduce((sum, deduction) => {
            const amount = parseFloat(deduction.amount) || 0;
            logger.debug('Processing deduction:', deduction.type, 'amount:', deduction.amount, 'parsed:', amount);
            return sum + amount;
        }, 0);
        
        // Ensure reasonable number range for Egyptian currency
        const finalTotal = Math.max(0, Math.min(totalDeductions, 50000)); // Cap at 50,000 EGP
        logger.debug('Calculated total deductions:', totalDeductions, 'final:', finalTotal);

        const payrollData = {
            ...req.body,
            totalDeductions: finalTotal,
            createdBy: req.user._id
        };

        const payroll = await payrollService.createPayroll(payrollData, tenantId);

        res.status(201).json({
            success: true,
            payroll
        });
    } catch (err) {
        logger.error('Create payroll error:', err);
        
        // Handle duplicate key error
        if (err.code === 11000 || err.message.includes('already exists')) {
            return res.status(400).json({ 
                success: false,
                error: 'Payroll record already exists for this employee and period' 
            });
        }
        
        res.status(400).json({ 
            success: false,
            error: err.message 
        });
    }
};

export const getPayrollById = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        const payroll = await payrollService.getPayrollById(req.params.id, tenantId);

        res.json({
            success: true,
            payroll
        });
    } catch (err) {
        logger.error('Get payroll by ID error:', err);
        const statusCode = err.message === 'Payroll not found' ? 404 : 500;
        res.status(statusCode).json({ 
            success: false,
            error: err.message 
        });
    }
};

export const updatePayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Calculate total deductions if deductions are provided
        const updateData = { ...req.body };
        if (updateData.deductions) {
            updateData.totalDeductions = updateData.deductions.reduce((sum, deduction) => sum + (deduction.amount || 0), 0);
        }

        const payroll = await payrollService.updatePayroll(req.params.id, updateData, tenantId);

        res.json({
            success: true,
            payroll
        });
    } catch (err) {
        logger.error('Update payroll error:', err);
        const statusCode = err.message === 'Payroll not found' ? 404 : 400;
        res.status(statusCode).json({ 
            success: false,
            error: err.message 
        });
    }
};

export const deletePayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        const result = await payrollService.deletePayroll(req.params.id, tenantId);

        res.json({
            success: true,
            message: result.message
        });
    } catch (err) {
        logger.error('Delete payroll error:', err);
        const statusCode = err.message === 'Payroll not found' ? 404 : 500;
        res.status(statusCode).json({ 
            success: false,
            error: err.message 
        });
    }
};