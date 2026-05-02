/**
 * Position Middleware
 * 
 * Validation and business logic for positions
 */
import Position from '../modules/hr-core/users/models/position.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import User from '../modules/hr-core/users/models/user.model.js';
import { Op } from 'sequelize';

/**
 * Validate position code uniqueness
 */
export const checkPositionCodeUnique = async (req, res, next) => {
    try {
        if (req.body.code) {
            const positionId = req.params.id;

            const where = { code: req.body.code };
            if (positionId) {
                where.id = { [Op.ne]: positionId };
            }

            const existingPosition = await Position.findOne({ where });

            if (existingPosition) {
                return res.status(400).json({
                    success: false,
                    message: 'Position code already exists'
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Validate department exists
 */
export const validatePositionDepartment = async (req, res, next) => {
    try {
        if (req.body.department) {
            const department = await Department.findByPk(req.body.department);

            if (!department) {
                return res.status(404).json({
                    success: false,
                    message: 'Department not found'
                });
            }

            if (!department.is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot assign position to inactive department'
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Validate position before deletion
 * Check if position is assigned to any active users
 */
export const validatePositionDeletion = async (req, res, next) => {
    try {
        const position = await Position.findByPk(req.params.id);

        if (!position) {
            return res.status(404).json({
                success: false,
                message: 'Position not found'
            });
        }

        const usersWithPosition = await User.count({
            where: {
                position: req.params.id,
                is_active: true
            }
        });

        if (usersWithPosition > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete position. ${usersWithPosition} active employee(s) are assigned to this position.`
            });
        }

        next();
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Error validating position deletion'
        });
    }
};

export default {
    checkPositionCodeUnique,
    validatePositionDepartment,
    validatePositionDeletion
};
