import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * DataRetentionPolicy Model
 * 
 * Manages data retention policies per tenant
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const DataRetentionPolicy = sequelize.define('DataRetentionPolicy', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Tenant isolation - REQUIRED
  tenant_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'tenant_id'
  },
  
  // Policy identification
  policy_name: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'policy_name'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Data type configuration
  data_type: {
    type: DataTypes.ENUM(
      'audit_logs', 'security_logs', 'user_data', 'employee_records',
      'insurance_policies', 'insurance_claims', 'family_members', 'beneficiaries',
      'license_data', 'backup_logs', 'performance_logs', 'system_logs',
      'compliance_logs', 'financial_records', 'documents', 'reports'
    ),
    allowNull: false,
    field: 'data_type'
  },
  
  // Retention configuration (JSONB)
  retention_period: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'retention_period'
    // Structure: { value, unit }
  },
  
  // Archival configuration (JSONB)
  archival_settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { enabled: false },
    field: 'archival_settings'
    // Structure: { enabled, archiveAfter: { value, unit }, archiveLocation, compressionEnabled, encryptionEnabled }
  },
  
  // Deletion configuration (JSONB)
  deletion_settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { softDelete: true },
    field: 'deletion_settings'
    // Structure: { softDelete, hardDeleteAfter: { value, unit }, requireApproval, approvalRequired: [] }
  },
  
  // Legal and compliance requirements (JSONB)
  legal_requirements: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'legal_requirements'
    // Structure: { minimumRetention: { value, unit }, maximumRetention: { value, unit }, jurisdiction, regulatoryFramework: [], dataClassification }
  },
  
  // Execution configuration (JSONB)
  execution_schedule: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { frequency: 'daily', time: '02:00', timezone: 'UTC' },
    field: 'execution_schedule'
    // Structure: { frequency, time, timezone }
  },
  
  // Status and tracking
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    allowNull: false,
    defaultValue: 'active'
  },
  
  last_executed: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_executed'
  },
  
  next_execution: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_execution'
  },
  
  // Statistics (JSONB)
  statistics: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      totalRecordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      lastProcessedCount: 0,
      averageProcessingTime: 0,
      successfulExecutions: 0,
      failedExecutions: 0
    }
    // Structure: { totalRecordsProcessed, recordsArchived, recordsDeleted, lastProcessedCount, averageProcessingTime, lastError, successfulExecutions, failedExecutions }
  },
  
  // Audit trail
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by'
  },
  
  // Configuration history (JSONB array)
  configuration_history: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'configuration_history'
    // Structure: [{ changedBy, changedAt, changes, reason }]
  }
}, {
  tableName: 'data_retention_policies',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'data_type']
    },
    {
      fields: ['tenant_id', 'status', 'next_execution']
    },
    {
      fields: ['data_type']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeCreate: (policy) => {
      // Calculate next execution on creation
      if (!policy.next_execution) {
        policy.next_execution = policy.calculateNextExecution();
      }
    },
    beforeUpdate: (policy) => {
      // Recalculate next execution if schedule changed
      if (policy.changed('execution_schedule')) {
        policy.next_execution = policy.calculateNextExecution();
      }
    }
  }
});

// Instance methods
DataRetentionPolicy.prototype.getRetentionPeriodInDays = function() {
  const { value, unit } = this.retention_period;
  switch (unit) {
    case 'days': return value;
    case 'months': return value * 30;
    case 'years': return value * 365;
    default: return value;
  }
};

DataRetentionPolicy.prototype.getArchivalPeriodInDays = function() {
  if (!this.archival_settings.enabled) return null;
  
  const { value, unit } = this.archival_settings.archiveAfter;
  switch (unit) {
    case 'days': return value;
    case 'months': return value * 30;
    case 'years': return value * 365;
    default: return value;
  }
};

DataRetentionPolicy.prototype.calculateNextExecution = function() {
  const now = new Date();
  const [hours, minutes] = this.execution_schedule.time.split(':').map(Number);
  
  let nextExecution = new Date(now);
  nextExecution.setHours(hours, minutes, 0, 0);
  
  // If the time has passed today, schedule for tomorrow/next period
  if (nextExecution <= now) {
    switch (this.execution_schedule.frequency) {
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

DataRetentionPolicy.prototype.isDueForExecution = function() {
  if (!this.next_execution) return true;
  return new Date() >= this.next_execution;
};

DataRetentionPolicy.prototype.updateStatistics = async function(stats) {
  const currentStats = this.statistics || {};
  
  currentStats.lastProcessedCount = stats.processed || 0;
  currentStats.totalRecordsProcessed = (currentStats.totalRecordsProcessed || 0) + (stats.processed || 0);
  currentStats.recordsArchived = (currentStats.recordsArchived || 0) + (stats.archived || 0);
  currentStats.recordsDeleted = (currentStats.recordsDeleted || 0) + (stats.deleted || 0);
  
  if (stats.processingTime) {
    const currentAvg = currentStats.averageProcessingTime || 0;
    const executions = currentStats.successfulExecutions || 0;
    currentStats.averageProcessingTime = 
      (currentAvg * executions + stats.processingTime) / (executions + 1);
  }
  
  if (stats.error) {
    currentStats.lastError = stats.error;
    currentStats.failedExecutions = (currentStats.failedExecutions || 0) + 1;
  } else {
    currentStats.successfulExecutions = (currentStats.successfulExecutions || 0) + 1;
    currentStats.lastError = null;
  }
  
  this.statistics = currentStats;
  this.last_executed = new Date();
  this.next_execution = this.calculateNextExecution();
  
  return this.save();
};

// Static methods
DataRetentionPolicy.findActiveByDataType = async function(tenantId, dataType) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      data_type: dataType,
      status: 'active'
    }
  });
};

DataRetentionPolicy.findDueForExecution = async function(tenantId) {
  const { Op } = require('sequelize');
  
  return this.findAll({
    where: {
      tenant_id: tenantId,
      status: 'active',
      next_execution: {
        [Op.lte]: new Date()
      }
    }
  });
};

export default DataRetentionPolicy;
