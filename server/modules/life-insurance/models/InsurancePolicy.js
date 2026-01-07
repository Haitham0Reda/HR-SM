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

// Pre-save middleware for tenant validation
insurancePolicySchema.pre('save', function(next) {
    if (!this.tenantId) {
        const error = new Error('TenantId is required for insurance policy');
        error.name = 'ValidationError';
        return next(error);
    }
    next();
});

// Static method to find policies by tenant with role-based filtering
insurancePolicySchema.statics.findByTenant = function(tenantId, filters = {}) {
    return this.withTenant(tenantId).find(filters);
};

// Static method to find policies by tenant and employee with role-based access
insurancePolicySchema.statics.findByTenantAndEmployee = function(tenantId, employeeId, userRole, userDepartment = null) {
    const query = { tenantId };
    
    // Apply role-based filtering
    if (userRole === 'employee') {
        query.employeeId = employeeId;
    } else if (userRole === 'manager' && userDepartment) {
        // For managers, we need to join with User model to filter by department
        // This will be handled in the controller layer with population
        query.employeeId = employeeId; // Will be expanded in controller
    }
    // HR and Admin roles get access to all policies within tenant (no additional filtering)
    
    return this.find(query);
};

// Static method to find active policies with role-based access
insurancePolicySchema.statics.findActivePolicies = function(tenantId, employeeId = null, userRole = null, userDepartment = null) {
    const query = {
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
    };
    
    // Apply role-based filtering
    if (userRole === 'employee' && employeeId) {
        query.employeeId = employeeId;
    } else if (userRole === 'manager' && userDepartment && employeeId) {
        // Manager access will be validated in controller layer
        query.employeeId = employeeId;
    }
    
    return this.withTenant(tenantId).find(query);
};

// Static method to find expiring policies with role-based access
insurancePolicySchema.statics.findExpiringPolicies = function(tenantId, daysAhead = 30, userRole = null, userDepartment = null, employeeId = null) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
    
    const query = {
        status: 'active',
        endDate: {
            $gte: now,
            $lte: futureDate
        }
    };
    
    // Apply role-based filtering
    if (userRole === 'employee' && employeeId) {
        query.employeeId = employeeId;
    } else if (userRole === 'manager' && userDepartment && employeeId) {
        // Manager access will be validated in controller layer
        query.employeeId = employeeId;
    }
    
    return this.withTenant(tenantId).find(query);
};

// Static method for role-based policy queries
insurancePolicySchema.statics.findWithRoleAccess = function(tenantId, userRole, userId, userDepartment = null, additionalFilters = {}) {
    const query = { ...additionalFilters };
    
    switch (userRole) {
        case 'employee':
            query.employeeId = userId;
            break;
        case 'manager':
            // Manager access requires department validation in controller
            // This method returns base query, department filtering done in controller
            break;
        case 'hr':
        case 'admin':
            // Full tenant access - no additional filtering
            break;
        default:
            // Unknown role - restrict to user's own data
            query.employeeId = userId;
    }
    
    return this.withTenant(tenantId).find(query);
};

// Static method to get policy statistics by tenant
insurancePolicySchema.statics.getStatisticsByTenant = function(tenantId, userRole = null, userId = null, userDepartment = null) {
    const matchStage = { tenantId };
    
    // Apply role-based filtering for statistics
    if (userRole === 'employee' && userId) {
        matchStage.employeeId = userId;
    } else if (userRole === 'manager' && userDepartment) {
        // Manager statistics will be filtered in controller layer
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalCoverage: { $sum: '$coverageAmount' },
                totalPremium: { $sum: '$premium' }
            }
        }
    ]);
};

const InsurancePolicy = mongoose.model('InsurancePolicy', insurancePolicySchema);

export default InsurancePolicy;