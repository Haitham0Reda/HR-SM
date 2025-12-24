import mongoose from 'mongoose';

/**
 * Tenant Schema
 * Represents a company/organization using the HR system
 */
const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    unique: true,
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
    default: 'active'
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
    },
    // Enhanced enterprise metrics
    activeUsers: {
      type: Number,
      default: 0,
      min: [0, 'Active users cannot be negative']
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  // Additional enterprise metrics subdocument
  metrics: {
    totalSessions: {
      type: Number,
      default: 0,
      min: [0, 'Total sessions cannot be negative']
    },
    avgSessionDuration: {
      type: Number,
      default: 0,
      min: [0, 'Average session duration cannot be negative']
    },
    totalDocuments: {
      type: Number,
      default: 0,
      min: [0, 'Total documents cannot be negative']
    },
    totalReports: {
      type: Number,
      default: 0,
      min: [0, 'Total reports cannot be negative']
    },
    errorRate: {
      type: Number,
      default: 0,
      min: [0, 'Error rate cannot be negative'],
      max: [100, 'Error rate cannot exceed 100%']
    },
    responseTime: {
      type: Number,
      default: 0,
      min: [0, 'Response time cannot be negative']
    },
    // Performance metrics
    cpuUsage: {
      type: Number,
      default: 0,
      min: [0, 'CPU usage cannot be negative'],
      max: [100, 'CPU usage cannot exceed 100%']
    },
    memoryUsage: {
      type: Number,
      default: 0,
      min: [0, 'Memory usage cannot be negative'],
      max: [100, 'Memory usage cannot exceed 100%']
    },
    diskUsage: {
      type: Number,
      default: 0,
      min: [0, 'Disk usage cannot be negative'],
      max: [100, 'Disk usage cannot exceed 100%']
    },
    // Uptime and availability
    uptime: {
      type: Number,
      default: 0,
      min: [0, 'Uptime cannot be negative']
    },
    availability: {
      type: Number,
      default: 100,
      min: [0, 'Availability cannot be negative'],
      max: [100, 'Availability cannot exceed 100%']
    }
  },
  // Enhanced enterprise billing information
  billing: {
    currentPlan: { 
      type: String, 
      enum: ['trial', 'basic', 'professional', 'enterprise'],
      default: 'trial'
    },
    billingCycle: { 
      type: String, 
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    nextBillingDate: Date,
    paymentStatus: { 
      type: String, 
      enum: ['active', 'past_due', 'canceled'],
      default: 'active'
    },
    totalRevenue: { 
      type: Number, 
      default: 0,
      min: [0, 'Revenue cannot be negative']
    },
    lastPaymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'invoice', 'other'],
      default: 'credit_card'
    }
  },
  // Enhanced usage restrictions
  restrictions: {
    maxUsers: { 
      type: Number, 
      default: 50,
      min: [1, 'Max users must be at least 1']
    },
    maxStorage: { 
      type: Number, 
      default: 1024, // MB
      min: [1, 'Max storage must be at least 1 MB']
    },
    maxAPICallsPerMonth: { 
      type: Number, 
      default: 10000,
      min: [1, 'API calls limit must be at least 1']
    }
  },
  // License integration - Enhanced for license server integration
  license: {
    licenseKey: {
      type: String,
      sparse: true,
      description: 'Encrypted JWT token from license server'
    },
    licenseNumber: {
      type: String,
      sparse: true,
      description: 'Human-readable license number (e.g., HRSM-ABC123-DEF456)'
    },
    licenseType: {
      type: String,
      enum: ['trial', 'basic', 'professional', 'enterprise', 'unlimited']
    },
    licenseStatus: {
      type: String,
      enum: ['active', 'expired', 'revoked', 'suspended'],
      default: 'active',
      description: 'Current status of the license'
    },
    expiresAt: {
      type: Date,
      description: 'License expiration date'
    },
    licenseExpiresAt: {
      type: Date,
      description: 'Alias for expiresAt for consistency with task requirements'
    },
    machineId: String,
    activatedAt: Date,
    lastValidatedAt: Date,
    validationCount: {
      type: Number,
      default: 0
    },
    validationError: {
      type: String,
      description: 'Last validation error message'
    },
    features: [{
      type: String,
      description: 'Licensed features/modules'
    }],
    limits: {
      maxUsers: Number,
      maxStorage: Number,
      maxAPICallsPerMonth: Number
    }
  },
  // Compliance tracking
  compliance: {
    dataResidency: { 
      type: String, 
      enum: ['US', 'EU', 'ASIA', 'GLOBAL'],
      default: 'US'
    },
    gdprCompliant: { 
      type: Boolean, 
      default: false 
    },
    soc2Certified: { 
      type: Boolean, 
      default: false 
    },
    lastAuditDate: Date,
    complianceNotes: String
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
  collection: 'tenants',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware for automatic updates
tenantSchema.pre('save', function(next) {
  // Update lastActivityAt when usage metrics change
  if (this.isModified('usage.storageUsed') || 
      this.isModified('usage.activeUsers') || 
      this.isModified('usage.apiCallsThisMonth') ||
      this.isModified('metrics.totalSessions') ||
      this.isModified('metrics.totalDocuments') ||
      this.isModified('metrics.totalReports')) {
    this.usage.lastActivityAt = new Date();
  }
  
  // Update license validation count
  if (this.isModified('license.lastValidatedAt')) {
    this.license.validationCount = (this.license.validationCount || 0) + 1;
  }
  
  // Auto-calculate derived metrics
  if (this.isModified('usage.userCount') || this.isModified('usage.activeUsers')) {
    // Calculate user activity rate
    if (this.usage.userCount > 0) {
      this.metrics.userActivityRate = (this.usage.activeUsers / this.usage.userCount) * 100;
    }
  }
  
  // Update billing information based on usage
  if (this.isModified('usage.apiCallsThisMonth') || this.isModified('usage.storageUsed')) {
    // This could trigger billing calculations in a real system
    this.billing.lastUsageUpdate = new Date();
  }
  
  // Auto-update compliance status
  if (this.isModified('compliance.gdprCompliant') || 
      this.isModified('compliance.soc2Certified') ||
      this.isModified('compliance.lastAuditDate')) {
    this.compliance.lastComplianceUpdate = new Date();
  }
  
  // Validate license expiry alignment
  if (this.isModified('license.expiresAt') && !this.license.licenseExpiresAt) {
    this.license.licenseExpiresAt = this.license.expiresAt;
  }
  if (this.isModified('license.licenseExpiresAt') && !this.license.expiresAt) {
    this.license.expiresAt = this.license.licenseExpiresAt;
  }
  
  next();
});

// Indexes for performance
// Note: tenantId and domain already have unique: true in field definitions
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ 'subscription.expiresAt': 1 });
// Enhanced enterprise indexes
tenantSchema.index({ 'license.licenseNumber': 1 }, { sparse: true });
tenantSchema.index({ 'license.expiresAt': 1 });
tenantSchema.index({ 'billing.currentPlan': 1 });
tenantSchema.index({ 'billing.paymentStatus': 1 });
tenantSchema.index({ 'usage.lastActivityAt': 1 });
tenantSchema.index({ 'compliance.dataResidency': 1 });
// Compound indexes for analytics
tenantSchema.index({ status: 1, 'billing.currentPlan': 1 });
tenantSchema.index({ 'license.licenseType': 1, 'license.expiresAt': 1 });
// Additional enterprise analytics indexes
tenantSchema.index({ 'metrics.availability': 1 });
tenantSchema.index({ 'metrics.errorRate': 1 });
tenantSchema.index({ 'metrics.responseTime': 1 });
tenantSchema.index({ 'billing.totalRevenue': 1 });
tenantSchema.index({ 'usage.activeUsers': 1, 'restrictions.maxUsers': 1 });
tenantSchema.index({ 'usage.storageUsed': 1, 'restrictions.maxStorage': 1 });
tenantSchema.index({ 'usage.apiCallsThisMonth': 1, 'restrictions.maxAPICallsPerMonth': 1 });
// Risk and health monitoring indexes
tenantSchema.index({ 'license.licenseStatus': 1, 'license.expiresAt': 1 });
tenantSchema.index({ 'billing.paymentStatus': 1, 'billing.nextBillingDate': 1 });
tenantSchema.index({ 'compliance.gdprCompliant': 1, 'compliance.soc2Certified': 1 });
// Performance monitoring indexes
tenantSchema.index({ 'metrics.cpuUsage': 1, 'metrics.memoryUsage': 1, 'metrics.diskUsage': 1 });
tenantSchema.index({ createdAt: 1 }); // For growth analytics
tenantSchema.index({ updatedAt: 1 }); // For recent activity

