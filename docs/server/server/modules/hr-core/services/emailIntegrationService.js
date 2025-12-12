import logger from '../../../utils/logger.js';

/**
 * Email Integration Service for HR-Core
 * 
 * This service provides email functionality with graceful degradation.
 * If email-service module is not enabled, operations continue successfully
 * and email requests are logged for later processing.
 */
class EmailIntegrationService {
  constructor() {
    this.emailService = null;
    this.emailServiceEnabled = false;
  }

  /**
   * Initialize email service integration
   * Attempts to load email-service module if available
   */
  async initialize() {
    try {
      // Try to import email service
      const emailServiceModule = await import('../../email-service/services/emailService.js');
      this.emailService = emailServiceModule.default;
      this.emailServiceEnabled = true;
      logger.info('[HR-Core] Email service integration initialized');
    } catch (error) {
      // Email service not available - graceful degradation
      this.emailServiceEnabled = false;
      logger.info('[HR-Core] Email service not available - operating without email notifications');
    }
  }

  /**
   * Check if email service is enabled
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<boolean>} True if email service is available
   */
  async isEnabled(tenantId) {
    if (!this.emailServiceEnabled || !this.emailService) {
      return false;
    }

    try {
      return await this.emailService.isEnabled(tenantId);
    } catch (error) {
      logger.warn('[HR-Core] Failed to check email service status:', error.message);
      return false;
    }
  }

  /**
   * Send overtime request notification
   * @param {string} tenantId - Tenant identifier
   * @param {Object} requestData - Request data
   * @param {Object} employee - Employee who made the request
   * @param {Object} approver - Approver to notify
   */
  async sendOvertimeRequestNotification(tenantId, requestData, employee, approver) {
    const emailData = {
      to: approver.email,
      subject: `Overtime Request from ${employee.firstName} ${employee.lastName}`,
      template: 'overtimeRequest',
      variables: {
        approverName: `${approver.firstName || approver.username}`,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department?.name || 'N/A',
        date: requestData.date,
        hours: requestData.hours,
        reason: requestData.reason
      }
    };

    return await this._sendEmail(tenantId, emailData, 'overtime request notification');
  }

  /**
   * Send vacation approval notification
   * @param {string} tenantId - Tenant identifier
   * @param {Object} requestData - Request data
   * @param {Object} employee - Employee who made the request
   * @param {boolean} approved - Whether request was approved
   * @param {string} comments - Approval/rejection comments
   */
  async sendVacationApprovalNotification(tenantId, requestData, employee, approved, comments) {
    const emailData = {
      to: employee.email,
      subject: `Vacation Request ${approved ? 'Approved' : 'Rejected'}`,
      template: 'vacationApproval',
      variables: {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        approved,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        duration: requestData.duration,
        vacationType: requestData.type || 'Annual Leave',
        remainingBalance: requestData.remainingBalance,
        comments
      }
    };

    return await this._sendEmail(tenantId, emailData, 'vacation approval notification');
  }

  /**
   * Send generic request notification
   * @param {string} tenantId - Tenant identifier
   * @param {string} requestType - Type of request
   * @param {Object} employee - Employee who made the request
   * @param {Object} approver - Approver to notify
   * @param {Object} requestData - Request data
   */
  async sendRequestNotification(tenantId, requestType, employee, approver, requestData) {
    // For now, log the notification
    // In the future, we can create specific templates for each request type
    logger.info(`[HR-Core] Request notification: ${requestType} from ${employee.email} to ${approver.email}`);
    
    // If email service is available, we could send a generic notification
    if (await this.isEnabled(tenantId)) {
      logger.info('[HR-Core] Email service available but no specific template for this request type');
    }
  }

  /**
   * Internal method to send email with graceful degradation
   * @param {string} tenantId - Tenant identifier
   * @param {Object} emailData - Email data
   * @param {string} description - Description for logging
   * @returns {Promise<Object>} Send result
   */
  async _sendEmail(tenantId, emailData, description) {
    // Check if email service is enabled
    if (!await this.isEnabled(tenantId)) {
      // Log email request for later processing
      logger.info(`[HR-Core] Email service not available - logging ${description}`, {
        tenantId,
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template
      });

      return {
        success: true,
        sent: false,
        message: 'Email service not available - request logged'
      };
    }

    try {
      // Send email via email service
      const result = await this.emailService.sendEmail(tenantId, emailData);

      if (result.success) {
        logger.info(`[HR-Core] Successfully sent ${description}`, {
          tenantId,
          to: emailData.to,
          messageId: result.messageId
        });
      } else {
        logger.warn(`[HR-Core] Failed to send ${description}`, {
          tenantId,
          to: emailData.to,
          error: result.error
        });
      }

      return {
        success: true,
        sent: result.success,
        messageId: result.messageId,
        error: result.error
      };
    } catch (error) {
      // Email service failed - log and continue
      logger.error(`[HR-Core] Error sending ${description}:`, error);

      return {
        success: true,
        sent: false,
        message: 'Email service error - request logged',
        error: error.message
      };
    }
  }
}

// Export singleton instance
const emailIntegrationService = new EmailIntegrationService();
export default emailIntegrationService;
