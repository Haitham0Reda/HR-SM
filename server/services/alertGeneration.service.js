/**
 * Alert Generation Service
 * Implements immediate alerting for critical events, security event escalation,
 * and multi-channel alert delivery (email, webhook, etc.)
 */

import EventEmitter from 'events';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import platformLogger from '../utils/platformLogger.js';

// Alert severity levels
const ALERT_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// Alert types
const ALERT_TYPES = {
    SECURITY_BREACH: 'security_breach',
    PERFORMANCE_DEGRADATION: 'performance_degradation',
    SYSTEM_ERROR: 'system_error',
    COMPLIANCE_VIOLATION: 'compliance_violation',
    RESOURCE_EXHAUSTION: 'resource_exhaustion',
    AUTHENTICATION_FAILURE: 'authentication_failure',
    PLATFORM_SECURITY: 'platform_security',
    CROSS_TENANT_VIOLATION: 'cross_tenant_violation'
};

// Alert channels
const ALERT_CHANNELS = {
    EMAIL: 'email',
    WEBHOOK: 'webhook',
    CONSOLE: 'console',
    LOG: 'log'
};

class AlertGenerationService extends EventEmitter {
    constructor() {
        super();
        this.alertQueue = [];
        this.alertHistory = new Map();
        this.rateLimiters = new Map();
        this.emailTransporter = null;
        this.webhookEndpoints = new Map();
        this.alertRules = new Map();
        
        this.initializeEmailTransporter();
        this.setupDefaultAlertRules();
        this.startAlertProcessor();
    }

    /**
     * Initialize email transporter for alert delivery
     */
    initializeEmailTransporter() {
        const emailConfig = {
            host: process.env.SMTP_HOST || 'localhost',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };

        if (emailConfig.auth.user && emailConfig.auth.pass) {
            this.emailTransporter = nodemailer.createTransporter(emailConfig);
        }
    }

    /**
     * Setup default alert rules for different event types
     */
    setupDefaultAlertRules() {
        // Critical security events - immediate escalation
        this.addAlertRule({
            id: 'critical_security',
            conditions: {
                severity: ALERT_SEVERITY.CRITICAL,
                type: ALERT_TYPES.SECURITY_BREACH
            },
            channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.WEBHOOK, ALERT_CHANNELS.LOG],
            escalation: {
                enabled: true,
                timeoutMinutes: 5,
                escalationChannels: [ALERT_CHANNELS.EMAIL]
            },
            rateLimit: {
                maxAlerts: 10,
                windowMinutes: 60
            }
        });

