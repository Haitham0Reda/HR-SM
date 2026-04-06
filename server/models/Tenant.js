/**
 * Tenant Model - Sequelize (PostgreSQL)
 * 
 * This is a wrapper that imports the Tenant model from the License Server.
 * The Tenant model is stored in the License Server Database (hrsm-licenses).
 * 
 * This wrapper provides a consistent import path for the main application.
 * 
 * @module models/Tenant
 */

import { DataTypes } from 'sequelize';
import { licenseServerDb } from '../config/database.js';

const Tenant = licenseServerDb.define('Tenant', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the tenant (UUID)'
  },

  // Tenant Identification
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'tenant_id',
    comment: 'Unique tenant identifier'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Tenant/Company name'
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Tenant domain for identification'
  },
  contactEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'contact_email',
    validate: {
      isEmail: true
    },
    comment: 'Primary contact email'
  },
  contactPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'contact_phone',
    comment: 'Contact phone number'
  },
  
  // Subscription Status (denormalized for quick access)
  subscriptionStatus: {
    type: DataTypes.ENUM('active', 'suspended', 'expired', 'trial'),
    allowNull: false,
    defaultValue: 'trial',
    field: 'subscription_status',
    comment: 'Current subscription status'
  },
  subscriptionPlan: {
    type: DataTypes.ENUM('basic', 'professional', 'enterprise', 'unlimited'),
    allowNull: false,
    defaultValue: 'basic',
    field: 'subscription_plan',
    comment: 'Subscription plan tier'
  },
  subscriptionStartDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'subscription_start_date',
    comment: 'Subscription start date'
  },
  subscriptionExpiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'subscription_expires_at',
    comment: 'Subscription expiration date'
  },
  billingCycle: {
    type: DataTypes.ENUM('monthly', 'annual'),
    allowNull: false,
    defaultValue: 'monthly',
    field: 'billing_cycle',
    comment: 'Billing frequency'
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'auto_renew',
    comment: 'Auto-renewal flag'
  },
  
  // Enabled Modules - stored as JSONB array for flexibility
  enabledModules: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'enabled_modules',
    comment: 'Array of enabled module IDs (JSONB)'
  },
  
  // Usage Limits - stored as JSONB
  usageLimits: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      maxUsers: 10,
      maxStorage: 5,
      maxApiCalls: 10000
    },
    field: 'usage_limits',
    comment: 'Usage limits configuration (JSONB)'
  },
  
  // Billing Information - stored as JSONB
  billing: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      currency: 'USD',
      amount: 0,
      lastPaymentDate: null,
      nextBillingDate: null
    },
    comment: 'Billing information (JSONB)'
  },
  
  // Metadata - stored as JSONB
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata including industry, company size, country, timezone (JSONB)'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'deleted'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Tenant status'
  },
  
  // Soft Delete
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at',
    comment: 'Soft delete timestamp'
  }
}, {
  tableName: 'tenants',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true, // Enable soft deletes
  
  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_tenants_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_tenants_domain',
      fields: ['domain']
    },
    {
      name: 'idx_tenants_subscription_status',
      fields: ['subscription_status']
    },
    {
      name: 'idx_tenants_subscription_expires_at',
      fields: ['subscription_expires_at']
    },
    {
      name: 'idx_tenants_status',
      fields: ['status']
    }
  ],
  
  // Named scopes
  scopes: {
    active: {
      where: { 
        status: 'active',
        subscriptionStatus: 'active'
      }
    },
    expiring: (days = 30) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      return {
        where: {
          status: 'active',
          subscriptionExpiresAt: {
            [DataTypes.Op.lte]: futureDate,
            [DataTypes.Op.gt]: new Date()
          }
        }
      };
    },
    expired: {
      where: {
        subscriptionExpiresAt: {
          [DataTypes.Op.lte]: new Date()
        }
      }
    },
    withModule: (moduleId) => {
      return {
        where: {
          enabledModules: {
            [DataTypes.Op.contains]: [moduleId]
          }
        }
      };
    }
  }
});

// Instance Methods
Tenant.prototype.isActive = function() {
  return this.status === 'active' && this.subscriptionStatus === 'active';
};

Tenant.prototype.isExpired = function() {
  return this.subscriptionExpiresAt <= new Date();
};

Tenant.prototype.daysUntilExpiry = function() {
  const now = new Date();
  const diffTime = this.subscriptionExpiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Tenant.prototype.hasModule = function(moduleId) {
  return this.enabledModules.includes(moduleId);
};

Tenant.prototype.enableModule = async function(moduleId) {
  if (!this.hasModule(moduleId)) {
    this.enabledModules.push(moduleId);
    await this.save();
  }
};

Tenant.prototype.disableModule = async function(moduleId) {
  this.enabledModules = this.enabledModules.filter(m => m !== moduleId);
  await this.save();
};

Tenant.prototype.softDelete = async function() {
  this.status = 'deleted';
  this.deletedAt = new Date();
  await this.save();
};

// Backward compatibility methods for Mongoose-style API
Tenant.prototype.isModuleEnabled = function(moduleId) {
  return this.hasModule(moduleId);
};

Tenant.prototype.hasActiveSubscription = function() {
  return this.isActive();
};

// Static Methods
Tenant.findByTenantId = async function(tenantId) {
  return this.findOne({
    where: { 
      tenantId, 
      status: { [DataTypes.Op.ne]: 'deleted' } 
    }
  });
};

Tenant.findActive = async function() {
  return this.findAll({
    where: { 
      status: 'active', 
      subscriptionStatus: 'active' 
    }
  });
};

Tenant.findExpiring = async function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.findAll({
    where: {
      status: 'active',
      subscriptionExpiresAt: {
        [DataTypes.Op.lte]: futureDate,
        [DataTypes.Op.gt]: new Date()
      }
    }
  });
};

export default Tenant;
