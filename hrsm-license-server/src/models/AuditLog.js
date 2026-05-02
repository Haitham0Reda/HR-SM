/**
 * Audit Log Model - License Server Database (Sequelize)
 * Tracks all license operations for audit trail
 */

import { DataTypes, Model } from 'sequelize';
import { licenseServerDb as sequelize } from '../../config/database.js';

class AuditLog extends Model {}

AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  operation: {
    type: DataTypes.ENUM('create', 'validate', 'renew', 'revoke', 'suspend', 'reactivate', 'activate', 'usage_update'),
    allowNull: false
  },

  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'license_number'
  },

  tenantId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'tenant_id'
  },

  details: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  result: {
    type: DataTypes.ENUM('success', 'failure', 'warning'),
    allowNull: false
  },

  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },

  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  performedBy: {
    type: DataTypes.STRING,
    defaultValue: 'system',
    field: 'performed_by'
  },

  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'license_audit_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['license_number', 'timestamp'] },
    { fields: ['tenant_id', 'timestamp'] },
    { fields: ['operation', 'timestamp'] },
    { fields: ['timestamp'] }
  ]
});

export default AuditLog;
