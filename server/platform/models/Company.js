import mongoose from 'mongoose';

/**
 * Company Schema
 * Represents companies in the platform with their module licenses and settings
 */
const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Company slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9_-]+$/, 'Slug can only contain lowercase letters, numbers, hyphens and underscores']
  },
  databaseName: {
    type: String,
    required: [true, 'Database name is required'],
    unique: true
  },
  adminEmail: {
    type: String,
    required: [true, 'Admin email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'trial'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['starter', 'business', 'enterprise', 'trial'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true
    },
    autoRenew: {
      type: Boolean,
      default: false
    },
    scheduledUpgrade: {
      plan: {
        type: String,
        enum: ['starter', 'business', 'enterprise', 'trial']
      },
      effectiveDate: {
        type: Date
      }
    }
  },
  modules: {
    type: Map,
    of: {
      enabled: {
        type: Boolean,
        default: false
      },
      tier: {
        type: String,
        enum: ['starter', 'business', 'enterprise'],
        default: 'starter'
      },
      limits: {
        employees: { type: Number, default: null },
        devices: { type: Number, default: null },
        storage: { type: Number, default: null }, // bytes
        apiCalls: { type: Number, default: null } // per month
      },
      enabledAt: {
        type: Date,
        default: Date.now
      },
      disabledAt: {
        type: Date,
        default: null
      }
    },
    default: new Map()
  },
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  licenseKey: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  licenseData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  usage: {
    employees: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
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
  collection: 'platform_companies'
});

// Indexes
// Note: slug, databaseName, and licenseKey already have unique: true in field definitions
companySchema.index({ status: 1 });
companySchema.index({ 'subscription.plan': 1 });

/**
 * Pre-save middleware to update timestamps
 */
companySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Method to check if a module is enabled
 * @param {string} moduleKey - Module key to check
 * @returns {boolean} True if module is enabled
 */
companySchema.methods.isModuleEnabled = function(moduleKey) {
  let moduleConfig;
  if (this.modules instanceof Map) {
    moduleConfig = this.modules.get(moduleKey);
  } else if (this.modules && typeof this.modules === 'object') {
    moduleConfig = this.modules[moduleKey];
  }
  return moduleConfig && moduleConfig.enabled;
};

/**
 * Method to get module configuration
 * @param {string} moduleKey - Module key
 * @returns {Object|null} Module configuration or null
 */
companySchema.methods.getModuleConfig = function(moduleKey) {
  if (this.modules instanceof Map) {
    return this.modules.get(moduleKey) || null;
  } else if (this.modules && typeof this.modules === 'object') {
    return this.modules[moduleKey] || null;
  }
  return null;
};

/**
 * Method to enable a module
 * @param {string} moduleKey - Module key
 * @param {string} tier - Pricing tier
 * @param {Object} limits - Module limits
 */
companySchema.methods.enableModule = function(moduleKey, tier = 'starter', limits = {}) {
  const moduleConfig = {
    enabled: true,
    tier,
    limits: {
      employees: limits.employees || null,
      devices: limits.devices || null,
      storage: limits.storage || null,
      apiCalls: limits.apiCalls || null
    },
    enabledAt: new Date(),
    disabledAt: null
  };
  
  if (!this.modules) {
    this.modules = new Map();
  }
  
  if (this.modules instanceof Map) {
    this.modules.set(moduleKey, moduleConfig);
  } else {
    // Convert to Map if it's not already
    this.modules = new Map(Object.entries(this.modules || {}));
    this.modules.set(moduleKey, moduleConfig);
  }
  this.markModified('modules');
};

/**
 * Method to disable a module
 * @param {string} moduleKey - Module key
 */
companySchema.methods.disableModule = function(moduleKey) {
  let moduleConfig;
  if (this.modules instanceof Map) {
    moduleConfig = this.modules.get(moduleKey);
    if (moduleConfig) {
      moduleConfig.enabled = false;
      moduleConfig.disabledAt = new Date();
      this.modules.set(moduleKey, moduleConfig);
      this.markModified('modules');
    }
  } else if (this.modules && typeof this.modules === 'object') {
    moduleConfig = this.modules[moduleKey];
    if (moduleConfig) {
      moduleConfig.enabled = false;
      moduleConfig.disabledAt = new Date();
      this.modules[moduleKey] = moduleConfig;
      this.markModified('modules');
    }
  }
};

