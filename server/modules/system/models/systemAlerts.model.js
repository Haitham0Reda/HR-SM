import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * SystemAlerts Model
 * 
 * Tracks system alerts and issues per tenant
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const SystemAlerts = sequelize.define('SystemAlerts', {
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
  
  type: {
    type: DataTypes.ENUM(
      'system_error', 'performance_degradation', 'high_memory_usage', 'high_cpu_usage',
      'disk_space_low', 'database_connection_issue', 'license_expiry_warning',
      'security_threat', 'backup_failure', 'service_unavailable', 'rate_limit_exceeded',
      'integration_failure', 'data_inconsistency', 'maintenance_required',
      'configuration_error', 'network_issue', 'authentication_service_down',
      'email_service_failure', 'file_storage_issue', 'cache_failure'
    ),
    allowNull: false
  },
  
  category: {
    type: DataTypes.ENUM('system', 'security', 'performance', 'business', 'infrastructure'),
    allowNull: false,
    defaultValue: 'system'
  },
  
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
    allowNull: false,
    defaultValue: 'warning'
  },
  
  status: {
    type: DataTypes.ENUM('active', 'acknowledged', 'resolved', 'suppressed'),
    allowNull: false,
    defaultValue: 'active'
  },
  
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  source: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  source_details: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    field: 'source_details'
    // Structure: { service, component, version, environment }
  },
  
  affected_users: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'affected_users'
    // Structure: [{ userId, tenantId, impact }]
  },
  
  metrics: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { errorCount, affectedRequests, responseTime, memoryUsage, cpuUsage, diskUsage }
  },
  
  thresholds: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { warning, critical, unit }
  },
  
  actions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // Structure: [{ action, performedBy, performedAt, result, notes }]
  },
  
  acknowledged_by: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'acknowledged_by'
  },
  
  acknowledged_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'acknowledged_at'
  },
  
  resolved_by: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'resolved_by'
  },
  
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  },
  
  resolution_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'resolution_notes'
  },
  
  suppressed_until: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'suppressed_until'
  },
  
  suppressed_by: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'suppressed_by'
  },
  
  suppression_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'suppression_reason'
  },
  
  escalation_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    },
    field: 'escalation_level'
  },
  
  escalated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'escalated_at'
  },
  
  escalated_to: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'escalated_to'
  },
  
  notifications_sent: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'notifications_sent'
    // Structure: [{ channel, recipient, sentAt, status, response }]
  },
  
  related_alerts: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'related_alerts'
    // Structure: [{ alertId, relationship }]
  },
  
  tags: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    validate: {
      min: 1,
      max: 5
    }
  },
  
  auto_resolve: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'auto_resolve'
  },
  
  auto_resolve_after: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'auto_resolve_after'
  },
  
  recurrence: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { isRecurring, pattern, count, lastOccurrence, nextExpected }
  },
  
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'system_alerts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'created_at']
    },
    {
      fields: ['tenant_id', 'status', 'severity']
    },
    {
      fields: ['tenant_id', 'type', 'category']
    },
    {
      fields: ['tenant_id', 'severity', 'status', 'created_at']
    },
    {
      fields: ['tenant_id', 'source', 'type', 'created_at']
    },
    {
      fields: ['tenant_id', 'priority', 'created_at']
    }
  ]
});

// Instance methods
SystemAlerts.prototype.acknowledge = async function(userId) {
  this.status = 'acknowledged';
  this.acknowledged_by = userId;
  this.acknowledged_at = new Date();
  return this.save();
};

SystemAlerts.prototype.resolve = async function(userId, notes) {
  this.status = 'resolved';
  this.resolved_by = userId;
  this.resolved_at = new Date();
  this.resolution_notes = notes;
  return this.save();
};

SystemAlerts.prototype.suppress = async function(userId, until, reason) {
  this.status = 'suppressed';
  this.suppressed_by = userId;
  this.suppressed_until = until;
  this.suppression_reason = reason;
  return this.save();
};

SystemAlerts.prototype.escalate = async function(level, escalatedTo) {
  this.escalation_level = level;
  this.escalated_at = new Date();
  this.escalated_to = escalatedTo;
  return this.save();
};

// Static methods
SystemAlerts.getActiveAlerts = async function(tenantId, severity = null) {
  const where = {
    tenant_id: tenantId,
    status: 'active'
  };
  
  if (severity) {
    where.severity = severity;
  }
  
  return this.findAll({
    where,
    order: [['priority', 'DESC'], ['created_at', 'DESC']]
  });
};

SystemAlerts.getCriticalAlerts = async function(tenantId) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      severity: 'critical',
      status: ['active', 'acknowledged']
    },
    order: [['created_at', 'DESC']]
  });
};

SystemAlerts.getAlertsByCategory = async function(tenantId, category) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      category
    },
    order: [['created_at', 'DESC']],
    limit: 50
  });
};

export default SystemAlerts;




