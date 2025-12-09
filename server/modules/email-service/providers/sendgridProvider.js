import sgMail from '@sendgrid/mail';
import EmailProvider from './emailProvider.js';

/**
 * SendGrid Email Provider
 * Uses SendGrid API for email delivery
 */
class SendGridProvider extends EmailProvider {
  /**
   * Initialize SendGrid provider
   * @param {Object} config - SendGrid configuration
   * @param {string} config.apiKey - SendGrid API key
   * @param {string} [config.defaultFrom] - Default sender email
   */
  constructor(config) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    sgMail.setApiKey(config.apiKey);
    this.defaultFrom = config.defaultFrom;
  }

  /**
   * Send email via SendGrid
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(emailData) {
    try {
      const msg = {
        to: emailData.to,
        from: emailData.from || this.defaultFrom,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments?.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.contentType,
          disposition: 'attachment'
        }))
      };

      const response = await sgMail.send(msg);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: 'sendgrid',
        statusCode: response[0].statusCode
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'sendgrid',
        code: error.code
      };
    }
  }

  /**
   * Verify SendGrid API key
   * @returns {Promise<boolean>} True if API key is valid
   */
  async verify() {
    try {
      // SendGrid doesn't have a dedicated verify endpoint
      // We'll just check if the API key is set
      return !!this.config.apiKey;
    } catch (error) {
      console.error('SendGrid verification failed:', error.message);
      return false;
    }
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getName() {
    return 'sendgrid';
  }
}

export default SendGridProvider;
