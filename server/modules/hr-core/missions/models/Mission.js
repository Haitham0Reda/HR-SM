/**
 * Mission Model - PostgreSQL (Sequelize)
 * 
 * This model tracks employee business trips and missions.
 * Includes approval workflow and status tracking.
 * 
 * @module models/Mission
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const Mission = mainAppDb.define('Mission', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the mission (UUID)'
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

  // Mission Dates
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date',
    comment: 'Mission start date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_date',
    comment: 'Mission end date'
  },

  // Mission Details
  destination: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Mission destination'
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Purpose of the mission'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Mission status'
  },

  // Approval
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by_id',
    comment: 'User who approved the mission'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: 'Approval timestamp'
  },

  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  }
}, {
  tableName: 'missions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_missions_tenant_id_employee_id',
      fields: ['tenant_id', 'employee_id']
    },
    {
      name: 'idx_missions_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_missions_tenant_id_employee_id_status',
      fields: ['tenant_id', 'employee_id', 'status']
    },
    {
      name: 'idx_missions_tenant_id_start_date_end_date',
      fields: ['tenant_id', 'start_date', 'end_date']
    },
    {
      name: 'idx_missions_start_date',
      fields: ['start_date']
    }
  ]
});

// Instance Methods
Mission.prototype.isApproved = function() {
  return this.status === 'approved';
};

Mission.prototype.isPending = function() {
  return this.status === 'pending';
};

Mission.prototype.isCompleted = function() {
  return this.status === 'completed';
};

Mission.prototype.approve = async function(approvedById) {
  this.status = 'approved';
  this.approvedById = approvedById;
  this.approvedAt = new Date();
  return await this.save();
};

Mission.prototype.reject = async function() {
  this.status = 'rejected';
  return await this.save();
};

Mission.prototype.complete = async function() {
  this.status = 'completed';
  return await this.save();
};

Mission.prototype.cancel = async function() {
  this.status = 'cancelled';
  return await this.save();
};

// Static Methods
Mission.findByEmployee = async function(tenantId, employeeId) {
  return this.findAll({
    where: { tenantId, employeeId },
    order: [['startDate', 'DESC']]
  });
};

Mission.findByStatus = async function(tenantId, status) {
  return this.findAll({
    where: { tenantId, status },
    order: [['startDate', 'DESC']]
  });
};

Mission.findPending = async function(tenantId) {
  return this.findAll({
    where: { tenantId, status: 'pending' },
    order: [['createdAt', 'ASC']]
  });
};

Mission.findByDateRange = async function(tenantId, startDate, endDate) {
  return this.findAll({
    where: {
      tenantId,
      [Op.or]: [
        {
          startDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        {
          endDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        {
          [Op.and]: [
            { startDate: { [Op.lte]: startDate } },
            { endDate: { [Op.gte]: endDate } }
          ]
        }
      ]
    },
    order: [['startDate', 'ASC']]
  });
};

export default Mission;
