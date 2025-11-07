import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Position from '../../../models/position.model.js';
import Department from '../../../models/department.model.js';
import User from '../../../models/user.model.js';
import {
  getAllPositions,
  createPosition,
  getPositionById,
  updatePosition,
  deletePosition
} from '../../../controller/position.controller.js';

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

describe('Position Controller', () => {
  let testDepartment;
  let testPosition;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test department
    testDepartment = new Department({
      name: 'Human Resources',
      code: 'HR',
      school: new mongoose.Types.ObjectId()
    });
    await testDepartment.save();

    // Create test position
    testPosition = new Position({
      title: 'HR Manager',
      arabicTitle: 'مدير الموارد البشرية',
      code: 'HR-MGR-001',
      department: testDepartment._id,
      jobDescription: 'Manage HR operations'
    });
    await testPosition.save();
  });

  describe('getAllPositions', () => {
    it('should get all positions', async () => {
      // Mock populate
      const originalFind = Position.find;
      Position.find = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockResolvedValue([testPosition])
        };
      });

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllPositions(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(1);
      expect(response[0].title).toBe('HR Manager');

      // Restore original implementation
      Position.find = originalFind;
    });
  });

  describe('createPosition', () => {
    it('should create a new position', async () => {
      const newPositionData = {
        title: 'Software Engineer',
        arabicTitle: 'مهندس برمجيات',
        code: 'SE-001',
        department: testDepartment._id,
        jobDescription: 'Develop software applications'
      };

      // Mock new position
      const newPosition = new Position(newPositionData);
      newPosition._id = new mongoose.Types.ObjectId();
      
      // Mock save method
      newPosition.save = jest.fn().mockResolvedValue(newPosition);

      // Mock Position constructor by replacing the default export
      const originalPosition = Position;
      Position.prototype.constructor = jest.fn().mockImplementation((data) => {
        const position = new originalPosition(data);
        position.save = newPosition.save;
        position._id = newPosition._id;
        return position;
      });

      const req = {
        body: newPositionData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createPosition(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('Software Engineer');
      expect(response.code).toBe('SE-001');

      // Restore original implementations
      Position.prototype.constructor = originalPosition.prototype.constructor;
    });

    it('should handle validation errors when creating position', async () => {
      const req = {
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createPosition(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getPositionById', () => {
    it('should get a position by ID', async () => {
      // Mock populate
      const originalFindById = Position.findById;
      Position.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockImplementation(() => {
                return {
                  populate: jest.fn().mockResolvedValue(testPosition)
                };
              })
            };
          })
        };
      });

      const req = {
        params: {
          id: testPosition._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPositionById(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('HR Manager');
      expect(response.code).toBe('HR-MGR-001');

      // Restore original implementation
      Position.findById = originalFindById;
    });

    it('should return 404 for non-existent position', async () => {
      // Mock populate to return null
      const originalFindById = Position.findById;
      Position.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockImplementation(() => {
                return {
                  populate: jest.fn().mockResolvedValue(null)
                };
              })
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

      await getPositionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Position not found');

      // Restore original implementation
      Position.findById = originalFindById;
    });
  });

  describe('updatePosition', () => {
    it('should update a position', async () => {
      // Mock findByIdAndUpdate
      const originalFindByIdAndUpdate = Position.findByIdAndUpdate;
      const updatedPosition = { ...testPosition, title: 'Senior HR Manager' };
      Position.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return updatedPosition;
          })
        };
      });

      const req = {
        params: {
          id: testPosition._id.toString()
        },
        body: {
          title: 'Senior HR Manager'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updatePosition(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('Senior HR Manager');

      // Restore original implementation
      Position.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should return 404 when updating non-existent position', async () => {
      // Mock findByIdAndUpdate to return null
      const originalFindByIdAndUpdate = Position.findByIdAndUpdate;
      Position.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return null;
          })
        };
      });

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          title: 'Senior HR Manager'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updatePosition(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Position not found');

      // Restore original implementation
      Position.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('deletePosition', () => {
    it('should delete a position', async () => {
      // Mock findByIdAndDelete
      const originalFindByIdAndDelete = Position.findByIdAndDelete;
      Position.findByIdAndDelete = jest.fn().mockResolvedValue(testPosition);

      const req = {
        params: {
          id: testPosition._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deletePosition(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Position deleted');

      // Restore original implementation
      Position.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should return 404 when deleting non-existent position', async () => {
      // Mock findByIdAndDelete to return null
      const originalFindByIdAndDelete = Position.findByIdAndDelete;
      Position.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deletePosition(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Position not found');

      // Restore original implementation
      Position.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });
});