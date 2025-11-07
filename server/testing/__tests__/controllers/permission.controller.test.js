import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import PermissionAudit from '../../../models/permissionAudit.model.js';
import {
  getAllPermissions,
  getRolePermissionsList,
  getUserPermissions,
  addPermissionsToUser,
  removePermissionsFromUser,
  resetUserPermissions,
  changeUserRole,
  getPermissionAuditLog,
  getRecentPermissionChanges
} from '../../../controller/permission.controller.js';

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

describe('Permission Controller', () => {
  let testUser;
  let testAdmin;
  let testSchool;
  let testPermissionAudit;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school with valid enum values according to School model
    testSchool = new School({
      name: 'School of Business',
      schoolCode: 'BUS',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test users with required school field
    testUser = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id,
      addedPermissions: [],
      removedPermissions: []
    });
    await testUser.save();

    testAdmin = new User({
      username: 'testadmin',
      email: 'testadmin@example.com',
      password: 'password123',
      role: 'admin',
      school: testSchool._id
    });
    await testAdmin.save();

    // Create test permission audit
    testPermissionAudit = new PermissionAudit({
      user: testUser._id,
      modifiedBy: testAdmin._id,
      action: 'permission-added',
      changes: {
        permissionsAdded: ['reports.view']
      },
      reason: 'Testing purposes'
    });
    await testPermissionAudit.save();
  });

  describe('getAllPermissions', () => {
    it('should get all available permissions', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.permissions).toBeDefined();
      expect(response.categories).toBeDefined();
      expect(Object.keys(response.permissions).length).toBeGreaterThan(0);
    });
  });

  describe('getRolePermissionsList', () => {
    it('should get permissions for a valid role', async () => {
      const req = {
        params: {
          role: 'employee'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getRolePermissionsList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.role).toBe('employee');
      expect(response.permissions).toBeDefined();
      expect(Array.isArray(response.permissions)).toBe(true);
    });

    it('should return 404 for non-existent role', async () => {
      const req = {
        params: {
          role: 'nonexistent'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getRolePermissionsList(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBeDefined();
    });
  });

  describe('getUserPermissions', () => {
    it('should get effective permissions for a user', async () => {
      const req = {
        params: {
          userId: testUser._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.user.id).toEqual(testUser._id.toString());
      expect(response.permissions).toBeDefined();
      expect(response.permissions.effective).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const req = {
        params: {
          userId: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBeDefined();
    });
  });

  describe('addPermissionsToUser', () => {
    it('should add permissions to a user', async () => {
      const req = {
        params: {
          userId: testUser._id.toString()
        },
        body: {
          permissions: ['reports.view', 'reports.export'],
          reason: 'Testing access'
        },
        user: {
          _id: testAdmin._id
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addPermissionsToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Permissions added successfully');

      // Verify user was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.addedPermissions).toContain('reports.view');
      expect(updatedUser.addedPermissions).toContain('reports.export');
    });

    it('should return 400 when permissions array is missing', async () => {
      const req = {
        params: {
          userId: testUser._id.toString()
        },
        body: {
          // Missing permissions array
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addPermissionsToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 for non-existent user', async () => {
      const req = {
        params: {
          userId: new mongoose.Types.ObjectId().toString()
        },
        body: {
          permissions: ['reports.view'],
          reason: 'Testing access'
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addPermissionsToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('removePermissionsFromUser', () => {
    it('should remove permissions from a user', async () => {
      // First add a permission to remove
      testUser.addedPermissions = ['reports.view'];
      await testUser.save();

      const req = {
        params: {
          userId: testUser._id.toString()
        },
        body: {
          permissions: ['reports.view'],
          reason: 'Revoking access'
        },
        user: {
          _id: testAdmin._id
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await removePermissionsFromUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Permissions removed successfully');

      // Verify user was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.removedPermissions).toContain('reports.view');
      expect(updatedUser.addedPermissions).not.toContain('reports.view');
    });

    it('should return 400 when permissions array is missing', async () => {
      const req = {
        params: {
          userId: testUser._id.toString()
        },
        body: {
          // Missing permissions array
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await removePermissionsFromUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 for non-existent user', async () => {
      const req = {
        params: {
          userId: new mongoose.Types.ObjectId().toString()
        },
        body: {
          permissions: ['reports.view'],
          reason: 'Revoking access'
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await removePermissionsFromUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('resetUserPermissions', () => {
    it('should reset user permissions to role defaults', async () => {
      // Add some custom permissions
      testUser.addedPermissions = ['reports.view'];
      testUser.removedPermissions = ['leaves.view-own'];
      await testUser.save();

      const req = {
        params: {
          userId: testUser._id.toString()
        },
        body: {
          reason: 'Reset to defaults'
        },
        user: {
          _id: testAdmin._id
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await resetUserPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Permissions reset to role defaults');

      // Verify user was reset
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.addedPermissions).toHaveLength(0);
      expect(updatedUser.removedPermissions).toHaveLength(0);
    });

    it('should return 404 for non-existent user', async () => {
      const req = {
        params: {
          userId: new mongoose.Types.ObjectId().toString()
        },
        body: {
          reason: 'Reset to defaults'
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await resetUserPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('changeUserRole', () => {
    it('should change user role', async () => {
      const req = {
        params: {
          userId: testUser._id.toString()
        },
        body: {
          role: 'manager',
          reason: 'Promotion'
        },
        user: {
          _id: testAdmin._id
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await changeUserRole(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('User role updated successfully');

      // Verify user role was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.role).toBe('manager');
    });

    it('should return 400 when role is missing', async () => {
      const req = {
        params: {
          userId: testUser._id.toString()
        },
        body: {
          // Missing role
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await changeUserRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 for non-existent user', async () => {
      const req = {
        params: {
          userId: new mongoose.Types.ObjectId().toString()
        },
        body: {
          role: 'manager',
          reason: 'Promotion'
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await changeUserRole(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getPermissionAuditLog', () => {
    it('should get permission audit log for a user', async () => {
      const req = {
        params: {
          userId: testUser._id.toString()
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPermissionAuditLog(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.auditLog).toBeDefined();
      expect(Array.isArray(response.auditLog)).toBe(true);
    });
  });

  describe('getRecentPermissionChanges', () => {
    it('should get recent permission changes', async () => {
      const req = {
        query: {
          days: '30',
          limit: '100'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getRecentPermissionChanges(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.changes).toBeDefined();
      expect(Array.isArray(response.changes)).toBe(true);
    });
  });
});