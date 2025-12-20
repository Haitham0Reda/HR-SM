import cron from 'node-cron';
import ModuleAwareBackupService from './moduleAwareBackupService.js';
import BackupScheduler from './backupScheduler.js';
import winston from 'winston';
import path from 'path';

/**
 * Module-Aware Backup Scheduler Service
 * Extends the base backup scheduler to include module-aware backup functionality
 * Handles automated scheduling with module collection awareness
 */
class ModuleAwareBackupScheduler extends BackupScheduler {
    constructor() {
        super();
        this.moduleAwareBackupService = new ModuleAwareBackupService();
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(process.cwd(), 'logs', 'module-aware-backup-scheduler.log') 
                }),
                new winston.transports.Console()
            ]
        });
    }

    /**
     * Start the module-aware backup scheduler
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('Module-aware backup scheduler is already running');
            return;
        }

        this.logger.info('Starting module-aware backup scheduler');

        try {
            // Daily system-wide module-aware backup at 2:00 AM
            const dailySystemTask = cron.schedule('0 2 * * *', async () => {
                await this.runDailyModuleAwareBackup();
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            // Weekly system-wide backup on Sunday at 3:00 AM
            const weeklySystemTask = cron.schedule('0 3 * * 0', async () => {
                await this.runWeeklyModuleAwareBackup();
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            // Monthly system-wide backup on 1st day at 4:00 AM
            const monthlySystemTask = cron.schedule('0 4 1 * *', async () => {
                await this.runMonthlyModuleAwareBackup();
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            // Module collection verification daily at 1:30 AM (before backup)
            const verificationTask = cron.schedule('30 1 * * *', async () => {
                await this.runModuleCollectionVerification();
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
            this.scheduledTasks.set('dailySystem', dailySystemTask);
            this.scheduledTasks.set('weeklySystem', weeklySystemTask);
            this.scheduledTasks.set('monthlySystem', monthlySystemTask);
            this.scheduledTasks.set('verification', verificationTask);
            this.scheduledTasks.set('cleanup', cleanupTask);
            this.scheduledTasks.set('keyRotation', keyRotationTask);

            // Start all tasks
            this.scheduledTasks.forEach((task, name) => {
                task.start();
                this.logger.info(`Started ${name} module-aware backup task`);
            });

            this.isRunning = true;
            this.logger.info('Module-aware backup scheduler started successfully');

        } catch (error) {
            this.logger.error('Failed to start module-aware backup scheduler', { error: error.message });
            throw error;
        }
    }

    /**
     * Run daily module-aware backup (system-wide)
     */
    async runDailyModuleAwareBackup() {
        this.logger.info('Starting scheduled daily module-aware backup');
        
        try {
            const startTime = Date.now();
            const result = await this.moduleAwareBackupService.createModuleAwareDailyBackup();
            const duration = Date.now() - startTime;

            this.logger.info('Scheduled daily module-aware backup completed', {
                backupId: result.id,
                duration: `${duration}ms`,
                size: result.size,
                components: result.components.length,
                enabledModules: result.enabledModules,
                moduleAware: result.moduleAware
            });

            // Send success notification
            await this.sendModuleAwareBackupNotification('daily-system', 'success', result);

        } catch (error) {
            this.logger.error('Scheduled daily module-aware backup failed', { error: error.message });
            
            // Send failure notification
            await this.sendModuleAwareBackupNotification('daily-system', 'failure', { error: error.message });
            
            throw error;
        }
    }

    /**
     * Run weekly module-aware backup
     */
    async runWeeklyModuleAwareBackup() {
        this.logger.info('Starting scheduled weekly module-aware backup');
        
        try {
            // Create a fresh module-aware backup for weekly retention
            const result = await this.moduleAwareBackupService.createModuleAwareDailyBackup();
            
            // Move to weekly directory
            const weeklyPath = result.finalPath.replace('/daily/', '/weekly/');
            const fs = await import('fs');
            fs.renameSync(result.finalPath, weeklyPath);
            
            // Update metadata
            result.type = 'weekly';
            result.finalPath = weeklyPath;
            await this.moduleAwareBackupService.saveBackupMetadata(result);

            this.logger.info('Scheduled weekly module-aware backup completed', {
                backupId: result.id,
                size: result.size,
                enabledModules: result.enabledModules
            });

            await this.sendModuleAwareBackupNotification('weekly-system', 'success', result);

        } catch (error) {
            this.logger.error('Scheduled weekly module-aware backup failed', { error: error.message });
            await this.sendModuleAwareBackupNotification('weekly-system', 'failure', { error: error.message });
            throw error;
        }
    }

    /**
     * Run monthly module-aware backup
     */
    async runMonthlyModuleAwareBackup() {
        this.logger.info('Starting scheduled monthly module-aware backup');
        
        try {
            // Create a fresh module-aware backup for monthly retention
            const result = await this.moduleAwareBackupService.createModuleAwareDailyBackup();
            
            // Move to monthly directory
            const monthlyPath = result.finalPath.replace('/daily/', '/monthly/');
            const fs = await import('fs');
            fs.renameSync(result.finalPath, monthlyPath);
            
            // Update metadata
            result.type = 'monthly';
            result.finalPath = monthlyPath;
            await this.moduleAwareBackupService.saveBackupMetadata(result);

            this.logger.info('Scheduled monthly module-aware backup completed', {
                backupId: result.id,
                size: result.size,
                enabledModules: result.enabledModules
            });

            await this.sendModuleAwareBackupNotification('monthly-system', 'success', result);

        } catch (error) {
            this.logger.error('Scheduled monthly module-aware backup failed', { error: error.message });
            await this.sendModuleAwareBackupNotification('monthly-system', 'failure', { error: error.message });
            throw error;
        }
    }

    /**
     * Run module collection verification
     */
    async runModuleCollectionVerification() {
        this.logger.info('Starting scheduled module collection verification');
        
        try {
            const verification = await this.moduleAwareBackupService.verifyModuleCollections();
            
            this.logger.info('Scheduled module collection verification completed', {
                status: verification.verificationStatus,
                expectedCollections: verification.expectedCollections.length,
                missingCollections: verification.missingCollections.length,
                extraCollections: verification.extraCollections.length
            });

            // Send notification if there are issues
            if (verification.verificationStatus !== 'passed') {
                await this.sendModuleAwareBackupNotification('verification', 'warning', verification);
            }

        } catch (error) {
            this.logger.error('Scheduled module collection verification failed', { error: error.message });
            await this.sendModuleAwareBackupNotification('verification', 'failure', { error: error.message });
        }
    }

    /**
     * Run manual module-aware backup
     */
    async runManualModuleAwareBackup(tenantId = null, type = 'manual') {
        this.logger.info('Starting manual module-aware backup', { type, tenantId });
        
        try {
            const result = await this.moduleAwareBackupService.createModuleAwareDailyBackup(tenantId);
            result.type = type;
            
            this.logger.info('Manual module-aware backup completed', {
                backupId: result.id,
                type,
                tenantId: result.tenantId,
                size: result.size,
                enabledModules: result.enabledModules
            });

            return result;

        } catch (error) {
            this.logger.error('Manual module-aware backup failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Send module-aware backup notification
     */
    async sendModuleAwareBackupNotification(type, status, data) {
        try {
            this.logger.info('Module-aware backup notification sent', {
                type,
                status,
                timestamp: new Date().toISOString(),
                moduleAware: true,
                enabledModules: data.enabledModules || [],
                tenantId: data.tenantId || 'system-wide'
            });

            // TODO: Integrate with email service or webhook
            // Include module-specific information in notifications
            // await emailService.sendModuleAwareBackupNotification(type, status, data);

        } catch (error) {
            this.logger.warn('Failed to send module-aware backup notification', { error: error.message });
        }
    }

    /**
     * Get enhanced scheduler status with module information
     */
    getModuleAwareStatus() {
        const baseStatus = super.getStatus();
        
        return {
            ...baseStatus,
            moduleAware: true,
            moduleAwareBackupService: !!this.moduleAwareBackupService,
            features: {
                systemWideBackup: true,
                tenantSpecificBackup: true,
                moduleCollectionVerification: true,
                moduleAwareRetention: true
            }
        };
    }

    /**
     * Schedule tenant-specific backup
     */
    scheduleTenantsBackup(tenantIds, cronExpression = '0 1 * * *') {
        this.logger.info('Scheduling tenant-specific backups', { 
            tenantIds, 
            cronExpression 
        });

        tenantIds.forEach(tenantId => {
            const taskName = `tenant-${tenantId}`;
            
            const tenantTask = cron.schedule(cronExpression, async () => {
                await this.runTenantSpecificBackup(tenantId);
            }, {
                scheduled: false,
                timezone: process.env.BACKUP_TIMEZONE || 'UTC'
            });

            this.scheduledTasks.set(taskName, tenantTask);
            tenantTask.start();
            
            this.logger.info(`Started tenant-specific backup task for ${tenantId}`);
        });
    }

    /**
     * Run tenant-specific backup
     */
    async runTenantSpecificBackup(tenantId) {
        this.logger.info('Starting scheduled tenant-specific backup', { tenantId });
        
        try {
            const startTime = Date.now();
            const result = await this.moduleAwareBackupService.createModuleAwareDailyBackup(tenantId);
            const duration = Date.now() - startTime;

            this.logger.info('Scheduled tenant-specific backup completed', {
                backupId: result.id,
                tenantId,
                duration: `${duration}ms`,
                size: result.size,
                components: result.components.length,
                enabledModules: result.enabledModules
            });

            await this.sendModuleAwareBackupNotification(`tenant-${tenantId}`, 'success', result);

        } catch (error) {
            this.logger.error('Scheduled tenant-specific backup failed', { 
                tenantId, 
                error: error.message 
            });
            
            await this.sendModuleAwareBackupNotification(`tenant-${tenantId}`, 'failure', { 
                tenantId, 
                error: error.message 
            });
            
            throw error;
        }
    }

    /**
     * Remove tenant-specific backup schedule
     */
    removeTenantsBackupSchedule(tenantIds) {
        tenantIds.forEach(tenantId => {
            const taskName = `tenant-${tenantId}`;
            const task = this.scheduledTasks.get(taskName);
            
            if (task) {
                task.stop();
                this.scheduledTasks.delete(taskName);
                this.logger.info(`Removed tenant-specific backup schedule for ${tenantId}`);
            }
        });
    }
}

export default ModuleAwareBackupScheduler;