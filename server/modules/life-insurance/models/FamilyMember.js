import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const familyMemberSchema = new mongoose.Schema({
    // Derived insurance number (format: {PolicyNumber}-N)
    insuranceNumber: {
        type: String,
        unique: true,
        index: true
    },
    
    // References
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    policyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InsurancePolicy',
        required: true,
        index: true
    },
    
    // Personal information
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: true,
        index: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    
    // Relationship to employee
    relationship: {
        type: String,
        enum: ['spouse', 'child', 'parent'],
        required: true,
        index: true
    },
    
    // Contact information
    phone: String,
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    
    // Address (optional, may inherit from employee)
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    
    // Coverage details
    coverageStartDate: {
        type: Date,
        required: true
    },
    coverageEndDate: {
        type: Date,
        required: true
    },
    coverageAmount: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'removed'],
        default: 'active',
        index: true
    },
    
    // Additional information
    notes: String,
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Apply base schema plugin for multi-tenancy
familyMemberSchema.plugin(baseSchemaPlugin);

// Compound indexes for efficient queries
familyMemberSchema.index({ tenantId: 1, employeeId: 1 });
familyMemberSchema.index({ tenantId: 1, policyId: 1 });
familyMemberSchema.index({ tenantId: 1, relationship: 1, status: 1 });

// Virtual for full name
familyMemberSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
familyMemberSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
});

// Virtual for checking if coverage is active
familyMemberSchema.virtual('isCoverageActive').get(function() {
    const now = new Date();
    return this.status === 'active' && 
           this.coverageStartDate <= now && 
           this.coverageEndDate >= now;
});

// Pre-save middleware to validate age restrictions for children
familyMemberSchema.pre('save', function(next) {
    if (this.relationship === 'child') {
        const age = this.age;
        if (age !== null && age >= 25) {
            const error = new Error('Children must be under 25 years old for coverage');
            error.name = 'ValidationError';
            return next(error);
        }
    }
    next();
});

// Pre-save middleware to validate coverage dates
familyMemberSchema.pre('save', function(next) {
    if (this.coverageStartDate >= this.coverageEndDate) {
        const error = new Error('Coverage end date must be after start date');
        error.name = 'ValidationError';
        return next(error);
    }
    next();
});

// Pre-save middleware to auto-generate insurance number
familyMemberSchema.pre('save', async function(next) {
    if (this.isNew && !this.insuranceNumber) {
        try {
            // Get the policy to derive the insurance number
            const InsurancePolicy = mongoose.model('InsurancePolicy');
            const policy = await InsurancePolicy.findById(this.policyId);
            
            if (!policy) {
                const error = new Error('Associated policy not found');
                error.name = 'ValidationError';
                return next(error);
            }
            
            // Count existing family members for this policy to get the next number
            const existingCount = await this.constructor.countDocuments({
                policyId: this.policyId,
                tenantId: this.tenantId
            });
            
            this.insuranceNumber = `${policy.policyNumber}-${existingCount + 1}`;
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// Static method to find family members by relationship
familyMemberSchema.statics.findByRelationship = function(tenantId, relationship, employeeId = null) {
    const query = {
        tenantId,
        relationship,
        status: 'active'
    };
    
    if (employeeId) {
        query.employeeId = employeeId;
    }
    
    return this.find(query);
};

// Static method to find children under age limit
familyMemberSchema.statics.findChildrenUnderAge = function(tenantId, maxAge = 25) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - maxAge);
    
    return this.find({
        tenantId,
        relationship: 'child',
        status: 'active',
        dateOfBirth: { $gte: cutoffDate }
    });
};

// Method to update coverage dates
familyMemberSchema.methods.updateCoverage = function(startDate, endDate, coverageAmount) {
    this.coverageStartDate = startDate;
    this.coverageEndDate = endDate;
    if (coverageAmount !== undefined) {
        this.coverageAmount = coverageAmount;
    }
    return this.save();
};

const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);

export default FamilyMember;