/**
 * Method to check if tenant is active
 * @returns {boolean} True if tenant is active
 */
tenantSchema.methods.isActive = function() {
  return this.status === 'active';
};

/**
 * Virtual for storage usage percentage
 */
tenantSchema.virtual('storageUsagePercentage').get(function() {
  if (!this.restrictions?.maxStorage) return 0;
  return (this.usage.storageUsed / (this.restrictions.maxStorage * 1024 * 1024)) * 100;
});

/**
 * Virtual for user usage percentage
 */
tenantSchema.virtual('userUsagePercentage').get(function() {
  if (!this.restrictions?.maxUsers) return 0;
  return (this.usage.activeUsers / this.restrictions.maxUsers) * 100;
});

/**
 * Virtual for API usage percentage
 */
tenantSchema.virtual('apiUsagePercentage').get(function() {
  if (!this.restrictions?.maxAPICallsPerMonth) return 0;
  return (this.usage.apiCallsThisMonth / this.restrictions.maxAPICallsPerMonth) * 100;
});

/**
 * Virtual for overall health score (0-100)
 */
tenantSchema.virtual('healthScore').get(function() {
  const weights = {
    availability: 0.3,
    performance: 0.25,
    usage: 0.25,
    errors: 0.2
  };
  
  const availability = this.metrics?.availability || 100;
  const performance = Math.max(0, 100 - (this.metrics?.responseTime || 0) / 10); // Assume 1000ms = 0 score
  const usage = Math.max(0, 100 - Math.max(
    this.storageUsagePercentage || 0,
    this.userUsagePercentage || 0,
    this.apiUsagePercentage || 0
  ));
  const errors = Math.max(0, 100 - (this.metrics?.errorRate || 0));
  
  return Math.round(
    availability * weights.availability +
    performance * weights.performance +
    usage * weights.usage +
    errors * weights.errors
  );
});

