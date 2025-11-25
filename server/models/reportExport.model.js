/**
 * Report Export Model
 * 
 * Manages report generation and export in multiple formats (HTML, Excel, PDF).
 * Tracks export history and integrates with all HR modules for comprehensive reporting.
 * 
 * Features:
 * - Multiple export formats (HTML, Excel, PDF)
 * - Report type tracking (Attendance, Leave, Payroll, etc.)
 * - Export history and audit trail
 * - Integration with ReportConfig for date ranges
 * - Formatted exports with titles, subtitles, summaries
 * - Department and employee-level filtering
 */
import mongoose from 'mongoose';
import ReportConfig from './reportConfig.model.js';  // Add this import

const reportExportSchema = new mongoose.Schema({
    // Report metadata
    reportType: {
        type: String,
        enum: [
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
        ],
        required: true,
        index: true
    },

    // Report title and description
    title: {
        type: String,
        required: true
    },

    subtitle: {
        type: String  // Usually contains date range
    },

    description: String,

    // Export format
    exportFormat: {
        type: String,
        enum: ['html', 'excel', 'pdf'],
        required: true,
        default: 'html'
    },

    // Date range for the report
    dateRange: {
        rangeType: {
            type: String,
            enum: ['hr-month', 'current-month', 'previous-month', 'custom'],
            default: 'hr-month'
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        label: String  // e.g., "HR Month (11/21/2024 - 12/20/2024)"
    },

    // Filters applied to the report
    filters: {
        // Department filter
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        },
        // Employee filter (for individual reports)
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        // Position filter
        position: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Position'
        },
        // Status filter (for leave, attendance, etc.)
        status: [String],
        // Leave type filter
        leaveType: [String],
        // Additional custom filters
        customFilters: mongoose.Schema.Types.Mixed
    },

    // Summary data (stored for quick access)
    summary: {
        totalRecords: {
            type: Number,
            default: 0
        },
        // Key metrics vary by report type
        metrics: mongoose.Schema.Types.Mixed,
        // Additional summary fields
        additionalData: mongoose.Schema.Types.Mixed
    },

    // Export file information
    exportFile: {
        fileName: String,
        filePath: String,
        fileSize: Number,  // in bytes
        mimeType: String,
        url: String  // Download URL
    },

    // Report configuration reference
    reportConfig: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReportConfig'
    },

    // User who generated the report
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Organization/Campus
    organization: {
        type: String,
        default: 'default',
        index: true
    },

    // Report status
    status: {
        type: String,
        enum: ['pending', 'generating', 'completed', 'failed', 'expired'],
        default: 'pending',
        index: true
    },

    // Processing information
    processing: {
        startedAt: Date,
        completedAt: Date,
        duration: Number,  // in milliseconds
        errorMessage: String
    },

    // Export settings
    settings: {
        includeCharts: {
            type: Boolean,
            default: false
        },
        includeRawData: {
            type: Boolean,
            default: true
        },
        pageOrientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        },
        // Excel-specific settings
        excelSettings: {
            includeFilters: {
                type: Boolean,
                default: true
            },
            freezeHeader: {
                type: Boolean,
                default: true
            },
            autoColumnWidth: {
                type: Boolean,
                default: true
            }
        },
        // PDF-specific settings
        pdfSettings: {
            includePageNumbers: {
                type: Boolean,
                default: true
            },
            includeHeader: {
                type: Boolean,
                default: true
            },
            includeFooter: {
                type: Boolean,
                default: true
            }
        }
    },

    // Access tracking
    accessLog: [{
        accessedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        accessedAt: {
            type: Date,
            default: Date.now
        },
        action: {
            type: String,
            enum: ['view', 'download', 'share']
        }
    }],

    // Expiration (for temporary exports)
    expiresAt: Date,

    // Tags for categorization
    tags: [String],

    // Is this a scheduled/recurring report?
    isScheduled: {
        type: Boolean,
        default: false
    },

    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReportSchedule'  // Future enhancement
    }
}, {
    timestamps: true
});

// Virtual to check if report has expired
reportExportSchema.virtual('isExpired').get(function () {
    return this.expiresAt && new Date() > this.expiresAt;
});

