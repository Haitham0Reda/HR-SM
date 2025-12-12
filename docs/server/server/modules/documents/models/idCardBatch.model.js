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
 */
import mongoose from 'mongoose';

const idCardBatchSchema = new mongoose.Schema({
    // Batch identification
    batchNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Batch name/description
    name: {
        type: String,
        required: true
    },

    description: String,

    // Batch type
    batchType: {
        type: String,
        enum: ['new-hire', 'renewal', 'replacement', 'all-employees', 'department', 'custom'],
        required: true
    },

    // Filters used to select cards for this batch
    filters: {
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        },
        position: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Position'
        },
        cardType: String,
        employeeIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        customFilters: mongoose.Schema.Types.Mixed
    },

    // Cards included in this batch
    cards: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IDCard'
    }],

    // Batch status
    status: {
        type: String,
        enum: ['pending', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'partially-completed'],
        default: 'pending'
    },

    // Processing information
    processing: {
        startedAt: Date,
        completedAt: Date,
        duration: Number,  // in milliseconds
        totalCards: {
            type: Number,
            default: 0
        },
        processedCards: {
            type: Number,
            default: 0
        },
        successfulCards: {
            type: Number,
            default: 0
        },
        failedCards: {
            type: Number,
            default: 0
        },
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },

    // Failed cards details
    failures: [{
        card: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IDCard'
        },
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        errorMessage: String,
        errorCode: String,
        attemptedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Batch creator
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Organization/location
    organization: {
        type: String,
        default: 'default'
    },

    // Printer configuration
    printer: {
        printerName: String,
        printerModel: String,
        printerLocation: String
    },

    // Print settings
    settings: {
        template: String,
        orientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        },
        copies: {
            type: Number,
            min: 1,
            default: 1
        },
        duplex: {
            type: Boolean,
            default: false
        },
        colorMode: {
            type: String,
            enum: ['color', 'grayscale'],
            default: 'color'
        }
    },

    // Notifications
    notifications: {
        onStart: {
            sent: Boolean,
            sentAt: Date
        },
        onComplete: {
            sent: Boolean,
            sentAt: Date
        },
        onFailure: {
            sent: Boolean,
            sentAt: Date
        }
    },

    // Priority (for queue management)
    priority: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
    },

    // Scheduled execution
    scheduledFor: Date,

    // Notes
    notes: String,

    // Tags for categorization
    tags: [String]
}, {
    timestamps: true
});

// Virtual for completion percentage
idCardBatchSchema.virtual('completionPercentage').get(function () {
    if (this.processing.totalCards === 0) return 0;
    return Math.round((this.processing.processedCards / this.processing.totalCards) * 100);
});

// Virtual to check if batch is complete
idCardBatchSchema.virtual('isComplete').get(function () {
    return this.status === 'completed' || this.status === 'partially-completed';
});

// Virtual to check if batch has failures
idCardBatchSchema.virtual('hasFailures').get(function () {
    return this.failures.length > 0;
});

// Note: Middleware hooks moved to idCardBatchMiddleware.js
// Use middleware functions in routes for better separation of concerns

/**
 * Instance method to start batch processing
 * 
 * @returns {Promise<IDCardBatch>} Updated batch
 */
idCardBatchSchema.methods.start = async function () {
    this.status = 'processing';
    this.processing.startedAt = new Date();
    this.processing.totalCards = this.cards.length;
    return await this.save();
};

/**
 * Instance method to update progress
 * 
 * @param {Number} processed - Number of cards processed
 * @param {Number} successful - Number of successful prints
 * @param {Number} failed - Number of failed prints
 * @returns {Promise<IDCardBatch>} Updated batch
 */
idCardBatchSchema.methods.updateProgress = async function (processed, successful, failed) {
    this.processing.processedCards = processed;
    this.processing.successfulCards = successful;
    this.processing.failedCards = failed;
    return await this.save();
};

/**
 * Instance method to add failure
 * 
 * @param {ObjectId} cardId - Card ID
 * @param {ObjectId} employeeId - Employee ID
 * @param {String} errorMessage - Error message
 * @param {String} errorCode - Error code
 * @returns {Promise<IDCardBatch>} Updated batch
 */
idCardBatchSchema.methods.addFailure = async function (cardId, employeeId, errorMessage, errorCode = null) {
    this.failures.push({
        card: cardId,
        employee: employeeId,
        errorMessage,
        errorCode,
        attemptedAt: new Date()
    });
    return await this.save();
};

