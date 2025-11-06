/**
 * Report Middleware
 * 
 * Validation and business logic for reports
 */
import mongoose from 'mongoose';

/**
 * Validate report fields
 */
export const validateReportFields = (req, res, next) => {
    const { fields } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'At least one field is required for the report'
        });
    }

    // Validate each field
    for (const field of fields) {
        if (!field.fieldName) {
            return res.status(400).json({
                success: false,
                message: 'Field name is required for all fields'
            });
        }
    }

    next();
};

/**
 * Validate report filters
 */
export const validateReportFilters = (req, res, next) => {
    const { filters } = req.body;

    if (filters && Array.isArray(filters)) {
        for (const filter of filters) {
            if (!filter.field || !filter.operator) {
                return res.status(400).json({
                    success: false,
                    message: 'Filter must have field and operator'
                });
            }

            // Validate operator
            const validOperators = [
                'equals', 'notEquals', 'contains', 'notContains',
                'startsWith', 'endsWith', 'greaterThan', 'lessThan',
                'greaterThanOrEqual', 'lessThanOrEqual', 'between',
                'in', 'notIn', 'isNull', 'isNotNull'
            ];

            if (!validOperators.includes(filter.operator)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid operator: ${filter.operator}`
                });
            }

            // Check value requirement
            const operatorsRequiringValue = validOperators.filter(op =>
                !['isNull', 'isNotNull'].includes(op)
            );

            if (operatorsRequiringValue.includes(filter.operator) && filter.value === undefined) {
                return res.status(400).json({
                    success: false,
                    message: `Operator ${filter.operator} requires a value`
                });
            }
        }
    }

    next();
};

/**
 * Validate report schedule configuration
 */
export const validateReportSchedule = (req, res, next) => {
    const { schedule } = req.body;

    if (schedule && schedule.enabled) {
        if (!schedule.frequency) {
            return res.status(400).json({
                success: false,
                message: 'Frequency is required for scheduled reports'
            });
        }

        const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
        if (!validFrequencies.includes(schedule.frequency)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid schedule frequency'
            });
        }

        // Validate weekly schedule
        if (schedule.frequency === 'weekly' && schedule.dayOfWeek === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Day of week is required for weekly schedules'
            });
        }

        // Validate monthly schedule
        if (schedule.frequency === 'monthly' && schedule.dayOfMonth === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Day of month is required for monthly schedules'
            });
        }

        // Validate recipients
        if (!schedule.recipients || schedule.recipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one recipient is required for scheduled reports'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of schedule.recipients) {
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid email address: ${email}`
                });
            }
        }
    }

    next();
};

/**
 * Validate visualization settings
 */
export const validateVisualization = (req, res, next) => {
    const { visualization } = req.body;

    if (visualization && visualization.enabled) {
        if (!visualization.chartType) {
            return res.status(400).json({
                success: false,
                message: 'Chart type is required for visualization'
            });
        }

        const validChartTypes = ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 'table'];
        if (!validChartTypes.includes(visualization.chartType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chart type'
            });
        }

        // Validate axes for certain chart types
        const axisChartTypes = ['bar', 'line', 'area', 'scatter'];
        if (axisChartTypes.includes(visualization.chartType)) {
            if (!visualization.xAxis || !visualization.yAxis) {
                return res.status(400).json({
                    success: false,
                    message: `Chart type ${visualization.chartType} requires xAxis and yAxis`
                });
            }
        }
    }

    next();
};

/**
 * Validate export settings
 */
export const validateExportSettings = (req, res, next) => {
    const { exportSettings } = req.body;

    if (exportSettings) {
        if (exportSettings.defaultFormat) {
            const validFormats = ['excel', 'pdf', 'csv', 'html'];
            if (!validFormats.includes(exportSettings.defaultFormat)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid export format'
                });
            }
        }

        if (exportSettings.pageOrientation) {
            const validOrientations = ['portrait', 'landscape'];
            if (!validOrientations.includes(exportSettings.pageOrientation)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid page orientation'
                });
            }
        }

        if (exportSettings.paperSize) {
            const validSizes = ['A4', 'Letter', 'Legal'];
            if (!validSizes.includes(exportSettings.paperSize)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid paper size'
                });
            }
        }
    }

    next();
};

/**
 * Validate report type
 */
export const validateReportType = (req, res, next) => {
    const { reportType } = req.body;

    if (reportType) {
        const validTypes = [
            'employee',
            'attendance',
            'leave',
            'payroll',
            'performance',
            'request',
            'department',
            'custom'
        ];

        if (!validTypes.includes(reportType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid report type. Valid types: ${validTypes.join(', ')}`
            });
        }
    }

    next();
};

/**
 * Check report access
 */
export const checkReportAccess = async (req, res, next) => {
    try {
        const Report = mongoose.model('Report');
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Check access
        const hasAccess = report.isPublic ||
            report.createdBy.toString() === req.user._id.toString() ||
            report.sharedWith.some(s => s.user.toString() === req.user._id.toString()) ||
            req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this report'
            });
        }

        req.report = report;
        next();
    } catch (error) {
        console.error('Error checking report access:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking report access'
        });
    }
};
