import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Backup from '../../../models/backup.model.js';
import User from '../../../models/user.model.js';
import { 
  getAllBackups,
  getBackupById,
  createBackup,
  updateBackup,
  deleteBackup,
  executeBackup,
  getExecutionHistory,
  getBackupStatistics,
  restoreBackup
} from '../../../controller/backup.controller.js';

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

describe('Backup Controller', () => {
  let testUser;
  let testBackup;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
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
  });

  describe('getAllBackups', () => {
    it('should get all backups', async () => {
      // Mock populate chain
      const originalFind = Backup.find;
      Backup.find = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockResolvedValue([testBackup]),
          sort: jest.fn().mockImplementation(() => {
            return {
              limit: jest.fn().mockImplementation(() => {
                return {
                  skip: jest.fn().mockResolvedValue([testBackup])
                };
              })
            };
          })
        };
      });

      const originalCount = Backup.countDocuments;
      Backup.countDocuments = jest.fn().mockResolvedValue(1);

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllBackups(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementations
      Backup.find = originalFind;
      Backup.countDocuments = originalCount;
    });

    it('should handle errors when getting all backups', async () => {
      // Mock Backup.find to throw an error
      const originalFind = Backup.find;
      Backup.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllBackups(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Backup.find = originalFind;
    });
  });

  describe('getBackupById', () => {
    it('should get a backup by ID', async () => {
      // Mock populate chain
      const originalFindById = Backup.findById;
      Backup.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue(testBackup)
            };
          })
        };
      });

      const req = {
        params: {
          id: testBackup._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getBackupById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.backup).toBeDefined();

      // Restore original implementation
      Backup.findById = originalFindById;
    });

    it('should return 404 when backup not found', async () => {
      // Mock populate chain to return null
      const originalFindById = Backup.findById;
      Backup.findById = jest.fn().mockImplementation(() => {
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

      await getBackupById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Backup configuration not found');

      // Restore original implementation
      Backup.findById = originalFindById;
    });
  });

  describe('createBackup', () => {
    it('should create a new backup', async () => {
      const backupData = {
        name: 'New Backup',
        backupType: 'files',
        description: 'New backup configuration',
        schedule: {
          enabled: false
        },
        storage: {
          location: '/tmp/new-backups'
        },
        settings: {
          notification: {
            enabled: false
          }
        },
        isActive: true
      };

      // Mock new backup
      const newBackup = new Backup(backupData);
      newBackup._id = new mongoose.Types.ObjectId();
      newBackup.createdBy = testUser._id;
      
      // Mock save method
      newBackup.save = jest.fn().mockResolvedValue(newBackup);
      
      // Mock populate method
      newBackup.populate = jest.fn().mockResolvedValue(newBackup);

      // Mock Backup constructor
      const originalBackupConstructor = Backup;
      jest.spyOn(global, 'Backup').mockImplementation((data) => {
        const backup = new originalBackupConstructor(data);
        backup.save = newBackup.save;
        backup.populate = newBackup.populate;
        backup._id = newBackup._id;
        return backup;
      });

      const req = {
        body: backupData,
        user: testUser
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.backup.name).toBe('New Backup');

      // Restore original implementations
      global.Backup = originalBackupConstructor;
    });

    it('should handle validation errors when creating backup', async () => {
      const req = {
        body: {
          // Missing required fields
        },
        user: testUser
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('updateBackup', () => {
    it('should update a backup', async () => {
      const updateData = {
        name: 'Updated Backup',
        description: 'Updated backup configuration'
      };

      // Mock findById
      const originalFindById = Backup.findById;
      Backup.findById = jest.fn().mockImplementation(() => {
        const backup = {
          ...testBackup.toObject(),
          ...updateData,
          save: jest.fn().mockResolvedValue({
            ...testBackup.toObject(),
            ...updateData
          }),
          populate: jest.fn().mockResolvedValue({
            ...testBackup.toObject(),
            ...updateData
          })
        };
        return backup;
      });

      const req = {
        params: {
          id: testBackup._id.toString()
        },
        body: updateData,
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);

      // Restore original implementation
      Backup.findById = originalFindById;
    });

    it('should return 404 when updating non-existent backup', async () => {
      // Mock findById to return null
      const originalFindById = Backup.findById;
      Backup.findById = jest.fn().mockResolvedValue(null);

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          name: 'Updated Backup'
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Backup configuration not found');

      // Restore original implementation
      Backup.findById = originalFindById;
    });
  });

  describe('deleteBackup', () => {
    it('should delete a backup', async () => {
      // Mock findById
      const originalFindById = Backup.findById;
      const mockBackup = {
        ...testBackup.toObject(),
        isActive: false,
        save: jest.fn().mockResolvedValue({
          ...testBackup.toObject(),
          isActive: false
        })
      };
      Backup.findById = jest.fn().mockResolvedValue(mockBackup);

      const req = {
        params: {
          id: testBackup._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Backup configuration deleted successfully');

      // Restore original implementation
      Backup.findById = originalFindById;
    });

    it('should return 404 when deleting non-existent backup', async () => {
      // Mock findById to return null
      const originalFindById = Backup.findById;
      Backup.findById = jest.fn().mockResolvedValue(null);

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Backup configuration not found');

      // Restore original implementation
      Backup.findById = originalFindById;
    });
  });

  // Add tests for other functions as needed
});