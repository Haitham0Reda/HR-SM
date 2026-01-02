import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Master License Schema - License Server Database
 * This is the authoritative source for all license information
 */
const licenseSchema = new mongoose.Schema({
  // License Identification
  licenseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^HRSM-[A-Z0-9]{6}-[A-Z0-9]{6}$/,
    index: true
  },
  
  // Company Information
  companyId: {
    type: String,
    required: true,
    index: true
  },
  companyName: {
    type: String,
    required: true
  },
  companyDomain: {
    type: String,
    required: true
  },
  
  // License Details
  licenseType: {
    type: String,
    enum: ['trial', 'starter', 'professional', 'enterprise', 'unlimited'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'revoked', 'pending'],
    default: 'active',
    index: true
  },
  
  // Validity Period
  issuedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // License Limits
  limits: {
    maxUsers: {
      type: Number,
      required: true,
      min: 1
    },
    maxStorage: {
      type: Number, // in bytes
      required: true,
      min: 0
    },
    maxApiCallsPerMonth: {
      type: Number,
      required: true,
      min: 0
    },
    maxDatabases: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  
  // Enabled Modules
  modules: [{
    moduleId: {
      type: String,
      required: true
    },
    moduleName: {
      type: String,
      required: true
    },
    tier: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      default: 'basic'
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  
  // Security & Encryption
  encryptionKey: {
    type: String,
    required: true,
    select: false // Never include in queries by default
  },
  signature: {
    type: String,
    required: true
  },
  machineFingerprint: {
    type: String,
    sparse: true // Allow null but unique when present
  },
  
  // Usage Tracking
  currentUsage: {
    users: {
      type: Number,
      default: 0
    },
    storage: {
      type: Number,
      default: 0
    },
    apiCallsThisMonth: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Validation & Sync
  lastValidated: {
    type: Date,
    default: Date.now
  },
  validationCount: {
    type: Number,
    default: 0
  },
  lastSyncedToCompany: {
    type: Date,
    default: null
  },
  syncFailures: {
    type: Number,
    default: 0
  },
  
  // Audit Trail
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    default: null
  },
  
  // Additional Metadata
  metadata: {
    issuerInfo: {
      organization: String,
      department: String,
      contactEmail: String
    },
    deploymentInfo: {
      environment: {
        type: String,
        enum: ['production', 'staging', 'development'],
        default: 'production'
      },
      region: String,
      dataCenter: String
    },
    billingInfo: {
      subscriptionId: String,
      paymentMethod: String,
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
      }
    }
  }
}, {
  timestamps: true,
  collection: 'licenses'
});

// Indexes for performance
licenseSchema.index({ companyId: 1, status: 1 });
licenseSchema.index({ expiresAt: 1, status: 1 });
licenseSchema.index({ licenseType: 1, status: 1 });
licenseSchema.index({ 'currentUsage.lastUpdated': 1 });
licenseSchema.index({ lastValidated: 1 });

// Pre-save middleware
licenseSchema.pre('save', function(next) {
  // Generate license number if not provided
  if (!this.licenseNumber && this.isNew) {
    this.licenseNumber = generateLicenseNumber();
  }
  
  // Generate encryption key if not provided
  if (!this.encryptionKey && this.isNew) {
    this.encryptionKey = crypto.randomBytes(32).toString('hex');
  }
  
  // Update signature
  this.signature = this.generateSignature();
  
  next();
});

// Instance Methods
licenseSchema.methods.generateSignature = function() {
  const data = {
    licenseId: this.licenseId,
    companyId: this.companyId,
    licenseType: this.licenseType,
    expiresAt: this.expiresAt,
    limits: this.limits,
    modules: this.modules
  };
  
  const secret = process.env.LICENSE_SIGNING_SECRET || 'default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
};

licenseSchema.methods.verifySignature = function() {
  return this.signature === this.generateSignature();
};

licenseSchema.methods.isValid = function() {
  return (
    this.status === 'active' &&
    this.expiresAt > new Date() &&
    this.verifySignature()
  );
};

licenseSchema.methods.isExpired = function() {
  return this.expiresAt <= new Date();
};

licenseSchema.methods.daysUntilExpiry = function() {
  const now = new Date();
  const diffTime = this.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

licenseSchema.methods.generateEncryptedPayload = function() {
  const payload = {
    licenseId: this.licenseId,
    licenseNumber: this.licenseNumber,
    companyId: this.companyId,
    licenseType: this.licenseType,
    status: this.status,
    expiresAt: this.expiresAt,
    limits: this.limits,
    modules: this.modules,
    signature: this.signature,
    generatedAt: new Date()
  };
  
  const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
};

licenseSchema.methods.updateUsage = function(usageData) {
  this.currentUsage = {
    ...this.currentUsage,
    ...usageData,
    lastUpdated: new Date()
  };
  this.validationCount += 1;
  this.lastValidated = new Date();
};

licenseSchema.methods.checkLimits = function() {
  const violations = [];
  
  if (this.currentUsage.users > this.limits.maxUsers) {
    violations.push({
      type: 'users',
      current: this.currentUsage.users,
      limit: this.limits.maxUsers
    });
  }
  
  if (this.currentUsage.storage > this.limits.maxStorage) {
    violations.push({
      type: 'storage',
      current: this.currentUsage.storage,
      limit: this.limits.maxStorage
    });
  }
  
  if (this.currentUsage.apiCallsThisMonth > this.limits.maxApiCallsPerMonth) {
    violations.push({
      type: 'apiCalls',
      current: this.currentUsage.apiCallsThisMonth,
      limit: this.limits.maxApiCallsPerMonth
    });
  }
  
  return {
    withinLimits: violations.length === 0,
    violations
  };
};

// Static Methods
licenseSchema.statics.findByCompany = function(companyId) {
  return this.findOne({ companyId, status: 'active' });
};

licenseSchema.statics.findExpiring = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    expiresAt: { $lte: futureDate, $gt: new Date() }
  });
};

licenseSchema.statics.findExpired = function() {
  return this.find({
    status: 'active',
    expiresAt: { $lte: new Date() }
  });
};

// Helper function to generate license numbers
function generateLicenseNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HRSM-${part1}-${part2}`;
}

const License = mongoose.model('License', licenseSchema);

export default License;