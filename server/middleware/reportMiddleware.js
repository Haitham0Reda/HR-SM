/**
 * Report Middleware
 * 
 * Validates report generation and export requests.
 */
import mongoose from 'mongoose';

/**
 * Validate report date range middleware
 * Ensures valid date range for reports
 */
export const validateReportDateRange = (req, res, next) => {
    if (req.body.dateRange || req.query.startDate) {
        const startDate = req.body.dateRange?.startDate || req.query.startDate;
        const endDate = req.body.dateRange?.endDate || req.query.endDate;

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
 * Validate report type middleware
 * Ensures valid report type
 */
export const validateReportType = (req, res, next) => {
    const validTypes = [
        'attendance-summary',
        'attendance-detail',
        'leave-summary',
        'leave-detail',
        'payroll-summary',
        'payroll-detail',
        'employee-roster',
        'vacation-balance',
        'permission-requests',
        'department-summary',
        'comprehensive-hr',
        'custom'
    ];

    if (req.body.reportType && !validTypes.includes(req.body.reportType)) {
        return res.status(400).json({
            success: false,
            message: `Invalid report type. Must be one of: ${validTypes.join(', ')}`
        });
    }
    next();
};

/**
 * Validate export format middleware
 * Ensures valid export format
 */
export const validateExportFormat = (req, res, next) => {
    const validFormats = ['html', 'excel', 'pdf'];

    if (req.body.format && !validFormats.includes(req.body.format)) {
        return res.status(400).json({
            success: false,
            message: `Invalid export format. Must be one of: ${validFormats.join(', ')}`
        });
    }
    next();
};

/**
 * Validate report config middleware
 * Ensures HR month configuration is valid
 */
export const validateReportConfig = (req, res, next) => {
    if (req.body.hrMonth) {
        const { startDay, endDay } = req.body.hrMonth;

        if (startDay < 1 || startDay > 31) {
            return res.status(400).json({
                success: false,
                message: 'HR month start day must be between 1 and 31'
            });
        }

        if (endDay < 1 || endDay > 31) {
            return res.status(400).json({
                success: false,
                message: 'HR month end day must be between 1 and 31'
            });
        }
    }
    next();
};

/**
 * Check report permissions middleware
 * Ensures user has access to requested data
 */
export const checkReportPermissions = async (req, res, next) => {
    try {
        // If requesting department-specific report
        if (req.body.filters?.department || req.query.department) {
            const departmentId = req.body.filters?.department || req.query.department;

            // Only HR, Admin, or department managers can access department reports
            if (!['hr', 'admin', 'manager', 'head-of-department'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions to access department reports'
                });
            }

            // If manager, verify they manage this department
            if (req.user.role === 'manager') {
                const Department = mongoose.model('Department');
                const dept = await Department.findById(departmentId).select('manager');

                if (dept && dept.manager?.toString() !== req.user._id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only access reports for your department'
                    });
                }
            }
        }
        next();
    } catch (error) {
        console.error('Error checking report permissions:', error);
        next();
    }
};

/**
 * Limit report size middleware
 * Prevents generating overly large reports
 */
export const limitReportSize = async (req, res, next) => {
    try {
        // Estimate report size based on date range and filters
        if (req.body.dateRange) {
            const start = new Date(req.body.dateRange.startDate);
            const end = new Date(req.body.dateRange.endDate);
            const days = (end - start) / (1000 * 60 * 60 * 24);

            // For detail reports, limit to 90 days
            if (req.body.reportType?.includes('detail') && days > 90) {
                return res.status(400).json({
                    success: false,
                    message: 'Detail reports cannot exceed 90 days. Please use summary reports for longer periods.'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error limiting report size:', error);
        next();
    }
};
