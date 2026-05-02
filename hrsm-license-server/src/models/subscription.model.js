/**
 * Subscription Model - PostgreSQL (Sequelize)
 * 
 * This model represents the subscriptions table in the License Server Database (hrsm-licenses).
 * It stores detailed subscription and billing information for tenants.
 * 
 * @module models/Subscription
 */

import { DataTypes, Op } from 'sequelize';
import licenseServerDb from '../../config/database.js';
import Tenant from './Tenant.js';

const Subscription = licenseServerDb.define('Subscription', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the subscription (UUID)'
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
  
  // Subscription Details
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'expired', 'trial', 'cancelled'),
    allowNull: false,
    defaultValue: 'trial',
    comment: 'Current subscription status'
  },
  plan: {
    type: DataTypes.ENUM('basic', 'professional', 'enterprise', 'unlimited'),
    allowNull: false,
    defaultValue: 'basic',
    comment: 'Subscription plan tier'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'start_date',
    comment: 'Subscription start date'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
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
  
  // Billing Information
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
    comment: 'Currency code (ISO 4217)'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Subscription amount'
  },
  lastPaymentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_payment_date',
    comment: 'Last payment date'
  },
  nextBillingDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_billing_date',
    comment: 'Next billing date'
  },
  
  // Payment Information
  paymentMethod: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_method',
    comment: 'Payment method identifier'
  },
  paymentStatus: {
    type: DataTypes.ENUM('paid', 'pending', 'failed', 'refunded'),
    allowNull: true,
    field: 'payment_status',
    comment: 'Last payment status'
  },
  
  // Additional Metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional subscription metadata (JSONB)'
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_subscriptions_tenant_id',
      fields: ['tenant_id']
    },
    {
      name: 'idx_subscriptions_status',
      fields: ['status']
    },
    {
      name: 'idx_subscriptions_expires_at',
      fields: ['expires_at']
    },
    {
      name: 'idx_subscriptions_next_billing_date',
      fields: ['next_billing_date']
    }
  ],
  
  // Named scopes
  scopes: {
    active: {
      where: { status: 'active' }
    },
    expiring: (days = 30) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      return {
        where: {
          status: 'active',
          expiresAt: {
            [Op.lte]: futureDate,
            [Op.gt]: new Date()
          }
        }
      };
    },
    expired: {
      where: {
        status: 'active',
        expiresAt: {
          [Op.lte]: new Date()
        }
      }
    },
    dueForRenewal: (days = 7) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      return {
        where: {
          autoRenew: true,
          nextBillingDate: {
            [Op.lte]: futureDate,
            [Op.gte]: new Date()
          }
        }
      };
    }
  }
});

// Define associations
Tenant.hasOne(Subscription, {
  foreignKey: 'tenantId',
  as: 'subscription',
  onDelete: 'CASCADE'
});

Subscription.belongsTo(Tenant, {
  foreignKey: 'tenantId',
  as: 'tenant'
});

// Instance Methods
Subscription.prototype.isActive = function() {
  return this.status === 'active' && this.expiresAt > new Date();
};

Subscription.prototype.isExpired = function() {
  return this.expiresAt <= new Date();
};

Subscription.prototype.daysUntilExpiry = function() {
  const now = new Date();
  const diffTime = this.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Subscription.prototype.daysUntilNextBilling = function() {
  if (!this.nextBillingDate) return null;
  const now = new Date();
  const diffTime = this.nextBillingDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Subscription.prototype.renew = async function(newExpiryDate) {
  this.expiresAt = newExpiryDate;
  this.status = 'active';
  
  if (this.billingCycle === 'monthly') {
    const nextBilling = new Date(this.expiresAt);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    this.nextBillingDate = nextBilling;
  } else if (this.billingCycle === 'annual') {
    const nextBilling = new Date(this.expiresAt);
    nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    this.nextBillingDate = nextBilling;
  }
  
  await this.save();
};

Subscription.prototype.cancel = async function() {
  this.status = 'cancelled';
  this.autoRenew = false;
  await this.save();
};

// Static Methods
Subscription.findByTenant = async function(tenantId) {
  return this.findOne({
    where: { tenantId }
  });
};

Subscription.findActive = async function() {
  return this.findAll({
    where: { status: 'active' }
  });
};

Subscription.findExpiring = async function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.findAll({
    where: {
      status: 'active',
      expiresAt: {
        [Op.lte]: futureDate,
        [Op.gt]: new Date()
      }
    },
    include: [{
      model: Tenant,
      as: 'tenant'
    }]
  });
};

export default Subscription;
