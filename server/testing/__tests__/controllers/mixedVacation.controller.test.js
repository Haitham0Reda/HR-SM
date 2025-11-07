import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MixedVacation from '../../../models/mixedVacation.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import VacationBalance from '../../../models/vacationBalance.model.js';
import Department from '../../../models/department.model.js';
import {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  testPolicyOnEmployee,
  applyToEmployee,
  applyToAll,
  getPolicyBreakdown,
  getEmployeeApplications,
  getActivePolicies,
  getUpcomingPolicies,
  cancelPolicy,
  activatePolicy
} from '../../../controller/mixedVacation.controller.js';

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

describe('Mixed Vacation Controller', () => {
  let testUser;
  let testSchool;
  let testPolicy;
  let testBalance;

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

    // Create test user with required school field
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      school: testSchool._id
    });
    await testUser.save();

    // Create vacation balance for the test user
    testBalance = new VacationBalance({
      employee: testUser._id,
      year: new Date().getFullYear(),
      annual: {
        allocated: 21,
        used: 0,
        pending: 0,
        available: 21,
        carriedOver: 0
      },
      casual: {
        allocated: 7,
        used: 0,
        pending: 0,
        available: 7
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      },
      eligibility: {
        isEligible: true,
        eligibleFrom: new Date(),
        probationEnds: new Date(),
        tenure: 1
      }
    });
    await testBalance.save();

    // Create test policy
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 10);

    testPolicy = new MixedVacation({
      name: 'Test Policy',
      description: 'Test policy description',
      startDate: startDate,
      endDate: endDate,
      totalDays: 10,
      personalDaysRequired: 5,
      createdBy: testUser._id,
      status: 'draft'
    });
    await testPolicy.save();
  });

  // Add a simple test to check if the model methods work
  describe('Model Methods Test', () => {
    it('should test findActivePolicies method', async () => {
      // Make the test policy active
      testPolicy.status = 'active';
      await testPolicy.save();
      
      // Test the model method directly
      const policies = await MixedVacation.findActivePolicies();
      expect(policies).toBeDefined();
      expect(Array.isArray(policies)).toBe(true);
    });
    
    it('should test getActivePolicies controller', async () => {
      // Make the test policy active
      testPolicy.status = 'active';
      await testPolicy.save();
      
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await getActivePolicies(req, res);
      
      console.log('Status calls:', res.status.mock.calls);
      console.log('JSON calls:', res.json.mock.calls);
      
      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  // Add a simple test to check if the controller functions work
  describe('Simple Controller Test', () => {
    it('should test getActivePolicies controller directly', async () => {
      // Make the test policy active
      testPolicy.status = 'active';
      await testPolicy.save();
      
      console.log('Test policy status:', testPolicy.status);
      
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      console.log('About to call getActivePolicies');
      await getActivePolicies(req, res);
      console.log('Called getActivePolicies');
      
      console.log('Status mock calls:', res.status.mock.calls);
      console.log('JSON mock calls:', res.json.mock.calls);
      
      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getAllPolicies', () => {
    it('should get all policies', async () => {
      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllPolicies(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.policies).toHaveLength(1);
      expect(response.policies[0].name).toBe('Test Policy');
    });
  });

  describe('getPolicyById', () => {
    it('should get a policy by ID', async () => {
      const req = {
        params: {
          id: testPolicy._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPolicyById(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.policy.name).toBe('Test Policy');
    });

    it('should return 404 for non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPolicyById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createPolicy', () => {
    it('should create a new policy', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 15);
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 10);

      const req = {
        body: {
          name: 'New Policy',
          description: 'New policy description',
          startDate: startDate,
          endDate: endDate,
          totalDays: 12,
          personalDaysRequired: 6
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createPolicy(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.policy.name).toBe('New Policy');
    });

    it('should handle validation errors when creating policy', async () => {
      const req = {
        body: {
          // Missing required fields
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createPolicy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updatePolicy', () => {
    it('should update a policy', async () => {
      const req = {
        params: {
          id: testPolicy._id.toString()
        },
        body: {
          name: 'Updated Policy Name'
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updatePolicy(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.policy.name).toBe('Updated Policy Name');
    });

    it('should return 404 for non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          name: 'Updated Policy Name'
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updatePolicy(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deletePolicy', () => {
    it('should delete a policy', async () => {
      const req = {
        params: {
          id: testPolicy._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deletePolicy(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 when deleting non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deletePolicy(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('testPolicyOnEmployee', () => {
    it('should test policy on employee', async () => {
      const req = {
        params: {
          id: testPolicy._id.toString(),
          employeeId: testUser._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await testPolicyOnEmployee(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 for non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString(),
          employeeId: testUser._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await testPolicyOnEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('applyToEmployee', () => {
    it('should apply policy to employee', async () => {
      // First activate the policy
      testPolicy.status = 'active';
      await testPolicy.save();

      const req = {
        params: {
          id: testPolicy._id.toString(),
          employeeId: testUser._id.toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await applyToEmployee(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 for non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString(),
          employeeId: testUser._id.toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await applyToEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('applyToAll', () => {
    it('should apply policy to all eligible employees', async () => {
      // First activate the policy
      testPolicy.status = 'active';
      await testPolicy.save();

      const req = {
        params: {
          id: testPolicy._id.toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await applyToAll(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 for non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await applyToAll(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getPolicyBreakdown', () => {
    it('should get policy breakdown for employee', async () => {
      const req = {
        params: {
          id: testPolicy._id.toString(),
          employeeId: testUser._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPolicyBreakdown(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 for non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString(),
          employeeId: testUser._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getPolicyBreakdown(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getEmployeeApplications', () => {
    it('should get employee applications', async () => {
      const req = {
        params: {
          employeeId: testUser._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getEmployeeApplications(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.applications).toHaveLength(0);
    });
  });

  describe('getActivePolicies', () => {
    it('should get active policies', async () => {
      // Make the test policy active
      testPolicy.status = 'active';
      await testPolicy.save();

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getActivePolicies(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getUpcomingPolicies', () => {
    it('should get upcoming policies', async () => {
      // Set policy to start in the future to make it upcoming
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      testPolicy.startDate = futureDate;
      testPolicy.status = 'active';
      await testPolicy.save();

      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUpcomingPolicies(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('cancelPolicy', () => {
    it('should cancel a policy', async () => {
      const req = {
        params: {
          id: testPolicy._id.toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await cancelPolicy(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 when cancelling non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await cancelPolicy(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('activatePolicy', () => {
    it('should activate a policy', async () => {
      const req = {
        params: {
          id: testPolicy._id.toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await activatePolicy(req, res);

      // The controller doesn't explicitly call res.status(200), it just calls res.json()
      // Express sends 200 by default when res.json() is called
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 when activating non-existent policy', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await activatePolicy(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when activating non-draft policy', async () => {
      // Make policy active first
      testPolicy.status = 'active';
      await testPolicy.save();

      const req = {
        params: {
          id: testPolicy._id.toString()
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await activatePolicy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});