// Virtual to get file extension
reportExportSchema.virtual('fileExtension').get(function () {
    const extensions = {
        'html': '.html',
        'excel': '.xlsx',
        'pdf': '.pdf'
    };
    return extensions[this.exportFormat] || '';
});

// Note: Middleware hooks moved to reportExportMiddleware.js
// Use middleware functions in routes for better separation of concerns

/**
 * Instance method to generate attendance report
 * 
 * @returns {Promise<Object>} Report data
 */
reportExportSchema.methods.generateAttendanceReport = async function () {
    const Attendance = mongoose.model('Attendance');

    const query = {
        date: {
            $gte: this.dateRange.startDate,
            $lte: this.dateRange.endDate
        }
    };

    if (this.filters.department) query.department = this.filters.department;
    if (this.filters.employee) query.employee = this.filters.employee;
    if (this.filters.status && this.filters.status.length > 0) {
        query.status = { $in: this.filters.status };
    }

    const records = await Attendance.find(query)
        .populate({
            path: 'employee',
            select: 'profile employeeId department position',
            populate: [
                { path: 'department', select: 'name code' },
                { path: 'position', select: 'title' }
            ]
        })
        .populate('leave', 'leaveType duration')
        .sort({ date: 1, 'employee.employeeId': 1 });

    // Calculate summary metrics
    const metrics = {
        totalRecords: records.length,
        presentDays: records.filter(r => ['on-time', 'present', 'late', 'work-from-home'].includes(r.status)).length,
        absentDays: records.filter(r => r.status === 'absent').length,
        lateDays: records.filter(r => r.status === 'late').length,
        earlyDepartureDays: records.filter(r => r.status === 'early-departure').length,
        vacationDays: records.filter(r => r.status === 'vacation').length,
        sickLeaveDays: records.filter(r => r.status === 'sick-leave').length,
        missionDays: records.filter(r => r.status === 'mission').length,
        wfhDays: records.filter(r => r.status === 'work-from-home').length,
        totalHours: records.reduce((sum, r) => sum + (r.hours?.totalHours || 0), 0),
        expectedHours: records.reduce((sum, r) => sum + (r.hours?.expected || 0), 0)
    };

    this.summary.totalRecords = records.length;
    this.summary.metrics = metrics;

    return {
        title: this.title,
        subtitle: this.subtitle,
        dateRange: this.dateRange,
        summary: metrics,
        data: records
    };
};

/**
 * Instance method to generate leave report
 * 
 * @returns {Promise<Object>} Report data
 */
reportExportSchema.methods.generateLeaveReport = async function () {
    const Leave = mongoose.model('Leave');

    const query = {
        startDate: { $lte: this.dateRange.endDate },
        endDate: { $gte: this.dateRange.startDate }
    };

    if (this.filters.department) query.department = this.filters.department;
    if (this.filters.employee) query.employee = this.filters.employee;
    if (this.filters.status && this.filters.status.length > 0) {
        query.status = { $in: this.filters.status };
    }
    if (this.filters.leaveType && this.filters.leaveType.length > 0) {
        query.leaveType = { $in: this.filters.leaveType };
    }

    const leaves = await Leave.find(query)
        .populate({
            path: 'employee',
            select: 'profile employeeId department position',
            populate: [
                { path: 'department', select: 'name code' },
                { path: 'position', select: 'title' }
            ]
        })
        .populate('approvedBy rejectedBy', 'profile.firstName profile.lastName')
        .sort({ startDate: -1 });

    // Calculate summary by type and status
    const byType = leaves.reduce((acc, leave) => {
        const key = leave.leaveType;
        if (!acc[key]) {
            acc[key] = { type: key, count: 0, totalDays: 0, approved: 0, pending: 0, rejected: 0 };
        }
        acc[key].count++;
        acc[key].totalDays += leave.duration;
        acc[key][leave.status]++;
        return acc;
    }, {});

    const metrics = {
        totalLeaves: leaves.length,
        totalDays: leaves.reduce((sum, l) => sum + l.duration, 0),
        approvedLeaves: leaves.filter(l => l.status === 'approved').length,
        pendingLeaves: leaves.filter(l => l.status === 'pending').length,
        rejectedLeaves: leaves.filter(l => l.status === 'rejected').length,
        byType: Object.values(byType)
    };

    this.summary.totalRecords = leaves.length;
    this.summary.metrics = metrics;

    return {
        title: this.title,
        subtitle: this.subtitle,
        dateRange: this.dateRange,
        summary: metrics,
        data: leaves
    };
};

