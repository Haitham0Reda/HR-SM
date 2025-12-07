import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const taskReportSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportText: {
        type: String,
        required: true,
        minlength: 50
    },
    timeSpent: {
        hours: { type: Number, min: 0 },
        minutes: { type: Number, min: 0, max: 59 }
    },
    files: [{
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    reviewComments: String,
    version: {
        type: Number,
        default: 1
    }
});

taskReportSchema.plugin(baseSchemaPlugin);

// Indexes
taskReportSchema.index({ task: 1, version: 1, tenantId: 1 });
taskReportSchema.index({ submittedBy: 1, status: 1, tenantId: 1 });
taskReportSchema.index({ submittedAt: -1, tenantId: 1 });

// Virtual for total time spent in minutes
taskReportSchema.virtual('totalMinutes').get(function () {
    if (!this.timeSpent) return 0;
    return (this.timeSpent.hours || 0) * 60 + (this.timeSpent.minutes || 0);
});

// Method to approve report
taskReportSchema.methods.approve = function (reviewerId, comments) {
    this.status = 'approved';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.reviewComments = comments;
};

// Method to reject report
taskReportSchema.methods.reject = function (reviewerId, comments) {
    this.status = 'rejected';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.reviewComments = comments;
};

// Static method to get latest report for a task
taskReportSchema.statics.getLatestForTask = function (taskId, tenantId) {
    return this.findOne({ task: taskId, tenantId })
        .sort({ version: -1 })
        .populate('submittedBy', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email');
};

// Static method to get report history for a task
taskReportSchema.statics.getHistoryForTask = function (taskId, tenantId) {
    return this.find({ task: taskId, tenantId })
        .sort({ version: -1 })
        .populate('submittedBy', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email');
};

const TaskReport = mongoose.model('TaskReport', taskReportSchema);

export default TaskReport;
