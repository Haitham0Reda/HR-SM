import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

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
    status: {
        type: String,
        enum: ['assigned', 'in-progress', 'submitted', 'reviewed', 'completed', 'rejected'],
        default: 'assigned'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
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
    completedAt: Date,
    tags: [String],
    attachments: [{
        filename: String,
        path: String,
        size: Number,
        uploadedAt: Date
    }]
});

taskSchema.plugin(baseSchemaPlugin);

// Indexes for performance
taskSchema.index({ assignedTo: 1, status: 1, tenantId: 1 });
taskSchema.index({ assignedBy: 1, tenantId: 1 });
taskSchema.index({ dueDate: 1, status: 1, tenantId: 1 });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function () {
    if (this.status === 'completed') return false;
    return new Date() > this.dueDate;
});

// Virtual for checking if task is late
taskSchema.virtual('isLate').get(function () {
    if (!this.completedAt) return false;
    return this.completedAt > this.dueDate;
});

// Method to check if user can modify task
taskSchema.methods.canModify = function (userId) {
    return this.assignedBy.toString() === userId.toString();
};

// Method to check if user can submit report
taskSchema.methods.canSubmitReport = function (userId) {
    return this.assignedTo.toString() === userId.toString();
};

// Validation: dueDate must be after startDate
taskSchema.pre('validate', function (next) {
    if (this.dueDate <= this.startDate) {
        next(new Error('Due date must be after start date'));
    }
    next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
