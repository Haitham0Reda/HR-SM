import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Leave from '../../../models/leave.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import {
  getAllLeaves,
  createLeave,
  getLeaveById,
  updateLeave,
  deleteLeave
} from '../../../controller/leave.controller.js';

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

describe('Leave Controller', () => {
  let testUser;
  let testSchool;
  let testLeave;

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
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id
    });
    await testUser.save();

    // Create test leave with future start date to pass validation
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 5); // 5 days in the future
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 3);

    testLeave = new Leave({
      employee: testUser._id,
      leaveType: 'annual',
      startDate: startDate,
      endDate: endDate,
      duration: 3,
      reason: 'Test leave reason with sufficient length'
    });
    await testLeave.save();
  });

  describe('getAllLeaves', () => {
    it('should get all leaves', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllLeaves(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response).toHaveLength(1);
      expect(response[0].leaveType).toBe('annual');
    });
  });

  describe('createLeave', () => {
    it('should create a new leave', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 10); // 10 days in the future
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 2);

      const req = {
        body: {
          employee: testUser._id,
          leaveType: 'casual',
          startDate: startDate,
          endDate: endDate,
          duration: 2,
          reason: 'Another test leave reason with sufficient length'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createLeave(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.leaveType).toBe('casual');
    });

    it('should handle validation errors when creating leave', async () => {
      const req = {
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createLeave(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getLeaveById', () => {
    it('should get a leave by ID', async () => {
      const req = {
        params: {
          id: testLeave._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getLeaveById(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.leaveType).toBe('annual');
    });

    it('should return 404 for non-existent leave', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getLeaveById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateLeave', () => {
    it('should update a leave', async () => {
      const req = {
        params: {
          id: testLeave._id.toString()
        },
        body: {
          status: 'approved'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateLeave(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe('approved');
    });

    it('should return 404 when updating non-existent leave', async () => {
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

      await updateLeave(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteLeave', () => {
    it('should delete a leave', async () => {
      const req = {
        params: {
          id: testLeave._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteLeave(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Leave deleted');

    });

    it('should return 404 when deleting non-existent leave', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteLeave(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});