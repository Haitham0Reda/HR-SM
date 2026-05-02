/**
 * ID Card Batch Model - PostgreSQL (Sequelize)
 * 
 * Manages bulk ID card printing operations and batch processing.
 * Tracks batch status, progress, and printing statistics.
 * 
 * Features:
 * - Bulk printing operations
 * - Batch status tracking
 * - Progress monitoring
 * - Error handling and retry logic
 * - Print queue management
 * 
 * @module models/IDCardBatch
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const IDCardBatch = mainAppDb.define('IDCardBatch', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the batch (UUID)'
  },

  // Batch identification
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'batch_number',
    comment: 'Unique batch number'
  },

  // Batch name/description
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Batch name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Batch description'
  },

  // Batch type
  batchType: {
    type: DataTypes.ENUM('new-hire', 'renewal', 'replacement', 'all-employees', 'department', 'custom'),
    allowNull: false,
    field: 'batch_type',
    comment: 'Type of batch'
  },

  // Filters used to select cards - stored as JSONB
  filters: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Filters used to select cards for this batch'
  },

  // Cards included in this batch - stored as array of UUIDs
  cards: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: false,
    defaultValue: [],
    comment: 'Array of ID card UUIDs included in this batch'
  },

  // Batch status
  status: {
    type: DataTypes.ENUM('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'partially-completed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Batch status'
  },

  // Processing information - stored as JSONB
  processing: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      startedAt: null,
      completedAt: null,
      duration: null,
      totalCards: 0,
      processedCards: 0,
      successfulCards: 0,
      failedCards: 0,
      progress: 0
    },
    comment: 'Processing information and statistics'
  },

  // Failed cards details - stored as JSONB
  failures: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Failed cards details'
  },

  // Batch creator
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by_id',
    comment: 'User who created the batch'
  },

  // Organization/location
  organization: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'default',
    comment: 'Organization or location'
  },

  // Printer configuration - stored as JSONB
  printer: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Printer configuration'
  },

  // Print settings - stored as JSONB
  settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      template: null,
      orientation: 'portrait',
      copies: 1,
      duplex: false,
      colorMode: 'color'
    },
    comment: 'Print settings'
  },

  // Notifications - stored as JSONB
  notifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      onStart: { sent: false, sentAt: null },
      onComplete: { sent: false, sentAt: null },
      onFailure: { sent: false, sentAt: null }
    },
    comment: 'Notification tracking'
  },

  // Priority (for queue management)
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Priority for queue management (1-10)'
  },

  // Scheduled execution
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_for',
    comment: 'Scheduled execution time'
  },

  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },

  // Tags for categorization
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    comment: 'Tags for categorization'
  }
}, {
  tableName: 'id_card_batches',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_id_card_batches_batch_number',
      fields: ['batch_number'],
      unique: true
    },
    {
      name: 'idx_id_card_batches_created_by_id_created_at',
      fields: ['created_by_id', 'created_at']
    },
    {
      name: 'idx_id_card_batches_status_priority',
      fields: ['status', 'priority']
    },
    {
      name: 'idx_id_card_batches_status_created_at',
      fields: ['status', 'created_at']
    },
    {
      name: 'idx_id_card_batches_organization_status',
      fields: ['organization', 'status']
    },
    {
      name: 'idx_id_card_batches_scheduled_for_status',
      fields: ['scheduled_for', 'status']
    }
  ]
});

// Virtual properties
IDCardBatch.prototype.getCompletionPercentage = function() {
  if (this.processing.totalCards === 0) return 0;
  return Math.round((this.processing.processedCards / this.processing.totalCards) * 100);
};

IDCardBatch.prototype.isComplete = function() {
  return this.status === 'completed' || this.status === 'partially-completed';
};

IDCardBatch.prototype.hasFailures = function() {
  return this.failures && this.failures.length > 0;
};

// Instance Methods
IDCardBatch.prototype.start = async function() {
  this.status = 'processing';
  const processing = { ...this.processing };
  processing.startedAt = new Date();
  processing.totalCards = this.cards.length;
  this.processing = processing;
  return await this.save();
};

IDCardBatch.prototype.updateProgress = async function(processed, successful, failed) {
  const processing = { ...this.processing };
  processing.processedCards = processed;
  processing.successfulCards = successful;
  processing.failedCards = failed;
  processing.progress = this.getCompletionPercentage();
  this.processing = processing;
  return await this.save();
};

IDCardBatch.prototype.addFailure = async function(cardId, employeeId, errorMessage, errorCode = null) {
  const failures = [...this.failures];
  failures.push({
    card: cardId,
    employee: employeeId,
    errorMessage,
    errorCode,
    attemptedAt: new Date()
  });
  this.failures = failures;
  return await this.save();
};

IDCardBatch.prototype.complete = async function() {
  const processing = { ...this.processing };
  processing.completedAt = new Date();
  processing.duration = processing.completedAt - new Date(processing.startedAt);

  if (processing.failedCards > 0 && processing.successfulCards > 0) {
    this.status = 'partially-completed';
  } else if (processing.failedCards === processing.totalCards) {
    this.status = 'failed';
  } else {
    this.status = 'completed';
  }

  this.processing = processing;
  return await this.save();
};

IDCardBatch.prototype.cancel = async function() {
  this.status = 'cancelled';
  const processing = { ...this.processing };
  processing.completedAt = new Date();
  if (processing.startedAt) {
    processing.duration = processing.completedAt - new Date(processing.startedAt);
  }
  this.processing = processing;
  return await this.save();
};

// Static Methods
IDCardBatch.createBatch = async function(batchData, userId) {
  // Note: Card filtering logic would need to be implemented separately
  // For now, accept cards array directly
  
  const batch = await this.create({
    batchNumber: batchData.batchNumber || `BATCH-${Date.now()}`,
    name: batchData.name,
    description: batchData.description,
    batchType: batchData.batchType,
    filters: batchData.filters || {},
    cards: batchData.cards || [],
    createdById: userId,
    organization: batchData.organization || 'default',
    printer: batchData.printer || {},
    settings: batchData.settings || {},
    priority: batchData.priority || 5,
    scheduledFor: batchData.scheduledFor,
    tags: batchData.tags || [],
    processing: {
      ...this.rawAttributes.processing.defaultValue,
      totalCards: (batchData.cards || []).length
    }
  });

  return batch;
};

IDCardBatch.getPendingBatches = function(limit = 10) {
  return this.findAll({
    where: {
      status: { [Op.in]: ['pending', 'queued'] }
    },
    order: [
      ['priority', 'DESC'],
      ['createdAt', 'ASC']
    ],
    limit
  });
};

IDCardBatch.getBatchStatistics = async function(startDate, endDate) {
  const batches = await this.findAll({
    where: {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    },
    attributes: ['status', 'processing'],
    raw: true
  });

  // Process stats in JavaScript
  const stats = {};
  batches.forEach(batch => {
    const status = batch.status;
    if (!stats[status]) {
      stats[status] = {
        count: 0,
        totalCards: 0,
        successfulCards: 0,
        failedCards: 0,
        totalDuration: 0
      };
    }
    
    stats[status].count++;
    stats[status].totalCards += batch.processing.totalCards || 0;
    stats[status].successfulCards += batch.processing.successfulCards || 0;
    stats[status].failedCards += batch.processing.failedCards || 0;
    stats[status].totalDuration += batch.processing.duration || 0;
  });

  // Calculate averages
  Object.keys(stats).forEach(status => {
    if (stats[status].count > 0) {
      stats[status].avgDuration = stats[status].totalDuration / stats[status].count;
    }
  });

  return stats;
};

IDCardBatch.getUserBatches = function(userId, filters = {}) {
  return this.findAll({
    where: {
      createdById: userId,
      ...filters
    },
    order: [['createdAt', 'DESC']],
    limit: 50
  });
};

export default IDCardBatch;







