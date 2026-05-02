/**
 * Department Middleware
 * 
 * Validation and business logic for departments
 */
import Department from '../modules/hr-core/users/models/department.model.js';
import User from '../modules/hr-core/users/models/user.model.js';
import { Op } from 'sequelize';

/**
 * Validate department code uniqueness
 */
export const checkDepartmentCodeUnique = async (req, res, next) => {
    try {
        if (req.body.code) {
            const departmentId = req.params.id;

            const where = { 
                code: req.body.code,
                tenant_id: req.tenantId 
            };
            if (departmentId) {
                where.id = { [Op.ne]: departmentId };
            }

            const existingDept = await Department.findOne({ where });

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
            const manager = await User.findOne({ 
                where: {
                    id: req.body.manager,
                    tenant_id: req.tenantId 
                }
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
 * TODO: This needs to be updated when organization model is migrated
 */
export const validateorganization = async (req, res, next) => {
    // Temporarily disabled - organization model needs migration
    console.warn('validateorganization middleware needs migration');
    next();
};

export default {
    checkDepartmentCodeUnique,
    validateManager,
    validateorganization
};