/**
 * Instance method to generate payroll report
 * 
 * @returns {Promise<Object>} Report data
 */
reportExportSchema.methods.generatePayrollReport = async function () {
    const Payroll = mongoose.model('Payroll');
    const User = mongoose.model('User');

    // Generate period string from date range
    const year = this.dateRange.startDate.getFullYear();
    const month = String(this.dateRange.startDate.getMonth() + 1).padStart(2, '0');
    const period = `${year}-${month}`;

    const query = { period };

    let employees = [];
    if (this.filters.department) {
        employees = await User.find({
            department: this.filters.department,
            isActive: true
        });
    } else if (this.filters.employee) {
        employees = await User.find({
            _id: this.filters.employee,
            isActive: true
        });
    } else {
        employees = await User.find({ isActive: true });
    }

    const employeeIds = employees.map(e => e._id);
    query.employee = { $in: employeeIds };

    const payrolls = await Payroll.find(query)
        .populate({
            path: 'employee',
            select: 'profile employeeId department position',
            populate: [
                { path: 'department', select: 'name code' },
                { path: 'position', select: 'title' }
            ]
        })
        .sort({ 'employee.employeeId': 1 });

    const metrics = {
        totalEmployees: employees.length,
        processedPayrolls: payrolls.length,
        totalDeductions: payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0),
        averageDeductions: payrolls.length > 0
            ? payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0) / payrolls.length
            : 0
    };

    this.summary.totalRecords = payrolls.length;
    this.summary.metrics = metrics;

    return {
        title: this.title,
        subtitle: this.subtitle,
        dateRange: this.dateRange,
        period,
        summary: metrics,
        data: payrolls
    };
};

/**
 * Instance method to generate vacation balance report
 * 
 * @returns {Promise<Object>} Report data
 */
reportExportSchema.methods.generateVacationBalanceReport = async function () {
    const VacationBalance = mongoose.model('VacationBalance');
    const User = mongoose.model('User');

    let query = { year: this.dateRange.startDate.getFullYear() };

    let employees = [];
    if (this.filters.department) {
        employees = await User.find({
            department: this.filters.department,
            isActive: true
        });
        const employeeIds = employees.map(e => e._id);
        query.employee = { $in: employeeIds };
    } else if (this.filters.employee) {
        query.employee = this.filters.employee;
    }

    const balances = await VacationBalance.find(query)
        .populate({
            path: 'employee',
            select: 'profile employeeId department position employment',
            populate: [
                { path: 'department', select: 'name code' },
                { path: 'position', select: 'title' }
            ]
        })
        .sort({ 'employee.employeeId': 1 });

    const metrics = {
        totalEmployees: balances.length,
        totalAllocated: balances.reduce((sum, b) => sum + b.annual.allocated + b.casual.allocated, 0),
        totalUsed: balances.reduce((sum, b) => sum + b.annual.used + b.casual.used, 0),
        totalAvailable: balances.reduce((sum, b) => sum + b.annual.available + b.casual.available, 0),
        totalCarriedOver: balances.reduce((sum, b) => sum + (b.annual.carriedOver || 0), 0)
    };

    this.summary.totalRecords = balances.length;
    this.summary.metrics = metrics;

    return {
        title: this.title,
        subtitle: this.subtitle,
        dateRange: this.dateRange,
        summary: metrics,
        data: balances
    };
};

/**
 * Instance method to mark export as completed
 * 
 * @param {String} filePath - Path to exported file
 * @param {Number} fileSize - File size in bytes
 * @returns {Promise<ReportExport>} Updated export record
 */
reportExportSchema.methods.markCompleted = async function (filePath, fileSize) {
    this.status = 'completed';
    this.processing.completedAt = new Date();
    this.processing.duration = this.processing.completedAt - this.processing.startedAt;
    this.exportFile.filePath = filePath;
    this.exportFile.fileSize = fileSize;

    // Set MIME type
    const mimeTypes = {
        'html': 'text/html',
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'pdf': 'application/pdf'
    };
    this.exportFile.mimeType = mimeTypes[this.exportFormat];

    return await this.save();
};

