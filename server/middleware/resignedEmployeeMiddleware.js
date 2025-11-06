/**
 * Resigned Employee Middleware
 * 
 * Validation and business logic for resigned employees
 */
import mongoose from 'mongoose';

/**
 * Validate resignation dates
 */
export const validateResignationDates = (req, res, next) => {
    if (req.body.resignationDate && req.body.lastWorkingDay) {
        const resignationDate = new Date(req.body.resignationDate);
        const lastWorkingDay = new Date(req.body.lastWorkingDay);

        if (lastWorkingDay < resignationDate) {
            return res.status(400).json({
                success: false,
                message: 'Last working day must be after resignation date'
            });
        }
    }
    next();
};

/**
 * Validate penalty amount
 */
export const validatePenalty = (req, res, next) => {
    if (req.body.amount !== undefined) {
        const amount = parseFloat(req.body.amount);

        if (isNaN(amount) || amount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Penalty amount must be a positive number'
            });
        }

        req.body.amount = amount;
    }

    if (!req.body.description || req.body.description.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Penalty description is required'
        });
    }

    next();
};

/**
 * Check if can modify (within 24 hours)
 */
export const checkCanModify = async (req, res, next) => {
    try {
        const ResignedEmployee = mongoose.model('ResignedEmployee');
        const resignedEmployee = await ResignedEmployee.findById(req.params.id);

        if (!resignedEmployee) {
            return res.status(404).json({
                success: false,
                message: 'Resigned employee not found'
            });
        }

        if (resignedEmployee.isLocked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify - record is locked (24 hours have passed)'
            });
        }

        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        if (resignedEmployee.createdAt < oneDayAgo) {
            // Auto-lock
            resignedEmployee.isLocked = true;
            resignedEmployee.lockedDate = new Date();
            await resignedEmployee.save();

            return res.status(403).json({
                success: false,
                message: 'Cannot modify - 24 hours have passed since creation'
            });
        }

        next();
    } catch (error) {
        console.error('Error checking modification permission:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking modification permission'
        });
    }
};

/**
 * Validate employee exists and is not already resigned
 */
export const validateEmployee = async (req, res, next) => {
    try {
        if (req.body.employeeId) {
            const User = mongoose.model('User');
            const ResignedEmployee = mongoose.model('ResignedEmployee');

            const employee = await User.findById(req.body.employeeId);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            // Check if already in resigned list
            const existing = await ResignedEmployee.findOne({ employee: req.body.employeeId });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee already exists in resigned list'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error validating employee:', error);
        next();
    }
};

/**
 * Validate resignation type
 */
export const validateResignationType = (req, res, next) => {
    const validTypes = ['resignation-letter', 'termination'];

    if (req.body.resignationType && !validTypes.includes(req.body.resignationType)) {
        return res.status(400).json({
            success: false,
            message: `Resignation type must be one of: ${validTypes.join(', ')}`
        });
    }
    next();
};

export default {
    validateResignationDates,
    validatePenalty,
    checkCanModify,
    validateEmployee,
    validateResignationType
};
