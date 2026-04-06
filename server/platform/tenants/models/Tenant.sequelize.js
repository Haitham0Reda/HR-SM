import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

/**
 * Tenant Model (Sequelize)
 * Represents a company/organization using the HR system
 */
const Tenant = mainAppDb.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'tenant_id',
    validate: {
      is: /^[a-z0-9_-]+$/
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  domain: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true,
    validate: {
      is: /^[a-z0-9.-]+\.[a-z]{2,}$/
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'trial', 'cancelled'),
    defaultValue: 'active',
    field: 'status'
  },
  deploymentMode: {
    type: DataTypes.ENUM('saas', 'on-premise'),
    defaultValue: 'saas',
    field: 'deployment_mode'
  },
  subscription: {
    type: DataTypes.JSONB,
    defaultValue: {
      status: 'trial',
      autoRenew: true,
      billingCycle: 'monthly'
    }
  },
  enabledModules: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'enabled_modules'
  },
  config: {
    type: DataTypes.JSONB,
    defaultValue: {
      timezone: 'UTC',
      locale: 'en-US',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      currency: 'USD',
      features: {}
    }
  },
  limits: {
    type: DataTypes.JSONB,
    defaultValue: {
      maxUsers: 100,
      maxStorage: 10737418240,
      apiCallsPerMonth: 100000
    }
  },
  usage: {
    type: DataTypes.JSONB,
    defaultValue: {
      userCount: 0,
      storageUsed: 0,
      apiCallsThisMonth: 0,
      activeUsers: 0
    }
  },
  metrics: {
    type: DataTypes.JSONB,
    defaultValue: {
      availability: 100,
      errorRate: 0,
      responseTime: 0
    }
  },
  billing: {
    type: DataTypes.JSONB,
    defaultValue: {
      currentPlan: 'trial',
      billingCycle: 'monthly',
      paymentStatus: 'active',
      totalRevenue: 0
    }
  },
  restrictions: {
    type: DataTypes.JSONB,
    defaultValue: {
      maxUsers: 50,
      maxStorage: 1024,
      maxAPICallsPerMonth: 10000
    }
  },
  license: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'License information including key, status, expiration'
  },
  compliance: {
    type: DataTypes.JSONB,
    defaultValue: {
      dataResidency: 'US',
      gdprCompliant: false,
      soc2Certified: false
    }
  },
  contactInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'contact_info'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'tenants',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'], unique: true },
    { fields: ['domain'], unique: true, where: { domain: { [DataTypes.Op.ne]: null } } },
    { fields: ['status'] },
    { fields: ['deployment_mode'] },
    { fields: ['created_at'] },
    { fields: ['updated_at'] }
  ],
  hooks: {
    beforeSave: (tenant) => {
      // Update lastActivityAt when usage metrics change
      if (tenant.changed('usage')) {
        const usage = tenant.usage || {};
        usage.lastActivityAt = new Date();
        tenant.usage = usage;
      }
    }
  }
});

// Instance methods
Tenant.prototype.isActive = function() {
  return this.status === 'active';
};

Tenant.prototype.hasActiveSubscription = function() {
  const sub = this.subscription || {};
  if (sub.status !== 'active') return false;
  if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) return false;
  return true;
};

Tenant.prototype.isModuleEnabled = function(moduleId) {
  const modules = this.enabledModules || [];
  return modules.some(m => m.moduleId === moduleId);
};

Tenant.prototype.enableModule = function(moduleId, enabledBy = 'system') {
  const modules = this.enabledModules || [];
  if (!this.isModuleEnabled(moduleId)) {
    modules.push({
      moduleId,
      enabledAt: new Date(),
      enabledBy
    });
    this.enabledModules = modules;
    this.changed('enabledModules', true);
  }
};

Tenant.prototype.disableModule = function(moduleId) {
  const modules = this.enabledModules || [];
  this.enabledModules = modules.filter(m => m.moduleId !== moduleId);
  this.changed('enabledModules', true);
};

Tenant.prototype.checkLimits = function() {
  const exceeded = {};
  const usage = this.usage || {};
  const restrictions = this.restrictions || {};

  if (usage.userCount >= restrictions.maxUsers) exceeded.users = true;
  if (usage.storageUsed >= restrictions.maxStorage) exceeded.storage = true;
  if (usage.apiCallsThisMonth >= restrictions.maxAPICallsPerMonth) exceeded.apiCalls = true;

  return exceeded;
};

Tenant.prototype.resetMonthlyUsage = function() {
  const usage = this.usage || {};
  usage.apiCallsThisMonth = 0;
  usage.lastResetDate = new Date();
  this.usage = usage;
  this.changed('usage', true);
};

// Static methods
Tenant.findActive = function() {
  return this.findAll({ where: { status: 'active' } });
};

Tenant.findExpiredSubscriptions = function() {
  const { Op } = DataTypes;
  return this.findAll({
    where: {
      'subscription.expiresAt': { [Op.lt]: new Date() },
      'subscription.status': 'active'
    }
  });
};

// Define associations
Tenant.associate = (models) => {
  if (models.Plan) {
    Tenant.belongsTo(models.Plan, {
      foreignKey: 'plan_id',
      as: 'plan'
    });
  }
};

export default Tenant;
