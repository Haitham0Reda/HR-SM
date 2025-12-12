/**
 * Base Email Provider Interface
 * All email providers must implement this interface
 */
class EmailProvider {
  /**
   * Initialize the email provider with configuration
   * @param {Object} config - Provider-specific configuration
   */
  constructor(config) {
    if (this.constructor === EmailProvider) {
      throw new Error('EmailProvider is an abstract class and cannot be instantiated directly');
    }
    this.config = config;
  }

  /**
   * Send an email
   * @param {Object} emailData - Email data
   * @param {string} emailData.to - Recipient email address
   * @param {string} emailData.from - Sender email address
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.html - HTML content
   * @param {string} [emailData.text] - Plain text content
   * @param {Array} [emailData.attachments] - Email attachments
   * @returns {Promise<Object>} Send result with messageId
   */
  async sendEmail(emailData) {
    throw new Error('sendEmail method must be implemented by subclass');
  }

  /**
   * Verify provider configuration and connectivity
   * @returns {Promise<boolean>} True if provider is configured correctly
   */
  async verify() {
    throw new Error('verify method must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getName() {
    throw new Error('getName method must be implemented by subclass');
  }
}

export default EmailProvider;
