/**
 * Alert Channels Service
 * 
 * Manages different alert delivery channels (email, Slack, webhook)
 */

import nodemailer from 'nodemailer';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import loggingConfigManager from '../config/logging.config.js';

class AlertChannelsService {
    constructor() {
        this.configManager = loggingConfigManager;
        this.emailTransporter = null;
        this.channelStats = {
            email: { sent: 0, failed: 0, lastSent: null },
            slack: { sent: 0, failed: 0, lastSent: null },
            webhook: { sent: 0, failed: 0, lastSent: null }
        };
    }
    
    /**
     * Initialize the alert channels service
     */
    async initialize() {
        await this.configManager.initialize();
        await this.setupEmailTransporter();
        console.log('Alert channels service initialized');
    }
    
    /**
     * Setup email transporter
     */
    async setupEmailTransporter() {
        try {
            // Use environment variables for email configuration
            const emailConfig = {
                host: process.env.SMTP_HOST || 'localhost',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            };
            
            // Only create transporter if SMTP is configured
            if (emailConfig.auth.user && emailConfig.auth.pass) {
                this.emailTransporter = nodemailer.createTransporter(emailConfig);
                
                // Verify connection
                await this.emailTransporter.verify();
                console.log('Email transporter configured successfully');
            } else {
                console.log('Email transporter not configured (missing SMTP credentials)');
            }
        } catch (error) {
            console.error('Failed to setup email transporter:', error.message);
            this.emailTransporter = null;
        }
    }
    
    /**
     * Send alert through all configured channels
     */
    async sendAlert(alert, companyId = null) {
        const results = {
            success: false,
            channels: {},
            errors: []
        };
        
        try {
            const alertConfig = this.configManager.getAlertConfig(companyId);
            let sentToAnyChannel = false;
            
            // Send to email if configured and severity matches
            if (alertConfig.channels.email.enabled && 
                alertConfig.channels.email.severity.includes(alert.severity)) {
                
                const emailResult = await this.sendEmailAlert(alert, alertConfig.channels.email);
                results.channels.email = emailResult;
                
                if (emailResult.success) {
                    sentToAnyChannel = true;
                    this.channelStats.email.sent++;
                    this.channelStats.email.lastSent = new Date();
                } else {
                    this.channelStats.email.failed++;
                    results.errors.push(`Email: ${emailResult.error}`);
                }
            }
            
            // Send to Slack if configured and severity matches
            if (alertConfig.channels.slack.enabled && 
                alertConfig.channels.slack.severity.includes(alert.severity)) {
                
                const slackResult = await this.sendSlackAlert(alert, alertConfig.channels.slack);
                results.channels.slack = slackResult;
                
                if (slackResult.success) {
                    sentToAnyChannel = true;
                    this.channelStats.slack.sent++;
                    this.channelStats.slack.lastSent = new Date();
                } else {
                    this.channelStats.slack.failed++;
                    results.errors.push(`Slack: ${slackResult.error}`);
                }
            }
            
            // Send to webhook if configured and severity matches
            if (alertConfig.channels.webhook.enabled && 
                alertConfig.channels.webhook.severity.includes(alert.severity)) {
                
                const webhookResult = await this.sendWebhookAlert(alert, alertConfig.channels.webhook);
                results.channels.webhook = webhookResult;
                
                if (webhookResult.success) {
                    sentToAnyChannel = true;
                    this.channelStats.webhook.sent++;
                    this.channelStats.webhook.lastSent = new Date();
                } else {
                    this.channelStats.webhook.failed++;
                    results.errors.push(`Webhook: ${webhookResult.error}`);
                }
            }
            
            results.success = sentToAnyChannel;
            
            if (!sentToAnyChannel && results.errors.length === 0) {
                results.errors.push('No alert channels configured for this severity level');
            }
            
        } catch (error) {
            results.errors.push(`General error: ${error.message}`);
        }
        
        return results;
    }
    
