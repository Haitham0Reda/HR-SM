/**
 * Attendance Model - PostgreSQL (Sequelize)
 * 
 * Core attendance tracking system with comprehensive features:
 * - Check-in/check-out tracking
 * - Late arrival and early departure detection
 * - Work from home support
 * - Leave integration
 * - Permission request linkage
 * - Holiday and weekend handling
 * - Multiple attendance sources (biometric, manual, cloud, etc.)
 * 
 * @module models/Attendance
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

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
    comment: 'Reference to User (employee)'
  },

  // Department and Position (denormalized for faster queries)
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
  },

  // Date
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Attendance date'
  },

  // Scheduled work times - stored as JSONB
  schedule: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      startTime: '09:00',
      endTime: '17:00',
      expectedHours: 8
    },
    comment: 'Scheduled work times'
  },

  // Check-in information - stored as JSONB
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
    comment: 'Check-in information'
  },

  // Attendance source
  source: {
    type: DataTypes.ENUM('biometric', 'cloud', 'mobile', 'qr', 'manual', 'csv', 'system'),
    allowNull: false,
    defaultValue: 'manual',
    comment: 'Attendance source'
  },

  // Raw device data for audit trail - stored as JSONB
  rawDeviceData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'raw_device_data',
    comment: 'Raw device data for audit trail'
  },

  // Reference to the device
  deviceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'device_id',
    comment: 'Reference to AttendanceDevice'
  },

  // Check-out information - stored as JSONB
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
    comment: 'Check-out information'
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
    comment: 'Hours tracking'
  },

  // Work from home tracking - stored as JSONB
  workFromHome: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      isWFH: false,
      approved: false,
      approvedBy: null,
      reason: null
    },
    field: 'work_from_home',
    comment: 'Work from home tracking'
  },

  // Attendance status
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
    comment: 'Reference to Leave'
  },

  // Permission requests - stored as array of UUIDs
  permissionRequests: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: false,
    defaultValue: [],
    field: 'permission_requests',
    comment: 'Array of permission request UUIDs'
  },

  // Adjusted by permission flag
  adjustedByPermission: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'adjusted_by_permission',
    comment: 'Whether adjusted by permission request'
  },

  // Flags for attendance issues - stored as JSONB
  flags: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      isLate: false,
      isEarlyDeparture: false,
      isMissing: false,
      needsApproval: false
    },
    comment: 'Attendance issue flags'
  },

  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes'
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

  // Metadata
  isWorkingDay: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_working_day',
    comment: 'Whether it is a working day'
  },
  autoGenerated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'auto_generated',
    comment: 'Whether auto-generated (e.g., for leaves)'
  }
}, {
  tableName: 'attendance',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_attendance_tenant_id_employee_id_date',
      fields: ['tenant_id', 'employee_id', 'date'],
      unique: true
    },
    {
      name: 'idx_attendance_tenant_id_employee_id_status',
      fields: ['tenant_id', 'employee_id', 'status']
    },
    {
      name: 'idx_attendance_tenant_id_department_id_date',
      fields: ['tenant_id', 'department_id', 'date']
    },
    {
      name: 'idx_attendance_tenant_id_department_id_status',
      fields: ['tenant_id', 'department_id', 'status']
    },
    {
      name: 'idx_attendance_tenant_id_date',
      fields: ['tenant_id', 'date']
    },
    {
      name: 'idx_attendance_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_attendance_tenant_id_adjusted_by_permission',
      fields: ['tenant_id', 'adjusted_by_permission']
    },
    {
      name: 'idx_attendance_tenant_id_leave_id',
      fields: ['tenant_id', 'leave_id']
    },
    {
      name: 'idx_attendance_tenant_id_is_working_day',
      fields: ['tenant_id', 'is_working_day']
    },
    {
      name: 'idx_attendance_source',
      fields: ['source']
    }
  ]
});

// Virtual properties
Attendance.prototype.getTotalWorkingHours = function() {
  return (this.hours?.actual || 0) + (this.hours?.workFromHome || 0);
};

Attendance.prototype.isOnTime = function() {
  return !this.checkIn?.isLate && this.checkIn?.time !== null;
};

Attendance.prototype.isFullDay = function() {
  return (this.hours?.actual || 0) >= (this.hours?.expected || 8);
};

// Instance Methods
Attendance.prototype.markAsLeave = async function(leave) {
  this.leaveId = leave.id;
  this.autoGenerated = true;
  this.isWorkingDay = leave.leaveType !== 'mission';

  switch (leave.leaveType) {
    case 'annual':
    case 'casual':
      this.status = 'vacation';
      break;
    case 'sick':
      this.status = 'sick-leave';
      break;
    case 'mission':
      this.status = 'mission';
      this.hours = {
        ...this.hours,
        actual: this.schedule.expectedHours,
        totalHours: this.schedule.expectedHours
      };
      break;
    default:
      this.status = 'vacation';
  }

  return await this.save();
};

Attendance.prototype.recordCheckIn = async function(method = 'biometric', location = 'office') {
  this.checkIn = {
    ...this.checkIn,
    time: new Date(),
    method,
    location
  };

  if (location === 'home') {
    this.workFromHome = {
      ...this.workFromHome,
      isWFH: true
    };
  }

  return await this.save();
};

Attendance.prototype.recordCheckOut = async function(method = 'biometric', location = 'office') {
  this.checkOut = {
    ...this.checkOut,
    time: new Date(),
    method,
    location
  };

  return await this.save();
};

// Static Methods
Attendance.getEmployeeAttendance = function(tenantId, employeeId, startDate, endDate) {
  return this.findAll({
    where: {
      tenantId,
      employeeId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    },
    order: [['date', 'ASC']]
  });
};

Attendance.getEmployeeMetrics = async function(tenantId, employeeId, startDate, endDate) {
  const attendance = await this.findAll({
    where: {
      tenantId,
      employeeId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    },
    raw: true
  });

  const metrics = {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    earlyDepartureDays: 0,
    vacationDays: 0,
    sickLeaveDays: 0,
    missionDays: 0,
    workFromHomeDays: 0,
    expectedHours: 0,
    actualHours: 0,
    workFromHomeHours: 0,
    totalHours: 0,
    overtimeHours: 0
  };

  attendance.forEach(record => {
    if (record.is_working_day) {
      metrics.workingDays++;
      metrics.expectedHours += record.hours?.expected || 0;
    }

    metrics.actualHours += record.hours?.actual || 0;
    metrics.workFromHomeHours += record.hours?.workFromHome || 0;
    metrics.totalHours += record.hours?.totalHours || 0;
    metrics.overtimeHours += record.hours?.overtime || 0;

    switch (record.status) {
      case 'on-time':
      case 'present':
        metrics.presentDays++;
        break;
      case 'late':
        metrics.presentDays++;
        metrics.lateDays++;
        break;
      case 'early-departure':
        metrics.presentDays++;
        metrics.earlyDepartureDays++;
        break;
      case 'absent':
      case 'forgot-check-in':
      case 'forgot-check-out':
        if (record.is_working_day) {
          metrics.absentDays++;
        }
        break;
      case 'vacation':
        metrics.vacationDays++;
        break;
      case 'sick-leave':
        metrics.sickLeaveDays++;
        break;
      case 'mission':
        metrics.missionDays++;
        metrics.presentDays++;
        break;
      case 'work-from-home':
        metrics.workFromHomeDays++;
        metrics.presentDays++;
        break;
    }
  });

  return metrics;
};

Attendance.getDepartmentSummary = async function(tenantId, departmentId, date) {
  const records = await this.findAll({
    where: {
      tenantId,
      departmentId,
      date
    },
    attributes: [
      'status',
      [mainAppDb.fn('COUNT', mainAppDb.col('id')), 'count'],
      [mainAppDb.fn('SUM', mainAppDb.literal("(hours->>'totalHours')::numeric")), 'totalHours']
    ],
    group: ['status'],
    raw: true
  });

  return records.map(r => ({
    _id: r.status,
    count: parseInt(r.count),
    totalHours: parseFloat(r.totalHours) || 0
  }));
};

Attendance.createFromLeave = async function(leave) {
  const records = [];
  const startDate = new Date(leave.startDate);
  const endDate = new Date(leave.endDate);

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const attendanceDate = new Date(date);

    let attendance = await this.findOne({
      where: {
        employeeId: leave.employeeId,
        date: attendanceDate
      }
    });

    if (!attendance) {
      attendance = await this.create({
        tenantId: leave.tenantId,
        employeeId: leave.employeeId,
        departmentId: leave.departmentId,
        positionId: leave.positionId,
        date: attendanceDate
      });
    }

    await attendance.markAsLeave(leave);
    records.push(attendance);
  }

  return records;
};

Attendance.getCurrentlyPresent = function(tenantId, departmentId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    tenantId,
    date: today
    // Note: JSONB field querying would need special handling
  };

  if (departmentId) {
    where.departmentId = departmentId;
  }

  return this.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });
};

export default Attendance;
