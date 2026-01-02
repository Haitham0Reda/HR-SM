// Department Controller
import Department from '../models/department.model.js';
import multiTenantDB from '../../../../config/multiTenant.js';

// Helper function to get tenant-specific Department model
const getTenantDepartmentModel = async (tenantId) => {
    const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
    return tenantConnection.model('Department', Department.schema);
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
