/**
 * Backup Controller
 * 
 * Manages backup operations and scheduling
 */
import Backup from '../models/backup.model.js';
import BackupExecution from '../models/backupExecution.model.js';
import SecurityAudit from '../models/securityAudit.model.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);

/**
 * Get all backups
 */
export const getAllBackups = async (req, res) => {
    try {
        const { backupType, isActive, page = 1, limit = 50 } = req.query;

        const query = {};
        if (backupType) query.backupType = backupType;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const backups = await Backup.find(query)
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Backup.countDocuments(query);

        res.json({
            success: true,
            backups,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get backup by ID
 */
export const getBackupById = async (req, res) => {
    try {
        const backup = await Backup.findById(req.params.id)
            .populate('createdBy', 'username email')
            .populate('lastModifiedBy', 'username email');

        if (!backup) {
            return res.status(404).json({ error: 'Backup configuration not found' });
        }

        res.json({
            success: true,
            backup
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create backup configuration
 */
export const createBackup = async (req, res) => {
    try {
        const backupData = {
            ...req.body,
            createdBy: req.user._id
        };

        // Generate encryption key if encryption is enabled
        if (backupData.settings?.encryption?.enabled) {
            const key = crypto.randomBytes(32).toString('hex');
            backupData.settings.encryption.encryptionKey = key;
        }

        const backup = new Backup(backupData);

        // Calculate next run if scheduled
        if (backup.schedule.enabled) {
            backup.schedule.nextRun = backup.calculateNextRun();
        }

        await backup.save();
        await backup.populate('createdBy', 'username email');

        // Log backup creation
        await SecurityAudit.logEvent({
            eventType: 'backup-created',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                backupName: backup.name,
                backupType: backup.backupType
            },
            severity: 'info',
            success: true
        });

        res.status(201).json({
            success: true,
            message: 'Backup configuration created successfully',
            backup
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update backup configuration
 */
export const updateBackup = async (req, res) => {
    try {
        const backup = await Backup.findById(req.params.id);

        if (!backup) {
            return res.status(404).json({ error: 'Backup configuration not found' });
        }

        Object.assign(backup, req.body);
        backup.lastModifiedBy = req.user._id;

        // Recalculate next run if schedule changed
        if (backup.schedule.enabled) {
            backup.schedule.nextRun = backup.calculateNextRun();
        }

        await backup.save();
        await backup.populate('createdBy lastModifiedBy', 'username email');

        res.json({
            success: true,
            message: 'Backup configuration updated successfully',
            backup
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete backup configuration
 */
export const deleteBackup = async (req, res) => {
    try {
        const backup = await Backup.findById(req.params.id);

        if (!backup) {
            return res.status(404).json({ error: 'Backup configuration not found' });
        }

        backup.isActive = false;
        await backup.save();

        res.json({
            success: true,
            message: 'Backup configuration deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Execute backup manually
 */
export const executeBackup = async (req, res) => {
    try {
        const backup = await Backup.findById(req.params.id);

        if (!backup) {
            return res.status(404).json({ error: 'Backup configuration not found' });
        }

        // Create execution record
        const execution = new BackupExecution({
            backup: backup._id,
            backupName: backup.name,
            executionType: 'manual',
            triggeredBy: req.user._id,
            status: 'running',
            serverInfo: {
                hostname: require('os').hostname(),
                nodeVersion: process.version,
                platform: process.platform
            }
        });

        await execution.save();

        // Execute backup asynchronously
        performBackup(backup, execution).catch(console.error);

        res.json({
            success: true,
            message: 'Backup execution started',
            executionId: execution._id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Helper: Perform backup operation
 */
async function performBackup(backup, execution) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(backup.storage.location, backup.backupType);

        // Ensure backup directory exists
        await fs.mkdir(backupDir, { recursive: true });

        let result = {};

        switch (backup.backupType) {
            case 'database':
                result = await performDatabaseBackup(backup, backupDir, timestamp);
                break;
            case 'files':
                result = await performFileBackup(backup, backupDir, timestamp);
                break;
            case 'configuration':
                result = await performConfigBackup(backup, backupDir, timestamp);
                break;
            case 'full':
                result = await performFullBackup(backup, backupDir, timestamp);
                break;
            case 'incremental':
                result = await performIncrementalBackup(backup, backupDir, timestamp);
                break;
        }

        // Mark execution as completed
        await execution.markCompleted(result);
        await backup.updateStats(execution);

        // Update schedule
        if (backup.schedule.enabled) {
            backup.schedule.lastRun = new Date();
            backup.schedule.nextRun = backup.calculateNextRun();
            await backup.save();
        }

        // Send notification
        if (backup.settings.notification.enabled && backup.settings.notification.onSuccess) {
            await sendBackupNotification(backup, execution, 'success');
        }

        // Cleanup old backups
        if (backup.settings.retention.enabled) {
            await cleanupOldBackups(backup);
        }

    } catch (error) {
        console.error('Backup execution failed:', error);
        await execution.markFailed(error);

        // Send failure notification
        if (backup.settings.notification.enabled && backup.settings.notification.onFailure) {
            await sendBackupNotification(backup, execution, 'failure');
        }
    }
}

/**
 * Helper: Perform database backup
 */
async function performDatabaseBackup(backup, backupDir, timestamp) {
    const backupFile = `database-${timestamp}.gz`;
    const backupPath = path.join(backupDir, backupFile);

    // MongoDB dump command
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';
    const dbName = mongoUri.split('/').pop().split('?')[0];

    let command = `mongodump --uri="${mongoUri}" --archive="${backupPath}" --gzip`;

    // Add specific collections if specified
    if (backup.sources.databases && backup.sources.databases.length > 0) {
        backup.sources.databases.forEach(db => {
            if (db.collections && db.collections.length > 0) {
                db.collections.forEach(collection => {
                    command += ` --collection=${collection}`;
                });
            }
        });
    }

    const { stdout, stderr } = await execAsync(command);

    const stats = await fs.stat(backupPath);
    const backupSize = stats.size;

    let finalPath = backupPath;
    let isEncrypted = false;
    let encryptionAlgorithm = null;

    // Encrypt if enabled
    if (backup.settings.encryption.enabled) {
        finalPath = await encryptFile(backupPath, backup.settings.encryption);
        await fs.unlink(backupPath); // Remove unencrypted file
        isEncrypted = true;
        encryptionAlgorithm = backup.settings.encryption.algorithm;
    }

    const finalStats = await fs.stat(finalPath);

    return {
        backupFile: path.basename(finalPath),
        backupPath: finalPath,
        backupSize,
        compressedSize: finalStats.size,
        compressionRatio: (backupSize / finalStats.size).toFixed(2),
        isEncrypted,
        encryptionAlgorithm,
        itemsBackedUp: {
            databases: 1,
            collections: 0,
            documents: 0
        },
        checksum: await calculateChecksum(finalPath)
    };
}

/**
 * Helper: Perform file backup
 */
async function performFileBackup(backup, backupDir, timestamp) {
    const backupFile = `files-${timestamp}.tar.gz`;
    const backupPath = path.join(backupDir, backupFile);

    // Create tar.gz of specified file paths
    const filePaths = backup.sources.filePaths.join(' ');
    const command = `tar -czf "${backupPath}" ${filePaths}`;

    await execAsync(command);

    const stats = await fs.stat(backupPath);

    return {
        backupFile,
        backupPath,
        backupSize: stats.size,
        compressedSize: stats.size,
        compressionRatio: 1,
        isEncrypted: false,
        itemsBackedUp: {
            files: backup.sources.filePaths.length
        },
        checksum: await calculateChecksum(backupPath)
    };
}

/**
 * Helper: Perform configuration backup
 */
async function performConfigBackup(backup, backupDir, timestamp) {
    const backupFile = `config-${timestamp}.tar.gz`;
    const backupPath = path.join(backupDir, backupFile);

    const configFiles = backup.sources.configFiles.join(' ');
    const command = `tar -czf "${backupPath}" ${configFiles}`;

    await execAsync(command);

    const stats = await fs.stat(backupPath);

    return {
        backupFile,
        backupPath,
        backupSize: stats.size,
        compressedSize: stats.size,
        compressionRatio: 1,
        isEncrypted: false,
        itemsBackedUp: {
            files: backup.sources.configFiles.length
        },
        checksum: await calculateChecksum(backupPath)
    };
}

/**
 * Helper: Perform full backup
 */
async function performFullBackup(backup, backupDir, timestamp) {
    // Combine database and file backups
    const dbResult = await performDatabaseBackup(backup, backupDir, timestamp);
    const fileResult = await performFileBackup(backup, backupDir, timestamp);

    return {
        backupFile: `full-${timestamp}`,
        backupPath: backupDir,
        backupSize: dbResult.backupSize + fileResult.backupSize,
        compressedSize: dbResult.compressedSize + fileResult.compressedSize,
        itemsBackedUp: {
            ...dbResult.itemsBackedUp,
            ...fileResult.itemsBackedUp
        }
    };
}

/**
 * Helper: Perform incremental backup
 */
async function performIncrementalBackup(backup, backupDir, timestamp) {
    // Get last backup timestamp
    const lastExecution = await BackupExecution.findOne({
        backup: backup._id,
        status: 'completed'
    }).sort({ createdAt: -1 });

    const since = lastExecution ? lastExecution.createdAt : new Date(0);

    // Only backup files modified since last backup
    const backupFile = `incremental-${timestamp}.tar.gz`;
    const backupPath = path.join(backupDir, backupFile);

    const filePaths = backup.sources.filePaths.join(' ');
    const command = `find ${filePaths} -newermt "${since.toISOString()}" -type f | tar -czf "${backupPath}" -T -`;

    await execAsync(command);

    const stats = await fs.stat(backupPath);

    return {
        backupFile,
        backupPath,
        backupSize: stats.size,
        compressedSize: stats.size,
        compressionRatio: 1,
        isEncrypted: false,
        checksum: await calculateChecksum(backupPath)
    };
}

/**
 * Helper: Encrypt file
 */
async function encryptFile(filePath, encryptionSettings) {
    const algorithm = encryptionSettings.algorithm;
    const key = Buffer.from(encryptionSettings.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encryptedPath = `${filePath}.enc`;
    const input = createReadStream(filePath);
    const output = createWriteStream(encryptedPath);

    // Write IV to beginning of file
    output.write(iv);

    await pipeline(input, cipher, output);

    return encryptedPath;
}

/**
 * Helper: Calculate file checksum
 */
async function calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = createReadStream(filePath);

        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

/**
 * Helper: Send backup notification
 */
async function sendBackupNotification(backup, execution, type) {
    // Placeholder for email notification
    console.log(`Backup ${type} notification:`, {
        backup: backup.name,
        status: execution.status,
        duration: execution.duration,
        size: execution.backupSize
    });
}

/**
 * Helper: Cleanup old backups
 */
async function cleanupOldBackups(backup) {
    const oldBackups = await BackupExecution.cleanupOldBackups(backup.settings.retention.days);

    for (const oldBackup of oldBackups) {
        if (oldBackup.backupPath) {
            try {
                await fs.unlink(oldBackup.backupPath);
            } catch (err) {
                console.error('Failed to delete old backup file:', err);
            }
        }
    }
}

/**
 * Get execution history
 */
export const getExecutionHistory = async (req, res) => {
    try {
        const { backupId } = req.params;
        const { limit = 50, page = 1, status } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const history = await BackupExecution.getHistory(backupId, {
            limit: parseInt(limit),
            skip,
            status
        });

        const total = await BackupExecution.countDocuments({ backup: backupId });

        res.json({
            success: true,
            history,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get backup statistics
 */
export const getBackupStatistics = async (req, res) => {
    try {
        const { backupId } = req.params;
        const { days = 30 } = req.query;

        const stats = await BackupExecution.getStatistics(backupId, parseInt(days));

        res.json({
            success: true,
            statistics: stats,
            period: `Last ${days} days`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Restore from backup
 */
export const restoreBackup = async (req, res) => {
    try {
        const { executionId } = req.params;

        const execution = await BackupExecution.findById(executionId);

        if (!execution) {
            return res.status(404).json({ error: 'Backup execution not found' });
        }

        if (execution.status !== 'completed') {
            return res.status(400).json({ error: 'Cannot restore from incomplete backup' });
        }

        // Log restore action
        await SecurityAudit.logEvent({
            eventType: 'backup-restored',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                executionId: execution._id,
                backupFile: execution.backupFile
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'Restore initiated',
            execution
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
