/**
 * Enabled Modules Model - PostgreSQL (Sequelize)
 * 
 * This model represents the enabled_modules table in the License Server Database (hrsm-licenses).
 * It tracks which modules are enabled for each tenant with a many-to-many relationship.
 * 
 * @module models/EnabledModule
 */

import { DataTypes } from 'sequelize';
import { licenseServerDb } from '../../config/database.js';
import Tenant from './tenant.model.js';

const EnabledModule = licenseServerDb.define('EnabledModule', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the enabled module record (UUID)'
  },

  // Foreign Key to Tenant
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: {
      model: Tenant,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Reference to the tenant'
  },
  
  // Module Information
  moduleId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'module_id',
    comment: 'Module identifier (e.g., hr-core, attendance, payroll)'
  },
  moduleName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'module_name',
    comment: 'Human-readable module name'
  },
  tier: {
    type: DataTypes.ENUM('basic', 'standard', 'premium'),
    allowNull: false,
    defaultValue: 'basic',
    comment: 'Module tier/level'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the module is currently enabled'
  },
  
  // Configuration - stored as JSONB for flexibility
  configuration: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Module-specific configuration settings (JSONB)'
  },
  
  // Activation Details
  activatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'activated_at',
    comment: 'Date when the module was activated'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at',
    comment: 'Optional expiration date for the module'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata about the module enablement (JSONB)'
  }
}, {
  tableName: 'enabled_modules',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_enabled_modules_tenant_id_module_id',
      fields: ['tenant_id', 'module_id'],
      unique: true,
      comment: 'Composite unique index to prevent duplicate module assignments'
    },
    {
      name: 'idx_enabled_modules_tenant_id',
      fields: ['tenant_id']
    },
    {
      name: 'idx_enabled_modules_module_id',
      fields: ['module_id']
    },
    {
      name: 'idx_enabled_modules_enabled',
      fields: ['enabled']
    }
  ],
  
  // Named scopes
  scopes: {
    active: {
      where: { enabled: true }
    },
    byModule: (moduleId) => {
      return {
        where: { moduleId }
      };
    },
    expiring: (days = 30) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      return {
        where: {
          enabled: true,
          expiresAt: {
            [require('sequelize').Op.lte]: futureDate,
            [require('sequelize').Op.gt]: new Date()
          }
        }
      };
    }
  }
});

// Define associations
Tenant.hasMany(EnabledModule, {
  foreignKey: 'tenantId',
  as: 'enabledModules',
  onDelete: 'CASCADE'
});

EnabledModule.belongsTo(Tenant, {
  foreignKey: 'tenantId',
  as: 'tenant'
});

// Instance Methods
EnabledModule.prototype.activate = async function() {
  this.enabled = true;
  this.activatedAt = new Date();
  await this.save();
};

EnabledModule.prototype.deactivate = async function() {
  this.enabled = false;
  await this.save();
};

EnabledModule.prototype.isExpired = function() {
  if (!this.expiresAt) return false;
  return this.expiresAt <= new Date();
};

EnabledModule.prototype.daysUntilExpiry = function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const diffTime = this.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static Methods
EnabledModule.findByTenantAndModule = async function(tenantId, moduleId) {
  return this.findOne({
    where: { 
      tenantId, 
      moduleId,
      enabled: true 
    }
  });
};

EnabledModule.findByTenant = async function(tenantId) {
  return this.findAll({
    where: { 
      tenantId,
      enabled: true 
    },
    include: [{
      model: Tenant,
      as: 'tenant'
    }]
  });
};

EnabledModule.findByModule = async function(moduleId) {
  return this.findAll({
    where: { 
      moduleId,
      enabled: true 
    },
    include: [{
      model: Tenant,
      as: 'tenant'
    }]
  });
};

EnabledModule.enableForTenant = async function(tenantId, moduleId, moduleName, tier = 'basic', configuration = {}) {
  const [enabledModule, created] = await this.findOrCreate({
    where: { tenantId, moduleId },
    defaults: {
      moduleName,
      tier,
      enabled: true,
      configuration,
      activatedAt: new Date()
    }
  });
  
  if (!created) {
    enabledModule.enabled = true;
    enabledModule.tier = tier;
    enabledModule.configuration = configuration;
    enabledModule.activatedAt = new Date();
    await enabledModule.save();
  }
  
  return enabledModule;
};

EnabledModule.disableForTenant = async function(tenantId, moduleId) {
  const enabledModule = await this.findOne({
    where: { tenantId, moduleId }
  });
  
  if (enabledModule) {
    enabledModule.enabled = false;
    await enabledModule.save();
  }
  
  return enabledModule;
};

export default EnabledModule;
