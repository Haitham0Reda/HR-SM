/**
 * Department Middleware
 * 
 * Validation and business logic for departments
 */
import mongoose from 'mongoose';
import multiTenantDB from '../config/multiTenant.js';

/**
 * Validate department code uniqueness
 */
export const checkDepartmentCodeUnique = async (req, res, next) => {
    try {
        if (req.body.code) {
            // Use tenant-specific model
            const tenantConnection = await multiTenantDB.getCompanyConnection(req.tenantId);
            const TenantDepartment = tenantConnection.models.Department || 
                tenantConnection.model('Department', mongoose.model('Department').schema);
            
            const departmentId = req.params.id;

            const query = { 
                code: req.body.code,
                tenantId: req.tenantId 
            };
            if (departmentId) {
                query._id = { $ne: departmentId };
            }

            const existingDept = await TenantDepartment.findOne(query);

            if (existingDept) {
                return res.status(400).json({
                    success: false,
                    message: 'Department code already exists'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Department code validation error:', error);
        next();
    }
};

/**
 * Validate manager assignment
 */
export const validateManager = async (req, res, next) => {
    try {
        if (req.body.manager) {
            // Use tenant-specific model
            const tenantConnection = await multiTenantDB.getCompanyConnection(req.tenantId);
            const TenantUser = tenantConnection.models.User || 
                tenantConnection.model('User', mongoose.model('User').schema);

            const manager = await TenantUser.findOne({ 
                _id: req.body.manager,
                tenantId: req.tenantId 
            });

            if (!manager) {
                return res.status(400).json({
                    success: false,
                    message: 'Manager not found'
                });
            }

            if (!['manager', 'hr', 'admin'].includes(manager.role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Manager must have manager, HR or admin role'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Manager validation error:', error);
        next();
    }
};

/**
 * Validate organization exists
 */
export const validateorganization = async (req, res, next) => {
    try {
        if (req.body.organization) {
            const OrganizationModel = mongoose.model('organization');
            const organization = await OrganizationModel.findById(req.body.organization);

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'organization not found'
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

export default {
    checkDepartmentCodeUnique,
    validateManager,
    validateorganization
};
