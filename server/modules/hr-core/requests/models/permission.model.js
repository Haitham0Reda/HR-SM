/**
 * Permission Request Model - PostgreSQL (Sequelize)
 * 
 * Manages employee permission requests for schedule deviations.
 * Handles late arrival, early departure, and overtime requests.
 * 
 * Features:
 * - Three permission types: late arrival, early departure, overtime
 * - Supervisor approval workflow
 * - Automatic attendance record adjustment on approval
 * - Email notification tracking
 * - Time duration calculation
 * 
 * @module models/Permission
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const Permission = mainAppDb.define('Permission', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the permission request (UUID)'
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

  // Permission Type
  permissionType: {
    type: DataTypes.ENUM('late-arrival', 'early-departure', 'overtime'),
    allowNull: false,
    field: 'permission_type',
    comment: 'Type of permission request'
  },

  // Date for which permission is requested
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date for which permission is requested'
  },

  // Time-related fields - stored as JSONB
  time: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Time details (scheduled, requested, duration)'
  },

  // Reason for the permission request
  reason: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Reason for the permission request'
  },

  // Request status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Request status'
  },

  // Approval information - stored as JSONB
  approval: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      reviewedBy: null,
      reviewedAt: null,
      comments: null
    },
    comment: 'Approval details'
  },

  // Rejection information - stored as JSONB
  rejection: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      reason: null,
      rejectedAt: null
    },
    comment: 'Rejection details'
  },

  // Cancellation information - stored as JSONB
  cancellation: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      cancelledBy: null,
      reason: null,
      cancelledAt: null
    },
    comment: 'Cancellation details'
  },

  // Attendance record reference
  attendanceRecordId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'attendance_record_id',
    comment: 'Reference to Attendance record'
  },

  // Flag indicating if attendance has been adjusted
  attendanceAdjusted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'attendance_adjusted',
    comment: 'Whether attendance has been adjusted'
  },

  // Email notification tracking - stored as JSONB
  notifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      submitted: { sent: false, sentAt: null },
      approved: { sent: false, sentAt: null },
      rejected: { sent: false, sentAt: null }
    },
    comment: 'Email notification tracking'
  },

  // Supporting documents or attachments - stored as JSONB
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Supporting documents or attachments'
  }
}, {
  tableName: 'permission_requests',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_permissions_tenant_id_employee_id',
      fields: ['tenant_id', 'employee_id']
    },
    {
      name: 'idx_permissions_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_permissions_tenant_id_employee_id_status',
      fields: ['tenant_id', 'employee_id', 'status']
    },
    {
      name: 'idx_permissions_tenant_id_employee_id_date',
      fields: ['tenant_id', 'employee_id', 'date']
    },
    {
      name: 'idx_permissions_tenant_id_date_status',
      fields: ['tenant_id', 'date', 'status']
    },
    {
      name: 'idx_permissions_tenant_id_permission_type_status',
      fields: ['tenant_id', 'permission_type', 'status']
    },
    {
      name: 'idx_permissions_tenant_id_status_created_at',
      fields: ['tenant_id', 'status', 'created_at']
    },
    {
      name: 'idx_permissions_tenant_id_attendance_adjusted_status',
      fields: ['tenant_id', 'attendance_adjusted', 'status']
    },
    {
      name: 'idx_permissions_date',
      fields: ['date']
    }
  ]
});

// Virtual properties
Permission.prototype.isToday = function() {
  const today = new Date();
  const requestDate = new Date(this.date);
  return today.toDateString() === requestDate.toDateString();
};

Permission.prototype.isPast = function() {
  return new Date(this.date) < new Date();
};

Permission.prototype.isActive = function() {
  return this.status === 'approved' && !this.isPast();
};

// Instance Methods
Permission.prototype.approve = async function(supervisorId, comments = '') {
  this.status = 'approved';
  this.approval = {
    reviewedBy: supervisorId,
    reviewedAt: new Date(),
    comments: comments || null
  };
  return await this.save();
};

Permission.prototype.reject = async function(supervisorId, reason) {
  if (!reason) {
    throw new Error('Rejection reason is required');
  }

  this.status = 'rejected';
  this.approval = {
    reviewedBy: supervisorId,
    reviewedAt: new Date(),
    comments: null
  };
  this.rejection = {
    reason,
    rejectedAt: new Date()
  };
  return await this.save();
};

Permission.prototype.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: userId,
    reason,
    cancelledAt: new Date()
  };
  return await this.save();
};

Permission.prototype.linkToAttendance = async function(attendanceId) {
  this.attendanceRecordId = attendanceId;
  this.attendanceAdjusted = true;
  return await this.save();
};

// Static Methods
Permission.getEmployeePermissions = function(tenantId, employeeId, filters = {}) {
  const where = { tenantId, employeeId, ...filters };
  return this.findAll({
    where,
    order: [['date', 'DESC'], ['createdAt', 'DESC']]
  });
};

Permission.getPendingPermissions = function(tenantId, departmentId = null) {
  const where = { tenantId, status: 'pending' };
  
  // Note: Department filtering would need to be done via join with User model
  // For now, return all pending for tenant
  return this.findAll({
    where,
    order: [['date', 'ASC'], ['createdAt', 'ASC']]
  });
};

Permission.getPermissionsByDate = function(tenantId, date, status = 'approved') {
  return this.findAll({
    where: {
      tenantId,
      date,
      status
    },
    order: [['createdAt', 'ASC']]
  });
};

Permission.getEmployeeStats = async function(tenantId, employeeId, year = new Date().getFullYear()) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const permissions = await this.findAll({
    where: {
      tenantId,
      employeeId,
      date: {
        [Op.between]: [yearStart, yearEnd]
      }
    },
    attributes: ['permissionType', 'status', 'time'],
    raw: true
  });

  // Process stats in JavaScript
  const stats = {};
  permissions.forEach(perm => {
    const type = perm.permissionType;
    const status = perm.status;
    
    if (!stats[type]) {
      stats[type] = { totalCount: 0, statuses: {} };
    }
    
    if (!stats[type].statuses[status]) {
      stats[type].statuses[status] = { count: 0, totalDuration: 0 };
    }
    
    stats[type].totalCount++;
    stats[type].statuses[status].count++;
    stats[type].statuses[status].totalDuration += perm.time?.duration || 0;
  });

  return stats;
};

Permission.getPermissionsByDepartment = async function(tenantId, departmentId, filters = {}) {
  // This would require joining with User model
  // For now, return basic implementation
  const where = { tenantId, ...filters };
  return this.findAll({
    where,
    order: [['date', 'DESC'], ['createdAt', 'DESC']]
  });
};

Permission.getPendingAttendanceAdjustments = function(tenantId) {
  return this.findAll({
    where: {
      tenantId,
      status: 'approved',
      attendanceAdjusted: false
    },
    order: [['date', 'ASC']]
  });
};

Permission.withTenant = function(tenantId) {
  return this.findAll({ where: { tenantId } });
};

Permission.findByDateRange = async function(tenantId, startDate, endDate, filters = {}) {
  return this.findAll({
    where: {
      tenantId,
      date: {
        [Op.between]: [startDate, endDate]
      },
      ...filters
    },
    order: [['date', 'ASC']]
  });
};

export default Permission;







