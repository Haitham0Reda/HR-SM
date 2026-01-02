import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Company License Schema - Stored in Each Company Database
 * This is an encrypted copy of the license for local validation and performance
 */
const companyLicenseSchema = new mongoose.Schema({
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
    index: true
  },
  
  // Company Information
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  // Encrypted License Data
  encryptedLicenseData: {
    type: String,
    required: true,
    select: false // Never include in queries by default for security
  },
  
  // Local Cache Information
  cacheInfo: {
    lastSyncedFromServer: {
      type: Date,
      required: true,
      default: Date.now
    },
    syncVersion: {
      type: Number,
      default: 1
    },
    encryptionVersion: {
      type: String,
      default: 'v1'
    },
    checksumHash: {
      type: String,
      required: true
    }
  },
  
  // Quick Access Fields (non-sensitive, for performance)
  quickAccess: {
    licenseType: {
      type: String,
      enum: ['trial', 'starter', 'professional', 'enterprise', 'unlimited'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'revoked', 'pending'],
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    maxUsers: {
      type: Number,
      required: true
    },
    enabledModules: [{
      type: String
    }]
  },
  
  // Validation Status
  validationStatus: {
    lastValidated: {
      type: Date,
      default: Date.now
    },
    validationCount: {
      type: Number,
      default: 0
    },
    lastValidationResult: {
      type: String,
      enum: ['valid', 'invalid', 'expired', 'error'],
      default: 'valid'
    },
    lastValidationError: {
      type: String,
      default: null
    },
    nextValidationDue: {
      type: Date,
      default: () => {
        const next = new Date();
        next.setHours(next.getHours() + 24); // Validate daily
        return next;
      }
    }
  },
  
  // Sync Status
  syncStatus: {
    lastSyncAttempt: {
      type: Date,
      default: Date.now
    },
    lastSuccessfulSync: {
      type: Date,
      default: Date.now
    },
    syncFailureCount: {
      type: Number,
      default: 0
    },
    lastSyncError: {
      type: String,
      default: null
    },
    nextSyncScheduled: {
      type: Date,
      default: () => {
        const next = new Date();
        next.setHours(next.getHours() + 6); // Sync every 6 hours
        return next;
      }
    },
    syncRetryCount: {
      type: Number,
      default: 0,
      max: 5
    }
  },
  
  // Offline Mode Support
  offlineMode: {
    enabled: {
      type: Boolean,
      default: false
    },
    gracePeriodUntil: {
      type: Date,
      default: null
    },
    offlineValidationsRemaining: {
      type: Number,
      default: 100 // Allow 100 offline validations
    },
    lastOnlineValidation: {
      type: Date,
      default: Date.now
    }
  },
  
  // Security & Integrity
  integrity: {
    tamperDetection: {
      type: Boolean,
      default: false
    },
    lastIntegrityCheck: {
      type: Date,
      default: Date.now
    },
    integrityHash: {
      type: String,
      required: true
    },
    encryptionKeyRotationDate: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  collection: 'company_license'
});

// Indexes for performance
companyLicenseSchema.index({ 'quickAccess.expiresAt': 1, 'quickAccess.status': 1 });
companyLicenseSchema.index({ 'validationStatus.nextValidationDue': 1 });
companyLicenseSchema.index({ 'syncStatus.nextSyncScheduled': 1 });
companyLicenseSchema.index({ 'cacheInfo.lastSyncedFromServer': 1 });

// Pre-save middleware
companyLicenseSchema.pre('save', function(next) {
  // Update integrity hash
  this.integrity.integrityHash = this.calculateIntegrityHash();
  this.integrity.lastIntegrityCheck = new Date();
  
  next();
});

// Instance Methods
companyLicenseSchema.methods.calculateIntegrityHash = function() {
  const data = {
    licenseId: this.licenseId || '',
    licenseNumber: this.licenseNumber || '',
    companyId: this.companyId || '',
    quickAccess: this.quickAccess || {},
    cacheInfo: this.cacheInfo || {}
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data) + (process.env.INTEGRITY_SECRET || 'default-secret'))
    .digest('hex');
};

companyLicenseSchema.methods.verifyIntegrity = function() {
  const currentHash = this.calculateIntegrityHash();
  const isValid = currentHash === this.integrity.integrityHash;
  
  if (!isValid) {
    this.integrity.tamperDetection = true;
  }
  
  return isValid;
};

companyLicenseSchema.methods.decryptLicenseData = function(encryptionKey) {
  try {
    // Extract IV and encrypted data
    const parts = this.encryptedLicenseData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = Buffer.from(parts[1], 'hex');
    
    // Create key hash
    const key = crypto.createHash('sha256').update(encryptionKey).digest();
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt license data: ' + error.message);
  }
};

