import mongoose from 'mongoose';
import Request from '../../models/request.model.js';

describe('Request Model', () => {
  it('should create and save a request successfully', async () => {
    const requestData = {
      employee: new mongoose.Types.ObjectId(),
      type: 'permission',
      details: {
        date: new Date('2023-06-01'),
        reason: 'Doctor appointment'
      },
      status: 'pending',
      comments: 'Please approve for doctor appointment'
    };

    const request = new Request(requestData);
    const savedRequest = await request.save();

    expect(savedRequest._id).toBeDefined();
    expect(savedRequest.employee.toString()).toBe(requestData.employee.toString());
    expect(savedRequest.type).toBe(requestData.type);
    expect(savedRequest.details.date.toISOString()).toBe(requestData.details.date.toISOString());
    expect(savedRequest.details.reason).toBe(requestData.details.reason);
    expect(savedRequest.status).toBe(requestData.status);
    expect(savedRequest.comments).toBe(requestData.comments);
    expect(savedRequest.isActive).toBe(true); // Default value
  });

  it('should fail to create a request without required fields', async () => {
    const requestData = {
      details: {
        reason: 'Request without required fields'
      }
    };

    const request = new Request(requestData);

    let err;
    try {
      await request.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.employee).toBeDefined();
    expect(err.errors.type).toBeDefined();
  });

  it('should validate request type enum', async () => {
    const requestData = {
      employee: new mongoose.Types.ObjectId(),
      type: 'invalid-type',
      details: {}
    };

    const request = new Request(requestData);

    let err;
    try {
      await request.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.type).toBeDefined();
  });

  it('should handle different request types', async () => {
    const requestTypes = ['permission', 'overtime', 'sick-leave', 'mission', 'day-swap'];

    for (const type of requestTypes) {
      const requestData = {
        employee: new mongoose.Types.ObjectId(),
        type: type,
        details: {
          date: new Date(),
          reason: `Request for ${type}`
        },
        status: 'pending'
      };

      const request = new Request(requestData);
      const savedRequest = await request.save();

      expect(savedRequest.type).toBe(type);
    }
  });
});