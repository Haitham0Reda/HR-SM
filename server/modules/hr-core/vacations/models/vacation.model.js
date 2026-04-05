/**
 * Vacation Model - PostgreSQL (Sequelize)
 * 
 * This model represents the vacations table in the Main Application Database (hrsm_platform).
 * It manages employee vacation requests with approval workflows and balance tracking.
 * Supports multi-tenancy and complex date calculations excluding weekends.
 * 
 * @module models/Vacation
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';
import Position from '../../users/models/position.model.js';

const Vacation = mainAppDb.define('Vacation', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the vacation request (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Employee reference
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id',
    comment: 'Employee who requested the vacation',
    references: {
      model: User,
      key: 'id'
    }
  },

  // Vacation type
  vacationType: {
    type: DataTypes.ENUM('annual', 'casual', 'sick', 'unpaid'),
    allowNull: false,
    field: 'vacation_type',
    comment: 'Type of vacation'
  },

  // Date range
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date',
    comment: 'Vacation start date'
  },

  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date',
    comment: 'Vacation end date',
    validate: {
      isAfterStartDate(value) {
        if (value && this.startDate && new Date(value) < new Date(this.startDate)) {
          throw new Error('End date must be after or equal to start date');
        }
      }
    }
  },

  // Duration in working days (calculated automatically, excluding weekends)
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in working days (excluding Friday and Saturday)'
  },

  // Reason for vacation
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500]
    },
    comment: 'Reason for the vacation request'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Current status of the vacation request'
  },

  // Approval information
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by_id',
    comment: 'User who approved the vacation',
    references: {
      model: User,
      key: 'id'
    }
  },

  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: 'When the vacation was approved'
  },

  rejectedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'rejected_by_id',
    comment: 'User who rejected the vacation',
    references: {
      model: User,
      key: 'id'
    }
  },

  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'rejected_at',
    comment: 'When the vacation was rejected'
  },

  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
    comment: 'Reason for rejection'
  },

  cancelledById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'cancelled_by_id',
    comment: 'User who cancelled the vacation',
    references: {
      model: User,
      key: 'id'
    }
  },

  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at',
    comment: 'When the vacation was cancelled'
  },

  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancellation_reason',
    comment: 'Reason for cancellation'
  },

  approverNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'approver_notes',
    comment: 'Additional notes from approver'
  },

  // Vacation balance reference
  vacationBalanceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'vacation_balance_id',
    comment: 'Reference to vacation balance record'
  },

  // Denormalized department and position for faster queries
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id',
    comment: 'Employee department (denormalized)',
    references: {
      model: Department,
      key: 'id'
    }
  },

  positionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'position_id',
    comment: 'Employee position (denormalized)',
    references: {
      model: Position,
      key: 'id'
    }
  },

  // Attachments (stored as JSONB)
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of attachment objects with filename, url, uploadedAt'
  },

  // Email notification tracking (stored as JSONB)
  notifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      submitted: { sent: false },
      approved: { sent: false },
      rejected: { sent: false },
      reminder: { sent: false }
    },
    comment: 'Email notification tracking status'
  }
}, {
  tableName: 'vacations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: 'Employee vacation requests with approval workflows',
  
  // Default scope to exclude sensitive data
  defaultScope: {
    attributes: { exclude: [] }
  },

  // Named scopes for common queries
  scopes: {
    pending: {
      where: { status: 'pending' }
    },
    approved: {
      where: { status: 'approved' }
    },
    rejected: {
      where: { status: 'rejected' }
    },
    cancelled: {
      where: { status: 'cancelled' }
    },
    active: function() {
      const now = new Date();
      return {
        where: {
          status: 'approved',
          startDate: { [mainAppDb.Sequelize.Op.lte]: now },
          endDate: { [mainAppDb.Sequelize.Op.gte]: now }
        }
      };
    },
    upcoming: function() {
      const now = new Date();
      return {
        where: {
          status: 'approved',
          startDate: { [mainAppDb.Sequelize.Op.gt]: now }
        }
      };
    }
  },

  // Hooks
  hooks: {
    beforeValidate: async (vacation) => {
      // Automatically calculate duration excluding weekends
      if (vacation.startDate && vacation.endDate) {
        vacation.duration = Vacation.calculateWorkingDays(vacation.startDate, vacation.endDate);
      }
    }
  }
});

// Instance methods

/**
 * Check if vacation is currently active
 */
Vacation.prototype.getIsActive = function() {
  const now = new Date();
  return this.status === 'approved' &&
    new Date(this.startDate) <= now &&
    new Date(this.endDate) >= now;
};

/**
 * Check if vacation is upcoming
 */
