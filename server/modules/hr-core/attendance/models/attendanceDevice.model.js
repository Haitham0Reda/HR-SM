import mongoose from 'mongoose';

const attendanceDeviceSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    deviceName: {
        type: String,
        required: true,
        trim: true
    },
    deviceType: {
        type: String,
        required: true,
        enum: ['zkteco', 'cloud', 'mobile', 'qr', 'csv', 'biometric-generic', 'manual'],
        index: true
    },
    ipAddress: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                // Allow empty for non-network devices
                if (!v) return true;
                // Basic IP validation
                return /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
            },
            message: 'Invalid IP address format'
        }
    },
    port: {
        type: Number,
        min: 1,
        max: 65535
    },
    apiKey: {
        type: String,
        trim: true
    },
    token: {
        type: String,
        trim: true
    },
    apiUrl: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'error', 'syncing'],
        default: 'inactive',
        index: true
    },
    lastSync: {
        type: Date
    },
    lastSyncStatus: {
        type: String,
        enum: ['success', 'failed', 'partial'],
        default: null
    },
    lastSyncError: {
        type: String
    },
    syncInterval: {
        type: Number, // in minutes
        default: 5
    },
    autoSync: {
        type: Boolean,
        default: true
    },
    // Device-specific configuration
    config: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Statistics
    stats: {
        totalSyncs: {
            type: Number,
            default: 0
        },
        successfulSyncs: {
            type: Number,
            default: 0
        },
        failedSyncs: {
            type: Number,
            default: 0
        },
        lastRecordCount: {
            type: Number,
            default: 0
        }
    },
    // Department mapping (optional - for multi-department devices)
    departments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for performance
attendanceDeviceSchema.index({ tenantId: 1, deviceType: 1, status: 1 });
attendanceDeviceSchema.index({ tenantId: 1, autoSync: 1, isActive: 1 });
attendanceDeviceSchema.index({ tenantId: 1, lastSync: 1 });
attendanceDeviceSchema.index({ tenantId: 1, deviceName: 1 }, { unique: true }); // Unique device names per tenant

// Instance method to update sync status
attendanceDeviceSchema.methods.updateSyncStatus = async function (success, recordCount = 0, error = null) {
    this.lastSync = new Date();
    this.lastSyncStatus = success ? 'success' : 'failed';
    this.lastSyncError = error;
    this.stats.totalSyncs += 1;

    if (success) {
        this.stats.successfulSyncs += 1;
        this.stats.lastRecordCount = recordCount;
        this.status = 'active';
    } else {
        this.stats.failedSyncs += 1;
        this.status = 'error';
    }

    return await this.save();
};

// Static method to get active devices for sync (tenant-aware)
attendanceDeviceSchema.statics.getDevicesForSync = function (tenantId = null) {
    const query = {
        isActive: true,
        autoSync: true,
        status: { $ne: 'syncing' }
    };
    
    if (tenantId) {
        query.tenantId = tenantId;
    }
    
    return this.find(query);
};

// Static method to get device statistics (tenant-aware)
attendanceDeviceSchema.statics.getDeviceStats = async function (tenantId = null) {
    const matchStage = tenantId ? { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } } : { $match: {} };
    
    const stats = await this.aggregate([
        matchStage,
        {
            $group: {
                _id: '$deviceType',
                total: { $sum: 1 },
                active: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                inactive: {
                    $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
                },
                error: {
                    $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats;
};

export default mongoose.model('AttendanceDevice', attendanceDeviceSchema);
