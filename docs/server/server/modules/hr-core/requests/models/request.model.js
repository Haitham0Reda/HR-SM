// models/Request.js
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    requestType: {
        type: String,
        enum: ['overtime', 'vacation', 'mission', 'forget-check', 'permission'],
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    requestData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    // Legacy fields for backward compatibility
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    comments: {
        type: String
    },
    // Modern approval chain structure
    approvalChain: [{
        approver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'cancelled']
        },
        comments: String,
        timestamp: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for tenant isolation and performance
requestSchema.index({ tenantId: 1, requestType: 1, status: 1 });
requestSchema.index({ tenantId: 1, requestedBy: 1 });

export default mongoose.model('Request', requestSchema);
