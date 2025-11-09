import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import ReportRoutes from '../../routes/report.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  canViewReports: (req, res, next) => next(),
  validateReportFields: (req, res, next) => next(),
  validateReportFilters: (req, res, next) => next(),
  validateReportSchedule: (req, res, next) => next(),
  validateVisualization: (req, res, next) => next(),
  validateExportSettings: (req, res, next) => next(),
  validateReportType: (req, res, next) => next(),
  checkReportAccess: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/report.controller.js', () => ({
  getAllReports: (req, res) => res.status(200).json({ message: 'All Reports' }),
  getReportById: (req, res) => res.status(200).json({ message: 'Report By ID' }),
  createReport: (req, res) => res.status(201).json({ message: 'Report Created' }),
  updateReport: (req, res) => res.status(200).json({ message: 'Report Updated' }),
  deleteReport: (req, res) => res.status(200).json({ message: 'Report Deleted' }),
  executeReport: (req, res) => res.status(200).json({ message: 'Report Executed' }),
  exportReport: (req, res) => res.status(200).json({ message: 'Report Exported' }),
  getTemplates: (req, res) => res.status(200).json({ message: 'Report Templates' }),
  getExecutionHistory: (req, res) => res.status(200).json({ message: 'Execution History' }),
  getReportStatistics: (req, res) => res.status(200).json({ message: 'Report Statistics' }),
  shareReport: (req, res) => res.status(200).json({ message: 'Report Shared' }),
  unshareReport: (req, res) => res.status(200).json({ message: 'Report Unshared' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/reports', ReportRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Report Routes', () => {
  it('should get all reports for user', async () => {
    const response = await request(app)
      .get('/api/reports')
      .expect(200);
    
    expect(response.body.message).toBe('All Reports');
  });

  it('should get report templates', async () => {
    const response = await request(app)
      .get('/api/reports/templates')
      .expect(200);
    
    expect(response.body.message).toBe('Report Templates');
  });

  it('should get report by ID', async () => {
    const response = await request(app)
      .get('/api/reports/123')
      .expect(200);
    
    expect(response.body.message).toBe('Report By ID');
  });

  it('should create a new report', async () => {
    const response = await request(app)
      .post('/api/reports')
      .send({ name: 'Test Report', reportType: 'attendance' })
      .expect(201);
    
    expect(response.body.message).toBe('Report Created');
  });

  it('should update a report', async () => {
    const response = await request(app)
      .put('/api/reports/123')
      .send({ name: 'Updated Report' })
      .expect(200);
    
    expect(response.body.message).toBe('Report Updated');
  });

  it('should delete a report', async () => {
    const response = await request(app)
      .delete('/api/reports/123')
      .expect(200);
    
    expect(response.body.message).toBe('Report Deleted');
  });

  it('should execute a report', async () => {
    const response = await request(app)
      .post('/api/reports/123/execute')
      .expect(200);
    
    expect(response.body.message).toBe('Report Executed');
  });

  it('should export report execution', async () => {
    const response = await request(app)
      .get('/api/reports/execution/456/export')
      .expect(200);
    
    expect(response.body.message).toBe('Report Exported');
  });

  it('should get execution history', async () => {
    const response = await request(app)
      .get('/api/reports/123/history')
      .expect(200);
    
    expect(response.body.message).toBe('Execution History');
  });

  it('should get report statistics', async () => {
    const response = await request(app)
      .get('/api/reports/123/statistics')
      .expect(200);
    
    expect(response.body.message).toBe('Report Statistics');
  });

  it('should share a report', async () => {
    const response = await request(app)
      .post('/api/reports/123/share')
      .expect(200);
    
    expect(response.body.message).toBe('Report Shared');
  });

  it('should unshare a report', async () => {
    const response = await request(app)
      .delete('/api/reports/123/share/789')
      .expect(200);
    
    expect(response.body.message).toBe('Report Unshared');
  });
});