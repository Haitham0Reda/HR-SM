import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SecuritySettings from '../../../models/securitySettings.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import {
  getSecuritySettings,
  updateSecuritySettings,
  update2FASettings,
  updatePasswordPolicy,
  updateLockoutSettings,
  addIPToWhitelist,
  removeIPFromWhitelist,
  toggleIPWhitelist,
  updateSessionSettings,
  enableDevelopmentMode,
  disableDevelopmentMode,
  updateAuditSettings,
  testPassword
} from '../../../controller/securitySettings.controller.js';

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

describe('Security Settings Controller', () => {
  let testUser;
  let testAdmin;
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
  });

  describe('getSecuritySettings', () => {
    it('should get current security settings', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSecuritySettings(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.settings).toBeDefined();
    });
  });

  describe('updateSecuritySettings', () => {
    it('should update security settings', async () => {
      const updates = {
        twoFactorAuth: {
          enabled: true,
          enforced: false
        }
      };

      const req = {
        body: updates,
        user: {
          _id: testAdmin._id,
          username: 'testadmin',
          email: 'testadmin@example.com',
          role: 'admin'
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent'),
        originalUrl: '/api/security/settings',
        method: 'PUT'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateSecuritySettings(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Security settings updated successfully');
    });

    it('should handle validation errors when updating security settings', async () => {
      const req = {
        body: {
          // Invalid data that would cause validation error
          passwordPolicy: {
            minLength: -1 // Invalid value
          }
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

      await updateSecuritySettings(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('update2FASettings', () => {
    it('should update 2FA settings', async () => {
      const req = {
        body: {
          enabled: true,
          enforced: true,
          backupCodesCount: 10
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

      await update2FASettings(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('2FA settings updated successfully');
      expect(response.twoFactorAuth.enabled).toBe(true);
    });
  });

  describe('updatePasswordPolicy', () => {
    it('should update password policy', async () => {
      const policy = {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      };

      const req = {
        body: policy,
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

      await updatePasswordPolicy(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Password policy updated successfully');
      expect(response.passwordPolicy.minLength).toBe(12);
    });
  });

  describe('updateLockoutSettings', () => {
    it('should update account lockout settings', async () => {
      const lockout = {
        maxAttempts: 5,
        lockoutDuration: 30,
        resetAfter: 60
      };

      const req = {
        body: lockout,
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

      await updateLockoutSettings(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Account lockout settings updated successfully');
      expect(response.accountLockout.maxAttempts).toBe(5);
    });
  });

  describe('addIPToWhitelist', () => {
    it('should add IP to whitelist', async () => {
      const req = {
        body: {
          ip: '192.168.1.100',
          description: 'Office network'
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

      await addIPToWhitelist(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('IP added to whitelist successfully');
    });

    it('should handle validation errors when adding IP to whitelist', async () => {
      const req = {
        body: {
          // Missing required ip field
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

      await addIPToWhitelist(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('IP address is required');
    });
  });

  describe('removeIPFromWhitelist', () => {
    it('should remove IP from whitelist', async () => {
      // First add an IP to remove
      const addReq = {
        body: {
          ip: '192.168.1.100',
          description: 'Office network'
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
      const addRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addIPToWhitelist(addReq, addRes);

      // Check that the add was successful
      expect(addRes.json).toHaveBeenCalled();
      const addResponse = addRes.json.mock.calls[0][0];
      expect(addResponse.success).toBe(true);
      
      // Get the IP ID from the response
      const ipId = addResponse.ipWhitelist.allowedIPs[0]._id;

      // Now remove the IP
      const req = {
        params: {
          ipId: ipId.toString()
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

      await removeIPFromWhitelist(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('IP removed from whitelist successfully');
    });

    it('should return 404 when IP not found in whitelist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const req = {
        params: {
          ipId: fakeId.toString()
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

      await removeIPFromWhitelist(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('IP not found in whitelist');
    });
  });

  describe('toggleIPWhitelist', () => {
    it('should toggle IP whitelist', async () => {
      const req = {
        body: {
          enabled: true
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

      await toggleIPWhitelist(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('IP whitelist enabled successfully');
    });
  });

  describe('updateSessionSettings', () => {
    it('should update session settings', async () => {
      const session = {
        maxAge: 3600000,
        renewBeforeExpiration: true
      };

      const req = {
        body: session,
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

      await updateSessionSettings(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Session settings updated successfully');
      expect(response.sessionManagement.maxAge).toBe(3600000);
    });
  });

  describe('enableDevelopmentMode', () => {
    it('should enable development mode', async () => {
      const req = {
        body: {
          allowedUsers: [testAdmin._id],
          maintenanceMessage: 'System under maintenance'
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

      await enableDevelopmentMode(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Development mode enabled successfully');
      expect(response.developmentMode.enabled).toBe(true);
    });
  });

  describe('disableDevelopmentMode', () => {
    it('should disable development mode', async () => {
      // First enable development mode
      const enableReq = {
        body: {
          allowedUsers: [testAdmin._id],
          maintenanceMessage: 'System under maintenance'
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
      const enableRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await enableDevelopmentMode(enableReq, enableRes);

      // Now disable development mode
      const req = {
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

      await disableDevelopmentMode(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Development mode disabled successfully');
      expect(response.developmentMode.enabled).toBe(false);
    });
  });

  describe('updateAuditSettings', () => {
    it('should update audit settings', async () => {
      const audit = {
        logLevel: 'verbose',
        retentionDays: 90
      };

      const req = {
        body: audit,
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

      await updateAuditSettings(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Audit settings updated successfully');
      expect(response.auditSettings.logLevel).toBe('verbose');
    });
  });

  describe('testPassword', () => {
    it('should test password against current policy', async () => {
      const req = {
        body: {
          password: 'MySecurePassword123!'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await testPassword(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.validation).toBeDefined();
    });

    it('should handle validation errors when testing password', async () => {
      const req = {
        body: {
          // Missing required password field
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await testPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Password is required');
    });
  });
});