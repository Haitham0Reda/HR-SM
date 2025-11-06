import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../../server/models/user.model.js';
import '../../server/models/school.model.js'; // Import School model for population
import userRoutes from '../../server/routes/user.routes.js';

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

let mongoServer;
let testUser;
let authToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

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
  
  // Generate token
  authToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Routes', () => {
  beforeEach(async () => {
    // Clear database except for test user
    await User.deleteMany({
      _id: { $ne: testUser._id }
    });
  });

  describe('POST /login', () => {
    it('should login user with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        role: 'employee'
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
        password: 'wrongpassword',
        role: 'employee'
      };

      await request(app)
        .post('/api/users/login')
        .send(credentials)
        .expect(401);
    });
  });

  describe('GET /profile', () => {
    it('should get user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.username).toBe('testuser');
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.password).toBeUndefined();
    });

    it('should reject profile request when not authenticated', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });
  });
});