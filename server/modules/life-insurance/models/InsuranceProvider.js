import mongoose from 'mongoose';

const insuranceProviderSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    nameArabic: {
        type: String,
        trim: true,
        maxlength: 100
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: 10
    },
    
    // Contact Information
    contactInfo: {
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            trim: true
        },
        website: {
            type: String,
            trim: true
        },
        address: {
            street: String,
            city: String,
            governorate: String,
            postalCode: String,
            country: {
                type: String,
                default: 'Egypt'
            }
        }
    },
    
    // Business Information
    licenseNumber: {
        type: String,
        trim: true
    },
    establishedYear: {
        type: Number,
        min: 1900,
        max: new Date().getFullYear()
    },
    
    // Insurance Details
    insuranceTypes: [{
        type: String,
        enum: ['health', 'life', 'dental', 'vision', 'disability', 'accident', 'travel', 'other']
    }],
    
    // Coverage Areas
    coverageAreas: [{
        type: String,
        enum: ['cairo', 'alexandria', 'giza', 'luxor', 'aswan', 'nationwide', 'international']
    }],
    
    // Financial Information
    financialInfo: {
        currency: {
            type: String,
            default: 'EGP',
            enum: ['EGP', 'USD', 'EUR']
        },
        paymentTerms: {
            type: String,
            enum: ['monthly', 'quarterly', 'semi-annual', 'annual'],
            default: 'monthly'
        },
        commissionRate: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },
    
    // Status and Ratings
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'active'
    },
    
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    
    // Contract Information
    contractInfo: {
        startDate: Date,
        endDate: Date,
        renewalDate: Date,
        contractNumber: String,
        terms: String
    },
    
    // Additional Information
    description: {
        type: String,
        maxlength: 1000
    },
    
    notes: {
        type: String,
        maxlength: 500
    },
    
    // Tenant Information
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    
    // Audit Fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // History tracking
    history: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'activated', 'deactivated', 'suspended', 'contract_renewed'],
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
        changes: {
            type: mongoose.Schema.Types.Mixed
        },
        notes: String
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
insuranceProviderSchema.index({ tenantId: 1, code: 1 }, { unique: true });
insuranceProviderSchema.index({ tenantId: 1, name: 1 });
insuranceProviderSchema.index({ tenantId: 1, status: 1 });
insuranceProviderSchema.index({ 'contactInfo.email': 1 });

// Virtual for full name with Arabic
insuranceProviderSchema.virtual('fullName').get(function() {
    return this.nameArabic ? `${this.name} (${this.nameArabic})` : this.name;
});

// Virtual for active policies count (to be populated)
insuranceProviderSchema.virtual('activePoliciesCount', {
    ref: 'InsurancePolicy',
    localField: '_id',
    foreignField: 'providerId',
    count: true,
    match: { status: 'active' }
});

// Pre-save middleware
insuranceProviderSchema.pre('save', function(next) {
    // Auto-generate code if not provided
    if (!this.code && this.name) {
        this.code = this.name.replace(/[^A-Z0-9]/gi, '').substring(0, 10).toUpperCase();
    }
    
    // Add history entry for updates
    if (!this.isNew && this.isModified()) {
        const changes = {};
        this.modifiedPaths().forEach(path => {
            if (path !== 'history' && path !== 'updatedAt') {
                changes[path] = {
                    from: this.get(path),
                    to: this.get(path)
                };
            }
        });
        
        this.history.push({
            action: 'updated',
            performedBy: this.updatedBy,
            timestamp: new Date(),
            changes: changes
        });
    }
    
    next();
});

// Static methods
insuranceProviderSchema.statics.findByTenant = function(tenantId, options = {}) {
    const query = { tenantId };
    
    if (options.status) {
        query.status = options.status;
    }
    
    if (options.insuranceType) {
        query.insuranceTypes = { $in: [options.insuranceType] };
    }
    
    return this.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort(options.sort || { name: 1 });
};

insuranceProviderSchema.statics.findActiveProviders = function(tenantId) {
    return this.findByTenant(tenantId, { status: 'active' });
};

// Instance methods
insuranceProviderSchema.methods.activate = function(userId) {
    this.status = 'active';
    this.updatedBy = userId;
    this.history.push({
        action: 'activated',
        performedBy: userId,
        timestamp: new Date()
    });
    return this.save();
};

insuranceProviderSchema.methods.deactivate = function(userId, reason) {
    this.status = 'inactive';
    this.updatedBy = userId;
    this.history.push({
        action: 'deactivated',
        performedBy: userId,
        timestamp: new Date(),
        notes: reason
    });
    return this.save();
};

const InsuranceProvider = mongoose.model('InsuranceProvider', insuranceProviderSchema);

export default InsuranceProvider;