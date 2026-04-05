/**
 * Attendance Model - PostgreSQL (Sequelize)
 * 
 * This model represents the attendances table in the Main Application Database (hrsm_platform).
 * It tracks employee attendance including check-in/out times, work hours, and status.
 * 
 * @module models/Attendance
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';

const Attendance = mainAppDb.define('Attendance', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the attendance record (UUID)'
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

  // Department and Position (denormalized for performance)
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id',
    comment: 'Department reference (denormalized)'
  },
  positionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'position_id',
    comment: 'Position reference (denormalized)'
  },

  // Date
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Attendance date'
  },

  // Schedule - stored as JSONB
  schedule: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      startTime: '09:00',
      endTime: '17:00',
      expectedHours: 8
    },
    comment: 'Scheduled work times (JSONB)'
  },

  // Check-in Information - stored as JSONB
  checkIn: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      time: null,
      method: null,
      location: null,
      isLate: false,
      lateMinutes: 0
    },
    field: 'check_in',
    comment: 'Check-in details (JSONB)'
  },

  // Check-out Information - stored as JSONB
  checkOut: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      time: null,
      method: null,
      location: null,
      isEarly: false,
      earlyMinutes: 0
    },
    field: 'check_out',
    comment: 'Check-out details (JSONB)'
  },

  // Source tracking
  source: {
    type: DataTypes.ENUM('biometric', 'cloud', 'mobile', 'qr', 'manual', 'csv', 'system'),
    allowNull: false,
    defaultValue: 'manual',
    comment: 'Source of attendance record'
  },

  // Raw device data
  rawDeviceData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'raw_device_data',
    comment: 'Raw device data for audit trail (JSONB)'
  },

  // Device reference
  deviceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'device_id',
    comment: 'Reference to attendance device'
  },

  // Hours tracking - stored as JSONB
  hours: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      actual: 0,
      expected: 8,
      overtime: 0,
      workFromHome: 0,
      totalHours: 0
    },
    comment: 'Working hours breakdown (JSONB)'
  },

  // Work from home - stored as JSONB
  workFromHome: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      isWFH: false,
      approved: false,
      approvedBy: null,
      reason: null
    },
    field: 'work_from_home',
    comment: 'Work from home details (JSONB)'
  },

  // Status
  status: {
    type: DataTypes.ENUM(
      'on-time',
      'late',
      'present',
      'absent',
      'vacation',
      'sick-leave',
      'mission',
      'work-from-home',
      'half-day',
      'official-holiday',
      'weekend',
      'early-departure',
      'forgot-check-in',
      'forgot-check-out'
    ),
    allowNull: false,
    defaultValue: 'absent',
    comment: 'Attendance status'
  },

  // Leave reference
  leaveId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'leave_id',
    comment: 'Reference to leave record if on leave'
  },

  // Permission requests
  permissionRequests: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: false,
    defaultValue: [],
    field: 'permission_requests',
    comment: 'Array of permission request IDs that affected this record'
  },
  adjustedByPermission: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'adjusted_by_permission',
    comment: 'Whether this record was adjusted by an approved permission'
  },

  // Flags - stored as JSONB
  flags: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      isLate: false,
      isEarlyDeparture: false,
      isMissing: false,
      needsApproval: false
    },
    comment: 'Attendance issue flags (JSONB)'
  },

  // Notes and approvals
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by_id',
    comment: 'User who approved this record'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: 'Approval timestamp'
  },

  // Metadata
  isWorkingDay: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_working_day',
    comment: 'Whether this is a working day (not weekend/holiday)'
  },
  autoGenerated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'auto_generated',
    comment: 'Whether this record was auto-generated'
  }
}, {
  tableName: 'attendances',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_attendances_tenant_id_employee_id_date',
      fields: ['tenant_id', 'employee_id', 'date'],
      unique: true
    },
    {
      name: 'idx_attendances_tenant_id_employee_id_status',
      fields: ['tenant_id', 'employee_id', 'status']
    },
    {
      name: 'idx_attendances_tenant_id_department_id_date',
      fields: ['tenant_id', 'department_id', 'date']
    },
    {
      name: 'idx_attendances_tenant_id_department_id_status',
      fields: ['tenant_id', 'department_id', 'status']
    },
    {
      name: 'idx_attendances_tenant_id_date',
      fields: ['tenant_id', 'date']
    },
    {
      name: 'idx_attendances_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_attendances_tenant_id_adjusted_by_permission',
      fields: ['tenant_id', 'adjusted_by_permission']
    },
    {
      name: 'idx_attendances_tenant_id_leave_id',
      fields: ['tenant_id', 'leave_id']
    },
    {
      name: 'idx_attendances_tenant_id_is_working_day',
      fields: ['tenant_id', 'is_working_day']
    }
  ],

  // Named scopes
  scopes: {
    byDate: (date) => {
      return {
        where: { date }
      };
    },
    byDateRange: (startDate, endDate) => {
      return {
        where: {
          date: {
            [require('sequelize').Op.gte]: startDate,
            [require('sequelize').Op.lte]: endDate
          }
        }
      };
    },
    present: {
      where: {
        status: {
          [require('sequelize').Op.in]: ['on-time', 'late', 'present', 'work-from-home']
        }
      }
    },
    absent: {
      where: { status: 'absent' }
    },
    needsApproval: {
      where: {
        'flags.needsApproval': true
      }
    }
  }
});

// Define associations
Attendance.belongsTo(User, {
  foreignKey: 'employeeId',
  as: 'employee'
});

Attendance.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department'
});

User.hasMany(Attendance, {
  foreignKey: 'employeeId',
  as: 'attendances'
});

// Instance Methods
Attendance.prototype.isOnTime = function() {
  return !this.checkIn?.isLate && this.checkIn?.time !== null;
};

Attendance.prototype.isFullDay = function() {
  return this.hours?.actual >= this.hours?.expected;
};

Attendance.prototype.getTotalWorkingHours = function() {
  return (this.hours?.actual || 0) + (this.hours?.workFromHome || 0);
};

// Static Methods
Attendance.getEmployeeAttendance = async function(employeeId, startDate, endDate) {
  return this.findAll({
    where: {
      employeeId,
      date: {
        [require('sequelize').Op.gte]: startDate,
        [require('sequelize').Op.lte]: endDate
      }
    },
    order: [['date', 'ASC']]
  });
};

Attendance.getCurrentlyPresent = async function(tenantId, departmentId = null) {
  const today = new Date();
  const query = {
    tenantId,
    date: today,
    'checkIn.time': { [require('sequelize').Op.ne]: null }
  };

  if (departmentId) {
    query.departmentId = departmentId;
  }

  return this.findAll({
    where: query,
    include: [{
      model: User,
      as: 'employee',
      attributes: ['id', 'employeeId', 'personalInfo']
    }],
    order: [['checkIn', 'DESC']]
  });
};

export default Attendance;
