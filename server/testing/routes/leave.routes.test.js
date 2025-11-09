import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import LeaveRoutes from '../../routes/leave.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  checkActive: (req, res, next) => next(),
  populateDepartmentPosition: (req, res, next) => next(),
  calculateDuration: (req, res, next) => next(),
  setMedicalDocRequirement: (req, res, next) => next(),
  reserveVacationBalance: (req, res, next) => next(),
  initializeWorkflow: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/leave.controller.js', () => ({
  getAllLeaves: (req, res) => res.status(200).json({ message: 'All Leaves' }),
  createLeave: (req, res) => res.status(201).json({ message: 'Leave Created' }),
  getLeaveById: (req, res) => res.status(200).json({ message: 'Leave By ID' }),
  updateLeave: (req, res) => res.status(200).json({ message: 'Leave Updated' }),
  deleteLeave: (req, res) => res.status(200).json({ message: 'Leave Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/leaves', LeaveRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Leave Routes', () => {
  it('should get all leaves', async () => {
    const response = await request(app)
      .get('/api/leaves')
      .expect(200);
    
    expect(response.body.message).toBe('All Leaves');
  });

  it('should create a leave', async () => {
    const response = await request(app)
      .post('/api/leaves')
      .send({ employeeId: '123', startDate: '2023-01-01', endDate: '2023-01-05' })
      .expect(201);
    
    expect(response.body.message).toBe('Leave Created');
  });

  it('should get leave by ID', async () => {
    const response = await request(app)
      .get('/api/leaves/123')
      .expect(200);
    
    expect(response.body.message).toBe('Leave By ID');
  });

  it('should update a leave', async () => {
    const response = await request(app)
      .put('/api/leaves/123')
      .send({ status: 'approved' })
      .expect(200);
    
    expect(response.body.message).toBe('Leave Updated');
  });

  it('should delete a leave', async () => {
    const response = await request(app)
      .delete('/api/leaves/123')
      .expect(200);
    
    expect(response.body.message).toBe('Leave Deleted');
  });
});