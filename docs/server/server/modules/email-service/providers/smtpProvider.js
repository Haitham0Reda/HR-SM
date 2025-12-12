import nodemailer from 'nodemailer';
import EmailProvider from './emailProvider.js';

/**
 * SMTP Email Provider
 * Supports standard SMTP servers (Gmail, Outlook, custom SMTP)
 */
class SMTPProvider extends EmailProvider {
  /**
   * Initialize SMTP provider
   * @param {Object} config - SMTP configuration
   * @param {string} config.host - SMTP host
   * @param {number} config.port - SMTP port
   * @param {boolean} config.secure - Use TLS
   * @param {Object} config.auth - Authentication credentials
   * @param {string} config.auth.user - SMTP username
   * @param {string} config.auth.pass - SMTP password
   */
  constructor(config) {
    super(config);
    
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass
      },
      tls: {
        rejectUnauthorized: config.rejectUnauthorized !== false
      }
    });
  }

  /**
   * Send email via SMTP
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(emailData) {
    try {
      const mailOptions = {
        from: emailData.from || this.config.defaultFrom,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
        response: info.response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'smtp'
      };
    }
  }

  /**
   * Verify SMTP connection
   * @returns {Promise<boolean>} True if connection is successful
   */
  async verify() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error.message);
      return false;
    }
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getName() {
    return 'smtp';
  }
}

export default SMTPProvider;
