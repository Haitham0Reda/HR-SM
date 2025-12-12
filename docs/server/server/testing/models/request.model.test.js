import mongoose from 'mongoose';
import Request from '../../modules/hr-core/requests/models/request.model.js';

describe('Request Model', () => {
  it('should create and save a request successfully', async () => {
    const requestData = {
      tenantId: 'test-tenant-123',
      requestType: 'permission',
      requestedBy: new mongoose.Types.ObjectId(),
      requestData: {
        date: new Date('2023-06-01'),
        reason: 'Doctor appointment'
      },
      status: 'pending'
    };

    const request = new Request(requestData);
    const savedRequest = await request.save();

    expect(savedRequest._id).toBeDefined();
    expect(savedRequest.tenantId).toBe(requestData.tenantId);
    expect(savedRequest.requestType).toBe(requestData.requestType);
    expect(savedRequest.requestedBy.toString()).toBe(requestData.requestedBy.toString());
    expect(savedRequest.requestData.date.toISOString()).toBe(requestData.requestData.date.toISOString());
    expect(savedRequest.requestData.reason).toBe(requestData.requestData.reason);
    expect(savedRequest.status).toBe(requestData.status);
  });

  it('should fail to create a request without required fields', async () => {
    const requestData = {
      // Missing required fields: tenantId, requestType, requestedBy, requestData
    };

    const request = new Request(requestData);

    let err;
    try {
      await request.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.tenantId).toBeDefined();
    expect(err.errors.requestType).toBeDefined();
    expect(err.errors.requestedBy).toBeDefined();
    expect(err.errors.requestData).toBeDefined();
  });

  it('should validate request type enum', async () => {
    const requestData = {
      tenantId: 'test-tenant-123',
      requestType: 'invalid-type',
      requestedBy: new mongoose.Types.ObjectId(),
      requestData: {}
    };

    const request = new Request(requestData);

    let err;
    try {
      await request.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.requestType).toBeDefined();
  });

  it('should handle different request types', async () => {
    const requestTypes = ['permission', 'overtime', 'vacation', 'mission', 'forget-check'];

    for (const type of requestTypes) {
      const requestData = {
        tenantId: 'test-tenant-123',
        requestType: type,
        requestedBy: new mongoose.Types.ObjectId(),
        requestData: {
          date: new Date(),
          reason: `Request for ${type}`
        },
        status: 'pending'
      };

      const request = new Request(requestData);
      const savedRequest = await request.save();

      expect(savedRequest.requestType).toBe(type);
    }
  });
});