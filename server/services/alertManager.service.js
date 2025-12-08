// services/alertManager.service.js
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import License from '../models/license.model.js';
import UsageTracking from '../models/usageTracking.model.js';
import licenseFileLoader from './licenseFileLoader.service.js';

/**
 * Alert Manager Service
 * Handles alerting for license expiration and usage limit warnings
 */
class AlertManager {
    constructor() {
        this.isOnPremiseMode = process.env.DEPLOYMENT_MODE === 'on-premise';
        this.alertThresholds = {
            usageWarning: 80, // 80% usage triggers warning
            usageCritical: 95, // 95% usage triggers critical alert
            expirationWarning: 30, // 30 days until expiration
            expirationCritical: 7 // 7 days until expiration
        };

        // Email configuration
        this.emailEnabled = process.env.ALERT_EMAIL_ENABLED === 'true';
        this.alertEmail = process.env.ALERT_EMAIL_ADDRESS;

        if (this.emailEnabled && this.alertEmail) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            logger.info('Alert Manager email notifications enabled', { alertEmail: this.alertEmail });
        } else {
            logger.info('Alert Manager email notifications disabled');
        }

        // Track recent alerts to avoid spam
        this.recentAlerts = new Map();
        this.alertCooldown = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Check and send usage limit alerts
     */
    async checkUsageLimitAlerts(tenantId, moduleKey, limitType, currentUsage, limit, percentage) {
        const alertKey = `usage:${tenantId}:${moduleKey}:${limitType}`;

        // Check if we've sent an alert recently
        if (this._isInCooldown(alertKey)) {
            return;
        }

        let severity = null;
        let message = null;

        if (percentage >= this.alertThresholds.usageCritical) {
            severity = 'critical';
            message = `CRITICAL: Usage at ${percentage}% for ${moduleKey} (${limitType})`;
        } else if (percentage >= this.alertThresholds.usageWarning) {
            severity = 'warning';
            message = `WARNING: Usage at ${percentage}% for ${moduleKey} (${limitType})`;
        }

        if (severity) {
            await this._sendAlert({
                severity,
                type: 'usage_limit',
                tenantId,
                moduleKey,
                limitType,
                currentUsage,
                limit,
                percentage,
                message
            });

            this._recordAlert(alertKey);
        }
    }

