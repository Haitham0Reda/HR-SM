import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import SecurityAuditRoutes from '../../routes/securityAudit.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  canViewAudit: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/securityAudit.controller.js', () => ({
  getAllAuditLogs: (req, res) => res.status(200).json({ message: 'All Audit Logs' }),
  getAuditLogById: (req, res) => res.status(200).json({ message: 'Audit Log By ID' }),
  getUserActivity: (req, res) => res.status(200).json({ message: 'User Activity' }),
  getSuspiciousActivities: (req, res) => res.status(200).json({ message: 'Suspicious Activities' }),
  getFailedLogins: (req, res) => res.status(200).json({ message: 'Failed Logins' }),
  getSecurityStats: (req, res) => res.status(200).json({ message: 'Security Stats' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/security-audits', SecurityAuditRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Security Audit Routes', () => {
  it('should get all audit logs', async () => {
    const response = await request(app)
      .get('/api/security-audits')
      .expect(200);
    
    expect(response.body.message).toBe('All Audit Logs');
  });

  it('should get audit log by ID', async () => {
    const response = await request(app)
      .get('/api/security-audits/123')
      .expect(200);
    
    expect(response.body.message).toBe('Audit Log By ID');
  });

  it('should get user activity', async () => {
    const response = await request(app)
      .get('/api/security-audits/user/123/activity')
      .expect(200);
    
    expect(response.body.message).toBe('User Activity');
  });

  it('should get suspicious activities', async () => {
    const response = await request(app)
      .get('/api/security-audits/security/suspicious')
      .expect(200);
    
    expect(response.body.message).toBe('Suspicious Activities');
  });

  it('should get failed login attempts', async () => {
    const response = await request(app)
      .get('/api/security-audits/security/failed-logins')
      .expect(200);
    
    expect(response.body.message).toBe('Failed Logins');
  });

  it('should get security statistics', async () => {
    const response = await request(app)
      .get('/api/security-audits/security/stats')
      .expect(200);
    
    expect(response.body.message).toBe('Security Stats');
  });
});