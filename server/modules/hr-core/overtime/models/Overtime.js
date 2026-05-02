/**
 * Overtime Model - PostgreSQL (Sequelize)
 * 
 * Manages employee overtime tracking and payment.
 * Tracks overtime hours, approval status, and payment status.
 * 
 * @module models/Overtime
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const Overtime = mainAppDb.define('Overtime', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the overtime record (UUID)'
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

  // Department Reference
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id',
    comment: 'Reference to Department'
  },

  // Date
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Overtime date'
  },

  // Hours
  hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Overtime hours'
  },

  // Reason
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Reason for overtime'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'paid'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Overtime status'
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
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
    comment: 'Reason for rejection'
  },

  // Payment Status
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'paid', 'processing'),
    allowNull: false,
    defaultValue: 'unpaid',
    field: 'payment_status',
    comment: 'Payment status'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_at',
    comment: 'Payment timestamp'
  },

  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  }
}, {
  tableName: 'overtime',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_overtime_tenant_id_employee_id',
      fields: ['tenant_id', 'employee_id']
    },
    {
      name: 'idx_overtime_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_overtime_tenant_id_employee_id_status',
      fields: ['tenant_id', 'employee_id', 'status']
    },
    {
      name: 'idx_overtime_tenant_id_date',
      fields: ['tenant_id', 'date']
    },
    {
      name: 'idx_overtime_tenant_id_payment_status',
      fields: ['tenant_id', 'payment_status']
    }
  ]
});

// Instance Methods
Overtime.prototype.approve = async function(approverId) {
  this.status = 'approved';
  this.approvedById = approverId;
  this.approvedAt = new Date();
  return await this.save();
};

Overtime.prototype.reject = async function(reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  return await this.save();
};

Overtime.prototype.markAsPaid = async function() {
  this.status = 'paid';
  this.paymentStatus = 'paid';
  this.paidAt = new Date();
  return await this.save();
};

// Static Methods
Overtime.getEmployeeOvertime = function(tenantId, employeeId, startDate, endDate) {
  return this.findAll({
    where: {
      tenantId,
      employeeId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    },
    order: [['date', 'DESC']]
  });
};

Overtime.getPendingApprovals = function(tenantId, departmentId = null) {
  const where = { tenantId, status: 'pending' };
  if (departmentId) {
    where.departmentId = departmentId;
  }
  return this.findAll({
    where,
    order: [['date', 'ASC']]
  });
};

Overtime.getUnpaidOvertime = function(tenantId) {
  return this.findAll({
    where: {
      tenantId,
      status: 'approved',
      paymentStatus: 'unpaid'
    },
    order: [['date', 'ASC']]
  });
};

Overtime.getTotalHours = async function(tenantId, employeeId, startDate, endDate) {
  const result = await this.findAll({
    where: {
      tenantId,
      employeeId,
      status: 'approved',
      date: {
        [Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      [mainAppDb.fn('SUM', mainAppDb.col('hours')), 'totalHours']
    ],
    raw: true
  });

  return parseFloat(result[0]?.totalHours) || 0;
};

export default Overtime;
