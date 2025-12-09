/**
 * Email Integration Service for Clinic Module
 * 
 * Handles email notifications for:
 * - Appointment reminders
 * - Prescription notifications
 * - Medical leave request updates
 * 
 * CRITICAL: This service checks if email-service is enabled before sending
 * If email-service is disabled, it logs the email request instead
 */

class EmailIntegrationService {
  /**
   * Check if email service is enabled for tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<boolean>} Whether email service is enabled
   */
  async isEmailServiceEnabled(tenantId) {
    try {
      // In a real implementation, this would check the tenant's enabled modules
      // For now, we'll check if the email service module exists
      const emailService = await import('../../../email-service/services/emailService.js')
        .then(module => module.default)
        .catch(() => null);
      
      if (!emailService) {
        return false;
      }
      
      return await emailService.isEnabled(tenantId);
    } catch (error) {
      console.log('[Clinic Email Integration] Email service not available:', error.message);
      return false;
    }
  }
  
  /**
   * Send appointment reminder email
   * @param {string} tenantId - Tenant identifier
   * @param {Object} appointmentData - Appointment data
   * @returns {Promise<Object>} Send result
   */
  async sendAppointmentReminder(tenantId, appointmentData) {
    try {
      const emailEnabled = await this.isEmailServiceEnabled(tenantId);
      
      if (!emailEnabled) {
        console.log('[Clinic Email Integration] Email service disabled, logging appointment reminder:', {
          tenantId,
          patientEmail: appointmentData.patientEmail,
          appointmentDate: appointmentData.appointmentDate,
          appointmentTime: appointmentData.appointmentTime
        });
        
        return {
          success: true,
          sent: false,
          message: 'Email service not enabled, reminder logged'
        };
      }
      
      // Import email service dynamically
      const emailService = (await import('../../../email-service/services/emailService.js')).default;
      
      // Prepare email data
      const emailData = {
        to: appointmentData.patientEmail,
        subject: 'Appointment Reminder',
        template: 'appointmentReminder',
        variables: {
          patientName: appointmentData.patientName,
          appointmentDate: appointmentData.appointmentDate,
          appointmentTime: appointmentData.appointmentTime,
          doctorName: appointmentData.doctorName,
          appointmentType: appointmentData.appointmentType,
          reason: appointmentData.reason
        }
      };
      
      // Send email via email service
      const result = await emailService.sendEmail(tenantId, emailData);
      
      return {
        success: true,
        sent: true,
        result
      };
      
    } catch (error) {
      console.error('[Clinic Email Integration] Failed to send appointment reminder:', error.message);
      
      // Log the email request when service fails
      console.log('[Clinic Email Integration] Logging failed email request:', {
        tenantId,
        type: 'appointment-reminder',
        data: appointmentData
      });
      
      return {
        success: false,
        sent: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send prescription notification email
   * @param {string} tenantId - Tenant identifier
   * @param {Object} prescriptionData - Prescription data
   * @returns {Promise<Object>} Send result
   */
  async sendPrescriptionNotification(tenantId, prescriptionData) {
    try {
      const emailEnabled = await this.isEmailServiceEnabled(tenantId);
      
      if (!emailEnabled) {
        console.log('[Clinic Email Integration] Email service disabled, logging prescription notification:', {
          tenantId,
          patientEmail: prescriptionData.patientEmail,
          medicationName: prescriptionData.medicationName
        });
        
        return {
          success: true,
          sent: false,
          message: 'Email service not enabled, notification logged'
        };
      }
      
      // Import email service dynamically
      const emailService = (await import('../../../email-service/services/emailService.js')).default;
      
      // Prepare email data
      const emailData = {
        to: prescriptionData.patientEmail,
        subject: 'New Prescription',
        template: 'prescriptionNotification',
        variables: {
          patientName: prescriptionData.patientName,
          medicationName: prescriptionData.medicationName,
          dosage: prescriptionData.dosage,
          frequency: prescriptionData.frequency,
          duration: prescriptionData.duration,
          prescribedBy: prescriptionData.prescribedBy,
          instructions: prescriptionData.instructions
        }
      };
      
      // Send email via email service
      const result = await emailService.sendEmail(tenantId, emailData);
      
      return {
        success: true,
        sent: true,
        result
      };
      
    } catch (error) {
      console.error('[Clinic Email Integration] Failed to send prescription notification:', error.message);
      
      // Log the email request when service fails
      console.log('[Clinic Email Integration] Logging failed email request:', {
        tenantId,
        type: 'prescription-notification',
        data: prescriptionData
      });
      
      return {
        success: false,
        sent: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send prescription refill reminder email
   * @param {string} tenantId - Tenant identifier
   * @param {Object} prescriptionData - Prescription data
   * @returns {Promise<Object>} Send result
   */
  async sendPrescriptionRefillReminder(tenantId, prescriptionData) {
    try {
      const emailEnabled = await this.isEmailServiceEnabled(tenantId);
      
      if (!emailEnabled) {
        console.log('[Clinic Email Integration] Email service disabled, logging refill reminder:', {
          tenantId,
          patientEmail: prescriptionData.patientEmail,
          medicationName: prescriptionData.medicationName
        });
        
        return {
          success: true,
          sent: false,
          message: 'Email service not enabled, reminder logged'
        };
      }
      
      // Import email service dynamically
      const emailService = (await import('../../../email-service/services/emailService.js')).default;
      
      // Prepare email data
      const emailData = {
        to: prescriptionData.patientEmail,
        subject: 'Prescription Refill Reminder',
        template: 'prescriptionRefillReminder',
        variables: {
          patientName: prescriptionData.patientName,
          medicationName: prescriptionData.medicationName,
          refillsRemaining: prescriptionData.refillsRemaining,
          expirationDate: prescriptionData.expirationDate
        }
      };
      
      // Send email via email service
      const result = await emailService.sendEmail(tenantId, emailData);
      
      return {
        success: true,
        sent: true,
        result
      };
      
    } catch (error) {
      console.error('[Clinic Email Integration] Failed to send refill reminder:', error.message);
      
      // Log the email request when service fails
      console.log('[Clinic Email Integration] Logging failed email request:', {
        tenantId,
        type: 'prescription-refill-reminder',
        data: prescriptionData
      });
      
      return {
        success: false,
        sent: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send medical leave request status update email
   * @param {string} tenantId - Tenant identifier
   * @param {Object} requestData - Request data
   * @returns {Promise<Object>} Send result
   */
  async sendMedicalLeaveStatusUpdate(tenantId, requestData) {
    try {
      const emailEnabled = await this.isEmailServiceEnabled(tenantId);
      
      if (!emailEnabled) {
        console.log('[Clinic Email Integration] Email service disabled, logging status update:', {
          tenantId,
          patientEmail: requestData.patientEmail,
          status: requestData.status
        });
        
        return {
          success: true,
          sent: false,
          message: 'Email service not enabled, update logged'
        };
      }
      
      // Import email service dynamically
      const emailService = (await import('../../../email-service/services/emailService.js')).default;
      
      // Prepare email data
      const emailData = {
        to: requestData.patientEmail,
        subject: `Medical Leave Request ${requestData.status}`,
        template: 'medicalLeaveStatusUpdate',
        variables: {
          patientName: requestData.patientName,
          status: requestData.status,
          startDate: requestData.startDate,
          endDate: requestData.endDate,
          comments: requestData.comments
        }
      };
      
      // Send email via email service
      const result = await emailService.sendEmail(tenantId, emailData);
      
      return {
        success: true,
        sent: true,
        result
      };
      
    } catch (error) {
      console.error('[Clinic Email Integration] Failed to send status update:', error.message);
      
      // Log the email request when service fails
      console.log('[Clinic Email Integration] Logging failed email request:', {
        tenantId,
        type: 'medical-leave-status-update',
        data: requestData
      });
      
      return {
        success: false,
        sent: false,
        error: error.message
      };
    }
  }
}

export default new EmailIntegrationService();
