/**
 * Mission Model - PostgreSQL (Sequelize)
 * 
 * This model represents the missions table in the Main Application Database (hrsm_platform).
 * It manages employee business trip/mission requests with approval workflows.
 * Supports multi-tenancy and date range tracking.
 * 
 * @module models/Mission
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';
import Position from '../../users/models/position.model.js';

const Mission = mainAppDb.define('Mission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id'
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id',
    references: { model: User, key: 'id' }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date',
    validate: {
      isAfterStartDate(value) {
        if (value && this.startDate && new Date(value) < new Date(this.startDate)) {
          throw new Error('End date must be after or equal to start date');
        }
      }
    }
  },
  startTime: {
    type: DataTypes.STRING(5),
    allowNull: true,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.STRING(5),
    allowNull: true,
    field: 'end_time'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Duration in days'
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: { len: [1, 200] }
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { len: [1, 500] }
  },
  relatedDepartmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'related_department_id',
    references: { model: Department, key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by_id',
    references: { model: User, key: 'id' }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  rejectedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'rejected_by_id',
    references: { model: User, key: 'id' }
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
  cancelledById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'cancelled_by_id',
    references: { model: User, key: 'id' }
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancellation_reason'
  },
  approverNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'approver_notes'
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id',
    references: { model: Department, key: 'id' }
  },
  positionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'position_id',
    references: { model: Position, key: 'id' }
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  notifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      submitted: { sent: false },
      approved: { sent: false },
      rejected: { sent: false }
    }
  }
}, {
  tableName: 'missions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  scopes: {
    pending: { where: { status: 'pending' } },
    approved: { where: { status: 'approved' } },
    active() {
      const now = new Date();
      return {
        where: {
          status: 'approved',
          startDate: { [mainAppDb.Sequelize.Op.lte]: now },
          endDate: { [mainAppDb.Sequelize.Op.gte]: now }
        }
      };
    }
  }
});

Mission.prototype.getIsActive = function() {
  const now = new Date();
  return this.status === 'approved' && new Date(this.startDate) <= now && new Date(this.endDate) >= now;
};

Mission.prototype.getIsUpcoming = function() {
  return this.status === 'approved' && new Date(this.startDate) > new Date();
};

Mission.prototype.approve = async function(approverId, notes) {
  this.status = 'approved';
  this.approvedById = approverId;
  this.approvedAt = new Date();
  if (notes) this.approverNotes = notes.trim();
  return await this.save();
};

Mission.prototype.reject = async function(rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedById = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason ? reason.trim() : '';
  return await this.save({ validate: false });
};

Mission.prototype.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledById = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason ? reason.trim() : '';
  return await this.save();
};

Mission.associate = function(models) {
  Mission.belongsTo(User, { foreignKey: 'employeeId', as: 'employee', onDelete: 'CASCADE' });
  Mission.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy', onDelete: 'SET NULL' });
  Mission.belongsTo(User, { foreignKey: 'rejectedById', as: 'rejectedBy', onDelete: 'SET NULL' });
  Mission.belongsTo(User, { foreignKey: 'cancelledById', as: 'cancelledBy', onDelete: 'SET NULL' });
  Mission.belongsTo(Department, { foreignKey: 'departmentId', as: 'department', onDelete: 'SET NULL' });
  Mission.belongsTo(Position, { foreignKey: 'positionId', as: 'position', onDelete: 'SET NULL' });
  Mission.belongsTo(Department, { foreignKey: 'relatedDepartmentId', as: 'relatedDepartment', onDelete: 'SET NULL' });
};

export default Mission;
