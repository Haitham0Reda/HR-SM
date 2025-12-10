/**
 * Report Model
 * 
 * Custom report definitions and configurations
 */
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    // Report Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500
    },
    reportType: {
        type: String,
        enum: [
            'employee',
            'attendance',
            'leave',
            'payroll',
            'performance',
            'request',
            'department',
            'custom'
        ],
        required: true,
        index: true
    },

    // Report Configuration
    fields: [{
        fieldName: {
            type: String,
            required: true
        },
        displayName: String,
        dataType: {
            type: String,
            enum: ['string', 'number', 'date', 'boolean', 'array', 'object']
        },
        format: String, // Date format, number format, etc.
        aggregation: {
            type: String,
            enum: ['sum', 'avg', 'count', 'min', 'max', 'none'],
            default: 'none'
        }
    }],

    // Filters
    filters: [{
        field: String,
        operator: {
            type: String,
            enum: [
                'equals',
                'notEquals',
                'contains',
                'notContains',
                'startsWith',
                'endsWith',
                'greaterThan',
                'lessThan',
                'greaterThanOrEqual',
                'lessThanOrEqual',
                'between',
                'in',
                'notIn',
                'isNull',
                'isNotNull'
            ]
        },
        value: mongoose.Schema.Types.Mixed,
        logicOperator: {
            type: String,
            enum: ['AND', 'OR'],
            default: 'AND'
        }
    }],

    // Sorting
    sorting: [{
        field: String,
        order: {
            type: String,
            enum: ['asc', 'desc'],
            default: 'asc'
        }
    }],

    // Grouping
    groupBy: [String],

    // Visualization
    visualization: {
        enabled: {
            type: Boolean,
            default: false
        },
        chartType: {
            type: String,
            enum: ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 'table']
        },
        xAxis: String,
        yAxis: String,
        colors: [String]
    },

    // Template
    isTemplate: {
        type: Boolean,
        default: false
    },
    templateCategory: String,

    // Scheduling
    schedule: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']
        },
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6 // 0 = Sunday
        },
        dayOfMonth: {
            type: Number,
            min: 1,
            max: 31
        },
        time: String, // HH:mm format
        cronExpression: String,
        lastRun: Date,
        nextRun: Date,
        recipients: [{
            type: String,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }]
    },

    // Export Settings
    exportSettings: {
        defaultFormat: {
            type: String,
            enum: ['excel', 'pdf', 'csv', 'html'],
            default: 'excel'
        },
        includeCharts: {
            type: Boolean,
            default: false
        },
        pageOrientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        },
        paperSize: {
            type: String,
            enum: ['A4', 'Letter', 'Legal'],
            default: 'A4'
        }
    },

    // Access Control
    isPublic: {
        type: Boolean,
        default: false
    },
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        }
    }],

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastRun: Date,
    runCount: {
        type: Number,
        default: 0
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// Indexes
reportSchema.index({ name: 1, createdBy: 1 });
reportSchema.index({ reportType: 1, isActive: 1 });
reportSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });

// Virtual for next scheduled run
reportSchema.virtual('nextScheduledRun').get(function () {
    if (!this.schedule.enabled) return null;
    return this.schedule.nextRun;
});

// Method to calculate next run time
reportSchema.methods.calculateNextRun = function () {
    if (!this.schedule.enabled) return null;

    const now = new Date();
    let nextRun = new Date();

    switch (this.schedule.frequency) {
        case 'daily':
            nextRun.setDate(nextRun.getDate() + 1);
            break;
        case 'weekly':
            nextRun.setDate(nextRun.getDate() + 7);
            break;
        case 'monthly':
            nextRun.setMonth(nextRun.getMonth() + 1);
            if (this.schedule.dayOfMonth) {
                nextRun.setDate(this.schedule.dayOfMonth);
            }
            break;
        case 'quarterly':
            nextRun.setMonth(nextRun.getMonth() + 3);
            break;
        case 'yearly':
            nextRun.setFullYear(nextRun.getFullYear() + 1);
            break;
    }

    // Set time if specified
    if (this.schedule.time) {
        const [hours, minutes] = this.schedule.time.split(':');
        nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    return nextRun;
};

// Method to update run statistics
reportSchema.methods.recordRun = async function () {
    this.lastRun = new Date();
    this.runCount += 1;

    if (this.schedule.enabled) {
        this.schedule.lastRun = new Date();
        this.schedule.nextRun = this.calculateNextRun();
    }

    return await this.save();
};

// Static method to get scheduled reports
reportSchema.statics.getScheduledReports = function () {
    return this.find({
        'schedule.enabled': true,
        'schedule.nextRun': { $lte: new Date() },
        isActive: true
    }).populate('createdBy', 'username email');
};

// Static method to get user reports
reportSchema.statics.getUserReports = function (userId) {
    return this.find({
        $or: [
            { createdBy: userId },
            { isPublic: true },
            { 'sharedWith.user': userId }
        ],
        isActive: true
    }).populate('createdBy', 'username email employeeId personalInfo');
};

// Static method to get templates
reportSchema.statics.getTemplates = function () {
    return this.find({
        isTemplate: true,
        isActive: true
    }).sort({ templateCategory: 1, name: 1 });
};

export default mongoose.model('Report', reportSchema);
