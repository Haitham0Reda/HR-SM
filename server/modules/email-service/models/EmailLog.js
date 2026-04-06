import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * EmailLog Model
 * 
 * Tracks email sending history and status
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const EmailLog = sequelize.define('EmailLog', {
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
  
  to: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  from: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  template: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  provider: {
    type: DataTypes.ENUM('smtp', 'sendgrid', 'ses'),
    allowNull: true
  },
  
  status: {
    type: DataTypes.ENUM('sent', 'failed', 'queued'),
    allowNull: false
  },
  
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  message_id: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'message_id'
  },
  
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_at'
  }
}, {
  tableName: 'email_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'status', 'created_at']
    },
    {
      fields: ['to']
    },
    {
      fields: ['status']
    }
  ]
});

// Static methods
EmailLog.getRecentEmails = async function(tenantId, limit = 50) {
  return this.findAll({
    where: { tenant_id: tenantId },
    order: [['created_at', 'DESC']],
    limit
  });
};

EmailLog.getFailedEmails = async function(tenantId) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      status: 'failed'
    },
    order: [['created_at', 'DESC']]
  });
};

export default EmailLog;
