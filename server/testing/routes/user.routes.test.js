import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import UserRoutes from '../../routes/user.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  checkEmailUnique: (req, res, next) => next(),
  checkUsernameUnique: (req, res, next) => next(),
  validateHireDate: (req, res, next) => next(),
  validateDateOfBirth: (req, res, next) => next(),
  validatePhoneNumber: (req, res, next) => next(),
  validateNationalID: (req, res, next) => next(),
  validatePassword: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/user.controller.js', () => ({
  getAllUsers: (req, res) => res.status(200).json({ message: 'All Users' }),
  createUser: (req, res) => res.status(201).json({ message: 'User Created' }),
  getUserById: (req, res) => res.status(200).json({ message: 'User By ID' }),
  updateUser: (req, res) => res.status(200).json({ message: 'User Updated' }),
  deleteUser: (req, res) => res.status(200).json({ message: 'User Deleted' }),
  loginUser: (req, res) => res.status(200).json({ message: 'Login Successful' }),
  getUserProfile: (req, res) => res.status(200).json({ message: 'User Profile' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/users', UserRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('User Routes', () => {
  it('should login a user', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);
    
    expect(response.body.message).toBe('Login Successful');
  });

  it('should get current user profile', async () => {
    const response = await request(app)
      .get('/api/users/profile')
      .expect(200);
    
    expect(response.body.message).toBe('User Profile');
  });

  it('should get all users', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);
    
    expect(response.body.message).toBe('All Users');
  });

  it('should create a user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' })
      .expect(201);
    
    expect(response.body.message).toBe('User Created');
  });

  it('should get user by ID', async () => {
    const response = await request(app)
      .get('/api/users/123')
      .expect(200);
    
    expect(response.body.message).toBe('User By ID');
  });

  it('should update a user', async () => {
    const response = await request(app)
      .put('/api/users/123')
      .send({ username: 'updateduser' })
      .expect(200);
    
    expect(response.body.message).toBe('User Updated');
  });

  it('should delete a user', async () => {
    const response = await request(app)
      .delete('/api/users/123')
      .expect(200);
    
    expect(response.body.message).toBe('User Deleted');
  });
});