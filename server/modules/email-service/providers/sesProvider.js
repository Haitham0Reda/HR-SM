import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import EmailProvider from './emailProvider.js';

/**
 * AWS SES Email Provider
 * Uses AWS Simple Email Service for email delivery
 */
class SESProvider extends EmailProvider {
  /**
   * Initialize SES provider
   * @param {Object} config - SES configuration
   * @param {string} config.region - AWS region
   * @param {string} config.accessKeyId - AWS access key ID
   * @param {string} config.secretAccessKey - AWS secret access key
   * @param {string} [config.defaultFrom] - Default sender email
   */
  constructor(config) {
    super(config);
    
    if (!config.region || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('AWS SES requires region, accessKeyId, and secretAccessKey');
    }

    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    this.defaultFrom = config.defaultFrom;
  }

  /**
   * Send email via AWS SES
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(emailData) {
    try {
      const params = {
        Source: emailData.from || this.defaultFrom,
        Destination: {
          ToAddresses: Array.isArray(emailData.to) ? emailData.to : [emailData.to]
        },
        Message: {
          Subject: {
            Data: emailData.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: emailData.html,
              Charset: 'UTF-8'
            }
          }
        }
      };

      // Add text body if provided
      if (emailData.text) {
        params.Message.Body.Text = {
          Data: emailData.text,
          Charset: 'UTF-8'
        };
      }

      const command = new SendEmailCommand(params);
      const response = await this.client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
        provider: 'ses',
        requestId: response.$metadata.requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'ses',
        code: error.name
      };
    }
  }

  /**
   * Verify SES configuration
   * @returns {Promise<boolean>} True if configuration is valid
   */
  async verify() {
    try {
      // We'll just check if credentials are set
      // A real verification would require sending a test email or checking quotas
      return !!(this.config.region && this.config.accessKeyId && this.config.secretAccessKey);
    } catch (error) {
      console.error('SES verification failed:', error.message);
      return false;
    }
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getName() {
    return 'ses';
  }
}

export default SESProvider;
