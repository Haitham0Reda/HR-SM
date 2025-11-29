// Mission Model Tests
import mongoose from 'mongoose';
import { expect } from 'chai';
import Mission from '../../models/mission.model.js';
import User from '../../models/user.model.js';
import Department from '../../models/department.model.js';

describe('Mission Model', () => {
  let testEmployee, testDepartment, testApprover;

  before(async () => {
    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST-DEPT',
      description: 'Test department for mission tests'
    });

    // Create test employee
    testEmployee = await User.create({
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

  after(async () => {
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
      expect(savedMission).to.exist;
      expect(savedMission.employee.toString()).to.equal(testEmployee._id.toString());
      expect(savedMission.location).to.equal('New York');
      expect(savedMission.purpose).to.equal('Business meeting with clients');
      expect(savedMission.status).to.equal('pending');
    });

    it('should fail validation when employee is missing', async () => {
      const mission = new Mission({
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5,
        location: 'New York',
        purpose: 'Business meeting'
      });

      try {
        await mission.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.errors.employee).to.exist;
      }
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

      try {
        await mission.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.errors.endDate).to.exist;
      }
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

        expect(mission.status).to.equal('approved');
        expect(mission.approvedBy.toString()).to.equal(testApprover._id.toString());
        expect(mission.approvedAt).to.exist;
        expect(mission.approverNotes).to.equal('Approved for business trip');
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

        expect(mission.status).to.equal('rejected');
        expect(mission.rejectedBy.toString()).to.equal(testApprover._id.toString());
        expect(mission.rejectedAt).to.exist;
        expect(mission.rejectionReason).to.equal('Not enough budget for this trip');
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

        expect(mission.status).to.equal('cancelled');
        expect(mission.cancelledBy.toString()).to.equal(testEmployee._id.toString());
        expect(mission.cancelledAt).to.exist;
        expect(mission.cancellationReason).to.equal('Client cancelled the meeting');
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
        expect(missions).to.have.lengthOf(2);
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
        expect(missions).to.have.lengthOf(1);
        expect(missions[0].status).to.equal('pending');
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

        expect(hasOverlap).to.be.true;
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

        expect(hasOverlap).to.be.false;
      });
    });
  });
});
