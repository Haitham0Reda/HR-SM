/**
 * Backup Model
 * 
 * Manages backup configurations and execution history
 */
import mongoose from 'mongoose';

const backupSchema = new mongoose.Schema({
    // Backup Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: String,

    // Backup Type
    backupType: {
        type: String,
        enum: ['database', 'files', 'configuration', 'full', 'incremental'],
        required: true,
        index: true
    },

    // Schedule Configuration
    schedule: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'custom'],
            default: 'daily'
        },
        time: String, // HH:mm format
        dayOfWeek: Number, // 0-6 for weekly
        dayOfMonth: Number, // 1-31 for monthly
        cronExpression: String,
        lastRun: Date,
        nextRun: Date
    },

    // Backup Settings
    settings: {
        // Encryption
        encryption: {
            enabled: {
                type: Boolean,
                default: true
            },
            algorithm: {
                type: String,
                default: 'aes-256-cbc'
            },
            encryptionKey: String // Stored securely, hashed
        },

        // Compression
        compression: {
            enabled: {
                type: Boolean,
                default: true
            },
            level: {
                type: Number,
                default: 6, // 1-9
                min: 1,
                max: 9
            }
        },

        // Retention
        retention: {
            enabled: {
                type: Boolean,
                default: true
            },
            days: {
                type: Number,
                default: 30,
                min: 1
            },
            maxBackups: {
                type: Number,
                default: 10,
                min: 1
            }
        },

        // Notification
        notification: {
            enabled: {
                type: Boolean,
                default: true
            },
            onSuccess: {
                type: Boolean,
                default: false
            },
            onFailure: {
                type: Boolean,
                default: true
            },
            recipients: [{
                type: String,
                match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            }]
        }
    },

    // Backup Sources
    sources: {
        // Database
        databases: [{
            name: String,
            collections: [String] // Empty = all collections
        }],

        // File paths
        filePaths: [String],

        // Configuration files
        configFiles: [String]
    },

    // Storage Configuration
    storage: {
        location: {
            type: String,
            required: true,
            default: './backups'
        },
        maxSize: {
            type: Number, // In MB
            default: 1024
        }
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Statistics
    stats: {
        totalBackups: {
            type: Number,
            default: 0
        },
        successCount: {
            type: Number,
            default: 0
        },
        failureCount: {
            type: Number,
            default: 0
        },
        lastSuccess: Date,
        lastFailure: Date,
        totalSize: {
            type: Number,
            default: 0
        },
        averageSize: Number,
        averageDuration: Number
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
backupSchema.index({ name: 1 });
backupSchema.index({ backupType: 1, isActive: 1 });
backupSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });

// Method to calculate next run time
backupSchema.methods.calculateNextRun = function () {
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

// Method to update statistics
backupSchema.methods.updateStats = async function (execution) {
    this.stats.totalBackups += 1;

    if (execution.status === 'completed') {
        this.stats.successCount += 1;
        this.stats.lastSuccess = execution.endTime;

        if (execution.backupSize) {
            this.stats.totalSize += execution.backupSize;
            this.stats.averageSize = this.stats.totalSize / this.stats.successCount;
        }

        if (execution.duration) {
            const totalDuration = (this.stats.averageDuration || 0) * (this.stats.successCount - 1) + execution.duration;
            this.stats.averageDuration = totalDuration / this.stats.successCount;
        }
    } else if (execution.status === 'failed') {
        this.stats.failureCount += 1;
        this.stats.lastFailure = execution.endTime;
    }

    return await this.save();
};

// Static method to get scheduled backups
backupSchema.statics.getScheduledBackups = function () {
    return this.find({
        'schedule.enabled': true,
        'schedule.nextRun': { $lte: new Date() },
        isActive: true
    });
};

export default mongoose.model('Backup', backupSchema);
