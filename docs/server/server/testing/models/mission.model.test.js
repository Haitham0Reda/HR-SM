// Mission Model Tests
import mongoose from 'mongoose';
import Mission from '../../modules/hr-core/missions/models/mission.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';

describe('Mission Model', () => {
  let testEmployee, testDepartment, testApprover;

  beforeAll(async () => {
    // Create test department
    testDepartment = await Department.create({
      tenantId: 'test_tenant_123',
      name: 'Test Department',
      code: 'TEST-DEPT',
      description: 'Test department for mission tests'
    });

    // Create test employee
    testEmployee = await User.create({
      tenantId: 'test_tenant_123',
      username: 'testemployee',
      email: 'testemployee@test.com',
      password: 'Test123!@#',
      role: 'employee',
      department: testDepartment._id,
      personalInfo: {
        firstName: 'Test',
        lastName: 'Employee'
      }
    });

    // Create test approver
    testApprover = await User.create({
      tenantId: 'test_tenant_123',
      username: 'testapprover',
      email: 'testapprover@test.com',
      password: 'Test123!@#',
      role: 'supervisor',
      department: testDepartment._id,
      personalInfo: {
        firstName: 'Test',
        lastName: 'Approver'
      }
    });
  });

  afterAll(async () => {
    await Mission.deleteMany({});
    await User.deleteMany({});
    await Department.deleteMany({});
  });

  afterEach(async () => {
    await Mission.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid mission with required fields', async () => {
      const mission = new Mission({
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5,
        location: 'New York',
        purpose: 'Business meeting with clients',
        department: testDepartment._id
      });

      const savedMission = await mission.save();
      expect(savedMission).toBeDefined();
      expect(savedMission.employee.toString()).toBe(testEmployee._id.toString());
      expect(savedMission.location).toBe('New York');
      expect(savedMission.purpose).toBe('Business meeting with clients');
      expect(savedMission.status).toBe('pending');
    });

    it('should fail validation when employee is missing', async () => {
      const mission = new Mission({
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5,
        location: 'New York',
        purpose: 'Business meeting'
      });

      await expect(mission.save()).rejects.toThrow();
    });

    it('should fail validation when end date is before start date', async () => {
      const mission = new Mission({
        employee: testEmployee._id,
        startDate: new Date('2025-12-05'),
        endDate: new Date('2025-12-01'),
        duration: 5,
        location: 'New York',
        purpose: 'Business meeting'
      });

      await expect(mission.save()).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    describe('approve()', () => {
      it('should approve a mission', async () => {
        const mission = await Mission.create({
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          location: 'New York',
          purpose: 'Business meeting',
          department: testDepartment._id
        });

        await mission.approve(testApprover._id, 'Approved for business trip');

        expect(mission.status).toBe('approved');
        expect(mission.approvedBy.toString()).toBe(testApprover._id.toString());
        expect(mission.approvedAt).toBeDefined();
        expect(mission.approverNotes).toBe('Approved for business trip');
      });
    });

    describe('reject()', () => {
      it('should reject a mission with reason', async () => {
        const mission = await Mission.create({
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          location: 'New York',
          purpose: 'Business meeting',
          department: testDepartment._id
        });

        await mission.reject(testApprover._id, 'Not enough budget for this trip');

        expect(mission.status).toBe('rejected');
        expect(mission.rejectedBy.toString()).toBe(testApprover._id.toString());
        expect(mission.rejectedAt).toBeDefined();
        expect(mission.rejectionReason).toBe('Not enough budget for this trip');
      });
    });

    describe('cancel()', () => {
      it('should cancel a mission with reason', async () => {
        const mission = await Mission.create({
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          location: 'New York',
          purpose: 'Business meeting',
          department: testDepartment._id,
          status: 'approved'
        });

        await mission.cancel(testEmployee._id, 'Client cancelled the meeting');

        expect(mission.status).toBe('cancelled');
        expect(mission.cancelledBy.toString()).toBe(testEmployee._id.toString());
        expect(mission.cancelledAt).toBeDefined();
        expect(mission.cancellationReason).toBe('Client cancelled the meeting');
      });
    });
  });

  describe('Static Methods', () => {
    describe('getMissionsByEmployee()', () => {
      it('should get all missions for an employee', async () => {
        await Mission.create([
          {
            employee: testEmployee._id,
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-05'),
            duration: 5,
            location: 'New York',
            purpose: 'Business meeting 1',
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            startDate: new Date('2025-11-01'),
            endDate: new Date('2025-11-03'),
            duration: 3,
            location: 'Boston',
            purpose: 'Business meeting 2',
            department: testDepartment._id
          }
        ]);

        const missions = await Mission.getMissionsByEmployee(testEmployee._id);
        expect(missions).toHaveLength(2);
      });
    });

    describe('getPendingMissions()', () => {
      it('should get all pending missions', async () => {
        await Mission.create([
          {
            employee: testEmployee._id,
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-05'),
            duration: 5,
            location: 'New York',
            purpose: 'Business meeting 1',
            department: testDepartment._id,
            status: 'pending'
          },
          {
            employee: testEmployee._id,
            startDate: new Date('2025-11-01'),
            endDate: new Date('2025-11-03'),
            duration: 3,
            location: 'Boston',
            purpose: 'Business meeting 2',
            department: testDepartment._id,
            status: 'approved'
          }
        ]);

        const missions = await Mission.getPendingMissions();
        expect(missions).toHaveLength(1);
        expect(missions[0].status).toBe('pending');
      });
    });

    describe('hasOverlappingMission()', () => {
      it('should detect overlapping missions', async () => {
        await Mission.create({
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          location: 'New York',
          purpose: 'Business meeting',
          department: testDepartment._id,
          status: 'approved'
        });

        const hasOverlap = await Mission.hasOverlappingMission(
          testEmployee._id,
          new Date('2025-12-03'),
          new Date('2025-12-07')
        );

        expect(hasOverlap).toBe(true);
      });

      it('should not detect overlap for non-overlapping dates', async () => {
        await Mission.create({
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          location: 'New York',
          purpose: 'Business meeting',
          department: testDepartment._id,
          status: 'approved'
        });

        const hasOverlap = await Mission.hasOverlappingMission(
          testEmployee._id,
          new Date('2025-12-10'),
          new Date('2025-12-15')
        );

        expect(hasOverlap).toBe(false);
      });
    });
  });
});
