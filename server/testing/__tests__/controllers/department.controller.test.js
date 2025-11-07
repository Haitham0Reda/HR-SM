import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Department from '../../../models/department.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import { 
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../../../controller/department.controller.js';

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

describe('Department Controller', () => {
  let testUser;
  let testManager;
  let testDepartment;
  let testSchool;

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

    // Create test manager
    testManager = new User({
      username: 'testmanager',
      email: 'manager@example.com',
      password: 'password123',
      role: 'manager',
      school: testSchool._id
    });
    await testManager.save();

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id
    });
    await testUser.save();

    // Create test department
    testDepartment = new Department({
      name: 'Human Resources',
      code: 'HR',
      description: 'Human Resources Department',
      manager: testManager._id,
      school: testSchool._id,
      isActive: true
    });
    await testDepartment.save();
  });

  describe('getAllDepartments', () => {
    it('should get all departments', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.find.populate chain
      const originalFind = Department.find;
      Department.find = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue([testDepartment])
            };
          })
        };
      });

      await getAllDepartments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Department.find = originalFind;
    });

    it('should handle errors when getting all departments', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.find to throw an error
      const originalFind = Department.find;
      Department.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getAllDepartments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Department.find = originalFind;
    });
  });

  describe('getDepartmentById', () => {
    it('should get a department by ID', async () => {
      const req = {
        params: {
          id: testDepartment._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findById.populate chain
      const originalFindById = Department.findById;
      Department.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue(testDepartment)
            };
          })
        };
      });

      await getDepartmentById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Department.findById = originalFindById;
    });

    it('should return 404 when department not found', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findById to return null
      const originalFindById = Department.findById;
      Department.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue(null)
            };
          })
        };
      });

      await getDepartmentById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Department not found');

      // Restore original implementation
      Department.findById = originalFindById;
    });

    it('should handle errors when getting department by ID', async () => {
      const req = {
        params: {
          id: testDepartment._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findById to throw an error
      const originalFindById = Department.findById;
      Department.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getDepartmentById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Department.findById = originalFindById;
    });
  });

  describe('createDepartment', () => {
    it('should create a new department', async () => {
      const departmentData = {
        name: 'Finance',
        code: 'FIN',
        description: 'Finance Department',
        manager: testManager._id,
        school: testSchool._id
      };

      const req = {
        body: departmentData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock new department save
      const newDepartment = new Department(departmentData);
      newDepartment._id = new mongoose.Types.ObjectId();
      
      const originalSave = newDepartment.save;
      newDepartment.save = jest.fn().mockResolvedValue(newDepartment);

      // Mock Department constructor
      const originalDepartmentConstructor = Department;
      jest.spyOn(global, 'Department').mockImplementation((data) => {
        const department = new originalDepartmentConstructor(data);
        department._id = newDepartment._id;
        department.save = newDepartment.save;
        return department;
      });

      await createDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementations
      global.Department = originalDepartmentConstructor;
    });

    it('should handle validation errors when creating department', async () => {
      const req = {
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('updateDepartment', () => {
    it('should update a department', async () => {
      const updateData = {
        name: 'Updated HR',
        description: 'Updated Human Resources Department'
      };

      const req = {
        params: {
          id: testDepartment._id.toString()
        },
        body: updateData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findByIdAndUpdate.populate chain
      const originalFindByIdAndUpdate = Department.findByIdAndUpdate;
      Department.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue({
                ...testDepartment.toObject(),
                ...updateData
              })
            };
          })
        };
      });

      await updateDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Department.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should return 404 when updating non-existent department', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          name: 'Updated Department'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findByIdAndUpdate to return null
      const originalFindByIdAndUpdate = Department.findByIdAndUpdate;
      Department.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockResolvedValue(null)
            };
          })
        };
      });

      await updateDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Department not found');

      // Restore original implementation
      Department.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should handle validation errors when updating department', async () => {
      const req = {
        params: {
          id: testDepartment._id.toString()
        },
        body: {
          // Invalid data that would cause validation error
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findByIdAndUpdate to throw an error
      const originalFindByIdAndUpdate = Department.findByIdAndUpdate;
      Department.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });

      await updateDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Department.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('deleteDepartment', () => {
    it('should delete a department', async () => {
      const req = {
        params: {
          id: testDepartment._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findByIdAndDelete to return our test data
      const originalFindByIdAndDelete = Department.findByIdAndDelete;
      Department.findByIdAndDelete = jest.fn().mockResolvedValue(testDepartment);

      await deleteDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Department.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should return 404 when deleting non-existent department', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findByIdAndDelete to return null
      const originalFindByIdAndDelete = Department.findByIdAndDelete;
      Department.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      await deleteDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Department not found');

      // Restore original implementation
      Department.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should handle errors when deleting department', async () => {
      const req = {
        params: {
          id: testDepartment._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Department.findByIdAndDelete to throw an error
      const originalFindByIdAndDelete = Department.findByIdAndDelete;
      Department.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await deleteDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Department.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });
});