/**
 * Instance method to mark export as failed
 * 
 * @param {String} errorMessage - Error message
 * @returns {Promise<ReportExport>} Updated export record
 */
reportExportSchema.methods.markFailed = async function (errorMessage) {
    this.status = 'failed';
    this.processing.completedAt = new Date();
    this.processing.duration = this.processing.completedAt - this.processing.startedAt;
    this.processing.errorMessage = errorMessage;
    return await this.save();
};

/**
 * Instance method to log access
 * 
 * @param {ObjectId} userId - User accessing the report
 * @param {String} action - Action performed (view, download, share)
 * @returns {Promise<ReportExport>} Updated export record
 */
reportExportSchema.methods.logAccess = async function (userId, action = 'view') {
    this.accessLog.push({
        accessedBy: userId,
        accessedAt: new Date(),
        action
    });
    return await this.save();
};

/**
 * Static method to create and generate report
 * 
 * @param {Object} reportData - Report configuration
 * @param {ObjectId} userId - User generating the report
 * @returns {Promise<ReportExport>} Created export record
 */
reportExportSchema.statics.createReport = async function (reportData, userId) {
    // Get report configuration
    const config = await ReportConfig.getConfig(reportData.organization || 'default');

    // Get date range
    const dateRange = config.getDateRange(
        reportData.rangeType || 'hr-month',
        reportData.customStart,
        reportData.customEnd
    );

    // Create export record
    const exportRecord = new this({
        reportType: reportData.reportType,
        title: reportData.title,
        exportFormat: reportData.exportFormat || 'html',
        dateRange: {
            rangeType: reportData.rangeType || 'hr-month',
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            label: dateRange.label
        },
        filters: reportData.filters || {},
        reportConfig: config._id,
        generatedBy: userId,
        organization: reportData.organization || 'default',
        settings: reportData.settings || {},
        tags: reportData.tags || []
    });

    exportRecord.processing.startedAt = new Date();
    exportRecord.status = 'generating';

    await exportRecord.save();
    return exportRecord;
};

/**
 * Static method to get user's export history
 * 
 * @param {ObjectId} userId - User ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<ReportExport[]>} List of exports
 */
reportExportSchema.statics.getUserExports = function (userId, filters = {}) {
    const query = { generatedBy: userId, ...filters };

    return this.find(query)
        .populate('filters.department', 'name code')
        .populate('filters.employee', 'profile employeeId')
        .populate('reportConfig')
        .sort({ createdAt: -1 })
        .limit(50);
};

/**
 * Static method to cleanup expired exports
 * 
 * @returns {Promise<Number>} Number of deleted exports
 */
reportExportSchema.statics.cleanupExpired = async function () {
    const result = await this.deleteMany({
        expiresAt: { $lt: new Date() },
        status: 'completed'
    });

    return result.deletedCount;
};

/**
 * Static method to get export statistics
 * 
 * @param {String} organization - Organization name
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Statistics
 */
reportExportSchema.statics.getExportStats = async function (organization = 'default', startDate, endDate) {
    const query = { organization };

    if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const stats = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    reportType: '$reportType',
                    exportFormat: '$exportFormat',
                    status: '$status'
                },
                count: { $sum: 1 },
                totalSize: { $sum: '$exportFile.fileSize' },
                avgDuration: { $avg: '$processing.duration' }
            }
        },
        {
            $group: {
                _id: '$_id.reportType',
                formats: {
                    $push: {
                        format: '$_id.exportFormat',
                        status: '$_id.status',
                        count: '$count',
                        totalSize: '$totalSize',
                        avgDuration: '$avgDuration'
                    }
                },
                totalExports: { $sum: '$count' }
            }
        }
    ]);

    return stats;
};

// Compound indexes for better performance
reportExportSchema.index({ generatedBy: 1, createdAt: -1 });
reportExportSchema.index({ reportType: 1, status: 1 });
reportExportSchema.index({ organization: 1, reportType: 1 });
reportExportSchema.index({ 'dateRange.startDate': 1, 'dateRange.endDate': 1 });
reportExportSchema.index({ expiresAt: 1 });
reportExportSchema.index({ 'filters.department': 1 });
reportExportSchema.index({ 'filters.employee': 1 });
reportExportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('ReportExport', reportExportSchema);
