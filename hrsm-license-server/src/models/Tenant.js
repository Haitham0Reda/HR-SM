import { DataTypes, Model, Op } from 'sequelize';
import { licenseServerDb as sequelize } from '../../config/database.js';

/**
 * Tenant Model - License Server Database (Sequelize)
 *
 * Subscription state lives in flat columns on this table (subscriptionStatus,
 * subscriptionPlan, subscriptionStartDate, subscriptionExpiresAt, billingCycle,
 * autoRenew). The separate `Subscription` model (subscriptions table) is the
 * detailed billing-history record; queries that need a single current
 * subscription value should read these flat columns rather than joining.
 */
class Tenant extends Model {
  isActive() {
    return this.status === 'active' && this.subscriptionStatus === 'active';
  }

  isExpired() {
    if (!this.subscriptionExpiresAt) return null;
    return this.subscriptionExpiresAt <= new Date();
  }

  daysUntilExpiry() {
    if (!this.subscriptionExpiresAt) return null;
    const now = new Date();
    const diffTime = this.subscriptionExpiresAt - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  hasModule(moduleId) {
    return this.enabledModules.includes(moduleId);
  }

  async enableModule(moduleId) {
    if (!this.hasModule(moduleId)) {
      this.enabledModules.push(moduleId);
      this.changed('enabledModules', true);
      await this.save();
    }
  }

  async disableModule(moduleId) {
    this.enabledModules = this.enabledModules.filter(m => m !== moduleId);
    this.changed('enabledModules', true);
    await this.save();
  }

  async softDelete() {
    this.status = 'deleted';
    this.deletedAt = new Date();
    await this.save();
  }

  static async findByTenantId(tenantId) {
    return this.findOne({
      where: {
        tenantId,
        status: { [Op.ne]: 'deleted' }
      }
    });
  }

  static async findActive() {
    return this.findAll({
      where: {
        status: 'active',
        subscriptionStatus: 'active'
      }
    });
  }

  static async findExpiring(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.findAll({
      where: {
        status: 'active',
        subscriptionExpiresAt: {
          [Op.lte]: futureDate,
          [Op.gt]: new Date()
        }
      }
    });
  }
}

Tenant.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'tenant_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'contact_email',
    validate: { isEmail: true }
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'contact_phone'
  },

  // Flat subscription columns (canonical state — match the actual DB schema)
  subscriptionStatus: {
    type: DataTypes.ENUM('active', 'suspended', 'expired', 'trial', 'cancelled'),
    allowNull: false,
    defaultValue: 'trial',
    field: 'subscription_status'
  },
  subscriptionPlan: {
    type: DataTypes.ENUM('basic', 'professional', 'enterprise', 'unlimited'),
    allowNull: false,
    defaultValue: 'basic',
    field: 'subscription_plan'
  },
  subscriptionStartDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'subscription_start_date'
  },
  subscriptionExpiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    field: 'subscription_expires_at'
  },
  billingCycle: {
    type: DataTypes.ENUM('monthly', 'annual'),
    allowNull: false,
    defaultValue: 'monthly',
    field: 'billing_cycle'
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'auto_renew'
  },

  enabledModules: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    field: 'enabled_modules'
  },
  usageLimits: {
    type: DataTypes.JSONB,
    defaultValue: { maxUsers: 10, maxStorage: 5, maxApiCalls: 10000 },
    field: 'usage_limits'
  },
  billing: {
    type: DataTypes.JSONB,
    defaultValue: { currency: 'USD', amount: 0, lastPaymentDate: null, nextBillingDate: null }
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: { industry: null, companySize: null, country: null, timezone: 'UTC' }
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'deleted'),
    defaultValue: 'active'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  }
}, {
  sequelize,
  modelName: 'Tenant',
  tableName: 'tenants',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'], unique: true },
    { fields: ['tenant_id', 'status'] },
    { fields: ['domain'] },
    { fields: ['status'] }
  ]
});

export default Tenant;
