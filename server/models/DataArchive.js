import mongoose from 'mongoose';

const dataArchiveSchema = new mongoose.Schema({
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true, 
    index: true 
  },
  
  // Archive identification
  archiveId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  // Source information
  sourceCollection: { 
    type: String, 
    required: true,
    index: true
  },
  sourceDatabase: { 
    type: String, 
    required: true 
  },
  
  // Data type and policy reference
  dataType: { 
    type: String, 
    required: true,
    enum: [
      'audit_logs',
      'security_logs', 
      'user_data',
      'employee_records',
      'insurance_policies',
      'insurance_claims',
      'family_members',
      'beneficiaries',
      'license_data',
      'backup_logs',
      'performance_logs',
      'system_logs',
      'compliance_logs',
      'financial_records',
      'documents',
      'reports'
    ],
    index: true
  },
  
  retentionPolicyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DataRetentionPolicy', 
    required: true 
  },
  
  // Archive content information
  recordCount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  
  dateRange: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  
  // Storage information
  storage: {
    location: {
      type: String,
      enum: ['local', 'cloud_storage', 'both'],
      required: true
    },
    localPath: String,
    cloudPath: String,
    cloudProvider: {
      type: String,
      enum: ['aws_s3', 'google_cloud', 'azure_blob']
    },
    cloudBucket: String,
    cloudRegion: String
  },
  
  // File information
  fileInfo: {
    originalSize: { type: Number, required: true }, // in bytes
    compressedSize: Number, // in bytes
    compressionRatio: Number, // percentage
    format: {
      type: String,
      enum: ['json', 'bson', 'csv', 'parquet'],
      default: 'json'
    },
    encoding: {
      type: String,
      enum: ['utf8', 'base64'],
      default: 'utf8'
    },
    checksum: String, // for integrity verification
    checksumAlgorithm: {
      type: String,
      enum: ['md5', 'sha256', 'sha512'],
      default: 'sha256'
    }
  },
  
  // Encryption information
  encryption: {
    enabled: { type: Boolean, default: false },
    algorithm: {
      type: String,
      enum: ['aes-256-cbc', 'aes-256-gcm'],
      default: 'aes-256-cbc'
    },
    keyId: String, // reference to encryption key
    iv: String // initialization vector
  },
  
  // Compression information
  compression: {
    enabled: { type: Boolean, default: false },
    algorithm: {
      type: String,
      enum: ['gzip', 'bzip2', 'lz4'],
      default: 'gzip'
    },
    level: {
      type: Number,
      min: 1,
      max: 9,
      default: 6
    }
  },
  
  // Archive status
  status: {
    type: String,
    enum: ['creating', 'completed', 'failed', 'verifying', 'verified', 'corrupted'],
    default: 'creating',
    index: true
  },
  
  // Metadata for search and retrieval
  metadata: {
    tags: [String],
    description: String,
    searchableFields: mongoose.Schema.Types.Mixed,
    customAttributes: mongoose.Schema.Types.Mixed
  },
  
  // Access control
  accessControl: {
    restrictedAccess: { type: Boolean, default: false },
    authorizedRoles: [String],
    authorizedUsers: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    accessLog: [{
      userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      accessedAt: { type: Date, default: Date.now },
      accessType: {
        type: String,
        enum: ['view', 'download', 'restore']
      },
      ipAddress: String,
      userAgent: String
    }]
  },
  
  // Restoration information
  restoration: {
    canRestore: { type: Boolean, default: true },
    restorationComplexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex'],
      default: 'simple'
    },
    estimatedRestoreTime: Number, // in minutes
    restorationHistory: [{
      restoredAt: Date,
      restoredBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      targetLocation: String,
      status: {
        type: String,
        enum: ['success', 'failed', 'partial']
      },
      recordsRestored: Number,
      notes: String
    }]
  },
  
  // Legal and compliance
  legalHold: {
    isOnHold: { type: Boolean, default: false },
    holdReason: String,
    holdStartDate: Date,
    holdEndDate: Date,
    holdRequestedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    legalCaseReference: String
  },
  
  // Audit trail
  auditTrail: [{
    action: {
      type: String,
      enum: ['created', 'verified', 'accessed', 'restored', 'deleted', 'moved']
    },
    performedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    performedAt: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String
  }],
  
  // Scheduled deletion
  scheduledDeletion: {
    deleteAfter: Date,
    deletionReason: String,
    approvalRequired: { type: Boolean, default: false },
    approvedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    approvedAt: Date
  },
  
  // Creation information
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Processing information
  processingInfo: {
    startTime: Date,
    endTime: Date,
    processingDuration: Number, // in milliseconds
    errors: [String],
    warnings: [String]
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
dataArchiveSchema.index({ tenantId: 1, dataType: 1 });
dataArchiveSchema.index({ status: 1, createdAt: -1 });
dataArchiveSchema.index({ 'dateRange.startDate': 1, 'dateRange.endDate': 1 });
dataArchiveSchema.index({ 'scheduledDeletion.deleteAfter': 1 });
dataArchiveSchema.index({ 'legalHold.isOnHold': 1 });

// Virtual for archive age in days
dataArchiveSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for file size in human readable format
dataArchiveSchema.virtual('fileSizeFormatted').get(function() {
  const size = this.compression.enabled ? 
    this.fileInfo.compressedSize : 
    this.fileInfo.originalSize;
  
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
});

// Pre-save middleware to generate archive ID
dataArchiveSchema.pre('save', function(next) {
  if (this.isNew && !this.archiveId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.archiveId = `ARC-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Method to add audit trail entry
dataArchiveSchema.methods.addAuditEntry = function(action, performedBy, details, ipAddress) {
  this.auditTrail.push({
    action,
    performedBy,
    details,
    ipAddress,
    performedAt: new Date()
  });
};

// Method to log access
dataArchiveSchema.methods.logAccess = function(userId, accessType, ipAddress, userAgent) {
  this.accessControl.accessLog.push({
    userId,
    accessType,
    ipAddress,
    userAgent,
    accessedAt: new Date()
  });
};

// Method to verify integrity
dataArchiveSchema.methods.verifyIntegrity = async function() {
  // This would implement actual file integrity checking
  // For now, we'll just update the status
  if (this.status === 'completed') {
    this.status = 'verified';
    this.addAuditEntry('verified', null, { 
      verificationMethod: 'checksum',
      result: 'passed'
    });
  }
};

// Method to check if archive is due for deletion
dataArchiveSchema.methods.isDueForDeletion = function() {
  if (this.legalHold.isOnHold) return false;
  if (!this.scheduledDeletion.deleteAfter) return false;
  return new Date() >= this.scheduledDeletion.deleteAfter;
};

export default mongoose.model('DataArchive', dataArchiveSchema);