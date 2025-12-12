/**
 * @jest-environment node
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import RequestService from '../../../modules/hr-core/requests/services/requestService.js';
import Request from '../../../modules/hr-core/requests/models/request.model.js';
import AppError from '../../../core/errors/AppError.js';

// Create a simple User schema for testing (to avoid populate errors)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String
});

// Only register if not already registered
let User;
try {
  User = mongoose.model('User');
} catch (error) {
  User = mongoose.model('User', userSchema);
}

describe('RequestService Unit Tests', () => {
  let testTenantId;
  let testUserId;
  let anotherTenantId;
  let anotherUserId;

  beforeEach(async () => {
    // Set up test data (database is cleared by global setup)
    testTenantId = 'tenant_123';
    testUserId = new mongoose.Types.ObjectId();
    anotherTenantId = 'tenant_456';
    anotherUserId = new mongoose.Types.ObjectId();
  });

  describe('Request Type Support', () => {
    test('should support all required request types', () => {
      const supportedTypes = RequestService.getSupportedRequestTypes();
      const expectedTypes = ['overtime', 'vacation', 'mission', 'forget-check', 'permission'];
      
      expect(supportedTypes).toEqual(expect.arrayContaining(expectedTypes));
      expect(supportedTypes).toHaveLength(expectedTypes.length);
    });

    test('should create overtime request successfully', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'overtime',
        requestedBy: testUserId,
        requestData: { hours: 5, date: '2025-12-09', reason: 'Project deadline' }
      };

      const result = await RequestService.createRequest(requestData);

      expect(result.requestType).toBe('overtime');
      expect(result.tenantId).toBe(testTenantId);
      expect(result.status).toBe('pending');
      expect(result.requestData.hours).toBe(5);
    });

    test('should create vacation request successfully', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'vacation',
        requestedBy: testUserId,
        requestData: { startDate: '2025-12-15', endDate: '2025-12-20', days: 5 }
      };

      const result = await RequestService.createRequest(requestData);

      expect(result.requestType).toBe('vacation');
      expect(result.tenantId).toBe(testTenantId);
      expect(result.status).toBe('pending');
    });

    test('should create mission request successfully', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'mission',
        requestedBy: testUserId,
        requestData: { destination: 'Client Site', startDate: '2025-12-10', endDate: '2025-12-12' }
      };

      const result = await RequestService.createRequest(requestData);

      expect(result.requestType).toBe('mission');
      expect(result.tenantId).toBe(testTenantId);
      expect(result.status).toBe('pending');
    });

    test('should create forget-check request successfully', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'forget-check',
        requestedBy: testUserId,
        requestData: { date: '2025-12-08', checkInTime: '09:00', checkOutTime: '17:00' }
      };

      const result = await RequestService.createRequest(requestData);

      expect(result.requestType).toBe('forget-check');
      expect(result.tenantId).toBe(testTenantId);
      expect(result.status).toBe('pending');
    });

    test('should create permission request successfully', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'permission',
        requestedBy: testUserId,
        requestData: { date: '2025-12-09', startTime: '14:00', endTime: '16:00', reason: 'Medical appointment' }
      };

      const result = await RequestService.createRequest(requestData);

      expect(result.requestType).toBe('permission');
      expect(result.tenantId).toBe(testTenantId);
      expect(result.status).toBe('pending');
    });

    test('should reject invalid request type', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'invalid-type',
        requestedBy: testUserId,
        requestData: { test: 'data' }
      };

      await expect(RequestService.createRequest(requestData))
        .rejects
        .toThrow(AppError);
      
      await expect(RequestService.createRequest(requestData))
        .rejects
        .toThrow('Invalid request type: invalid-type');
    });
  });

  describe('Status Transitions', () => {
    let testRequest;

    beforeEach(async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'overtime',
        requestedBy: testUserId,
        requestData: { hours: 3, date: '2025-12-09' }
      };
      testRequest = await RequestService.createRequest(requestData);
    });

    test('should allow valid status transitions from pending', async () => {
      const approverId = new mongoose.Types.ObjectId();
      
      // Test pending → approved
      const approvedRequest = await RequestService.updateRequestStatus(
        testRequest._id,
        testTenantId,
        'approved',
        approverId,
        'Looks good'
      );
      expect(approvedRequest.status).toBe('approved');
      expect(approvedRequest.approvalChain).toHaveLength(1);
      expect(approvedRequest.approvalChain[0].status).toBe('approved');
      expect(approvedRequest.approvalChain[0].comments).toBe('Looks good');
    });

    test('should allow pending → rejected transition', async () => {
      const approverId = new mongoose.Types.ObjectId();
      
      const rejectedRequest = await RequestService.updateRequestStatus(
        testRequest._id,
        testTenantId,
        'rejected',
        approverId,
        'Insufficient justification'
      );
      expect(rejectedRequest.status).toBe('rejected');
      expect(rejectedRequest.approvalChain[0].status).toBe('rejected');
    });

    test('should allow pending → cancelled transition', async () => {
      const approverId = new mongoose.Types.ObjectId();
      
      const cancelledRequest = await RequestService.updateRequestStatus(
        testRequest._id,
        testTenantId,
        'cancelled',
        approverId,
        'No longer needed'
      );
      expect(cancelledRequest.status).toBe('cancelled');
    });

    test('should allow approved → cancelled transition', async () => {
      const approverId = new mongoose.Types.ObjectId();
      
      // First approve
      await RequestService.updateRequestStatus(testRequest._id, testTenantId, 'approved', approverId);
      
      // Then cancel
      const cancelledRequest = await RequestService.updateRequestStatus(
        testRequest._id,
        testTenantId,
        'cancelled',
        approverId,
        'Changed circumstances'
      );
      expect(cancelledRequest.status).toBe('cancelled');
      expect(cancelledRequest.approvalChain).toHaveLength(2);
    });

    test('should reject invalid status transitions', async () => {
      const approverId = new mongoose.Types.ObjectId();
      
      // First reject the request
      await RequestService.updateRequestStatus(testRequest._id, testTenantId, 'rejected', approverId);
      
      // Try to approve rejected request (should fail)
      await expect(
        RequestService.updateRequestStatus(testRequest._id, testTenantId, 'approved', approverId)
      ).rejects.toThrow(AppError);
      
      await expect(
        RequestService.updateRequestStatus(testRequest._id, testTenantId, 'approved', approverId)
      ).rejects.toThrow('Invalid status transition from rejected to approved');
    });

    test('should reject transitions from cancelled status', async () => {
      const approverId = new mongoose.Types.ObjectId();
      
      // First cancel the request
      await RequestService.updateRequestStatus(testRequest._id, testTenantId, 'cancelled', approverId);
      
      // Try to approve cancelled request (should fail)
      await expect(
        RequestService.updateRequestStatus(testRequest._id, testTenantId, 'approved', approverId)
      ).rejects.toThrow('Invalid status transition from cancelled to approved');
    });

    test('should provide valid status transitions for each status', () => {
      expect(RequestService.getValidStatusTransitions('pending'))
        .toEqual(['approved', 'rejected', 'cancelled']);
      
      expect(RequestService.getValidStatusTransitions('approved'))
        .toEqual(['cancelled']);
      
      expect(RequestService.getValidStatusTransitions('rejected'))
        .toEqual([]);
      
      expect(RequestService.getValidStatusTransitions('cancelled'))
        .toEqual([]);
    });
  });

  describe('Business Logic Triggers', () => {
    test('should trigger overtime business logic on approval', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const requestData = {
        tenantId: testTenantId,
        requestType: 'overtime',
        requestedBy: testUserId,
        requestData: { hours: 4, date: '2025-12-09' }
      };
      
      const request = await RequestService.createRequest(requestData);
      const approverId = new mongoose.Types.ObjectId();
      
      await RequestService.updateRequestStatus(request._id, testTenantId, 'approved', approverId);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing overtime approval for request')
      );
      
      consoleSpy.mockRestore();
    });

    test('should trigger vacation business logic on approval', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const requestData = {
        tenantId: testTenantId,
        requestType: 'vacation',
        requestedBy: testUserId,
        requestData: { startDate: '2025-12-15', endDate: '2025-12-20', days: 5 }
      };
      
      const request = await RequestService.createRequest(requestData);
      const approverId = new mongoose.Types.ObjectId();
      
      await RequestService.updateRequestStatus(request._id, testTenantId, 'approved', approverId);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing vacation approval for request')
      );
      
      consoleSpy.mockRestore();
    });

    test('should trigger mission business logic on approval', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const requestData = {
        tenantId: testTenantId,
        requestType: 'mission',
        requestedBy: testUserId,
        requestData: { destination: 'Client Site', startDate: '2025-12-10' }
      };
      
      const request = await RequestService.createRequest(requestData);
      const approverId = new mongoose.Types.ObjectId();
      
      await RequestService.updateRequestStatus(request._id, testTenantId, 'approved', approverId);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing mission approval for request')
      );
      
      consoleSpy.mockRestore();
    });

    test('should trigger forget-check business logic on approval', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const requestData = {
        tenantId: testTenantId,
        requestType: 'forget-check',
        requestedBy: testUserId,
        requestData: { date: '2025-12-08', checkInTime: '09:00' }
      };
      
      const request = await RequestService.createRequest(requestData);
      const approverId = new mongoose.Types.ObjectId();
      
      await RequestService.updateRequestStatus(request._id, testTenantId, 'approved', approverId);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing forget-check approval for request')
      );
      
      consoleSpy.mockRestore();
    });

    test('should trigger permission business logic on approval', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const requestData = {
        tenantId: testTenantId,
        requestType: 'permission',
        requestedBy: testUserId,
        requestData: { date: '2025-12-09', startTime: '14:00', endTime: '16:00' }
      };
      
      const request = await RequestService.createRequest(requestData);
      const approverId = new mongoose.Types.ObjectId();
      
      await RequestService.updateRequestStatus(request._id, testTenantId, 'approved', approverId);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing permission approval for request')
      );
      
      consoleSpy.mockRestore();
    });

    test('should not trigger business logic on rejection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const requestData = {
        tenantId: testTenantId,
        requestType: 'overtime',
        requestedBy: testUserId,
        requestData: { hours: 4, date: '2025-12-09' }
      };
      
      const request = await RequestService.createRequest(requestData);
      const approverId = new mongoose.Types.ObjectId();
      
      await RequestService.updateRequestStatus(request._id, testTenantId, 'rejected', approverId);
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Processing overtime approval')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Tenant Isolation', () => {
    let tenant1Request, tenant2Request;

    beforeEach(async () => {
      // Create requests for different tenants
      const request1Data = {
        tenantId: testTenantId,
        requestType: 'overtime',
        requestedBy: testUserId,
        requestData: { hours: 3, date: '2025-12-09' }
      };
      
      const request2Data = {
        tenantId: anotherTenantId,
        requestType: 'vacation',
        requestedBy: anotherUserId,
        requestData: { startDate: '2025-12-15', days: 3 }
      };
      
      tenant1Request = await RequestService.createRequest(request1Data);
      tenant2Request = await RequestService.createRequest(request2Data);
    });

    test('should only return requests for specified tenant', async () => {
      const tenant1Requests = await RequestService.getRequestsByTenant(testTenantId);
      const tenant2Requests = await RequestService.getRequestsByTenant(anotherTenantId);
      
      expect(tenant1Requests).toHaveLength(1);
      expect(tenant1Requests[0].tenantId).toBe(testTenantId);
      expect(tenant1Requests[0].requestType).toBe('overtime');
      
      expect(tenant2Requests).toHaveLength(1);
      expect(tenant2Requests[0].tenantId).toBe(anotherTenantId);
      expect(tenant2Requests[0].requestType).toBe('vacation');
    });

    test('should not allow access to requests from other tenants', async () => {
      // Try to get tenant1's request using tenant2's tenantId
      await expect(
        RequestService.getRequestById(tenant1Request._id, anotherTenantId)
      ).rejects.toThrow(AppError);
      
      await expect(
        RequestService.getRequestById(tenant1Request._id, anotherTenantId)
      ).rejects.toThrow('Request not found');
    });

    test('should not allow status updates across tenants', async () => {
      const approverId = new mongoose.Types.ObjectId();
      
      // Try to update tenant1's request using tenant2's tenantId
      await expect(
        RequestService.updateRequestStatus(tenant1Request._id, anotherTenantId, 'approved', approverId)
      ).rejects.toThrow(AppError);
      
      await expect(
        RequestService.updateRequestStatus(tenant1Request._id, anotherTenantId, 'approved', approverId)
      ).rejects.toThrow('Request not found');
    });

    test('should filter requests by tenant with additional filters', async () => {
      // Create another request for tenant1
      const additionalRequestData = {
        tenantId: testTenantId,
        requestType: 'vacation',
        requestedBy: testUserId,
        requestData: { startDate: '2025-12-20', days: 2 }
      };
      await RequestService.createRequest(additionalRequestData);
      
      // Filter by tenant and request type
      const overtimeRequests = await RequestService.getRequestsByTenant(testTenantId, { requestType: 'overtime' });
      const vacationRequests = await RequestService.getRequestsByTenant(testTenantId, { requestType: 'vacation' });
      
      expect(overtimeRequests).toHaveLength(1);
      expect(overtimeRequests[0].requestType).toBe('overtime');
      
      expect(vacationRequests).toHaveLength(1);
      expect(vacationRequests[0].requestType).toBe('vacation');
    });

    test('should return empty array for tenant with no requests', async () => {
      const emptyTenantId = 'tenant_empty';
      const requests = await RequestService.getRequestsByTenant(emptyTenantId);
      
      expect(requests).toHaveLength(0);
      expect(Array.isArray(requests)).toBe(true);
    });
  });

  describe('Validation and Error Handling', () => {
    test('should require tenantId', async () => {
      const requestData = {
        requestType: 'overtime',
        requestedBy: testUserId,
        requestData: { hours: 3 }
      };
      
      await expect(RequestService.createRequest(requestData))
        .rejects
        .toThrow('Missing required fields');
    });

    test('should require requestType', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestedBy: testUserId,
        requestData: { hours: 3 }
      };
      
      await expect(RequestService.createRequest(requestData))
        .rejects
        .toThrow('Missing required fields');
    });

    test('should require requestedBy', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'overtime',
        requestData: { hours: 3 }
      };
      
      await expect(RequestService.createRequest(requestData))
        .rejects
        .toThrow('Missing required fields');
    });

    test('should require requestData', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'overtime',
        requestedBy: testUserId
      };
      
      await expect(RequestService.createRequest(requestData))
        .rejects
        .toThrow('Missing required fields');
    });

    test('should handle non-existent request ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(
        RequestService.getRequestById(nonExistentId, testTenantId)
      ).rejects.toThrow('Request not found');
    });

    test('should handle invalid ObjectId format', async () => {
      await expect(
        RequestService.getRequestById('invalid-id', testTenantId)
      ).rejects.toThrow();
    });
  });

  describe('Approval Chain Tracking', () => {
    test('should track approval chain with multiple approvers', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'vacation',
        requestedBy: testUserId,
        requestData: { startDate: '2025-12-15', days: 5 }
      };
      
      const request = await RequestService.createRequest(requestData);
      const approver1 = new mongoose.Types.ObjectId();
      const approver2 = new mongoose.Types.ObjectId();
      
      // First approval
      const firstUpdate = await RequestService.updateRequestStatus(
        request._id,
        testTenantId,
        'approved',
        approver1,
        'Manager approval'
      );
      
      expect(firstUpdate.approvalChain).toHaveLength(1);
      expect(firstUpdate.approvalChain[0].approver.toString()).toBe(approver1.toString());
      expect(firstUpdate.approvalChain[0].comments).toBe('Manager approval');
      expect(firstUpdate.approvalChain[0].timestamp).toBeDefined();
      
      // Cancel after approval
      const secondUpdate = await RequestService.updateRequestStatus(
        request._id,
        testTenantId,
        'cancelled',
        approver2,
        'Employee requested cancellation'
      );
      
      expect(secondUpdate.approvalChain).toHaveLength(2);
      expect(secondUpdate.approvalChain[1].approver.toString()).toBe(approver2.toString());
      expect(secondUpdate.approvalChain[1].comments).toBe('Employee requested cancellation');
    });

    test('should preserve approval chain order', async () => {
      const requestData = {
        tenantId: testTenantId,
        requestType: 'overtime',
        requestedBy: testUserId,
        requestData: { hours: 8, date: '2025-12-09' }
      };
      
      const request = await RequestService.createRequest(requestData);
      const approver = new mongoose.Types.ObjectId();
      
      // Approve then cancel
      await RequestService.updateRequestStatus(request._id, testTenantId, 'approved', approver, 'First action');
      const finalRequest = await RequestService.updateRequestStatus(request._id, testTenantId, 'cancelled', approver, 'Second action');
      
      expect(finalRequest.approvalChain[0].comments).toBe('First action');
      expect(finalRequest.approvalChain[1].comments).toBe('Second action');
      expect(finalRequest.approvalChain[0].timestamp.getTime())
        .toBeLessThan(finalRequest.approvalChain[1].timestamp.getTime());
    });
  });
});