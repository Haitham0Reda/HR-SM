/**
 * Task Model - Sequelize (PostgreSQL)
 * 
 * Represents tasks assigned to users.
 * Stored in the Main Application Database with tenant isolation.
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Task = mainAppDb.define('Task', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the task (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant identifier for data isolation'
  },

  // Task Information
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Task title'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Task description'
  },

  // Priority and Status
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium',
    comment: 'Task priority'
  },
  status: {
    type: DataTypes.ENUM('assigned', 'in-progress', 'submitted', 'reviewed', 'completed', 'rejected'),
    allowNull: false,
    defaultValue: 'assigned',
    comment: 'Task status'
  },

  // User References
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'assigned_to_id',
    comment: 'User assigned to this task'
  },
  assignedById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'assigned_by_id',
    comment: 'User who assigned this task'
  },

  // Dates
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date',
    comment: 'Task start date'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'due_date',
    comment: 'Task due date'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
    comment: 'Task completion timestamp'
  },

  // Tags and Attachments (stored as JSONB)
  tags: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Task tags (JSONB array)'
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Task attachments (JSONB array of objects)'
  },

  // Audit Fields
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
    comment: 'User who created this record'
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by',
    comment: 'User who last updated this record'
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Indexes for performance
  indexes: [
    {
      name: 'idx_tasks_tenant_id',
      fields: ['tenant_id']
    },
    {
      name: 'idx_tasks_assigned_to_status_tenant',
      fields: ['assigned_to_id', 'status', 'tenant_id']
    },
    {
      name: 'idx_tasks_assigned_by_tenant',
      fields: ['assigned_by_id', 'tenant_id']
    },
    {
      name: 'idx_tasks_due_date_status_tenant',
      fields: ['due_date', 'status', 'tenant_id']
    }
  ],
  
  // Validation
  validate: {
    dueDateAfterStartDate() {
      if (this.dueDate && this.startDate && this.dueDate <= this.startDate) {
        throw new Error('Due date must be after start date');
      }
    }
  }
});

// Instance Methods

// Virtual for checking if task is overdue
Task.prototype.isOverdue = function() {
  if (this.status === 'completed') return false;
  return new Date() > this.dueDate;
};

// Virtual for checking if task is late
Task.prototype.isLate = function() {
  if (!this.completedAt) return false;
  return this.completedAt > this.dueDate;
};

// Method to check if user can modify task
Task.prototype.canModify = function(userId) {
  return this.assignedById === userId;
};

// Method to check if user can submit report
Task.prototype.canSubmitReport = function(userId) {
  return this.assignedToId === userId;
};

// Associations will be defined in a separate associations file
Task.associate = (models) => {
  if (models.User) {
    Task.belongsTo(models.User, {
      foreignKey: 'assignedToId',
      as: 'assignedTo'
    });
    Task.belongsTo(models.User, {
      foreignKey: 'assignedById',
      as: 'assignedBy'
    });
    Task.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    Task.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  }
  if (models.TaskReport) {
    Task.hasMany(models.TaskReport, {
      foreignKey: 'taskId',
      as: 'reports'
    });
  }
};

export default Task;
