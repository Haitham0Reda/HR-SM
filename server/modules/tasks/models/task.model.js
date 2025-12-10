import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assigner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['assigned', 'in-progress', 'submitted', 'reviewed', 'completed', 'rejected'],
        default: 'assigned'
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
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ assigner: 1, status: 1 });
taskSchema.index({ tenantId: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

export default mongoose.model('Task', taskSchema);