/**
 * Backup Scheduler Service
 * Automatically executes scheduled backups
 */
import cron from 'node-cron';
import os from 'os';
import Backup from '../models/backup.model.js';
import BackupExecution from '../models/backupExecution.model.js';
import mongooseBackup from './mongooseBackup.service.js';
import backupEmail from './backupEmail.service.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

class BackupSchedulerService {
    constructor() {
        this.scheduledJobs = new Map();
    }

    /**
     * Initialize scheduler - load all active scheduled backups
     */
    async initialize() {
        try {

            const scheduledBackups = await Backup.find({
                'schedule.enabled': true,
                isActive: true
            });

            for (const backup of scheduledBackups) {
                this.scheduleBackup(backup);
            }

        } catch (error) {

        }
    }

    /**
     * Schedule a backup job
     */
    scheduleBackup(backup) {
        // Remove existing job if any
        this.cancelBackup(backup._id.toString());

        const cronExpression = this.getCronExpression(backup.schedule);
        
        if (!cronExpression) {

            return;
        }

        const job = cron.schedule(cronExpression, async () => {

            await this.executeBackup(backup);
        });

        this.scheduledJobs.set(backup._id.toString(), job);

    }

    /**
     * Cancel a scheduled backup
     */
    cancelBackup(backupId) {
        const job = this.scheduledJobs.get(backupId);
        if (job) {
            job.stop();
            this.scheduledJobs.delete(backupId);

        }
    }

    /**
     * Convert backup schedule to cron expression
     */
    getCronExpression(schedule) {
        if (schedule.cronExpression) {
            return schedule.cronExpression;
        }

        const [hours, minutes] = (schedule.time || '00:00').split(':');

        switch (schedule.frequency) {
            case 'daily':
                return `${minutes} ${hours} * * *`;
            case 'weekly':
                const dayOfWeek = schedule.dayOfWeek || 0;
                return `${minutes} ${hours} * * ${dayOfWeek}`;
            case 'monthly':
                const dayOfMonth = schedule.dayOfMonth || 1;
                return `${minutes} ${hours} ${dayOfMonth} * *`;
            case 'hourly':
                return `${minutes} * * * *`;
            default:
                return null;
        }
    }

    /**
     * Execute backup
     */
    async executeBackup(backup) {
        let execution = null;
        
        try {
            // Create execution record
            execution = new BackupExecution({
                backup: backup._id,
                backupName: backup.name,
                executionType: 'scheduled',
                status: 'running',
                serverInfo: {
                    hostname: os.hostname(),
                    nodeVersion: process.version,
                    platform: process.platform
                }
            });

            await execution.save();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(backup.storage.location, backup.backupType);

            // Ensure backup directory exists
            await fs.mkdir(backupDir, { recursive: true });

            let result = {};

            switch (backup.backupType) {
                case 'database':
                    result = await this.performDatabaseBackup(backup, backupDir, timestamp);
                    break;
                case 'files':
                    result = await this.performFileBackup(backup, backupDir, timestamp);
                    break;
                case 'full':
                    result = await this.performFullBackup(backup, backupDir, timestamp);
                    break;
                default:
                    throw new Error(`Unsupported backup type: ${backup.backupType}`);
            }

            // Mark execution as completed
            await execution.markCompleted(result);
            await backup.updateStats(execution);

            // Update schedule
            backup.schedule.lastRun = new Date();
            backup.schedule.nextRun = backup.calculateNextRun();
            await backup.save();

            // Send backup via email if notification is enabled
            if (backup.settings?.notification?.enabled && backup.settings?.notification?.onSuccess) {
                await this.sendBackupEmail(backup, execution);
            }

            // Cleanup old backups
            if (backup.settings.retention.enabled) {
                await this.cleanupOldBackups(backup);
            }

        } catch (error) {

            if (execution) {
                await execution.markFailed(error);
            }
            
            // Send failure notification if enabled
            if (backup.settings?.notification?.enabled && backup.settings?.notification?.onFailure) {
                await this.sendFailureEmail(backup, execution, error);
            }
        }
    }

    /**
     * Perform database backup
     */
    async performDatabaseBackup(backup, backupDir, timestamp) {
        // Use Mongoose-based backup (works without mongodump)
        return await mongooseBackup.performDatabaseBackup(backup, backupDir, timestamp);
    }

