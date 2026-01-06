/**
 * Salary Controller
 * 
 * Manages employee salary operations with tenant isolation and encryption
 */
import Salary from '../models/salary.model.js';
import multiTenantDB from '../../../config/multiTenant.js';
import { registerHRModels } from '../../../utils/tenantModelRegistry.js';
import { canViewSalaryData, canManageSalaryData, maskSalary } from '../../../utils/encryption.js';

// Helper function to get tenant-specific models
export const getTenantModels = async (tenantId) => {
    try {
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);

        // Register all HR models (User, Department, Position)
        const hrModels = await registerHRModels(tenantConnection);

        // Register Salary model
        let TenantSalary;
        if (tenantConnection.models.Salary) {
            TenantSalary = tenantConnection.models.Salary;
        } else {
            TenantSalary = tenantConnection.model('Salary', Salary.schema);
        }

        return {
            Salary: TenantSalary,
            User: hrModels.User,
            Department: hrModels.Department,
            Position: hrModels.Position
        };
    } catch (error) {
        console.error('Error getting tenant models:', error);
        throw error;
    }
};

/**
 * Transform salary data based on user permissions
 */
const transformSalaryData = (salary, userRole) => {
    const salaryObj = salary.toObject ? salary.toObject() : salary;
    
    if (canViewSalaryData(userRole)) {
        // Return actual salary data for authorized users
        return {
            ...salaryObj,
            baseSalary: salary.baseSalary,
            allowances: salary.allowances,
            grossSalary: salary.grossSalary,
            totalAllowances: salary.totalAllowances
        };
    } else {
        // Return masked data for unauthorized users (admin for debugging)
        return {
            ...salaryObj,
            baseSalary: maskSalary(salary.baseSalary),
            allowances: {
                housing: maskSalary(salary.allowances?.housing),
                transportation: maskSalary(salary.allowances?.transportation),
                medical: maskSalary(salary.allowances?.medical),
                food: maskSalary(salary.allowances?.food),
                other: maskSalary(salary.allowances?.other)
            },
            grossSalary: maskSalary(salary.grossSalary),
            totalAllowances: maskSalary(salary.totalAllowances),
            // Add debug info for admin
            _debugInfo: userRole === 'admin' ? {
                hasEncryptedData: true,
                recordExists: true,
                status: salaryObj.status
            } : undefined
        };
    }
};

/**
 * Get all salaries with pagination and role-based filtering
 */
export const getAllSalaries = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userRole = req.user?.role;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Check if user has any access to salary data
        if (!canViewSalaryData(userRole) && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to access salary data'
            });
        }

        // Get tenant-specific models
        const { Salary: TenantSalary } = await getTenantModels(tenantId);

        const { page = 1, limit = 50, status, employeeId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = { tenantId: tenantId };
        if (status) query.status = status;
        if (employeeId) query.employee = employeeId;

        const salaries = await TenantSalary.find(query)
            .populate({
                path: 'employee',
                select: 'firstName lastName employeeId email department position role',
                options: { lean: true }
            })
            .populate({
                path: 'createdBy',
                select: 'firstName lastName email',
                options: { lean: true }
            })
            .populate({
                path: 'approvedBy',
                select: 'firstName lastName email',
                options: { lean: true }
            })
            .sort({ effectiveDate: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await TenantSalary.countDocuments(query);

        // Transform salary data based on user role
        const transformedSalaries = salaries.map(salary => transformSalaryData(salary, userRole));

        res.json({
            success: true,
            salaries: transformedSalaries,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            },
            userPermissions: {
                canView: canViewSalaryData(userRole),
                canManage: canManageSalaryData(userRole),
                role: userRole
            }
        });
    } catch (err) {
        console.error('Get salaries error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};

/**
 * Get current salary for employee
 */
export const getCurrentSalary = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userRole = req.user?.role;
        const { employeeId } = req.params;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Check permissions
        if (!canViewSalaryData(userRole) && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to access salary data'
            });
        }

        // Get tenant-specific models
        const { Salary: TenantSalary } = await getTenantModels(tenantId);

        const salary = await TenantSalary.findOne({
            employee: employeeId,
            tenantId: tenantId,
            status: 'active'
        })
        .populate({
            path: 'employee',
            select: 'firstName lastName employeeId email department position role',
            options: { lean: true }
        })
        .sort({ effectiveDate: -1 });

        if (!salary) {
            return res.status(404).json({ 
                success: false,
                error: 'No active salary found for employee' 
            });
        }

        const transformedSalary = transformSalaryData(salary, userRole);

        res.json({
            success: true,
            salary: transformedSalary
        });
    } catch (err) {
        console.error('Get current salary error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};

/**
 * Create or update salary (only for authorized users)
 */
export const createSalary = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userRole = req.user?.role;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Check if user can manage salary data
        if (!canManageSalaryData(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to create salary records'
            });
        }

        // Get tenant-specific models
        const { Salary: TenantSalary } = await getTenantModels(tenantId);

        // Validate required fields
        const { employee, baseSalary, effectiveDate } = req.body;
        
        if (!employee || baseSalary === undefined || !effectiveDate) {
            return res.status(400).json({
                success: false,
                error: 'Employee, base salary, and effective date are required'
            });
        }

        // Deactivate previous active salary for this employee
        await TenantSalary.updateMany(
            { 
                employee: employee, 
                tenantId: tenantId, 
                status: 'active' 
            },
            { status: 'inactive' }
        );

        const salaryData = {
            ...req.body,
            tenantId: tenantId,
            createdBy: req.user._id,
            status: 'active'
        };

        console.log('🔍 Creating salary with data:', JSON.stringify({
            ...salaryData,
            baseSalary: '***ENCRYPTED***',
            allowances: '***ENCRYPTED***'
        }, null, 2));

        const salary = await TenantSalary.create(salaryData);

        // Return populated salary with appropriate data based on role
        const populatedSalary = await TenantSalary.findById(salary._id)
            .populate({
                path: 'employee',
                select: 'firstName lastName employeeId email department position role',
                options: { lean: true }
            })
            .populate({
                path: 'createdBy',
                select: 'firstName lastName email',
                options: { lean: true }
            });

        const transformedSalary = transformSalaryData(populatedSalary, userRole);

        res.status(201).json({
            success: true,
            salary: transformedSalary
        });
    } catch (err) {
        console.error('Create salary error:', err);
        res.status(400).json({ 
            success: false,
            error: err.message 
        });
    }
};

