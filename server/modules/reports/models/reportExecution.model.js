import { DataTypes, Op, QueryTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * Report Execution Model
 * 
 * Stores report execution history and results
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const ReportExecution = sequelize.define('ReportExecution', {
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
  
  // Report Reference
  report_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'report_id'
  },
  
  report_name: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'report_name'
  },
  
  // Execution Details
  executed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'executed_by'
  },
  
  execution_type: {
    type: DataTypes.ENUM('manual', 'scheduled', 'api'),
    allowNull: false,
    defaultValue: 'manual',
    field: 'execution_type'
  },
  
  // Parameters (JSONB)
  parameters: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { startDate, endDate, filters, additionalParams }
  },
  
  // Results
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'start_time'
  },
  
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_time'
  },
  
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Data
  result_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'result_count'
  },
  
  result_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'result_data'
  },
  
  result_file: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'result_file'
  },
  
  // Export
  export_format: {
    type: DataTypes.ENUM('excel', 'pdf', 'csv', 'html', 'json'),
    allowNull: true,
    field: 'export_format'
  },
  
  export_path: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'export_path'
  },
  
  export_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'export_size'
  },
  
  // Error Information (JSONB)
  error: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { message, stack, code }
  },
  
  // Delivery (for scheduled reports)
  email_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'email_sent'
  },
  
  email_recipients: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'email_recipients'
  },
  
  email_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_sent_at'
  },
  
  // Metadata
  execution_time: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'execution_time'
  },
  
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ip_address'
  },
  
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  }
}, {
  tableName: 'report_executions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'report_id', 'created_at']
    },
    {
      fields: ['tenant_id', 'executed_by', 'created_at']
    },
    {
      fields: ['tenant_id', 'status', 'created_at']
    },
    {
      fields: ['tenant_id', 'execution_type', 'created_at']
    },
    {
      fields: ['report_id']
    },
    {
      fields: ['executed_by']
    },
    {
      fields: ['status']
    }
  ]
});

// Instance methods
ReportExecution.prototype.markCompleted = async function(resultCount, resultData = null) {
  this.status = 'completed';
  this.end_time = new Date();
  this.duration = this.end_time - this.start_time;
  this.result_count = resultCount;
  
  if (resultData) {
    this.result_data = resultData;
  }
  
  return this.save();
};

ReportExecution.prototype.markFailed = async function(error) {
  this.status = 'failed';
  this.end_time = new Date();
  this.duration = this.end_time - this.start_time;
  this.error = {
    message: error.message,
    stack: error.stack,
    code: error.code
  };
  
  return this.save();
};

// Static methods
ReportExecution.getHistory = async function(reportId, tenantId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  
  return this.findAll({
    where: {
      report_id: reportId,
      tenant_id: tenantId
    },
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

ReportExecution.getStatistics = async function(reportId, tenantId, days = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  const stats = await sequelize.query(
    `SELECT 
      status as _id,
      COUNT(*) as count,
      AVG(duration) as avg_duration,
      SUM(result_count) as total_records
    FROM report_executions
    WHERE report_id = :reportId
      AND tenant_id = :tenantId
      AND created_at >= :dateThreshold
    GROUP BY status`,
    {
      replacements: { reportId, tenantId, dateThreshold },
      type: QueryTypes.SELECT
    }
  );
  
  return stats.map(row => ({
    _id: row._id,
    count: parseInt(row.count),
    avgDuration: parseFloat(row.avg_duration) || 0,
    totalRecords: parseInt(row.total_records) || 0
  }));
};

ReportExecution.withTenant = function(tenantId) {
  return this.findAll({
    where: { tenant_id: tenantId }
  });
};

export default ReportExecution;




