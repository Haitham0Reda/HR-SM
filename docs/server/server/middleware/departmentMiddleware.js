/**
 * Department Middleware
 * 
 * Validation and business logic for departments
 */
import mongoose from 'mongoose';

/**
 * Validate department code uniqueness
 */
export const checkDepartmentCodeUnique = async (req, res, next) => {
    try {
        if (req.body.code) {
            const Department = mongoose.model('Department');
            const departmentId = req.params.id;

            const query = { code: req.body.code };
            if (departmentId) {
                query._id = { $ne: departmentId };
            }

            const existingDept = await Department.findOne(query);

            if (existingDept) {
                return res.status(400).json({
                    success: false,
                    message: 'Department code already exists'
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Validate manager assignment
 */
export const validateManager = async (req, res, next) => {
    try {
        if (req.body.manager) {
            const User = mongoose.model('User');
            const manager = await User.findById(req.body.manager);

            if (!manager) {
                return res.status(404).json({
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

        next();
    }
};

/**
 * Validate organization exists
 */
export const validateorganization = async (req, res, next) => {
    try {
        if (req.body.organization) {
            const organization = mongoose.model('organization');
            const organization = await organization.findById(req.body.organization);

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
