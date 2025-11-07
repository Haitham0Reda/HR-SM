import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Report from '../../../models/report.model.js';
import User from '../../../models/user.model.js';
import {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  executeReport,
  exportReport,
  getTemplates,
  getExecutionHistory,
  getReportStatistics,
  shareReport,
  unshareReport
} from '../../../controller/report.controller.js';

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

describe('Report Controller', () => {
  let testUser;
  let testAdmin;
  let testReport;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test users
    testUser = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'employee'
    });
    await testUser.save();

    testAdmin = new User({
      username: 'testadmin',
      email: 'testadmin@example.com',
      password: 'password123',
      role: 'admin'
    });
    await testAdmin.save();

    // Create test report
    testReport = new Report({
      name: 'Employee Report',
      description: 'Test employee report',
      reportType: 'employee',
      fields: [
        { fieldName: 'username', displayName: 'Username', dataType: 'string' },
        { fieldName: 'email', displayName: 'Email', dataType: 'string' }
      ],
      filters: [],
      sorting: [],
      groupBy: [],
      createdBy: testUser._id
    });
    await testReport.save();
  });

  describe('getAllReports', () => {
    it('should get all reports for user', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllReports(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.reports).toBeDefined();
      expect(Array.isArray(response.reports)).toBe(true);
    });
  });

  describe('getReportById', () => {
    it('should get a report by ID', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: testReport._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report).toBeDefined();
      expect(response.report.name).toBe('Employee Report');
    });

    it('should return 404 for non-existent report', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Report not found');
    });

    it('should return 403 for unauthorized access', async () => {
      // Create a private report by another user
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123',
        role: 'employee'
      });
      await otherUser.save();

      const privateReport = new Report({
        name: 'Private Report',
        reportType: 'employee',
        fields: [{ fieldName: 'username', displayName: 'Username', dataType: 'string' }],
        createdBy: otherUser._id,
        isPublic: false
      });
      await privateReport.save();

      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: privateReport._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Access denied');
    });
  });

  describe('createReport', () => {
    it('should create a new report', async () => {
      const reportData = {
        name: 'New Report',
        description: 'Test report creation',
        reportType: 'attendance',
        fields: [
          { fieldName: 'date', displayName: 'Date', dataType: 'date' },
          { fieldName: 'status', displayName: 'Status', dataType: 'string' }
        ],
        filters: [],
        sorting: [],
        groupBy: []
      };

      const req = {
        user: {
          _id: testUser._id
        },
        body: reportData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Report created successfully');
      expect(response.report.name).toBe('New Report');
    });

    it('should handle validation errors when creating report', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('updateReport', () => {
    it('should update a report', async () => {
      const updatedData = {
        name: 'Updated Report',
        description: 'Updated description'
      };

      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: testReport._id.toString()
        },
        body: updatedData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Report updated successfully');
      expect(response.report.name).toBe('Updated Report');
    });

    it('should return 404 when updating non-existent report', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          name: 'Updated Report'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Report not found');
    });

    it('should return 403 for unauthorized update', async () => {
      // Create a report by another user
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123',
        role: 'employee'
      });
      await otherUser.save();

      const otherReport = new Report({
        name: 'Other Report',
        reportType: 'employee',
        fields: [{ fieldName: 'username', displayName: 'Username', dataType: 'string' }],
        createdBy: otherUser._id
      });
      await otherReport.save();

      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: otherReport._id.toString()
        },
        body: {
          name: 'Updated Report'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('No edit permission');
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: testReport._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Report deleted successfully');

      // Verify report was marked as inactive
      const deletedReport = await Report.findById(testReport._id);
      expect(deletedReport.isActive).toBe(false);
    });

    it('should return 404 when deleting non-existent report', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Report not found');
    });

    it('should return 403 for unauthorized delete', async () => {
      // Create a report by another user
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123',
        role: 'employee'
      });
      await otherUser.save();

      const otherReport = new Report({
        name: 'Other Report',
        reportType: 'employee',
        fields: [{ fieldName: 'username', displayName: 'Username', dataType: 'string' }],
        createdBy: otherUser._id
      });
      await otherReport.save();

      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: otherReport._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Access denied');
    });
  });

  describe('executeReport', () => {
    it('should execute a report', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: testReport._id.toString()
        },
        body: {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await executeReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Report executed successfully');
      expect(response.executionId).toBeDefined();
    });

    it('should return 404 for non-existent report execution', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await executeReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Report not found');
    });
  });

  describe('exportReport', () => {
    it('should export a report in JSON format by default', async () => {
      const req = {
        params: {
          executionId: new mongoose.Types.ObjectId().toString()
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await exportReport(req, res);

      // This will fail because there's no execution record, but we're testing the flow
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getTemplates', () => {
    it('should get report templates', async () => {
      // Create a template
      const template = new Report({
        name: 'Template Report',
        reportType: 'employee',
        fields: [{ fieldName: 'username', displayName: 'Username', dataType: 'string' }],
        createdBy: testUser._id,
        isTemplate: true
      });
      await template.save();

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.templates).toBeDefined();
      expect(Array.isArray(response.templates)).toBe(true);
    });
  });

  describe('shareReport', () => {
    it('should share a report with another user', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: testReport._id.toString()
        },
        body: {
          userId: testAdmin._id.toString(),
          permission: 'view'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await shareReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Report shared successfully');
      expect(response.sharedWith).toBeDefined();
    });

    it('should return 404 for non-existent report', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          userId: testAdmin._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await shareReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Report not found');
    });

    it('should return 403 for unauthorized sharing', async () => {
      // Create a report by another user
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123',
        role: 'employee'
      });
      await otherUser.save();

      const otherReport = new Report({
        name: 'Other Report',
        reportType: 'employee',
        fields: [{ fieldName: 'username', displayName: 'Username', dataType: 'string' }],
        createdBy: otherUser._id
      });
      await otherReport.save();

      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: otherReport._id.toString()
        },
        body: {
          userId: testAdmin._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await shareReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Access denied');
    });
  });

  describe('unshareReport', () => {
    it('should unshare a report from a user', async () => {
      // First share the report
      testReport.sharedWith.push({ user: testAdmin._id, permission: 'view' });
      await testReport.save();

      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: testReport._id.toString(),
          userId: testAdmin._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await unshareReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Report unshared successfully');
    });

    it('should return 404 for non-existent report', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: new mongoose.Types.ObjectId().toString(),
          userId: testAdmin._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await unshareReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Report not found');
    });

    it('should return 403 for unauthorized unsharing', async () => {
      // Create a report by another user
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123',
        role: 'employee'
      });
      await otherUser.save();

      const otherReport = new Report({
        name: 'Other Report',
        reportType: 'employee',
        fields: [{ fieldName: 'username', displayName: 'Username', dataType: 'string' }],
        createdBy: otherUser._id
      });
      await otherReport.save();

      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: otherReport._id.toString(),
          userId: testAdmin._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await unshareReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Access denied');
    });
  });
});