        // Platform security violations
        this.addAlertRule({
            id: 'platform_security',
            conditions: {
                severity: [ALERT_SEVERITY.HIGH, ALERT_SEVERITY.CRITICAL],
                type: ALERT_TYPES.PLATFORM_SECURITY
            },
            channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.WEBHOOK, ALERT_CHANNELS.LOG],
            escalation: {
                enabled: true,
                timeoutMinutes: 10,
                escalationChannels: [ALERT_CHANNELS.EMAIL]
            },
            rateLimit: {
                maxAlerts: 5,
                windowMinutes: 30
            }
        });

        // Performance degradation
        this.addAlertRule({
            id: 'performance_degradation',
            conditions: {
                severity: [ALERT_SEVERITY.HIGH, ALERT_SEVERITY.CRITICAL],
                type: ALERT_TYPES.PERFORMANCE_DEGRADATION
            },
            channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.LOG],
            escalation: {
                enabled: true,
                timeoutMinutes: 15,
                escalationChannels: [ALERT_CHANNELS.EMAIL]
            },
            rateLimit: {
                maxAlerts: 20,
                windowMinutes: 60
            }
        });

        // System errors
        this.addAlertRule({
            id: 'system_error',
            conditions: {
                severity: ALERT_SEVERITY.CRITICAL,
                type: ALERT_TYPES.SYSTEM_ERROR
            },
            channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.LOG],
            escalation: {
                enabled: false
            },
            rateLimit: {
                maxAlerts: 50,
                windowMinutes: 60
            }
        });

        // Cross-tenant violations
        this.addAlertRule({
            id: 'cross_tenant_violation',
            conditions: {
                severity: [ALERT_SEVERITY.HIGH, ALERT_SEVERITY.CRITICAL],
                type: ALERT_TYPES.CROSS_TENANT_VIOLATION
            },
            channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.WEBHOOK, ALERT_CHANNELS.LOG],
            escalation: {
                enabled: true,
                timeoutMinutes: 5,
                escalationChannels: [ALERT_CHANNELS.EMAIL]
            },
            rateLimit: {
                maxAlerts: 3,
                windowMinutes: 30
            }
        });
    }

    /**
     * Add a new alert rule
     */
    addAlertRule(rule) {
        if (!rule.id || !rule.conditions || !rule.channels) {
            throw new Error('Alert rule must have id, conditions, and channels');
        }
        
        this.alertRules.set(rule.id, rule);
        platformLogger.info(`Alert rule added: ${rule.id}`, { rule });
    }

    /**
     * Remove an alert rule
     */
    removeAlertRule(ruleId) {
        const removed = this.alertRules.delete(ruleId);
        if (removed) {
            platformLogger.info(`Alert rule removed: ${ruleId}`);
        }
        return removed;
    }

    /**
     * Generate an alert for critical events
     */
    async generateAlert(alertData) {
        try {
            const alert = this.createAlert(alertData);
            
            // Check rate limiting
            if (this.isRateLimited(alert)) {
                platformLogger.warn('Alert rate limited', { 
                    alertId: alert.id,
                    type: alert.type,
                    severity: alert.severity 
                });
                return null;
            }

            // Find matching alert rules
            const matchingRules = this.findMatchingRules(alert);
            
            if (matchingRules.length === 0) {
                // No rules match, use default logging
                platformLogger.warn('No alert rules matched, using default logging', { alert });
                await this.deliverToChannel(alert, ALERT_CHANNELS.LOG);
                return alert;
            }

            // Process alert through matching rules
            for (const rule of matchingRules) {
                await this.processAlertWithRule(alert, rule);
            }

            // Store alert in history
            this.alertHistory.set(alert.id, {
                ...alert,
                processedAt: new Date().toISOString(),
                rulesApplied: matchingRules.map(r => r.id)
            });

            // Emit alert event for other services
            this.emit('alertGenerated', alert);

            return alert;

        } catch (error) {
            platformLogger.error('Failed to generate alert', { 
                error: error.message,
                alertData 
            });
            throw error;
        }
    }

    /**
     * Create standardized alert object
     */
    createAlert(alertData) {
        const alert = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            severity: alertData.severity || ALERT_SEVERITY.MEDIUM,
            type: alertData.type || ALERT_TYPES.SYSTEM_ERROR,
            title: alertData.title || 'System Alert',
            message: alertData.message || 'An alert condition has been detected',
            source: alertData.source || 'system',
            tenantId: alertData.tenantId,
            userId: alertData.userId,
            correlationId: alertData.correlationId,
            metadata: alertData.metadata || {},
            context: {
                ipAddress: alertData.ipAddress,
                userAgent: alertData.userAgent,
                endpoint: alertData.endpoint,
                method: alertData.method,
                ...alertData.context
            }
        };

        return alert;
    }

    /**
     * Check if alert is rate limited
     */
    isRateLimited(alert) {
        const key = `${alert.type}_${alert.severity}_${alert.tenantId || 'global'}`;
        const now = Date.now();
        
        if (!this.rateLimiters.has(key)) {
            this.rateLimiters.set(key, []);
        }
        
        const timestamps = this.rateLimiters.get(key);
        
        // Remove old timestamps (outside rate limit window)
        const windowMs = 60 * 60 * 1000; // 1 hour default
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
        
        // Check if we're at the rate limit
        const maxAlerts = this.getMaxAlertsForType(alert.type, alert.severity);
        if (validTimestamps.length >= maxAlerts) {
            return true;
        }
        
        // Add current timestamp
        validTimestamps.push(now);
        this.rateLimiters.set(key, validTimestamps);
        
        return false;
    }

    /**
     * Get maximum alerts allowed for a type/severity combination
     */
    getMaxAlertsForType(type, severity) {
        // Default rate limits based on severity
        const defaults = {
            [ALERT_SEVERITY.CRITICAL]: 10,
            [ALERT_SEVERITY.HIGH]: 20,
            [ALERT_SEVERITY.MEDIUM]: 50,
            [ALERT_SEVERITY.LOW]: 100
        };
        
        return defaults[severity] || 50;
    }

    /**
     * Find alert rules that match the given alert
     */
    findMatchingRules(alert) {
        const matchingRules = [];
        
        for (const rule of this.alertRules.values()) {
            if (this.alertMatchesRule(alert, rule)) {
                matchingRules.push(rule);
            }
        }
        
        return matchingRules;
    }

    /**
     * Check if an alert matches a rule's conditions
     */
    alertMatchesRule(alert, rule) {
        const conditions = rule.conditions;
        
        // Check severity
        if (conditions.severity) {
            if (Array.isArray(conditions.severity)) {
                if (!conditions.severity.includes(alert.severity)) {
                    return false;
                }
            } else if (conditions.severity !== alert.severity) {
                return false;
            }
        }
        
        // Check type
        if (conditions.type) {
            if (Array.isArray(conditions.type)) {
                if (!conditions.type.includes(alert.type)) {
                    return false;
                }
            } else if (conditions.type !== alert.type) {
                return false;
            }
        }
        
        // Check tenant
        if (conditions.tenantId && conditions.tenantId !== alert.tenantId) {
            return false;
        }
        
        // Check source
        if (conditions.source && conditions.source !== alert.source) {
            return false;
        }
        
        return true;
    }

    /**
     * Process alert with a specific rule
     */
    async processAlertWithRule(alert, rule) {
        try {
            // Deliver to all configured channels
            for (const channel of rule.channels) {
                await this.deliverToChannel(alert, channel, rule);
            }
            
            // Setup escalation if enabled
            if (rule.escalation && rule.escalation.enabled) {
                this.setupEscalation(alert, rule);
            }
            
        } catch (error) {
            platformLogger.error('Failed to process alert with rule', {
                alertId: alert.id,
                ruleId: rule.id,
                error: error.message
            });
        }
    }

    /**
     * Deliver alert to a specific channel
     */
    async deliverToChannel(alert, channel, rule = null) {
        try {
            switch (channel) {
                case ALERT_CHANNELS.EMAIL:
                    await this.deliverEmailAlert(alert, rule);
                    break;
                    
                case ALERT_CHANNELS.WEBHOOK:
                    await this.deliverWebhookAlert(alert, rule);
                    break;
                    
                case ALERT_CHANNELS.CONSOLE:
                    this.deliverConsoleAlert(alert);
                    break;
                    
                case ALERT_CHANNELS.LOG:
                    this.deliverLogAlert(alert);
                    break;
                    
                default:
                    platformLogger.warn('Unknown alert channel', { channel, alertId: alert.id });
            }
            
        } catch (error) {
            platformLogger.error('Failed to deliver alert to channel', {
                alertId: alert.id,
                channel,
                error: error.message
            });
        }
    }

    /**
     * Deliver alert via email
     */
    async deliverEmailAlert(alert, rule) {
        if (!this.emailTransporter) {
            platformLogger.warn('Email transporter not configured, skipping email alert');
            return;
        }
        
        const recipients = this.getEmailRecipients(alert, rule);
        if (recipients.length === 0) {
            platformLogger.warn('No email recipients configured for alert', { alertId: alert.id });
            return;
        }
        
        const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
        const htmlContent = this.generateEmailContent(alert);
        
        const mailOptions = {
            from: process.env.ALERT_FROM_EMAIL || 'alerts@system.com',
            to: recipients.join(', '),
            subject,
            html: htmlContent,
            text: alert.message
        };
        
        try {
            await this.emailTransporter.sendMail(mailOptions);
            platformLogger.info('Email alert delivered', {
                alertId: alert.id,
                recipients: recipients.length
            });
        } catch (error) {
            platformLogger.error('Failed to send email alert', {
                alertId: alert.id,
                error: error.message
            });
        }
    }

    /**
     * Get email recipients for an alert
     */
    getEmailRecipients(alert, rule) {
        const recipients = [];
        
        // Add rule-specific recipients
        if (rule && rule.emailRecipients) {
            recipients.push(...rule.emailRecipients);
        }
        
        // Add default recipients based on severity
        const defaultRecipients = {
            [ALERT_SEVERITY.CRITICAL]: process.env.CRITICAL_ALERT_EMAILS?.split(',') || [],
            [ALERT_SEVERITY.HIGH]: process.env.HIGH_ALERT_EMAILS?.split(',') || [],
            [ALERT_SEVERITY.MEDIUM]: process.env.MEDIUM_ALERT_EMAILS?.split(',') || [],
            [ALERT_SEVERITY.LOW]: process.env.LOW_ALERT_EMAILS?.split(',') || []
        };
        
        recipients.push(...(defaultRecipients[alert.severity] || []));
        
        // Remove duplicates and filter out empty strings
        return [...new Set(recipients)].filter(email => email && email.trim());
    }

    /**
     * Generate HTML content for email alerts
     */
    generateEmailContent(alert) {
        return `
            <html>
            <body style="font-family: Arial, sans-serif; margin: 20px;">
                <div style="border-left: 4px solid ${this.getSeverityColor(alert.severity)}; padding-left: 20px;">
                    <h2 style="color: ${this.getSeverityColor(alert.severity)};">
                        ${alert.severity.toUpperCase()} ALERT
                    </h2>
                    <h3>${alert.title}</h3>
                    <p><strong>Message:</strong> ${alert.message}</p>
                    <p><strong>Time:</strong> ${alert.timestamp}</p>
                    <p><strong>Source:</strong> ${alert.source}</p>
                    ${alert.tenantId ? `<p><strong>Tenant:</strong> ${alert.tenantId}</p>` : ''}
                    ${alert.correlationId ? `<p><strong>Correlation ID:</strong> ${alert.correlationId}</p>` : ''}
                    
                    ${Object.keys(alert.context).length > 0 ? `
                        <h4>Context:</h4>
                        <ul>
                            ${Object.entries(alert.context)
                                .filter(([key, value]) => value)
                                .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
                                .join('')}
                        </ul>
                    ` : ''}
                    
                    ${Object.keys(alert.metadata).length > 0 ? `
                        <h4>Additional Information:</h4>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">
${JSON.stringify(alert.metadata, null, 2)}
                        </pre>
                    ` : ''}
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Get color for alert severity
     */
    getSeverityColor(severity) {
        const colors = {
            [ALERT_SEVERITY.CRITICAL]: '#dc3545',
            [ALERT_SEVERITY.HIGH]: '#fd7e14',
            [ALERT_SEVERITY.MEDIUM]: '#ffc107',
            [ALERT_SEVERITY.LOW]: '#28a745'
        };
        return colors[severity] || '#6c757d';
    }

    /**
     * Deliver alert via webhook
     */
    async deliverWebhookAlert(alert, rule) {
        const webhookUrls = this.getWebhookUrls(alert, rule);
        
        if (webhookUrls.length === 0) {
            platformLogger.warn('No webhook URLs configured for alert', { alertId: alert.id });
            return;
        }
        
        const payload = {
            alert,
            timestamp: new Date().toISOString(),
            source: 'logging-system'
        };
        
        for (const url of webhookUrls) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'LoggingSystem-AlertService/1.0'
                    },
                    body: JSON.stringify(payload),
                    timeout: 10000 // 10 second timeout
                });
                
                if (response.ok) {
                    platformLogger.info('Webhook alert delivered', {
                        alertId: alert.id,
                        webhookUrl: url,
                        status: response.status
                    });
                } else {
                    platformLogger.warn('Webhook alert delivery failed', {
                        alertId: alert.id,
                        webhookUrl: url,
                        status: response.status
                    });
                }
                
            } catch (error) {
                platformLogger.error('Failed to deliver webhook alert', {
                    alertId: alert.id,
                    webhookUrl: url,
                    error: error.message
                });
            }
        }
    }

    /**
     * Get webhook URLs for an alert
     */
    getWebhookUrls(alert, rule) {
        const urls = [];
        
        // Add rule-specific webhooks
        if (rule && rule.webhookUrls) {
            urls.push(...rule.webhookUrls);
        }
        
        // Add default webhooks based on severity
        const defaultWebhooks = {
            [ALERT_SEVERITY.CRITICAL]: process.env.CRITICAL_WEBHOOK_URLS?.split(',') || [],
            [ALERT_SEVERITY.HIGH]: process.env.HIGH_WEBHOOK_URLS?.split(',') || [],
            [ALERT_SEVERITY.MEDIUM]: process.env.MEDIUM_WEBHOOK_URLS?.split(',') || [],
            [ALERT_SEVERITY.LOW]: process.env.LOW_WEBHOOK_URLS?.split(',') || []
        };
        
        urls.push(...(defaultWebhooks[alert.severity] || []));
        
        // Remove duplicates and filter out empty strings
        return [...new Set(urls)].filter(url => url && url.trim());
    }

    /**
     * Deliver alert to console
     */
    deliverConsoleAlert(alert) {
        const color = this.getSeverityConsoleColor(alert.severity);
        console.log(`\n${color}[${alert.severity.toUpperCase()} ALERT]${'\x1b[0m'} ${alert.title}`);
        console.log(`Message: ${alert.message}`);
        console.log(`Time: ${alert.timestamp}`);
        console.log(`Source: ${alert.source}`);
        if (alert.tenantId) console.log(`Tenant: ${alert.tenantId}`);
        if (alert.correlationId) console.log(`Correlation ID: ${alert.correlationId}`);
        console.log('---');
    }

    /**
     * Get console color for alert severity
     */
    getSeverityConsoleColor(severity) {
        const colors = {
            [ALERT_SEVERITY.CRITICAL]: '\x1b[31m', // Red
            [ALERT_SEVERITY.HIGH]: '\x1b[33m',     // Yellow
            [ALERT_SEVERITY.MEDIUM]: '\x1b[36m',   // Cyan
            [ALERT_SEVERITY.LOW]: '\x1b[32m'       // Green
        };
        return colors[severity] || '\x1b[37m'; // White
    }

    /**
     * Deliver alert to log
     */
    deliverLogAlert(alert) {
        const logMethod = this.getLogMethodForSeverity(alert.severity);
        platformLogger[logMethod](`Alert: ${alert.title}`, {
            alertId: alert.id,
            alert,
            alertDelivery: true
        });
    }

    /**
     * Get appropriate log method for alert severity
     */
    getLogMethodForSeverity(severity) {
        const methods = {
            [ALERT_SEVERITY.CRITICAL]: 'error',
            [ALERT_SEVERITY.HIGH]: 'warn',
            [ALERT_SEVERITY.MEDIUM]: 'info',
            [ALERT_SEVERITY.LOW]: 'info'
        };
        return methods[severity] || 'info';
    }

    /**
     * Setup escalation for an alert
     */
    setupEscalation(alert, rule) {
        if (!rule.escalation || !rule.escalation.enabled) {
            return;
        }
        
        const timeoutMs = (rule.escalation.timeoutMinutes || 15) * 60 * 1000;
        
        setTimeout(async () => {
            // Check if alert has been acknowledged or resolved
            const alertStatus = this.getAlertStatus(alert.id);
            if (alertStatus && (alertStatus.acknowledged || alertStatus.resolved)) {
                return;
            }
            
            // Escalate alert
            const escalatedAlert = {
                ...alert,
                id: crypto.randomUUID(),
                title: `[ESCALATED] ${alert.title}`,
                message: `Alert escalated after ${rule.escalation.timeoutMinutes} minutes: ${alert.message}`,
                escalated: true,
                originalAlertId: alert.id
            };
            
            // Deliver to escalation channels
            for (const channel of rule.escalation.escalationChannels || []) {
                await this.deliverToChannel(escalatedAlert, channel, rule);
            }
            
            platformLogger.warn('Alert escalated', {
                originalAlertId: alert.id,
                escalatedAlertId: escalatedAlert.id,
                timeoutMinutes: rule.escalation.timeoutMinutes
            });
            
        }, timeoutMs);
    }

    /**
     * Get alert status (for escalation checking)
     */
    getAlertStatus(alertId) {
        // This would typically check a database or cache
        // For now, return null (not implemented)
        return null;
    }

    /**
     * Start the alert processor (for queued alerts)
     */
    startAlertProcessor() {
        setInterval(() => {
            this.processAlertQueue();
        }, 1000); // Process every second
    }

    /**
     * Process queued alerts
     */
    async processAlertQueue() {
        if (this.alertQueue.length === 0) {
            return;
        }
        
        const alertsToProcess = this.alertQueue.splice(0, 10); // Process up to 10 alerts at once
        
        for (const alertData of alertsToProcess) {
            try {
                await this.generateAlert(alertData);
            } catch (error) {
                platformLogger.error('Failed to process queued alert', {
                    alertData,
                    error: error.message
                });
            }
        }
    }

    /**
     * Queue an alert for processing
     */
    queueAlert(alertData) {
        this.alertQueue.push(alertData);
    }

    /**
     * Get alert statistics
     */
    getAlertStats() {
        return {
            queueLength: this.alertQueue.length,
            historyCount: this.alertHistory.size,
            rulesCount: this.alertRules.size,
            rateLimitersActive: this.rateLimiters.size
        };
    }

    /**
     * Clear alert history (for cleanup)
     */
    clearAlertHistory(olderThanHours = 24) {
        const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
        let cleared = 0;
        
        for (const [alertId, alert] of this.alertHistory.entries()) {
            const alertTime = new Date(alert.timestamp).getTime();
            if (alertTime < cutoffTime) {
                this.alertHistory.delete(alertId);
                cleared++;
            }
        }
        
        platformLogger.info('Alert history cleared', { 
            clearedCount: cleared,
            olderThanHours 
        });
        
        return cleared;
    }
}

// Create singleton instance
const alertGenerationService = new AlertGenerationService();

export {
    ALERT_SEVERITY,
    ALERT_TYPES,
    ALERT_CHANNELS,
    AlertGenerationService
};

export default alertGenerationService;