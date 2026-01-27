import mongoose from 'mongoose';

/**
 * Tenant Model - License Server Database
 * This is the authoritative source for tenant metadata
 * 
 * Requirements: 1.1, 1.2, 1.3 - Store tenant metadata in license server
 */
const tenantSchema = new mongoose.Schema({
  // Tenant Identification
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true,
    index: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    default: null
  },
  
  // Subscription Information
  subscription: {
    status: {
      type: String,
      enum: ['active', 'suspended', 'expired', 'trial'],
      default: 'trial',
      index: true
    },
    plan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise', 'unlimited'],
      default: 'basic'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly'
    },
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  
  // Enabled Modules
  enabledModules: [{
    type: String
  }],
  
  // Usage Limits
  usageLimits: {
    maxUsers: {
      type: Number,
      default: 10
    },
    maxStorage: {
      type: Number, // in GB
      default: 5
    },
    maxApiCalls: {
      type: Number, // per day
      default: 10000
    }
  },
  
  // Billing Information
  billing: {
    currency: {
      type: String,
      default: 'USD'
    },
    amount: {
      type: Number,
      default: 0
    },
    lastPaymentDate: {
      type: Date,
      default: null
    },
    nextBillingDate: {
      type: Date,
      default: null
    }
  },
  
  // Metadata
  metadata: {
    industry: {
      type: String,
      default: null
    },
    companySize: {
      type: String,
      enum: ['small', 'medium', 'large', 'enterprise', null],
      default: null
    },
    country: {
      type: String,
      default: null
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
    index: true
  },
  
  // Soft Delete
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'tenants'
});

// Indexes for performance
tenantSchema.index({ tenantId: 1, status: 1 });
tenantSchema.index({ domain: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ 'subscription.expiresAt': 1 });
tenantSchema.index({ status: 1 });

// Instance Methods
tenantSchema.methods.isActive = function() {
  return this.status === 'active' && this.subscription.status === 'active';
};

tenantSchema.methods.isExpired = function() {
  return this.subscription.expiresAt <= new Date();
};

tenantSchema.methods.daysUntilExpiry = function() {
  const now = new Date();
  const diffTime = this.subscription.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

tenantSchema.methods.hasModule = function(moduleId) {
  return this.enabledModules.includes(moduleId);
};

tenantSchema.methods.enableModule = function(moduleId) {
  if (!this.hasModule(moduleId)) {
    this.enabledModules.push(moduleId);
  }
};

tenantSchema.methods.disableModule = function(moduleId) {
  this.enabledModules = this.enabledModules.filter(m => m !== moduleId);
};

tenantSchema.methods.softDelete = function() {
  this.status = 'deleted';
  this.deletedAt = new Date();
};

// Static Methods
tenantSchema.statics.findByTenantId = function(tenantId) {
  return this.findOne({ tenantId, status: { $ne: 'deleted' } });
};

tenantSchema.statics.findActive = function() {
  return this.find({ status: 'active', 'subscription.status': 'active' });
};

tenantSchema.statics.findExpiring = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    'subscription.expiresAt': { $lte: futureDate, $gt: new Date() }
  });
};

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
