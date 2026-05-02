/**
 * Tenant Config Model - PostgreSQL (Sequelize)
 * 
 * Manages tenant-specific configuration including modules, subscription, and license.
 * 
 * @module models/TenantConfig
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const TenantConfig = mainAppDb.define('TenantConfig', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the tenant config (UUID)'
  },

  // Tenant ID
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'tenant_id',
    comment: 'Tenant identifier'
  },

  // Company Name
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'company_name',
    comment: 'Company name'
  },

  // Deployment Mode
  deploymentMode: {
    type: DataTypes.ENUM('saas', 'on-premise'),
    allowNull: false,
    defaultValue: 'saas',
    field: 'deployment_mode',
    comment: 'Deployment mode'
  },

  // Modules - stored as JSONB
  modules: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      'hr-core': { enabled: true, enabledAt: new Date() }
    },
    comment: 'Module configuration map'
  },

  // Subscription - stored as JSONB
  subscription: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      plan: 'free',
      status: 'active',
      startDate: null,
      endDate: null,
      maxEmployees: 10
    },
    comment: 'Subscription details'
  },

  // License - stored as JSONB
  license: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'License information'
  },

  // Settings - stored as JSONB
  settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      currency: 'USD',
      language: 'en'
    },
    comment: 'Tenant settings'
  }
}, {
  tableName: 'tenant_configs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_tenant_configs_tenant_id',
      fields: ['tenant_id'],
      unique: true
    }
  ]
});

// Instance Methods
TenantConfig.prototype.isModuleEnabled = function(moduleName) {
  if (moduleName === 'hr-core') return true;
  return this.modules[moduleName]?.enabled || false;
};

TenantConfig.prototype.enableModule = function(moduleName) {
  const modules = { ...this.modules };
  modules[moduleName] = {
    enabled: true,
    enabledAt: new Date()
  };
  this.modules = modules;
};

TenantConfig.prototype.disableModule = function(moduleName) {
  if (moduleName === 'hr-core') {
    throw new Error('Cannot disable HR Core module');
  }

  const modules = { ...this.modules };
  if (modules[moduleName]) {
    modules[moduleName].enabled = false;
    modules[moduleName].disabledAt = new Date();
    this.modules = modules;
  }
};

TenantConfig.prototype.validateLicense = function() {
  if (this.deploymentMode !== 'on-premise') return true;

  if (!this.license || !this.license.key) {
    return false;
  }

  if (this.license.expiresAt && new Date() > new Date(this.license.expiresAt)) {
    return false;
  }

  return true;
};

// Static Methods
TenantConfig.getByTenantId = function(tenantId) {
  return this.findOne({ where: { tenantId } });
};

TenantConfig.getOrCreate = async function(tenantId, companyName) {
  const [config] = await this.findOrCreate({
    where: { tenantId },
    defaults: {
      tenantId,
      companyName,
      deploymentMode: 'saas',
      modules: {
        'hr-core': { enabled: true, enabledAt: new Date() }
      },
      subscription: {
        plan: 'free',
        status: 'active',
        maxEmployees: 10
      },
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        currency: 'USD',
        language: 'en'
      }
    }
  });
  return config;
};

export default TenantConfig;