/**
 * Update salary (only for authorized users)
 */
export const updateSalary = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userRole = req.user?.role;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Check if user can manage salary data
        if (!canManageSalaryData(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to update salary records'
            });
        }

        // Get tenant-specific models
        const { Salary: TenantSalary } = await getTenantModels(tenantId);

        const salary = await TenantSalary.findOneAndUpdate(
            { _id: req.params.id, tenantId: tenantId },
            req.body,
            { new: true, runValidators: true }
        )
        .populate({
            path: 'employee',
            select: 'firstName lastName employeeId email department position role',
            options: { lean: true }
        })
        .populate({
            path: 'createdBy',
            select: 'firstName lastName email',
            options: { lean: true }
        });

        if (!salary) {
            return res.status(404).json({ 
                success: false,
                error: 'Salary record not found' 
            });
        }

        const transformedSalary = transformSalaryData(salary, userRole);

        res.json({
            success: true,
            salary: transformedSalary
        });
    } catch (err) {
        console.error('Update salary error:', err);
        res.status(400).json({ 
            success: false,
            error: err.message 
        });
    }
};

/**
 * Delete salary (only for authorized users)
 */
export const deleteSalary = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userRole = req.user?.role;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Check if user can manage salary data
        if (!canManageSalaryData(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to delete salary records'
            });
        }

        // Get tenant-specific models
        const { Salary: TenantSalary } = await getTenantModels(tenantId);

        const salary = await TenantSalary.findOneAndDelete({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!salary) {
            return res.status(404).json({ 
                success: false,
                error: 'Salary record not found' 
            });
        }

        res.json({
            success: true,
            message: 'Salary record deleted successfully'
        });
    } catch (err) {
        console.error('Delete salary error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};

/**
 * Get salary history for employee
 */
export const getSalaryHistory = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userRole = req.user?.role;
        const { employeeId } = req.params;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Check permissions
        if (!canViewSalaryData(userRole) && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to access salary history'
            });
        }

        // Get tenant-specific models
        const { Salary: TenantSalary } = await getTenantModels(tenantId);

        const salaries = await TenantSalary.find({
            employee: employeeId,
            tenantId: tenantId
        })
        .populate({
            path: 'createdBy',
            select: 'firstName lastName email',
            options: { lean: true }
        })
        .populate({
            path: 'approvedBy',
            select: 'firstName lastName email',
            options: { lean: true }
        })
        .sort({ effectiveDate: -1 });

        // Transform salary data based on user role
        const transformedSalaries = salaries.map(salary => transformSalaryData(salary, userRole));

        res.json({
            success: true,
            salaries: transformedSalaries
        });
    } catch (err) {
        console.error('Get salary history error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};