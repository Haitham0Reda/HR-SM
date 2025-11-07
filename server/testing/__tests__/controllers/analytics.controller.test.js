import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import Attendance from '../../../models/attendance.model.js';
import Leave from '../../../models/leave.model.js';
import Payroll from '../../../models/payroll.model.js';
import Request from '../../../models/request.model.js';
import {
  getHRDashboard,
  getAttendanceAnalytics,
  getLeaveAnalytics,
  getEmployeeAnalytics,
  getPayrollAnalytics,
  getKPIs,
  getTrendAnalysis
} from '../../../controller/analytics.controller.js';

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

describe('Analytics Controller', () => {
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
  });

  // Helper function to create test data
  const createTestData = async () => {
    const users = [];
    
    // Create multiple test users with different roles and statuses
    const user1 = new User({
      employeeId: 'EMID-1001', // Explicitly set employeeId
      username: 'employee1',
      email: 'employee1@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id,
      isActive: true,
      employment: {
        employmentStatus: 'active',
        department: 'Engineering',
        position: 'Software Engineer',
        salary: 50000
      },
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe'
      }
    });
    await user1.save();
    users.push(user1);

    const user2 = new User({
      employeeId: 'EMID-1002', // Explicitly set employeeId
      username: 'employee2',
      email: 'employee2@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id,
      isActive: true,
      employment: {
        employmentStatus: 'active',
        department: 'Marketing',
        position: 'Marketing Manager',
        salary: 60000
      },
      personalInfo: {
        firstName: 'Jane',
        lastName: 'Smith'
      }
    });
    await user2.save();
    users.push(user2);

    const user3 = new User({
      employeeId: 'EMID-1003', // Explicitly set employeeId
      username: 'inactive_user',
      email: 'inactive@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id,
      isActive: false,
      employment: {
        employmentStatus: 'terminated'
      }
    });
    await user3.save();

    // Create attendance records with required employee field
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    today.setHours(0, 0, 0, 0);

    const attendance1 = new Attendance({
      employee: user1._id,
      date: today,
      status: 'present',
      checkIn: {
        time: new Date(today.setHours(9, 0, 0))
      },
      checkOut: {
        time: new Date(today.setHours(17, 0, 0))
      }
    });
    await attendance1.save();

    const attendance2 = new Attendance({
      employee: user2._id,
      date: lastWeek,
      status: 'absent',
      note: 'Sick leave'
    });
    await attendance2.save();

    // Create leave records with valid data
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10); // Future date to pass validation
    
    const leave1 = new Leave({
      employee: user1._id,
      leaveType: 'annual',
      startDate: futureDate,
      endDate: new Date(futureDate.getTime() + 86400000), // +1 day
      duration: 1,
      status: 'approved',
      reason: 'This is a valid reason for taking annual leave that is longer than 10 characters'
    });
    await leave1.save();

    const leave2 = new Leave({
      employee: user2._id,
      leaveType: 'sick',
      startDate: futureDate,
      endDate: new Date(futureDate.getTime() + 86400000),
      duration: 1,
      status: 'pending',
      reason: 'This is a valid reason for taking sick leave that is longer than 10 characters'
    });
    await leave2.save();

    // Create payroll records with correct structure
    const payroll1 = new Payroll({
      employee: user1._id,
      period: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, // Format: YYYY-MM
      deductions: [{
        type: 'tax',
        amount: 2000,
        description: 'Income tax'
      }],
      totalDeductions: 2000
    });
    await payroll1.save();

    // Create requests with correct structure
    const request1 = new Request({
      employee: user1._id,
      type: 'permission',
      title: 'Employment Certificate',
      description: 'Need employment certificate for bank',
      status: 'pending'
    });
    await request1.save();

    const request2 = new Request({
      employee: user2._id,
      type: 'permission',
      title: 'Emergency Leave',
      description: 'Family emergency',
      status: 'approved'
    });
    await request2.save();

    return { users, today, lastWeek };
  };

  describe('getHRDashboard', () => {
    it('should return comprehensive HR dashboard data', async () => {
      await createTestData();

      const req = {
        query: {
          period: 'month', // Add query parameters
          department: 'Engineering'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getHRDashboard(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.dashboard).toBeDefined();
      
      // Verify dashboard structure (matching actual controller response)
      expect(response.dashboard.employees).toBeDefined();
      expect(response.dashboard.attendance).toBeDefined();
      expect(response.dashboard.leaves).toBeDefined();
      expect(response.dashboard.pendingRequests).toBeDefined();
    });

    it('should handle empty database gracefully', async () => {
      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getHRDashboard(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.dashboard.employees.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAttendanceAnalytics', () => {
    it('should return detailed attendance analytics', async () => {
      await createTestData();

      const req = {
        query: {
          startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
          endDate: new Date().toISOString(),
          department: 'Engineering'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAttendanceAnalytics(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.analytics).toBeDefined();
      expect(response.analytics.dailyTrend).toBeDefined();
      expect(response.analytics.statusDistribution).toBeDefined();
      expect(response.analytics.averageTimes).toBeDefined();
    });

    it('should handle date range filters correctly', async () => {
      // Create a user with explicit employeeId to avoid conflicts
      const user = new User({
        employeeId: 'EMID-2002', // Explicitly set employeeId
        username: 'attendance_user',
        email: 'attendance@example.com',
        password: 'password123',
        role: 'employee',
        school: testSchool._id,
        isActive: true
      });
      await user.save();

      const req = {
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAttendanceAnalytics(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getLeaveAnalytics', () => {
    it('should return comprehensive leave analytics', async () => {
      await createTestData();

      const req = {
        query: {
          year: new Date().getFullYear(),
          type: 'annual'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getLeaveAnalytics(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.analytics).toBeDefined();
      expect(response.analytics.byType).toBeDefined();
      expect(response.analytics.monthlyTrend).toBeDefined();
      expect(response.analytics.byDepartment).toBeDefined();
    });
  });

  describe('getEmployeeAnalytics', () => {
    it('should return detailed employee analytics', async () => {
      await createTestData();

      const req = {
        query: {
          groupBy: 'department'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getEmployeeAnalytics(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.analytics).toBeDefined();
      expect(response.analytics.byDepartment).toBeDefined();
      expect(response.analytics.byRole).toBeDefined();
      expect(response.analytics.byStatus).toBeDefined();
      expect(response.analytics.ageDistribution).toBeDefined();
    });
  });

  describe('getPayrollAnalytics', () => {
    it('should return payroll analytics with financial insights', async () => {
      await createTestData();

      const req = {
        query: {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPayrollAnalytics(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.analytics).toBeDefined();
      expect(response.analytics.monthlyPayroll).toBeDefined();
      expect(response.analytics.departmentPayroll).toBeDefined();
    });
  });

  describe('getKPIs', () => {
    it('should return all key performance indicators', async () => {
      await createTestData();

      const req = {
        query: {}
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getKPIs(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.kpis).toBeDefined();
      
      // Verify KPI structure (matching actual controller response)
      expect(response.kpis.turnoverRate).toBeDefined();
      expect(response.kpis.attendanceRate).toBeDefined();
      expect(response.kpis.leaveUtilization).toBeDefined();
      expect(response.kpis.avgTimeToHire).toBeDefined();
      expect(response.kpis.totalEmployees).toBeDefined();
      expect(response.kpis.period).toBeDefined();
    });

    it('should calculate KPIs correctly', async () => {
      await createTestData();

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getKPIs(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      
      // Basic validation of KPI values
      expect(typeof response.kpis.attendanceRate).toBe('string'); // It's.toFixed(2) so it's a string
      const attendanceRate = parseFloat(response.kpis.attendanceRate);
      expect(attendanceRate).toBeGreaterThanOrEqual(0);
      expect(attendanceRate).toBeLessThanOrEqual(100);
    });
  });

  describe('getTrendAnalysis', () => {
    it('should return attendance trend analysis', async () => {
      await createTestData();

      const req = {
        query: {
          metric: 'attendance',
          period: 'month'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getTrendAnalysis(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(Array.isArray(response.trend)).toBe(true);
      expect(response.metric).toBe('attendance');
    });

    it('should return employees trend analysis', async () => {
      // Create a user with explicit employeeId to avoid conflicts
      const user = new User({
        employeeId: 'EMID-2001', // Explicitly set employeeId
        username: 'trend_user',
        email: 'trend@example.com',
        password: 'password123',
        role: 'employee',
        school: testSchool._id,
        isActive: true
      });
      await user.save();

      const req = {
        query: {
          metric: 'employees',
          period: 'quarter'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getTrendAnalysis(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });

    it('should return error for invalid metric', async () => {
      const req = {
        query: {
          metric: 'invalid_metric'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getTrendAnalysis(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Invalid metric');
    });

    it('should handle missing metric parameter', async () => {
      const req = {
        query: {}
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getTrendAnalysis(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Invalid metric');
    });
  });

  // Error handling tests
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(User, 'countDocuments').mockRejectedValueOnce(new Error('Database error'));

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getHRDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      User.countDocuments.mockRestore();
    });
  });

  // Performance tests
  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const timestamp = Date.now();
      // Create larger dataset for performance testing
      const userPromises = [];
      for (let i = 0; i < 100; i++) {
        const user = new User({
          employeeId: `EMID-PERF-${timestamp}-${i}`, // Use timestamp and index to ensure uniqueness
          username: `perf_user${i}_${timestamp}`, // Add timestamp to ensure uniqueness
          email: `perf_user${i}_${timestamp}@example.com`,
          password: 'password123',
          role: 'employee',
          school: testSchool._id,
          isActive: true,
          employment: {
            employmentStatus: 'active',
            department: i % 2 === 0 ? 'Engineering' : 'Marketing'
          }
        });
        userPromises.push(user.save());
      }
      await Promise.all(userPromises);

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const startTime = Date.now();
      await getHRDashboard(req, res);
      const endTime = Date.now();

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});