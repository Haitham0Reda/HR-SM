import { DataTypes, Op, QueryTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * SecurityEvents Model
 * 
 * Tracks security events per tenant
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const SecurityEvents = sequelize.define('SecurityEvents', {
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
  
  event_type: {
    type: DataTypes.ENUM(
      'failed_login', 'successful_login', 'password_change', 'account_locked',
      'suspicious_activity', 'unauthorized_access', 'privilege_escalation',
      'data_breach_attempt', 'malicious_request', 'sql_injection_attempt',
      'xss_attempt', 'csrf_attempt', 'brute_force_attack', 'session_hijack',
      'token_manipulation', 'rate_limit_exceeded', 'ip_blocked', 'security_policy_violation'
    ),
    allowNull: false,
    field: 'event_type'
  },
  
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  user_id: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_id'
  },
  
  ip_address: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'ip_address'
  },
  
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  
  request_path: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'request_path'
  },
  
  request_method: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'request_method'
  },
  
  request_headers: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'request_headers'
  },
  
  request_body: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'request_body'
  },
  
  response_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'response_status'
  },
  
  session_id: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'session_id'
  },
  
  correlation_id: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'correlation_id'
  },
  
  resolved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  },
  
  resolved_by: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'resolved_by'
  },
  
  resolution_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'resolution_notes'
  },
  
  risk_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    },
    field: 'risk_score'
  },
  
  geolocation: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { country, region, city, latitude, longitude }
  },
  
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'security_events',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'timestamp']
    },
    {
      fields: ['tenant_id', 'event_type', 'severity']
    },
    {
      fields: ['tenant_id', 'ip_address', 'timestamp']
    },
    {
      fields: ['tenant_id', 'resolved', 'severity']
    },
    {
      fields: ['tenant_id', 'user_id', 'event_type', 'timestamp']
    },
    {
      fields: ['tenant_id', 'risk_score', 'timestamp']
    }
  ]
});

// Static methods
SecurityEvents.getUnresolvedEvents = async function(tenantId, severity = null) {
  const where = {
    tenant_id: tenantId,
    resolved: false
  };
  
  if (severity) {
    where.severity = severity;
  }
  
  return this.findAll({
    where,
    order: [['risk_score', 'DESC'], ['timestamp', 'DESC']]
  });
};

SecurityEvents.getEventsByType = async function(tenantId, startDate, endDate) {
  
  const results = await sequelize.query(
    `SELECT 
      event_type,
      severity,
      COUNT(*) as count
    FROM security_events
    WHERE tenant_id = :tenantId
      AND timestamp >= :startDate
      AND timestamp <= :endDate
    GROUP BY event_type, severity
    ORDER BY count DESC`,
    {
      replacements: { tenantId, startDate, endDate },
      type: QueryTypes.SELECT
    }
  );
  
  return results;
};

export default SecurityEvents;



