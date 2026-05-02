import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * PerformanceMetrics Model
 * 
 * Tracks performance metrics per tenant
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const PerformanceMetrics = sequelize.define('PerformanceMetrics', {
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
  
  request_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'request_id'
  },
  
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  method: {
    type: DataTypes.ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'),
    allowNull: false
  },
  
  status_code: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'status_code'
  },
  
  response_time: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'response_time'
  },
  
  memory_usage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'memory_usage'
  },
  
  cpu_usage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'cpu_usage'
  },
  
  user_id: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_id'
  },
  
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ip_address'
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
  tableName: 'performance_metrics',
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
      fields: ['tenant_id', 'path', 'method', 'timestamp']
    },
    {
      fields: ['tenant_id', 'response_time']
    },
    {
      fields: ['tenant_id', 'status_code', 'timestamp']
    },
    {
      fields: ['request_id']
    },
    {
      fields: ['user_id']
    }
  ]
});

// Static methods
PerformanceMetrics.getAverageResponseTime = async function(tenantId, startDate, endDate) {
  
  const result = await this.findOne({
    where: {
      tenant_id: tenantId,
      timestamp: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('response_time')), 'avgResponseTime']
    ],
    raw: true
  });
  
  return result ? parseFloat(result.avgResponseTime) : 0;
};

PerformanceMetrics.getSlowestEndpoints = async function(tenantId, limit = 10) {
  
  return this.findAll({
    where: { tenant_id: tenantId },
    attributes: [
      'path',
      'method',
      [sequelize.fn('AVG', sequelize.col('response_time')), 'avgResponseTime'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'requestCount']
    ],
    group: ['path', 'method'],
    order: [[sequelize.literal('avg_response_time'), 'DESC']],
    limit,
    raw: true
  });
};

export default PerformanceMetrics;



