import mongoose from 'mongoose';

/**
 * Subscription Plan Schema
 * Defines pricing tiers and included modules
 */
const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tier: {
    type: String,
    enum: {
      values: ['free', 'basic', 'professional', 'enterprise'],
      message: '{VALUE} is not a valid tier'
    },
    required: [true, 'Tier is required'],
    index: true
  },
  pricing: {
    monthly: {
      type: Number,
      required: [true, 'Monthly price is required'],
      min: [0, 'Price cannot be negative']
    },
    yearly: {
      type: Number,
      required: [true, 'Yearly price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    trialDays: {
      type: Number,
      default: 14,
      min: [0, 'Trial days cannot be negative']
    }
  },
  includedModules: [{
    moduleId: {
      type: String,
      required: true
    },
    included: {
      type: Boolean,
      default: true
    },
    addOnPrice: {
      type: Number,
      default: 0,
      min: [0, 'Add-on price cannot be negative']
    }
  }],
  limits: {
    maxUsers: {
      type: Number,
      required: true,
      min: [1, 'Max users must be at least 1']
    },
    maxStorage: {
      type: Number,
      required: true,
      min: [0, 'Max storage cannot be negative']
    },
    apiCallsPerMonth: {
      type: Number,
      required: true,
      min: [0, 'API calls limit cannot be negative']
    },
    maxDepartments: {
      type: Number,
      default: null // null means unlimited
    },
    maxCustomFields: {
      type: Number,
      default: null
    }
  },
  features: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
  collection: 'plans'
});

// Indexes for performance
planSchema.index({ name: 1 }, { unique: true });
planSchema.index({ tier: 1, isActive: 1 });
planSchema.index({ isActive: 1, isPublic: 1 });

/**
 * Method to check if module is included in plan
 * @param {string} moduleId - Module ID to check
 * @returns {boolean} True if module is included
 */
planSchema.methods.includesModule = function(moduleId) {
  const module = this.includedModules.find(m => m.moduleId === moduleId);
  return module && module.included;
};

/**
 * Method to get module add-on price
 * @param {string} moduleId - Module ID
 * @returns {number} Add-on price (0 if included)
 */
planSchema.methods.getModulePrice = function(moduleId) {
  const module = this.includedModules.find(m => m.moduleId === moduleId);
  if (!module) {
    return null; // Module not available for this plan
  }
  return module.included ? 0 : module.addOnPrice;
};

/**
 * Method to get all included module IDs
 * @returns {Array<string>} Array of module IDs
 */
planSchema.methods.getIncludedModuleIds = function() {
  return this.includedModules
    .filter(m => m.included)
    .map(m => m.moduleId);
};

/**
 * Method to calculate yearly savings
 * @returns {number} Savings amount
 */
planSchema.methods.getYearlySavings = function() {
  const monthlyTotal = this.pricing.monthly * 12;
  return monthlyTotal - this.pricing.yearly;
};

/**
 * Method to calculate yearly savings percentage
 * @returns {number} Savings percentage
 */
planSchema.methods.getYearlySavingsPercentage = function() {
  const monthlyTotal = this.pricing.monthly * 12;
  if (monthlyTotal === 0) return 0;
  return ((monthlyTotal - this.pricing.yearly) / monthlyTotal) * 100;
};

/**
 * Static method to find active plans
 * @returns {Promise<Array>} Array of active plans
 */
planSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, tier: 1 });
};

/**
 * Static method to find public plans
 * @returns {Promise<Array>} Array of public plans
 */
planSchema.statics.findPublic = function() {
  return this.find({ isActive: true, isPublic: true }).sort({ sortOrder: 1 });
};

/**
 * Static method to find plan by tier
 * @param {string} tier - Plan tier
 * @returns {Promise<Object>} Plan object
 */
planSchema.statics.findByTier = function(tier) {
  return this.findOne({ tier, isActive: true });
};

const Plan = mongoose.model('Plan', planSchema);

export default Plan;
