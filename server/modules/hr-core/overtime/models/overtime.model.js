/**
 * Overtime Model - PostgreSQL (Sequelize)
 * 
 * This model represents the overtime table in the Main Application Database (hrsm_platform).
 * It manages employee overtime requests with approval workflows and compensation tracking.
 * Supports multi-tenancy and time validation.
 * 
 * @module models/Overtime
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';
import Position from '../../users/models/position.model.js';

const Overtime = mainAppDb.define('Overtime', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the overtime request (UUID)'
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
    comment: 'Employee who worked overtime',
    references: {
      model: User,
      key: 'id'
    }
  },

  // Date of overtime
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date when overtime was worked'
  },

  // Start time (HH:MM format)
  startTime: {
    type: DataTypes.STRING(5),
    allowNull: false,
    field: 'start_time',
    comment: 'Start time in HH:MM format (24-hour)',
    validate: {
      isTimeFormat(value) {
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
          throw new Error('Start time must be in HH:MM format (24-hour)');
        }
      }
    }
  },

  // End time (HH:MM format)
  endTime: {
    type: DataTypes.STRING(5),
    allowNull: false,
    field: 'end_time',
    comment: 'End time in HH:MM format (24-hour)',
    validate: {
      isTimeFormat(value) {
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
          throw new Error('End time must be in HH:MM format (24-hour)');
        }
      },
      isAfterStartTime(value) {
        if (value && this.startTime) {
          const [startHour, startMin] = this.startTime.split(':').map(Number);
          const [endHour, endMin] = value.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          if (endMinutes <= startMinutes) {
            throw new Error('End time must be after start time');
          }
        }
      }
    }
  },

  // Duration in hours
  duration: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Duration in hours'
  },

  // Reason for overtime
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 300]
    },
    comment: 'Reason for the overtime'
  },

  // Compensation type
  compensationType: {
    type: DataTypes.ENUM('paid', 'time-off', 'none'),
    allowNull: false,
    field: 'compensation_type',
    comment: 'How the overtime will be compensated'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Current status of the overtime request'
  },

  // Approval information
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by_id',
    comment: 'User who approved the overtime',
    references: {
      model: User,
      key: 'id'
    }
  },

  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: 'When the overtime was approved'
  },

  rejectedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'rejected_by_id',
    comment: 'User who rejected the overtime',
    references: {
      model: User,
      key: 'id'
    }
  },

  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'rejected_at',
    comment: 'When the overtime was rejected'
  },

  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
    comment: 'Reason for rejection'
  },

  approverNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'approver_notes',
    comment: 'Additional notes from approver'
  },

  // Compensation tracking
  compensated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the overtime has been compensated'
  },

  compensatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'compensated_at',
    comment: 'When the overtime was compensated'
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

  // Email notification tracking (stored as JSONB)
  notifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      submitted: { sent: false },
      approved: { sent: false },
      rejected: { sent: false }
    },
    comment: 'Email notification tracking status'
  }
}, {
  tableName: 'overtime',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: 'Employee overtime requests with approval and compensation tracking',

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
    compensated: {
      where: { compensated: true }
    },
    uncompensated: {
      where: { compensated: false }
    }
  }
});

// Instance methods

/**
 * Approve overtime
 */
Overtime.prototype.approve = async function(approverId, notes) {
  this.status = 'approved';
  this.approvedById = approverId;
  this.approvedAt = new Date();
  if (notes && typeof notes === 'string') {
    this.approverNotes = notes.trim();
  }
  return await this.save();
};

/**
 * Reject overtime
 */
Overtime.prototype.reject = async function(rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedById = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save({ validate: false });
};

/**
 * Mark overtime as compensated
 */
Overtime.prototype.markCompensated = async function() {
  this.compensated = true;
  this.compensatedAt = new Date();
  return await this.save();
};

// Static methods

/**
 * Get overtime by employee with full details
 */
Overtime.getOvertimeByEmployee = async function(employeeId, filters = {}) {
  const where = { employeeId, ...filters };
  
  return await Overtime.findAll({
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
      { association: 'department', attributes: ['name', 'code'] },
      { association: 'position', attributes: ['title'] }
    ],
    order: [['date', 'DESC']]
  });
};

/**
 * Get pending overtime for approval
 */
Overtime.getPendingOvertime = async function(departmentId = null) {
  const where = { status: 'pending' };
  
  if (departmentId) {
    where.departmentId = departmentId;
  }

  return await Overtime.findAll({
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
 * Get overtime by date range
 */
Overtime.getOvertimeByDateRange = async function(employeeId, startDate, endDate) {
  const where = {
    employeeId,
    date: {
      [mainAppDb.Sequelize.Op.gte]: startDate,
      [mainAppDb.Sequelize.Op.lte]: endDate
    }
  };

  return await Overtime.findAll({
    where,
    include: [
      { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
      { association: 'rejectedBy', attributes: ['firstName', 'lastName', 'email'] }
    ],
    order: [['date', 'ASC']]
  });
};

// Associations
Overtime.associate = function(models) {
  Overtime.belongsTo(User, { 
    foreignKey: 'employeeId', 
    as: 'employee',
    onDelete: 'CASCADE'
  });
  Overtime.belongsTo(User, { 
    foreignKey: 'approvedById', 
    as: 'approvedBy',
    onDelete: 'SET NULL'
  });
  Overtime.belongsTo(User, { 
    foreignKey: 'rejectedById', 
    as: 'rejectedBy',
    onDelete: 'SET NULL'
  });
  Overtime.belongsTo(Department, { 
    foreignKey: 'departmentId', 
    as: 'department',
    onDelete: 'SET NULL'
  });
  Overtime.belongsTo(Position, { 
    foreignKey: 'positionId', 
    as: 'position',
    onDelete: 'SET NULL'
  });
};

export default Overtime;