    /**
     * Send email alert
     */
    async sendEmailAlert(alert, emailConfig) {
        try {
            if (!this.emailTransporter) {
                return {
                    success: false,
                    error: 'Email transporter not configured'
                };
            }
            
            const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
            const htmlBody = this.generateEmailHTML(alert);
            const textBody = this.generateEmailText(alert);
            
            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@logging-system.com',
                to: emailConfig.recipients.join(', '),
                subject,
                text: textBody,
                html: htmlBody
            };
            
            const info = await this.emailTransporter.sendMail(mailOptions);
            
            return {
                success: true,
                messageId: info.messageId,
                recipients: emailConfig.recipients.length
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Send Slack alert
     */
    async sendSlackAlert(alert, slackConfig) {
        try {
            if (!slackConfig.webhookUrl) {
                return {
                    success: false,
                    error: 'Slack webhook URL not configured'
                };
            }
            
            const slackPayload = {
                channel: slackConfig.channel || '#alerts',
                username: 'Logging System',
                icon_emoji: this.getSeverityEmoji(alert.severity),
                attachments: [{
                    color: this.getSeverityColor(alert.severity),
                    title: alert.title,
                    text: alert.message,
                    fields: [
                        {
                            title: 'Severity',
                            value: alert.severity.toUpperCase(),
                            short: true
                        },
                        {
                            title: 'Source',
                            value: alert.source,
                            short: true
                        },
                        {
                            title: 'Timestamp',
                            value: alert.timestamp,
                            short: true
                        }
                    ],
                    footer: 'Logging System Alert',
                    ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
                }]
            };
            
            if (alert.companyId) {
                slackPayload.attachments[0].fields.push({
                    title: 'Company',
                    value: alert.companyId,
                    short: true
                });
            }
            
            const result = await this.sendWebhookRequest(slackConfig.webhookUrl, slackPayload);
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Send webhook alert
     */
    async sendWebhookAlert(alert, webhookConfig) {
        try {
            if (!webhookConfig.url) {
                return {
                    success: false,
                    error: 'Webhook URL not configured'
                };
            }
            
            const webhookPayload = {
                alert: {
                    id: alert.id,
                    type: alert.type,
                    severity: alert.severity,
                    title: alert.title,
                    message: alert.message,
                    source: alert.source,
                    timestamp: alert.timestamp,
                    companyId: alert.companyId,
                    metadata: alert.metadata
                },
                system: {
                    name: 'Logging System',
                    version: '1.0.0',
                    environment: process.env.NODE_ENV || 'development'
                }
            };
            
            const result = await this.sendWebhookRequest(webhookConfig.url, webhookPayload);
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Send HTTP request to webhook
     */
    async sendWebhookRequest(url, payload) {
        return new Promise((resolve) => {
            try {
                const parsedUrl = new URL(url);
                const isHttps = parsedUrl.protocol === 'https:';
                const httpModule = isHttps ? https : http;
                
                const postData = JSON.stringify(payload);
                
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (isHttps ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData),
                        'User-Agent': 'Logging-System-Alerts/1.0'
                    },
                    timeout: 10000 // 10 second timeout
                };
                
                const req = httpModule.request(options, (res) => {
                    let responseData = '';
                    
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({
                                success: true,
                                statusCode: res.statusCode,
                                response: responseData
                            });
                        } else {
                            resolve({
                                success: false,
                                error: `HTTP ${res.statusCode}: ${responseData}`
                            });
                        }
                    });
                });
                
                req.on('error', (error) => {
                    resolve({
                        success: false,
                        error: error.message
                    });
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    resolve({
                        success: false,
                        error: 'Request timeout'
                    });
                });
                
                req.write(postData);
                req.end();
                
            } catch (error) {
                resolve({
                    success: false,
                    error: error.message
                });
            }
        });
    }
    
    /**
     * Generate HTML email content
     */
    generateEmailHTML(alert) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Logging System Alert</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .field { margin-bottom: 15px; }
        .field-label { font-weight: bold; color: #333; }
        .field-value { margin-top: 5px; color: #666; }
        .metadata { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px; }
        .footer { background-color: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${alert.severity.toUpperCase()} ALERT</h1>
            <h2>${alert.title}</h2>
        </div>
        <div class="content">
            <div class="field">
                <div class="field-label">Message:</div>
                <div class="field-value">${alert.message}</div>
            </div>
            <div class="field">
                <div class="field-label">Source:</div>
                <div class="field-value">${alert.source}</div>
            </div>
            <div class="field">
                <div class="field-label">Timestamp:</div>
                <div class="field-value">${alert.timestamp}</div>
            </div>
            ${alert.companyId ? `
            <div class="field">
                <div class="field-label">Company:</div>
                <div class="field-value">${alert.companyId}</div>
            </div>
            ` : ''}
            ${alert.metadata && Object.keys(alert.metadata).length > 0 ? `
            <div class="metadata">
                <div class="field-label">Additional Information:</div>
                <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            This alert was generated by the Logging System monitoring service.
        </div>
    </div>
</body>
</html>`;
    }
    
    /**
     * Generate plain text email content
     */
    generateEmailText(alert) {
        let text = `LOGGING SYSTEM ALERT - ${alert.severity.toUpperCase()}\n\n`;
        text += `Title: ${alert.title}\n`;
        text += `Message: ${alert.message}\n`;
        text += `Source: ${alert.source}\n`;
        text += `Timestamp: ${alert.timestamp}\n`;
        
        if (alert.companyId) {
            text += `Company: ${alert.companyId}\n`;
        }
        
        if (alert.metadata && Object.keys(alert.metadata).length > 0) {
            text += `\nAdditional Information:\n`;
            text += JSON.stringify(alert.metadata, null, 2);
        }
        
        text += `\n\n---\nThis alert was generated by the Logging System monitoring service.`;
        
        return text;
    }
    
    /**
     * Get emoji for severity level
     */
    getSeverityEmoji(severity) {
        const emojis = {
            low: ':information_source:',
            medium: ':warning:',
            high: ':exclamation:',
            critical: ':rotating_light:'
        };
        return emojis[severity] || ':question:';
    }
    
    /**
     * Get color for severity level
     */
    getSeverityColor(severity) {
        const colors = {
            low: '#36a64f',      // Green
            medium: '#ff9500',   // Orange
            high: '#ff0000',     // Red
            critical: '#8b0000'  // Dark Red
        };
        return colors[severity] || '#cccccc';
    }
    
    /**
     * Test alert channels
     */
    async testAlertChannels(companyId = null) {
        const testAlert = {
            id: `test-${Date.now()}`,
            type: 'test',
            severity: 'low',
            title: 'Test Alert',
            message: 'This is a test alert to verify channel configuration.',
            source: 'alert-channels-service',
            timestamp: new Date().toISOString(),
            companyId,
            metadata: {
                test: true,
                timestamp: new Date().toISOString()
            }
        };
        
        const result = await this.sendAlert(testAlert, companyId);
        
        return {
            success: result.success,
            message: result.success ? 'Test alerts sent successfully' : 'Test alerts failed',
            channels: result.channels,
            errors: result.errors
        };
    }
    
    /**
     * Get channel statistics
     */
    getChannelStatistics() {
        return {
            success: true,
            data: {
                statistics: this.channelStats,
                summary: {
                    totalSent: Object.values(this.channelStats).reduce((sum, stat) => sum + stat.sent, 0),
                    totalFailed: Object.values(this.channelStats).reduce((sum, stat) => sum + stat.failed, 0),
                    channels: Object.keys(this.channelStats).length
                }
            }
        };
    }
    
    /**
     * Reset channel statistics
     */
    resetChannelStatistics() {
        for (const channel in this.channelStats) {
            this.channelStats[channel] = { sent: 0, failed: 0, lastSent: null };
        }
        
        return {
            success: true,
            message: 'Channel statistics reset successfully'
        };
    }
}

// Create singleton instance
const alertChannelsService = new AlertChannelsService();

export default alertChannelsService;
export { AlertChannelsService };