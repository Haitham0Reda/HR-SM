import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../models/user.model.js';
import { checkEmailUnique, checkUsernameUnique, validateHireDate, validateDateOfBirth, validatePhoneNumber, validateNationalID, validatePassword } from '../../../middleware/userMiddleware.js';

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

describe('User Middleware', () => {
  let testUser;
  let req;
  let res;
  let next;

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

    // Setup mock request, response, and next function
    req = {
      body: {},
      params: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });

  describe('checkEmailUnique', () => {
    it('should call next() when email is unique', async () => {
      req.body.email = 'unique@example.com';
      await checkEmailUnique(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when email is not unique', async () => {
      req.body.email = 'test@example.com';
      await checkEmailUnique(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email address already in use'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when email is not provided', async () => {
      await checkEmailUnique(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkUsernameUnique', () => {
    it('should call next() when username is unique', async () => {
      req.body.username = 'uniqueuser';
      await checkUsernameUnique(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when username is not unique', async () => {
      req.body.username = 'testuser';
      await checkUsernameUnique(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Username already taken'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when username is not provided', async () => {
      await checkUsernameUnique(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateHireDate', () => {
    it('should call next() when hire date is valid', () => {
      req.body.employment = { hireDate: new Date('2023-01-01') };
      validateHireDate(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() when hire date is not provided', () => {
      validateHireDate(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when hire date is too far in the past', () => {
      // More than 50 years ago
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 51);
      req.body.employment = { hireDate: oldDate };
      validateHireDate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateDateOfBirth', () => {
    it('should call next() when date of birth is valid', () => {
      req.body.profile = { dateOfBirth: new Date('1990-01-01') };
      validateDateOfBirth(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() when date of birth is not provided', () => {
      validateDateOfBirth(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when employee is too young', () => {
      // Less than 16 years old
      const youngDate = new Date();
      youngDate.setFullYear(youngDate.getFullYear() - 15);
      req.body.profile = { dateOfBirth: youngDate };
      validateDateOfBirth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validatePhoneNumber', () => {
    it('should call next() when phone number is valid', () => {
      req.body.profile = { phone: '1234567890' };
      validatePhoneNumber(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() when phone number is not provided', () => {
      validatePhoneNumber(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when phone number format is invalid', () => {
      req.body.profile = { phone: 'invalid-phone' };
      validatePhoneNumber(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateNationalID', () => {
    it('should call next() when national ID is valid', () => {
      req.body.profile = { nationalId: 123456789 };
      validateNationalID(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() when national ID is not provided', () => {
      validateNationalID(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when national ID contains non-numeric characters', () => {
      req.body.profile = { nationalId: '123abc' };
      validateNationalID(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    it('should call next() when password is valid', async () => {
      req.body.password = 'StrongPassword123!';
      await validatePassword(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when password is too short', async () => {
      req.body.password = 'weak';
      await validatePassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when password is not provided', async () => {
      await validatePassword(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});