import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import BackupExecution from '../../../models/backupExecution.model.js';
import Backup from '../../../models/backup.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import { 
  getAllBackupExecutions,
  getBackupExecutionById,
  getBackupExecutionHistory,
  getBackupExecutionStats,
  getFailedExecutions,
  getRunningExecutions,
  cancelBackupExecution,
  retryFailedExecution,
  deleteBackupExecution,
  exportExecutionLogs
} from '../../../controller/backupExecution.controller.js';

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

describe('Backup Execution Controller', () => {
  let testUser;
  let testBackup;
  let testExecution;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school with valid enum values according to School model
    const testSchool = new School({
      name: 'School of Business',
      schoolCode: 'BUS',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test user with required school field
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      school: testSchool._id
    });
    await testUser.save();

    // Create test backup
    testBackup = new Backup({
      name: 'Test Backup',
      backupType: 'database',
      description: 'Test backup configuration',
      schedule: {
        enabled: false
      },
      storage: {
        location: '/tmp/backups'
      },
      settings: {
        notification: {
          enabled: false
        },
        retention: {
          enabled: false
        }
      },
      isActive: true,
      createdBy: testUser._id
    });
    await testBackup.save();

    // Create test execution
    testExecution = new BackupExecution({
      backup: testBackup._id,
      backupName: 'Test Backup',
      executionType: 'manual',
      triggeredBy: testUser._id,
      status: 'completed',
      startTime: new Date(),
      endTime: new Date(Date.now() + 300000), // 5 minutes later
      duration: 300000,
      backupSize: 1024000, // 1MB
      serverInfo: {
        hostname: 'test-host',
        nodeVersion: 'v14.15.0',
        platform: 'linux'
      }
    });
    await testExecution.save();
  });

  describe('getAllBackupExecutions', () => {
    it('should get all backup executions', async () => {
      // Mock populate chain
      const originalFind = BackupExecution.find;
      BackupExecution.find = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue([testExecution])
            };
          }),
          sort: jest.fn().mockImplementation(() => {
            return {
              limit: jest.fn().mockImplementation(() => {
                return {
                  skip: jest.fn().mockResolvedValue([testExecution])
                };
              })
            };
          })
        };
      });

      const originalCount = BackupExecution.countDocuments;
      BackupExecution.countDocuments = jest.fn().mockResolvedValue(1);

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllBackupExecutions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementations
      BackupExecution.find = originalFind;
      BackupExecution.countDocuments = originalCount;
    });

    it('should handle errors when getting all backup executions', async () => {
      // Mock BackupExecution.find to throw an error
      const originalFind = BackupExecution.find;
      BackupExecution.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllBackupExecutions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      BackupExecution.find = originalFind;
    });
  });

  describe('getBackupExecutionById', () => {
    it('should get a backup execution by ID', async () => {
      // Mock populate chain
      const originalFindById = BackupExecution.findById;
      BackupExecution.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue(testExecution)
            };
          })
        };
      });

      const req = {
        params: {
          id: testExecution._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getBackupExecutionById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.execution).toBeDefined();

      // Restore original implementation
      BackupExecution.findById = originalFindById;
    });

    it('should return 404 when backup execution not found', async () => {
      // Mock populate chain to return null
      const originalFindById = BackupExecution.findById;
      BackupExecution.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue(null)
            };
          })
        };
      });

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getBackupExecutionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Backup execution not found');

      // Restore original implementation
      BackupExecution.findById = originalFindById;
    });
  });

  describe('getFailedExecutions', () => {
    it('should get failed backup executions', async () => {
      // Mock populate chain
      const originalFind = BackupExecution.find;
      BackupExecution.find = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue([testExecution])
            };
          }),
          sort: jest.fn().mockImplementation(() => {
            return {
              limit: jest.fn().mockImplementation(() => {
                return {
                  skip: jest.fn().mockResolvedValue([testExecution])
                };
              })
            };
          })
        };
      });

      const originalCount = BackupExecution.countDocuments;
      BackupExecution.countDocuments = jest.fn().mockResolvedValue(1);

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getFailedExecutions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementations
      BackupExecution.find = originalFind;
      BackupExecution.countDocuments = originalCount;
    });
  });

  describe('getRunningExecutions', () => {
    it('should get running backup executions', async () => {
      // Mock populate chain
      const originalFind = BackupExecution.find;
      BackupExecution.find = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue([testExecution])
            };
          }),
          sort: jest.fn().mockResolvedValue([testExecution])
        };
      });

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getRunningExecutions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      BackupExecution.find = originalFind;
    });
  });

  describe('cancelBackupExecution', () => {
    it('should cancel a running backup execution', async () => {
      // Create a running execution for this test
      const runningExecution = new BackupExecution({
        ...testExecution.toObject(),
        status: 'running'
      });
      await runningExecution.save();

      // Mock findById
      const originalFindById = BackupExecution.findById;
      BackupExecution.findById = jest.fn().mockResolvedValue(runningExecution);

      // Mock save
      runningExecution.save = jest.fn().mockResolvedValue(runningExecution);

      const req = {
        params: {
          id: runningExecution._id.toString()
        },
        user: testUser
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await cancelBackupExecution(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);

      // Restore original implementation
      BackupExecution.findById = originalFindById;
    });

    it('should return 404 when backup execution not found', async () => {
      // Mock findById to return null
      const originalFindById = BackupExecution.findById;
      BackupExecution.findById = jest.fn().mockResolvedValue(null);

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        user: testUser
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await cancelBackupExecution(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Backup execution not found');

      // Restore original implementation
      BackupExecution.findById = originalFindById;
    });
  });

  describe('deleteBackupExecution', () => {
    it('should delete a backup execution', async () => {
      // Mock findById
      const originalFindById = BackupExecution.findById;
      BackupExecution.findById = jest.fn().mockImplementation(() => {
        const execution = {
          ...testExecution.toObject(),
          remove: jest.fn().mockResolvedValue()
        };
        return execution;
      });

      const req = {
        params: {
          id: testExecution._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteBackupExecution(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Backup execution record deleted successfully');

      // Restore original implementation
      BackupExecution.findById = originalFindById;
    });

    it('should return 404 when backup execution not found', async () => {
      // Mock findById to return null
      const originalFindById = BackupExecution.findById;
      BackupExecution.findById = jest.fn().mockResolvedValue(null);

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteBackupExecution(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Backup execution not found');

      // Restore original implementation
      BackupExecution.findById = originalFindById;
    });
  });

  // Add tests for other functions as needed
});