import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const insurancePolicySchema = new mongoose.Schema({
    // Auto-generated policy number (format: INS-YYYY-NNNNNN)
    policyNumber: {
        type: String,
        unique: true,
        index: true
    },
    
    // Employee information (references hr-core User model)
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    employeeNumber: {
        type: String,
        required: true,
        index: true
    },
    
    // Policy details
    policyType: {
        type: String,
        enum: ['CAT_A', 'CAT_B', 'CAT_C'],
        required: true,
        index: true
    },
    coverageAmount: {
        type: Number,
        required: true,
        min: 0
    },
    premium: {
        type: Number,
        required: true,
        min: 0
    },
    deductible: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Policy dates
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    
    // Policy status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'expired', 'cancelled'],
        default: 'active',
        index: true
    },
    
    // Family members covered under this policy
    familyMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember'
    }],
    
    // Beneficiaries
    beneficiaries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Beneficiary'
    }],
    
    // Claims associated with this policy
    claims: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InsuranceClaim'
    }],
    
    // Policy history and audit trail
    history: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'activated', 'suspended', 'cancelled', 'renewed'],
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
        previousValues: mongoose.Schema.Types.Mixed
    }],
    
    // Additional metadata
    notes: String,
    tags: [String]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Apply base schema plugin for multi-tenancy
insurancePolicySchema.plugin(baseSchemaPlugin);

// Compound indexes for efficient queries
insurancePolicySchema.index({ tenantId: 1, employeeId: 1 });
insurancePolicySchema.index({ tenantId: 1, policyType: 1, status: 1 });
insurancePolicySchema.index({ tenantId: 1, startDate: 1, endDate: 1 });
insurancePolicySchema.index({ tenantId: 1, status: 1, endDate: 1 });

// Virtual for checking if policy is active
insurancePolicySchema.virtual('isActive').get(function() {
    const now = new Date();
    return this.status === 'active' && 
           this.startDate <= now && 
           this.endDate >= now;
});

// Virtual for checking if policy is expired
insurancePolicySchema.virtual('isExpired').get(function() {
    return new Date() > this.endDate;
});

// Virtual for days until expiry
insurancePolicySchema.virtual('daysUntilExpiry').get(function() {
    const now = new Date();
    const diffTime = this.endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to auto-generate policy number
insurancePolicySchema.pre('save', function(next) {
    if (this.isNew && !this.policyNumber) {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        this.policyNumber = `INS-${year}-${randomNum}`;
    }
    next();
});

// Pre-save middleware to validate dates
insurancePolicySchema.pre('save', function(next) {
    if (this.startDate >= this.endDate) {
        const error = new Error('End date must be after start date');
        error.name = 'ValidationError';
        return next(error);
    }
    next();
});

// Pre-save middleware to update status based on dates
insurancePolicySchema.pre('save', function(next) {
    const now = new Date();
    
    if (this.status === 'active') {
        if (now > this.endDate) {
            this.status = 'expired';
        } else if (now < this.startDate) {
            this.status = 'inactive';
        }
    }
    
    next();
});

// Method to add family member
insurancePolicySchema.methods.addFamilyMember = function(familyMemberId) {
    if (!this.familyMembers.includes(familyMemberId)) {
        this.familyMembers.push(familyMemberId);
    }
    return this.save();
};

// Method to remove family member
insurancePolicySchema.methods.removeFamilyMember = function(familyMemberId) {
    this.familyMembers = this.familyMembers.filter(
        id => !id.equals(familyMemberId)
    );
    return this.save();
};

// Method to add beneficiary
insurancePolicySchema.methods.addBeneficiary = function(beneficiaryId) {
    if (!this.beneficiaries.includes(beneficiaryId)) {
        this.beneficiaries.push(beneficiaryId);
    }
    return this.save();
};

// Method to add history entry
insurancePolicySchema.methods.addHistoryEntry = function(action, performedBy, notes = '', previousValues = null) {
    this.history.push({
        action,
        performedBy,
        timestamp: new Date(),
        notes,
        previousValues
    });
    return this.save();
};

// Static method to find active policies
insurancePolicySchema.statics.findActivePolicies = function(tenantId, employeeId = null) {
    const query = {
        tenantId,
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
    };
    
    if (employeeId) {
        query.employeeId = employeeId;
    }
    
    return this.find(query);
};

// Static method to find expiring policies
insurancePolicySchema.statics.findExpiringPolicies = function(tenantId, daysAhead = 30) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
    
    return this.find({
        tenantId,
        status: 'active',
        endDate: {
            $gte: now,
            $lte: futureDate
        }
    });
};

const InsurancePolicy = mongoose.model('InsurancePolicy', insurancePolicySchema);

export default InsurancePolicy;