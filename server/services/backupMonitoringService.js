import winston from 'winston';
import nodemailer from 'nodemailer';
import path from 'path';
import BackupLog from '../models/BackupLog.js';
import BackupVerificationService from './backupVerificationService.js';
import CloudStorageService from './cloudStorageService.js';

/**
 * Backup Monitoring and Alerting Service
 * Monitors backup health, sends alerts for failures,
 * and provides comprehensive backup status reporting
 */
class BackupMonitoringService {
    constructor() {
        this.verificationService = new BackupVerificationService();
        this.cloudStorage = new CloudStorageService();
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(process.cwd(), 'logs', 'backup-monitoring.log') 
                }),
                new winston.transports.Console()
            ]
        });

        this.emailTransporter = this.setupEmailTransporter();
        this.alertThresholds = {
            maxFailureRate: 0.3, // 30%
            maxHoursSinceLastBackup: 26, // 26 hours
            minBackupSize: 1024 * 1024, // 1MB
            maxBackupAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };
    }

    /**
     * Setup email transporter for alerts
     */
    setupEmailTransporter() {
        if (!process.env.SMTP_HOST) {
            this.logger.warn('SMTP not configured, email alerts disabled');
            return null;
        }

        return nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Monitor backup health and send alerts
     */
    async monitorBackupHealth() {
        this.logger.info('Starting backup health monitoring');

        try {
            const healthReport = await this.generateHealthReport();
            
            // Check for critical issues
            const criticalIssues = this.identifyCriticalIssues(healthReport);
            
            if (criticalIssues.length > 0) {
                await this.sendCriticalAlert(criticalIssues, healthReport);
            }

            // Check for warnings
            const warnings = this.identifyWarnings(healthReport);
            
            if (warnings.length > 0) {
                await this.sendWarningAlert(warnings, healthReport);
            }

            // Log health status
            this.logger.info('Backup health monitoring completed', {
                overallHealth: healthReport.overallHealth,
                criticalIssues: criticalIssues.length,
                warnings: warnings.length
            });

            return {
                healthReport,
                criticalIssues,
                warnings
            };

        } catch (error) {
            this.logger.error('Backup health monitoring failed', { error: error.message });
            await this.sendSystemAlert('Backup monitoring system failure', error.message);
            throw error;
        }
    }

    /**
     * Generate comprehensive health report
     */
    async generateHealthReport() {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get recent backups
        const recentBackups = await BackupLog.find({
            startTime: { $gte: last7Days }
        }).sort({ startTime: -1 });

        // Get backup statistics
        const stats = await BackupLog.getStatistics(last7Days, now);

        // Get last successful backup
        const lastSuccessfulBackup = await BackupLog.findOne({
            status: 'completed'
        }).sort({ startTime: -1 });

        // Get failed backups in last 24 hours
        const recentFailures = await BackupLog.find({
            status: 'failed',
            startTime: { $gte: last24Hours }
        });

        // Get cloud storage status
        let cloudStorageStatus = null;
        try {
            cloudStorageStatus = await this.cloudStorage.getCloudStorageStats();
        } catch (error) {
            this.logger.warn('Failed to get cloud storage status', { error: error.message });
        }

        // Calculate metrics
        const totalBackups = recentBackups.length;
        const successfulBackups = recentBackups.filter(b => b.status === 'completed').length;
        const failureRate = totalBackups > 0 ? (totalBackups - successfulBackups) / totalBackups : 0;
        
        const hoursSinceLastBackup = lastSuccessfulBackup ? 
            (now - lastSuccessfulBackup.startTime) / (1000 * 60 * 60) : Infinity;

        // Determine overall health
        let overallHealth = 'healthy';
        
        if (hoursSinceLastBackup > this.alertThresholds.maxHoursSinceLastBackup || 
            failureRate > this.alertThresholds.maxFailureRate ||
            recentFailures.length > 3) {
            overallHealth = 'critical';
        } else if (hoursSinceLastBackup > 24 || 
                   failureRate > 0.1 || 
                   recentFailures.length > 0) {
            overallHealth = 'warning';
        }

        return {
            timestamp: now,
            overallHealth,
            metrics: {
                totalBackups,
                successfulBackups,
                failureRate: Math.round(failureRate * 100),
                hoursSinceLastBackup: Math.round(hoursSinceLastBackup * 100) / 100,
                recentFailures: recentFailures.length
            },
            lastSuccessfulBackup: lastSuccessfulBackup ? {
                backupId: lastSuccessfulBackup.backupId,
                timestamp: lastSuccessfulBackup.startTime,
                size: lastSuccessfulBackup.size
            } : null,
            recentFailures: recentFailures.map(backup => ({
                backupId: backup.backupId,
                timestamp: backup.startTime,
                error: backup.error?.message
            })),
            cloudStorage: cloudStorageStatus,
            statistics: stats
        };
    }

    /**
     * Identify critical issues
     */
    identifyCriticalIssues(healthReport) {
        const issues = [];

        // No recent successful backup
        if (healthReport.metrics.hoursSinceLastBackup > this.alertThresholds.maxHoursSinceLastBackup) {
            issues.push({
                type: 'no_recent_backup',
                severity: 'critical',
                message: `No successful backup in ${Math.round(healthReport.metrics.hoursSinceLastBackup)} hours`,
                threshold: this.alertThresholds.maxHoursSinceLastBackup
            });
        }

        // High failure rate
        if (healthReport.metrics.failureRate > this.alertThresholds.maxFailureRate * 100) {
            issues.push({
                type: 'high_failure_rate',
                severity: 'critical',
                message: `Backup failure rate is ${healthReport.metrics.failureRate}%`,
                threshold: this.alertThresholds.maxFailureRate * 100
            });
        }

        // Multiple recent failures
        if (healthReport.metrics.recentFailures > 3) {
            issues.push({
                type: 'multiple_failures',
                severity: 'critical',
                message: `${healthReport.metrics.recentFailures} backup failures in last 24 hours`,
                threshold: 3
            });
        }

        // Cloud storage issues
        if (healthReport.cloudStorage && process.env.BACKUP_CLOUD_ENABLED === 'true') {
            if (healthReport.cloudStorage.totalBackups === 0) {
                issues.push({
                    type: 'no_cloud_backups',
                    severity: 'critical',
                    message: 'No backups found in cloud storage',
                    threshold: 1
                });
            }
        }

        return issues;
    }

    /**
     * Identify warnings
     */
    identifyWarnings(healthReport) {
        const warnings = [];

        // Backup age warning
        if (healthReport.metrics.hoursSinceLastBackup > 24 && 
            healthReport.metrics.hoursSinceLastBackup <= this.alertThresholds.maxHoursSinceLastBackup) {
            warnings.push({
                type: 'backup_age_warning',
                severity: 'warning',
                message: `Last backup was ${Math.round(healthReport.metrics.hoursSinceLastBackup)} hours ago`,
                threshold: 24
            });
        }

        // Moderate failure rate
        if (healthReport.metrics.failureRate > 10 && 
            healthReport.metrics.failureRate <= this.alertThresholds.maxFailureRate * 100) {
            warnings.push({
                type: 'moderate_failure_rate',
                severity: 'warning',
                message: `Backup failure rate is ${healthReport.metrics.failureRate}%`,
                threshold: 10
            });
        }

        // Small backup size
        if (healthReport.lastSuccessfulBackup && 
            healthReport.lastSuccessfulBackup.size < this.alertThresholds.minBackupSize) {
            warnings.push({
                type: 'small_backup_size',
                severity: 'warning',
                message: `Last backup size is unusually small: ${this.formatBytes(healthReport.lastSuccessfulBackup.size)}`,
                threshold: this.formatBytes(this.alertThresholds.minBackupSize)
            });
        }

        return warnings;
    }

    /**
     * Send critical alert
     */
    async sendCriticalAlert(issues, healthReport) {
        const subject = `🚨 CRITICAL: HR-SM Backup System Alert`;
        const message = this.generateAlertMessage('CRITICAL', issues, healthReport);

        await this.sendAlert(subject, message, 'critical');
        
        this.logger.error('Critical backup alert sent', {
            issues: issues.length,
            recipients: process.env.BACKUP_ALERT_EMAILS
        });
    }

    /**
     * Send warning alert
     */
    async sendWarningAlert(warnings, healthReport) {
        const subject = `⚠️ WARNING: HR-SM Backup System Alert`;
        const message = this.generateAlertMessage('WARNING', warnings, healthReport);

        await this.sendAlert(subject, message, 'warning');
        
        this.logger.warn('Warning backup alert sent', {
            warnings: warnings.length,
            recipients: process.env.BACKUP_ALERT_EMAILS
        });
    }

    /**
     * Send system alert
     */
    async sendSystemAlert(subject, message) {
        const fullMessage = `
System Alert: ${subject}

Details: ${message}

Timestamp: ${new Date().toISOString()}
Server: ${require('os').hostname()}

Please investigate immediately.
        `;

        await this.sendAlert(`🔧 SYSTEM: ${subject}`, fullMessage, 'system');
    }

    /**
     * Generate alert message
     */
    generateAlertMessage(severity, issues, healthReport) {
        let message = `
HR-SM Backup System ${severity} Alert

Timestamp: ${healthReport.timestamp.toISOString()}
Overall Health: ${healthReport.overallHealth.toUpperCase()}

ISSUES DETECTED:
`;

        issues.forEach((issue, index) => {
            message += `
${index + 1}. ${issue.message}
   Type: ${issue.type}
   Severity: ${issue.severity}
`;
        });

        message += `

SYSTEM METRICS:
- Total backups (7 days): ${healthReport.metrics.totalBackups}
- Successful backups: ${healthReport.metrics.successfulBackups}
- Failure rate: ${healthReport.metrics.failureRate}%
- Hours since last backup: ${healthReport.metrics.hoursSinceLastBackup}
- Recent failures (24h): ${healthReport.metrics.recentFailures}
`;

        if (healthReport.lastSuccessfulBackup) {
            message += `
LAST SUCCESSFUL BACKUP:
- Backup ID: ${healthReport.lastSuccessfulBackup.backupId}
- Timestamp: ${healthReport.lastSuccessfulBackup.timestamp}
- Size: ${this.formatBytes(healthReport.lastSuccessfulBackup.size)}
`;
        }

        if (healthReport.recentFailures.length > 0) {
            message += `
RECENT FAILURES:
`;
            healthReport.recentFailures.forEach((failure, index) => {
                message += `${index + 1}. ${failure.backupId} - ${failure.timestamp} - ${failure.error}\n`;
            });
        }

        if (healthReport.cloudStorage) {
            message += `
CLOUD STORAGE STATUS:
- Provider: ${healthReport.cloudStorage.provider}
- Total backups: ${healthReport.cloudStorage.totalBackups}
- Total size: ${this.formatBytes(healthReport.cloudStorage.totalSize)}
`;
        }

        message += `
Please investigate and resolve these issues immediately.

Dashboard: ${process.env.FRONTEND_URL}/admin/backups
Logs: ${process.cwd()}/logs/backup*.log
        `;

        return message;
    }

    /**
     * Send alert email
     */
    async sendAlert(subject, message, priority = 'normal') {
        if (!this.emailTransporter) {
            this.logger.warn('Email transporter not configured, alert not sent');
            return;
        }

        const recipients = process.env.BACKUP_ALERT_EMAILS;
        if (!recipients) {
            this.logger.warn('No alert email recipients configured');
            return;
        }

        try {
            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: recipients,
                subject: subject,
                text: message,
                priority: priority === 'critical' ? 'high' : 'normal'
            };

            await this.emailTransporter.sendMail(mailOptions);
            
            this.logger.info('Alert email sent successfully', {
                subject,
                recipients,
                priority
            });

        } catch (error) {
            this.logger.error('Failed to send alert email', {
                error: error.message,
                subject,
                recipients
            });
        }
    }

    /**
     * Generate daily backup report
     */
    async generateDailyReport() {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const backups = await BackupLog.find({
                startTime: {
                    $gte: yesterday,
                    $lt: today
                }
            }).sort({ startTime: -1 });

            const report = {
                date: yesterday.toISOString().split('T')[0],
                summary: {
                    totalBackups: backups.length,
                    successfulBackups: backups.filter(b => b.status === 'completed').length,
                    failedBackups: backups.filter(b => b.status === 'failed').length,
                    totalSize: backups.reduce((sum, b) => sum + (b.size || 0), 0),
                    avgDuration: backups.length > 0 ? 
                        backups.reduce((sum, b) => sum + (b.duration || 0), 0) / backups.length : 0
                },
                backups: backups.map(backup => ({
                    backupId: backup.backupId,
                    type: backup.type,
                    status: backup.status,
                    startTime: backup.startTime,
                    duration: backup.durationFormatted,
                    size: backup.sizeFormatted,
                    cloudUploaded: backup.cloudStorage.uploaded
                }))
            };

            return report;

        } catch (error) {
            this.logger.error('Failed to generate daily report', { error: error.message });
            throw error;
        }
    }

    /**
     * Send daily report
     */
    async sendDailyReport() {
        if (!process.env.BACKUP_DAILY_REPORT_EMAILS) {
            return;
        }

        try {
            const report = await this.generateDailyReport();
            
            const subject = `📊 HR-SM Daily Backup Report - ${report.date}`;
            const message = this.generateDailyReportMessage(report);

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: process.env.BACKUP_DAILY_REPORT_EMAILS,
                subject: subject,
                text: message
            };

            if (this.emailTransporter) {
                await this.emailTransporter.sendMail(mailOptions);
                this.logger.info('Daily backup report sent', { date: report.date });
            }

        } catch (error) {
            this.logger.error('Failed to send daily report', { error: error.message });
        }
    }

    /**
     * Generate daily report message
     */
    generateDailyReportMessage(report) {
        let message = `
HR-SM Daily Backup Report
Date: ${report.date}

SUMMARY:
- Total backups: ${report.summary.totalBackups}
- Successful: ${report.summary.successfulBackups}
- Failed: ${report.summary.failedBackups}
- Total size: ${this.formatBytes(report.summary.totalSize)}
- Average duration: ${this.formatDuration(report.summary.avgDuration)}

`;

        if (report.backups.length > 0) {
            message += `BACKUP DETAILS:\n`;
            report.backups.forEach(backup => {
                const status = backup.status === 'completed' ? '✅' : '❌';
                const cloud = backup.cloudUploaded ? '☁️' : '💾';
                
                message += `${status} ${cloud} ${backup.backupId} (${backup.type}) - ${backup.size} - ${backup.duration}\n`;
            });
        }

        if (report.summary.failedBackups > 0) {
            message += `\n⚠️ ${report.summary.failedBackups} backup(s) failed. Please investigate.\n`;
        }

        message += `\nDashboard: ${process.env.FRONTEND_URL}/admin/backups\n`;

        return message;
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (!bytes) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * Format duration to human readable
     */
    formatDuration(ms) {
        if (!ms) return '0s';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Get monitoring status
     */
    getMonitoringStatus() {
        return {
            emailConfigured: !!this.emailTransporter,
            alertThresholds: this.alertThresholds,
            alertRecipients: process.env.BACKUP_ALERT_EMAILS,
            dailyReportRecipients: process.env.BACKUP_DAILY_REPORT_EMAILS
        };
    }

    /**
     * Update alert thresholds
     */
    updateAlertThresholds(newThresholds) {
        Object.assign(this.alertThresholds, newThresholds);
        this.logger.info('Alert thresholds updated', { thresholds: this.alertThresholds });
    }
}

export default BackupMonitoringService;