import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../../server/models/user.model.js';
import { protect, admin } from '../../server/middleware/authMiddleware.js';

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

describe('Auth Middleware', () => {
  let testUser;

  beforeEach(async () => {
    // Create a test user
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

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('protect middleware', () => {
    it('should deny access when no token is provided', async () => {
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when invalid token is provided', async () => {
      const req = { 
        headers: { 
          authorization: 'Bearer invalidtoken' 
        } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access when valid token is provided', async () => {
      // Mock the User.findById method to avoid populate issues
      const findByIdSpy = jest.spyOn(User, 'findById').mockImplementation((id) => {
        return {
          select: () => {
            return {
              populate: () => Promise.resolve({
                _id: testUser._id,
                username: 'testuser',
                email: 'test@example.com',
                role: 'employee'
              })
            };
          }
        };
      });
      
      const token = jwt.sign({ id: testUser._id.toString() }, process.env.JWT_SECRET);
      
      const req = { 
        headers: { 
          authorization: `Bearer ${token}` 
        } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(findByIdSpy).toHaveBeenCalledWith(testUser._id.toString());
      expect(res.status).not.toHaveBeenCalledWith(401);
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(testUser._id.toString());
      expect(next).toHaveBeenCalled();
      
      // Restore the original implementation
      findByIdSpy.mockRestore();
    });
  });

  describe('admin middleware', () => {
    it('should deny access when user is not admin', () => {
      const req = { user: testUser };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      admin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized as admin' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access when user is admin', async () => {
      // Create an admin user
      const adminData = {
        username: 'adminuser',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        school: new mongoose.Types.ObjectId()
      };

      const adminUser = new User(adminData);
      await adminUser.save();

      const req = { user: adminUser };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      admin(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});