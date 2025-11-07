import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Payroll from '../../../models/payroll.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import { 
  getAllPayrolls, 
  getPayrollById, 
  createPayroll, 
  updatePayroll, 
  deletePayroll 
} from '../../../controller/payroll.controller.js';

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

describe('Payroll Controller', () => {
  let testUser;
  let testPayroll;
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

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id
    });
    await testUser.save();

    // Create test payroll
    testPayroll = new Payroll({
      employee: testUser._id,
      period: '2025-10',
      deductions: [
        {
          type: 'tax',
          arabicName: 'ضريبة',
          description: 'Income tax',
          amount: 500
        },
        {
          type: 'insurance',
          arabicName: 'تأمين',
          description: 'Health insurance',
          amount: 200
        }
      ],
      totalDeductions: 700
    });
    await testPayroll.save();
  });

  describe('getAllPayrolls', () => {
    it('should get all payrolls', async () => {
      const req = {};
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllPayrolls(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response).toHaveLength(1);
      expect(response[0].period).toBe('2025-10');
      expect(response[0].totalDeductions).toBe(700);
    });

    it('should handle errors when getting all payrolls', async () => {
      // Mock Payroll.find to throw an error
      const originalFind = Payroll.find;
      Payroll.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const req = {};
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllPayrolls(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Payroll.find = originalFind;
    });
  });

  describe('getPayrollById', () => {
    it('should get a payroll by ID', async () => {
      const req = {
        params: {
          id: testPayroll._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPayrollById(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.period).toBe('2025-10');
      expect(response.totalDeductions).toBe(700);
      expect(response.deductions).toHaveLength(2);
      expect(response.deductions[0].type).toBe('tax');
      expect(response.deductions[1].type).toBe('insurance');
    });

    it('should return 404 when payroll not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const req = {
        params: {
          id: fakeId.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPayrollById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Payroll not found');
    });

    it('should handle errors when getting payroll by ID', async () => {
      // Mock Payroll.findById to throw an error
      const originalFindById = Payroll.findById;
      Payroll.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const req = {
        params: {
          id: testPayroll._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPayrollById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Payroll.findById = originalFindById;
    });
  });

  describe('createPayroll', () => {
    it('should create a new payroll', async () => {
      const newPayrollData = {
        employee: testUser._id,
        period: '2025-11',
        deductions: [
          {
            type: 'tax',
            arabicName: 'ضريبة',
            description: 'Income tax',
            amount: 600
          }
        ],
        totalDeductions: 600
      };

      const req = {
        body: newPayrollData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createPayroll(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.period).toBe('2025-11');
      expect(response.totalDeductions).toBe(600);
      expect(response.deductions).toHaveLength(1);
      expect(response.deductions[0].type).toBe('tax');
    });

    it('should handle validation errors when creating a payroll', async () => {
      // Missing required fields
      const invalidPayrollData = {
        period: '2025-11'
        // Missing employee and totalDeductions
      };

      const req = {
        body: invalidPayrollData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createPayroll(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBeDefined();
    });
  });

  describe('updatePayroll', () => {
    it('should update an existing payroll', async () => {
      const updateData = {
        totalDeductions: 800,
        deductions: [
          ...testPayroll.deductions,
          {
            type: 'loan',
            arabicName: 'قرض',
            description: 'Personal loan',
            amount: 100
          }
        ]
      };

      const req = {
        params: {
          id: testPayroll._id.toString()
        },
        body: updateData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updatePayroll(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.totalDeductions).toBe(800);
      expect(response.deductions).toHaveLength(3);
      expect(response.deductions[2].type).toBe('loan');
    });

    it('should return 404 when updating non-existent payroll', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        totalDeductions: 800
      };

      const req = {
        params: {
          id: fakeId.toString()
        },
        body: updateData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updatePayroll(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Payroll not found');
    });

    it('should handle validation errors when updating a payroll', async () => {
      // Invalid update data that would cause validation error
      const invalidUpdateData = {
        employee: null // This should cause a validation error since employee is required
      };

      const req = {
        params: {
          id: testPayroll._id.toString()
        },
        body: invalidUpdateData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updatePayroll(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('deletePayroll', () => {
    it('should delete an existing payroll', async () => {
      const req = {
        params: {
          id: testPayroll._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deletePayroll(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Payroll deleted');

      // Verify payroll was actually deleted
      const deletedPayroll = await Payroll.findById(testPayroll._id);
      expect(deletedPayroll).toBeNull();
    });

    it('should return 404 when deleting non-existent payroll', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const req = {
        params: {
          id: fakeId.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deletePayroll(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Payroll not found');
    });

    it('should handle errors when deleting a payroll', async () => {
      // Mock Payroll.findByIdAndDelete to throw an error
      const originalFindByIdAndDelete = Payroll.findByIdAndDelete;
      Payroll.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const req = {
        params: {
          id: testPayroll._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deletePayroll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Payroll.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });
});