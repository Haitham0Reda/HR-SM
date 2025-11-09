import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import RequestRoutes from '../../routes/request.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  checkActive: (req, res, next) => next(),
  calculatePermissionDuration: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/request.controller.js', () => ({
  getAllRequests: (req, res) => res.status(200).json({ message: 'All Requests' }),
  createRequest: (req, res) => res.status(201).json({ message: 'Request Created' }),
  getRequestById: (req, res) => res.status(200).json({ message: 'Request By ID' }),
  updateRequest: (req, res) => res.status(200).json({ message: 'Request Updated' }),
  deleteRequest: (req, res) => res.status(200).json({ message: 'Request Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/requests', RequestRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Request Routes', () => {
  it('should get all requests', async () => {
    const response = await request(app)
      .get('/api/requests')
      .expect(200);
    
    expect(response.body.message).toBe('All Requests');
  });

  it('should create a request', async () => {
    const response = await request(app)
      .post('/api/requests')
      .send({ employeeId: '123', type: 'permission', date: '2023-01-01' })
      .expect(201);
    
    expect(response.body.message).toBe('Request Created');
  });

  it('should get request by ID', async () => {
    const response = await request(app)
      .get('/api/requests/123')
      .expect(200);
    
    expect(response.body.message).toBe('Request By ID');
  });

  it('should update a request', async () => {
    const response = await request(app)
      .put('/api/requests/123')
      .send({ status: 'approved' })
      .expect(200);
    
    expect(response.body.message).toBe('Request Updated');
  });

  it('should delete a request', async () => {
    const response = await request(app)
      .delete('/api/requests/123')
      .expect(200);
    
    expect(response.body.message).toBe('Request Deleted');
  });
});