/**
 * Instance method to mark batch as completed
 * 
 * @returns {Promise<IDCardBatch>} Updated batch
 */
idCardBatchSchema.methods.complete = async function () {
    this.processing.completedAt = new Date();
    this.processing.duration = this.processing.completedAt - this.processing.startedAt;

    if (this.processing.failedCards > 0 && this.processing.successfulCards > 0) {
        this.status = 'partially-completed';
    } else if (this.processing.failedCards === this.processing.totalCards) {
        this.status = 'failed';
    } else {
        this.status = 'completed';
    }

    return await this.save();
};

/**
 * Instance method to cancel batch
 * 
 * @returns {Promise<IDCardBatch>} Updated batch
 */
idCardBatchSchema.methods.cancel = async function () {
    this.status = 'cancelled';
    this.processing.completedAt = new Date();
    this.processing.duration = this.processing.completedAt - this.processing.startedAt;
    return await this.save();
};

/**
 * Static method to create batch from filters
 * 
 * @param {Object} batchData - Batch configuration
 * @param {ObjectId} userId - User creating the batch
 * @returns {Promise<IDCardBatch>} Created batch
 */
idCardBatchSchema.statics.createBatch = async function (batchData, userId) {
    const IDCard = mongoose.model('IDCard');

    // Build query from filters
    const query = {
        status: 'active',
        isActive: true
    };

    if (batchData.filters.department) {
        query.department = batchData.filters.department;
    }

    if (batchData.filters.cardType) {
        query.cardType = batchData.filters.cardType;
    }

    if (batchData.filters.employeeIds && batchData.filters.employeeIds.length > 0) {
        query.employee = { $in: batchData.filters.employeeIds };
    }

    // Get cards matching filters
    const cards = await IDCard.find(query).select('_id');
    const cardIds = cards.map(c => c._id);

    // Create batch
    const batch = new this({
        name: batchData.name,
        description: batchData.description,
        batchType: batchData.batchType,
        filters: batchData.filters,
        cards: cardIds,
        createdBy: userId,
        organization: batchData.organization || 'default',
        printer: batchData.printer || {},
        settings: batchData.settings || {},
        priority: batchData.priority || 5,
        scheduledFor: batchData.scheduledFor,
        tags: batchData.tags || []
    });

    batch.processing.totalCards = cardIds.length;

    await batch.save();
    return batch;
};

/**
 * Static method to get pending batches
 * 
 * @param {Number} limit - Maximum number of batches
 * @returns {Promise<IDCardBatch[]>} Pending batches
 */
idCardBatchSchema.statics.getPendingBatches = function (limit = 10) {
    return this.find({
        status: { $in: ['pending', 'queued'] }
    })
        .populate('createdBy', 'username employeeId personalInfo')
        .populate('filters.department', 'name code')
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit);
};

/**
 * Static method to get batch statistics
 * 
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Batch statistics
 */
idCardBatchSchema.statics.getBatchStatistics = async function (startDate, endDate) {
    const query = {
        createdAt: { $gte: startDate, $lte: endDate }
    };

    const stats = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalCards: { $sum: '$processing.totalCards' },
                successfulCards: { $sum: '$processing.successfulCards' },
                failedCards: { $sum: '$processing.failedCards' },
                avgDuration: { $avg: '$processing.duration' }
            }
        }
    ]);

    return stats;
};

/**
 * Static method to get user's batches
 * 
 * @param {ObjectId} userId - User ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<IDCardBatch[]>} User's batches
 */
idCardBatchSchema.statics.getUserBatches = function (userId, filters = {}) {
    const query = { createdBy: userId, ...filters };

    return this.find(query)
        .populate('filters.department', 'name code')
        .sort({ createdAt: -1 })
        .limit(50);
};

// Compound indexes for better performance
idCardBatchSchema.index({ createdBy: 1, createdAt: -1 });
idCardBatchSchema.index({ status: 1, priority: -1 });
idCardBatchSchema.index({ status: 1, createdAt: 1 });
idCardBatchSchema.index({ 'filters.department': 1 });
idCardBatchSchema.index({ organization: 1, status: 1 });
idCardBatchSchema.index({ scheduledFor: 1, status: 1 });

export default mongoose.model('IDCardBatch', idCardBatchSchema);