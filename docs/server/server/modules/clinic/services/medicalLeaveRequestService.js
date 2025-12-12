import axios from 'axios';

/**
 * Medical Leave Request Service
 * 
 * 🚨 CRITICAL RULE: This service ONLY creates requests via HR-Core
 * It NEVER directly modifies attendance or vacation balances
 * 
 * Flow:
 * 1. Clinic creates medical leave request
 * 2. Service calls HR-Core Requests API
 * 3. HR-Core validates and creates request
 * 4. HR Manager approves/rejects via HR-Core
 * 5. HR-Core updates vacation balances and attendance
 * 6. Clinic can only READ request status
 */

class MedicalLeaveRequestService {
  constructor() {
    // Base URL for HR-Core API
    // In production, this would come from environment config
    this.hrCoreBaseUrl = process.env.HR_CORE_API_URL || 'http://localhost:5000/api/v1/hr-core';
  }
  
  /**
   * Create a medical leave request via HR-Core
   * 
   * @param {Object} requestData - Medical leave request data
   * @param {string} requestData.tenantId - Tenant identifier
   * @param {string} requestData.userId - User requesting leave
   * @param {Date} requestData.startDate - Leave start date
   * @param {Date} requestData.endDate - Leave end date
   * @param {string} requestData.diagnosis - Medical diagnosis
   * @param {string} requestData.medicalDocumentation - Reference to medical documentation
   * @param {string} requestData.visitId - Reference to visit record
   * @param {string} authToken - Authentication token for HR-Core API
   * @returns {Promise<Object>} Created request from HR-Core
   */
  async createMedicalLeaveRequest(requestData, authToken) {
    try {
      const {
        tenantId,
        userId,
        startDate,
        endDate,
        diagnosis,
        medicalDocumentation,
        visitId,
        notes
      } = requestData;
      
      // Validate required fields
      if (!tenantId || !userId || !startDate || !endDate || !diagnosis) {
        throw new Error('Missing required fields for medical leave request');
      }
      
      // Prepare request payload for HR-Core
      const hrCoreRequestPayload = {
        requestType: 'medical-leave',
        requestedBy: userId,
        requestData: {
          startDate,
          endDate,
          diagnosis,
          medicalDocumentation,
          visitId,
          notes,
          source: 'clinic-module'  // Indicate this came from clinic
        }
      };
      
      // Call HR-Core Requests API
      // 🚨 CRITICAL: We are REQUESTING, not directly modifying
      const response = await axios.post(
        `${this.hrCoreBaseUrl}/requests`,
        hrCoreRequestPayload,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'X-Tenant-Id': tenantId
          }
        }
      );
      
      // Return the request created by HR-Core
      return {
        success: true,
        request: response.data.data,
        message: 'Medical leave request created successfully. Awaiting HR approval.'
      };
      
    } catch (error) {
      // Handle API errors
      if (error.response) {
        throw new Error(`HR-Core API error: ${error.response.data.message || error.message}`);
      }
      throw new Error(`Failed to create medical leave request: ${error.message}`);
    }
  }
  
  /**
   * Get medical leave request status from HR-Core
   * 
   * @param {string} requestId - Request identifier
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Authentication token
   * @returns {Promise<Object>} Request status from HR-Core
   */
  async getMedicalLeaveRequestStatus(requestId, tenantId, authToken) {
    try {
      // Call HR-Core to get request status
      const response = await axios.get(
        `${this.hrCoreBaseUrl}/requests/${requestId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Tenant-Id': tenantId
          }
        }
      );
      
      return {
        success: true,
        request: response.data.data
      };
      
    } catch (error) {
      if (error.response) {
        throw new Error(`HR-Core API error: ${error.response.data.message || error.message}`);
      }
      throw new Error(`Failed to get request status: ${error.message}`);
    }
  }
  
  /**
   * Get all medical leave requests for a patient
   * 
   * @param {string} userId - User identifier
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Authentication token
   * @returns {Promise<Array>} Medical leave requests from HR-Core
   */
  async getMedicalLeaveRequestsByUser(userId, tenantId, authToken) {
    try {
      // Call HR-Core to get requests by type and user
      const response = await axios.get(
        `${this.hrCoreBaseUrl}/requests/type/medical-leave`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Tenant-Id': tenantId
          },
          params: {
            requestedBy: userId
          }
        }
      );
      
      return {
        success: true,
        requests: response.data.data
      };
      
    } catch (error) {
      if (error.response) {
        throw new Error(`HR-Core API error: ${error.response.data.message || error.message}`);
      }
      throw new Error(`Failed to get medical leave requests: ${error.message}`);
    }
  }
  
  /**
   * Get all pending medical leave requests for a tenant
   * 
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Authentication token (must be HR/Manager)
   * @returns {Promise<Array>} Pending medical leave requests
   */
  async getPendingMedicalLeaveRequests(tenantId, authToken) {
    try {
      // Call HR-Core to get pending requests
      const response = await axios.get(
        `${this.hrCoreBaseUrl}/requests/pending`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Tenant-Id': tenantId
          },
          params: {
            requestType: 'medical-leave'
          }
        }
      );
      
      return {
        success: true,
        requests: response.data.data
      };
      
    } catch (error) {
      if (error.response) {
        throw new Error(`HR-Core API error: ${error.response.data.message || error.message}`);
      }
      throw new Error(`Failed to get pending requests: ${error.message}`);
    }
  }
  
  /**
   * 🚨 IMPORTANT: Clinic CANNOT approve/reject requests
   * Only HR-Core can approve/reject through its own API
   * 
   * This method is here for documentation purposes only
   */
  cannotApproveOrReject() {
    throw new Error(
      'CRITICAL: Clinic module cannot approve or reject medical leave requests. ' +
      'Only HR-Core can approve/reject requests through /api/v1/hr-core/requests/:id/approve or /reject endpoints. ' +
      'This is a fundamental architectural rule to maintain HR-Core independence.'
    );
  }
  
  /**
   * 🚨 IMPORTANT: Clinic CANNOT modify vacation balances
   * Only HR-Core can modify balances after approving requests
   * 
   * This method is here for documentation purposes only
   */
  cannotModifyVacationBalances() {
    throw new Error(
      'CRITICAL: Clinic module cannot modify vacation balances. ' +
      'Only HR-Core can modify balances after approving medical leave requests. ' +
      'This is a fundamental architectural rule to maintain HR-Core independence.'
    );
  }
  
  /**
   * 🚨 IMPORTANT: Clinic CANNOT modify attendance records
   * Only HR-Core can modify attendance after approving requests
   * 
   * This method is here for documentation purposes only
   */
  cannotModifyAttendance() {
    throw new Error(
      'CRITICAL: Clinic module cannot modify attendance records. ' +
      'Only HR-Core can modify attendance after approving medical leave requests. ' +
      'This is a fundamental architectural rule to maintain HR-Core independence.'
    );
  }
}

export default new MedicalLeaveRequestService();
