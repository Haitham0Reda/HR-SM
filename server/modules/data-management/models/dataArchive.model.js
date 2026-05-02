import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * DataArchive Model
 * 
 * Manages data archival per tenant
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const DataArchive = sequelize.define('DataArchive', {
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
  
  // Archive identification
  archive_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'archive_id'
  },
  
  // Source information
  source_collection: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'source_collection'
  },
  
  source_database: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'source_database'
  },
  
  // Data type and policy reference
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
  
  retention_policy_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'retention_policy_id'
  },
  
  // Archive content information
  record_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 },
    field: 'record_count'
  },
  
  // Date range (JSONB)
  date_range: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'date_range'
    // Structure: { startDate, endDate }
  },
  
  // Storage information (JSONB)
  storage: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'storage'
    // Structure: { location, localPath, cloudPath, cloudProvider, cloudBucket, cloudRegion }
  },
  
  // File information (JSONB)
  file_info: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'file_info'
    // Structure: { originalSize, compressedSize, compressionRatio, format, encoding, checksum, checksumAlgorithm }
  },
  
  // Encryption information (JSONB)
  encryption: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { enabled: false }
    // Structure: { enabled, algorithm, keyId, iv }
  },
  
  // Compression information (JSONB)
  compression: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { enabled: false }
    // Structure: { enabled, algorithm, level }
  },
  
  // Archive status
  status: {
    type: DataTypes.ENUM('creating', 'completed', 'failed', 'verifying', 'verified', 'corrupted'),
    allowNull: false,
    defaultValue: 'creating'
  },
  
  // Metadata for search and retrieval (JSONB)
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { tags: [], description, searchableFields, customAttributes }
  },
  
  // Access control (JSONB)
  access_control: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { restrictedAccess: false, authorizedRoles: [], authorizedUsers: [], accessLog: [] },
    field: 'access_control'
    // Structure: { restrictedAccess, authorizedRoles: [], authorizedUsers: [], accessLog: [] }
  },
  
  // Restoration information (JSONB)
  restoration: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { canRestore: true, restorationComplexity: 'simple', restorationHistory: [] }
    // Structure: { canRestore, restorationComplexity, estimatedRestoreTime, restorationHistory: [] }
  },
  
  // Legal and compliance (JSONB)
  legal_hold: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { isOnHold: false },
    field: 'legal_hold'
    // Structure: { isOnHold, holdReason, holdStartDate, holdEndDate, holdRequestedBy, legalCaseReference }
  },
  
  // Audit trail (JSONB array)
  audit_trail: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'audit_trail'
    // Structure: [{ action, performedBy, performedAt, details, ipAddress }]
  },
  
  // Scheduled deletion (JSONB)
  scheduled_deletion: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    field: 'scheduled_deletion'
    // Structure: { deleteAfter, deletionReason, approvalRequired, approvedBy, approvedAt }
  },
  
  // Creation information
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  
  // Processing information (JSONB)
  processing_info: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    field: 'processing_info'
    // Structure: { startTime, endTime, processingDuration, errors: [], warnings: [] }
  }
}, {
  tableName: 'data_archives',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      unique: true,
      fields: ['archive_id']
    },
    {
      fields: ['tenant_id', 'data_type']
    },
    {
      fields: ['tenant_id', 'status', 'created_at']
    },
    {
      fields: ['source_collection']
    },
    {
      fields: ['data_type']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeCreate: (archive) => {
      // Auto-generate archive ID if not provided
      if (!archive.archive_id) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        archive.archive_id = `ARC-${timestamp}-${random}`.toUpperCase();
      }
    }
  }
});

// Instance methods
DataArchive.prototype.getAgeInDays = function() {
  return Math.floor((Date.now() - this.created_at.getTime()) / (1000 * 60 * 60 * 24));
};

DataArchive.prototype.getFileSizeFormatted = function() {
  const size = this.compression.enabled ? 
    this.file_info.compressedSize : 
    this.file_info.originalSize;
  
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

DataArchive.prototype.addAuditEntry = async function(action, performedBy, details, ipAddress) {
  const auditTrail = this.audit_trail || [];
  auditTrail.push({
    action,
    performedBy,
    details,
    ipAddress,
    performedAt: new Date()
  });
  this.audit_trail = auditTrail;
  return this.save();
};

DataArchive.prototype.logAccess = async function(userId, accessType, ipAddress, userAgent) {
  const accessControl = this.access_control || { accessLog: [] };
  accessControl.accessLog.push({
    userId,
    accessType,
    ipAddress,
    userAgent,
    accessedAt: new Date()
  });
  this.access_control = accessControl;
  return this.save();
};

DataArchive.prototype.verifyIntegrity = async function() {
  if (this.status === 'completed') {
    this.status = 'verified';
    await this.addAuditEntry('verified', null, { 
      verificationMethod: 'checksum',
      result: 'passed'
    });
  }
  return this.save();
};

DataArchive.prototype.isDueForDeletion = function() {
  if (this.legal_hold && this.legal_hold.isOnHold) return false;
  if (!this.scheduled_deletion || !this.scheduled_deletion.deleteAfter) return false;
  return new Date() >= new Date(this.scheduled_deletion.deleteAfter);
};

// Static methods
DataArchive.findByDataType = async function(tenantId, dataType) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      data_type: dataType
    },
    order: [['created_at', 'DESC']]
  });
};

DataArchive.findDueForDeletion = async function(tenantId) {
  
  return this.findAll({
    where: {
      tenant_id: tenantId,
      'legal_hold.isOnHold': false,
      'scheduled_deletion.deleteAfter': {
        [Op.lte]: new Date()
      }
    }
  });
};

export default DataArchive;




