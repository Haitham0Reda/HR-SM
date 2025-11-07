import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Attendance from '../../../models/attendance.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import { 
  getAllAttendance, 
  getAttendanceById, 
  createAttendance, 
  updateAttendance, 
  deleteAttendance 
} from '../../../controller/attendance.controller.js';

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

describe('Attendance Controller', () => {
  let testUser;
  let testAttendance;
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

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id
    });
    await testUser.save();

    // Create test attendance
    testAttendance = new Attendance({
      employee: testUser._id,
      date: new Date(),
      status: 'present',
      checkIn: {
        time: new Date(),
        method: 'manual',
        location: 'office'
      },
      checkOut: {
        time: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours later
        method: 'manual',
        location: 'office'
      }
    });
    await testAttendance.save();
  });

  describe('getAllAttendance', () => {
    it('should get all attendance records', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.find to return our test data
      const originalFind = Attendance.find;
      Attendance.find = jest.fn().mockResolvedValue([testAttendance]);

      await getAllAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Attendance.find = originalFind;
    });

    it('should handle errors when getting all attendance records', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.find to throw an error
      const originalFind = Attendance.find;
      Attendance.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getAllAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Attendance.find = originalFind;
    });
  });

  describe('getAttendanceById', () => {
    it('should get an attendance record by ID', async () => {
      const req = {
        params: {
          id: testAttendance._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findById to return our test data
      const originalFindById = Attendance.findById;
      Attendance.findById = jest.fn().mockResolvedValue(testAttendance);

      await getAttendanceById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Attendance.findById = originalFindById;
    });

    it('should return 404 when attendance record not found', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findById to return null
      const originalFindById = Attendance.findById;
      Attendance.findById = jest.fn().mockResolvedValue(null);

      await getAttendanceById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Attendance not found');

      // Restore original implementation
      Attendance.findById = originalFindById;
    });

    it('should handle errors when getting attendance by ID', async () => {
      const req = {
        params: {
          id: testAttendance._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findById to throw an error
      const originalFindById = Attendance.findById;
      Attendance.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getAttendanceById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Attendance.findById = originalFindById;
    });
  });

  describe('createAttendance', () => {
    it('should create a new attendance record', async () => {
      const attendanceData = {
        employee: testUser._id,
        date: new Date(),
        status: 'present'
      };

      const req = {
        body: attendanceData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock new attendance save
      const newAttendance = new Attendance(attendanceData);
      newAttendance._id = new mongoose.Types.ObjectId();
      
      const originalSave = newAttendance.save;
      newAttendance.save = jest.fn().mockResolvedValue(newAttendance);

      // Mock Attendance constructor
      const originalAttendanceConstructor = Attendance;
      jest.spyOn(global, 'Attendance').mockImplementation((data) => {
        const attendance = new originalAttendanceConstructor(data);
        attendance._id = newAttendance._id;
        attendance.save = newAttendance.save;
        return attendance;
      });

      await createAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementations
      global.Attendance = originalAttendanceConstructor;
    });

    it('should handle validation errors when creating attendance', async () => {
      const req = {
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('updateAttendance', () => {
    it('should update an attendance record', async () => {
      const updateData = {
        status: 'late'
      };

      const req = {
        params: {
          id: testAttendance._id.toString()
        },
        body: updateData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findByIdAndUpdate to return updated data
      const originalFindByIdAndUpdate = Attendance.findByIdAndUpdate;
      Attendance.findByIdAndUpdate = jest.fn().mockResolvedValue({
        ...testAttendance.toObject(),
        ...updateData
      });

      await updateAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Attendance.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should return 404 when updating non-existent attendance record', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          status: 'late'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findByIdAndUpdate to return null
      const originalFindByIdAndUpdate = Attendance.findByIdAndUpdate;
      Attendance.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await updateAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Attendance not found');

      // Restore original implementation
      Attendance.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should handle validation errors when updating attendance', async () => {
      const req = {
        params: {
          id: testAttendance._id.toString()
        },
        body: {
          // Invalid data that would cause validation error
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findByIdAndUpdate to throw an error
      const originalFindByIdAndUpdate = Attendance.findByIdAndUpdate;
      Attendance.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });

      await updateAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Attendance.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('deleteAttendance', () => {
    it('should delete an attendance record', async () => {
      const req = {
        params: {
          id: testAttendance._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findByIdAndDelete to return our test data
      const originalFindByIdAndDelete = Attendance.findByIdAndDelete;
      Attendance.findByIdAndDelete = jest.fn().mockResolvedValue(testAttendance);

      await deleteAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Attendance.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should return 404 when deleting non-existent attendance record', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findByIdAndDelete to return null
      const originalFindByIdAndDelete = Attendance.findByIdAndDelete;
      Attendance.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      await deleteAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Attendance not found');

      // Restore original implementation
      Attendance.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should handle errors when deleting attendance', async () => {
      const req = {
        params: {
          id: testAttendance._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Attendance.findByIdAndDelete to throw an error
      const originalFindByIdAndDelete = Attendance.findByIdAndDelete;
      Attendance.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await deleteAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Attendance.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });
});