/**
 * Virtual for resource utilization percentage
 */
tenantSchema.virtual('resourceUtilization').get(function() {
  const cpu = this.metrics?.cpuUsage || 0;
  const memory = this.metrics?.memoryUsage || 0;
  const disk = this.metrics?.diskUsage || 0;
  
  return Math.round((cpu + memory + disk) / 3);
});

/**
 * Virtual for license days remaining
 */
tenantSchema.virtual('licenseDaysRemaining').get(function() {
  if (!this.license?.expiresAt && !this.license?.licenseExpiresAt) return null;
  
  const now = new Date();
  const expiresAt = new Date(this.license.licenseExpiresAt || this.license.expiresAt);
  
  if (expiresAt < now) return 0;
  
  return Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
});

/**
 * Virtual for monthly growth rate
 */
tenantSchema.virtual('monthlyGrowthRate').get(function() {
  // This would typically be calculated from historical data
  // For now, return a placeholder that can be populated by analytics
  return this._monthlyGrowthRate || 0;
});

/**
 * Virtual for risk level based on various factors
 */
tenantSchema.virtual('riskLevel').get(function() {
  let riskScore = 0;
  
  // License expiry risk
  const daysRemaining = this.licenseDaysRemaining;
  if (daysRemaining !== null) {
    if (daysRemaining <= 7) riskScore += 40;
    else if (daysRemaining <= 30) riskScore += 20;
  }
  
  // Usage risk
  const maxUsage = Math.max(
    this.storageUsagePercentage || 0,
    this.userUsagePercentage || 0,
    this.apiUsagePercentage || 0
  );
  if (maxUsage >= 95) riskScore += 30;
  else if (maxUsage >= 80) riskScore += 15;
  
  // Payment risk
  if (this.billing?.paymentStatus === 'past_due') riskScore += 25;
  
  // Performance risk
  if ((this.metrics?.errorRate || 0) > 5) riskScore += 20;
  if ((this.metrics?.availability || 100) < 99) riskScore += 15;
  
  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  return 'low';
});

/**
 * Virtual for compliance status
 */
