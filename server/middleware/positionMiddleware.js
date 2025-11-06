/**
 * Position Middleware
 * 
 * Validation and business logic for positions
 */
import mongoose from 'mongoose';

/**
 * Validate position code uniqueness
 */
export const checkPositionCodeUnique = async (req, res, next) => {
    try {
        if (req.body.code) {
            const Position = mongoose.model('Position');
            const positionId = req.params.id;

            const query = { code: req.body.code };
            if (positionId) {
                query._id = { $ne: positionId };
            }

            const existingPosition = await Position.findOne(query);

            if (existingPosition) {
                return res.status(400).json({
                    success: false,
                    message: 'Position code already exists'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error checking position code uniqueness:', error);
        next();
    }
};

/**
 * Validate department exists
 */
export const validatePositionDepartment = async (req, res, next) => {
    try {
        if (req.body.department) {
            const Department = mongoose.model('Department');
            const department = await Department.findById(req.body.department);

            if (!department) {
                return res.status(404).json({
                    success: false,
                    message: 'Department not found'
                });
            }

            if (!department.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot assign position to inactive department'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error validating department:', error);
        next();
    }
};

/**
 * Validate position before deletion
 * Check if position is assigned to any active users
 */
export const validatePositionDeletion = async (req, res, next) => {
    try {
        const Position = mongoose.model('Position');
        const User = mongoose.model('User');

        const position = await Position.findById(req.params.id);

        if (!position) {
            return res.status(404).json({
                success: false,
                message: 'Position not found'
            });
        }

        const usersWithPosition = await User.countDocuments({
            position: req.params.id,
            isActive: true
        });

        if (usersWithPosition > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete position. ${usersWithPosition} active employee(s) are assigned to this position.`
            });
        }

        next();
    } catch (error) {
        console.error('Error validating position deletion:', error);
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
