import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Notification from '../../../models/notification.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import {
  getAllNotifications,
  createNotification,
  getNotificationById,
  updateNotification,
  deleteNotification
} from '../../../controller/notification.controller.js';

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

describe('Notification Controller', () => {
  let testUser;
  let testSchool;
  let testNotification;

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

    // Create test notification
    testNotification = new Notification({
      recipient: testUser._id,
      type: 'custom',
      title: 'Test Notification',
      message: 'This is a test notification'
    });
    await testNotification.save();
  });

  describe('getAllNotifications', () => {
    it('should get all notifications', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllNotifications(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(1);
      expect(response[0].title).toBe('Test Notification');
    });
  });

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const req = {
        body: {
          recipient: testUser._id,
          type: 'request',
          title: 'New Notification',
          message: 'This is a new notification'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createNotification(req, res);

      // The controller calls res.status(201) explicitly for creation
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('New Notification');
    });

    it('should handle validation errors when creating notification', async () => {
      const req = {
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createNotification(req, res);

      // The controller calls res.status(400) explicitly for validation errors
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getNotificationById', () => {
    it('should get a notification by ID', async () => {
      const req = {
        params: {
          id: testNotification._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getNotificationById(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('Test Notification');
    });

    it('should return 404 for non-existent notification', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getNotificationById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateNotification', () => {
    it('should update a notification', async () => {
      const req = {
        params: {
          id: testNotification._id.toString()
        },
        body: {
          title: 'Updated Notification'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateNotification(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('Updated Notification');
    });

    it('should return 404 when updating non-existent notification', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          title: 'Updated Notification'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const req = {
        params: {
          id: testNotification._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteNotification(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Notification deleted');

      // Verify notification was deleted
      const deletedNotification = await Notification.findById(testNotification._id);
      expect(deletedNotification).toBeNull();
    });

    it('should return 404 when deleting non-existent notification', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});