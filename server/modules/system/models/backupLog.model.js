import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

/**
 * BackupLog Model - Tenant-Specific
 * Tracks all backup operations, metadata, and status per tenant
 */
const BackupLog = mainAppDb.define('BackupLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id'
    },
    backupId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'backup_id'
    },
    type: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'manual', 'emergency'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('in_progress', 'completed', 'failed', 'partial'),
        defaultValue: 'in_progress'
    },
    startTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'start_time'
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'end_time'
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duration in milliseconds'
    },
    components: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Array of backup component objects'
    },
    finalPath: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'final_path'
    },
    size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Size in bytes'
    },
    compressed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    encrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    checksums: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Map of checksums'
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Backup metadata (versions, platform, etc.)'
    },
    verification: {
        type: DataTypes.JSONB,
        defaultValue: {
            verified: false,
            verifiedAt: null,
            verificationStatus: null,
            verificationErrors: []
        }
    },
    restoration: {
        type: DataTypes.JSONB,
        defaultValue: {
            restored: false,
            restoredAt: null,
            restoredBy: null,
            restorationNotes: null
        }
    },
    cloudStorage: {
        type: DataTypes.JSONB,
        defaultValue: {
            uploaded: false,
            uploadedAt: null,
            provider: null,
            bucket: null,
            key: null,
            url: null,
            uploadError: null
        },
        field: 'cloud_storage'
    },
    retentionPolicy: {
        type: DataTypes.JSONB,
        defaultValue: {
            expiresAt: null,
            autoDelete: true,
            deletedAt: null
        },
        field: 'retention_policy'
    },
    error: {
        type: DataTypes.JSONB,
        defaultValue: null,
        comment: 'Error details if backup failed'
    },
    triggeredBy: {
        type: DataTypes.ENUM('scheduled', 'manual', 'api', 'emergency'),
        defaultValue: 'scheduled',
        field: 'triggered_by'
    },
    triggeredByUser: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'triggered_by_user',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'backup_logs',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['tenant_id', 'start_time']
        },
        {
            unique: true,
            fields: ['tenant_id', 'backup_id']
        },
        {
            fields: ['tenant_id', 'type', 'status']
        }
    ],
    hooks: {
        beforeSave: (backupLog) => {
            // Calculate duration
            if (backupLog.endTime && backupLog.startTime) {
                backupLog.duration = new Date(backupLog.endTime) - new Date(backupLog.startTime);
            }
            
            // Set expiration date based on type
            const retention = backupLog.retentionPolicy || {};
            if (!retention.expiresAt) {
                const expiresAt = new Date(backupLog.startTime);
                
                switch (backupLog.type) {
                    case 'daily':
                        expiresAt.setDate(expiresAt.getDate() + 30);
                        break;
                    case 'weekly':
                        expiresAt.setDate(expiresAt.getDate() + 84);
                        break;
                    case 'monthly':
                        expiresAt.setMonth(expiresAt.getMonth() + 12);
                        break;
                    case 'manual':
                    case 'emergency':
                        expiresAt.setMonth(expiresAt.getMonth() + 6);
                        break;
                }
                
                retention.expiresAt = expiresAt.toISOString();
                backupLog.retentionPolicy = retention;
            }
        }
    }
});

// Instance methods
BackupLog.prototype.getDurationFormatted = function() {
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
};

BackupLog.prototype.getSizeFormatted = function() {
    if (!this.size) return null;
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.size;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
};

BackupLog.prototype.getSuccessRate = function() {
    const components = this.components || [];
    if (components.length === 0) return 0;
    
    const successCount = components.filter(c => c.status === 'success').length;
    return (successCount / components.length) * 100;
};

BackupLog.prototype.markAsVerified = async function(status, errors = []) {
    this.verification = {
        ...this.verification,
        verified: true,
        verifiedAt: new Date().toISOString(),
        verificationStatus: status,
        verificationErrors: errors
    };
    
    return this.save();
};

BackupLog.prototype.markAsUploaded = async function(provider, bucket, key, url) {
    this.cloudStorage = {
        ...this.cloudStorage,
        uploaded: true,
        uploadedAt: new Date().toISOString(),
        provider,
        bucket,
        key,
        url
    };
    
    return this.save();
};

BackupLog.prototype.markAsRestored = async function(userId, notes) {
    this.restoration = {
        ...this.restoration,
        restored: true,
        restoredAt: new Date().toISOString(),
        restoredBy: userId,
        restorationNotes: notes
    };
    
    return this.save();
};

// Static methods
BackupLog.getStatistics = async function(tenantId, startDate, endDate) {
    
    const where = {
        tenantId,
        startTime: {
            [Op.gte]: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            [Op.lte]: endDate || new Date()
        }
    };
    
    const backups = await this.findAll({ where });
    
    const stats = {};
    backups.forEach(backup => {
        if (!stats[backup.type]) {
            stats[backup.type] = {
                count: 0,
                totalSize: 0,
                avgSize: 0,
                avgDuration: 0,
                successCount: 0,
                failureCount: 0
            };
        }
        
        stats[backup.type].count++;
        stats[backup.type].totalSize += backup.size || 0;
        stats[backup.type].avgDuration += backup.duration || 0;
        if (backup.status === 'completed') stats[backup.type].successCount++;
        if (backup.status === 'failed') stats[backup.type].failureCount++;
    });
    
    // Calculate averages
    Object.keys(stats).forEach(type => {
        stats[type].avgSize = stats[type].totalSize / stats[type].count;
        stats[type].avgDuration = stats[type].avgDuration / stats[type].count;
    });
    
    return stats;
};

BackupLog.findExpiredBackups = async function(tenantId) {
    
    return this.findAll({
        where: {
            tenantId,
            'retentionPolicy.expiresAt': { [Op.lt]: new Date() },
            'retentionPolicy.autoDelete': true,
            'retentionPolicy.deletedAt': null
        }
    });
};

BackupLog.getRecentBackups = async function(tenantId, limit = 10) {
    return this.findAll({
        where: { tenantId },
        order: [['start_time', 'DESC']],
        limit,
        attributes: ['backupId', 'type', 'status', 'startTime', 'endTime', 'size', 'components']
    });
};

BackupLog.getBackupById = async function(tenantId, backupId) {
    return this.findOne({
        where: { tenantId, backupId },
        include: [
            {
                model: mainAppDb.models.User,
                as: 'triggeringUser',
                attributes: ['name', 'email']
            }
        ]
    });
};

// Define associations
BackupLog.associate = (models) => {
    BackupLog.belongsTo(models.User, {
        foreignKey: 'triggeredByUser',
        as: 'triggeringUser'
    });
};

export default BackupLog;



