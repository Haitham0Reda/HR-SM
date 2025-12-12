/**
 * Request Service
 * 
 * Handles business logic for the generic request system
 * Supports: overtime, vacation, mission, forget-check, permission
 */

import Request from '../models/request.model.js';
import AppError from '../../../../core/errors/AppError.js';

class RequestService {
  /**
   * Create a new request
   * @param {Object} requestData - Request data
   * @param {string} requestData.tenantId - Tenant identifier
   * @param {string} requestData.requestType - Type of request
   * @param {string} requestData.requestedBy - User ID making the request
   * @param {Object} requestData.requestData - Request-specific data
   * @returns {Promise<Object>} Created request
   */
  async createRequest(requestData) {
    const { tenantId, requestType, requestedBy, requestData: data } = requestData;
    
    // Validate required fields first
    if (!tenantId || !requestType || !requestedBy || !data) {
      throw new AppError('Missing required fields', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Validate request type
    const validTypes = ['overtime', 'vacation', 'mission', 'forget-check', 'permission'];
    if (!validTypes.includes(requestType)) {
      throw new AppError(`Invalid request type: ${requestType}`, 400, 'INVALID_REQUEST_TYPE');
    }
    
    const request = new Request({
      tenantId,
      requestType,
      requestedBy,
      requestData: data,
      status: 'pending'
    });
    
    return await request.save();
  }
  
  /**
   * Get requests filtered by tenant
   * @param {string} tenantId - Tenant identifier
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} List of requests
   */
  async getRequestsByTenant(tenantId, filters = {}) {
    const query = { tenantId, ...filters };
    return await Request.find(query);
  }
  
  /**
   * Get request by ID (tenant-scoped)
   * @param {string} requestId - Request ID
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Request object
   */
  async getRequestById(requestId, tenantId) {
    const request = await Request.findOne({ _id: requestId, tenantId });
    
    if (!request) {
      throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }
    
    return request;
  }
  
  /**
   * Update request status with approval chain tracking
   * @param {string} requestId - Request ID
   * @param {string} tenantId - Tenant identifier
   * @param {string} newStatus - New status
   * @param {string} approverId - ID of user making the change
   * @param {string} comments - Optional comments
   * @returns {Promise<Object>} Updated request
   */
  async updateRequestStatus(requestId, tenantId, newStatus, approverId, comments = '') {
    const request = await this.getRequestById(requestId, tenantId);
    
    // Validate status transition
    if (!this.isValidStatusTransition(request.status, newStatus)) {
      throw new AppError(
        `Invalid status transition from ${request.status} to ${newStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
    
    // Update status
    request.status = newStatus;
    request.updatedAt = new Date();
    
    // Add to approval chain
    request.approvalChain.push({
      approver: approverId,
      status: newStatus,
      comments,
      timestamp: new Date()
    });
    
    const updatedRequest = await request.save();
    
    // Trigger business logic based on approval
    if (newStatus === 'approved') {
      await this.handleApprovalBusinessLogic(updatedRequest);
    }
    
    return updatedRequest;
  }
  
  /**
   * Check if status transition is valid
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @returns {boolean} Whether transition is valid
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['approved', 'rejected', 'cancelled'],
      'approved': ['cancelled'], // Can cancel approved requests
      'rejected': [], // Cannot change rejected requests
      'cancelled': [] // Cannot change cancelled requests
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
  
  /**
   * Handle business logic when request is approved
   * @param {Object} request - Approved request
   */
  async handleApprovalBusinessLogic(request) {
    switch (request.requestType) {
      case 'overtime':
        await this.handleOvertimeApproval(request);
        break;
      case 'vacation':
        await this.handleVacationApproval(request);
        break;
      case 'mission':
        await this.handleMissionApproval(request);
        break;
      case 'forget-check':
        await this.handleForgetCheckApproval(request);
        break;
      case 'permission':
        await this.handlePermissionApproval(request);
        break;
    }
  }
  
  /**
   * Handle overtime request approval
   * @param {Object} request - Overtime request
   */
  async handleOvertimeApproval(request) {
    // In a real implementation, this would:
    // 1. Create overtime record
    // 2. Update employee's overtime balance
    // 3. Send notifications
    console.log(`Processing overtime approval for request ${request._id}`);
  }
  
  /**
   * Handle vacation request approval
   * @param {Object} request - Vacation request
   */
  async handleVacationApproval(request) {
    // In a real implementation, this would:
    // 1. Deduct vacation days from balance
    // 2. Create vacation record
    // 3. Update calendar
    // 4. Send notifications
    console.log(`Processing vacation approval for request ${request._id}`);
  }
  
  /**
   * Handle mission request approval
   * @param {Object} request - Mission request
   */
  async handleMissionApproval(request) {
    // In a real implementation, this would:
    // 1. Create mission record
    // 2. Update attendance expectations
    // 3. Send notifications
    console.log(`Processing mission approval for request ${request._id}`);
  }
  
  /**
   * Handle forget-check request approval
   * @param {Object} request - Forget-check request
   */
  async handleForgetCheckApproval(request) {
    // In a real implementation, this would:
    // 1. Update attendance record
    // 2. Mark as manual entry
    // 3. Send notifications
    console.log(`Processing forget-check approval for request ${request._id}`);
  }
  
  /**
   * Handle permission request approval
   * @param {Object} request - Permission request
   */
  async handlePermissionApproval(request) {
    // In a real implementation, this would:
    // 1. Create permission record
    // 2. Update attendance for the time period
    // 3. Send notifications
    console.log(`Processing permission approval for request ${request._id}`);
  }
  
  /**
   * Get all supported request types
   * @returns {Array<string>} List of supported request types
   */
  getSupportedRequestTypes() {
    return ['overtime', 'vacation', 'mission', 'forget-check', 'permission'];
  }
  
  /**
   * Get valid status transitions for a given status
   * @param {string} status - Current status
   * @returns {Array<string>} List of valid next statuses
   */
  getValidStatusTransitions(status) {
    const validTransitions = {
      'pending': ['approved', 'rejected', 'cancelled'],
      'approved': ['cancelled'],
      'rejected': [],
      'cancelled': []
    };
    
    return validTransitions[status] || [];
  }
}

export default new RequestService();