    /**
     * Check and send license expiration alerts
     */
    async checkLicenseExpirationAlerts() {
        try {
            if (this.isOnPremiseMode) {
                await this._checkOnPremiseLicenseExpiration();
            } else {
                await this._checkSaaSLicenseExpiration();
            }
        } catch (error) {
            logger.error('Error checking license expiration alerts', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Check On-Premise license expiration
     * @private
     */
    async _checkOnPremiseLicenseExpiration() {
        const licenseData = licenseFileLoader.getLicense();

        if (!licenseData || !licenseData.expiresAt) {
            return;
        }

        const expiresAt = new Date(licenseData.expiresAt);
        const now = new Date();
        const daysUntilExpiration = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiration < 0) {
            // License expired
            await this._sendAlert({
                severity: 'critical',
                type: 'license_expired',
                companyName: licenseData.companyName,
                licenseKey: licenseData.licenseKey,
                expiresAt: licenseData.expiresAt,
                message: `CRITICAL: On-Premise license has EXPIRED`
            });
        } else if (daysUntilExpiration <= this.alertThresholds.expirationCritical) {
            // Critical: Expiring within 7 days
            await this._sendAlert({
                severity: 'critical',
                type: 'license_expiring',
                companyName: licenseData.companyName,
                licenseKey: licenseData.licenseKey,
                expiresAt: licenseData.expiresAt,
                daysUntilExpiration,
                message: `CRITICAL: On-Premise license expiring in ${daysUntilExpiration} days`
            });
        } else if (daysUntilExpiration <= this.alertThresholds.expirationWarning) {
            // Warning: Expiring within 30 days
            await this._sendAlert({
                severity: 'warning',
                type: 'license_expiring',
                companyName: licenseData.companyName,
                licenseKey: licenseData.licenseKey,
                expiresAt: licenseData.expiresAt,
                daysUntilExpiration,
                message: `WARNING: On-Premise license expiring in ${daysUntilExpiration} days`
            });
        }
    }

    /**
     * Check SaaS license expiration
     * @private
     */
    async _checkSaaSLicenseExpiration() {
        const licenses = await License.find({
            status: { $in: ['active', 'trial'] }
        });

        const now = new Date();

        for (const license of licenses) {
            for (const module of license.modules) {
                if (!module.enabled || !module.expiresAt) {
                    continue;
                }

                const expiresAt = new Date(module.expiresAt);
                const daysUntilExpiration = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

                const alertKey = `expiration:${license.tenantId}:${module.key}`;

                // Check if we've sent an alert recently
                if (this._isInCooldown(alertKey)) {
                    continue;
                }

                if (daysUntilExpiration < 0) {
                    // License expired
                    await this._sendAlert({
                        severity: 'critical',
                        type: 'license_expired',
                        tenantId: license.tenantId.toString(),
                        moduleKey: module.key,
                        expiresAt: module.expiresAt,
                        message: `CRITICAL: License for ${module.key} has EXPIRED`
                    });
                    this._recordAlert(alertKey);
                } else if (daysUntilExpiration <= this.alertThresholds.expirationCritical) {
                    // Critical: Expiring within 7 days
                    await this._sendAlert({
                        severity: 'critical',
                        type: 'license_expiring',
                        tenantId: license.tenantId.toString(),
                        moduleKey: module.key,
                        expiresAt: module.expiresAt,
                        daysUntilExpiration,
                        message: `CRITICAL: License for ${module.key} expiring in ${daysUntilExpiration} days`
                    });
                    this._recordAlert(alertKey);
                } else if (daysUntilExpiration <= this.alertThresholds.expirationWarning) {
                    // Warning: Expiring within 30 days
                    await this._sendAlert({
                        severity: 'warning',
                        type: 'license_expiring',
                        tenantId: license.tenantId.toString(),
                        moduleKey: module.key,
                        expiresAt: module.expiresAt,
                        daysUntilExpiration,
                        message: `WARNING: License for ${module.key} expiring in ${daysUntilExpiration} days`
                    });
                    this._recordAlert(alertKey);
                }
            }
        }
    }

    /**
     * Send alert via configured channels
     * @private
     */
    async _sendAlert(alert) {
        // Log the alert
        logger.warn('License Alert', alert);

        // Send email if configured
        if (this.emailEnabled && this.transporter && this.alertEmail) {
            try {
                await this._sendEmailAlert(alert);
            } catch (error) {
                logger.error('Failed to send email alert', {
                    alert,
                    error: error.message
                });
            }
        }

        // Could add other alert channels here (Slack, PagerDuty, etc.)
    }

    /**
     * Send email alert
     * @private
     */
    async _sendEmailAlert(alert) {
        const subject = `[${alert.severity.toUpperCase()}] License Alert: ${alert.type}`;
        
        let htmlBody = `
            <h2>License Alert</h2>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Type:</strong> ${alert.type}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            <hr>
        `;

        if (alert.tenantId) {
            htmlBody += `<p><strong>Tenant ID:</strong> ${alert.tenantId}</p>`;
        }

        if (alert.moduleKey) {
            htmlBody += `<p><strong>Module:</strong> ${alert.moduleKey}</p>`;
        }

        if (alert.limitType) {
            htmlBody += `
                <p><strong>Limit Type:</strong> ${alert.limitType}</p>
                <p><strong>Current Usage:</strong> ${alert.currentUsage}</p>
                <p><strong>Limit:</strong> ${alert.limit}</p>
                <p><strong>Percentage:</strong> ${alert.percentage}%</p>
            `;
        }

        if (alert.expiresAt) {
            htmlBody += `<p><strong>Expires At:</strong> ${new Date(alert.expiresAt).toLocaleString()}</p>`;
        }

        if (alert.daysUntilExpiration !== undefined) {
            htmlBody += `<p><strong>Days Until Expiration:</strong> ${alert.daysUntilExpiration}</p>`;
        }

        if (alert.companyName) {
            htmlBody += `<p><strong>Company:</strong> ${alert.companyName}</p>`;
        }

        if (alert.licenseKey) {
            htmlBody += `<p><strong>License Key:</strong> ${alert.licenseKey}</p>`;
        }

        htmlBody += `
            <hr>
            <p><em>This is an automated alert from the HRMS License Management System.</em></p>
            <p><em>Timestamp: ${new Date().toISOString()}</em></p>
        `;

        await this.transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: this.alertEmail,
            subject,
            html: htmlBody
        });

        logger.info('Email alert sent', {
            to: this.alertEmail,
            subject,
            alertType: alert.type
        });
    }

    /**
     * Check if an alert is in cooldown period
     * @private
     */
    _isInCooldown(alertKey) {
        const lastAlert = this.recentAlerts.get(alertKey);
        if (!lastAlert) {
            return false;
        }

        const now = Date.now();
        return (now - lastAlert) < this.alertCooldown;
    }

    /**
     * Record that an alert was sent
     * @private
     */
    _recordAlert(alertKey) {
        this.recentAlerts.set(alertKey, Date.now());

        // Clean up old entries periodically
        if (this.recentAlerts.size > 1000) {
            const now = Date.now();
            for (const [key, timestamp] of this.recentAlerts.entries()) {
                if (now - timestamp > this.alertCooldown) {
                    this.recentAlerts.delete(key);
                }
            }
        }
    }

    /**
     * Get alert statistics
     */
    getAlertStats() {
        return {
            emailEnabled: this.emailEnabled,
            alertEmail: this.alertEmail,
            recentAlertsCount: this.recentAlerts.size,
            thresholds: this.alertThresholds
        };
    }
}

// Export singleton instance
const alertManager = new AlertManager();
export default alertManager;
