import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import PayrollRoutes from '../../routes/payroll.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/payroll.controller.js', () => ({
  getAllPayrolls: (req, res) => res.status(200).json({ message: 'All Payrolls' }),
  createPayroll: (req, res) => res.status(201).json({ message: 'Payroll Created' }),
  getPayrollById: (req, res) => res.status(200).json({ message: 'Payroll By ID' }),
  updatePayroll: (req, res) => res.status(200).json({ message: 'Payroll Updated' }),
  deletePayroll: (req, res) => res.status(200).json({ message: 'Payroll Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/payrolls', PayrollRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Payroll Routes', () => {
  it('should get all payrolls', async () => {
    const response = await request(app)
      .get('/api/payrolls')
      .expect(200);
    
    expect(response.body.message).toBe('All Payrolls');
  });

  it('should create a payroll', async () => {
    const response = await request(app)
      .post('/api/payrolls')
      .send({ employeeId: '123', amount: 5000 })
      .expect(201);
    
    expect(response.body.message).toBe('Payroll Created');
  });

  it('should get payroll by ID', async () => {
    const response = await request(app)
      .get('/api/payrolls/123')
      .expect(200);
    
    expect(response.body.message).toBe('Payroll By ID');
  });

  it('should update a payroll', async () => {
    const response = await request(app)
      .put('/api/payrolls/123')
      .send({ amount: 5500 })
      .expect(200);
    
    expect(response.body.message).toBe('Payroll Updated');
  });

  it('should delete a payroll', async () => {
    const response = await request(app)
      .delete('/api/payrolls/123')
      .expect(200);
    
    expect(response.body.message).toBe('Payroll Deleted');
  });
});