import { DataTypes, Op, QueryTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * ID Card Batch Model
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
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const IDCardBatch = sequelize.define('IDCardBatch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Tenant isolation - REQUIRED
  tenant_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'tenant_id'
  },
  
  // Batch identification
  batch_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'batch_number'
  },
  
  // Batch name/description
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Batch type
  batch_type: {
    type: DataTypes.ENUM('new-hire', 'renewal', 'replacement', 'all-employees', 'department', 'custom'),
    allowNull: false,
    field: 'batch_type'
  },
  
  // Filters used to select cards for this batch (JSONB)
  filters: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { department, position, cardType, employeeIds: [], customFilters }
  },
  
  // Cards included in this batch (JSONB array of UUIDs)
  cards: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // Array of card IDs
  },
  
  // Batch status
  status: {
    type: DataTypes.ENUM('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'partially-completed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  // Processing information (JSONB)
  processing: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      totalCards: 0,
      processedCards: 0,
      successfulCards: 0,
      failedCards: 0,
      progress: 0
    }
    // Structure: { startedAt, completedAt, duration, totalCards, processedCards, successfulCards, failedCards, progress }
  },
  
  // Failed cards details (JSONB array)
  failures: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // Structure: [{ card, employee, errorMessage, errorCode, attemptedAt }]
  },
  
  // Batch creator
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  
  // Organization/location
  organization: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'default'
  },
  
  // Printer configuration (JSONB)
  printer: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { printerName, printerModel, printerLocation }
  },
  
  // Print settings (JSONB)
  settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { template, orientation, copies, duplex, colorMode }
  },
  
  // Notifications (JSONB)
  notifications: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { onStart: { sent, sentAt }, onComplete: { sent, sentAt }, onFailure: { sent, sentAt } }
  },
  
  // Priority (for queue management)
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 10
    }
  },
  
  // Scheduled execution
  scheduled_for: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_for'
  },
  
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Tags for categorization (JSONB array)
  tags: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  tableName: 'id_card_batches',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'created_by']
    },
    {
      fields: ['tenant_id', 'created_by', 'created_at']
    },
    {
      fields: ['tenant_id', 'status', 'priority']
    },
    {
      fields: ['tenant_id', 'status', 'created_at']
    },
    {
      fields: ['tenant_id', 'organization', 'status']
    },
    {
      fields: ['tenant_id', 'scheduled_for', 'status']
    },
    {
      unique: true,
      fields: ['batch_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_by']
    }
  ],
  hooks: {
    beforeCreate: async (batch) => {
      // Auto-generate batch number if not provided
      if (!batch.batch_number) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        batch.batch_number = `BATCH-${timestamp}-${random}`;
      }
      
      // Initialize processing if not set
      if (!batch.processing || !batch.processing.totalCards) {
        batch.processing = {
          ...batch.processing,
          totalCards: batch.cards ? batch.cards.length : 0,
          processedCards: 0,
          successfulCards: 0,
          failedCards: 0,
          progress: 0
        };
      }
    }
  }
});

// Instance methods
IDCardBatch.prototype.getCompletionPercentage = function() {
  if (!this.processing || this.processing.totalCards === 0) {
    return 0;
  }
  return Math.round((this.processing.processedCards / this.processing.totalCards) * 100);
};

IDCardBatch.prototype.isComplete = function() {
  return this.status === 'completed' || this.status === 'partially-completed';
};

IDCardBatch.prototype.hasFailures = function() {
  return this.failures && this.failures.length > 0;
};

IDCardBatch.prototype.start = async function() {
  this.status = 'processing';
  this.processing = {
    ...this.processing,
    startedAt: new Date(),
    totalCards: this.cards ? this.cards.length : 0
  };
  return this.save();
};

IDCardBatch.prototype.updateProgress = async function(processed, successful, failed) {
  this.processing = {
    ...this.processing,
    processedCards: processed,
    successfulCards: successful,
    failedCards: failed,
    progress: this.processing.totalCards > 0 
      ? Math.round((processed / this.processing.totalCards) * 100) 
      : 0
  };
  return this.save();
};

IDCardBatch.prototype.addFailure = async function(cardId, employeeId, errorMessage, errorCode = null) {
  const failures = this.failures || [];
  failures.push({
    card: cardId,
    employee: employeeId,
    errorMessage,
    errorCode,
    attemptedAt: new Date()
  });
  this.failures = failures;
  return this.save();
};

IDCardBatch.prototype.complete = async function() {
  const completedAt = new Date();
  const startedAt = this.processing.startedAt ? new Date(this.processing.startedAt) : completedAt;
  
  this.processing = {
    ...this.processing,
    completedAt,
    duration: completedAt - startedAt
  };
  
  if (this.processing.failedCards > 0 && this.processing.successfulCards > 0) {
    this.status = 'partially-completed';
  } else if (this.processing.failedCards === this.processing.totalCards) {
    this.status = 'failed';
  } else {
    this.status = 'completed';
  }
  
  return this.save();
};

IDCardBatch.prototype.cancel = async function() {
  const completedAt = new Date();
  const startedAt = this.processing.startedAt ? new Date(this.processing.startedAt) : completedAt;
  
  this.status = 'cancelled';
  this.processing = {
    ...this.processing,
    completedAt,
    duration: completedAt - startedAt
  };
  return this.save();
};

// Static methods
IDCardBatch.getPendingBatches = async function(tenantId, limit = 10) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      status: { [Op.in]: ['pending', 'queued'] }
    },
    order: [
      ['priority', 'DESC'],
      ['created_at', 'ASC']
    ],
    limit
  });
};

IDCardBatch.getBatchStatistics = async function(tenantId, startDate, endDate) {
  
  const results = await sequelize.query(
    `SELECT 
      status,
      COUNT(*) as count,
      SUM((processing->>'totalCards')::int) as total_cards,
      SUM((processing->>'successfulCards')::int) as successful_cards,
      SUM((processing->>'failedCards')::int) as failed_cards,
      AVG((processing->>'duration')::bigint) as avg_duration
    FROM id_card_batches
    WHERE tenant_id = :tenantId
      AND created_at >= :startDate
      AND created_at <= :endDate
    GROUP BY status`,
    {
      replacements: { tenantId, startDate, endDate },
      type: QueryTypes.SELECT
    }
  );
  
  return results.map(row => ({
    _id: row.status,
    count: parseInt(row.count),
    totalCards: parseInt(row.total_cards) || 0,
    successfulCards: parseInt(row.successful_cards) || 0,
    failedCards: parseInt(row.failed_cards) || 0,
    avgDuration: parseFloat(row.avg_duration) || 0
  }));
};

IDCardBatch.getUserBatches = async function(userId, tenantId, filters = {}) {
  const where = {
    created_by: userId,
    tenant_id: tenantId,
    ...filters
  };
  
  return this.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 50
  });
};

export default IDCardBatch;




