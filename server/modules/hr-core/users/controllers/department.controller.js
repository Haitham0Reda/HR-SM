// Department Controller
import Department from '../models/department.model.js';
import multiTenantDB from '../../../../config/multiTenant.js';

// Helper function to get tenant-specific Department model with safe registration
const getTenantDepartmentModel = async (tenantId) => {
    try {
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Check if model is already registered to avoid re-registration errors
        if (tenantConnection.models.Department) {
            return tenantConnection.models.Department;
        }
        
        // Register new model
        return tenantConnection.model('Department', Department.schema);
    } catch (error) {
        console.error(`Error getting tenant Department model for ${tenantId}:`, error.message);
        throw new Error(`Failed to get Department model: ${error.message}`);
    }
};

export const getAllDepartments = async (req, res) => {
    try {
        const TenantDepartment = await getTenantDepartmentModel(req.tenantId);
        const departments = await TenantDepartment.find({ tenantId: req.tenantId })
            .populate('manager', 'username email');
        res.json({
            success: true,
            data: departments
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const TenantDepartment = await getTenantDepartmentModel(req.tenantId);
        const department = new TenantDepartment({
            ...req.body,
            tenantId: req.tenantId
        });
        await department.save();
        res.status(201).json({
            success: true,
            data: department
        });
    } catch (err) {
        res.status(400).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const getDepartmentById = async (req, res) => {
    try {
        const TenantDepartment = await getTenantDepartmentModel(req.tenantId);
        const department = await TenantDepartment.findOne({ 
            _id: req.params.id, 
            tenantId: req.tenantId 
        }).populate('manager', 'username email');
        
        if (!department) {
            return res.status(404).json({ 
                success: false,
                message: 'Department not found' 
            });
        }
        
        res.json({
            success: true,
            data: department
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const TenantDepartment = await getTenantDepartmentModel(req.tenantId);
        const department = await TenantDepartment.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            req.body,
            { new: true }
        ).populate('manager', 'username email');
        
        if (!department) {
            return res.status(404).json({ 
                success: false,
                message: 'Department not found' 
            });
        }
        
        res.json({
            success: true,
            data: department
        });
    } catch (err) {
        res.status(400).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const TenantDepartment = await getTenantDepartmentModel(req.tenantId);
        const department = await TenantDepartment.findOneAndDelete({ 
            _id: req.params.id, 
            tenantId: req.tenantId 
        });
        
        if (!department) {
            return res.status(404).json({ 
                success: false,
                message: 'Department not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Department deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};
