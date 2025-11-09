import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import AnalyticsRoutes from '../../routes/analytics.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  canViewReports: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/analytics.controller.js', () => ({
  getHRDashboard: (req, res) => res.status(200).json({ message: 'HR Dashboard' }),
  getAttendanceAnalytics: (req, res) => res.status(200).json({ message: 'Attendance Analytics' }),
  getLeaveAnalytics: (req, res) => res.status(200).json({ message: 'Leave Analytics' }),
  getEmployeeAnalytics: (req, res) => res.status(200).json({ message: 'Employee Analytics' }),
  getPayrollAnalytics: (req, res) => res.status(200).json({ message: 'Payroll Analytics' }),
  getKPIs: (req, res) => res.status(200).json({ message: 'KPIs' }),
  getTrendAnalysis: (req, res) => res.status(200).json({ message: 'Trend Analysis' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/analytics', AnalyticsRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Analytics Routes', () => {
  it('should get HR dashboard', async () => {
    const response = await request(app)
      .get('/api/analytics/dashboard')
      .expect(200);
    
    expect(response.body.message).toBe('HR Dashboard');
  });

  it('should get attendance analytics', async () => {
    const response = await request(app)
      .get('/api/analytics/attendance')
      .expect(200);
    
    expect(response.body.message).toBe('Attendance Analytics');
  });

  it('should get leave analytics', async () => {
    const response = await request(app)
      .get('/api/analytics/leave')
      .expect(200);
    
    expect(response.body.message).toBe('Leave Analytics');
  });

  it('should get employee analytics', async () => {
    const response = await request(app)
      .get('/api/analytics/employees')
      .expect(200);
    
    expect(response.body.message).toBe('Employee Analytics');
  });

  it('should get payroll analytics', async () => {
    const response = await request(app)
      .get('/api/analytics/payroll')
      .expect(200);
    
    expect(response.body.message).toBe('Payroll Analytics');
  });

  it('should get KPIs', async () => {
    const response = await request(app)
      .get('/api/analytics/kpis')
      .expect(200);
    
    expect(response.body.message).toBe('KPIs');
  });

  it('should get trend analysis', async () => {
    const response = await request(app)
      .get('/api/analytics/trends')
      .expect(200);
    
    expect(response.body.message).toBe('Trend Analysis');
  });
});