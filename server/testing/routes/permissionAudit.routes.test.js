import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import PermissionAuditRoutes from '../../routes/permissionAudit.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  canViewAudit: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/permissionAudit.controller.js', () => ({
  getAllPermissionAudits: (req, res) => res.status(200).json({ message: 'All Permission Audits' }),
  getPermissionAuditById: (req, res) => res.status(200).json({ message: 'Permission Audit By ID' }),
  getUserPermissionAuditTrail: (req, res) => res.status(200).json({ message: 'User Permission Audit Trail' }),
  getRecentPermissionChanges: (req, res) => res.status(200).json({ message: 'Recent Permission Changes' }),
  getPermissionChangesByAction: (req, res) => res.status(200).json({ message: 'Permission Changes By Action' }),
  getPermissionChangesByUser: (req, res) => res.status(200).json({ message: 'Permission Changes By User' }),
  getPermissionChangesByModifier: (req, res) => res.status(200).json({ message: 'Permission Changes By Modifier' }),
  exportPermissionAuditLogs: (req, res) => res.status(200).json({ message: 'Permission Audit Logs Exported' }),
  cleanupOldPermissionAudits: (req, res) => res.status(200).json({ message: 'Old Permission Audits Cleaned Up' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/permission-audits', PermissionAuditRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Permission Audit Routes', () => {
  it('should get all permission audits', async () => {
    const response = await request(app)
      .get('/api/permission-audits')
      .expect(200);
    
    expect(response.body.message).toBe('All Permission Audits');
  });

  it('should get permission audit by ID', async () => {
    const response = await request(app)
      .get('/api/permission-audits/123')
      .expect(200);
    
    expect(response.body.message).toBe('Permission Audit By ID');
  });

  it('should get user permission audit trail', async () => {
    const response = await request(app)
      .get('/api/permission-audits/user/123/trail')
      .expect(200);
    
    expect(response.body.message).toBe('User Permission Audit Trail');
  });

  it('should get recent permission changes', async () => {
    const response = await request(app)
      .get('/api/permission-audits/recent')
      .expect(200);
    
    expect(response.body.message).toBe('Recent Permission Changes');
  });

  it('should get permission changes by action type', async () => {
    const response = await request(app)
      .get('/api/permission-audits/action/grant')
      .expect(200);
    
    expect(response.body.message).toBe('Permission Changes By Action');
  });

  it('should get permission changes for a specific user', async () => {
    const response = await request(app)
      .get('/api/permission-audits/user/123/changes')
      .expect(200);
    
    expect(response.body.message).toBe('Permission Changes By User');
  });

  it('should get permission changes made by a specific modifier', async () => {
    const response = await request(app)
      .get('/api/permission-audits/modifier/456/changes')
      .expect(200);
    
    expect(response.body.message).toBe('Permission Changes By Modifier');
  });

  it('should export permission audit logs', async () => {
    const response = await request(app)
      .get('/api/permission-audits/export/logs')
      .expect(200);
    
    expect(response.body.message).toBe('Permission Audit Logs Exported');
  });

  it('should cleanup old permission audits', async () => {
    const response = await request(app)
      .post('/api/permission-audits/cleanup')
      .expect(200);
    
    expect(response.body.message).toBe('Old Permission Audits Cleaned Up');
  });
});