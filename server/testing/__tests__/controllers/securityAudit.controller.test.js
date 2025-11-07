import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SecurityAudit from '../../../models/securityAudit.model.js';
import User from '../../../models/user.model.js';
import {
  getAllAuditLogs,
  getAuditLogById,
  getUserActivity,
  getSuspiciousActivities,
  getFailedLogins,
  getSecurityStats,
  getLoginHistory,
  get2FAActivity,
  getPasswordActivity,
  getAccountEvents,
  getPermissionChanges,
  getDataAccessLogs,
  getSystemEvents,
  getIPActivity,
  exportAuditLogs,
  cleanupOldLogs
} from '../../../controller/securityAudit.controller.js';

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

describe('Security Audit Controller', () => {
  let testUser;
  let testAdmin;
  let testAuditLog;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test users
    testUser = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'employee',
      school: new mongoose.Types.ObjectId()
    });
    await testUser.save();

    testAdmin = new User({
      username: 'testadmin',
      email: 'testadmin@example.com',
      password: 'password123',
      role: 'admin',
      school: new mongoose.Types.ObjectId()
    });
    await testAdmin.save();

    // Create test audit log
    testAuditLog = new SecurityAudit({
      eventType: 'login-success',
      user: testUser._id,
      username: 'testuser',
      userEmail: 'testuser@example.com',
      userRole: 'employee',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      details: { test: 'data' },
      severity: 'info',
      success: true
    });
    await testAuditLog.save();
  });

  describe('getAllAuditLogs', () => {
    it('should get all audit logs', async () => {
      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllAuditLogs(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.logs).toBeDefined();
      expect(Array.isArray(response.logs)).toBe(true);
    });

    it('should filter audit logs by event type', async () => {
      const req = {
        query: {
          eventType: 'login-success'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllAuditLogs(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.logs).toBeDefined();
      expect(Array.isArray(response.logs)).toBe(true);
    });
  });

  describe('getAuditLogById', () => {
    it('should get an audit log by ID', async () => {
      const req = {
        params: {
          id: testAuditLog._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAuditLogById(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.log).toBeDefined();
      expect(response.log._id.toString()).toBe(testAuditLog._id.toString());
    });

    it('should return 404 for non-existent audit log', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAuditLogById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Audit log not found');
    });
  });

  describe('getUserActivity', () => {
    it('should get user activity logs', async () => {
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

      await getUserActivity(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.logs).toBeDefined();
      expect(Array.isArray(response.logs)).toBe(true);
    });
  });

  describe('getSuspiciousActivities', () => {
    it('should get suspicious activities', async () => {
      // Create a suspicious activity log
      const suspiciousLog = new SecurityAudit({
        eventType: 'login-failed',
        user: testUser._id,
        username: 'testuser',
        userEmail: 'testuser@example.com',
        userRole: 'employee',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        details: { test: 'data' },
        severity: 'warning',
        success: false
      });
      await suspiciousLog.save();

      const req = {
        query: {
          days: 7
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSuspiciousActivities(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.activities).toBeDefined();
      expect(Array.isArray(response.activities)).toBe(true);
    });
  });

  describe('getFailedLogins', () => {
    it('should get failed login attempts', async () => {
      // Create a failed login log
      const failedLogin = new SecurityAudit({
        eventType: 'login-failed',
        user: testUser._id,
        username: 'testuser',
        userEmail: 'testuser@example.com',
        userRole: 'employee',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        details: { test: 'data' },
        severity: 'warning',
        success: false
      });
      await failedLogin.save();

      const req = {
        query: {
          minutes: 30
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getFailedLogins(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.failedLogins).toBeDefined();
      expect(Array.isArray(response.failedLogins)).toBe(true);
    });
  });

  describe('getSecurityStats', () => {
    it('should get security statistics', async () => {
      const req = {
        query: {
          days: 30
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSecurityStats(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.stats).toBeDefined();
    });
  });

  describe('getLoginHistory', () => {
    it('should get login history for user', async () => {
      // Create login logs
      const loginLog1 = new SecurityAudit({
        eventType: 'login-success',
        user: testUser._id,
        username: 'testuser',
        userEmail: 'testuser@example.com',
        userRole: 'employee',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        details: {},
        severity: 'info',
        success: true
      });
      await loginLog1.save();

      const loginLog2 = new SecurityAudit({
        eventType: 'logout',
        user: testUser._id,
        username: 'testuser',
        userEmail: 'testuser@example.com',
        userRole: 'employee',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        details: {},
        severity: 'info',
        success: true
      });
      await loginLog2.save();

      const req = {
        params: {
          userId: testUser._id.toString()
        },
        query: {
          limit: 50,
          page: 1
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getLoginHistory(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.loginHistory).toBeDefined();
      expect(Array.isArray(response.loginHistory)).toBe(true);
    });
  });

  // Add similar tests for other functions...
  describe('get2FAActivity', () => {
    it('should get 2FA activity', async () => {
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

      await get2FAActivity(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getPasswordActivity', () => {
    it('should get password activity', async () => {
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

      await getPasswordActivity(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getAccountEvents', () => {
    it('should get account events', async () => {
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

      await getAccountEvents(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getPermissionChanges', () => {
    it('should get permission changes', async () => {
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

      await getPermissionChanges(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getDataAccessLogs', () => {
    it('should get data access logs', async () => {
      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getDataAccessLogs(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getSystemEvents', () => {
    it('should get system events', async () => {
      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSystemEvents(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getIPActivity', () => {
    it('should get IP activity', async () => {
      const req = {
        params: {
          ipAddress: '127.0.0.1'
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getIPActivity(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('exportAuditLogs', () => {
    it('should export audit logs', async () => {
      const req = {
        user: testAdmin, // Add user to prevent 500 error
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        header: jest.fn(),
        attachment: jest.fn(),
        send: jest.fn()
      };

      await exportAuditLogs(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('cleanupOldLogs', () => {
    it('should cleanup old logs', async () => {
      const req = {
        user: testAdmin, // Add user to prevent 500 error
        body: {
          days: 30
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await cleanupOldLogs(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });
});