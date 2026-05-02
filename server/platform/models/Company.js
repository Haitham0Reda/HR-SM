import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../config/database.js';

/**
 * Company Model (Sequelize)
 * Represents companies in the platform with their module licenses and settings
 */
const Company = mainAppDb.define('Company', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      is: /^[a-z0-9_-]+$/
    }
  },
  databaseName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'database_name'
  },
  adminEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'admin_email',
    validate: {
      isEmail: true
    }
  },
  emailDomain: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'email_domain'
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'trial'),
    defaultValue: 'active'
  },
  subscription: {
    type: DataTypes.JSONB,
    defaultValue: {
      plan: 'trial',
      autoRenew: false
    }
  },
  modules: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      currency: 'USD',
      language: 'en'
    }
  },
  licenseKey: {
    type: DataTypes.STRING(500),
    unique: true,
    allowNull: true,
    field: 'license_key'
  },
  licenseData: {
    type: DataTypes.JSONB,
    defaultValue: null,
    field: 'license_data'
  },
  usage: {
    type: DataTypes.JSONB,
    defaultValue: {
      employees: 0,
      storage: 0,
      apiCalls: 0
    }
  }
}, {
  tableName: 'platform_companies',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['database_name'], unique: true },
    { fields: ['license_key'], unique: true, where: { license_key: { [Op.ne]: null } } },
    { fields: ['status'] }
  ]
});

// Instance methods
Company.prototype.isModuleEnabled = function(moduleKey) {
  const modules = this.modules || {};
  const moduleConfig = modules[moduleKey];
  return moduleConfig && moduleConfig.enabled;
};

Company.prototype.getModuleConfig = function(moduleKey) {
  const modules = this.modules || {};
  return modules[moduleKey] || null;
};

Company.prototype.enableModule = function(moduleKey, tier = 'starter', limits = {}) {
  const modules = this.modules || {};
  modules[moduleKey] = {
    enabled: true,
    tier,
    limits: {
      employees: limits.employees || null,
      devices: limits.devices || null,
      storage: limits.storage || null,
      apiCalls: limits.apiCalls || null
    },
    enabledAt: new Date(),
    disabledAt: null
  };
  this.modules = modules;
  this.changed('modules', true);
};

Company.prototype.disableModule = function(moduleKey) {
  const modules = this.modules || {};
  const moduleConfig = modules[moduleKey];
  if (moduleConfig) {
    moduleConfig.enabled = false;
    moduleConfig.disabledAt = new Date();
    modules[moduleKey] = moduleConfig;
    this.modules = modules;
    this.changed('modules', true);
  }
};

Company.prototype.updateModuleLimits = function(moduleKey, limits) {
  const modules = this.modules || {};
  const moduleConfig = modules[moduleKey];
  if (moduleConfig) {
    moduleConfig.limits = {
      ...moduleConfig.limits,
      ...limits
    };
    modules[moduleKey] = moduleConfig;
    this.modules = modules;
    this.changed('modules', true);
  }
};

Company.prototype.checkModuleLimits = function(moduleKey) {
  const modules = this.modules || {};
  const moduleConfig = modules[moduleKey];
  
  if (!moduleConfig || !moduleConfig.enabled) {
    return { withinLimits: false, reason: 'Module not enabled' };
  }

  const limits = moduleConfig.limits || {};
  const usage = this.usage || {};
  const violations = [];

  if (limits.employees && usage.employees > limits.employees) {
    violations.push(`Employee limit exceeded: ${usage.employees}/${limits.employees}`);
  }

  if (limits.storage && usage.storage > limits.storage) {
    violations.push(`Storage limit exceeded: ${usage.storage}/${limits.storage} bytes`);
  }

  if (limits.apiCalls && usage.apiCalls > limits.apiCalls) {
    violations.push(`API calls limit exceeded: ${usage.apiCalls}/${limits.apiCalls}`);
  }

  return {
    withinLimits: violations.length === 0,
    violations,
    limits,
    usage: {
      employees: usage.employees || 0,
      storage: usage.storage || 0,
      apiCalls: usage.apiCalls || 0
    }
  };
};

Company.prototype.getEnabledModules = function() {
  const modules = this.modules || {};
  return Object.keys(modules).filter(key => modules[key] && modules[key].enabled);
};

Company.prototype.isSubscriptionActive = function() {
  if (this.status !== 'active') return false;
  
  const sub = this.subscription || {};
  const now = new Date();
  return sub.endDate && new Date(sub.endDate) >= now;
};

Company.prototype.getDaysUntilExpiration = function() {
  const sub = this.subscription || {};
  if (!sub.endDate) return null;
  
  const now = new Date();
  const diffTime = new Date(sub.endDate) - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static methods
Company.findByModule = function(moduleKey, enabledOnly = true) {
  const where = {};
  
  if (enabledOnly) {
    where[`modules.${moduleKey}.enabled`] = true;
  }
  
  return this.findAll({ where });
};

Company.findExpiredSubscriptions = function() {
  const now = new Date();
  
  return this.findAll({
    where: {
      'subscription.endDate': { [Op.lt]: now },
      status: { [Op.in]: ['active', 'trial'] }
    }
  });
};

// Define associations
Company.associate = (models) => {
  // Add associations here if needed
};

export default Company;