/**
 * Method to update module limits
 * @param {string} moduleKey - Module key
 * @param {Object} limits - New limits
 */
companySchema.methods.updateModuleLimits = function(moduleKey, limits) {
  let moduleConfig;
  if (this.modules instanceof Map) {
    moduleConfig = this.modules.get(moduleKey);
    if (moduleConfig) {
      moduleConfig.limits = {
        ...moduleConfig.limits,
        ...limits
      };
      this.modules.set(moduleKey, moduleConfig);
      this.markModified('modules');
    }
  } else if (this.modules && typeof this.modules === 'object') {
    moduleConfig = this.modules[moduleKey];
    if (moduleConfig) {
      moduleConfig.limits = {
        ...moduleConfig.limits,
        ...limits
      };
      this.modules[moduleKey] = moduleConfig;
      this.markModified('modules');
    }
  }
};

/**
 * Method to check if company has exceeded module limits
 * @param {string} moduleKey - Module key
 * @returns {Object} Limit check result
 */
companySchema.methods.checkModuleLimits = function(moduleKey) {
  let moduleConfig;
  if (this.modules instanceof Map) {
    moduleConfig = this.modules.get(moduleKey);
  } else if (this.modules && typeof this.modules === 'object') {
    moduleConfig = this.modules[moduleKey];
  }
  
  if (!moduleConfig || !moduleConfig.enabled) {
    return { withinLimits: false, reason: 'Module not enabled' };
  }

  const limits = moduleConfig.limits || {};
  const usage = this.usage || {};
  const violations = [];

  if (limits.employees && usage.employees > limits.employees) {
    violations.push(`Employee limit exceeded: ${usage.employees}/${limits.employees}`);
  }

  if (limits.storage && usage.storage > limits.storage) {
    violations.push(`Storage limit exceeded: ${usage.storage}/${limits.storage} bytes`);
  }

  if (limits.apiCalls && usage.apiCalls > limits.apiCalls) {
    violations.push(`API calls limit exceeded: ${usage.apiCalls}/${limits.apiCalls}`);
  }

  return {
    withinLimits: violations.length === 0,
    violations,
    limits,
    usage: {
      employees: usage.employees || 0,
      storage: usage.storage || 0,
      apiCalls: usage.apiCalls || 0
    }
  };
};

/**
 * Method to get all enabled modules
 * @returns {Array} Array of enabled module keys
 */
companySchema.methods.getEnabledModules = function() {
  const enabledModules = [];
  if (this.modules && this.modules instanceof Map) {
    for (const [key, config] of this.modules) {
      if (config && config.enabled) {
        enabledModules.push(key);
      }
    }
  } else if (this.modules && typeof this.modules === 'object') {
    // Handle case where modules is a plain object
    for (const [key, config] of Object.entries(this.modules)) {
      if (config && config.enabled) {
        enabledModules.push(key);
      }
    }
  }
  return enabledModules;
};

/**
 * Method to check if subscription is active
 * @returns {boolean} True if subscription is active
 */
companySchema.methods.isSubscriptionActive = function() {
  if (this.status !== 'active') {
    return false;
  }
  
  const now = new Date();
  return now <= this.subscription.endDate;
};

/**
 * Method to get days until subscription expires
 * @returns {number} Days until expiration
 */
companySchema.methods.getDaysUntilExpiration = function() {
  const now = new Date();
  const diffTime = this.subscription.endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Static method to find companies by module
 * @param {string} moduleKey - Module key
 * @param {boolean} enabledOnly - Only return companies with module enabled
 * @returns {Promise<Array>} Array of companies
 */
companySchema.statics.findByModule = function(moduleKey, enabledOnly = true) {
  const query = {};
  if (enabledOnly) {
    query[`modules.${moduleKey}.enabled`] = true;
  } else {
    query[`modules.${moduleKey}`] = { $exists: true };
  }
  return this.find(query);
};

/**
 * Static method to find companies with expired subscriptions
 * @returns {Promise<Array>} Array of companies with expired subscriptions
 */
companySchema.statics.findExpiredSubscriptions = function() {
  const now = new Date();
  return this.find({
    'subscription.endDate': { $lt: now },
    status: { $in: ['active', 'trial'] }
  });
};

const Company = mongoose.model('Company', companySchema);

export default Company;