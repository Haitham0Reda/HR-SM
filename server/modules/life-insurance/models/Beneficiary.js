import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const beneficiarySchema = new mongoose.Schema({
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
    
    // Beneficiary information
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
        required: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    
    // Relationship to insured
    relationship: {
        type: String,
        enum: ['spouse', 'child', 'parent', 'sibling', 'other'],
        required: true,
        index: true
    },
    relationshipDescription: {
        type: String,
        // Required if relationship is 'other'
        required: function() {
            return this.relationship === 'other';
        }
    },
    
    // Contact information
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    
    // Address
    address: {
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true,
            default: 'US'
        }
    },
    
    // Benefit details
    benefitPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        index: true
    },
    benefitAmount: {
        type: Number,
        min: 0
    },
    
    // Beneficiary type
    beneficiaryType: {
        type: String,
        enum: ['primary', 'contingent'],
        required: true,
        default: 'primary',
        index: true
    },
    
    // Priority order (for multiple beneficiaries of same type)
    priority: {
        type: Number,
        default: 1,
        min: 1
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'removed'],
        default: 'active',
        index: true
    },
    
    // Additional information
    notes: String,
    
    // Legal guardian information (for minor beneficiaries)
    guardian: {
        name: String,
        relationship: String,
        phone: String,
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        }
    },
    
    // Document verification
    identificationDocument: {
        type: {
            type: String,
            enum: ['ssn', 'passport', 'drivers_license', 'other']
        },
        number: String,
        verified: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Apply base schema plugin for multi-tenancy
beneficiarySchema.plugin(baseSchemaPlugin);

// Compound indexes for efficient queries
beneficiarySchema.index({ tenantId: 1, policyId: 1, status: 1 });
beneficiarySchema.index({ tenantId: 1, employeeId: 1 });
beneficiarySchema.index({ tenantId: 1, beneficiaryType: 1, priority: 1 });

// Virtual for full name
beneficiarySchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
beneficiarySchema.virtual('age').get(function() {
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

// Virtual for checking if beneficiary is a minor
beneficiarySchema.virtual('isMinor').get(function() {
    return this.age !== null && this.age < 18;
});

// Virtual for full address
beneficiarySchema.virtual('fullAddress').get(function() {
    if (!this.address) return '';
    
    const { street, city, state, zipCode, country } = this.address;
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
});

// Pre-save middleware to validate percentage totals
beneficiarySchema.pre('save', async function(next) {
    try {
        // Only validate if this is a new beneficiary or percentage changed
        if (this.isNew || this.isModified('benefitPercentage')) {
            // Get all other active beneficiaries for the same policy and type
            const query = {
                policyId: this.policyId,
                beneficiaryType: this.beneficiaryType,
                status: 'active'
            };
            
            // Only exclude current document if it has an _id (not new)
            if (!this.isNew && this._id) {
                query._id = { $ne: this._id };
            }
            
            const otherBeneficiaries = await this.constructor.find(query);
            
            // Calculate total percentage including this beneficiary
            const otherPercentageTotal = otherBeneficiaries.reduce(
                (sum, beneficiary) => sum + beneficiary.benefitPercentage, 
                0
            );
            const totalPercentage = otherPercentageTotal + this.benefitPercentage;
            
            // Validate that total doesn't exceed 100%
            if (totalPercentage > 100) {
                const error = new Error(
                    `Total benefit percentage for ${this.beneficiaryType} beneficiaries cannot exceed 100%. ` +
                    `Current total would be ${totalPercentage}%`
                );
                error.name = 'ValidationError';
                return next(error);
            }
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to require guardian for minors
beneficiarySchema.pre('save', function(next) {
    if (this.isMinor && (!this.guardian || !this.guardian.name)) {
        const error = new Error('Guardian information is required for minor beneficiaries');
        error.name = 'ValidationError';
        return next(error);
    }
    next();
});

// Pre-save middleware to calculate benefit amount based on policy coverage
beneficiarySchema.pre('save', async function(next) {
    try {
        if (this.isModified('benefitPercentage') || this.isNew) {
            // Get the associated policy to calculate benefit amount
            const InsurancePolicy = mongoose.model('InsurancePolicy');
            const policy = await InsurancePolicy.findById(this.policyId);
            
            if (policy) {
                this.benefitAmount = (policy.coverageAmount * this.benefitPercentage) / 100;
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Method to verify identification
beneficiarySchema.methods.verifyIdentification = function(verifiedBy, documentType, documentNumber) {
    this.identificationDocument = {
        type: documentType,
        number: documentNumber,
        verified: true,
        verifiedAt: new Date(),
        verifiedBy
    };
    return this.save();
};

// Static method to validate total percentages for a policy
beneficiarySchema.statics.validateTotalPercentages = async function(policyId, beneficiaryType = 'primary') {
    const beneficiaries = await this.find({
        policyId,
        beneficiaryType,
        status: 'active'
    });
    
    const totalPercentage = beneficiaries.reduce(
        (sum, beneficiary) => sum + beneficiary.benefitPercentage, 
        0
    );
    
    return {
        isValid: totalPercentage === 100,
        totalPercentage,
        beneficiaries: beneficiaries.length,
        message: totalPercentage === 100 ? 
            'Percentages are valid' : 
            `Total percentage is ${totalPercentage}%, should be 100%`
    };
};

// Static method to find beneficiaries by type
beneficiarySchema.statics.findByType = function(tenantId, policyId, beneficiaryType = 'primary') {
    return this.find({
        tenantId,
        policyId,
        beneficiaryType,
        status: 'active'
    }).sort({ priority: 1 });
};

// Static method to find minor beneficiaries
beneficiarySchema.statics.findMinors = function(tenantId, policyId = null) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 18);
    
    const query = {
        tenantId,
        status: 'active',
        dateOfBirth: { $gt: cutoffDate }
    };
    
    if (policyId) {
        query.policyId = policyId;
    }
    
    return this.find(query);
};

// Method to update priority
beneficiarySchema.methods.updatePriority = function(newPriority) {
    this.priority = newPriority;
    return this.save();
};

const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

export default Beneficiary;