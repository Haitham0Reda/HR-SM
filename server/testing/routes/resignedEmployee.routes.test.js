import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import ResignedEmployeeRoutes from '../../routes/resignedEmployee.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  validateResignationDates: (req, res, next) => next(),
  validatePenalty: (req, res, next) => next(),
  checkCanModify: (req, res, next) => next(),
  validateEmployee: (req, res, next) => next(),
  validateResignationType: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/resignedEmployee.controller.js', () => ({
  getAllResignedEmployees: (req, res) => res.status(200).json({ message: 'All Resigned Employees' }),
  getResignedEmployeeById: (req, res) => res.status(200).json({ message: 'Resigned Employee By ID' }),
  createResignedEmployee: (req, res) => res.status(201).json({ message: 'Resigned Employee Created' }),
  updateResignationType: (req, res) => res.status(200).json({ message: 'Resignation Type Updated' }),
  addPenalty: (req, res) => res.status(200).json({ message: 'Penalty Added' }),
  removePenalty: (req, res) => res.status(200).json({ message: 'Penalty Removed' }),
  generateLetter: (req, res) => res.status(200).json({ message: 'Letter Generated' }),
  generateArabicDisclaimer: (req, res) => res.status(200).json({ message: 'Arabic Disclaimer Generated' }),
  lockResignedEmployee: (req, res) => res.status(200).json({ message: 'Resigned Employee Locked' }),
  updateStatus: (req, res) => res.status(200).json({ message: 'Status Updated' }),
  deleteResignedEmployee: (req, res) => res.status(200).json({ message: 'Resigned Employee Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/resigned-employees', ResignedEmployeeRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Resigned Employee Routes', () => {
  it('should get all resigned employees', async () => {
    const response = await request(app)
      .get('/api/resigned-employees')
      .expect(200);
    
    expect(response.body.message).toBe('All Resigned Employees');
  });

  it('should create resigned employee record', async () => {
    const response = await request(app)
      .post('/api/resigned-employees')
      .send({ employeeId: '123', resignationType: 'resignation-letter' })
      .expect(201);
    
    expect(response.body.message).toBe('Resigned Employee Created');
  });

  it('should get resigned employee by ID', async () => {
    const response = await request(app)
      .get('/api/resigned-employees/123')
      .expect(200);
    
    expect(response.body.message).toBe('Resigned Employee By ID');
  });

  it('should update resignation type', async () => {
    const response = await request(app)
      .put('/api/resigned-employees/123/resignation-type')
      .send({ resignationType: 'termination' })
      .expect(200);
    
    expect(response.body.message).toBe('Resignation Type Updated');
  });

  it('should add penalty', async () => {
    const response = await request(app)
      .post('/api/resigned-employees/123/penalties')
      .send({ amount: 100, reason: 'Late return of equipment' })
      .expect(200);
    
    expect(response.body.message).toBe('Penalty Added');
  });

  it('should remove penalty', async () => {
    const response = await request(app)
      .delete('/api/resigned-employees/123/penalties/456')
      .expect(200);
    
    expect(response.body.message).toBe('Penalty Removed');
  });

  it('should generate letter', async () => {
    const response = await request(app)
      .post('/api/resigned-employees/123/generate-letter')
      .expect(200);
    
    expect(response.body.message).toBe('Letter Generated');
  });

  it('should generate Arabic disclaimer', async () => {
    const response = await request(app)
      .post('/api/resigned-employees/123/generate-disclaimer')
      .expect(200);
    
    expect(response.body.message).toBe('Arabic Disclaimer Generated');
  });

  it('should lock resigned employee record', async () => {
    const response = await request(app)
      .post('/api/resigned-employees/123/lock')
      .expect(200);
    
    expect(response.body.message).toBe('Resigned Employee Locked');
  });

  it('should update status', async () => {
    const response = await request(app)
      .put('/api/resigned-employees/123/status')
      .send({ status: 'processed' })
      .expect(200);
    
    expect(response.body.message).toBe('Status Updated');
  });

  it('should delete resigned employee record', async () => {
    const response = await request(app)
      .delete('/api/resigned-employees/123')
      .expect(200);
    
    expect(response.body.message).toBe('Resigned Employee Deleted');
  });
});