    /**
     * Perform file backup using archiver (cross-platform)
     */
    async performFileBackup(backup, backupDir, timestamp) {
        const backupFile = `files-${timestamp}.zip`;
        const backupPath = path.join(backupDir, backupFile);

        // Create write stream
        const output = createWriteStream(backupPath);
        const archive = archiver('zip', {
            zlib: { level: 6 } // Compression level
        });

        // Track total size before compression
        let totalSize = 0;

        // Promise to handle archive completion
        const archivePromise = new Promise((resolve, reject) => {
            output.on('close', () => {
                resolve();
            });
            archive.on('error', (err) => {
                reject(err);
            });
            output.on('error', (err) => {
                reject(err);
            });
        });

        // Pipe archive to output
        archive.pipe(output);

        // Add files/directories to archive
        for (const filePath of backup.sources.filePaths) {
            const fullPath = path.resolve(filePath);
            
            // Check if path exists
            if (!existsSync(fullPath)) {

                continue;
            }

            const stats = await fs.stat(fullPath);
            
            if (stats.isDirectory()) {

                archive.directory(fullPath, path.basename(fullPath));
                // Approximate size for directories
                totalSize += await this.getDirectorySize(fullPath);
            } else {

                archive.file(fullPath, { name: path.basename(fullPath) });
                totalSize += stats.size;
            }
        }

        // Finalize archive
        await archive.finalize();
        await archivePromise;

        const stats = await fs.stat(backupPath);

        return {
            backupFile,
            backupPath,
            backupSize: totalSize,
            compressedSize: stats.size,
            compressionRatio: totalSize > 0 ? (totalSize / stats.size).toFixed(2) : 1,
            checksum: await this.calculateChecksum(backupPath)
        };
    }

    /**
     * Calculate directory size recursively
     */
    async getDirectorySize(dirPath) {
        let totalSize = 0;
        
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    totalSize += await this.getDirectorySize(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                }
            }
        } catch (error) {

        }
        
        return totalSize;
    }

    /**
     * Perform full backup
     */
    async performFullBackup(backup, backupDir, timestamp) {
        const dbResult = await this.performDatabaseBackup(backup, backupDir, timestamp);
        
        let fileResult = { backupSize: 0, compressedSize: 0 };
        if (backup.sources.filePaths && backup.sources.filePaths.length > 0) {
            fileResult = await this.performFileBackup(backup, backupDir, timestamp);
        }

        return {
            backupFile: `full-${timestamp}`,
            backupPath: backupDir,
            backupSize: dbResult.backupSize + fileResult.backupSize,
            compressedSize: dbResult.compressedSize + fileResult.compressedSize
        };
    }

    /**
     * Encrypt file
     */
    async encryptFile(filePath, encryptionSettings) {
        const algorithm = encryptionSettings.algorithm || 'aes-256-cbc';
        const key = Buffer.from(encryptionSettings.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);

        const encryptedPath = `${filePath}.enc`;
        const input = createReadStream(filePath);
        const output = createWriteStream(encryptedPath);

        output.write(iv);
        await pipeline(input, cipher, output);

        return encryptedPath;
    }

    /**
     * Calculate file checksum
     */
    async calculateChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = createReadStream(filePath);

            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Cleanup old backups
     */
    async cleanupOldBackups(backup) {
        try {
            const retentionDays = backup.settings.retention.days;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const oldExecutions = await BackupExecution.find({
                backup: backup._id,
                createdAt: { $lt: cutoffDate },
                status: 'completed'
            });

            for (const execution of oldExecutions) {
                if (execution.backupPath) {
                    try {
                        await fs.unlink(execution.backupPath);

                    } catch (err) {

                    }
                }
                await execution.deleteOne();
            }

            if (oldExecutions.length > 0) {

            }
        } catch (error) {

        }
    }

    /**
     * Send backup via email
     */
    async sendBackupEmail(backup, execution) {
        try {
            // Get recipient email from backup settings or use admin email
            const recipients = backup.settings?.notification?.recipients || [];
            
            if (recipients.length === 0) {

                return;
            }

            for (const recipientEmail of recipients) {
                try {
                    await backupEmail.sendBackupEmail(backup, execution, recipientEmail);
                } catch (error) {
                    // Log error but don't stop the backup process

                }
            }
        } catch (error) {
            // Log error but don't stop the backup process

        }
    }

    /**
     * Send failure notification email
     */
    async sendFailureEmail(backup, execution, error) {
        try {
            const recipients = backup.settings?.notification?.recipients || [];
            
            if (recipients.length === 0) {
                return;
            }

            // Check if email is configured
            if (!backupEmail.transporter) {

                return;
            }

            for (const recipientEmail of recipients) {
                try {
                    const mailOptions = {
                        from: `"HR System Backup" <${process.env.GMAIL_USER || process.env.EMAIL_USER}>`,
                        to: recipientEmail,
                        subject: `❌ Backup Failed: ${backup.name}`,
                        html: `
                            <h2>Backup Failed</h2>
                            <p><strong>Backup:</strong> ${backup.name}</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>Error:</strong> ${error.message}</p>
                            <p>Please check the server logs for more details.</p>
                        `
                    };

                    await backupEmail.transporter.sendMail(mailOptions);

                } catch (err) {

                }
            }
        } catch (error) {

        }
    }

    /**
     * Stop all scheduled jobs
     */
    stopAll() {
        for (const [backupId, job] of this.scheduledJobs) {
            job.stop();
        }
        this.scheduledJobs.clear();

    }
}

// Export singleton instance
const backupScheduler = new BackupSchedulerService();
export default backupScheduler;
