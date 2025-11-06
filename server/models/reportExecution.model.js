/**
 * Report Execution Model
 * 
 * Stores report execution history and results
 */
import mongoose from 'mongoose';

const reportExecutionSchema = new mongoose.Schema({
    // Report Reference
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
        required: true,
        index: true
    },
    reportName: String,

    // Execution Details
    executedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    executionType: {
        type: String,
        enum: ['manual', 'scheduled', 'api'],
        default: 'manual'
    },

    // Parameters
    parameters: {
        startDate: Date,
        endDate: Date,
        filters: mongoose.Schema.Types.Mixed,
        additionalParams: mongoose.Schema.Types.Mixed
    },

    // Results
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    duration: Number, // milliseconds

    // Data
    resultCount: {
        type: Number,
        default: 0
    },
    resultData: mongoose.Schema.Types.Mixed, // Store small results
    resultFile: String, // Path to file for large results

    // Export
    exportFormat: {
        type: String,
        enum: ['excel', 'pdf', 'csv', 'html', 'json']
    },
    exportPath: String,
    exportSize: Number, // bytes

    // Error Information
    error: {
        message: String,
        stack: String,
        code: String
    },

    // Delivery (for scheduled reports)
    emailSent: {
        type: Boolean,
        default: false
    },
    emailRecipients: [String],
    emailSentAt: Date,

    // Metadata
    executionTime: Date,
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

// Indexes
reportExecutionSchema.index({ report: 1, createdAt: -1 });
reportExecutionSchema.index({ executedBy: 1, createdAt: -1 });
reportExecutionSchema.index({ status: 1, createdAt: -1 });
reportExecutionSchema.index({ executionType: 1, createdAt: -1 });

// TTL index to auto-delete old executions after 90 days
reportExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Method to mark as completed
reportExecutionSchema.methods.markCompleted = async function (resultCount, resultData = null) {
    this.status = 'completed';
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
    this.resultCount = resultCount;

    if (resultData) {
        this.resultData = resultData;
    }

    return await this.save();
};

// Method to mark as failed
reportExecutionSchema.methods.markFailed = async function (error) {
    this.status = 'failed';
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
    this.error = {
        message: error.message,
        stack: error.stack,
        code: error.code
    };

    return await this.save();
};

// Static method to get execution history
reportExecutionSchema.statics.getHistory = function (reportId, options = {}) {
    const { limit = 50, skip = 0 } = options;

    return this.find({ report: reportId })
        .populate('executedBy', 'username email profile.firstName profile.lastName')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get statistics
reportExecutionSchema.statics.getStatistics = async function (reportId, days = 30) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const stats = await this.aggregate([
        {
            $match: {
                report: mongoose.Types.ObjectId(reportId),
                createdAt: { $gte: dateThreshold }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgDuration: { $avg: '$duration' },
                totalRecords: { $sum: '$resultCount' }
            }
        }
    ]);

    return stats;
};

export default mongoose.model('ReportExecution', reportExecutionSchema);
