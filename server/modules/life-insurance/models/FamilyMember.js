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
            console.log('FamilyMember pre-save: Looking for policy', {
                policyId: this.policyId,
                tenantId: this.tenantId
            });
            
            // Get the policy from the same connection/database as this family member
            // Use this.constructor.db to get the database connection
            const InsurancePolicy = this.constructor.db.model('InsurancePolicy');
            const policy = await InsurancePolicy.findById(this.policyId);
            
            console.log('FamilyMember pre-save: Policy found?', !!policy);
            
            if (!policy) {
                console.error('FamilyMember pre-save: Policy not found', {
                    policyId: this.policyId,
                    tenantId: this.tenantId,
                    dbName: this.constructor.db.name
                });
                const error = new Error('Associated policy not found');
                error.name = 'ValidationError';
                return next(error);
            }
            
            // Count existing family members for this policy to get the next number
            const existingCount = await this.constructor.countDocuments({
                policyId: this.policyId
            });
            
            this.insuranceNumber = `${policy.policyNumber}-${existingCount + 1}`;
            console.log('FamilyMember pre-save: Generated insurance number', this.insuranceNumber);
            next();
        } catch (error) {
            console.error('FamilyMember pre-save: Error', error);
            next(error);
        }
    } else {
        next();
    }
});

// Pre-save middleware for tenant validation
familyMemberSchema.pre('save', function(next) {
    if (!this.tenantId) {
        const error = new Error('TenantId is required for family member');
        error.name = 'ValidationError';
        return next(error);
    }
    next();
});

// Static method to find family members by tenant
familyMemberSchema.statics.findByTenant = function(tenantId, filters = {}) {
    return this.withTenant(tenantId).find(filters);
};

// Static method to find family members by tenant and employee with role-based access
familyMemberSchema.statics.findByTenantAndEmployee = function(tenantId, employeeId, userRole, userDepartment = null) {
    const query = { tenantId };
    
    // Apply role-based filtering
    if (userRole === 'employee') {
        query.employeeId = employeeId;
    } else if (userRole === 'manager' && userDepartment) {
        // Manager access will be validated in controller layer
        query.employeeId = employeeId;
    }
    // HR and Admin roles get access to all family members within tenant
    
    return this.find(query);
};

// Static method to find family members by relationship with role-based access
familyMemberSchema.statics.findByRelationship = function(tenantId, relationship, userRole = null, userId = null, userDepartment = null) {
    const query = {
        relationship,
        status: 'active'
    };
    
    // Apply role-based filtering
    if (userRole === 'employee' && userId) {
        query.employeeId = userId;
    } else if (userRole === 'manager' && userDepartment && userId) {
        // Manager access will be validated in controller layer
        query.employeeId = userId;
    }
    
    return this.withTenant(tenantId).find(query);
};

// Static method to find children under age limit with role-based access
familyMemberSchema.statics.findChildrenUnderAge = function(tenantId, maxAge = 25, userRole = null, userId = null, userDepartment = null) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - maxAge);
    
    const query = {
        relationship: 'child',
        status: 'active',
        dateOfBirth: { $gte: cutoffDate }
    };
    
    // Apply role-based filtering
    if (userRole === 'employee' && userId) {
        query.employeeId = userId;
    } else if (userRole === 'manager' && userDepartment && userId) {
        // Manager access will be validated in controller layer
        query.employeeId = userId;
    }
    
    return this.withTenant(tenantId).find(query);
};

// Static method for role-based family member queries
familyMemberSchema.statics.findWithRoleAccess = function(tenantId, userRole, userId, userDepartment = null, additionalFilters = {}) {
    const query = { ...additionalFilters };
    
    switch (userRole) {
        case 'employee':
            query.employeeId = userId;
            break;
        case 'manager':
            // Manager access requires department validation in controller
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

// Static method to get family member statistics by tenant
familyMemberSchema.statics.getStatisticsByTenant = function(tenantId, userRole = null, userId = null, userDepartment = null) {
    const matchStage = { tenantId };
    
    // Apply role-based filtering
    if (userRole === 'employee' && userId) {
        matchStage.employeeId = userId;
    } else if (userRole === 'manager' && userDepartment) {
        // Manager statistics will be filtered in controller layer
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    relationship: '$relationship',
                    status: '$status'
                },
                count: { $sum: 1 },
                totalCoverage: { $sum: '$coverageAmount' }
            }
        }
    ]);
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