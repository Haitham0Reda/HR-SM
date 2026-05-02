/**
 * Security Audit Model - PostgreSQL (Sequelize)
 * Comprehensive audit logging for security events
 */

import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

const SecurityAudit = sequelize.define('SecurityAudit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  eventType: {
    type: DataTypes.ENUM(
      // Authentication Events
      'login-success', 'login-failed', 'logout',
      '2fa-enabled', '2fa-disabled', '2fa-verified', '2fa-failed',
      // Password Events
      'password-changed', 'password-reset-requested', 'password-reset-completed', 'password-expired',
      // Account Events
      'account-locked', 'account-unlocked', 'account-created', 'account-deleted', 'account-updated',
      // Permission Events
      'role-changed', 'permission-added', 'permission-removed', 'permission-audit-cleanup',
      // Role Management Events
      'role-created', 'role-updated', 'role-deleted', 'role-viewed', 'roles-synced',
      // Security Events
      'ip-blocked', 'unauthorized-access', 'session-terminated', 'suspicious-activity',
      // Data Events
      'data-accessed', 'data-modified', 'data-deleted', 'data-exported',
      // System Events
      'settings-changed', 'backup-created', 'maintenance-mode-enabled', 'maintenance-mode-disabled'
    ),
    allowNull: false,
    field: 'event_type'
  },
  user: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_email'
  },
  userRole: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'user_role'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  requestUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'request_url'
  },
  requestMethod: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'request_method'
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical'),
    defaultValue: 'info'
  },
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'session_id'
  }
}, {
  tableName: 'security_audits',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user', 'timestamp'] },
    { fields: ['event_type', 'timestamp'] },
    { fields: ['ip_address', 'timestamp'] },
    { fields: ['severity', 'timestamp'] },
    { fields: ['user'] },
    { fields: ['event_type'] },
    { fields: ['ip_address'] },
    { fields: ['severity'] },
    { fields: ['timestamp'] }
  ]
});

// Static method to log security event
SecurityAudit.logEvent = async function(eventData) {
  return await this.create(eventData);
};

// Static method to log authentication event
SecurityAudit.logAuth = async function(eventType, user, req, details = {}) {
  return await this.logEvent({
    eventType,
    user: user?.id,
    username: user?.username,
    userEmail: user?.email,
    userRole: user?.role,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    requestUrl: req.originalUrl,
    requestMethod: req.method,
    details,
    severity: eventType.includes('failed') || eventType.includes('blocked') ? 'warning' : 'info',
    success: !eventType.includes('failed')
  });
};

// Static method to get user activity
SecurityAudit.getUserActivity = function(userId, options = {}) {
  const { limit = 100, offset = 0, eventType } = options;

  const where = { user: userId };
  if (eventType) where.eventType = eventType;

  return this.findAll({
    where,
    order: [['timestamp', 'DESC']],
    limit,
    offset
  });
};

// Static method to get suspicious activities
SecurityAudit.getSuspiciousActivities = function(days = 7) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return this.findAll({
    where: {
      timestamp: { [Op.gte]: dateThreshold },
      [Op.or]: [
        { severity: 'critical' },
        { eventType: { [Op.in]: ['login-failed', 'unauthorized-access', 'ip-blocked', 'suspicious-activity'] } },
        { success: false }
      ]
    },
    order: [['timestamp', 'DESC']],
    limit: 500
  });
};

// Static method to get failed login attempts
SecurityAudit.getFailedLogins = function(userId, minutes = 30) {
  const dateThreshold = new Date();
  dateThreshold.setMinutes(dateThreshold.getMinutes() - minutes);

  return this.count({
    where: {
      user: userId,
      eventType: 'login-failed',
      timestamp: { [Op.gte]: dateThreshold }
    }
  });
};

// Static method to get security statistics
SecurityAudit.getSecurityStats = async function(days = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  const eventStats = await this.findAll({
    where: {
      timestamp: { [Op.gte]: dateThreshold }
    },
    attributes: [
      'eventType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.literal("CASE WHEN success = false THEN 1 ELSE 0 END")), 'failures']
    ],
    group: ['eventType'],
    order: [[sequelize.literal('count'), 'DESC']],
    raw: true
  });

  const severityStats = await this.findAll({
    where: {
      timestamp: { [Op.gte]: dateThreshold }
    },
    attributes: [
      'severity',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['severity'],
    raw: true
  });

  return {
    eventStats,
    severityStats,
    period: `Last ${days} days`
  };
};

export default SecurityAudit;
