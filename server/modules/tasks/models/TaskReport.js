/**
 * TaskReport Model - Sequelize (PostgreSQL)
 * 
 * Represents reports submitted for tasks.
 * Stored in the Main Application Database with tenant isolation.
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const TaskReport = mainAppDb.define('TaskReport', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the task report (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant identifier for data isolation'
  },

  // Task Reference
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'task_id',
    comment: 'Reference to task'
  },

  // Submitted By
  submittedById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'submitted_by_id',
    comment: 'User who submitted this report'
  },

  // Report Content
  reportText: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: {
        args: [50, 10000],
        msg: 'Report text must be between 50 and 10000 characters'
      }
    },
    field: 'report_text',
    comment: 'Report text content'
  },

  // Time Spent (stored as JSONB)
  timeSpent: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: { hours: 0, minutes: 0 },
    field: 'time_spent',
    comment: 'Time spent on task (JSONB: {hours, minutes})'
  },

  // Files (stored as JSONB array)
  files: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Attached files (JSONB array of objects)'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Report status'
  },

  // Submission and Review
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at',
    comment: 'Report submission timestamp'
  },
  reviewedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewed_by_id',
    comment: 'User who reviewed this report'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at',
    comment: 'Report review timestamp'
  },
  reviewComments: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'review_comments',
    comment: 'Review comments'
  },

  // Version
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Report version number'
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
  tableName: 'task_reports',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Indexes for performance
  indexes: [
    {
      name: 'idx_task_reports_tenant_id',
      fields: ['tenant_id']
    },
    {
      name: 'idx_task_reports_task_version_tenant',
      fields: ['task_id', 'version', 'tenant_id']
    },
    {
      name: 'idx_task_reports_submitted_by_status_tenant',
      fields: ['submitted_by_id', 'status', 'tenant_id']
    },
    {
      name: 'idx_task_reports_submitted_at_tenant',
      fields: ['submitted_at', 'tenant_id']
    }
  ]
});

// Instance Methods

// Virtual for total time spent in minutes
TaskReport.prototype.getTotalMinutes = function() {
  if (!this.timeSpent) return 0;
  return (this.timeSpent.hours || 0) * 60 + (this.timeSpent.minutes || 0);
};

// Method to approve report
TaskReport.prototype.approve = async function(reviewerId, comments) {
  this.status = 'approved';
  this.reviewedById = reviewerId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  await this.save();
};

// Method to reject report
TaskReport.prototype.reject = async function(reviewerId, comments) {
  this.status = 'rejected';
  this.reviewedById = reviewerId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  await this.save();
};

// Static Methods

// Static method to get latest report for a task
TaskReport.getLatestForTask = async function(taskId, tenantId) {
  return this.findOne({
    where: { 
      taskId, 
      tenantId 
    },
    order: [['version', 'DESC']],
    include: [
      {
        association: 'submittedBy',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        association: 'reviewedBy',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

// Static method to get report history for a task
TaskReport.getHistoryForTask = async function(taskId, tenantId) {
  return this.findAll({
    where: { 
      taskId, 
      tenantId 
    },
    order: [['version', 'DESC']],
    include: [
      {
        association: 'submittedBy',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        association: 'reviewedBy',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

// Associations will be defined in a separate associations file
TaskReport.associate = (models) => {
  if (models.Task) {
    TaskReport.belongsTo(models.Task, {
      foreignKey: 'taskId',
      as: 'task'
    });
  }
  if (models.User) {
    TaskReport.belongsTo(models.User, {
      foreignKey: 'submittedById',
      as: 'submittedBy'
    });
    TaskReport.belongsTo(models.User, {
      foreignKey: 'reviewedById',
      as: 'reviewedBy'
    });
    TaskReport.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    TaskReport.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  }
};

export default TaskReport;
