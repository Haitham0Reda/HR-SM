/**
 * Unified Validation Middleware
 * 
 * Combines input validation (express-validator) with business logic validation
 * Provides reusable validation rules for common fields and business constraints
 */
import { body, param, query, validationResult } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Sanitize HTML content to prevent XSS
 */
export const sanitizeHtmlContent = (field) => {
    return body(field).customSanitizer((value) => {
        if (typeof value === 'string') {
            return sanitizeHtml(value, {
                allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
                allowedAttributes: {
                    'a': ['href']
                }
            });
        }
        return value;
    });
};

/**
 * Common validation rules
 */
export const validateEmail = body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail();

export const validatePasswordField = body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');

export const validateName = (field = 'name') => 
    body(field)
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage(`${field} must be between 2 and 100 characters`)
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`);

export const validatePhone = body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Please provide a valid phone number');

export const validateMongoId = (field = 'id') =>
    param(field)
        .isMongoId()
        .withMessage('Invalid ID format');

export const validateDate = (field) =>
    body(field)
        .isISO8601()
        .withMessage(`${field} must be a valid date`);

export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
];

/**
 * User validation rules
 */
export const validateUserCreate = [
    validateEmail,
    validatePasswordField,
    validateName('firstName'),
    validateName('lastName'),
    validatePhone,
    body('role')
        .isIn(['employee', 'manager', 'hr', 'admin'])
        .withMessage('Invalid role'),
    handleValidationErrors
];

export const validateUserUpdate = [
    validateMongoId('id'),
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().isLength({ min: 2, max: 100 }),
    body('lastName').optional().trim().isLength({ min: 2, max: 100 }),
    validatePhone,
    handleValidationErrors
];

/**
 * Leave validation rules
 */
export const validateLeaveCreate = [
    body('leaveType')
        .isIn(['sick', 'annual', 'personal', 'maternity', 'paternity', 'unpaid'])
        .withMessage('Invalid leave type'),
    validateDate('startDate'),
    validateDate('endDate'),
    body('reason')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),
    sanitizeHtmlContent('reason'),
    handleValidationErrors
];

/**
 * Announcement validation rules
 */
export const validateAnnouncementCreate = [
    body('title')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Title must be between 5 and 200 characters'),
    body('content')
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('Content must be between 10 and 5000 characters'),
    sanitizeHtmlContent('content'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    handleValidationErrors
];

/**
 * Department validation rules
 */
export const validateDepartmentCreate = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Department name must be between 2 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    sanitizeHtmlContent('description'),
    handleValidationErrors
];

export default {
    handleValidationErrors,
    sanitizeHtmlContent,
    validateEmail,
    validatePasswordField,
    validateName,
    validatePhone,
    validateMongoId,
    validateDate,
    validatePagination,
    validateUserCreate,
    validateUserUpdate,
    validateLeaveCreate,
    validateAnnouncementCreate,
    validateDepartmentCreate
};

// ============================================================================
// BUSINESS LOGIC VALIDATION
// ============================================================================

/**
 * Populate denormalized fields middleware
 * Extracts department and position from employee reference
 */
export const populateEmployeeFields = async (req, res, next) => {
    try {
        if (req.body.employee) {
            const User = mongoose.model('User');
            const employee = await User.findById(req.body.employee)
                .select('department position');

            if (employee) {
                req.employeeData = {
                    department: employee.department,
                    position: employee.position
                };
            }
        }
        next();
    } catch (error) {
        console.error('Error populating employee fields:', error);
        next();
    }
};

/**
 * Validate vacation balance middleware
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

            const balanceType = req.body.leaveType === 'sick' ? 'annual' : req.body.leaveType;
            const typeBalance = balance.leaveTypes[balanceType];

            if (typeBalance.available < req.body.duration) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient ${balanceType} leave balance. Available: ${typeBalance.available} days, Requested: ${req.body.duration} days`
                });
            }

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
 * Validate mission required fields
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
 * Validate date is not in past
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
 * Validate overlapping leave
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
        next();
    }
};

/**
 * Validate ID card data
 */
export const validateIDCardData = async (req, res, next) => {
    try {
        if (req.body.employee) {
            const User = mongoose.model('User');
            const employee = await User.findById(req.body.employee)
                .select('profile employeeId department position');

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

            req.idCardEmployeeData = {
                department: employee.department,
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
 * Validate attendance data
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
 * Validate report date range
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
 * Validate required fields factory
 */
export const validateRequiredFields = (fields) => {
    return (req, res, next) => {
        const missing = [];

        for (const field of fields) {
            if (field.includes('.')) {
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
