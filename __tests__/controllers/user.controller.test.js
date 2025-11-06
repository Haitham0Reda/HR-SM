import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../server/models/user.model.js';
import { loginUser, getUserProfile } from '../../server/controller/user.controller.js';

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

describe('User Controller', () => {
  let testUser;

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});

    // Create test user
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: new mongoose.Types.ObjectId()
    };

    testUser = new User(userData);
    await testUser.save();
  });

  describe('loginUser', () => {
    it('should login user with valid credentials', async () => {
      // Create a mock user object with the matchPassword method
      const mockUser = {
        ...testUser.toObject(),
        matchPassword: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(testUser),
        save: jest.fn().mockResolvedValue()
      };

      // Mock the User.findOne.populate chain to avoid Schema errors
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockResolvedValue(mockUser)
        };
      });

      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          role: 'employee'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await loginUser(req, res);

      console.log('res.status calls:', res.status.mock.calls);
      console.log('res.json calls:', res.json.mock.calls);
      
      // Restore the original implementation
      User.findOne = originalFindOne;
      
      // For successful responses, the default status is 200
      // We need to check the actual response status, not whether res.status was called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.token).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user.username).toBe('testuser');
      expect(response.user.password).toBeUndefined();

    });

    it('should reject login with invalid credentials', async () => {
      // Create a mock user object with the matchPassword method
      const mockUser = {
        ...testUser.toObject(),
        matchPassword: jest.fn().mockResolvedValue(false), // Return false for invalid password
        populate: jest.fn().mockResolvedValue(testUser),
        save: jest.fn().mockResolvedValue()
      };

      // Mock the User.findOne.populate chain to avoid Schema errors
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockResolvedValue(mockUser)
        };
      });

      const req = {
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
          role: 'employee'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await loginUser(req, res);

      console.log('res.status calls:', res.status.mock.calls);
      console.log('res.json calls:', res.json.mock.calls);
      
      // Restore the original implementation
      User.findOne = originalFindOne;
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();

    });
  });

  describe('getUserProfile', () => {
    it('should get user profile when authenticated', async () => {
      // Mock the User.findById.populate chain to avoid Schema errors
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockResolvedValue(testUser)
        };
      });

      const req = {
        user: {
          id: testUser._id
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserProfile(req, res);

      console.log('res.status calls:', res.status.mock.calls);
      console.log('res.json calls:', res.json.mock.calls);
      
      // Restore the original implementation
      User.findById = originalFindById;
      
      // For successful responses, the default status is 200
      // We need to check the actual response status, not whether res.status was called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.username).toBe('testuser');
      expect(response.email).toBe('test@example.com');
      expect(response.password).toBeUndefined();

    });
  });
});