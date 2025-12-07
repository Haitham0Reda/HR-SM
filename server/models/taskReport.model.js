import mongoose from 'mongoose';

const taskReportSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    reportText: {
        type: String,
        required: true
    },
    timeSpent: {
        type: Number, // in minutes
        min: 0
    },
    files: [{
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimeType: String
    }],
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'rejected'],
        default: 'draft'
    },
    reviewComments: String,
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Multi-tenant support
    tenantId: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
taskReportSchema.index({ taskId: 1 });
taskReportSchema.index({ tenantId: 1, status: 1 });
taskReportSchema.index({ submittedAt: 1 });

export default mongoose.model('TaskReport', taskReportSchema);