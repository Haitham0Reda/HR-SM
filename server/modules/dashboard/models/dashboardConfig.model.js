import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * DashboardConfig Model
 * 
 * Manages dashboard configuration per tenant
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const DashboardConfig = sequelize.define('DashboardConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Tenant isolation - REQUIRED
  tenant_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'tenant_id'
  },
  
  // Employee of the Month configuration (JSONB)
  employee_of_the_month: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      enabled: true,
      selectedEmployee: null,
      month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      updatedAt: new Date()
    },
    field: 'employee_of_the_month'
    // Structure: { enabled, selectedEmployee, month, updatedAt }
  },
  
  // Dashboard widgets visibility (JSONB)
  widgets: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      todayAttendance: true,
      quickActions: true,
      announcements: true
    }
    // Structure: { todayAttendance, quickActions, announcements }
  },
  
  // Quick action cards configuration (JSONB)
  quick_action_cards: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      attendance: true,
      vacations: true,
      permissions: true,
      forgetCheck: true,
      sickLeave: true,
      profile: true
    },
    field: 'quick_action_cards'
    // Structure: { attendance, vacations, permissions, forgetCheck, sickLeave, profile }
  },
  
  // Last updated by
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'dashboard_configs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['tenant_id']
    }
  ]
});

// Static methods
DashboardConfig.getConfig = async function(tenantId) {
  let config = await this.findOne({
    where: { tenant_id: tenantId }
  });
  
  if (!config) {
    config = await this.create({ tenant_id: tenantId });
  }
  
  return config;
};

DashboardConfig.withTenant = function(tenantId) {
  return this.findAll({
    where: { tenant_id: tenantId }
  });
};

export default DashboardConfig;