tenantSchema.virtual('complianceStatus').get(function() {
  const compliance = this.compliance || {};
  let score = 0;
  let total = 0;
  
  // GDPR compliance
  if (compliance.gdprCompliant) score += 1;
  total += 1;
  
  // SOC2 certification
  if (compliance.soc2Certified) score += 1;
  total += 1;
  
  // Recent audit
  if (compliance.lastAuditDate) {
    const daysSinceAudit = (new Date() - new Date(compliance.lastAuditDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceAudit <= 365) score += 1; // Audit within last year
    total += 1;
  }
  
  const percentage = total > 0 ? (score / total) * 100 : 0;
  
  if (percentage >= 80) return 'compliant';
  if (percentage >= 60) return 'partial';
  return 'non-compliant';
});

/**
 * Virtual for license status
 */
tenantSchema.virtual('licenseStatus').get(function() {
  if (!this.license?.licenseKey) return 'unlicensed';
  
  // Use explicit licenseStatus if set
  if (this.license.licenseStatus) {
    return this.license.licenseStatus;
  }
  
  // Fallback to computed status based on expiration
  if (!this.license.expiresAt && !this.license.licenseExpiresAt) return 'active';
  
  const now = new Date();
  const expiresAt = new Date(this.license.licenseExpiresAt || this.license.expiresAt);
  
  if (expiresAt < now) return 'expired';
  
  const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 30) return 'expiring';
  
  return 'active';
});

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

  if (this.usage.userCount >= this.restrictions.maxUsers) {
    exceeded.users = true;
  }

  if (this.usage.storageUsed >= this.restrictions.maxStorage) {
    exceeded.storage = true;
  }

  if (this.usage.apiCallsThisMonth >= this.restrictions.maxAPICallsPerMonth) {
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

/**
 * Static method to get tenant analytics
 * @returns {Promise<Object>} Analytics data
 */
tenantSchema.statics.getAnalytics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalTenants: { $sum: 1 },
        activeTenants: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        trialTenants: {
          $sum: { $cond: [{ $eq: ['$billing.currentPlan', 'trial'] }, 1, 0] }
        },
        paidTenants: {
          $sum: { $cond: [{ $ne: ['$billing.currentPlan', 'trial'] }, 1, 0] }
        },
        totalRevenue: { $sum: '$billing.totalRevenue' },
        avgStorageUsage: { $avg: '$usage.storageUsed' },
        avgActiveUsers: { $avg: '$usage.activeUsers' },
        // Enhanced enterprise analytics
        avgHealthScore: { $avg: '$metrics.availability' },
        avgResponseTime: { $avg: '$metrics.responseTime' },
        totalErrorRate: { $avg: '$metrics.errorRate' },
        highRiskTenants: {
          $sum: { 
            $cond: [
              { 
                $or: [
                  { $gte: ['$metrics.errorRate', 5] },
                  { $lte: ['$metrics.availability', 99] },
                  { $eq: ['$billing.paymentStatus', 'past_due'] }
                ]
              }, 
              1, 
              0 
            ] 
          }
        },
        expiringLicenses: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$license.expiresAt', null] },
                  { $lte: ['$license.expiresAt', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

/**
 * Static method to get revenue analytics by plan
 * @returns {Promise<Array>} Revenue breakdown by plan
 */
tenantSchema.statics.getRevenueByPlan = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$billing.currentPlan',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$billing.totalRevenue' },
        avgRevenue: { $avg: '$billing.totalRevenue' }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
};

/**
 * Static method to get usage analytics
 * @returns {Promise<Array>} Usage statistics
 */
tenantSchema.statics.getUsageAnalytics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: '$usage.activeUsers' },
        totalStorage: { $sum: '$usage.storageUsed' },
        totalAPICalls: { $sum: '$usage.apiCallsThisMonth' },
        avgUsersPerTenant: { $avg: '$usage.activeUsers' },
        avgStoragePerTenant: { $avg: '$usage.storageUsed' },
        avgAPICallsPerTenant: { $avg: '$usage.apiCallsThisMonth' },
        // Resource utilization
        avgCPUUsage: { $avg: '$metrics.cpuUsage' },
        avgMemoryUsage: { $avg: '$metrics.memoryUsage' },
        avgDiskUsage: { $avg: '$metrics.diskUsage' }
      }
    }
  ]);
};

/**
 * Static method to get performance metrics
 * @returns {Promise<Array>} Performance statistics
 */
tenantSchema.statics.getPerformanceMetrics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$metrics.responseTime' },
        avgAvailability: { $avg: '$metrics.availability' },
        avgErrorRate: { $avg: '$metrics.errorRate' },
        totalSessions: { $sum: '$metrics.totalSessions' },
        avgSessionDuration: { $avg: '$metrics.avgSessionDuration' }
      }
    }
  ]);
};

/**
 * Static method to get compliance overview
 * @returns {Promise<Array>} Compliance statistics
 */
tenantSchema.statics.getComplianceOverview = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        gdprCompliant: {
          $sum: { $cond: [{ $eq: ['$compliance.gdprCompliant', true] }, 1, 0] }
        },
        soc2Certified: {
          $sum: { $cond: [{ $eq: ['$compliance.soc2Certified', true] }, 1, 0] }
        },
        byDataResidency: {
          $push: {
            region: '$compliance.dataResidency',
            count: 1
          }
        },
        recentAudits: {
          $sum: {
            $cond: [
              {
                $gte: [
                  '$compliance.lastAuditDate',
                  new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

/**
 * Static method to find tenants needing attention
 * @returns {Promise<Array>} Array of tenants with issues
 */
tenantSchema.statics.findTenantsNeedingAttention = function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return this.find({
    $or: [
      // License expiring soon
      { 
        'license.expiresAt': { 
          $lte: thirtyDaysFromNow,
          $gte: new Date()
        }
      },
      // High storage usage (>80%)
      { 
        $expr: { 
          $gt: [
            { $divide: ['$usage.storageUsed', { $multiply: ['$restrictions.maxStorage', 1024, 1024] }] },
            0.8
          ]
        }
      },
      // High user usage (>90%)
      { 
        $expr: { 
          $gt: [
            { $divide: ['$usage.activeUsers', '$restrictions.maxUsers'] },
            0.9
          ]
        }
      },
      // Payment issues
      { 'billing.paymentStatus': 'past_due' }
    ]
  });
};

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
