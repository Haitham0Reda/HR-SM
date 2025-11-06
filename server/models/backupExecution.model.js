/**
 * Backup Execution Model
 * 
 * Tracks individual backup execution history
 */
import mongoose from 'mongoose';

const backupExecutionSchema = new mongoose.Schema({
    // Backup Reference
    backup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Backup',
        required: true,
        index: true
    },
    backupName: String,

    // Execution Details
    executionType: {
        type: String,
        enum: ['manual', 'scheduled', 'api'],
        default: 'manual'
    },
    triggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },

    // Timing
    startTime: {
        type: Date,
        default: Date.now,
        index: true
    },
    endTime: Date,
    duration: Number, // milliseconds

    // Backup Information
    backupFile: String,
    backupPath: String,
    backupSize: Number, // bytes
    compressedSize: Number, // bytes
    compressionRatio: Number,

    // Encryption
    isEncrypted: {
        type: Boolean,
        default: false
    },
    encryptionAlgorithm: String,

    // Statistics
    itemsBackedUp: {
        databases: Number,
        collections: Number,
        documents: Number,
        files: Number,
        totalSize: Number
    },

    // Error Information
    error: {
        message: String,
        stack: String,
        code: String
    },

    // Verification
    checksum: String,
    verified: {
        type: Boolean,
        default: false
    },
    verifiedAt: Date,

    // Notification
    notificationSent: {
        type: Boolean,
        default: false
    },
    notificationSentAt: Date,

    // Metadata
    serverInfo: {
        hostname: String,
        nodeVersion: String,
        platform: String
    }
}, {
    timestamps: true
});

// Indexes
backupExecutionSchema.index({ backup: 1, createdAt: -1 });
backupExecutionSchema.index({ status: 1, createdAt: -1 });
backupExecutionSchema.index({ executionType: 1 });

// TTL index to auto-delete old executions after retention period
backupExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Method to mark as completed
backupExecutionSchema.methods.markCompleted = async function (result) {
    this.status = 'completed';
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;

    if (result) {
        this.backupFile = result.backupFile;
        this.backupPath = result.backupPath;
        this.backupSize = result.backupSize;
        this.compressedSize = result.compressedSize;
        this.compressionRatio = result.compressionRatio;
        this.isEncrypted = result.isEncrypted;
        this.encryptionAlgorithm = result.encryptionAlgorithm;
        this.itemsBackedUp = result.itemsBackedUp;
        this.checksum = result.checksum;
    }

    return await this.save();
};

// Method to mark as failed
backupExecutionSchema.methods.markFailed = async function (error) {
    this.status = 'failed';
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
    this.error = {
        message: error.message,
        stack: error.stack,
        code: error.code
    };

    return await this.save();
};

// Static method to get execution history
backupExecutionSchema.statics.getHistory = function (backupId, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const query = { backup: backupId };
    if (status) query.status = status;

    return this.find(query)
        .populate('triggeredBy', 'username email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get statistics
backupExecutionSchema.statics.getStatistics = async function (backupId, days = 30) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const stats = await this.aggregate([
        {
            $match: {
                backup: mongoose.Types.ObjectId(backupId),
                createdAt: { $gte: dateThreshold }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgDuration: { $avg: '$duration' },
                totalSize: { $sum: '$backupSize' },
                avgSize: { $avg: '$backupSize' }
            }
        }
    ]);

    return stats;
};

// Static method to cleanup old backups
backupExecutionSchema.statics.cleanupOldBackups = async function (retentionDays) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - retentionDays);

    const oldBackups = await this.find({
        createdAt: { $lt: dateThreshold },
        status: 'completed'
    });

    return oldBackups;
};

export default mongoose.model('BackupExecution', backupExecutionSchema);
