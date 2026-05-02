/**
 * Permissions Model - PostgreSQL (Sequelize)
 * Manages employee permissions for late arrivals and early departures
 */

import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

const Permissions = sequelize.define('Permissions', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employee: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  permissionType: {
    type: DataTypes.ENUM('late-arrival', 'early-departure'),
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time: {
    type: DataTypes.STRING(5),
    allowNull: false,
    validate: {
      is: /^([01]\d|2[0-3]):([0-5]\d)$/
    }
  },
  duration: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Duration in hours'
  },
  reason: {
    type: DataTypes.STRING(300),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'approved_by'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  rejectedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'rejected_by'
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'rejected_at'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  approverNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'approver_notes'
  },
  department: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  position: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'positions',
      key: 'id'
    }
  },
  notifications: {
    type: DataTypes.JSONB,
    defaultValue: {
      submitted: { sent: false, sentAt: null },
      approved: { sent: false, sentAt: null },
      rejected: { sent: false, sentAt: null }
    }
  }
}, {
  tableName: 'permissions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['employee', 'date'] },
    { fields: ['employee', 'status'] },
    { fields: ['department', 'status'] },
    { fields: ['date', 'status'] },
    { fields: ['permission_type', 'status'] },
    { fields: ['employee'] },
    { fields: ['date'] },
    { fields: ['status'] }
  ]
});

// Instance method to approve permission
Permissions.prototype.approve = async function(approverId, notes) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  if (notes && typeof notes === 'string') {
    this.approverNotes = notes.trim();
  }
  return await this.save();
};

// Instance method to reject permission
Permissions.prototype.reject = async function(rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save({ validate: false });
};

// Static method to get employee permissions with full details
Permissions.getPermissionsByEmployee = function(employeeId, filters = {}) {
  const where = { employee: employeeId, ...filters };
  return this.findAll({
    where,
    include: [
      {
        association: 'employeeUser',
        attributes: ['profile', 'employeeId', 'email'],
        include: [
          { association: 'department', attributes: ['name', 'code', 'manager'] },
          { association: 'position', attributes: ['title', 'code'] }
        ]
      },
      { association: 'approver', attributes: ['username', 'employeeId', 'personalInfo'] },
      { association: 'rejecter', attributes: ['username', 'employeeId', 'personalInfo'] },
      { association: 'departmentRef', attributes: ['name', 'code'] },
      { association: 'positionRef', attributes: ['title'] }
    ],
    order: [['date', 'DESC']]
  });
};

// Static method to get pending permissions for approval
Permissions.getPendingPermissions = function(departmentId = null) {
  const where = { status: 'pending' };
  
  if (departmentId) {
    where.department = departmentId;
  }

  return this.findAll({
    where,
    include: [
      {
        association: 'employeeUser',
        attributes: ['profile', 'department', 'position', 'employeeId', 'email'],
        include: [
          { association: 'department', attributes: ['name', 'code', 'manager'] },
          { association: 'position', attributes: ['title', 'code'] }
        ]
      },
      { association: 'departmentRef', attributes: ['name', 'code'] }
    ],
    order: [['createdAt', 'ASC']]
  });
};

// Static method to get permissions by department
Permissions.getPermissionsByDepartment = function(departmentId, filters = {}) {
  const where = { department: departmentId, ...filters };

  return this.findAll({
    where,
    include: [
      {
        association: 'employeeUser',
        attributes: ['profile', 'position', 'employeeId', 'email'],
        include: [{ association: 'position', attributes: ['title', 'code'] }]
      },
      { association: 'approver', attributes: ['username', 'employeeId', 'personalInfo'] },
      { association: 'rejecter', attributes: ['username', 'employeeId', 'personalInfo'] }
    ],
    order: [['date', 'DESC']]
  });
};

// Static method to get permissions by date range
Permissions.getPermissionsByDateRange = function(employeeId, startDate, endDate) {
  return this.findAll({
    where: {
      employee: employeeId,
      date: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    },
    include: [
      { association: 'approver', attributes: ['username', 'employeeId', 'personalInfo'] },
      { association: 'rejecter', attributes: ['username', 'employeeId', 'personalInfo'] }
    ],
    order: [['date', 'ASC']]
  });
};

// Static method to get monthly statistics
Permissions.getMonthlyStats = async function(employeeId, year, month) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const permissions = await this.findAll({
    where: {
      employee: employeeId,
      date: {
        [Op.gte]: monthStart,
        [Op.lte]: monthEnd
      }
    },
    attributes: [
      'permissionType',
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('duration')), 'totalHours']
    ],
    group: ['permissionType', 'status'],
    raw: true
  });

  return permissions;
};

export default Permissions;
