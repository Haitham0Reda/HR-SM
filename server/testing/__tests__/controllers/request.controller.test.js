import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Request from '../../../models/request.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import {
  getAllRequests,
  createRequest,
  getRequestById,
  updateRequest,
  deleteRequest
} from '../../../controller/request.controller.js';

// Import Jest globals explicitly for ES modules
import { jest } from '@jest/globals';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Request Controller', () => {
  let testUser;
  let testSchool;
  let testRequest;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school with valid enum values according to School model
    testSchool = new School({
      name: 'School of Business',
      schoolCode: 'BUS',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test user with required school field
    testUser = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id,
      profile: {
        firstName: 'Test',
        lastName: 'User'
      }
    });
    await testUser.save();

    // Create test request
    testRequest = new Request({
      employee: testUser._id,
      type: 'permission',
      details: {
        date: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        reason: 'Personal matter'
      },
      status: 'pending'
    });
    await testRequest.save();
  });

  describe('getAllRequests', () => {
    it('should get all requests', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(1);
      expect(response[0].type).toBe('permission');
    });
  });

  describe('createRequest', () => {
    it('should create a new request', async () => {
      const requestData = {
        employee: testUser._id,
        type: 'overtime',
        details: {
          date: new Date(),
          hours: 2,
          reason: 'Project work'
        },
        status: 'pending'
      };

      const req = {
        body: requestData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.type).toBe('overtime');
      expect(response.status).toBe('pending');
    });

    it('should handle validation errors when creating request', async () => {
      const req = {
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getRequestById', () => {
    it('should get a request by ID', async () => {
      const req = {
        params: {
          id: testRequest._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.type).toBe('permission');
      expect(response._id.toString()).toBe(testRequest._id.toString());
    });

    it('should return 404 for non-existent request', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Request not found');
    });
  });

  describe('updateRequest', () => {
    it('should update a request', async () => {
      const updatedData = {
        status: 'approved',
        comments: 'Approved for personal matter'
      };

      const req = {
        params: {
          id: testRequest._id.toString()
        },
        body: updatedData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe('approved');
      expect(response.comments).toBe('Approved for personal matter');
    });

    it('should return 404 when updating non-existent request', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          status: 'approved'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Request not found');
    });

    it('should handle validation errors when updating request', async () => {
      const req = {
        params: {
          id: testRequest._id.toString()
        },
        body: {
          // Invalid data that would cause validation error
          type: 'invalid-type' // Invalid enum value
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('deleteRequest', () => {
    it('should delete a request', async () => {
      const req = {
        params: {
          id: testRequest._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Request deleted');

      // Verify request was deleted
      const deletedRequest = await Request.findById(testRequest._id);
      expect(deletedRequest).toBeNull();
    });

    it('should return 404 when deleting non-existent request', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Request not found');
    });
  });
});