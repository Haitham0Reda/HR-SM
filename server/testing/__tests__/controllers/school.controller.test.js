import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import School from '../../../models/school.model.js';
import User from '../../../models/user.model.js';
import {
  getAllSchools,
  createSchool,
  getSchoolById,
  getSchoolByCode,
  updateSchool,
  deleteSchool,
  getActiveSchools
} from '../../../controller/school.controller.js';

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

describe('School Controller', () => {
  let testDean;
  let testSchool;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school first
    testSchool = new School({
      schoolCode: 'BUS',
      name: 'School of Business',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test dean user with the school
    testDean = new User({
      username: 'testdean',
      email: 'testdean@example.com',
      password: 'password123',
      role: 'dean',
      school: testSchool._id,
      profile: {
        firstName: 'Test',
        lastName: 'Dean'
      }
    });
    await testDean.save();

    // Update the school with the dean
    testSchool.dean = testDean._id;
    await testSchool.save();
  });

  describe('getAllSchools', () => {
    it('should get all schools', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllSchools(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(1);
      expect(response[0].schoolCode).toBe('BUS');
    });
  });

  describe('createSchool', () => {
    it('should create a new school', async () => {
      const schoolData = {
        schoolCode: 'ENG',
        name: 'School of Engineering',
        arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر',
        dean: testDean._id
      };

      const req = {
        body: schoolData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createSchool(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.schoolCode).toBe('ENG');
      expect(response.name).toBe('School of Engineering');
    });

    it('should handle validation errors when creating school', async () => {
      const req = {
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createSchool(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getSchoolById', () => {
    it('should get a school by ID', async () => {
      const req = {
        params: {
          id: testSchool._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSchoolById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.schoolCode).toBe('BUS');
      expect(response._id.toString()).toBe(testSchool._id.toString());
    });

    it('should return 404 for non-existent school', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSchoolById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('School not found');
    });
  });

  describe('getSchoolByCode', () => {
    it('should get a school by code', async () => {
      const req = {
        params: {
          code: 'BUS'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSchoolByCode(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.schoolCode).toBe('BUS');
      expect(response.name).toBe('School of Business');
    });

    it('should return 404 for non-existent school code', async () => {
      const req = {
        params: {
          code: 'NON'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSchoolByCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('School not found');
    });
  });

  describe('updateSchool', () => {
    it('should update a school', async () => {
      const updatedData = {
        name: 'School of Engineering',
        arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
      };

      const req = {
        params: {
          id: testSchool._id.toString()
        },
        body: updatedData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateSchool(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.name).toBe('School of Engineering');
      expect(response.arabicName).toBe('المعهد الكندى العالى للهندسة بالسادس من اكتوبر');
    });

    it('should return 404 when updating non-existent school', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          name: 'School of Engineering'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateSchool(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('School not found');
    });

    it('should handle validation errors when updating school', async () => {
      const req = {
        params: {
          id: testSchool._id.toString()
        },
        body: {
          // Invalid data that would cause validation error
          schoolCode: 'INVALID' // Invalid enum value
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateSchool(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('deleteSchool', () => {
    it('should delete a school', async () => {
      const req = {
        params: {
          id: testSchool._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteSchool(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('School deleted');

      // Verify school was deleted
      const deletedSchool = await School.findById(testSchool._id);
      expect(deletedSchool).toBeNull();
    });

    it('should return 404 when deleting non-existent school', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteSchool(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('School not found');
    });
  });

  describe('getActiveSchools', () => {
    it('should get all active schools', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getActiveSchools(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
    });
  });
});