// Vacation Model Tests
import Vacation from '../../models/vacation.model.js';
import User from '../../models/user.model.js';
import Department from '../../models/department.model.js';

describe('Vacation Model', () => {
  let testEmployee, testDepartment, testApprover;

  beforeAll(async () => {
    // Create test department
    testDepartment = await Department.create({
      tenantId: 'test_tenant_123',
      name: 'Test Department',
      code: 'TEST-DEPT',
      description: 'Test department for vacation tests'
    });

    // Create test employee
    testEmployee = await User.create({
      tenantId: 'test_tenant_123',
      username: 'testvacationemployee',
      email: 'testvacationemployee@test.com',
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
      username: 'testvacationapprover',
      email: 'testvacationapprover@test.com',
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
    await Vacation.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid vacation with required fields', async () => {
      const vacation = new Vacation({
        employee: testEmployee._id,
        vacationType: 'annual',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5,
        reason: 'Family vacation',
        department: testDepartment._id
      });

      const savedVacation = await vacation.save();
      expect(savedVacation).toBeDefined();
      expect(savedVacation.employee.toString()).toBe(testEmployee._id.toString());
      expect(savedVacation.vacationType).toBe('annual');
      // Duration is calculated automatically excluding weekends (Friday & Saturday)
      // Dec 1-5, 2025: Mon, Tue, Wed, Thu, Fri = 4 working days (Fri is weekend)
      expect(savedVacation.duration).toBe(4);
      expect(savedVacation.status).toBe('pending');
    });

    it('should fail validation when employee is missing', async () => {
      const vacation = new Vacation({
        vacationType: 'annual',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5,
        reason: 'Family vacation'
      });

      let err;
      try {
        await vacation.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.employee).toBeDefined();
    });

    it('should fail validation when vacation type is missing', async () => {
      const vacation = new Vacation({
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5,
        reason: 'Family vacation'
      });

      let err;
      try {
        await vacation.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.vacationType).toBeDefined();
    });

    it('should fail validation when end date is before start date', async () => {
      const vacation = new Vacation({
        employee: testEmployee._id,
        vacationType: 'annual',
        startDate: new Date('2025-12-05'),
        endDate: new Date('2025-12-01'),
        duration: 5,
        reason: 'Family vacation'
      });

      let err;
      try {
        await vacation.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.endDate).toBeDefined();
    });

    it('should accept valid vacation types', async () => {
      const types = ['annual', 'casual', 'sick', 'unpaid'];

      for (const type of types) {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: type,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          department: testDepartment._id
        });

        expect(vacation.vacationType).toBe(type);
      }
    });

    it('should fail validation for invalid vacation type', async () => {
      const vacation = new Vacation({
        employee: testEmployee._id,
        vacationType: 'invalid-type',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5
      });

      let err;
      try {
        await vacation.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.vacationType).toBeDefined();
    });

    it('should validate reason max length', async () => {
      const longReason = 'a'.repeat(501);
      const vacation = new Vacation({
        employee: testEmployee._id,
        vacationType: 'annual',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5,
        reason: longReason,
        department: testDepartment._id
      });

      let err;
      try {
        await vacation.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.reason).toBeDefined();
    });
  });

  describe('Instance Methods', () => {
    describe('approve()', () => {
      it('should approve a vacation', async () => {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          reason: 'Family vacation',
          department: testDepartment._id
        });

        await vacation.approve(testApprover._id, 'Approved for annual leave');

        expect(vacation.status).toBe('approved');
        expect(vacation.approvedBy.toString()).toBe(testApprover._id.toString());
        expect(vacation.approvedAt).toBeDefined();
        expect(vacation.approverNotes).toBe('Approved for annual leave');
      });

      it('should approve a vacation without notes', async () => {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'casual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-02'),
          duration: 2,
          department: testDepartment._id
        });

        await vacation.approve(testApprover._id);

        expect(vacation.status).toBe('approved');
        expect(vacation.approvedBy.toString()).toBe(testApprover._id.toString());
        expect(vacation.approvedAt).toBeDefined();
      });
    });

    describe('reject()', () => {
      it('should reject a vacation with reason', async () => {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          reason: 'Family vacation',
          department: testDepartment._id
        });

        await vacation.reject(testApprover._id, 'Insufficient vacation balance');

        expect(vacation.status).toBe('rejected');
        expect(vacation.rejectedBy.toString()).toBe(testApprover._id.toString());
        expect(vacation.rejectedAt).toBeDefined();
        expect(vacation.rejectionReason).toBe('Insufficient vacation balance');
      });

      it('should reject a vacation without reason', async () => {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          department: testDepartment._id
        });

        await vacation.reject(testApprover._id);

        expect(vacation.status).toBe('rejected');
        expect(vacation.rejectedBy.toString()).toBe(testApprover._id.toString());
        expect(vacation.rejectedAt).toBeDefined();
      });
    });

    describe('cancel()', () => {
      it('should cancel a vacation with reason', async () => {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          reason: 'Family vacation',
          department: testDepartment._id,
          status: 'approved'
        });

        await vacation.cancel(testEmployee._id, 'Personal emergency');

        expect(vacation.status).toBe('cancelled');
        expect(vacation.cancelledBy.toString()).toBe(testEmployee._id.toString());
        expect(vacation.cancelledAt).toBeDefined();
        expect(vacation.cancellationReason).toBe('Personal emergency');
      });

      it('should cancel a pending vacation', async () => {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'casual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-02'),
          duration: 2,
          department: testDepartment._id
        });

        await vacation.cancel(testEmployee._id, 'Changed plans');

        expect(vacation.status).toBe('cancelled');
        expect(vacation.cancelledBy.toString()).toBe(testEmployee._id.toString());
        expect(vacation.cancelledAt).toBeDefined();
        expect(vacation.cancellationReason).toBe('Changed plans');
      });
    });
  });

  describe('Static Methods', () => {
    describe('getVacationsByEmployee()', () => {
      it('should get all vacations for an employee', async () => {
        await Vacation.create([
          {
            employee: testEmployee._id,
            vacationType: 'annual',
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-05'),
            duration: 5,
            reason: 'Family vacation',
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            vacationType: 'casual',
            startDate: new Date('2025-11-01'),
            endDate: new Date('2025-11-02'),
            duration: 2,
            reason: 'Personal matters',
            department: testDepartment._id
          }
        ]);

        const vacations = await Vacation.getVacationsByEmployee(testEmployee._id);
        expect(vacations).toHaveLength(2);
      });

      it('should filter vacations by status', async () => {
        await Vacation.create([
          {
            employee: testEmployee._id,
            vacationType: 'annual',
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-05'),
            duration: 5,
            department: testDepartment._id,
            status: 'approved'
          },
          {
            employee: testEmployee._id,
            vacationType: 'casual',
            startDate: new Date('2025-11-01'),
            endDate: new Date('2025-11-02'),
            duration: 2,
            department: testDepartment._id,
            status: 'pending'
          }
        ]);

        const approvedVacations = await Vacation.getVacationsByEmployee(testEmployee._id, { status: 'approved' });
        expect(approvedVacations).toHaveLength(1);
        expect(approvedVacations[0].status).toBe('approved');
      });
    });

    describe('getPendingVacations()', () => {
      it('should get all pending vacations', async () => {
        await Vacation.create([
          {
            employee: testEmployee._id,
            vacationType: 'annual',
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-05'),
            duration: 5,
            department: testDepartment._id,
            status: 'pending'
          },
          {
            employee: testEmployee._id,
            vacationType: 'casual',
            startDate: new Date('2025-11-01'),
            endDate: new Date('2025-11-02'),
            duration: 2,
            department: testDepartment._id,
            status: 'approved'
          }
        ]);

        const vacations = await Vacation.getPendingVacations();
        expect(vacations).toHaveLength(1);
        expect(vacations[0].status).toBe('pending');
      });

      it('should filter pending vacations by department', async () => {
        const otherDepartment = await Department.create({
      tenantId: 'test_tenant_123',
          name: 'Other Department',
          code: 'OTHER-DEPT',
          description: 'Other department'
        });

        await Vacation.create([
          {
            employee: testEmployee._id,
            vacationType: 'annual',
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-05'),
            duration: 5,
            department: testDepartment._id,
            status: 'pending'
          },
          {
            employee: testEmployee._id,
            vacationType: 'casual',
            startDate: new Date('2025-11-01'),
            endDate: new Date('2025-11-02'),
            duration: 2,
            department: otherDepartment._id,
            status: 'pending'
          }
        ]);

        const vacations = await Vacation.getPendingVacations(testDepartment._id);
        expect(vacations).toHaveLength(1);
        expect(vacations[0].vacationType).toBe('annual');

        await Department.findByIdAndDelete(otherDepartment._id);
      });
    });

    describe('getActiveVacations()', () => {
      it('should get currently active vacations', async () => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        await Vacation.create([
          {
            employee: testEmployee._id,
            vacationType: 'annual',
            startDate: yesterday,
            endDate: tomorrow,
            duration: 3,
            department: testDepartment._id,
            status: 'approved'
          },
          {
            employee: testEmployee._id,
            vacationType: 'casual',
            startDate: new Date('2020-12-01'),
            endDate: new Date('2020-12-05'),
            duration: 5,
            department: testDepartment._id,
            status: 'approved'
          }
        ]);

        const activeVacations = await Vacation.getActiveVacations();
        expect(activeVacations).toHaveLength(1);
        expect(activeVacations[0].status).toBe('approved');
      });
    });

    describe('getVacationsByDepartment()', () => {
      it('should get all vacations for a department', async () => {
        await Vacation.create([
          {
            employee: testEmployee._id,
            vacationType: 'annual',
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-05'),
            duration: 5,
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            vacationType: 'casual',
            startDate: new Date('2025-11-01'),
            endDate: new Date('2025-11-02'),
            duration: 2,
            department: testDepartment._id
          }
        ]);

        const vacations = await Vacation.getVacationsByDepartment(testDepartment._id);
        expect(vacations).toHaveLength(2);
      });
    });

    describe('hasOverlappingVacation()', () => {
      it('should detect overlapping vacations', async () => {
        await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          department: testDepartment._id,
          status: 'approved'
        });

        const hasOverlap = await Vacation.hasOverlappingVacation(
          testEmployee._id,
          new Date('2025-12-03'),
          new Date('2025-12-07')
        );

        expect(hasOverlap).toBe(true);
      });

      it('should not detect overlap for non-overlapping dates', async () => {
        await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          department: testDepartment._id,
          status: 'approved'
        });

        const hasOverlap = await Vacation.hasOverlappingVacation(
          testEmployee._id,
          new Date('2025-12-10'),
          new Date('2025-12-15')
        );

        expect(hasOverlap).toBe(false);
      });

      it('should exclude specific vacation when checking overlap', async () => {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          department: testDepartment._id,
          status: 'approved'
        });

        const hasOverlap = await Vacation.hasOverlappingVacation(
          testEmployee._id,
          new Date('2025-12-01'),
          new Date('2025-12-05'),
          vacation._id
        );

        expect(hasOverlap).toBe(false);
      });

      it('should not detect overlap for rejected or cancelled vacations', async () => {
        await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          department: testDepartment._id,
          status: 'rejected'
        });

        const hasOverlap = await Vacation.hasOverlappingVacation(
          testEmployee._id,
          new Date('2025-12-03'),
          new Date('2025-12-07')
        );

        expect(hasOverlap).toBe(false);
      });
    });

    describe('getVacationStats()', () => {
      it('should get vacation statistics for a department', async () => {
        await Vacation.create([
          {
            employee: testEmployee._id,
            vacationType: 'annual',
            startDate: new Date('2025-06-01'),
            endDate: new Date('2025-06-05'),
            duration: 5,
            department: testDepartment._id,
            status: 'approved'
          },
          {
            employee: testEmployee._id,
            vacationType: 'annual',
            startDate: new Date('2025-07-01'),
            endDate: new Date('2025-07-03'),
            duration: 3,
            department: testDepartment._id,
            status: 'approved'
          },
          {
            employee: testEmployee._id,
            vacationType: 'casual',
            startDate: new Date('2025-08-01'),
            endDate: new Date('2025-08-02'),
            duration: 2,
            department: testDepartment._id,
            status: 'pending'
          }
        ]);

        const stats = await Vacation.getVacationStats(testDepartment._id, 2025);
        expect(stats).toBeInstanceOf(Array);
        expect(stats.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Virtual Properties', () => {
    describe('isActive', () => {
      it('should return true for currently active vacation', async () => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: yesterday,
          endDate: tomorrow,
          duration: 3,
          department: testDepartment._id,
          status: 'approved'
        });

        expect(vacation.isActive).toBe(true);
      });

      it('should return false for pending vacation', async () => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: yesterday,
          endDate: tomorrow,
          duration: 3,
          department: testDepartment._id,
          status: 'pending'
        });

        expect(vacation.isActive).toBe(false);
      });
    });

    describe('isUpcoming', () => {
      it('should return true for upcoming approved vacation', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);
        const endDate = new Date(futureDate);
        endDate.setDate(endDate.getDate() + 5);

        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: futureDate,
          endDate: endDate,
          duration: 5,
          department: testDepartment._id,
          status: 'approved'
        });

        expect(vacation.isUpcoming).toBe(true);
      });

      it('should return false for past vacation', async () => {
        const vacation = await Vacation.create({
          employee: testEmployee._id,
          vacationType: 'annual',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          duration: 5,
          department: testDepartment._id,
          status: 'approved'
        });

        expect(vacation.isUpcoming).toBe(false);
      });
    });
  });
});
