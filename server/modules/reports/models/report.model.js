import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * Report Model
 * 
 * Custom report definitions and configurations
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const Report = sequelize.define('Report', {
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
  
  // Report Information
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  report_type: {
    type: DataTypes.ENUM('employee', 'attendance', 'leave', 'payroll', 'performance', 'request', 'department', 'custom'),
    allowNull: false,
    field: 'report_type'
  },
  
  // Report Configuration (JSONB arrays)
  fields: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // Structure: [{ fieldName, displayName, dataType, format, aggregation }]
  },
  
  filters: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // Structure: [{ field, operator, value, logicOperator }]
  },
  
  sorting: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // Structure: [{ field, order }]
  },
  
  group_by: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'group_by'
  },
  
  // Visualization (JSONB)
  visualization: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { enabled: false }
    // Structure: { enabled, chartType, xAxis, yAxis, colors: [] }
  },
  
  // Template
  is_template: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_template'
  },
  
  template_category: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'template_category'
  },
  
  // Scheduling (JSONB)
  schedule: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { enabled: false }
    // Structure: { enabled, frequency, dayOfWeek, dayOfMonth, time, cronExpression, lastRun, nextRun, recipients: [] }
  },
  
  // Export Settings (JSONB)
  export_settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { defaultFormat: 'excel', includeCharts: false, pageOrientation: 'portrait', paperSize: 'A4' },
    field: 'export_settings'
  },
  
  // Access Control
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_public'
  },
  
  shared_with: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'shared_with'
    // Structure: [{ user, permission }]
  },
  
  // Metadata
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  
  last_modified_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'last_modified_by'
  },
  
  last_run: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_run'
  },
  
  run_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'run_count'
  },
  
  // Status
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'reports',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'name', 'created_by']
    },
    {
      fields: ['tenant_id', 'report_type', 'is_active']
    },
    {
      fields: ['tenant_id', 'created_by']
    },
    {
      fields: ['tenant_id', 'is_template', 'is_active']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['report_type']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Instance methods
Report.prototype.getNextScheduledRun = function() {
  if (!this.schedule || !this.schedule.enabled) {
    return null;
  }
  return this.schedule.nextRun;
};

Report.prototype.calculateNextRun = function() {
  if (!this.schedule || !this.schedule.enabled) {
    return null;
  }
  
  const now = new Date();
  let nextRun = new Date();
  
  switch (this.schedule.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      if (this.schedule.dayOfMonth) {
        nextRun.setDate(this.schedule.dayOfMonth);
      }
      break;
    case 'quarterly':
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
    case 'yearly':
      nextRun.setFullYear(nextRun.getFullYear() + 1);
      break;
  }
  
  // Set time if specified
  if (this.schedule.time) {
    const [hours, minutes] = this.schedule.time.split(':');
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }
  
  return nextRun;
};

Report.prototype.recordRun = async function() {
  this.last_run = new Date();
  this.run_count += 1;
  
  if (this.schedule && this.schedule.enabled) {
    this.schedule = {
      ...this.schedule,
      lastRun: new Date(),
      nextRun: this.calculateNextRun()
    };
  }
  
  return this.save();
};

// Static methods
Report.getScheduledReports = async function(tenantId) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      'schedule.enabled': true,
      'schedule.nextRun': { [Op.lte]: new Date() },
      is_active: true
    }
  });
};

Report.getUserReports = async function(userId, tenantId) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      [Op.or]: [
        { created_by: userId },
        { is_public: true },
        sequelize.literal(`shared_with @> '[{"user": "${userId}"}]'`)
      ],
      is_active: true
    }
  });
};

Report.getTemplates = async function(tenantId) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      is_template: true,
      is_active: true
    },
    order: [
      ['template_category', 'ASC'],
      ['name', 'ASC']
    ]
  });
};

Report.withTenant = function(tenantId) {
  return this.findAll({
    where: { tenant_id: tenantId }
  });
};

export default Report;
