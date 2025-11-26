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
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);

class BackupSchedulerService {
    constructor() {
        this.scheduledJobs = new Map();
    }

    /**
     * Initialize scheduler - load all active scheduled backups
     */
    async initialize() {
        try {
            console.log('🔄 Initializing backup scheduler...');
            
            const scheduledBackups = await Backup.find({
                'schedule.enabled': true,
                isActive: true
            });

            for (const backup of scheduledBackups) {
                this.scheduleBackup(backup);
            }

            console.log(`✅ Scheduled ${scheduledBackups.length} automatic backups`);
        } catch (error) {
            console.error('❌ Failed to initialize backup scheduler:', error);
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
            console.warn(`⚠️  Invalid schedule for backup: ${backup.name}`);
            return;
        }

        const job = cron.schedule(cronExpression, async () => {
            console.log(`🔄 Running scheduled backup: ${backup.name}`);
            await this.executeBackup(backup);
        });

        this.scheduledJobs.set(backup._id.toString(), job);
        console.log(`📅 Scheduled backup: ${backup.name} - ${cronExpression}`);
    }

    /**
     * Cancel a scheduled backup
     */
    cancelBackup(backupId) {
        const job = this.scheduledJobs.get(backupId);
        if (job) {
            job.stop();
            this.scheduledJobs.delete(backupId);
            console.log(`🛑 Cancelled scheduled backup: ${backupId}`);
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

            console.log(`✅ Backup completed: ${backup.name}`);

            // Send backup via email if notification is enabled
            if (backup.settings?.notification?.enabled && backup.settings?.notification?.onSuccess) {
                await this.sendBackupEmail(backup, execution);
            }

            // Cleanup old backups
            if (backup.settings.retention.enabled) {
                await this.cleanupOldBackups(backup);
            }

        } catch (error) {
            console.error(`❌ Backup failed: ${backup.name}`, error);
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
     * Perform file backup
     */
    async performFileBackup(backup, backupDir, timestamp) {
        const backupFile = `files-${timestamp}.tar.gz`;
        const backupPath = path.join(backupDir, backupFile);

        const filePaths = backup.sources.filePaths.join(' ');
        const command = `tar -czf "${backupPath}" ${filePaths}`;

        await execAsync(command);

        const stats = await fs.stat(backupPath);

        return {
            backupFile,
            backupPath,
            backupSize: stats.size,
            compressedSize: stats.size,
            checksum: await this.calculateChecksum(backupPath)
        };
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
                        console.log(`🗑️  Deleted old backup: ${execution.backupFile}`);
                    } catch (err) {
                        console.error('Failed to delete backup file:', err);
                    }
                }
                await execution.deleteOne();
            }

            if (oldExecutions.length > 0) {
                console.log(`🗑️  Cleaned up ${oldExecutions.length} old backups`);
            }
        } catch (error) {
            console.error('Failed to cleanup old backups:', error);
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
                console.log('ℹ️  No email recipients configured for backup notifications');
                return;
            }

            console.log(`📧 Sending backup to ${recipients.length} recipient(s)...`);

            for (const recipientEmail of recipients) {
                try {
                    await backupEmail.sendBackupEmail(backup, execution, recipientEmail);
                } catch (error) {
                    // Log error but don't stop the backup process
                    console.error(`⚠️  Failed to send backup email to ${recipientEmail}:`, error.message);
                }
            }
        } catch (error) {
            // Log error but don't stop the backup process
            console.error('⚠️  Error in email sending process:', error.message);
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
                console.log('ℹ️  Email not configured. Skipping failure notification.');
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
                    console.log(`📧 Failure notification sent to: ${recipientEmail}`);
                } catch (err) {
                    console.error(`⚠️  Failed to send failure email to ${recipientEmail}:`, err.message);
                }
            }
        } catch (error) {
            console.error('⚠️  Error sending failure emails:', error.message);
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
        console.log('🛑 All backup schedules stopped');
    }
}

// Export singleton instance
const backupScheduler = new BackupSchedulerService();
export default backupScheduler;
