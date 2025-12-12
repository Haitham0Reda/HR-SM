import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import SMTPProvider from '../providers/smtpProvider.js';
import SendGridProvider from '../providers/sendgridProvider.js';
import SESProvider from '../providers/sesProvider.js';
import EmailLog from '../models/EmailLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Service
 * Manages email sending with multiple providers and template rendering
 */
class EmailService {
  constructor() {
    this.providers = new Map();
    this.templates = new Map();
    this.defaultProvider = null;
  }

  /**
   * Initialize email service with configuration
   * @param {Object} config - Email service configuration
   * @param {string} config.provider - Default provider (smtp, sendgrid, ses)
   * @param {Object} config.smtp - SMTP configuration
   * @param {Object} config.sendgrid - SendGrid configuration
   * @param {Object} config.ses - SES configuration
   */
  async initialize(config) {
    // Initialize SMTP provider if configured
    if (config.smtp) {
      const smtpProvider = new SMTPProvider(config.smtp);
      this.providers.set('smtp', smtpProvider);
    }

    // Initialize SendGrid provider if configured
    if (config.sendgrid) {
      const sendgridProvider = new SendGridProvider(config.sendgrid);
      this.providers.set('sendgrid', sendgridProvider);
    }

    // Initialize SES provider if configured
    if (config.ses) {
      const sesProvider = new SESProvider(config.ses);
      this.providers.set('ses', sesProvider);
    }

    // Set default provider
    if (config.provider && this.providers.has(config.provider)) {
      this.defaultProvider = config.provider;
    } else if (this.providers.size > 0) {
      this.defaultProvider = this.providers.keys().next().value;
    }

    // Load email templates
    await this.loadTemplates();
  }

  /**
   * Load email templates from templates directory
   */
  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates');
      const files = await fs.readdir(templatesDir);

      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const templateName = file.replace('.hbs', '');
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          const compiledTemplate = Handlebars.compile(templateContent);
          this.templates.set(templateName, compiledTemplate);
        }
      }
    } catch (error) {
      console.error('Failed to load email templates:', error.message);
    }
  }

  /**
   * Send email using configured provider
   * @param {string} tenantId - Tenant identifier
   * @param {Object} emailData - Email data
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} [emailData.template] - Template name
   * @param {Object} [emailData.variables] - Template variables
   * @param {string} [emailData.html] - HTML content (if not using template)
   * @param {string} [emailData.text] - Plain text content
   * @param {string} [emailData.from] - Sender email
   * @param {string} [emailData.provider] - Specific provider to use
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(tenantId, emailData) {
    const log = {
      tenantId,
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      template: emailData.template,
      status: 'queued',
      createdAt: new Date()
    };

    try {
      // Get provider
      const providerName = emailData.provider || this.defaultProvider;
      const provider = this.providers.get(providerName);

      if (!provider) {
        throw new Error(`Email provider '${providerName}' not configured`);
      }

      log.provider = providerName;

      // Render template if specified
      let html = emailData.html;
      if (emailData.template) {
        const template = this.templates.get(emailData.template);
        if (!template) {
          throw new Error(`Email template '${emailData.template}' not found`);
        }
        html = template(emailData.variables || {});
      }

      if (!html) {
        throw new Error('Email must have either html content or template');
      }

      // Send email
      const result = await provider.sendEmail({
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
        html,
        text: emailData.text,
        attachments: emailData.attachments
      });

      // Update log
      if (result.success) {
        log.status = 'sent';
        log.messageId = result.messageId;
        log.sentAt = new Date();
      } else {
        log.status = 'failed';
        log.error = result.error;
      }

      log.metadata = {
        provider: result.provider,
        response: result.response || result.statusCode
      };

      // Save log
      await EmailLog.create(log);

      return result;
    } catch (error) {
      // Log failure
      log.status = 'failed';
      log.error = error.message;
      await EmailLog.create(log);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if email service is enabled for tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<boolean>} Enabled status
   */
  async isEnabled(tenantId) {
    // For now, return true if any provider is configured
    // In the future, this should check tenant-specific configuration
    return this.providers.size > 0;
  }

  /**
   * Get available templates
   * @returns {Array<string>} Template names
   */
  getTemplates() {
    return Array.from(this.templates.keys());
  }

  /**
   * Get email logs for tenant
   * @param {string} tenantId - Tenant identifier
   * @param {Object} options - Query options
   * @param {number} [options.limit=50] - Maximum number of logs
   * @param {number} [options.skip=0] - Number of logs to skip
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<Array>} Email logs
   */
  async getLogs(tenantId, options = {}) {
    const query = { tenantId };
    
    if (options.status) {
      query.status = options.status;
    }

    const logs = await EmailLog.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .lean();

    return logs;
  }

  /**
   * Verify provider configuration
   * @param {string} providerName - Provider name
   * @returns {Promise<boolean>} Verification result
   */
  async verifyProvider(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return false;
    }
    return await provider.verify();
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