companyLicenseSchema.methods.updateEncryptedData = function(licenseData, encryptionKey) {
  // Generate random IV
  const iv = crypto.randomBytes(16);
  
  // Create key hash
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(licenseData), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Store IV:encrypted format
  this.encryptedLicenseData = iv.toString('hex') + ':' + encrypted;
  
  // Update quick access fields
  this.quickAccess = {
    licenseType: licenseData.licenseType,
    status: licenseData.status,
    expiresAt: licenseData.expiresAt,
    maxUsers: licenseData.limits?.maxUsers || 0,
    enabledModules: licenseData.modules?.map(m => m.moduleId) || []
  };
  
  // Update cache info
  this.cacheInfo.lastSyncedFromServer = new Date();
  this.cacheInfo.syncVersion += 1;
  this.cacheInfo.checksumHash = crypto
    .createHash('md5')
    .update(encrypted)
    .digest('hex');
};

companyLicenseSchema.methods.isValid = function() {
  return (
    this.quickAccess.status === 'active' &&
    this.quickAccess.expiresAt > new Date() &&
    this.verifyIntegrity() &&
    !this.integrity.tamperDetection
  );
};

companyLicenseSchema.methods.isExpired = function() {
  return this.quickAccess.expiresAt <= new Date();
};

companyLicenseSchema.methods.needsValidation = function() {
  return new Date() >= this.validationStatus.nextValidationDue;
};

companyLicenseSchema.methods.needsSync = function() {
  return (
    new Date() >= this.syncStatus.nextSyncScheduled ||
    this.syncStatus.syncFailureCount > 0
  );
};

companyLicenseSchema.methods.canOperateOffline = function() {
  if (!this.offlineMode.enabled) return false;
  
  const now = new Date();
  const gracePeriodValid = this.offlineMode.gracePeriodUntil && now <= this.offlineMode.gracePeriodUntil;
  const validationsRemaining = this.offlineMode.offlineValidationsRemaining > 0;
  
  return gracePeriodValid && validationsRemaining;
};

companyLicenseSchema.methods.recordValidation = function(result) {
  this.validationStatus.lastValidated = new Date();
  this.validationStatus.validationCount += 1;
  this.validationStatus.lastValidationResult = result.valid ? 'valid' : 'invalid';
  this.validationStatus.lastValidationError = result.error || null;
  
  // Schedule next validation
  const next = new Date();
  next.setHours(next.getHours() + 24); // Daily validation
  this.validationStatus.nextValidationDue = next;
  
  // Update offline mode if validation was successful
  if (result.valid && result.online) {
    this.offlineMode.lastOnlineValidation = new Date();
    this.offlineMode.offlineValidationsRemaining = 100; // Reset counter
  } else if (this.offlineMode.enabled) {
    this.offlineMode.offlineValidationsRemaining = Math.max(0, this.offlineMode.offlineValidationsRemaining - 1);
  }
};

companyLicenseSchema.methods.recordSyncAttempt = function(result) {
  this.syncStatus.lastSyncAttempt = new Date();
  
  if (result.successful) {
    this.syncStatus.lastSuccessfulSync = new Date();
    this.syncStatus.syncFailureCount = 0;
    this.syncStatus.syncRetryCount = 0;
    this.syncStatus.lastSyncError = null;
    
    // Schedule next sync
    const next = new Date();
    next.setHours(next.getHours() + 6); // Every 6 hours
    this.syncStatus.nextSyncScheduled = next;
  } else {
    this.syncStatus.syncFailureCount += 1;
    this.syncStatus.syncRetryCount += 1;
    this.syncStatus.lastSyncError = result.error;
    
    // Exponential backoff for retry
    const backoffHours = Math.min(24, Math.pow(2, this.syncStatus.syncRetryCount));
    const next = new Date();
    next.setHours(next.getHours() + backoffHours);
    this.syncStatus.nextSyncScheduled = next;
  }
};

companyLicenseSchema.methods.enableOfflineMode = function(gracePeriodHours = 72) {
  this.offlineMode.enabled = true;
  const gracePeriod = new Date();
  gracePeriod.setHours(gracePeriod.getHours() + gracePeriodHours);
  this.offlineMode.gracePeriodUntil = gracePeriod;
  this.offlineMode.offlineValidationsRemaining = 100;
};

companyLicenseSchema.methods.disableOfflineMode = function() {
  this.offlineMode.enabled = false;
  this.offlineMode.gracePeriodUntil = null;
  this.offlineMode.offlineValidationsRemaining = 0;
};

// Static Methods
companyLicenseSchema.statics.findActiveForCompany = function(companyId) {
  return this.findOne({
    companyId,
    'quickAccess.status': 'active'
  });
};

companyLicenseSchema.statics.findNeedingValidation = function() {
  return this.find({
    'validationStatus.nextValidationDue': { $lte: new Date() }
  });
};

companyLicenseSchema.statics.findNeedingSync = function() {
  return this.find({
    $or: [
      { 'syncStatus.nextSyncScheduled': { $lte: new Date() } },
      { 'syncStatus.syncFailureCount': { $gt: 0 } }
    ]
  });
};

companyLicenseSchema.statics.createFromServerData = function(licenseData, encryptionKey) {
  const companyLicense = new this({
    licenseId: licenseData.licenseId,
    licenseNumber: licenseData.licenseNumber,
    companyId: licenseData.companyId
  });
  
  companyLicense.updateEncryptedData(licenseData, encryptionKey);
  return companyLicense;
};

const CompanyLicense = mongoose.model('CompanyLicense', companyLicenseSchema);

export default CompanyLicense;