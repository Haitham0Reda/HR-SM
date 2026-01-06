// Payroll Controller
import Payroll from '../models/payroll.model.js';
import multiTenantDB from '../../../config/multiTenant.js';
import { registerHRModels } from '../../../utils/tenantModelRegistry.js';

// Helper function to get tenant-specific models
export const getTenantModels = async (tenantId) => {
    try {
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);

        // Register all HR models (User, Department, Position)
        const hrModels = await registerHRModels(tenantConnection);

        // Register Payroll model
        let TenantPayroll;
        if (tenantConnection.models.Payroll) {
            TenantPayroll = tenantConnection.models.Payroll;
        } else {
            TenantPayroll = tenantConnection.model('Payroll', Payroll.schema);
        }

        return {
            Payroll: TenantPayroll,
            User: hrModels.User,
            Department: hrModels.Department,
            Position: hrModels.Position
        };
    } catch (error) {
        console.error('Error getting tenant models:', error);
        throw error;
    }
};

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

        // Get tenant-specific models
        const { Payroll: TenantPayroll } = await getTenantModels(tenantId);

        const { page = 1, limit = 50, period } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = { tenantId: tenantId };
        
        // Role-based filtering
        if (userRole === 'finance-manager') {
            // Finance managers see only their own payroll records
            query.createdBy = userId;
        } else if (userRole === 'finance') {
            // Finance users see all payroll records (read-only)
            // No additional filtering needed
        } else if (userRole === 'hr' || userRole === 'admin') {
            // HR and Admin see all payroll records
            // No additional filtering needed
        } else {
            // Other roles have no access
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to access payroll data'
            });
        }
        
        if (period) query.period = period;

        const payrolls = await TenantPayroll.find(query)
            .populate({
                path: 'employee',
                select: 'firstName lastName employeeId email department position role',
                options: { lean: true }
            })
            .populate({
                path: 'createdBy',
                select: 'firstName lastName email role',
                options: { lean: true }
            })
            .sort({ period: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .lean();

        const total = await TenantPayroll.countDocuments(query);

        // Transform payroll data to include creator information and permissions
        const transformedPayrolls = payrolls.map(payroll => ({
            ...payroll,
            _permissions: {
                canEdit: userRole === 'finance-manager' && payroll.createdBy?._id?.toString() === userId?.toString(),
                canDelete: userRole === 'finance-manager' && payroll.createdBy?._id?.toString() === userId?.toString(),
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
        console.error('Get payrolls error:', err);
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

        // Get tenant-specific models
        const { Payroll: TenantPayroll } = await getTenantModels(tenantId);

        // Validate required fields
        const { employee, period, deductions = [] } = req.body;
        
        if (!employee || !period) {
            return res.status(400).json({
                success: false,
                error: 'Employee and period are required'
            });
        }

        // Calculate total deductions
        console.log('🔍 PAYROLL - Deductions received:', JSON.stringify(deductions, null, 2));
        const totalDeductions = deductions.reduce((sum, deduction) => {
            const amount = parseFloat(deduction.amount) || 0;
            console.log('🔍 PAYROLL - Processing deduction:', deduction.type, 'amount:', deduction.amount, 'parsed:', amount);
            return sum + amount;
        }, 0);
        
        // Ensure reasonable number range for Egyptian currency
        const finalTotal = Math.max(0, Math.min(totalDeductions, 50000)); // Cap at 50,000 EGP
        console.log('🔍 PAYROLL - Calculated total deductions:', totalDeductions, 'final:', finalTotal);

        const payrollData = {
            ...req.body,
            tenantId: tenantId,
            totalDeductions: finalTotal,
            createdBy: req.user._id // Add the creator's ID
        };

        const payroll = await TenantPayroll.create(payrollData);

        // Return populated payroll
        const populatedPayroll = await TenantPayroll.findById(payroll._id)
            .populate({
                path: 'employee',
                select: 'firstName lastName employeeId email department position',
                options: { lean: true }
            })
            .lean();

        res.status(201).json({
            success: true,
            payroll: populatedPayroll
        });
    } catch (err) {
        console.error('Create payroll error:', err);
        
        // Handle duplicate key error
        if (err.code === 11000) {
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

        // Get tenant-specific models
        const { Payroll: TenantPayroll } = await getTenantModels(tenantId);

        const payroll = await TenantPayroll.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        })
        .populate({
            path: 'employee',
            select: 'firstName lastName employeeId email department position',
            options: { lean: true }
        })
        .lean();

        if (!payroll) {
            return res.status(404).json({ 
                success: false,
                error: 'Payroll record not found' 
            });
        }

        res.json({
            success: true,
            payroll
        });
    } catch (err) {
        console.error('Get payroll by ID error:', err);
        res.status(500).json({ 
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

        // Get tenant-specific models
        const { Payroll: TenantPayroll } = await getTenantModels(tenantId);

        // Calculate total deductions if deductions are provided
        const updateData = { ...req.body };
        if (updateData.deductions) {
            updateData.totalDeductions = updateData.deductions.reduce((sum, deduction) => sum + (deduction.amount || 0), 0);
        }

        const payroll = await TenantPayroll.findOneAndUpdate(
            { _id: req.params.id, tenantId: tenantId },
            updateData,
            { new: true, runValidators: true }
        )
        .populate({
            path: 'employee',
            select: 'firstName lastName employeeId email department position',
            options: { lean: true }
        })
        .lean();

        if (!payroll) {
            return res.status(404).json({ 
                success: false,
                error: 'Payroll record not found' 
            });
        }

        res.json({
            success: true,
            payroll
        });
    } catch (err) {
        console.error('Update payroll error:', err);
        res.status(400).json({ 
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

        // Get tenant-specific models
        const { Payroll: TenantPayroll } = await getTenantModels(tenantId);

        const payroll = await TenantPayroll.findOneAndDelete({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!payroll) {
            return res.status(404).json({ 
                success: false,
                error: 'Payroll record not found' 
            });
        }

        res.json({
            success: true,
            message: 'Payroll record deleted successfully'
        });
    } catch (err) {
        console.error('Delete payroll error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};