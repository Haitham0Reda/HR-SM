/**
 * Payroll Model - PostgreSQL (Sequelize)
 * 
 * This model represents the payroll table in the Main Application Database (hrsm_platform).
 * It tracks employee payroll deductions and calculations.
 * 
 * @module models/Payroll
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import User from '../../hr-core/users/models/user.model.js';

const Payroll = mainAppDb.define('Payroll', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the payroll record (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Employee Reference
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id',
    comment: 'Reference to employee (User)'
  },

  // Period (e.g., '2025-10' for October 2025)
  period: {
    type: DataTypes.STRING(7),
    allowNull: false,
    comment: 'Payroll period in YYYY-MM format'
  },

  // Deductions - stored as JSONB array
  deductions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of deduction items with type, description, and amount (JSONB)'
  },

  // Total Deductions
  totalDeductions: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'total_deductions',
    comment: 'Total deduction amount'
  },

  // Created By
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by_id',
    comment: 'Finance manager who created this payroll record'
  }
}, {
  tableName: 'payrolls',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_payrolls_tenant_id_employee_id_period',
      fields: ['tenant_id', 'employee_id', 'period'],
      unique: true
    },
    {
      name: 'idx_payrolls_tenant_id_period',
      fields: ['tenant_id', 'period']
    },
    {
      name: 'idx_payrolls_tenant_id_created_at',
      fields: ['tenant_id', 'created_at']
    }
  ],

  // Named scopes
  scopes: {
    byPeriod: (period) => {
      return {
        where: { period }
      };
    },
    byEmployee: (employeeId) => {
      return {
        where: { employeeId }
      };
    },
    recent: {
      order: [['createdAt', 'DESC']],
      limit: 10
    }
  }
});

// Define associations
Payroll.belongsTo(User, {
  foreignKey: 'employeeId',
  as: 'employee'
});

User.hasMany(Payroll, {
  foreignKey: 'employeeId',
  as: 'payrolls'
});

// Instance Methods
Payroll.prototype.addDeduction = function(deduction) {
  const deductions = this.deductions || [];
  deductions.push(deduction);
  this.deductions = deductions;
  
  // Recalculate total
  this.totalDeductions = deductions.reduce((sum, d) => sum + parseFloat(d.amount), 0);
};

Payroll.prototype.calculateTotal = function() {
  if (!this.deductions || this.deductions.length === 0) {
    this.totalDeductions = 0;
    return 0;
  }
  
  this.totalDeductions = this.deductions.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  return this.totalDeductions;
};

// Static Methods
Payroll.findByEmployeeAndPeriod = async function(tenantId, employeeId, period) {
  return this.findOne({
    where: { tenantId, employeeId, period }
  });
};

Payroll.findByPeriod = async function(tenantId, period) {
  return this.findAll({
    where: { tenantId, period },
    include: [{
      model: User,
      as: 'employee',
      attributes: ['id', 'employeeId', 'personalInfo']
    }]
  });
};

export default Payroll;
