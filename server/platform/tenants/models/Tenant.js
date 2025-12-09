const mongoose = require('mongoose');

/**
 * Tenant Schema
 * Represents a company/organization using the HR system
 */
const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    unique: true,
    index: true,
    trim: true,
    match: [/^[a-z0-9_-]+$/, 'Tenant ID must contain only lowercase letters, numbers, hyphens, and underscores']
  },
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true
  },
  domain: {
    type: String,
    unique: true,
    sparse: true, // Allow null for on-premise deployments
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Please provide a valid domain']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'suspended', 'trial', 'cancelled'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active',
    index: true
  },
  deploymentMode: {
    type: String,
    enum: {
      values: ['saas', 'on-premise'],
      message: '{VALUE} is not a valid deployment mode'
    },
    default: 'saas'
  },
  subscription: {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'trial'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    }
  },
  enabledModules: [{
    moduleId: {
      type: String,
      required: true
    },
    enabledAt: {
      type: Date,
      default: Date.now
    },
    enabledBy: {
      type: String,
      default: 'system'
    }
  }],
  config: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    locale: {
      type: String,
      default: 'en-US'
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD'
    },
    timeFormat: {
      type: String,
      default: '24h'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    features: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  limits: {
    maxUsers: {
      type: Number,
      default: 100,
      min: [1, 'Max users must be at least 1']
    },
    maxStorage: {
      type: Number,
      default: 10737418240, // 10GB in bytes
      min: [0, 'Max storage cannot be negative']
    },
    apiCallsPerMonth: {
      type: Number,
      default: 100000,
      min: [0, 'API calls limit cannot be negative']
    }
  },
  usage: {
    userCount: {
      type: Number,
      default: 0,
      min: [0, 'User count cannot be negative']
    },
    storageUsed: {
      type: Number,
      default: 0,
      min: [0, 'Storage used cannot be negative']
    },
    apiCallsThisMonth: {
      type: Number,
      default: 0,
      min: [0, 'API calls cannot be negative']
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  contactInfo: {
    adminEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    adminName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    }
  },
  metadata: {
    industry: String,
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    notes: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'tenants'
});

// Indexes for performance
tenantSchema.index({ tenantId: 1 }, { unique: true });
tenantSchema.index({ domain: 1 }, { unique: true, sparse: true });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ 'subscription.expiresAt': 1 });

/**
 * Method to check if tenant is active
 * @returns {boolean} True if tenant is active
 */
tenantSchema.methods.isActive = function() {
  return this.status === 'active';
};

/**
 * Method to check if subscription is active
 * @returns {boolean} True if subscription is active
 */
tenantSchema.methods.hasActiveSubscription = function() {
  if (this.subscription.status !== 'active') {
    return false;
  }

  if (this.subscription.expiresAt && this.subscription.expiresAt < new Date()) {
    return false;
  }

  return true;
};

/**
 * Method to check if module is enabled
 * @param {string} moduleId - Module ID to check
 * @returns {boolean} True if module is enabled
 */
tenantSchema.methods.isModuleEnabled = function(moduleId) {
  return this.enabledModules.some(module => module.moduleId === moduleId);
};

/**
 * Method to enable a module
 * @param {string} moduleId - Module ID to enable
 * @param {string} enabledBy - User who enabled the module
 */
tenantSchema.methods.enableModule = function(moduleId, enabledBy = 'system') {
  if (!this.isModuleEnabled(moduleId)) {
    this.enabledModules.push({
      moduleId,
      enabledAt: new Date(),
      enabledBy
    });
  }
};

/**
 * Method to disable a module
 * @param {string} moduleId - Module ID to disable
 */
tenantSchema.methods.disableModule = function(moduleId) {
  this.enabledModules = this.enabledModules.filter(
    module => module.moduleId !== moduleId
  );
};

/**
 * Method to check if tenant has exceeded limits
 * @returns {Object} Object with exceeded limits
 */
tenantSchema.methods.checkLimits = function() {
  const exceeded = {};

  if (this.usage.userCount >= this.limits.maxUsers) {
    exceeded.users = true;
  }

  if (this.usage.storageUsed >= this.limits.maxStorage) {
    exceeded.storage = true;
  }

  if (this.usage.apiCallsThisMonth >= this.limits.apiCallsPerMonth) {
    exceeded.apiCalls = true;
  }

  return exceeded;
};

/**
 * Method to reset monthly usage counters
 */
tenantSchema.methods.resetMonthlyUsage = function() {
  this.usage.apiCallsThisMonth = 0;
  this.usage.lastResetDate = new Date();
};

/**
 * Static method to find active tenants
 * @returns {Promise<Array>} Array of active tenants
 */
tenantSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

/**
 * Static method to find tenants with expired subscriptions
 * @returns {Promise<Array>} Array of tenants with expired subscriptions
 */
tenantSchema.statics.findExpiredSubscriptions = function() {
  return this.find({
    'subscription.expiresAt': { $lt: new Date() },
    'subscription.status': 'active'
  });
};

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
