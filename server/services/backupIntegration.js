import BackupService from './backupService.js';
import BackupScheduler from './backupScheduler.js';
import BackupLog from '../models/BackupLog.js';
import winston from 'winston';
import path from 'path';

/**
 * Backup Integration Service
 * Integrates backup functionality with the main HR-SM application
 */
class BackupIntegration {
    constructor() {
        this.backupService = new BackupService();
        this.backupScheduler = new BackupScheduler();
        this.isInitialized = false;
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(process.cwd(), 'logs', 'backup-integration.log') 
                }),
                new winston.transports.Console()
            ]
        });
    }

    /**
     * Initialize backup system
     */
    async initialize() {
        if (this.isInitialized) {
            this.logger.warn('Backup system already initialized');
            return;
        }

        this.logger.info('Initializing backup system');

        try {
            // Check if backups are enabled
            const backupsEnabled = process.env.BACKUPS_ENABLED !== 'false';
            
            if (!backupsEnabled) {
                this.logger.info('Backups disabled via environment variable');
                return;
            }

            // Start the backup scheduler
            this.backupScheduler.start();
            
            // Set up cleanup job for expired backups
            this.setupCleanupJob();
            
            this.isInitialized = true;
            this.logger.info('Backup system initialized successfully');

        } catch (error) {
            this.logger.error('Failed to initialize backup system', { error: error.message });
            throw error;
        }
    }

    /**
     * Shutdown backup system
     */
    async shutdown() {
        if (!this.isInitialized) {
            return;
        }

        this.logger.info('Shutting down backup system');

        try {
            this.backupScheduler.stop();
            this.isInitialized = false;
            this.logger.info('Backup system shut down successfully');

        } catch (error) {
            this.logger.error('Failed to shutdown backup system', { error: error.message });
        }
    }

    /**
     * Set up cleanup job for expired backups
     */
    setupCleanupJob() {
        // Run cleanup every 6 hours
        setInterval(async () => {
            try {
                await this.cleanupExpiredBackups();
            } catch (error) {
                this.logger.error('Cleanup job failed', { error: error.message });
            }
        }, 6 * 60 * 60 * 1000); // 6 hours
    }

    /**
     * Clean up expired backups
     */
    async cleanupExpiredBackups() {
        this.logger.info('Running expired backup cleanup');

        try {
            const expiredBackups = await BackupLog.findExpiredBackups();
            
            for (const backup of expiredBackups) {
                await this.deleteExpiredBackup(backup);
            }

            this.logger.info(`Cleaned up ${expiredBackups.length} expired backups`);

        } catch (error) {
            this.logger.error('Failed to cleanup expired backups', { error: error.message });
        }
    }

    /**
     * Delete an expired backup
     */
    async deleteExpiredBackup(backup) {
        try {
            const fs = await import('fs');
            
            // Delete physical backup file
            if (backup.finalPath && fs.existsSync(backup.finalPath)) {
                fs.unlinkSync(backup.finalPath);
                this.logger.info(`Deleted backup file: ${backup.finalPath}`);
            }

            // Mark as deleted in database
            backup.retentionPolicy.deletedAt = new Date();
            await backup.save();

        } catch (error) {
            this.logger.error(`Failed to delete expired backup: ${backup.backupId}`, { 
                error: error.message 
            });
        }
    }

    /**
     * Create emergency backup
     */
    async createEmergencyBackup(reason, userId = null) {
        this.logger.info('Creating emergency backup', { reason, userId });

        try {
            const backupLog = new BackupLog({
                backupId: `emergency-${Date.now()}`,
                type: 'emergency',
                triggeredBy: 'emergency',
                triggeredByUser: userId,
                notes: `Emergency backup: ${reason}`
            });

            await backupLog.save();

            const result = await this.backupService.createDailyBackup();
            
            // Update backup log with results
            backupLog.status = 'completed';
            backupLog.endTime = new Date();
            backupLog.finalPath = result.finalPath;
            backupLog.size = result.size;
            backupLog.components = result.components;
            backupLog.checksums = result.checksums;
            
            await backupLog.save();

            this.logger.info('Emergency backup completed', { 
                backupId: result.id,
                reason 
            });

            return result;

        } catch (error) {
            this.logger.error('Emergency backup failed', { 
                error: error.message,
                reason 
            });
            throw error;
        }
    }

    /**
     * Get backup status for monitoring
     */
    async getBackupStatus() {
        try {
            const stats = await this.backupService.getBackupStatistics();
            const schedulerStatus = this.backupScheduler.getStatus();
            const recentBackups = await BackupLog.getRecentBackups(5);

            return {
                initialized: this.isInitialized,
                scheduler: schedulerStatus,
                statistics: stats,
                recentBackups: recentBackups,
                lastBackup: stats.lastBackup,
                health: this.getHealthStatus(stats, recentBackups)
            };

        } catch (error) {
            this.logger.error('Failed to get backup status', { error: error.message });
            throw error;
        }
    }

    /**
     * Get backup health status
     */
    getHealthStatus(stats, recentBackups) {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Check if we have a recent successful backup
        const recentSuccessfulBackup = recentBackups.find(backup => 
            backup.status === 'completed' && 
            new Date(backup.startTime) > oneDayAgo
        );

        if (!recentSuccessfulBackup) {
            return {
                status: 'unhealthy',
                message: 'No successful backup in the last 24 hours',
                severity: 'critical'
            };
        }

        // Check failure rate
        const failedBackups = recentBackups.filter(backup => backup.status === 'failed');
        const failureRate = failedBackups.length / recentBackups.length;

        if (failureRate > 0.5) {
            return {
                status: 'degraded',
                message: 'High backup failure rate detected',
                severity: 'warning'
            };
        }

        return {
            status: 'healthy',
            message: 'Backup system operating normally',
            severity: 'info'
        };
    }

    /**
     * Validate backup configuration
     */
    validateConfiguration() {
        const issues = [];

        // Check required environment variables
        const requiredEnvVars = [
            'MONGODB_URI',
            'BACKUP_ENCRYPTION_KEY'
        ];

        requiredEnvVars.forEach(envVar => {
            if (!process.env[envVar]) {
                issues.push(`Missing required environment variable: ${envVar}`);
            }
        });

        // Check backup directory permissions
        try {
            const fs = require('fs');
            const backupDir = path.join(process.cwd(), 'backups');
            
            if (!fs.existsSync(backupDir)) {
                issues.push('Backup directory does not exist');
            } else {
                // Test write permissions
                const testFile = path.join(backupDir, 'test-write.tmp');
                try {
                    fs.writeFileSync(testFile, 'test');
                    fs.unlinkSync(testFile);
                } catch (error) {
                    issues.push('No write permissions to backup directory');
                }
            }
        } catch (error) {
            issues.push(`Failed to check backup directory: ${error.message}`);
        }

        // Check MongoDB connection
        if (!process.env.MONGODB_URI) {
            issues.push('MongoDB URI not configured');
        }

        // Check license server database
        const licenseDbUri = process.env.LICENSE_DB_URI || process.env.MONGODB_URI;
        if (!licenseDbUri) {
            issues.push('License database URI not configured');
        }

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Get backup metrics for monitoring systems
     */
    async getMetrics() {
        try {
            const stats = await BackupLog.getStatistics();
            const recentBackups = await BackupLog.getRecentBackups(10);
            
            const metrics = {
                backup_total_count: stats.reduce((sum, stat) => sum + stat.count, 0),
                backup_success_rate: this.calculateSuccessRate(stats),
                backup_avg_duration: this.calculateAvgDuration(stats),
                backup_avg_size: this.calculateAvgSize(stats),
                backup_last_success: this.getLastSuccessTime(recentBackups),
                backup_health_score: this.calculateHealthScore(recentBackups)
            };

            return metrics;

        } catch (error) {
            this.logger.error('Failed to get backup metrics', { error: error.message });
            return {};
        }
    }

    /**
     * Calculate overall success rate
     */
    calculateSuccessRate(stats) {
        const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
        const totalSuccess = stats.reduce((sum, stat) => sum + stat.successCount, 0);
        
        return totalCount > 0 ? (totalSuccess / totalCount) * 100 : 0;
    }

    /**
     * Calculate average duration
     */
    calculateAvgDuration(stats) {
        const totalDuration = stats.reduce((sum, stat) => sum + (stat.avgDuration || 0), 0);
        return stats.length > 0 ? totalDuration / stats.length : 0;
    }

    /**
     * Calculate average size
     */
    calculateAvgSize(stats) {
        const totalSize = stats.reduce((sum, stat) => sum + (stat.avgSize || 0), 0);
        return stats.length > 0 ? totalSize / stats.length : 0;
    }

    /**
     * Get last successful backup time
     */
    getLastSuccessTime(recentBackups) {
        const lastSuccess = recentBackups.find(backup => backup.status === 'completed');
        return lastSuccess ? new Date(lastSuccess.startTime).getTime() : 0;
    }

    /**
     * Calculate health score (0-100)
     */
    calculateHealthScore(recentBackups) {
        if (recentBackups.length === 0) return 0;
        
        const successCount = recentBackups.filter(backup => backup.status === 'completed').length;
        const successRate = successCount / recentBackups.length;
        
        // Factor in recency
        const now = new Date();
        const lastBackup = recentBackups[0];
        const hoursSinceLastBackup = (now - new Date(lastBackup.startTime)) / (1000 * 60 * 60);
        
        let recencyScore = 1;
        if (hoursSinceLastBackup > 48) recencyScore = 0.5;
        else if (hoursSinceLastBackup > 24) recencyScore = 0.8;
        
        return Math.round(successRate * recencyScore * 100);
    }
}

export default BackupIntegration;