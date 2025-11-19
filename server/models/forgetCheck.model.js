// models/ForgetCheck.js
import mongoose from 'mongoose';

const forgetCheckSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true
    },
    requestType: {
        type: String,
        enum: ['forget-check-in', 'forget-check-out'],
        required: true
    },
    requestedTime: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: {
        type: String,
        trim: true
    },
    // Employee's department (denormalized for faster queries)
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },
    // Employee's position (denormalized for faster queries)
    position: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position'
    },
    // Metadata
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound indexes for better performance
forgetCheckSchema.index({ employee: 1, date: 1 });
forgetCheckSchema.index({ department: 1, date: 1 });
forgetCheckSchema.index({ requestType: 1 });

// Virtual for formatted date
forgetCheckSchema.virtual('formattedDate').get(function () {
    return this.date.toISOString().split('T')[0];
});

// Virtual for formatted requested time
forgetCheckSchema.virtual('formattedRequestedTime').get(function () {
    return this.requestedTime.toLocaleTimeString();
});

// Ensure virtuals are included in JSON
forgetCheckSchema.set('toJSON', { virtuals: true });
forgetCheckSchema.set('toObject', { virtuals: true });

export default mongoose.model('ForgetCheck', forgetCheckSchema);