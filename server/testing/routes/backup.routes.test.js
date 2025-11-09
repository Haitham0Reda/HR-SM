import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import BackupRoutes from '../../routes/backup.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  validateBackupType: (req, res, next) => next(),
  validateBackupSchedule: (req, res, next) => next(),
  validateEncryption: (req, res, next) => next(),
  validateCompression: (req, res, next) => next(),
  validateRetention: (req, res, next) => next(),
  validateNotification: (req, res, next) => next(),
  validateSources: (req, res, next) => next(),
  validateStorage: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/backup.controller.js', () => ({
  getAllBackups: (req, res) => res.status(200).json({ message: 'All Backups' }),
  getBackupById: (req, res) => res.status(200).json({ message: 'Backup By ID' }),
  createBackup: (req, res) => res.status(201).json({ message: 'Backup Created' }),
  updateBackup: (req, res) => res.status(200).json({ message: 'Backup Updated' }),
  deleteBackup: (req, res) => res.status(200).json({ message: 'Backup Deleted' }),
  executeBackup: (req, res) => res.status(200).json({ message: 'Backup Executed' }),
  getExecutionHistory: (req, res) => res.status(200).json({ message: 'Execution History' }),
  getBackupStatistics: (req, res) => res.status(200).json({ message: 'Backup Statistics' }),
  restoreBackup: (req, res) => res.status(200).json({ message: 'Backup Restored' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/backups', BackupRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Backup Routes', () => {
  it('should get all backups', async () => {
    const response = await request(app)
      .get('/api/backups')
      .expect(200);
    
    expect(response.body.message).toBe('All Backups');
  });

  it('should get backup by ID', async () => {
    const response = await request(app)
      .get('/api/backups/123')
      .expect(200);
    
    expect(response.body.message).toBe('Backup By ID');
  });

  it('should create a backup', async () => {
    const response = await request(app)
      .post('/api/backups')
      .send({ name: 'Test Backup', backupType: 'database' })
      .expect(201);
    
    expect(response.body.message).toBe('Backup Created');
  });

  it('should update a backup', async () => {
    const response = await request(app)
      .put('/api/backups/123')
      .send({ name: 'Updated Backup' })
      .expect(200);
    
    expect(response.body.message).toBe('Backup Updated');
  });

  it('should delete a backup', async () => {
    const response = await request(app)
      .delete('/api/backups/123')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Deleted');
  });

  it('should execute a backup', async () => {
    const response = await request(app)
      .post('/api/backups/123/execute')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Executed');
  });

  it('should get execution history', async () => {
    const response = await request(app)
      .get('/api/backups/123/history')
      .expect(200);
    
    expect(response.body.message).toBe('Execution History');
  });

  it('should get backup statistics', async () => {
    const response = await request(app)
      .get('/api/backups/123/statistics')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Statistics');
  });

  it('should restore from backup', async () => {
    const response = await request(app)
      .post('/api/backups/restore/123')
      .expect(200);
    
    expect(response.body.message).toBe('Backup Restored');
  });
});