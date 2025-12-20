import cron from 'node-cron';
import BackupService from './backupService.js';
import winston from 'winston';
import path from 'path';

/**
 * Backup Scheduler Service
 * Handles automated scheduling of daily, weekly, and monthly backups
 * with retention policies and monitoring
 */
class BackupScheduler {
    constructor() {
        this.backupService = new BackupService();
        this.isRunning = false;
        this.scheduledTasks = new Map();
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(process.cwd(), 'logs', 'backup-scheduler.log') 
                }),
                new winston.transports.Console()
            ]
        });
    }

    /**
     * Start the backup scheduler
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('Backup scheduler is already running');
            return;
        }

        this.logger.info('Starting backup scheduler');

        try {
            // Daily backup at 2:00 AM
            const dailyTask = cron.schedule('0 2 * * *', async () => {
                await this.runDailyBackup();
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            // Weekly backup on Sunday at 3:00 AM
            const weeklyTask = cron.schedule('0 3 * * 0', async () => {
                await this.runWeeklyBackup();
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            // Monthly backup on 1st day at 4:00 AM
            const monthlyTask = cron.schedule('0 4 1 * *', async () => {
                await this.runMonthlyBackup();
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            // Retention policy cleanup daily at 5:00 AM
            const cleanupTask = cron.schedule('0 5 * * *', async () => {
                await this.runRetentionCleanup();
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            // Key rotation monthly on 15th at 6:00 AM
            const keyRotationTask = cron.schedule('0 6 15 * *', async () => {
                await this.runKeyRotation();
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            // Store scheduled tasks
            this.scheduledTasks.set('daily', dailyTask);
            this.scheduledTasks.set('weekly', weeklyTask);
            this.scheduledTasks.set('monthly', monthlyTask);
            this.scheduledTasks.set('cleanup', cleanupTask);
            this.scheduledTasks.set('keyRotation', keyRotationTask);

            // Start all tasks
            this.scheduledTasks.forEach((task, name) => {
                task.start();
                this.logger.info(`Started ${name} backup task`);
            });

            this.isRunning = true;
            this.logger.info('Backup scheduler started successfully');

        } catch (error) {
            this.logger.error('Failed to start backup scheduler', { error: error.message });
            throw error;
        }
    }

    /**
     * Stop the backup scheduler
     */
    stop() {
        if (!this.isRunning) {
            this.logger.warn('Backup scheduler is not running');
            return;
        }

        this.logger.info('Stopping backup scheduler');

        try {
            this.scheduledTasks.forEach((task, name) => {
                task.stop();
                this.logger.info(`Stopped ${name} backup task`);
            });

            this.scheduledTasks.clear();
            this.isRunning = false;
            this.logger.info('Backup scheduler stopped successfully');

        } catch (error) {
            this.logger.error('Failed to stop backup scheduler', { error: error.message });
            throw error;
        }
    }

    /**
     * Run daily backup
     */
    async runDailyBackup() {
        this.logger.info('Starting scheduled daily backup');
        
        try {
            const startTime = Date.now();
            const result = await this.backupService.createDailyBackup();
            const duration = Date.now() - startTime;

            this.logger.info('Scheduled daily backup completed', {
                backupId: result.id,
                duration: `${duration}ms`,
                size: result.size,
                components: result.components.length
            });

            // Send success notification
            await this.sendBackupNotification('daily', 'success', result);

        } catch (error) {
            this.logger.error('Scheduled daily backup failed', { error: error.message });
            
            // Send failure notification
            await this.sendBackupNotification('daily', 'failure', { error: error.message });
            
            throw error;
        }
    }

    /**
     * Run weekly backup (copy from latest daily)
     */
    async runWeeklyBackup() {
        this.logger.info('Starting scheduled weekly backup');
        
        try {
            // Create a fresh backup for weekly retention
            const result = await this.backupService.createDailyBackup();
            
            // Move to weekly directory
            const weeklyPath = result.finalPath.replace('/daily/', '/weekly/');
            const fs = await import('fs');
            fs.renameSync(result.finalPath, weeklyPath);
            
            // Update metadata
            result.type = 'weekly';
            result.finalPath = weeklyPath;
            await this.backupService.saveBackupMetadata(result);

            this.logger.info('Scheduled weekly backup completed', {
                backupId: result.id,
                size: result.size
            });

            await this.sendBackupNotification('weekly', 'success', result);

        } catch (error) {
            this.logger.error('Scheduled weekly backup failed', { error: error.message });
            await this.sendBackupNotification('weekly', 'failure', { error: error.message });
            throw error;
        }
    }

    /**
     * Run monthly backup (copy from latest daily)
     */
    async runMonthlyBackup() {
        this.logger.info('Starting scheduled monthly backup');
        
        try {
            // Create a fresh backup for monthly retention
            const result = await this.backupService.createDailyBackup();
            
            // Move to monthly directory
            const monthlyPath = result.finalPath.replace('/daily/', '/monthly/');
            const fs = await import('fs');
            fs.renameSync(result.finalPath, monthlyPath);
            
            // Update metadata
            result.type = 'monthly';
            result.finalPath = monthlyPath;
            await this.backupService.saveBackupMetadata(result);

            this.logger.info('Scheduled monthly backup completed', {
                backupId: result.id,
                size: result.size
            });

            await this.sendBackupNotification('monthly', 'success', result);

        } catch (error) {
            this.logger.error('Scheduled monthly backup failed', { error: error.message });
            await this.sendBackupNotification('monthly', 'failure', { error: error.message });
            throw error;
        }
    }

    /**
     * Run retention policy cleanup
     */
    async runRetentionCleanup() {
        this.logger.info('Starting scheduled retention cleanup');
        
        try {
            await this.backupService.applyRetentionPolicies();
            this.logger.info('Scheduled retention cleanup completed');

        } catch (error) {
            this.logger.error('Scheduled retention cleanup failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Run encryption key rotation
     */
    async runKeyRotation() {
        this.logger.info('Starting scheduled key rotation');
        
        try {
            await this.backupService.rotateEncryptionKey();
            this.logger.info('Scheduled key rotation completed');

            await this.sendBackupNotification('key-rotation', 'success', {
                message: 'Encryption key rotated successfully'
            });

        } catch (error) {
            this.logger.error('Scheduled key rotation failed', { error: error.message });
            await this.sendBackupNotification('key-rotation', 'failure', { error: error.message });
            throw error;
        }
    }

    /**
     * Send backup notification (email/webhook)
     */
    async sendBackupNotification(type, status, data) {
        try {
            // This would integrate with the existing notification system
            this.logger.info('Backup notification sent', {
                type,
                status,
                timestamp: new Date().toISOString()
            });

            // TODO: Integrate with email service or webhook
            // await emailService.sendBackupNotification(type, status, data);

        } catch (error) {
            this.logger.warn('Failed to send backup notification', { error: error.message });
        }
    }

    /**
     * Run manual backup
     */
    async runManualBackup(type = 'manual') {
        this.logger.info('Starting manual backup', { type });
        
        try {
            const result = await this.backupService.createDailyBackup();
            result.type = type;
            
            this.logger.info('Manual backup completed', {
                backupId: result.id,
                type,
                size: result.size
            });

            return result;

        } catch (error) {
            this.logger.error('Manual backup failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        const taskStatuses = {};
        
        this.scheduledTasks.forEach((task, name) => {
            taskStatuses[name] = {
                running: task.running,
                scheduled: task.scheduled
            };
        });

        return {
            isRunning: this.isRunning,
            tasks: taskStatuses,
            nextRuns: this.getNextRunTimes()
        };
    }

    /**
     * Get next run times for all scheduled tasks
     */
    getNextRunTimes() {
        const nextRuns = {};
        
        // Calculate next run times based on cron expressions
        const now = new Date();
        
        // Daily backup at 2:00 AM
        const nextDaily = new Date(now);
        nextDaily.setHours(2, 0, 0, 0);
        if (nextDaily <= now) {
            nextDaily.setDate(nextDaily.getDate() + 1);
        }
        nextRuns.daily = nextDaily.toISOString();

        // Weekly backup on Sunday at 3:00 AM
        const nextWeekly = new Date(now);
        nextWeekly.setHours(3, 0, 0, 0);
        const daysUntilSunday = (7 - nextWeekly.getDay()) % 7;
        nextWeekly.setDate(nextWeekly.getDate() + daysUntilSunday);
        if (nextWeekly <= now) {
            nextWeekly.setDate(nextWeekly.getDate() + 7);
        }
        nextRuns.weekly = nextWeekly.toISOString();

        // Monthly backup on 1st at 4:00 AM
        const nextMonthly = new Date(now);
        nextMonthly.setDate(1);
        nextMonthly.setHours(4, 0, 0, 0);
        if (nextMonthly <= now) {
            nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        nextRuns.monthly = nextMonthly.toISOString();

        return nextRuns;
    }

    /**
     * Update backup schedule
     */
    updateSchedule(scheduleConfig) {
        this.logger.info('Updating backup schedule', { scheduleConfig });
        
        try {
            // Stop current scheduler
            this.stop();
            
            // Update configuration
            // This would update the cron expressions based on config
            
            // Restart with new schedule
            this.start();
            
            this.logger.info('Backup schedule updated successfully');

        } catch (error) {
            this.logger.error('Failed to update backup schedule', { error: error.message });
            throw error;
        }
    }
}

export default BackupScheduler;