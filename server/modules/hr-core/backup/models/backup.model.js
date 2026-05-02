/**
 * Backup Model - PostgreSQL (Sequelize)
 * 
 * Manages backup configurations and execution history.
 * Supports scheduled backups with various frequencies and retention policies.
 * 
 * @module models/Backup
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const Backup = mainAppDb.define('Backup', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the backup configuration (UUID)'
  },

  // Backup Information
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Backup name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Backup description'
  },

  // Backup Type
  backupType: {
    type: DataTypes.ENUM('database', 'files', 'configuration', 'full', 'incremental'),
    allowNull: false,
    field: 'backup_type',
    comment: 'Type of backup'
  },

  // Schedule Configuration - stored as JSONB
  schedule: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      enabled: false,
      frequency: 'daily',
      time: null,
      dayOfWeek: null,
      dayOfMonth: null,
      cronExpression: null,
      lastRun: null,
      nextRun: null
    },
    comment: 'Schedule configuration'
  },

  // Backup Settings - stored as JSONB
  settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      encryption: {
        enabled: true,
        algorithm: 'aes-256-cbc',
        encryptionKey: null
      },
      compression: {
        enabled: true,
        level: 6
      },
      retention: {
        enabled: true,
        days: 30,
        maxBackups: 10
      },
      notification: {
        enabled: true,
        onSuccess: false,
        onFailure: true,
        recipients: []
      }
    },
    comment: 'Backup settings'
  },

  // Backup Sources - stored as JSONB
  sources: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      databases: [],
      filePaths: [],
      configFiles: []
    },
    comment: 'Backup sources'
  },

  // Storage Configuration - stored as JSONB
  storage: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      location: './backups',
      maxSize: 1024
    },
    comment: 'Storage configuration'
  },

  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether backup is active'
  },

  // Statistics - stored as JSONB
  stats: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      totalBackups: 0,
      successCount: 0,
      failureCount: 0,
      lastSuccess: null,
      lastFailure: null,
      totalSize: 0,
      averageSize: null,
      averageDuration: null
    },
    comment: 'Backup statistics'
  },

  // Metadata
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by_id',
    comment: 'User who created the backup configuration'
  },
  lastModifiedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'last_modified_by_id',
    comment: 'User who last modified the configuration'
  }
}, {
  tableName: 'backups',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_backups_name',
      fields: ['name']
    },
    {
      name: 'idx_backups_backup_type_is_active',
      fields: ['backup_type', 'is_active']
    },
    {
      name: 'idx_backups_is_active',
      fields: ['is_active']
    }
  ]
});

// Instance Methods
Backup.prototype.calculateNextRun = function() {
  if (!this.schedule.enabled) return null;

  const now = new Date();
  let nextRun = new Date(now);

  switch (this.schedule.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      if (this.schedule.dayOfWeek !== undefined) {
        const daysUntilTarget = (this.schedule.dayOfWeek - nextRun.getDay() + 7) % 7;
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      }
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      if (this.schedule.dayOfMonth) {
        nextRun.setDate(this.schedule.dayOfMonth);
      }
      break;
  }

  // Set time if specified
  if (this.schedule.time) {
    const [hours, minutes] = this.schedule.time.split(':');
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  return nextRun;
};

Backup.prototype.updateStats = async function(execution) {
  const stats = { ...this.stats };
  stats.totalBackups += 1;

  if (execution.status === 'completed') {
    stats.successCount += 1;
    stats.lastSuccess = execution.endTime;

    if (execution.backupSize) {
      stats.totalSize += execution.backupSize;
      stats.averageSize = stats.totalSize / stats.successCount;
    }

    if (execution.duration) {
      const totalDuration = (stats.averageDuration || 0) * (stats.successCount - 1) + execution.duration;
      stats.averageDuration = totalDuration / stats.successCount;
    }
  } else if (execution.status === 'failed') {
    stats.failureCount += 1;
    stats.lastFailure = execution.endTime;
  }

  this.stats = stats;
  return await this.save();
};

// Static Methods
Backup.getScheduledBackups = function() {
  return this.findAll({
    where: {
      isActive: true
      // Note: JSONB field querying would need special handling for schedule.enabled and schedule.nextRun
    }
  });
};

Backup.getByType = function(backupType) {
  return this.findAll({
    where: { backupType, isActive: true },
    order: [['createdAt', 'DESC']]
  });
};

Backup.getActiveBackups = function() {
  return this.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']]
  });
};

export default Backup;







