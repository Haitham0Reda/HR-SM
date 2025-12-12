// models/Request.js
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: [true, 'Tenant ID is required'],
        index: true,
        trim: true
    },
    requestType: {
        type: String,
        enum: ['overtime', 'vacation', 'mission', 'forget-check', 'permission', 'sick-leave', 'day-swap'],
        required: true,
        index: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },
    requestData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    approvalChain: [{
        approver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected']
        },
        comments: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    // Final reviewer (for backward compatibility)
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    comments: String,
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound indexes for tenant isolation and performance
requestSchema.index({ tenantId: 1, requestedBy: 1, status: 1 });
requestSchema.index({ tenantId: 1, requestType: 1, status: 1 });
requestSchema.index({ tenantId: 1, createdAt: -1 });

/**
 * Instance method to approve request
 */
requestSchema.methods.approve = async function (approverId, comments = '') {
    // Validate status transition
    if (this.status !== 'pending') {
        throw new Error(`Cannot approve request with status: ${this.status}`);
    }
    
    this.status = 'approved';
    this.reviewer = approverId;
    this.reviewedAt = new Date();
    this.comments = comments;
    
    // Add to approval chain
    this.approvalChain.push({
        approver: approverId,
        status: 'approved',
        comments,
        timestamp: new Date()
    });
    
    return await this.save();
};

/**
 * Instance method to reject request
 */
requestSchema.methods.reject = async function (approverId, comments = '') {
    // Validate status transition
    if (this.status !== 'pending') {
        throw new Error(`Cannot reject request with status: ${this.status}`);
    }
    
    this.status = 'rejected';
    this.reviewer = approverId;
    this.reviewedAt = new Date();
    this.comments = comments;
    
    // Add to approval chain
    this.approvalChain.push({
        approver: approverId,
        status: 'rejected',
        comments,
        timestamp: new Date()
    });
    
    return await this.save();
};

/**
 * Instance method to cancel request
 */
requestSchema.methods.cancel = async function (userId, comments = '') {
    // Validate status transition
    if (this.status !== 'pending') {
        throw new Error(`Cannot cancel request with status: ${this.status}`);
    }
    
    // Only the requester can cancel
    if (this.requestedBy.toString() !== userId.toString()) {
        throw new Error('Only the requester can cancel the request');
    }
    
    this.status = 'cancelled';
    this.comments = comments;
    
    return await this.save();
};

/**
 * Static method to get requests by tenant and status
 */
requestSchema.statics.getByTenantAndStatus = function (tenantId, status) {
    return this.find({ tenantId, status })
        .populate('requestedBy', 'username email employeeId personalInfo')
        .populate('reviewer', 'username email')
        .sort({ createdAt: -1 });
};

/**
 * Static method to get requests by type
 */
requestSchema.statics.getByType = function (tenantId, requestType) {
    return this.find({ tenantId, requestType })
        .populate('requestedBy', 'username email employeeId personalInfo')
        .populate('reviewer', 'username email')
        .sort({ createdAt: -1 });
};

/**
 * Static method to get pending requests for approval
 */
requestSchema.statics.getPendingRequests = function (tenantId) {
    return this.find({ tenantId, status: 'pending' })
        .populate('requestedBy', 'username email employeeId personalInfo department')
        .populate('approvalChain.approver', 'username email')
        .sort({ createdAt: 1 });
};

export default mongoose.model('Request', requestSchema);
