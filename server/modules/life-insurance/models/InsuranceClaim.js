import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const insuranceClaimSchema = new mongoose.Schema({
    // Auto-generated claim number (format: CLM-YYYY-NNNNNN)
    claimNumber: {
        type: String,
        unique: true,
        index: true
    },
    
    // References
    policyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InsurancePolicy',
        required: true,
        index: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Claimant information (could be employee or family member)
    claimantType: {
        type: String,
        enum: ['employee', 'family_member'],
        required: true
    },
    claimantId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'claimantModel',
        required: true
    },
    claimantModel: {
        type: String,
        enum: ['User', 'FamilyMember'],
        required: true
    },
    
    // Claim details
    claimType: {
        type: String,
        enum: ['death', 'disability', 'medical', 'accident', 'other'],
        required: true,
        index: true
    },
    incidentDate: {
        type: Date,
        required: true,
        index: true
    },
    claimAmount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true
    },
    
    // Claim status and workflow
    status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'],
        default: 'pending',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    
    // Review information
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String,
    
    // Payment information
    approvedAmount: {
        type: Number,
        min: 0
    },
    paymentDate: Date,
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'check', 'cash', 'other']
    },
    paymentReference: String,
    
    // Documents and attachments
    documents: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        documentType: {
            type: String,
            enum: ['medical_report', 'death_certificate', 'police_report', 'invoice', 'receipt', 'other']
        }
    }],
    
    // Workflow history
    workflow: [{
        status: {
            type: String,
            enum: ['pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'],
            required: true
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: String,
        previousStatus: String
    }],
    
    // Additional information
    notes: String,
    tags: [String],
    
    // Deadline tracking
    submissionDeadline: Date,
    reviewDeadline: Date,
    paymentDeadline: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Apply base schema plugin for multi-tenancy
insuranceClaimSchema.plugin(baseSchemaPlugin);

// Compound indexes for efficient queries
insuranceClaimSchema.index({ tenantId: 1, employeeId: 1, status: 1 });
insuranceClaimSchema.index({ tenantId: 1, policyId: 1, status: 1 });
insuranceClaimSchema.index({ tenantId: 1, claimType: 1, status: 1 });
insuranceClaimSchema.index({ tenantId: 1, incidentDate: 1 });
insuranceClaimSchema.index({ tenantId: 1, status: 1, priority: 1 });

// Virtual for checking if claim is overdue
insuranceClaimSchema.virtual('isOverdue').get(function() {
    const now = new Date();
    
    if (this.status === 'pending' && this.submissionDeadline && now > this.submissionDeadline) {
        return true;
    }
    
    if (this.status === 'under_review' && this.reviewDeadline && now > this.reviewDeadline) {
        return true;
    }
    
    if (this.status === 'approved' && this.paymentDeadline && now > this.paymentDeadline) {
        return true;
    }
    
    return false;
});

// Virtual for days since submission
insuranceClaimSchema.virtual('daysSinceSubmission').get(function() {
    const diffTime = new Date() - this.createdAt;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for processing time (if completed)
insuranceClaimSchema.virtual('processingDays').get(function() {
    if (!this.reviewedAt) return null;
    
    const diffTime = this.reviewedAt - this.createdAt;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to auto-generate claim number
insuranceClaimSchema.pre('save', function(next) {
    if (this.isNew && !this.claimNumber) {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        this.claimNumber = `CLM-${year}-${randomNum}`;
    }
    next();
});

// Pre-save middleware to validate incident date
insuranceClaimSchema.pre('save', function(next) {
    if (this.incidentDate > new Date()) {
        const error = new Error('Incident date cannot be in the future');
        error.name = 'ValidationError';
        return next(error);
    }
    next();
});

// Pre-save middleware to set claimant model based on type
insuranceClaimSchema.pre('save', function(next) {
    if (this.claimantType === 'employee') {
        this.claimantModel = 'User';
    } else if (this.claimantType === 'family_member') {
        this.claimantModel = 'FamilyMember';
    }
    next();
});

// Pre-save middleware to track status changes
insuranceClaimSchema.pre('save', function(next) {
    // Check if we have workflow data to add (from updateStatus, approve, or reject methods)
    if (this._workflowPerformedBy && !this.isNew) {
        // Use the stored previous status or current status if no change
        const previousStatus = this._previousStatus || this.status;
            
        // Use the performedBy and notes from updateStatus method
        const performedBy = this._workflowPerformedBy;
        const notes = this._workflowNotes || '';
            
        this.workflow.push({
            status: this.status,
            performedBy: performedBy,
            timestamp: new Date(),
            notes: notes,
            previousStatus: previousStatus
        });
        
        // Clean up temporary fields
        delete this._workflowNotes;
        delete this._workflowPerformedBy;
        delete this._previousStatus;
        
        // Set review timestamp if status changed to reviewed states
        if (['approved', 'rejected'].includes(this.status) && !this.reviewedAt) {
            this.reviewedAt = new Date();
        }
    } 
    // Also track direct status changes (when status is modified but no method was used)
    else if (this.isModified('status') && !this.isNew) {
        // For direct status changes, use a default performer
        const performedBy = this.reviewedBy || this.employeeId;
        
        this.workflow.push({
            status: this.status,
            performedBy: performedBy,
            timestamp: new Date(),
            notes: '',
            previousStatus: 'pending' // Default since we don't have the previous status
        });
        
        // Set review timestamp if status changed to reviewed states
        if (['approved', 'rejected'].includes(this.status) && !this.reviewedAt) {
            this.reviewedAt = new Date();
        }
    }
    next();
});

// Method to add document
insuranceClaimSchema.methods.addDocument = function(documentData) {
    this.documents.push({
        ...documentData,
        uploadedAt: new Date()
    });
    return this.save();
};

// Method to update status with workflow tracking
insuranceClaimSchema.methods.updateStatus = function(newStatus, performedBy, notes = '') {
    // Store the previous status before changing it
    this._previousStatus = this.status;
    this.status = newStatus;
    
    if (performedBy) {
        this.reviewedBy = performedBy;
    }
    
    // Store notes for the pre-save middleware to use
    this._workflowNotes = notes;
    this._workflowPerformedBy = performedBy;
    
    return this.save();
};

// Method to approve claim
insuranceClaimSchema.methods.approve = function(approvedAmount, performedBy, notes = '') {
    // Store the previous status before changing it
    this._previousStatus = this.status;
    this.status = 'approved';
    this.approvedAmount = approvedAmount;
    this.reviewedBy = performedBy;
    this.reviewedAt = new Date();
    this.reviewNotes = notes;
    
    // Store notes for the pre-save middleware to use
    this._workflowNotes = `Approved for amount: ${approvedAmount}. ${notes}`;
    this._workflowPerformedBy = performedBy;
    
    return this.save();
};

// Method to reject claim
insuranceClaimSchema.methods.reject = function(performedBy, reason) {
    // Store the previous status before changing it
    this._previousStatus = this.status;
    this.status = 'rejected';
    this.reviewedBy = performedBy;
    this.reviewedAt = new Date();
    this.reviewNotes = reason;
    
    // Store notes for the pre-save middleware to use
    this._workflowNotes = `Rejected: ${reason}`;
    this._workflowPerformedBy = performedBy;
    
    return this.save();
};

// Static method to find claims by status
insuranceClaimSchema.statics.findByStatus = function(tenantId, status, employeeId = null) {
    const query = { tenantId, status };
    
    if (employeeId) {
        query.employeeId = employeeId;
    }
    
    return this.find(query).sort({ createdAt: -1 });
};

// Static method to find overdue claims
insuranceClaimSchema.statics.findOverdueClaims = function(tenantId) {
    const now = new Date();
    
    return this.find({
        tenantId,
        $or: [
            {
                status: 'pending',
                submissionDeadline: { $lt: now }
            },
            {
                status: 'under_review',
                reviewDeadline: { $lt: now }
            },
            {
                status: 'approved',
                paymentDeadline: { $lt: now }
            }
        ]
    });
};

// Static method to get claims statistics
insuranceClaimSchema.statics.getStatistics = function(tenantId, dateRange = null) {
    const matchStage = { tenantId };
    
    if (dateRange) {
        matchStage.createdAt = {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
        };
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$claimAmount' },
                approvedAmount: { $sum: '$approvedAmount' }
            }
        }
    ]);
};

const InsuranceClaim = mongoose.model('InsuranceClaim', insuranceClaimSchema);

export default InsuranceClaim;