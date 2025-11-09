import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import BackupExecutionRoutes from '../../routes/backupExecution.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  canViewAudit: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/backupExecution.controller.js', () => ({
  getAllBackupExecutions: (req, res) => res.status(200).json({ message: 'All Backup Executions' }),
  getBackupExecutionById: (req, res) => res.status(200).json({ message: 'Backup Execution By ID' }),
  getBackupExecutionHistory: (req, res) => res.status(200).json({ message: 'Backup Execution History' }),
  getBackupExecutionStats: (req, res) => res.status(200).json({ message: 'Backup Execution Stats' }),
  getFailedExecutions: (req, res) => res.status(200).json({ message: 'Failed Executions' }),
  getRunningExecutions: (req, res) => res.status(200).json({ message: 'Running Executions' }),
  cancelBackupExecution: (req, res) => res.status(200).json({ message: 'Backup Execution Cancelled' }),
  retryFailedExecution: (req, res) => res.status(200).json({ message: 'Failed Execution Retried' }),
  deleteBackupExecution: (req, res) => res.status(200).json({ message: 'Backup Execution Deleted' }),
  exportExecutionLogs: (req, res) => res.status(200).json({ message: 'Execution Logs Exported' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/backup-executions', BackupExecutionRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Backup Execution Routes', () => {
  it('should get all backup executions', async () => {
    const response = await request(app)
      .get('/api/backup-executions')
      .expect(200);
    
    expect(response.body.message).toBe('All Backup Executions');
  });

  it('should get backup execution by ID', async () => {
    const response = await request(app)
      .get('/api/backup-executions/123')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Execution By ID');
  });

  it('should get execution history for a specific backup', async () => {
    const response = await request(app)
      .get('/api/backup-executions/backup/123/history')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Execution History');
  });

  it('should get execution statistics', async () => {
    const response = await request(app)
      .get('/api/backup-executions/statistics')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Execution Stats');
  });

  it('should get failed executions', async () => {
    const response = await request(app)
      .get('/api/backup-executions/failed')
      .expect(200);
    
    expect(response.body.message).toBe('Failed Executions');
  });

  it('should get running executions', async () => {
    const response = await request(app)
      .get('/api/backup-executions/running')
      .expect(200);
    
    expect(response.body.message).toBe('Running Executions');
  });

  it('should cancel a running backup execution', async () => {
    const response = await request(app)
      .post('/api/backup-executions/123/cancel')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Execution Cancelled');
  });

  it('should retry a failed execution', async () => {
    const response = await request(app)
      .post('/api/backup-executions/123/retry')
      .expect(200);
    
    expect(response.body.message).toBe('Failed Execution Retried');
  });

  it('should delete a backup execution record', async () => {
    const response = await request(app)
      .delete('/api/backup-executions/123')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Execution Deleted');
  });

  it('should export execution logs', async () => {
    const response = await request(app)
      .get('/api/backup-executions/export/logs')
      .expect(200);
    
    expect(response.body.message).toBe('Execution Logs Exported');
  });
});