Vacation.prototype.getIsUpcoming = function() {
  return this.status === 'approved' && new Date(this.startDate) > new Date();
};

/**
 * Approve vacation
 */
Vacation.prototype.approve = async function(approverId, notes) {
  this.status = 'approved';
  this.approvedById = approverId;
  this.approvedAt = new Date();
  if (notes && typeof notes === 'string') {
    this.approverNotes = notes.trim();
  }
  return await this.save();
};

/**
 * Reject vacation
 */
Vacation.prototype.reject = async function(rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedById = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save({ validate: false });
};

/**
 * Cancel vacation
 */
Vacation.prototype.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledById = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save();
};

// Static methods

/**
 * Calculate working days excluding weekends (Friday and Saturday)
 */
Vacation.calculateWorkingDays = function(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Reset time to start of day for accurate comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 5 = Friday, 6 = Saturday (weekend in Egypt)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
};

/**
 * Get vacations by employee with full details
 */
Vacation.getVacationsByEmployee = async function(employeeId, filters = {}) {
  const where = { employeeId, ...filters };
  
  return await Vacation.findAll({
    where,
    include: [
      {
        association: 'employee',
        attributes: ['firstName', 'lastName', 'email', 'employeeId'],
        include: [
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'position', attributes: ['title'] }
        ]
      },
      { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
      { association: 'rejectedBy', attributes: ['firstName', 'lastName', 'email'] },
      { association: 'cancelledBy', attributes: ['firstName', 'lastName', 'email'] },
      { association: 'department', attributes: ['name', 'code'] },
      { association: 'position', attributes: ['title'] }
    ],
    order: [['startDate', 'DESC']]
  });
};

/**
 * Get pending vacations for approval
 */
Vacation.getPendingVacations = async function(departmentId = null) {
  const where = { status: 'pending' };
  
  if (departmentId) {
    where.departmentId = departmentId;
  }

  return await Vacation.findAll({
    where,
    include: [
      {
        association: 'employee',
        attributes: ['firstName', 'lastName', 'email', 'employeeId'],
        include: [
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'position', attributes: ['title'] }
        ]
      },
      { association: 'department', attributes: ['name', 'code'] }
    ],
    order: [['createdAt', 'ASC']]
  });
};

/**
 * Get active vacations (currently ongoing)
 */
Vacation.getActiveVacations = async function(departmentId = null) {
  const now = new Date();
  const where = {
    status: 'approved',
    startDate: { [mainAppDb.Sequelize.Op.lte]: now },
    endDate: { [mainAppDb.Sequelize.Op.gte]: now }
  };

  if (departmentId) {
    where.departmentId = departmentId;
  }

  return await Vacation.findAll({
    where,
    include: [
      {
        association: 'employee',
        attributes: ['firstName', 'lastName', 'email', 'employeeId'],
        include: [
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'position', attributes: ['title'] }
        ]
      }
    ],
    order: [['endDate', 'ASC']]
  });
};

/**
 * Check for overlapping vacations
 */
Vacation.hasOverlappingVacation = async function(employeeId, startDate, endDate, excludeVacationId = null) {
  const where = {
    employeeId,
    status: { [mainAppDb.Sequelize.Op.in]: ['pending', 'approved'] },
    [mainAppDb.Sequelize.Op.or]: [
      {
        startDate: { [mainAppDb.Sequelize.Op.lte]: endDate },
        endDate: { [mainAppDb.Sequelize.Op.gte]: startDate }
      }
    ]
  };

  if (excludeVacationId) {
    where.id = { [mainAppDb.Sequelize.Op.ne]: excludeVacationId };
  }

  const overlapping = await Vacation.findOne({ where });
  return !!overlapping;
};

// Associations
Vacation.associate = function(models) {
  Vacation.belongsTo(User, { 
    foreignKey: 'employeeId', 
    as: 'employee',
    onDelete: 'CASCADE'
  });
  Vacation.belongsTo(User, { 
    foreignKey: 'approvedById', 
    as: 'approvedBy',
    onDelete: 'SET NULL'
  });
  Vacation.belongsTo(User, { 
    foreignKey: 'rejectedById', 
    as: 'rejectedBy',
    onDelete: 'SET NULL'
  });
  Vacation.belongsTo(User, { 
    foreignKey: 'cancelledById', 
    as: 'cancelledBy',
    onDelete: 'SET NULL'
  });
  Vacation.belongsTo(Department, { 
    foreignKey: 'departmentId', 
    as: 'department',
    onDelete: 'SET NULL'
  });
  Vacation.belongsTo(Position, { 
    foreignKey: 'positionId', 
    as: 'position',
    onDelete: 'SET NULL'
  });
};

export default Vacation;
