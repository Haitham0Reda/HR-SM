import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

/**
 * Subscription Plan Model (Sequelize)
 * Defines pricing tiers and included modules
 */
const Plan = mainAppDb.define('Plan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'display_name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tier: {
    type: DataTypes.ENUM('free', 'basic', 'professional', 'enterprise'),
    allowNull: false
  },
  pricing: {
    type: DataTypes.JSONB,
    defaultValue: {
      monthly: 0,
      yearly: 0,
      currency: 'USD',
      trialDays: 14
    }
  },
  includedModules: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'included_modules'
  },
  limits: {
    type: DataTypes.JSONB,
    defaultValue: {
      maxUsers: 1,
      maxStorage: 0,
      apiCallsPerMonth: 0
    }
  },
  features: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_public'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'plans',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['tier', 'is_active'] },
    { fields: ['is_active', 'is_public'] },
    { fields: ['sort_order'] }
  ]
});

// Instance methods
Plan.prototype.includesModule = function(moduleId) {
  const modules = this.includedModules || [];
  const module = modules.find(m => m.moduleId === moduleId);
  return module && module.included;
};

Plan.prototype.getModulePrice = function(moduleId) {
  const modules = this.includedModules || [];
  const module = modules.find(m => m.moduleId === moduleId);
  if (!module) return null;
  return module.included ? 0 : module.addOnPrice;
};

Plan.prototype.getIncludedModuleIds = function() {
  const modules = this.includedModules || [];
  return modules.filter(m => m.included).map(m => m.moduleId);
};

Plan.prototype.getYearlySavings = function() {
  const pricing = this.pricing || {};
  const monthlyTotal = (pricing.monthly || 0) * 12;
  return monthlyTotal - (pricing.yearly || 0);
};

Plan.prototype.getYearlySavingsPercentage = function() {
  const pricing = this.pricing || {};
  const monthlyTotal = (pricing.monthly || 0) * 12;
  if (monthlyTotal === 0) return 0;
  return ((monthlyTotal - (pricing.yearly || 0)) / monthlyTotal) * 100;
};

// Static methods
Plan.findActive = function() {
  return this.findAll({
    where: { is_active: true },
    order: [['sort_order', 'ASC'], ['tier', 'ASC']]
  });
};

Plan.findPublic = function() {
  return this.findAll({
    where: { is_active: true, is_public: true },
    order: [['sort_order', 'ASC']]
  });
};

Plan.findByTier = function(tier) {
  return this.findOne({
    where: { tier, is_active: true }
  });
};

// Define associations
Plan.associate = (models) => {
  if (models.Tenant) {
    Plan.hasMany(models.Tenant, {
      foreignKey: 'plan_id',
      as: 'tenants'
    });
  }
};

export default Plan;
