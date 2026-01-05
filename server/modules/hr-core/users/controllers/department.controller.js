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
        // Validate required fields
        if (!req.body.name || !req.body.name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Department name is required'
            });
        }

        // Validate name length
        if (req.body.name.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Department name cannot exceed 100 characters'
            });
        }

        const TenantDepartment = await getTenantDepartmentModel(req.tenantId);
        
        // Check if department name already exists for this tenant
        const existingDepartment = await TenantDepartment.findOne({
            tenantId: req.tenantId,
            name: { $regex: new RegExp(`^${req.body.name.trim()}$`, 'i') }
        });
        
        if (existingDepartment) {
            return res.status(400).json({
                success: false,
                message: `Department name '${req.body.name}' already exists`
            });
        }
        
        // Check if department code already exists (if provided)
        if (req.body.code) {
            const existingCode = await TenantDepartment.findOne({
                tenantId: req.tenantId,
                code: req.body.code.toUpperCase()
            });
            
            if (existingCode) {
                return res.status(400).json({
                    success: false,
                    message: `Department code '${req.body.code}' already exists`
                });
            }
        }
        
        const department = new TenantDepartment({
            ...req.body,
            tenantId: req.tenantId,
            createdBy: req.user._id
        });
        
        await department.save();
        
        // Populate manager info if exists
        if (department.manager) {
            await department.populate('manager', 'username email');
        }
        
        res.status(201).json({
            success: true,
            data: department,
            message: 'Department created successfully'
        });
    } catch (err) {
        console.error('Create department error:', err);
        
        // Handle specific MongoDB errors
        if (err.code === 11000) {
            // Parse the duplicate key error
            const duplicateField = err.message.includes('name_1') ? 'name' : 
                                  err.message.includes('code_1') ? 'code' : 'field';
            
            if (duplicateField === 'name') {
                return res.status(400).json({ 
                    success: false,
                    message: `Department name '${req.body.name}' already exists` 
                });
            } else if (duplicateField === 'code') {
                return res.status(400).json({ 
                    success: false,
                    message: `Department code '${req.body.code}' already exists` 
                });
            } else {
                return res.status(400).json({ 
                    success: false,
                    message: 'Department with this information already exists' 
                });
            }
        }
        
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ 
                success: false,
                message: errors.join(', ')
            });
        }
        
        res.status(400).json({ 
            success: false,
            message: err.message || 'Failed to create department'
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
