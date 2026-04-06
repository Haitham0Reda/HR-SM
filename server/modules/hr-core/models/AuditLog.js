/**
 * AuditLog Model - Sequelize (PostgreSQL)
 * 
 * Represents audit log entries for tracking system activities.
 * Stored in the Main Application Database with tenant isolation.
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import crypto from 'crypto';
import os from 'os';

const AuditLog = mainAppDb.define('AuditLog', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the audit log (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant identifier for data isolation (use "system" for system-level operations)'
  },

  // Action and Resource
  action: {
    type: DataTypes.ENUM(
      'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import',
      // License-related actions
      'license_create', 'license_validate', 'license_renew', 'license_revoke',
      'license_activate', 'license_check', 'license_expire', 'license_update',
      // System actions
      'system_alert', 'system_health_check', 'backup_create', 'backup_restore',
      'module_enable', 'module_disable', 'tenant_create', 'tenant_suspend',
      'tenant_reactivate', 'security_event', 'performance_alert'
    ),
    allowNull: false,
    comment: 'Action performed'
  },
  resource: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Resource affected by the action'
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'resource_id',
    comment: 'ID of the affected resource'
  },

  // User Reference
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    comment: 'User who performed the action (null for system actions)'
  },

  // Change Tracking (stored as JSONB)
  changes: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Changes made (JSONB: {before, after, fields})'
  },

  // Request Information
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    comment: 'IP address of the request'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent',
    comment: 'User agent string'
  },
  requestId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'request_id',
    comment: 'Request ID for correlation'
  },
  sessionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'session_id',
    comment: 'Session ID'
  },

  // Categorization
  module: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Module name'
  },
  category: {
    type: DataTypes.ENUM(
      'authentication', 'authorization', 'data_modification', 'system_operation',
      'license_management', 'tenant_management', 'security', 'performance',
      'backup_recovery', 'module_management', 'audit', 'compliance'
    ),
    allowNull: false,
    defaultValue: 'data_modification',
    comment: 'Event category'
  },

  // Status and Error Handling
  status: {
    type: DataTypes.ENUM('success', 'failure', 'warning', 'info'),
    allowNull: false,
    defaultValue: 'success',
    comment: 'Event status'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
    comment: 'Error message if status is failure'
  },
  errorCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'error_code',
    comment: 'Error code'
  },

  // Severity
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
    comment: 'Event severity'
  },

  // License Information (stored as JSONB)
  licenseInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'license_info',
    comment: 'License-related information (JSONB)'
  },

  // System Context (stored as JSONB)
  systemInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'system_info',
    comment: 'System context information (JSONB: {hostname, service, version, environment})'
  },

  // Performance Metrics (stored as JSONB)
  performance: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Performance metrics (JSONB: {duration, memoryUsage, cpuUsage})'
  },

  // Compliance and Retention
  retentionPolicy: {
    type: DataTypes.ENUM('standard', 'extended', 'permanent'),
    allowNull: false,
    defaultValue: 'standard',
    field: 'retention_policy',
    comment: 'Data retention policy'
  },
  complianceFlags: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { gdpr: false, sox: false, hipaa: false },
    field: 'compliance_flags',
    comment: 'Compliance flags (JSONB: {gdpr, sox, hipaa})'
  },

  // Additional Metadata
  tags: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Tags for categorization (JSONB array)'
  },
  correlationId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'correlation_id',
    comment: 'Correlation ID for tracking related events'
  },
  parentEventId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_event_id',
    comment: 'Parent event ID for hierarchical events'
  },

  // Immutability Protection
  hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'SHA-256 hash for integrity verification'
  },
  signature: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Digital signature for non-repudiation'
  },

  // Audit Fields
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
    comment: 'User who created this record'
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by',
    comment: 'User who last updated this record'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Indexes for performance
  indexes: [
    {
      name: 'idx_audit_logs_tenant_id',
      fields: ['tenant_id']
    },
    {
      name: 'idx_audit_logs_created_at',
      fields: ['created_at']
    },
    {
      name: 'idx_audit_logs_user_id_created_at',
      fields: ['user_id', 'created_at']
    },
    {
      name: 'idx_audit_logs_resource_resource_id',
      fields: ['resource', 'resource_id']
    },
    {
      name: 'idx_audit_logs_action_created_at',
      fields: ['action', 'created_at']
    },
    {
      name: 'idx_audit_logs_category_severity',
      fields: ['category', 'severity']
    },
    {
      name: 'idx_audit_logs_correlation_id',
      fields: ['correlation_id']
    },
    {
      name: 'idx_audit_logs_request_id',
      fields: ['request_id']
    },
    {
      name: 'idx_audit_logs_status_severity',
      fields: ['status', 'severity']
    },
    {
      name: 'idx_audit_logs_license_info_license_number',
      fields: [mainAppDb.literal("((license_info->>'licenseNumber'))")],
      using: 'btree'
    },
    {
      name: 'idx_audit_logs_license_info_tenant_id',
      fields: [mainAppDb.literal("((license_info->>'tenantId'))")],
      using: 'btree'
    }
  ],
  
  // Hooks
  hooks: {
    beforeCreate: (auditLog) => {
      // Generate correlation ID if not provided
      if (!auditLog.correlationId) {
        auditLog.correlationId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Set system info if not provided
      if (!auditLog.systemInfo || Object.keys(auditLog.systemInfo).length === 0) {
        auditLog.systemInfo = {
          hostname: os.hostname(),
          service: 'hr-sm-backend',
          environment: process.env.NODE_ENV || 'development',
          version: process.env.APP_VERSION || '1.0.0'
        };
      } else {
        if (!auditLog.systemInfo.hostname) {
          auditLog.systemInfo.hostname = os.hostname();
        }
        if (!auditLog.systemInfo.service) {
          auditLog.systemInfo.service = 'hr-sm-backend';
        }
        if (!auditLog.systemInfo.environment) {
          auditLog.systemInfo.environment = process.env.NODE_ENV || 'development';
        }
      }

      // Generate hash for integrity verification
      const dataToHash = JSON.stringify({
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        userId: auditLog.userId,
        changes: auditLog.changes,
        timestamp: auditLog.createdAt || new Date()
      });
      auditLog.hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    }
  }
});

// Instance Methods

// Virtual for determining if this is a license-related event
AuditLog.prototype.isLicenseEvent = function() {
  return this.action && this.action.startsWith('license_');
};

// Virtual for determining if this is a system event
AuditLog.prototype.isSystemEvent = function() {
  return this.category === 'system_operation' || this.category === 'performance';
};

// Static Methods

// Static method for creating audit logs with validation
AuditLog.createAuditLog = async function(logData) {
  // Ensure tenantId is always provided, use 'system' for system-level operations
  const tenantId = logData.tenantId || logData.licenseInfo?.tenantId || 'system';
  
  const auditLog = await this.create({
    action: logData.action,
    resource: logData.resource,
    resourceId: logData.resourceId,
    userId: logData.userId,
    tenantId: tenantId,
    changes: logData.changes,
    ipAddress: logData.ipAddress,
    userAgent: logData.userAgent,
    requestId: logData.requestId,
    sessionId: logData.sessionId,
    module: logData.module,
    category: logData.category,
    status: logData.status || 'success',
    errorMessage: logData.errorMessage,
    errorCode: logData.errorCode,
    severity: logData.severity || 'medium',
    licenseInfo: logData.licenseInfo,
    systemInfo: logData.systemInfo || {},
    performance: logData.performance,
    retentionPolicy: logData.retentionPolicy || 'standard',
    complianceFlags: logData.complianceFlags || {},
    tags: logData.tags || [],
    correlationId: logData.correlationId,
    parentEventId: logData.parentEventId
  });

  return auditLog;
};

// Static method for querying audit logs with common filters
AuditLog.queryAuditLogs = async function(filters = {}) {
  const where = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;
  if (filters.category) where.category = filters.category;
  if (filters.severity) where.severity = filters.severity;
  if (filters.status) where.status = filters.status;
  if (filters.correlationId) where.correlationId = filters.correlationId;
  if (filters.tenantId) where.tenantId = filters.tenantId;

  // JSONB queries for license info
  if (filters.licenseNumber) {
    where[Op.and] = mainAppDb.literal(`license_info->>'licenseNumber' = '${filters.licenseNumber}'`);
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt[Op.gte] = new Date(filters.startDate);
    if (filters.endDate) where.createdAt[Op.lte] = new Date(filters.endDate);
  }

  return this.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: filters.limit || 100,
    offset: filters.skip || 0
  });
};

// Associations will be defined in a separate associations file
AuditLog.associate = (models) => {
  if (models.User) {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    AuditLog.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    AuditLog.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  }
  
  // Self-referential association for parent event
  AuditLog.belongsTo(AuditLog, {
    foreignKey: 'parentEventId',
    as: 'parentEvent'
  });
  
  AuditLog.hasMany(AuditLog, {
    foreignKey: 'parentEventId',
    as: 'childEvents'
  });
};

export default AuditLog;
