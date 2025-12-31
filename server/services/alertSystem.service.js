import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import os from 'os';
import systemMetricsService from './systemMetrics.service.js';
import mongoMetricsService from './mongoMetrics.service.js';

/**
 * Alert System Service
 * Manages system alerts and notifications using existing email service patterns
 */
class AlertSystemService {
  constructor() {
    this.emailTransporter = null;
    this.alertHistory = [];
    this.alertThresholds = {
      cpu: { warning: 80, critical: 90 },
      memory: { warning: 85, critical: 95 },
      disk: { warning: 85, critical: 95 },
      mongodb: {
        connections: { warning: 80, critical: 90 },
        longRunningOps: { warning: 5, critical: 10 }
      }
    };
    this.alertCooldowns = new Map(); // Prevent spam
    this.isInitialized = false;
  }

  /**
   * Initialize the alert system
   */
  async initialize() {
    if (this.isInitialized) return;

    await this.setupEmailTransporter();
    await this.createAlertModel();
    this.isInitialized = true;
    console.log('Alert system service initialized');
  }

  /**
   * Setup email transporter using existing patterns
   */
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
        tls: {
          rejectUnauthorized: false
        }
      };

      // Only create transporter if SMTP is configured
      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransporter(emailConfig);

        // Verify connection
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

  /**
   * Create Alert model using existing Mongoose patterns
   */
  async createAlertModel() {
    // Check if model already exists
    if (mongoose.models.SystemAlert) {
      this.AlertModel = mongoose.models.SystemAlert;
      return;
    }

    const alertSchema = new mongoose.Schema({
      alertId: {
        type: String,
        required: true,
        unique: true
      },
      type: {
        type: String,
        required: true,
        enum: ['system', 'database', 'application', 'security', 'performance'],
        index: true
      },
      category: {
        type: String,
        required: true,
        enum: ['cpu', 'memory', 'disk', 'network', 'mongodb', 'license', 'tenant', 'custom'],
        index: true
      },
      severity: {
        type: String,
        required: true,
        enum: ['info', 'warning', 'critical', 'emergency'],
        index: true
      },
      title: {
        type: String,
        required: true
      },
      message: {
        type: String,
        required: true
      },
      details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      metrics: {
        value: Number,
        threshold: Number,
        unit: String
      },
      source: {
        component: String,
        hostname: String,
        service: String
      },
      status: {
        type: String,
        enum: ['active', 'acknowledged', 'resolved', 'suppressed'],
        default: 'active',
        index: true
      },
      acknowledgedBy: {
        type: String,
        default: null
      },
      acknowledgedAt: {
        type: Date,
        default: null
      },
      resolvedAt: {
        type: Date,
        default: null
      },
      notificationsSent: [{
        channel: String,
        sentAt: Date,
        success: Boolean,
        error: String
      }],
      tags: [String],
      tenantId: {
        type: String,
        index: true,
        sparse: true
      }
    }, {
      timestamps: true,
      collection: 'system_alerts'
    });

    // Indexes for performance
    alertSchema.index({ createdAt: -1 });
    alertSchema.index({ status: 1, severity: 1 });
    alertSchema.index({ type: 1, category: 1 });
    alertSchema.index({ tenantId: 1, status: 1 }, { sparse: true });

    this.AlertModel = mongoose.model('SystemAlert', alertSchema);
  }

  /**
   * Generate unique alert ID
   * @returns {string} Unique alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if alert is in cooldown period
   * @param {string} alertKey - Unique key for the alert type
   * @param {number} cooldownMinutes - Cooldown period in minutes
   * @returns {boolean} True if in cooldown
   */
  isInCooldown(alertKey, cooldownMinutes = 15) {
    const lastSent = this.alertCooldowns.get(alertKey);
    if (!lastSent) return false;

    const cooldownMs = cooldownMinutes * 60 * 1000;
    return (Date.now() - lastSent) < cooldownMs;
  }

  /**
   * Set alert cooldown
   * @param {string} alertKey - Unique key for the alert type
   */
  setCooldown(alertKey) {
    this.alertCooldowns.set(alertKey, Date.now());
  }

  /**
   * Create and store alert
   * @param {Object} alertData - Alert information
   * @returns {Promise<Object>} Created alert
   */
  async createAlert(alertData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const alert = new this.AlertModel({
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

    await alert.save();

    // Add to in-memory history (keep last 100)
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(0, 100);
    }

    return alert;
  }

  /**
   * Send alert notification
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Notification result
   */
  async sendAlertNotification(alert) {
    const results = {
      success: false,
      channels: {},
      errors: []
    };

    // Check cooldown
    const alertKey = `${alert.category}_${alert.severity}`;
    if (this.isInCooldown(alertKey)) {
      return {
        success: false,
        skipped: true,
        reason: 'Alert in cooldown period'
      };
    }

    // Send email notification
    if (this.emailTransporter && process.env.ADMIN_EMAIL) {
      try {
        const emailResult = await this.sendEmailNotification(alert);
        results.channels.email = emailResult;

        if (emailResult.success) {
          results.success = true;
          this.setCooldown(alertKey);

          // Update alert with notification info
          alert.notificationsSent.push({
            channel: 'email',
            sentAt: new Date(),
            success: true
          });
          await alert.save();
        } else {
          results.errors.push(`Email: ${emailResult.error}`);

          // Update alert with failed notification
          alert.notificationsSent.push({
            channel: 'email',
            sentAt: new Date(),
            success: false,
            error: emailResult.error
          });
          await alert.save();
        }
      } catch (error) {
        results.errors.push(`Email notification failed: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Send email notification
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Email result
   */
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
            
            ${Object.keys(alert.details).length > 0 ? `
              <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <strong>Additional Details:</strong><br>
                <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(alert.details, null, 2)}</pre>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <strong>Source Information:</strong><br>
              Component: ${alert.source.component}<br>
              Hostname: ${alert.source.hostname}<br>
              Service: ${alert.source.service}<br>
              ${alert.tenantId ? `Tenant: ${alert.tenantId}<br>` : ''}
              Time: ${alert.createdAt.toISOString()}
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

Source: ${alert.source.component} on ${alert.source.hostname}
${alert.tenantId ? `Tenant: ${alert.tenantId}` : ''}
Time: ${alert.createdAt.toISOString()}
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

  /**
   * Process system health and generate alerts
   * @returns {Promise<Array>} Generated alerts
   */
  async processSystemHealth() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const alerts = [];

    try {
      // Get system metrics
      const systemHealth = await systemMetricsService.getSystemHealth();

      // Process system alerts
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

        // Send notification for critical alerts
        if (alert.level === 'critical') {
          await this.sendAlertNotification(systemAlert);
        }

        alerts.push(systemAlert);
      }

      // Get MongoDB metrics
      const mongoHealth = await mongoMetricsService.getMongoHealth();

      // Process MongoDB alerts
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

        // Send notification for critical alerts
        if (alert.level === 'critical') {
          await this.sendAlertNotification(mongoAlert);
        }

        alerts.push(mongoAlert);
      }

    } catch (error) {
      console.error('Error processing system health alerts:', error);

      // Create an alert about the alert system failure
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

  /**
   * Get active alerts
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Active alerts
   */
  async getActiveAlerts(filters = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const query = { status: 'active' };

    if (filters.severity) {
      query.severity = filters.severity;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.tenantId) {
      query.tenantId = filters.tenantId;
    }

    return await this.AlertModel.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);
  }

  /**
   * Acknowledge alert
   * @param {string} alertId - Alert ID
   * @param {string} acknowledgedBy - User who acknowledged
   * @returns {Promise<Object>} Updated alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.AlertModel.findOneAndUpdate(
      { alertId },
      {
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Resolve alert
   * @param {string} alertId - Alert ID
   * @returns {Promise<Object>} Updated alert
   */
  async resolveAlert(alertId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.AlertModel.findOneAndUpdate(
      { alertId },
      {
        status: 'resolved',
        resolvedAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Get alert statistics
   * @returns {Promise<Object>} Alert statistics
   */
  async getAlertStatistics() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const stats = await this.AlertModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          acknowledged: { $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          warning: { $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] } },
          info: { $sum: { $cond: [{ $eq: ['$severity', 'info'] }, 1, 0] } }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      critical: 0,
      warning: 0,
      info: 0
    };
  }

  /**
   * Start periodic alert processing
   * @param {number} interval - Processing interval in milliseconds
   */
  startPeriodicProcessing(interval = 300000) { // 5 minutes default
    const processAlerts = async () => {
      try {
        await this.processSystemHealth();
      } catch (error) {
        console.error('Error in periodic alert processing:', error);
      }
    };

    // Process immediately
    processAlerts();

    // Set up periodic processing
    return setInterval(processAlerts, interval);
  }

  /**
   * Stop periodic processing
   * @param {NodeJS.Timeout} intervalId - Interval ID
   */
  stopPeriodicProcessing(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export default new AlertSystemService();