import mongoose from 'mongoose';

/**
 * BackupLog Model
 * Tracks all backup operations, metadata, and status
 */
const backupLogSchema = new mongoose.Schema({
    backupId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'manual', 'emergency'],
        required: true,
        index: true
    },
    
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'failed', 'partial'],
        default: 'in_progress',
        index: true
    },
    
    startTime: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    endTime: {
        type: Date
    },
    
    duration: {
        type: Number // milliseconds
    },
    
    components: [{
        type: {
            type: String,
            enum: ['mongodb', 'files', 'configuration', 'encrypted-keys', 'application-code']
        },
        component: String,
        database: String,
        path: String,
        size: Number,
        checksum: String,
        timestamp: Date,
        encrypted: Boolean,
        status: {
            type: String,
            enum: ['success', 'failed', 'skipped']
        },
        error: String
    }],
    
    finalPath: {
        type: String
    },
    
    size: {
        type: Number // bytes
    },
    
    compressed: {
        type: Boolean,
        default: true
    },
    
    encrypted: {
        type: Boolean,
        default: true
    },
    
    checksums: {
        type: Map,
        of: String
    },
    
    metadata: {
        mongoVersion: String,
        nodeVersion: String,
        platform: String,
        hostname: String,
        backupToolVersion: String
    },
    
    verification: {
        verified: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date,
        verificationStatus: {
            type: String,
            enum: ['passed', 'failed', 'partial']
        },
        verificationErrors: [String]
    },
    
    restoration: {
        restored: {
            type: Boolean,
            default: false
        },
        restoredAt: Date,
        restoredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        restorationNotes: String
    },
    
    cloudStorage: {
        uploaded: {
            type: Boolean,
            default: false
        },
        uploadedAt: Date,
        provider: {
            type: String,
            enum: ['aws-s3', 'google-cloud', 'azure-blob', 'local']
        },
        bucket: String,
        key: String,
        url: String,
        uploadError: String
    },
    
    retentionPolicy: {
        expiresAt: Date,
        autoDelete: {
            type: Boolean,
            default: true
        },
        deletedAt: Date
    },
    
    error: {
        message: String,
        stack: String,
        timestamp: Date
    },
    
    triggeredBy: {
        type: String,
        enum: ['scheduled', 'manual', 'api', 'emergency'],
        default: 'scheduled'
    },
    
    triggeredByUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    notes: String

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for efficient queries
backupLogSchema.index({ startTime: -1 });
backupLogSchema.index({ type: 1, status: 1 });
backupLogSchema.index({ 'cloudStorage.uploaded': 1 });
backupLogSchema.index({ 'retentionPolicy.expiresAt': 1 });

// Virtual for duration in human-readable format
backupLogSchema.virtual('durationFormatted').get(function() {
    if (!this.duration) return null;
    
    const seconds = Math.floor(this.duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
});

// Virtual for size in human-readable format
backupLogSchema.virtual('sizeFormatted').get(function() {
    if (!this.size) return null;
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.size;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
});

// Virtual for success rate
backupLogSchema.virtual('successRate').get(function() {
    if (!this.components || this.components.length === 0) return 0;
    
    const successCount = this.components.filter(c => c.status === 'success').length;
    return (successCount / this.components.length) * 100;
});

// Pre-save middleware to calculate duration
backupLogSchema.pre('save', function(next) {
    if (this.endTime && this.startTime) {
        this.duration = this.endTime - this.startTime;
    }
    
    // Set expiration date based on type
    if (!this.retentionPolicy.expiresAt) {
        const expiresAt = new Date(this.startTime);
        
        switch (this.type) {
            case 'daily':
                expiresAt.setDate(expiresAt.getDate() + 30);
                break;
            case 'weekly':
                expiresAt.setDate(expiresAt.getDate() + 84); // 12 weeks
                break;
            case 'monthly':
                expiresAt.setMonth(expiresAt.getMonth() + 12);
                break;
            case 'manual':
            case 'emergency':
                expiresAt.setMonth(expiresAt.getMonth() + 6);
                break;
        }
        
        this.retentionPolicy.expiresAt = expiresAt;
    }
    
    next();
});

// Static method to get backup statistics
backupLogSchema.statics.getStatistics = async function(startDate, endDate) {
    const match = {
        startTime: {
            $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            $lte: endDate || new Date()
        }
    };
    
    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalSize: { $sum: '$size' },
                avgSize: { $avg: '$size' },
                avgDuration: { $avg: '$duration' },
                successCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                failureCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                }
            }
        }
    ]);
    
    return stats;
};

// Static method to find expired backups
backupLogSchema.statics.findExpiredBackups = async function() {
    return this.find({
        'retentionPolicy.expiresAt': { $lt: new Date() },
        'retentionPolicy.autoDelete': true,
        'retentionPolicy.deletedAt': { $exists: false }
    });
};

// Static method to get recent backups
backupLogSchema.statics.getRecentBackups = async function(limit = 10) {
    return this.find()
        .sort({ startTime: -1 })
        .limit(limit)
        .select('backupId type status startTime endTime size components')
        .lean();
};

// Static method to get backup by ID
backupLogSchema.statics.getBackupById = async function(backupId) {
    return this.findOne({ backupId })
        .populate('triggeredByUser', 'name email')
        .populate('restoration.restoredBy', 'name email');
};

// Instance method to mark as verified
backupLogSchema.methods.markAsVerified = async function(status, errors = []) {
    this.verification.verified = true;
    this.verification.verifiedAt = new Date();
    this.verification.verificationStatus = status;
    this.verification.verificationErrors = errors;
    
    return this.save();
};

// Instance method to mark as uploaded to cloud
backupLogSchema.methods.markAsUploaded = async function(provider, bucket, key, url) {
    this.cloudStorage.uploaded = true;
    this.cloudStorage.uploadedAt = new Date();
    this.cloudStorage.provider = provider;
    this.cloudStorage.bucket = bucket;
    this.cloudStorage.key = key;
    this.cloudStorage.url = url;
    
    return this.save();
};

// Instance method to mark as restored
backupLogSchema.methods.markAsRestored = async function(userId, notes) {
    this.restoration.restored = true;
    this.restoration.restoredAt = new Date();
    this.restoration.restoredBy = userId;
    this.restoration.restorationNotes = notes;
    
    return this.save();
};

const BackupLog = mongoose.model('BackupLog', backupLogSchema);

export default BackupLog;