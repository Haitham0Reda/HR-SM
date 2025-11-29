// Overtime Model Tests
import Overtime from '../../models/overtime.model.js';
import User from '../../models/user.model.js';
import Department from '../../models/department.model.js';

describe('Overtime Model', () => {
  let testEmployee, testDepartment, testApprover;

  beforeAll(async () => {
    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST-DEPT',
      description: 'Test department for overtime tests'
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

  afterEach(async () => {
    await Overtime.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid overtime with required fields', async () => {
      const overtime = new Overtime({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '21:00',
        duration: 3,
        reason: 'Project deadline',
        compensationType: 'paid',
        department: testDepartment._id
      });

      const savedOvertime = await overtime.save();
      expect(savedOvertime).toBeDefined();
      expect(savedOvertime.employee.toString()).toBe(testEmployee._id.toString());
      expect(savedOvertime.startTime).toBe('18:00');
      expect(savedOvertime.endTime).toBe('21:00');
      expect(savedOvertime.duration).toBe(3);
      expect(savedOvertime.compensationType).toBe('paid');
      expect(savedOvertime.status).toBe('pending');
      expect(savedOvertime.compensated).toBe(false);
    });

    it('should fail validation when employee is missing', async () => {
      const overtime = new Overtime({
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '21:00',
        duration: 3,
        reason: 'Project deadline',
        compensationType: 'paid'
      });

      let err;
      try {
        await overtime.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.employee).toBeDefined();
    });

    it('should fail validation when compensation type is invalid', async () => {
      const overtime = new Overtime({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '21:00',
        duration: 3,
        reason: 'Project deadline',
        compensationType: 'invalid-type'
      });

      let err;
      try {
        await overtime.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.compensationType).toBeDefined();
    });

    it('should accept valid compensation types', async () => {
      const paidOvertime = await Overtime.create({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '21:00',
        duration: 3,
        reason: 'Project deadline',
        compensationType: 'paid',
        department: testDepartment._id
      });

      const timeOffOvertime = await Overtime.create({
        employee: testEmployee._id,
        date: new Date('2025-11-21'),
        startTime: '18:00',
        endTime: '20:00',
        duration: 2,
        reason: 'Emergency fix',
        compensationType: 'time-off',
        department: testDepartment._id
      });

      const noneOvertime = await Overtime.create({
        employee: testEmployee._id,
        date: new Date('2025-11-22'),
        startTime: '18:00',
        endTime: '19:00',
        duration: 1,
        reason: 'Voluntary work',
        compensationType: 'none',
        department: testDepartment._id
      });

      expect(paidOvertime.compensationType).toBe('paid');
      expect(timeOffOvertime.compensationType).toBe('time-off');
      expect(noneOvertime.compensationType).toBe('none');
    });

    it('should fail validation when reason exceeds max length', async () => {
      const longReason = 'a'.repeat(301);
      const overtime = new Overtime({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '21:00',
        duration: 3,
        reason: longReason,
        compensationType: 'paid'
      });

      let err;
      try {
        await overtime.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.reason).toBeDefined();
    });
  });

  describe('Time Range Validation', () => {
    it('should accept valid time formats', async () => {
      const overtime = await Overtime.create({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '21:30',
        duration: 3.5,
        reason: 'Project deadline',
        compensationType: 'paid',
        department: testDepartment._id
      });

      expect(overtime.startTime).toBe('18:00');
      expect(overtime.endTime).toBe('21:30');
    });

    it('should reject invalid time formats for start time', async () => {
      const invalidTimes = ['9:30', '24:00', '12:60', '25:30', 'invalid'];

      for (const time of invalidTimes) {
        const overtime = new Overtime({
          employee: testEmployee._id,
          date: new Date('2025-11-20'),
          startTime: time,
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid'
        });

        let err;
        try {
          await overtime.save();
        } catch (error) {
          err = error;
        }

        expect(err).toBeDefined();
        expect(err.name).toBe('ValidationError');
        expect(err.errors.startTime).toBeDefined();
      }
    });

    it('should reject invalid time formats for end time', async () => {
      const invalidTimes = ['9:30', '24:00', '12:60', '25:30', 'invalid'];

      for (const time of invalidTimes) {
        const overtime = new Overtime({
          employee: testEmployee._id,
          date: new Date('2025-11-20'),
          startTime: '18:00',
          endTime: time,
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid'
        });

        let err;
        try {
          await overtime.save();
        } catch (error) {
          err = error;
        }

        expect(err).toBeDefined();
        expect(err.name).toBe('ValidationError');
        expect(err.errors.endTime).toBeDefined();
      }
    });

    it('should fail when end time is before start time', async () => {
      const overtime = new Overtime({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '21:00',
        endTime: '18:00',
        duration: 3,
        reason: 'Project deadline',
        compensationType: 'paid'
      });

      let err;
      try {
        await overtime.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain('End time must be after start time');
    });

    it('should fail when end time equals start time', async () => {
      const overtime = new Overtime({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '18:00',
        duration: 0,
        reason: 'Project deadline',
        compensationType: 'paid'
      });

      let err;
      try {
        await overtime.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.message).toContain('End time must be after start time');
    });
  });

  describe('Duration Calculation', () => {
    it('should store duration in hours', async () => {
      const overtime = await Overtime.create({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '21:00',
        duration: 3,
        reason: 'Project deadline',
        compensationType: 'paid',
        department: testDepartment._id
      });

      expect(overtime.duration).toBe(3);
    });

    it('should handle fractional hours', async () => {
      const overtime = await Overtime.create({
        employee: testEmployee._id,
        date: new Date('2025-11-20'),
        startTime: '18:00',
        endTime: '20:30',
        duration: 2.5,
        reason: 'Project deadline',
        compensationType: 'paid',
        department: testDepartment._id
      });

      expect(overtime.duration).toBe(2.5);
    });
  });

  describe('Instance Methods', () => {
    describe('approve()', () => {
      it('should approve overtime', async () => {
        const overtime = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-20'),
          startTime: '18:00',
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid',
          department: testDepartment._id
        });

        await overtime.approve(testApprover._id, 'Approved for critical project');

        expect(overtime.status).toBe('approved');
        expect(overtime.approvedBy.toString()).toBe(testApprover._id.toString());
        expect(overtime.approvedAt).toBeDefined();
        expect(overtime.approverNotes).toBe('Approved for critical project');
      });

      it('should approve without notes', async () => {
        const overtime = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-20'),
          startTime: '18:00',
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid',
          department: testDepartment._id
        });

        await overtime.approve(testApprover._id);

        expect(overtime.status).toBe('approved');
        expect(overtime.approvedBy.toString()).toBe(testApprover._id.toString());
        expect(overtime.approvedAt).toBeDefined();
        expect(overtime.approverNotes).toBeUndefined();
      });
    });

    describe('reject()', () => {
      it('should reject overtime with reason', async () => {
        const overtime = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-20'),
          startTime: '18:00',
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid',
          department: testDepartment._id
        });

        await overtime.reject(testApprover._id, 'Not pre-approved');

        expect(overtime.status).toBe('rejected');
        expect(overtime.rejectedBy.toString()).toBe(testApprover._id.toString());
        expect(overtime.rejectedAt).toBeDefined();
        expect(overtime.rejectionReason).toBe('Not pre-approved');
      });

      it('should reject without reason', async () => {
        const overtime = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-20'),
          startTime: '18:00',
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid',
          department: testDepartment._id
        });

        await overtime.reject(testApprover._id);

        expect(overtime.status).toBe('rejected');
        expect(overtime.rejectedBy.toString()).toBe(testApprover._id.toString());
        expect(overtime.rejectedAt).toBeDefined();
        expect(overtime.rejectionReason).toBe('');
      });
    });

    describe('markCompensated()', () => {
      it('should mark overtime as compensated', async () => {
        const overtime = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-20'),
          startTime: '18:00',
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid',
          department: testDepartment._id,
          status: 'approved'
        });

        await overtime.markCompensated();

        expect(overtime.compensated).toBe(true);
        expect(overtime.compensatedAt).toBeDefined();
      });
    });
  });

  describe('Static Methods', () => {
    describe('getOvertimeByEmployee()', () => {
      it('should get all overtime for an employee', async () => {
        await Overtime.create([
          {
            employee: testEmployee._id,
            date: new Date('2025-11-20'),
            startTime: '18:00',
            endTime: '21:00',
            duration: 3,
            reason: 'Project deadline',
            compensationType: 'paid',
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            date: new Date('2025-11-21'),
            startTime: '18:00',
            endTime: '20:00',
            duration: 2,
            reason: 'Emergency fix',
            compensationType: 'time-off',
            department: testDepartment._id
          }
        ]);

        const overtimeRecords = await Overtime.getOvertimeByEmployee(testEmployee._id);
        expect(overtimeRecords).toHaveLength(2);
      });

      it('should filter overtime by status', async () => {
        const overtime1 = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-20'),
          startTime: '18:00',
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid',
          department: testDepartment._id
        });

        await overtime1.approve(testApprover._id);

        await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-21'),
          startTime: '18:00',
          endTime: '20:00',
          duration: 2,
          reason: 'Emergency fix',
          compensationType: 'time-off',
          department: testDepartment._id,
          status: 'pending'
        });

        const approvedOvertime = await Overtime.getOvertimeByEmployee(
          testEmployee._id,
          { status: 'approved' }
        );
        expect(approvedOvertime).toHaveLength(1);
        expect(approvedOvertime[0].status).toBe('approved');
      });
    });

    describe('getPendingOvertime()', () => {
      it('should get all pending overtime', async () => {
        await Overtime.create([
          {
            employee: testEmployee._id,
            date: new Date('2025-11-20'),
            startTime: '18:00',
            endTime: '21:00',
            duration: 3,
            reason: 'Project deadline',
            compensationType: 'paid',
            department: testDepartment._id,
            status: 'pending'
          },
          {
            employee: testEmployee._id,
            date: new Date('2025-11-21'),
            startTime: '18:00',
            endTime: '20:00',
            duration: 2,
            reason: 'Emergency fix',
            compensationType: 'time-off',
            department: testDepartment._id,
            status: 'approved'
          }
        ]);

        const pendingOvertime = await Overtime.getPendingOvertime();
        expect(pendingOvertime).toHaveLength(1);
        expect(pendingOvertime[0].status).toBe('pending');
      });

      it('should filter pending overtime by department', async () => {
        const otherDepartment = await Department.create({
          name: 'Other Department',
          code: 'OTHER-DEPT',
          description: 'Another test department'
        });

        await Overtime.create([
          {
            employee: testEmployee._id,
            date: new Date('2025-11-20'),
            startTime: '18:00',
            endTime: '21:00',
            duration: 3,
            reason: 'Project deadline',
            compensationType: 'paid',
            department: testDepartment._id,
            status: 'pending'
          },
          {
            employee: testEmployee._id,
            date: new Date('2025-11-21'),
            startTime: '18:00',
            endTime: '20:00',
            duration: 2,
            reason: 'Emergency fix',
            compensationType: 'time-off',
            department: otherDepartment._id,
            status: 'pending'
          }
        ]);

        const pendingOvertime = await Overtime.getPendingOvertime(testDepartment._id);
        expect(pendingOvertime).toHaveLength(1);
        expect(pendingOvertime[0].reason).toBe('Project deadline');
      });
    });

    describe('getOvertimeByDateRange()', () => {
      it('should get overtime within date range', async () => {
        await Overtime.create([
          {
            employee: testEmployee._id,
            date: new Date('2025-11-01'),
            startTime: '18:00',
            endTime: '21:00',
            duration: 3,
            reason: 'Project deadline',
            compensationType: 'paid',
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            date: new Date('2025-11-15'),
            startTime: '18:00',
            endTime: '20:00',
            duration: 2,
            reason: 'Emergency fix',
            compensationType: 'time-off',
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            date: new Date('2025-11-25'),
            startTime: '18:00',
            endTime: '19:00',
            duration: 1,
            reason: 'Maintenance',
            compensationType: 'none',
            department: testDepartment._id
          }
        ]);

        const overtimeRecords = await Overtime.getOvertimeByDateRange(
          testEmployee._id,
          new Date('2025-11-01'),
          new Date('2025-11-20')
        );

        expect(overtimeRecords).toHaveLength(2);
      });
    });

    describe('getMonthlyStats()', () => {
      it('should calculate monthly statistics', async () => {
        await Overtime.create([
          {
            employee: testEmployee._id,
            date: new Date('2025-11-01'),
            startTime: '18:00',
            endTime: '21:00',
            duration: 3,
            reason: 'Project deadline',
            compensationType: 'paid',
            department: testDepartment._id,
            status: 'approved'
          },
          {
            employee: testEmployee._id,
            date: new Date('2025-11-05'),
            startTime: '18:00',
            endTime: '20:00',
            duration: 2,
            reason: 'Emergency fix',
            compensationType: 'paid',
            department: testDepartment._id,
            status: 'approved'
          },
          {
            employee: testEmployee._id,
            date: new Date('2025-11-10'),
            startTime: '18:00',
            endTime: '20:30',
            duration: 2.5,
            reason: 'Maintenance',
            compensationType: 'time-off',
            department: testDepartment._id,
            status: 'pending'
          }
        ]);

        const stats = await Overtime.getMonthlyStats(testEmployee._id, 2025, 11);
        expect(stats).toBeInstanceOf(Array);
        expect(stats.length).toBeGreaterThan(0);

        // Check that stats contain expected structure
        const paidApproved = stats.find(
          s => s._id.compensationType === 'paid' && s._id.status === 'approved'
        );
        expect(paidApproved).toBeDefined();
        expect(paidApproved.count).toBe(2);
        expect(paidApproved.totalHours).toBe(5);
      });
    });

    describe('getTotalUncompensatedHours()', () => {
      it('should calculate total uncompensated hours', async () => {
        const overtime1 = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-01'),
          startTime: '18:00',
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid',
          department: testDepartment._id
        });

        const overtime2 = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-05'),
          startTime: '18:00',
          endTime: '20:00',
          duration: 2,
          reason: 'Emergency fix',
          compensationType: 'time-off',
          department: testDepartment._id
        });

        const overtime3 = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-10'),
          startTime: '18:00',
          endTime: '20:30',
          duration: 2.5,
          reason: 'Maintenance',
          compensationType: 'paid',
          department: testDepartment._id
        });

        // Approve all
        await overtime1.approve(testApprover._id);
        await overtime2.approve(testApprover._id);
        await overtime3.approve(testApprover._id);

        // Mark one as compensated
        await overtime1.markCompensated();

        const uncompensated = await Overtime.getTotalUncompensatedHours(testEmployee._id);
        expect(uncompensated).toBeInstanceOf(Array);
        expect(uncompensated.length).toBeGreaterThan(0);

        const totalHours = uncompensated.reduce((sum, item) => sum + item.totalHours, 0);
        expect(totalHours).toBe(4.5); // 2 + 2.5
      });

      it('should return empty array when all overtime is compensated', async () => {
        const overtime1 = await Overtime.create({
          employee: testEmployee._id,
          date: new Date('2025-11-01'),
          startTime: '18:00',
          endTime: '21:00',
          duration: 3,
          reason: 'Project deadline',
          compensationType: 'paid',
          department: testDepartment._id
        });

        await overtime1.approve(testApprover._id);
        await overtime1.markCompensated();

        const uncompensated = await Overtime.getTotalUncompensatedHours(testEmployee._id);
        expect(uncompensated).toHaveLength(0);
      });
    });
  });
});
