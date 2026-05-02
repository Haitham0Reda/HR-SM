/**
 * Forget Check Model - PostgreSQL (Sequelize)
 * 
 * Manages employee requests for forgot check-in or check-out.
 * Allows employees to request manual attendance adjustments when they forget to check in/out.
 * 
 * @module models/ForgetCheck
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';
import Position from '../../users/models/position.model.js';

const ForgetCheck = mainAppDb.define('ForgetCheck', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the forget check request (UUID)'
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
    comment: 'Reference to User (employee)'
  },

  // Date
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date for which check is requested'
  },

  // Request Type
  requestType: {
    type: DataTypes.ENUM('check-in', 'check-out'),
    allowNull: false,
    field: 'request_type',
    comment: 'Type of check request'
  },

  // Requested Time
  requestedTime: {
    type: DataTypes.STRING(5),
    allowNull: false,
    field: 'requested_time',
    validate: {
      is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    comment: 'Requested time in HH:MM format'
  },

  // Reason
  reason: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      len: [10, 500]
    },
    comment: 'Reason for the request'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Request status'
  },

  // Approval
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by_id',
    comment: 'User who approved'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: 'Approval timestamp'
  },

  // Rejection
  rejectedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'rejected_by_id',
    comment: 'User who rejected'
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'rejected_at',
    comment: 'Rejection timestamp'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
    comment: 'Reason for rejection'
  },

  // Department and Position (denormalized)
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id',
    comment: 'Reference to Department'
  },
  positionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'position_id',
    comment: 'Reference to Position'
  }
}, {
  tableName: 'forget_checks',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_forget_checks_tenant_id_employee_id',
      fields: ['tenant_id', 'employee_id']
    },
    {
      name: 'idx_forget_checks_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_forget_checks_tenant_id_employee_id_status',
      fields: ['tenant_id', 'employee_id', 'status']
    },
    {
      name: 'idx_forget_checks_tenant_id_employee_id_date',
      fields: ['tenant_id', 'employee_id', 'date']
    },
    {
      name: 'idx_forget_checks_tenant_id_department_id_status',
      fields: ['tenant_id', 'department_id', 'status']
    },
    {
      name: 'idx_forget_checks_tenant_id_date',
      fields: ['tenant_id', 'date']
    }
  ]
});

// Instance Methods
ForgetCheck.prototype.approve = async function(approverId) {
  this.status = 'approved';
  this.approvedById = approverId;
  this.approvedAt = new Date();
  return await this.save();
};

ForgetCheck.prototype.reject = async function(rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedById = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return await this.save();
};

// Define associations
ForgetCheck.associate = function(models) {
  ForgetCheck.belongsTo(User, { foreignKey: 'employeeId', as: 'employee', onDelete: 'CASCADE' });
  ForgetCheck.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy', onDelete: 'SET NULL' });
  ForgetCheck.belongsTo(User, { foreignKey: 'rejectedById', as: 'rejectedBy', onDelete: 'SET NULL' });
  ForgetCheck.belongsTo(Department, { foreignKey: 'departmentId', as: 'department', onDelete: 'SET NULL' });
  ForgetCheck.belongsTo(Position, { foreignKey: 'positionId', as: 'position', onDelete: 'SET NULL' });
};

export default ForgetCheck;







