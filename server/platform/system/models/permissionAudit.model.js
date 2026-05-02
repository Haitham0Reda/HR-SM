/**
 * Permission Audit Model - PostgreSQL (Sequelize)
 * Tracks all permission changes for security and compliance
 */

import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

const PermissionAudit = sequelize.define('PermissionAudit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  modifiedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'modified_by'
  },
  action: {
    type: DataTypes.ENUM('role-change', 'permission-added', 'permission-removed', 'permission-reset'),
    allowNull: false
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  reason: {
    type: DataTypes.STRING(500),
    allowNull: true
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
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'permission_audits',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user', 'timestamp'] },
    { fields: ['modified_by', 'timestamp'] },
    { fields: ['action', 'timestamp'] },
    { fields: ['user'] },
    { fields: ['timestamp'] }
  ]
});

// Static method to log permission change
PermissionAudit.logChange = async function(data) {
  return await this.create(data);
};

// Static method to get user's audit trail
PermissionAudit.getUserAuditTrail = async function(userId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  return await this.findAll({
    where: { user: userId },
    include: [
      {
        association: 'modifier',
        attributes: ['username', 'email']
      }
    ],
    order: [['timestamp', 'DESC']],
    limit,
    offset
  });
};

// Static method to get recent permission changes
PermissionAudit.getRecentChanges = async function(days = 30, options = {}) {
  const { limit = 100 } = options;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return await this.findAll({
    where: {
      timestamp: { [Op.gte]: dateThreshold }
    },
    include: [
      {
        association: 'userRef',
        attributes: ['username', 'email', 'role']
      },
      {
        association: 'modifier',
        attributes: ['username', 'email']
      }
    ],
    order: [['timestamp', 'DESC']],
    limit
  });
};

export default PermissionAudit;
