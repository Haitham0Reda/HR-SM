/**
 * Usage Tracking Model - PostgreSQL (Sequelize)
 * Tracks usage metrics for tenants and modules
 */

import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

const UsageTracking = sequelize.define('UsageTracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id'
  },
  moduleKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'module_key'
  },
  period: {
    type: DataTypes.STRING(7),
    allowNull: false,
    validate: {
      is: /^\d{4}-\d{2}$/
    },
    comment: 'Period in YYYY-MM format'
  },
  usage: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      employees: 0,
      storage: 0,
      apiCalls: 0,
      customMetrics: {}
    }
  },
  limits: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      employees: null,
      storage: null,
      apiCalls: null,
      customLimits: {}
    }
  },
  warnings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  violations: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  tableName: 'usage_tracking',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['tenant_id', 'module_key', 'period']
    },
    {
      fields: ['tenant_id', 'period']
    },
    {
      fields: ['module_key', 'period']
    }
  ]
});

/**
 * Get current period string (YYYY-MM)
 */
UsageTracking.getCurrentPeriod = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Calculate usage percentage for a limit type
 */
UsageTracking.prototype.getUsagePercentage = function(limitType) {
  const currentUsage = this.usage[limitType] || 0;
  const limit = this.limits[limitType];

  if (!limit || limit === 0) {
    return null;
  }

  return Math.round((currentUsage / limit) * 100);
};

/**
 * Check if usage is approaching limit (>= 80%)
 */
UsageTracking.prototype.isApproachingLimit = function(limitType) {
  const percentage = this.getUsagePercentage(limitType);
  return percentage !== null && percentage >= 80;
};

/**
 * Check if usage has exceeded limit
 */
UsageTracking.prototype.hasExceededLimit = function(limitType) {
  const currentUsage = this.usage[limitType] || 0;
  const limit = this.limits[limitType];

  if (!limit) {
    return false;
  }

  return currentUsage >= limit;
};

/**
 * Increment usage for a specific metric
 */
UsageTracking.prototype.incrementUsage = async function(limitType, amount = 1) {
  const usage = { ...this.usage };
  
  if (!usage[limitType]) {
    usage[limitType] = 0;
  }

  usage[limitType] += amount;
  this.usage = usage;

  // Check for warnings and violations
  const percentage = this.getUsagePercentage(limitType);

  if (percentage !== null && percentage >= 80) {
    const warnings = [...this.warnings];
    const hasRecentWarning = warnings.some(
      w => w.limitType === limitType &&
        w.percentage >= 80 &&
        (Date.now() - new Date(w.triggeredAt).getTime()) < 24 * 60 * 60 * 1000
    );

    if (!hasRecentWarning) {
      const cappedPercentage = Math.min(percentage, 100);
      warnings.push({
        limitType,
        percentage: cappedPercentage,
        triggeredAt: new Date()
      });
      this.warnings = warnings;
    }
  }

  if (this.hasExceededLimit(limitType)) {
    const violations = [...this.violations];
    violations.push({
      limitType,
      attemptedValue: usage[limitType],
      limit: this.limits[limitType],
      occurredAt: new Date()
    });
    this.violations = violations;
  }

  return await this.save();
};

/**
 * Set usage for a specific metric
 */
UsageTracking.prototype.setUsage = async function(limitType, value) {
  const usage = { ...this.usage };
  usage[limitType] = value;
  this.usage = usage;
  return await this.save();
};

/**
 * Get usage summary with percentages
 */
UsageTracking.prototype.getUsageSummary = function() {
  const summary = {};

  ['employees', 'storage', 'apiCalls'].forEach(limitType => {
    const current = this.usage[limitType] || 0;
    const limit = this.limits[limitType];
    const percentage = this.getUsagePercentage(limitType);

    summary[limitType] = {
      current,
      limit,
      percentage,
      isApproachingLimit: this.isApproachingLimit(limitType),
      hasExceeded: this.hasExceededLimit(limitType)
    };
  });

  return summary;
};

/**
 * Find or create usage tracking for current period
 */
UsageTracking.findOrCreateForCurrentPeriod = async function(tenantId, moduleKey, limits = {}) {
  const period = this.getCurrentPeriod();

  const [usageTracking] = await this.findOrCreate({
    where: { tenantId, moduleKey, period },
    defaults: {
      tenantId,
      moduleKey,
      period,
      limits
    }
  });

  return usageTracking;
};

/**
 * Get usage for a tenant across all modules
 */
UsageTracking.getTenantUsage = function(tenantId, period = null) {
  const queryPeriod = period || this.getCurrentPeriod();
  return this.findAll({ where: { tenantId, period: queryPeriod } });
};

/**
 * Get usage for a module across all tenants
 */
UsageTracking.getModuleUsage = function(moduleKey, period = null) {
  const queryPeriod = period || this.getCurrentPeriod();
  return this.findAll({ where: { moduleKey, period: queryPeriod } });
};

/**
 * Find all usage tracking with warnings
 */
UsageTracking.findWithWarnings = function(period = null) {
  const queryPeriod = period || this.getCurrentPeriod();
  return this.findAll({
    where: {
      period: queryPeriod,
      warnings: {
        [Op.ne]: []
      }
    }
  });
};

/**
 * Find all usage tracking with violations
 */
UsageTracking.findWithViolations = function(period = null) {
  const queryPeriod = period || this.getCurrentPeriod();
  return this.findAll({
    where: {
      period: queryPeriod,
      violations: {
        [Op.ne]: []
      }
    }
  });
};

/**
 * Aggregate usage across periods
 */
UsageTracking.aggregateUsage = async function(tenantId, moduleKey, months = 6) {
  const periods = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    periods.push(`${year}-${month}`);
  }

  const usageData = await this.findAll({
    where: {
      tenantId,
      moduleKey,
      period: { [Op.in]: periods }
    },
    order: [['period', 'DESC']]
  });

  return {
    periods,
    data: usageData,
    summary: {
      totalEmployees: Math.max(...usageData.map(u => u.usage.employees || 0), 0),
      totalStorage: usageData.reduce((sum, u) => sum + (u.usage.storage || 0), 0),
      totalApiCalls: usageData.reduce((sum, u) => sum + (u.usage.apiCalls || 0), 0)
    }
  };
};

export default UsageTracking;
