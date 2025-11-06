import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../../server/models/user.model.js';
import { loginUser, getUserProfile } from '../../server/controller/user.controller.js';

// Create express app for testing
const app = express();
app.use(express.json());

// Mock middleware functions
const mockProtect = (req, res, next) => {
  req.user = { id: 'test-user-id', role: 'admin' };
  next();
};

// Set up routes with mocked middleware
app.post('/api/users/login', loginUser);
app.get('/api/users/profile', mockProtect, getUserProfile);

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
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/users/login')
        .send(credentials)
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.password).toBeUndefined(); // Password should be excluded
    });

    it('should reject login with invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await request(app)
        .post('/api/users/login')
        .send(credentials)
        .expect(401);
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile when authenticated', async () => {
      // For this test, we need to mock the protect middleware to set req.user
      const testApp = express();
      testApp.use(express.json());
      
      // Create a real token for the test user
      const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET);
      
      // Mock protect middleware that actually verifies the token
      const mockRealProtect = async (req, res, next) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ message: 'Not authorized, no token' });
        }
        
        const token = req.headers.authorization.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = await User.findById(decoded.id);
          next();
        } catch (error) {
          return res.status(401).json({ message: 'Not authorized, token failed' });
        }
      };
      
      testApp.get('/api/users/profile', mockRealProtect, getUserProfile);
      
      const res = await request(testApp)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.username).toBe('testuser');
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.password).toBeUndefined();
    });
  });
});