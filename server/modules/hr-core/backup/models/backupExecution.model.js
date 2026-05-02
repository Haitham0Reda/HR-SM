/**
 * Backup Execution Model
 * 
 * Tracks individual backup execution history
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const BackupExecution = mainAppDb.define('BackupExecution', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // Tenant ID for multi-tenancy
    tenantId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'tenant_id'
    },

    // Backup Reference
    backup: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'backups',
            key: 'id'
        },
        field: 'backup'
    },
    backupName: {
        type: DataTypes.STRING,
        field: 'backup_name'
    },

    // Execution Details
    executionType: {
        type: DataTypes.ENUM('manual', 'scheduled', 'api'),
        defaultValue: 'manual',
        field: 'execution_type'
    },
    triggeredBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'triggered_by'
    },

    // Status
    status: {
        type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
        defaultValue: 'pending'
    },

    // Timing
    startTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'start_time'
    },
    endTime: {
        type: DataTypes.DATE,
        field: 'end_time'
    },
    duration: {
        type: DataTypes.INTEGER, // milliseconds
        field: 'duration'
    },

    // Backup Information
    backupFile: {
        type: DataTypes.STRING,
        field: 'backup_file'
    },
    backupPath: {
        type: DataTypes.STRING,
        field: 'backup_path'
    },
    backupSize: {
        type: DataTypes.BIGINT, // bytes
        field: 'backup_size'
    },
    compressedSize: {
        type: DataTypes.BIGINT, // bytes
        field: 'compressed_size'
    },
    compressionRatio: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'compression_ratio'
    },

    // Encryption
    isEncrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_encrypted'
    },
    encryptionAlgorithm: {
        type: DataTypes.STRING,
        field: 'encryption_algorithm'
    },

    // Statistics
    itemsBackedUp: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'items_backed_up'
        // Structure: { databases, collections, documents, files, totalSize }
    },

    // Error Information
    error: {
        type: DataTypes.JSONB,
        field: 'error'
        // Structure: { message, stack, code }
    },

    // Verification
    checksum: {
        type: DataTypes.STRING,
        field: 'checksum'
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'verified'
    },
    verifiedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'verified_by'
    },
    verifiedAt: {
        type: DataTypes.DATE,
        field: 'verified_at'
    },

    // Cancellation
    cancelledBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'cancelled_by'
    },
    cancellationReason: {
        type: DataTypes.TEXT,
        field: 'cancellation_reason'
    },
    cancelledAt: {
        type: DataTypes.DATE,
        field: 'cancelled_at'
    },

    // Notification
    notificationSent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'notification_sent'
    },
    notificationSentAt: {
        type: DataTypes.DATE,
        field: 'notification_sent_at'
    },

    // Metadata
    serverInfo: {
        type: DataTypes.JSONB,
        field: 'server_info'
        // Structure: { hostname, nodeVersion, platform }
    }
}, {
    tableName: 'backup_executions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['tenant_id']
        },
        {
            fields: ['backup']
        },
        {
            fields: ['backup', 'created_at']
        },
        {
            fields: ['status', 'created_at']
        },
        {
            fields: ['execution_type']
        },
        {
            fields: ['start_time']
        },
        {
            fields: ['tenant_id', 'backup']
        },
        {
            fields: ['tenant_id', 'status']
        }
    ]
});

// Instance Methods

/**
 * Mark execution as completed
 * @param {Object} result - Backup result details
 * @returns {Promise<BackupExecution>}
 */
BackupExecution.prototype.markCompleted = async function (result) {
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

/**
 * Mark execution as failed
 * @param {Error} error - Error object
 * @returns {Promise<BackupExecution>}
 */
BackupExecution.prototype.markFailed = async function (error) {
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

/**
 * Mark execution as verified
 * @param {String} verifiedBy - User ID who verified
 * @returns {Promise<BackupExecution>}
 */
BackupExecution.prototype.markVerified = async function (verifiedBy) {
    this.verified = true;
    this.verifiedAt = new Date();
    this.verifiedBy = verifiedBy;

    return await this.save();
};

/**
 * Mark execution as cancelled
 * @param {String} cancelledBy - User ID who cancelled
 * @param {String} reason - Cancellation reason
 * @returns {Promise<BackupExecution>}
 */
BackupExecution.prototype.markCancelled = async function (cancelledBy, reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    this.cancellationReason = reason;

    return await this.save();
};

// Static Methods

/**
 * Get execution history for a backup
 * @param {String} backupId - Backup ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
BackupExecution.getHistory = async function (backupId, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const where = { backup: backupId };
    if (status) where.status = status;

    return await this.findAll({
        where,
        include: [
            {
                association: 'triggeredByUser',
                attributes: ['id', 'username', 'email']
            }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset: skip
    });
};

/**
 * Get execution statistics
 * @param {String} backupId - Backup ID
 * @param {Number} days - Number of days to look back
 * @returns {Promise<Array>}
 */
BackupExecution.getStatistics = async function (backupId, days = 30) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const executions = await this.findAll({
        where: {
            backup: backupId,
            createdAt: { [Op.gte]: dateThreshold }
        },
        attributes: [
            'status',
            [mainAppDb.fn('COUNT', mainAppDb.col('id')), 'count'],
            [mainAppDb.fn('AVG', mainAppDb.col('duration')), 'avgDuration'],
            [mainAppDb.fn('SUM', mainAppDb.col('backup_size')), 'totalSize'],
            [mainAppDb.fn('AVG', mainAppDb.col('backup_size')), 'avgSize']
        ],
        group: ['status'],
        raw: true
    });

    return executions;
};

/**
 * Cleanup old backups
 * @param {Number} retentionDays - Number of days to retain
 * @returns {Promise<Array>}
 */
BackupExecution.cleanupOldBackups = async function (retentionDays) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - retentionDays);

    const oldBackups = await this.findAll({
        where: {
            createdAt: { [Op.lt]: dateThreshold },
            status: 'completed'
        }
    });

    return oldBackups;
};

/**
 * Get executions by tenant
 * @param {String} tenantId - Tenant ID
 * @returns {Query}
 */
BackupExecution.withTenant = function (tenantId) {
    return this.findAll({ where: { tenantId } });
};

export default BackupExecution;







