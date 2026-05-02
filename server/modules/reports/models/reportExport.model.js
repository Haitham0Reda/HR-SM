import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * Report Export Model
 * 
 * Manages report generation and export in multiple formats (HTML, Excel, PDF).
 * Tracks export history and integrates with all HR modules for comprehensive reporting.
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const ReportExport = sequelize.define('ReportExport', {
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
  
  // Report metadata
  report_type: {
    type: DataTypes.ENUM(
      'attendance-summary', 'attendance-detail', 'leave-summary', 'leave-detail',
      'payroll-summary', 'payroll-detail', 'employee-roster', 'vacation-balance',
      'permission-requests', 'department-summary', 'comprehensive-hr', 'custom'
    ),
    allowNull: false,
    field: 'report_type'
  },
  
  // Report title and description
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Export format
  export_format: {
    type: DataTypes.ENUM('html', 'excel', 'pdf'),
    allowNull: false,
    defaultValue: 'html',
    field: 'export_format'
  },
  
  // Date range for the report (JSONB)
  date_range: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'date_range'
    // Structure: { rangeType, startDate, endDate, label }
  },
  
  // Filters applied to the report (JSONB)
  filters: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { department, employee, position, status: [], leaveType: [], customFilters }
  },
  
  // Summary data (JSONB)
  summary: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { totalRecords: 0 }
    // Structure: { totalRecords, metrics, additionalData }
  },
  
  // Export file information (JSONB)
  export_file: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    field: 'export_file'
    // Structure: { fileName, filePath, fileSize, mimeType, url }
  },
  
  // Report configuration reference
  report_config_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'report_config_id'
  },
  
  // User who generated the report
  generated_by: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'generated_by'
  },
  
  // Organization/location
  organization: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'default'
  },
  
  // Report status
  status: {
    type: DataTypes.ENUM('pending', 'generating', 'completed', 'failed', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  // Processing information (JSONB)
  processing: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { startedAt, completedAt, duration, errorMessage }
  },
  
  // Export settings (JSONB)
  settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      includeCharts: false,
      includeRawData: true,
      pageOrientation: 'portrait'
    }
    // Structure: { includeCharts, includeRawData, pageOrientation, excelSettings, pdfSettings }
  },
  
  // Access tracking (JSONB array)
  access_log: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'access_log'
    // Structure: [{ accessedBy, accessedAt, action }]
  },
  
  // Expiration (for temporary exports)
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  
  // Tags for categorization (JSONB array)
  tags: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  
  // Is this a scheduled/recurring report?
  is_scheduled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_scheduled'
  },
  
  schedule_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'schedule_id'
  }
}, {
  tableName: 'report_exports',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'generated_by', 'created_at']
    },
    {
      fields: ['tenant_id', 'report_type', 'status']
    },
    {
      fields: ['tenant_id', 'organization', 'report_type']
    },
    {
      fields: ['tenant_id', 'expires_at']
    },
    {
      fields: ['tenant_id', 'status', 'created_at']
    },
    {
      fields: ['generated_by']
    },
    {
      fields: ['report_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['organization']
    }
  ]
});

// Instance methods
ReportExport.prototype.isExpired = function() {
  return this.expires_at && new Date() > this.expires_at;
};

ReportExport.prototype.getFileExtension = function() {
  const extensions = {
    'html': '.html',
    'excel': '.xlsx',
    'pdf': '.pdf'
  };
  return extensions[this.export_format] || '';
};

ReportExport.prototype.markCompleted = async function(filePath, fileSize) {
  this.status = 'completed';
  this.processing = {
    ...this.processing,
    completedAt: new Date(),
    duration: new Date() - new Date(this.processing.startedAt || new Date())
  };
  
  const mimeTypes = {
    'html': 'text/html',
    'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'pdf': 'application/pdf'
  };
  
  this.export_file = {
    filePath,
    fileSize,
    mimeType: mimeTypes[this.export_format]
  };
  
  return this.save();
};

ReportExport.prototype.markFailed = async function(errorMessage) {
  this.status = 'failed';
  this.processing = {
    ...this.processing,
    completedAt: new Date(),
    duration: new Date() - new Date(this.processing.startedAt || new Date()),
    errorMessage
  };
  return this.save();
};

ReportExport.prototype.logAccess = async function(userId, action = 'view') {
  const accessLog = this.access_log || [];
  accessLog.push({
    accessedBy: userId,
    accessedAt: new Date(),
    action
  });
  this.access_log = accessLog;
  return this.save();
};

// Static methods
ReportExport.createReport = async function(reportData, userId) {
  // Import ReportConfig dynamically to avoid circular dependency
  const ReportConfig = require('./reportConfig.model.js').default;
  
  const config = await ReportConfig.getConfig(
    reportData.tenantId,
    reportData.organization || 'default'
  );
  
  const dateRange = config.getDateRange(
    reportData.rangeType || 'hr-month',
    reportData.customStart,
    reportData.customEnd
  );
  
  const exportRecord = await this.create({
    tenant_id: reportData.tenantId,
    report_type: reportData.reportType,
    title: reportData.title,
    export_format: reportData.exportFormat || 'html',
    date_range: {
      rangeType: reportData.rangeType || 'hr-month',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      label: dateRange.label
    },
    filters: reportData.filters || {},
    report_config_id: config.id,
    generated_by: userId,
    organization: reportData.organization || 'default',
    settings: reportData.settings || {},
    tags: reportData.tags || [],
    status: 'generating',
    processing: {
      startedAt: new Date()
    }
  });
  
  return exportRecord;
};

ReportExport.getUserExports = async function(userId, tenantId, filters = {}) {
  const where = {
    generated_by: userId,
    tenant_id: tenantId,
    ...filters
  };
  
  return this.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 50
  });
};

ReportExport.cleanupExpired = async function(tenantId) {
  const result = await this.destroy({
    where: {
      tenant_id: tenantId,
      expires_at: { [Op.lt]: new Date() },
      status: 'completed'
    }
  });
  
  return result;
};

ReportExport.getExportStats = async function(tenantId, organization = 'default', startDate, endDate) {
  
  let dateFilter = '';
  const replacements = { tenantId, organization };
  
  if (startDate && endDate) {
    dateFilter = 'AND created_at >= :startDate AND created_at <= :endDate';
    replacements.startDate = startDate;
    replacements.endDate = endDate;
  }
  
  const stats = await sequelize.query(
    `SELECT 
      report_type,
      export_format,
      status,
      COUNT(*) as count,
      SUM((export_file->>'fileSize')::bigint) as total_size,
      AVG((processing->>'duration')::bigint) as avg_duration
    FROM report_exports
    WHERE tenant_id = :tenantId
      AND organization = :organization
      ${dateFilter}
    GROUP BY report_type, export_format, status`,
    {
      replacements,
      type: QueryTypes.SELECT
    }
  );
  
  return stats.map(row => ({
    reportType: row.report_type,
    format: row.export_format,
    status: row.status,
    count: parseInt(row.count),
    totalSize: parseInt(row.total_size) || 0,
    avgDuration: parseFloat(row.avg_duration) || 0
  }));
};

ReportExport.withTenant = function(tenantId) {
  return this.findAll({
    where: { tenant_id: tenantId }
  });
};

export default ReportExport;




