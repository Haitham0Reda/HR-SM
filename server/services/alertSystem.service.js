import nodemailer from 'nodemailer';
import os from 'os';
import systemMetricsService from './systemMetrics.service.js';
import mongoMetricsService from './mongoMetrics.service.js';
import SystemAlert from '../platform/system/models/systemAlert.model.js';
import { Op } from 'sequelize';
import { mainAppDb } from '../config/database.js';

/**
 * Alert System Service - PostgreSQL (Sequelize)
 * Manages system alerts and notifications
 */
class AlertSystemService {
  constructor() {
    this.emailTransporter = null;
    this.alertHistory = [];
    this.alertThresholds = {
      cpu: { warning: 80, critical: 90 },
      memory: { warning: 85, critical: 95 },
      disk: { warning: 85, critical: 95 },
      postgresql: {
        connections: { warning: 80, critical: 90 },
        longRunningOps: { warning: 5, critical: 10 }
      }
    };
    this.alertCooldowns = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    await this.setupEmailTransporter();
    this.isInitialized = true;
    console.log('Alert system service initialized');
  }

  async setupEmailTransporter() {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false }
      };

      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransporter(emailConfig);
        await this.emailTransporter.verify();
        console.log('Alert system email transporter configured successfully');
      } else {
        console.log('Alert system email transporter not configured (missing SMTP credentials)');
      }
    } catch (error) {
      console.error('Failed to setup alert system email transporter:', error.message);
      this.emailTransporter = null;
    }
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isInCooldown(alertKey, cooldownMinutes = 15) {
    const lastSent = this.alertCooldowns.get(alertKey);
    if (!lastSent) return false;
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return (Date.now() - lastSent) < cooldownMs;
  }

  setCooldown(alertKey) {
    this.alertCooldowns.set(alertKey, Date.now());
  }

  async createAlert(alertData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const alert = await SystemAlert.create({
      alertId: this.generateAlertId(),
      type: alertData.type || 'system',
      category: alertData.category || 'custom',
      severity: alertData.severity || 'info',
      title: alertData.title,
      message: alertData.message,
      details: alertData.details || {},
      metrics: alertData.metrics || {},
      source: {
        component: alertData.source?.component || 'alert-system',
        hostname: alertData.source?.hostname || os.hostname(),
        service: alertData.source?.service || 'hr-sm-platform'
      },
      tags: alertData.tags || [],
      tenantId: alertData.tenantId || null
    });

    this.alertHistory.unshift(alert.toJSON());
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(0, 100);
    }

    return alert;
  }

  async sendAlertNotification(alert) {
    const results = {
      success: false,
      channels: {},
      errors: []
    };

    const alertKey = `${alert.category}_${alert.severity}`;
    if (this.isInCooldown(alertKey)) {
      return {
        success: false,
        skipped: true,
        reason: 'Alert in cooldown period'
      };
    }

    if (this.emailTransporter && process.env.ADMIN_EMAIL) {
      try {
        const emailResult = await this.sendEmailNotification(alert);
        results.channels.email = emailResult;

        if (emailResult.success) {
          results.success = true;
          this.setCooldown(alertKey);

          const notificationsSent = alert.notificationsSent || [];
          notificationsSent.push({
            channel: 'email',
            sentAt: new Date(),
            success: true
          });

          await SystemAlert.update(
            { notificationsSent },
            { where: { id: alert.id } }
          );
        } else {
          results.errors.push(`Email: ${emailResult.error}`);

          const notificationsSent = alert.notificationsSent || [];
          notificationsSent.push({
            channel: 'email',
            sentAt: new Date(),
            success: false,
            error: emailResult.error
          });

          await SystemAlert.update(
            { notificationsSent },
            { where: { id: alert.id } }
          );
        }
      } catch (error) {
        results.errors.push(`Email notification failed: ${error.message}`);
      }
    }

    return results;
  }

  async sendEmailNotification(alert) {
    if (!this.emailTransporter) {
      return {
        success: false,
        error: 'Email transporter not configured'
      };
    }

    try {
      const severityColors = {
        info: '#17a2b8',
        warning: '#ffc107',
        critical: '#dc3545',
        emergency: '#6f42c1'
      };

      const severityIcons = {
        info: 'ℹ️',
        warning: '⚠️',
        critical: '🚨',
        emergency: '🔥'
      };

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${severityColors[alert.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">
              ${severityIcons[alert.severity]} ${alert.title}
            </h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
              Severity: ${alert.severity.toUpperCase()} | Type: ${alert.type} | Category: ${alert.category}
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
            <h2 style="color: #495057; margin-top: 0;">Alert Details</h2>
            <p style="color: #6c757d; line-height: 1.6;">${alert.message}</p>
            
            ${alert.metrics?.value ? `
              <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <strong>Metrics:</strong><br>
                Value: ${alert.metrics.value}${alert.metrics.unit || ''}<br>
                Threshold: ${alert.metrics.threshold}${alert.metrics.unit || ''}
              </div>
            ` : ''}
            
            ${Object.keys(alert.details || {}).length > 0 ? `
              <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <strong>Additional Details:</strong><br>
                <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(alert.details, null, 2)}</pre>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <strong>Source Information:</strong><br>
              Component: ${alert.source?.component || 'unknown'}<br>
              Hostname: ${alert.source?.hostname || 'unknown'}<br>
              Service: ${alert.source?.service || 'unknown'}<br>
              ${alert.tenantId ? `Tenant: ${alert.tenantId}<br>` : ''}
              Time: ${alert.createdAt || new Date().toISOString()}
            </div>
          </div>
          
          <div style="background-color: #e9ecef; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d;">
            HR-SM Platform Alert System | Alert ID: ${alert.alertId}
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        html: htmlContent,
        text: `
Alert: ${alert.title}
Severity: ${alert.severity.toUpperCase()}
Type: ${alert.type}
Category: ${alert.category}

Message: ${alert.message}

${alert.metrics?.value ? `Metrics: ${alert.metrics.value}${alert.metrics.unit || ''} (Threshold: ${alert.metrics.threshold}${alert.metrics.unit || ''})` : ''}

Source: ${alert.source?.component || 'unknown'} on ${alert.source?.hostname || 'unknown'}
${alert.tenantId ? `Tenant: ${alert.tenantId}` : ''}
Time: ${alert.createdAt || new Date().toISOString()}
Alert ID: ${alert.alertId}
        `.trim()
      };

      const info = await this.emailTransporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processSystemHealth() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const alerts = [];

    try {
      const systemHealth = await systemMetricsService.getSystemHealth();

      for (const alert of systemHealth.alerts) {
        const systemAlert = await this.createAlert({
          type: 'system',
          category: alert.type,
          severity: alert.level === 'critical' ? 'critical' : 'warning',
          title: `System ${alert.type.toUpperCase()} Alert`,
          message: alert.message,
          metrics: {
            value: alert.value,
            threshold: alert.threshold,
            unit: alert.type === 'cpu' || alert.type === 'memory' || alert.type === 'disk' ? '%' : ''
          },
          details: {
            systemHealth: {
              healthScore: systemHealth.healthScore,
              status: systemHealth.status
            }
          }
        });

        if (alert.level === 'critical') {
          await this.sendAlertNotification(systemAlert);
        }

        alerts.push(systemAlert);
      }

      const mongoHealth = await mongoMetricsService.getMongoHealth();

      for (const alert of mongoHealth.alerts || []) {
        const mongoAlert = await this.createAlert({
          type: 'database',
          category: 'mongodb',
          severity: alert.level === 'critical' ? 'critical' : 'warning',
          title: `MongoDB ${alert.type.toUpperCase()} Alert`,
          message: alert.message,
          metrics: {
            value: alert.value,
            threshold: alert.threshold,
            unit: alert.type === 'connections' ? '%' : ''
          },
          details: {
            mongoHealth: {
              healthScore: mongoHealth.healthScore,
              status: mongoHealth.status,
              currentOperations: mongoHealth.currentOperations
            }
          }
        });

        if (alert.level === 'critical') {
          await this.sendAlertNotification(mongoAlert);
        }

        alerts.push(mongoAlert);
      }

    } catch (error) {
      console.error('Error processing system health alerts:', error);

      const systemAlert = await this.createAlert({
        type: 'system',
        category: 'custom',
        severity: 'warning',
        title: 'Alert System Error',
        message: 'Failed to process system health metrics',
        details: {
          error: error.message,
          stack: error.stack
        }
      });

      alerts.push(systemAlert);
    }

    return alerts;
  }

  async getActiveAlerts(filters = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const where = { status: 'active' };

    if (filters.severity) where.severity = filters.severity;
    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.tenantId) where.tenantId = filters.tenantId;

    return await SystemAlert.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 50
    });
  }

  async acknowledgeAlert(alertId, acknowledgedBy) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const [updated] = await SystemAlert.update(
      {
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date()
      },
      {
        where: { alertId },
        returning: true
      }
    );

    if (updated) {
      return await SystemAlert.findOne({ where: { alertId } });
    }
    return null;
  }

  async resolveAlert(alertId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const [updated] = await SystemAlert.update(
      {
        status: 'resolved',
        resolvedAt: new Date()
      },
      {
        where: { alertId },
        returning: true
      }
    );

    if (updated) {
      return await SystemAlert.findOne({ where: { alertId } });
    }
    return null;
  }

  async getAlertStatistics() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const [stats] = await mainAppDb.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledged,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info
      FROM system_alerts
    `, {
      type: mainAppDb.QueryTypes.SELECT
    });

    return stats || {
      total: 0,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      critical: 0,
      warning: 0,
      info: 0
    };
  }

  startPeriodicProcessing(interval = 300000) {
    const processAlerts = async () => {
      try {
        await this.processSystemHealth();
      } catch (error) {
        console.error('Error in periodic alert processing:', error);
      }
    };

    processAlerts();
    return setInterval(processAlerts, interval);
  }

  stopPeriodicProcessing(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export default new AlertSystemService();
