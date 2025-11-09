import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import MixedVacationRoutes from '../../routes/mixedVacation.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  validateDateRange: (req, res, next) => next(),
  validateTotalDays: (req, res, next) => next(),
  validateDeductionStrategy: (req, res, next) => next(),
  validateApplicableScope: (req, res, next) => next(),
  validateEmployeeId: (req, res, next) => next(),
  validatePolicyStatus: (req, res, next) => next(),
  checkPolicyExists: (req, res, next) => next(),
  checkEmployeeExists: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/mixedVacation.controller.js', () => ({
  getAllPolicies: (req, res) => res.status(200).json({ message: 'All Policies' }),
  getPolicyById: (req, res) => res.status(200).json({ message: 'Policy By ID' }),
  createPolicy: (req, res) => res.status(201).json({ message: 'Policy Created' }),
  updatePolicy: (req, res) => res.status(200).json({ message: 'Policy Updated' }),
  deletePolicy: (req, res) => res.status(200).json({ message: 'Policy Deleted' }),
  testPolicyOnEmployee: (req, res) => res.status(200).json({ message: 'Policy Tested On Employee' }),
  applyToEmployee: (req, res) => res.status(200).json({ message: 'Policy Applied To Employee' }),
  applyToAll: (req, res) => res.status(200).json({ message: 'Policy Applied To All' }),
  getPolicyBreakdown: (req, res) => res.status(200).json({ message: 'Policy Breakdown' }),
  getEmployeeApplications: (req, res) => res.status(200).json({ message: 'Employee Applications' }),
  getActivePolicies: (req, res) => res.status(200).json({ message: 'Active Policies' }),
  getUpcomingPolicies: (req, res) => res.status(200).json({ message: 'Upcoming Policies' }),
  cancelPolicy: (req, res) => res.status(200).json({ message: 'Policy Cancelled' }),
  activatePolicy: (req, res) => res.status(200).json({ message: 'Policy Activated' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/mixed-vacations', MixedVacationRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Mixed Vacation Routes', () => {
  it('should get all policies', async () => {
    const response = await request(app)
      .get('/api/mixed-vacations')
      .expect(200);
    
    expect(response.body.message).toBe('All Policies');
  });

  it('should get active policies', async () => {
    const response = await request(app)
      .get('/api/mixed-vacations/active')
      .expect(200);
    
    expect(response.body.message).toBe('Active Policies');
  });

  it('should get upcoming policies', async () => {
    const response = await request(app)
      .get('/api/mixed-vacations/upcoming')
      .expect(200);
    
    expect(response.body.message).toBe('Upcoming Policies');
  });

  it('should get policy by ID', async () => {
    const response = await request(app)
      .get('/api/mixed-vacations/123')
      .expect(200);
    
    expect(response.body.message).toBe('Policy By ID');
  });

  it('should create a policy', async () => {
    const response = await request(app)
      .post('/api/mixed-vacations')
      .send({ name: 'Test Policy', totalDays: 10 })
      .expect(201);
    
    expect(response.body.message).toBe('Policy Created');
  });

  it('should update a policy', async () => {
    const response = await request(app)
      .put('/api/mixed-vacations/123')
      .send({ name: 'Updated Policy' })
      .expect(200);
    
    expect(response.body.message).toBe('Policy Updated');
  });

  it('should delete a policy', async () => {
    const response = await request(app)
      .delete('/api/mixed-vacations/123')
      .expect(200);
    
    expect(response.body.message).toBe('Policy Deleted');
  });

  it('should test policy on employee', async () => {
    const response = await request(app)
      .post('/api/mixed-vacations/123/test/456')
      .expect(200);
    
    expect(response.body.message).toBe('Policy Tested On Employee');
  });

  it('should get policy breakdown for employee', async () => {
    const response = await request(app)
      .get('/api/mixed-vacations/123/breakdown/456')
      .expect(200);
    
    expect(response.body.message).toBe('Policy Breakdown');
  });

  it('should apply policy to employee', async () => {
    const response = await request(app)
      .post('/api/mixed-vacations/123/apply/456')
      .expect(200);
    
    expect(response.body.message).toBe('Policy Applied To Employee');
  });

  it('should apply policy to all eligible employees', async () => {
    const response = await request(app)
      .post('/api/mixed-vacations/123/apply-all')
      .expect(200);
    
    expect(response.body.message).toBe('Policy Applied To All');
  });

  it('should get employee applications', async () => {
    const response = await request(app)
      .get('/api/mixed-vacations/employee/456/applications')
      .expect(200);
    
    expect(response.body.message).toBe('Employee Applications');
  });

  it('should activate policy', async () => {
    const response = await request(app)
      .post('/api/mixed-vacations/123/activate')
      .expect(200);
    
    expect(response.body.message).toBe('Policy Activated');
  });

  it('should cancel policy', async () => {
    const response = await request(app)
      .post('/api/mixed-vacations/123/cancel')
      .expect(200);
    
    expect(response.body.message).toBe('Policy Cancelled');
  });
});