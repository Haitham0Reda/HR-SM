/**
 * Security Event Model - PostgreSQL (Sequelize)
 * Tracks security events and incidents
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const SecurityEvent = mainAppDb.define('SecurityEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  tenantId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'tenant_id'
  },

  eventType: {
    type: DataTypes.ENUM(
      'failed_login',
      'successful_login',
      'password_change',
      'account_lockout',
      'suspicious_activity',
      'rate_limit_exceeded',
      'unauthorized_access_attempt',
      'privilege_escalation_attempt',
      'data_access_violation',
      'license_validation_failure',
      'api_abuse',
      'malicious_request',
      'brute_force_attempt',
      'session_hijack_attempt',
      'csrf_attempt',
      'xss_attempt',
      'sql_injection_attempt',
      'file_upload_violation',
      'configuration_change',
      'admin_action',
      'security_alert_triggered'
    ),
    allowNull: false,
    field: 'event_type'
  },

  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false
  },

  userId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_id'
  },

  userEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_email'
  },

  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'ip_address'
  },

  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },

  requestPath: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'request_path'
  },

  requestMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'request_method'
  },

  requestHeaders: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'request_headers'
  },

  requestBody: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'request_body'
  },

  responseStatus: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'response_status'
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  details: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  geolocation: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  resolvedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'resolved_by'
  },

  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  },

  resolutionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'resolution_notes'
  },

  alertSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'alert_sent'
  },

  alertSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'alert_sent_at'
  },

  correlationId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'correlation_id'
  },

  sessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'session_id'
  },

  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'security_events',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id', 'timestamp'] },
    { fields: ['event_type', 'severity'] },
    { fields: ['ip_address', 'timestamp'] },
    { fields: ['resolved', 'severity'] },
    { fields: ['timestamp'] },
    { fields: ['user_id'] }
  ]
});

export default SecurityEvent;
