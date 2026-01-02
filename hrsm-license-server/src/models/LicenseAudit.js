import mongoose from 'mongoose';

/**
 * License Audit Schema - License Server Database
 * Tracks all license-related activities and changes
 */
const licenseAuditSchema = new mongoose.Schema({
  // Audit Identification
  auditId: {
    type: String,
    required: true,
    unique: true,
    default: () => `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // License Reference
  licenseId: {
    type: String,
    required: true,
    index: true
  },
  licenseNumber: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  // Event Information
  eventType: {
    type: String,
    enum: [
      'license_created',
      'license_updated',
      'license_activated',
      'license_deactivated',
      'license_expired',
      'license_suspended',
      'license_revoked',
      'license_renewed',
      'validation_success',
      'validation_failure',
      'usage_updated',
      'limit_exceeded',
      'sync_to_company',
      'sync_failure',
      'signature_verification',
      'encryption_key_rotated'
    ],
    required: true,
    index: true
  },
  
  // Event Details
  eventDescription: {
    type: String,
    required: true
  },
  
  // Before/After State (for updates)
  previousState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Actor Information
  performedBy: {
    userId: String,
    userEmail: String,
    userRole: String,
    source: {
      type: String,
      enum: ['license_server', 'platform', 'company_db', 'api', 'system'],
      required: true
    },
    ipAddress: String,
    userAgent: String
  },
  
  // Technical Details
  technicalDetails: {
    requestId: String,
    sessionId: String,
    apiEndpoint: String,
    httpMethod: String,
    responseCode: Number,
    processingTime: Number, // milliseconds
    errorMessage: String,
    stackTrace: String
  },
  
  // Validation & Security
  validationResults: {
    signatureValid: Boolean,
    licenseValid: Boolean,
    limitsChecked: Boolean,
    limitViolations: [{
      type: String,
      current: Number,
      limit: Number,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    }]
  },
  
  // Sync Information
  syncInfo: {
    syncAttempted: Boolean,
    syncSuccessful: Boolean,
    targetDatabase: String,
    syncDuration: Number,
    syncError: String,
    retryCount: Number
  },
  
  // Risk & Compliance
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  
  complianceFlags: [{
    flag: String,
    description: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical']
    }
  }],
  
  // Metadata
  metadata: {
    environment: {
      type: String,
      enum: ['production', 'staging', 'development'],
      default: 'production'
    },
    version: String,
    buildNumber: String,
    region: String,
    dataCenter: String
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Retention
  retentionPolicy: {
    retainUntil: Date,
    archived: {
      type: Boolean,
      default: false
    },
    archiveLocation: String
  }
}, {
  timestamps: true,
  collection: 'license_audits'
});

// Indexes for performance and querying
licenseAuditSchema.index({ licenseId: 1, timestamp: -1 });
licenseAuditSchema.index({ companyId: 1, timestamp: -1 });
licenseAuditSchema.index({ eventType: 1, timestamp: -1 });
licenseAuditSchema.index({ riskLevel: 1, timestamp: -1 });
licenseAuditSchema.index({ 'performedBy.source': 1, timestamp: -1 });
licenseAuditSchema.index({ 'validationResults.licenseValid': 1, timestamp: -1 });
licenseAuditSchema.index({ 'syncInfo.syncSuccessful': 1, timestamp: -1 });

// Pre-save middleware
licenseAuditSchema.pre('save', function(next) {
  // Set retention policy if not provided
  if (!this.retentionPolicy.retainUntil) {
    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + 7); // 7 years retention
    this.retentionPolicy.retainUntil = retainUntil;
  }
  
  // Auto-determine risk level based on event type
  if (!this.riskLevel || this.riskLevel === 'low') {
    this.riskLevel = this.calculateRiskLevel();
  }
  
  next();
});

// Instance Methods
licenseAuditSchema.methods.calculateRiskLevel = function() {
  const highRiskEvents = [
    'license_suspended',
    'license_revoked',
    'validation_failure',
    'limit_exceeded',
    'sync_failure'
  ];
  
  const mediumRiskEvents = [
    'license_expired',
    'signature_verification',
    'encryption_key_rotated'
  ];
  
  if (highRiskEvents.includes(this.eventType)) {
    return 'high';
  }
  
  if (mediumRiskEvents.includes(this.eventType)) {
    return 'medium';
  }
  
  // Check for limit violations
  if (this.validationResults?.limitViolations?.length > 0) {
    const criticalViolations = this.validationResults.limitViolations
      .filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      return 'critical';
    }
    return 'high';
  }
  
  return 'low';
};

licenseAuditSchema.methods.shouldAlert = function() {
  return ['high', 'critical'].includes(this.riskLevel);
};

licenseAuditSchema.methods.getEventSummary = function() {
  return {
    auditId: this.auditId,
    licenseNumber: this.licenseNumber,
    eventType: this.eventType,
    eventDescription: this.eventDescription,
    riskLevel: this.riskLevel,
    timestamp: this.timestamp,
    performedBy: this.performedBy?.userEmail || 'system'
  };
};

// Static Methods
licenseAuditSchema.statics.findByLicense = function(licenseId, limit = 100) {
  return this.find({ licenseId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

licenseAuditSchema.statics.findByCompany = function(companyId, limit = 100) {
  return this.find({ companyId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

licenseAuditSchema.statics.findHighRiskEvents = function(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return this.find({
    riskLevel: { $in: ['high', 'critical'] },
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 });
};

licenseAuditSchema.statics.getEventStatistics = function(companyId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        companyId: companyId,
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$timestamp' },
        riskLevels: { $push: '$riskLevel' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

licenseAuditSchema.statics.createAuditEntry = function(auditData) {
  const audit = new this(auditData);
  return audit.save();
};

// Helper method to create common audit entries
licenseAuditSchema.statics.logLicenseValidation = function(licenseId, licenseNumber, companyId, validationResult, performedBy) {
  return this.createAuditEntry({
    licenseId,
    licenseNumber,
    companyId,
    eventType: validationResult.valid ? 'validation_success' : 'validation_failure',
    eventDescription: validationResult.valid 
      ? 'License validation successful'
      : `License validation failed: ${validationResult.reason}`,
    performedBy,
    validationResults: {
      signatureValid: validationResult.signatureValid,
      licenseValid: validationResult.valid,
      limitsChecked: validationResult.limitsChecked,
      limitViolations: validationResult.limitViolations || []
    },
    technicalDetails: {
      processingTime: validationResult.processingTime,
      errorMessage: validationResult.error
    }
  });
};

licenseAuditSchema.statics.logUsageUpdate = function(licenseId, licenseNumber, companyId, usageData, performedBy) {
  return this.createAuditEntry({
    licenseId,
    licenseNumber,
    companyId,
    eventType: 'usage_updated',
    eventDescription: 'License usage statistics updated',
    performedBy,
    newState: usageData,
    validationResults: {
      limitsChecked: true,
      limitViolations: usageData.violations || []
    }
  });
};

licenseAuditSchema.statics.logSyncAttempt = function(licenseId, licenseNumber, companyId, syncResult, performedBy) {
  return this.createAuditEntry({
    licenseId,
    licenseNumber,
    companyId,
    eventType: syncResult.successful ? 'sync_to_company' : 'sync_failure',
    eventDescription: syncResult.successful 
      ? 'License successfully synced to company database'
      : `License sync failed: ${syncResult.error}`,
    performedBy,
    syncInfo: {
      syncAttempted: true,
      syncSuccessful: syncResult.successful,
      targetDatabase: syncResult.targetDatabase,
      syncDuration: syncResult.duration,
      syncError: syncResult.error,
      retryCount: syncResult.retryCount || 0
    }
  });
};

const LicenseAudit = mongoose.model('LicenseAudit', licenseAuditSchema);

export default LicenseAudit;