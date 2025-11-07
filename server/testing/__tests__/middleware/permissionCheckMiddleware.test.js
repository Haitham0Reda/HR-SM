import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../models/user.model.js';
import { checkPermission, canViewReports, canManagePermissions, canManageRoles, checkOwnership, resourcePermission } from '../../../middleware/permissionCheckMiddleware.js';

// Import Jest globals explicitly for ES modules
import { jest } from '@jest/globals';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Permission Check Middleware', () => {
  let testUser;
  let req;
  let res;
  let next;

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});

    // Create test user with specific permissions
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: new mongoose.Types.ObjectId(),
      addedPermissions: ['reports.view', 'users.manage-permissions'],
      removedPermissions: ['users.manage-roles']
    };

    testUser = new User(userData);
    await testUser.save();

    // Setup mock request, response, and next function
    req = {
      user: testUser,
      body: {}, // Add empty body to prevent errors
      params: {} // Add empty params to prevent errors
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });

  describe('checkPermission', () => {
    it('should call next() when user has the required permission', async () => {
      const middleware = checkPermission('reports.view');
      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user does not have the required permission', async () => {
      const middleware = checkPermission('users.manage-roles');
      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to perform this action',
        required: ['users.manage-roles']
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when no user is authenticated', async () => {
      const middleware = checkPermission('reports.view');
      const reqWithoutUser = {};
      await middleware(reqWithoutUser, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Specific Permission Checkers', () => {
    it('should allow access with canViewReports when user has reports.view permission', async () => {
      await canViewReports(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny access with canManageRoles when user does not have users.manage-roles permission', async () => {
      await canManageRoles(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access with canManagePermissions when user has users.manage-permissions permission', async () => {
      await canManagePermissions(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkOwnership', () => {
    it('should call next() when user is admin', async () => {
      // Create admin user
      const adminUser = {
        ...testUser.toObject(),
        role: 'admin'
      };
      
      const ownershipMiddleware = checkOwnership('employee');
      const reqWithAdmin = {
        user: adminUser
      };
      
      await ownershipMiddleware(reqWithAdmin, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() when user is not admin and resource field is missing', async () => {
      const ownershipMiddleware = checkOwnership('employee');
      // req without the required field should call next()
      await ownershipMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('resourcePermission', () => {
    it('should call next() when user has full permission', async () => {
      const resourceMiddleware = resourcePermission('reports', 'view');
      await resourceMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user does not have required permission', async () => {
      const resourceMiddleware = resourcePermission('users', 'manage-roles');
      await resourceMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to perform this action'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});