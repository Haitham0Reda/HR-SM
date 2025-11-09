import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import PermissionRoutes from '../../routes/permission.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  canManagePermissions: (req, res, next) => next(),
  canManageRoles: (req, res, next) => next(),
  canViewAudit: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/permission.controller.js', () => ({
  getAllPermissions: (req, res) => res.status(200).json({ message: 'All Permissions' }),
  getRolePermissionsList: (req, res) => res.status(200).json({ message: 'Role Permissions List' }),
  getUserPermissions: (req, res) => res.status(200).json({ message: 'User Permissions' }),
  addPermissionsToUser: (req, res) => res.status(200).json({ message: 'Permissions Added To User' }),
  removePermissionsFromUser: (req, res) => res.status(200).json({ message: 'Permissions Removed From User' }),
  resetUserPermissions: (req, res) => res.status(200).json({ message: 'User Permissions Reset' }),
  changeUserRole: (req, res) => res.status(200).json({ message: 'User Role Changed' }),
  getPermissionAuditLog: (req, res) => res.status(200).json({ message: 'Permission Audit Log' }),
  getRecentPermissionChanges: (req, res) => res.status(200).json({ message: 'Recent Permission Changes' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/permissions', PermissionRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Permission Routes', () => {
  it('should get all available permissions', async () => {
    const response = await request(app)
      .get('/api/permissions/all')
      .expect(200);
    
    expect(response.body.message).toBe('All Permissions');
  });

  it('should get role permissions', async () => {
    const response = await request(app)
      .get('/api/permissions/role/admin')
      .expect(200);
    
    expect(response.body.message).toBe('Role Permissions List');
  });

  it('should get user permissions', async () => {
    const response = await request(app)
      .get('/api/permissions/user/123')
      .expect(200);
    
    expect(response.body.message).toBe('User Permissions');
  });

  it('should add permissions to user', async () => {
    const response = await request(app)
      .post('/api/permissions/user/123/add')
      .send({ permissions: ['read', 'write'] })
      .expect(200);
    
    expect(response.body.message).toBe('Permissions Added To User');
  });

  it('should remove permissions from user', async () => {
    const response = await request(app)
      .post('/api/permissions/user/123/remove')
      .send({ permissions: ['delete'] })
      .expect(200);
    
    expect(response.body.message).toBe('Permissions Removed From User');
  });

  it('should reset user permissions', async () => {
    const response = await request(app)
      .post('/api/permissions/user/123/reset')
      .expect(200);
    
    expect(response.body.message).toBe('User Permissions Reset');
  });

  it('should change user role', async () => {
    const response = await request(app)
      .put('/api/permissions/user/123/role')
      .send({ role: 'manager' })
      .expect(200);
    
    expect(response.body.message).toBe('User Role Changed');
  });

  it('should get user permission audit log', async () => {
    const response = await request(app)
      .get('/api/permissions/audit/123')
      .expect(200);
    
    expect(response.body.message).toBe('Permission Audit Log');
  });

  it('should get recent permission changes', async () => {
    const response = await request(app)
      .get('/api/permissions/audit/recent')
      .expect(200);
    
    expect(response.body.message).toBe('Recent Permission Changes');
  });
});