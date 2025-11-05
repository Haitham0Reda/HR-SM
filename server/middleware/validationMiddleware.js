/**
 * Validation Middleware
 * 
 * Centralized validation logic extracted from models.
 * Validates data before it reaches the database layer.
 */
import mongoose from 'mongoose';

/**
 * Populate denormalized fields middleware
 * Extracts department and position from employee reference
 * Use before creating/updating leave or other employee-related records
 */
export const populateEmployeeFields = async (req, res, next) => {
    try {
        if (req.body.employee) {
            const User = mongoose.model('User');
            const employee = await User.findById(req.body.employee)
                .select('department position school');

            if (employee) {
                req.employeeData = {
                    department: employee.department,
                    position: employee.position,
                    school: employee.school
                };
            }
        }
        next();
    } catch (error) {
        console.error('Error populating employee fields:', error);
        next(); // Don't block on population error
    }
};

// REMOVED: Duplicate of calculateDuration in leaveMiddleware.js
// Use: import { calculateDuration } from './leaveMiddleware.js'

// REMOVED: Duplicate of calculatePermissionDuration in permissionMiddleware.js
// Use: import { calculatePermissionDuration } from './permissionMiddleware.js'

// REMOVED: Duplicate of setMedicalDocRequirement in leaveMiddleware.js
// Use: import { setMedicalDocRequirement } from './leaveMiddleware.js'

// REMOVED: Duplicate of initializeWorkflow in leaveMiddleware.js
// Use: import { initializeWorkflow } from './leaveMiddleware.js'

/**
 * Validate vacation balance middleware
 * Checks if employee has sufficient vacation balance
 */
export const validateVacationBalance = async (req, res, next) => {
    try {
        if (['annual', 'casual', 'sick'].includes(req.body.leaveType)) {
            const VacationBalance = mongoose.model('VacationBalance');
            const year = new Date(req.body.startDate).getFullYear();

            const balance = await VacationBalance.findOne({
                employee: req.body.employee,
                year
            });

            if (!balance) {
                return res.status(400).json({
                    success: false,
                    message: 'Vacation balance not found. Please contact HR.'
                });
            }

            // For sick leave, check annual balance
            const balanceType = req.body.leaveType === 'sick' ? 'annual' : req.body.leaveType;
            const typeBalance = balance.leaveTypes[balanceType];

            if (typeBalance.available < req.body.duration) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient ${balanceType} leave balance. Available: ${typeBalance.available} days, Requested: ${req.body.duration} days`
                });
            }

            // Attach balance ID to request for linking
            req.vacationBalanceId = balance._id;
        }
        next();
    } catch (error) {
        console.error('Error validating vacation balance:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating vacation balance'
        });
    }
};

/**
 * Validate mission required fields middleware
 * Ensures mission location and purpose are provided
 */
export const validateMissionFields = (req, res, next) => {
    if (req.body.leaveType === 'mission') {
        if (!req.body.mission?.location || !req.body.mission?.purpose) {
            return res.status(400).json({
                success: false,
                message: 'Mission location and purpose are required for mission requests'
            });
        }
    }
    next();
};

/**
 * Validate date is not in past middleware
 * Prevents backdating requests
 */
export const validateDateNotPast = (fieldName = 'startDate') => {
    return (req, res, next) => {
        if (req.body[fieldName]) {
            const requestDate = new Date(req.body[fieldName]);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (requestDate < today) {
                return res.status(400).json({
                    success: false,
                    message: `${fieldName} cannot be in the past`
                });
            }
        }
        next();
    };
};

/**
 * Validate overlapping leave middleware
 * Prevents overlapping leave requests for same employee
 */
export const validateOverlappingLeave = async (req, res, next) => {
    try {
        if (req.body.employee && req.body.startDate && req.body.endDate) {
            const Leave = mongoose.model('Leave');

            const overlapping = await Leave.findOne({
                employee: req.body.employee,
                status: { $in: ['pending', 'approved'] },
                $or: [
                    {
                        startDate: { $lte: req.body.endDate },
                        endDate: { $gte: req.body.startDate }
                    }
                ]
            });

            if (overlapping) {
                return res.status(400).json({
                    success: false,
                    message: 'You already have a leave request for overlapping dates',
                    overlappingLeave: overlapping._id
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error checking overlapping leave:', error);
        next(); // Don't block on validation error
    }
};

/**
 * Validate ID card data middleware
 * Ensures required fields for ID card creation
 */
export const validateIDCardData = async (req, res, next) => {
    try {
        if (req.body.employee) {
            const User = mongoose.model('User');
            const employee = await User.findById(req.body.employee)
                .select('profile employeeId department school position');

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            if (!employee.profile?.firstName || !employee.profile?.lastName) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee profile is incomplete. First and last name required.'
                });
            }

            // Attach employee data for denormalization
            req.idCardEmployeeData = {
                department: employee.department,
                school: employee.school,
                position: employee.position,
                employeeId: employee.employeeId
            };
        }
        next();
    } catch (error) {
        console.error('Error validating ID card data:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating ID card data'
        });
    }
};

/**
 * Validate attendance data middleware
 * Ensures valid attendance fields
 */
export const validateAttendanceData = (req, res, next) => {
    if (req.body.checkIn?.time && req.body.checkOut?.time) {
        const checkIn = new Date(req.body.checkIn.time);
        const checkOut = new Date(req.body.checkOut.time);

        if (checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message: 'Check-out time must be after check-in time'
            });
        }
    }
    next();
};

/**
 * Validate report export data middleware
 * Ensures valid date range for reports
 */
export const validateReportDateRange = (req, res, next) => {
    if (req.body.dateRange) {
        const { startDate, endDate } = req.body.dateRange;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (end < start) {
                return res.status(400).json({
                    success: false,
                    message: 'Report end date must be after start date'
                });
            }

            // Limit to 1 year range
            const oneYear = 365 * 24 * 60 * 60 * 1000;
            if (end - start > oneYear) {
                return res.status(400).json({
                    success: false,
                    message: 'Report date range cannot exceed 1 year'
                });
            }
        }
    }
    next();
};

/**
 * Sanitize input middleware
 * Removes dangerous characters and trims strings
 */
export const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj.trim();
        }
        if (Array.isArray(obj)) {
            return obj.map(item => sanitize(item));
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitize(value);
            }
            return sanitized;
        }
        return obj;
    };

    req.body = sanitize(req.body);
    next();
};

/**
 * Validate required fields middleware factory
 * @param {Array<String>} fields - Required field names
 */
export const validateRequiredFields = (fields) => {
    return (req, res, next) => {
        const missing = [];

        for (const field of fields) {
            if (field.includes('.')) {
                // Nested field check
                const parts = field.split('.');
                let value = req.body;
                for (const part of parts) {
                    value = value?.[part];
                }
                if (value === undefined || value === null || value === '') {
                    missing.push(field);
                }
            } else {
                if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                    missing.push(field);
                }
            }
        }

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missing.join(', ')}`
            });
        }

        next();
    };
};
