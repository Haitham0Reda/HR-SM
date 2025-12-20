import mongoose from 'mongoose';

const dataRetentionPolicySchema = new mongoose.Schema({
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true, 
    index: true 
  },
  
  // Policy identification
  policyName: { 
    type: String, 
    required: true 
  },
  description: String,
  
  // Data type configuration
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
  
  // Retention configuration
  retentionPeriod: {
    value: { type: Number, required: true, min: 1 },
    unit: { 
      type: String, 
      required: true, 
      enum: ['days', 'months', 'years'],
      default: 'days'
    }
  },
  
  // Archival configuration
  archivalSettings: {
    enabled: { type: Boolean, default: false },
    archiveAfter: {
      value: { type: Number, min: 1 },
      unit: { 
        type: String, 
        enum: ['days', 'months', 'years'],
        default: 'months'
      }
    },
    archiveLocation: {
      type: String,
      enum: ['local', 'cloud_storage', 'both'],
      default: 'local'
    },
    compressionEnabled: { type: Boolean, default: true },
    encryptionEnabled: { type: Boolean, default: true }
  },
  
  // Deletion configuration
  deletionSettings: {
    softDelete: { type: Boolean, default: true },
    hardDeleteAfter: {
      value: { type: Number, min: 1 },
      unit: { 
        type: String, 
        enum: ['days', 'months', 'years'],
        default: 'days'
      }
    },
    requireApproval: { type: Boolean, default: false },
    approvalRequired: [{ 
      type: String,
      enum: ['admin', 'compliance_officer', 'data_protection_officer']
    }]
  },
  
  // Legal and compliance requirements
  legalRequirements: {
    minimumRetention: {
      value: Number,
      unit: { 
        type: String, 
        enum: ['days', 'months', 'years']
      }
    },
    maximumRetention: {
      value: Number,
      unit: { 
        type: String, 
        enum: ['days', 'months', 'years']
      }
    },
    jurisdiction: String, // 'US', 'EU', 'GDPR', etc.
    regulatoryFramework: [String], // ['GDPR', 'SOX', 'HIPAA', etc.]
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal'
    }
  },
  
  // Execution configuration
  executionSchedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    time: { type: String, default: '02:00' }, // HH:MM format
    timezone: { type: String, default: 'UTC' }
  },
  
  // Status and tracking
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  lastExecuted: Date,
  nextExecution: Date,
  
  // Statistics
  statistics: {
    totalRecordsProcessed: { type: Number, default: 0 },
    recordsArchived: { type: Number, default: 0 },
    recordsDeleted: { type: Number, default: 0 },
    lastProcessedCount: { type: Number, default: 0 },
    averageProcessingTime: { type: Number, default: 0 }, // in milliseconds
    lastError: String,
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 }
  },
  
  // Audit trail
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Configuration history
  configurationHistory: [{
    changedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    changedAt: { type: Date, default: Date.now },
    changes: mongoose.Schema.Types.Mixed,
    reason: String
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
dataRetentionPolicySchema.index({ tenantId: 1, dataType: 1 });
dataRetentionPolicySchema.index({ status: 1, nextExecution: 1 });
dataRetentionPolicySchema.index({ 'legalRequirements.jurisdiction': 1 });

// Virtual for retention period in days
dataRetentionPolicySchema.virtual('retentionPeriodInDays').get(function() {
  const { value, unit } = this.retentionPeriod;
  switch (unit) {
    case 'days': return value;
    case 'months': return value * 30;
    case 'years': return value * 365;
    default: return value;
  }
});

// Virtual for archival period in days
dataRetentionPolicySchema.virtual('archivalPeriodInDays').get(function() {
  if (!this.archivalSettings.enabled) return null;
  
  const { value, unit } = this.archivalSettings.archiveAfter;
  switch (unit) {
    case 'days': return value;
    case 'months': return value * 30;
    case 'years': return value * 365;
    default: return value;
  }
});

// Method to calculate next execution time
dataRetentionPolicySchema.methods.calculateNextExecution = function() {
  const now = new Date();
  const [hours, minutes] = this.executionSchedule.time.split(':').map(Number);
  
  let nextExecution = new Date(now);
  nextExecution.setHours(hours, minutes, 0, 0);
  
  // If the time has passed today, schedule for tomorrow/next period
  if (nextExecution <= now) {
    switch (this.executionSchedule.frequency) {
      case 'daily':
        nextExecution.setDate(nextExecution.getDate() + 1);
        break;
      case 'weekly':
        nextExecution.setDate(nextExecution.getDate() + 7);
        break;
      case 'monthly':
        nextExecution.setMonth(nextExecution.getMonth() + 1);
        break;
    }
  }
  
  return nextExecution;
};

// Method to check if policy is due for execution
dataRetentionPolicySchema.methods.isDueForExecution = function() {
  if (!this.nextExecution) return true;
  return new Date() >= this.nextExecution;
};

// Pre-save middleware to calculate next execution
dataRetentionPolicySchema.pre('save', function(next) {
  if (this.isNew || this.isModified('executionSchedule')) {
    this.nextExecution = this.calculateNextExecution();
  }
  next();
});

// Method to update statistics
dataRetentionPolicySchema.methods.updateStatistics = function(stats) {
  this.statistics.lastProcessedCount = stats.processed || 0;
  this.statistics.totalRecordsProcessed += stats.processed || 0;
  this.statistics.recordsArchived += stats.archived || 0;
  this.statistics.recordsDeleted += stats.deleted || 0;
  
  if (stats.processingTime) {
    const currentAvg = this.statistics.averageProcessingTime;
    const executions = this.statistics.successfulExecutions;
    this.statistics.averageProcessingTime = 
      (currentAvg * executions + stats.processingTime) / (executions + 1);
  }
  
  if (stats.error) {
    this.statistics.lastError = stats.error;
    this.statistics.failedExecutions += 1;
  } else {
    this.statistics.successfulExecutions += 1;
    this.statistics.lastError = null;
  }
  
  this.lastExecuted = new Date();
  this.nextExecution = this.calculateNextExecution();
};

export default mongoose.model('DataRetentionPolicy', dataRetentionPolicySchema);