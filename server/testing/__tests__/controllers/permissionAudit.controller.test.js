import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import PermissionAudit from '../../../models/permissionAudit.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import {
  getAllPermissionAudits,
  getPermissionAuditById,
  getUserPermissionAuditTrail,
  getRecentPermissionChanges,
  getPermissionChangesByAction,
  getPermissionChangesByUser,
  getPermissionChangesByModifier,
  exportPermissionAuditLogs,
  cleanupOldPermissionAudits
} from '../../../controller/permissionAudit.controller.js';

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

describe('Permission Audit Controller', () => {
  let testUser;
  let testAdmin;
  let testPermissionAudit;
  let testSchool;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school first (required for User)
    testSchool = new School({
      schoolCode: 'BUS',
      name: 'School of Business',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test users
    testUser = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id
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

  describe('getAllPermissionAudits', () => {
    it('should get all permission audits', async () => {
      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllPermissionAudits(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.audits).toBeDefined();
      expect(Array.isArray(response.audits)).toBe(true);
      expect(response.pagination).toBeDefined();
    });

    it('should filter audits by action type', async () => {
      const req = {
        query: {
          action: 'permission-added'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllPermissionAudits(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.audits).toBeDefined();
      expect(Array.isArray(response.audits)).toBe(true);
    });
  });

  describe('getPermissionAuditById', () => {
    it('should get a permission audit by ID', async () => {
      const req = {
        params: {
          id: testPermissionAudit._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPermissionAuditById(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.audit).toBeDefined();
      expect(response.audit._id.toString()).toBe(testPermissionAudit._id.toString());
    });

    it('should return 404 for non-existent audit', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPermissionAuditById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('getUserPermissionAuditTrail', () => {
    it('should get permission audit trail for a user', async () => {
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

      await getUserPermissionAuditTrail(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.audits).toBeDefined();
      expect(Array.isArray(response.audits)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const req = {
        params: {
          userId: new mongoose.Types.ObjectId().toString()
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserPermissionAuditTrail(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('getRecentPermissionChanges', () => {
    it('should get recent permission changes', async () => {
      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getRecentPermissionChanges(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.audits).toBeDefined();
      expect(Array.isArray(response.audits)).toBe(true);
      expect(response.pagination).toBeDefined();
    });
  });

  describe('getPermissionChangesByAction', () => {
    it('should get permission changes by action type', async () => {
      const req = {
        params: {
          action: 'permission-added'
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPermissionChangesByAction(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.action).toBe('permission-added');
      expect(response.audits).toBeDefined();
      expect(Array.isArray(response.audits)).toBe(true);
      expect(response.pagination).toBeDefined();
    });

    it('should return 400 for invalid action type', async () => {
      const req = {
        params: {
          action: 'invalid-action'
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPermissionChangesByAction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('getPermissionChangesByUser', () => {
    it('should get permission changes for a specific user', async () => {
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

      await getPermissionChangesByUser(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.audits).toBeDefined();
      expect(Array.isArray(response.audits)).toBe(true);
      expect(response.pagination).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const req = {
        params: {
          userId: new mongoose.Types.ObjectId().toString()
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPermissionChangesByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('getPermissionChangesByModifier', () => {
    it('should get permission changes made by a specific modifier', async () => {
      const req = {
        params: {
          modifierId: testAdmin._id.toString()
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPermissionChangesByModifier(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.modifier).toBeDefined();
      expect(response.audits).toBeDefined();
      expect(Array.isArray(response.audits)).toBe(true);
      expect(response.pagination).toBeDefined();
    });

    it('should return 404 for non-existent modifier', async () => {
      const req = {
        params: {
          modifierId: new mongoose.Types.ObjectId().toString()
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPermissionChangesByModifier(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('exportPermissionAuditLogs', () => {
    it('should export permission audit logs in JSON format', async () => {
      const req = {
        query: {
          format: 'json'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        header: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis()
      };

      await exportPermissionAuditLogs(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.audits).toBeDefined();
      expect(Array.isArray(response.audits)).toBe(true);
    });

    it('should export permission audit logs in CSV format', async () => {
      const req = {
        query: {
          format: 'csv'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        header: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis()
      };

      await exportPermissionAuditLogs(req, res);

      expect(res.send).toHaveBeenCalled();
      expect(res.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.attachment).toHaveBeenCalledWith('permission-audits.csv');
    });
  });

  describe('cleanupOldPermissionAudits', () => {
    it('should cleanup old permission audits', async () => {
      const req = {
        body: {
          days: 90
        },
        user: {
          _id: testAdmin._id,
          username: 'testadmin',
          email: 'testadmin@example.com',
          role: 'admin'
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await cleanupOldPermissionAudits(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.deletedCount).toBeDefined();
    });
  });
});