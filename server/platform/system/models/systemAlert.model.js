/**
 * System Alert Model - PostgreSQL (Sequelize)
 * Stores system alerts and notifications
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const SystemAlert = mainAppDb.define('SystemAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  alertId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'alert_id'
  },

  type: {
    type: DataTypes.ENUM('system', 'database', 'application', 'security', 'performance'),
    allowNull: false
  },

  category: {
    type: DataTypes.ENUM('cpu', 'memory', 'disk', 'network', 'mongodb', 'postgresql', 'license', 'tenant', 'custom'),
    allowNull: false
  },

  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical', 'emergency'),
    allowNull: false
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false
  },

  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  details: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  metrics: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  source: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  status: {
    type: DataTypes.ENUM('active', 'acknowledged', 'resolved', 'suppressed'),
    defaultValue: 'active'
  },

  acknowledgedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'acknowledged_by'
  },

  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'acknowledged_at'
  },

  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  },

  notificationsSent: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'notifications_sent'
  },

  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },

  tenantId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'tenant_id'
  }
}, {
  tableName: 'system_alerts',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['alert_id'], unique: true },
    { fields: ['type', 'category'] },
    { fields: ['severity', 'status'] },
    { fields: ['status', 'severity'] },
    { fields: ['tenant_id', 'status'] },
    { fields: ['created_at'] }
  ]
});

export default SystemAlert;
