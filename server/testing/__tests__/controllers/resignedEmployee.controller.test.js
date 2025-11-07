import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ResignedEmployee from '../../../models/resignedEmployee.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import {
  getAllResignedEmployees,
  getResignedEmployeeById,
  createResignedEmployee,
  updateResignationType,
  addPenalty,
  removePenalty,
  generateLetter,
  generateArabicDisclaimer,
  lockResignedEmployee,
  updateStatus,
  deleteResignedEmployee
} from '../../../controller/resignedEmployee.controller.js';

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

describe('Resigned Employee Controller', () => {
  let testUser;
  let testHR;
  let testResignedEmployee;
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

    // Create test users
    testUser = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'employee',
      employeeId: 'EMID-0001',
      school: testSchool._id,
      profile: {
        firstName: 'Test',
        lastName: 'User',
        arabicName: 'اختبار المستخدم',
        gender: 'male'
      },
      employment: {
        hireDate: new Date('2020-01-01'),
        employmentStatus: 'active'
      },
      isActive: true
    });
    await testUser.save();

    testHR = new User({
      username: 'testhr',
      email: 'testhr@example.com',
      password: 'password123',
      role: 'hr',
      school: testSchool._id
    });
    await testHR.save();

    // Create test resigned employee
    testResignedEmployee = new ResignedEmployee({
      employee: testUser._id,
      resignationType: 'resignation-letter',
      resignationDate: new Date('2023-01-01'),
      lastWorkingDay: new Date('2023-01-31'),
      reason: 'Personal reasons',
      processedBy: testHR._id,
      processedDate: new Date()
    });
    await testResignedEmployee.save();
  });

  describe('getAllResignedEmployees', () => {
    it('should get all resigned employees', async () => {
      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllResignedEmployees(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.resignedEmployees).toBeDefined();
      expect(Array.isArray(response.resignedEmployees)).toBe(true);
    });
  });

  describe('getResignedEmployeeById', () => {
    it('should get a resigned employee by ID', async () => {
      const req = {
        params: {
          id: testResignedEmployee._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getResignedEmployeeById(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.resignedEmployee).toBeDefined();
      expect(response.resignedEmployee._id.toString()).toBe(testResignedEmployee._id.toString());
    });

    it('should return 404 for non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getResignedEmployeeById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });

  describe('createResignedEmployee', () => {
    it('should create a resigned employee record', async () => {
      // Create another user for testing
      const newUser = new User({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'employee',
        employeeId: 'EMID-0002',
        school: testSchool._id,
        profile: {
          firstName: 'New',
          lastName: 'User'
        },
        employment: {
          hireDate: new Date('2020-01-01'),
          employmentStatus: 'active'
        },
        isActive: true
      });
      await newUser.save();

      const req = {
        body: {
          employeeId: newUser._id.toString(),
          resignationType: 'termination',
          resignationDate: new Date('2023-02-01'),
          lastWorkingDay: new Date('2023-02-28'),
          reason: 'Performance issues'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createResignedEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Resigned employee record created successfully');
      expect(response.resignedEmployee.resignationType).toBe('termination');

      // Verify employee status was updated
      const updatedUser = await User.findById(newUser._id);
      expect(updatedUser.employment.employmentStatus).toBe('resigned');
      expect(updatedUser.isActive).toBe(false);
    });

    it('should return 404 for non-existent employee', async () => {
      const req = {
        body: {
          employeeId: new mongoose.Types.ObjectId().toString(),
          resignationType: 'termination',
          resignationDate: new Date('2023-02-01'),
          lastWorkingDay: new Date('2023-02-28'),
          reason: 'Performance issues'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createResignedEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Employee not found');
    });

    it('should return 400 for already resigned employee', async () => {
      const req = {
        body: {
          employeeId: testUser._id.toString(),
          resignationType: 'termination',
          resignationDate: new Date('2023-02-01'),
          lastWorkingDay: new Date('2023-02-28'),
          reason: 'Performance issues'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createResignedEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Employee already in resigned list');
    });
  });

  describe('updateResignationType', () => {
    it('should update resignation type', async () => {
      const req = {
        params: {
          id: testResignedEmployee._id.toString()
        },
        body: {
          resignationType: 'termination'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateResignationType(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Resignation type updated successfully');
      expect(response.resignedEmployee.resignationType).toBe('termination');
    });

    it('should return 404 for non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          resignationType: 'termination'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateResignationType(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });

  describe('addPenalty', () => {
    it('should add a penalty to resigned employee', async () => {
      const req = {
        params: {
          id: testResignedEmployee._id.toString()
        },
        body: {
          description: 'Late submission',
          amount: 100,
          currency: 'EGP',
          notes: 'Submitted documents after deadline'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addPenalty(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Penalty added successfully');
      expect(response.totalPenalties).toBe(100);
      expect(response.resignedEmployee.penalties).toHaveLength(1);
    });

    it('should return 404 for non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          description: 'Late submission',
          amount: 100
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addPenalty(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });

  describe('removePenalty', () => {
    it('should remove a penalty from resigned employee', async () => {
      // First add a penalty
      testResignedEmployee.penalties.push({
        description: 'Late submission',
        amount: 100,
        currency: 'EGP',
        addedBy: testHR._id
      });
      testResignedEmployee.totalPenalties = 100;
      await testResignedEmployee.save();

      const req = {
        params: {
          id: testResignedEmployee._id.toString(),
          penaltyId: testResignedEmployee.penalties[0]._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await removePenalty(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Penalty removed successfully');
      expect(response.totalPenalties).toBe(0);
      expect(response.resignedEmployee.penalties).toHaveLength(0);
    });

    it('should return 404 for non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString(),
          penaltyId: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await removePenalty(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });

  describe('generateLetter', () => {
    it('should generate a letter for resigned employee', async () => {
      const req = {
        params: {
          id: testResignedEmployee._id.toString()
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await generateLetter(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Letter generated successfully');
      expect(response.letter).toBeDefined();
    });

    it('should return 404 for non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await generateLetter(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });

  describe('generateArabicDisclaimer', () => {
    it('should generate an Arabic disclaimer for resigned employee', async () => {
      const req = {
        params: {
          id: testResignedEmployee._id.toString()
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await generateArabicDisclaimer(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Arabic disclaimer generated successfully');
      expect(response.disclaimer).toBeDefined();
    });

    it('should return 404 for non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await generateArabicDisclaimer(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });

  describe('lockResignedEmployee', () => {
    it('should lock a resigned employee record', async () => {
      const req = {
        params: {
          id: testResignedEmployee._id.toString()
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await lockResignedEmployee(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Resigned employee record locked successfully');
      expect(response.resignedEmployee.isLocked).toBe(true);
    });

    it('should return 404 for non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await lockResignedEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });

  describe('updateStatus', () => {
    it('should update status of resigned employee', async () => {
      const req = {
        params: {
          id: testResignedEmployee._id.toString()
        },
        body: {
          status: 'processed' // Use a valid status value
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateStatus(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      // The controller doesn't actually return a success property, just a message
      expect(response.message).toBe('Status updated successfully');
      expect(response.resignedEmployee.status).toBe('processed');
    });

    it('should return 404 for non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          status: 'completed'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });

  describe('deleteResignedEmployee', () => {
    it('should delete a resigned employee record', async () => {
      const req = {
        params: {
          id: testResignedEmployee._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteResignedEmployee(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Resigned employee record deleted successfully');

      // Verify record was deleted
      const deletedRecord = await ResignedEmployee.findById(testResignedEmployee._id);
      expect(deletedRecord).toBeNull();
    });

    it('should return 404 when deleting non-existent resigned employee', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteResignedEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Resigned employee not found');
    });
  });
});