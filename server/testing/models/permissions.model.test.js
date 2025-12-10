// Permissions Model Tests
import Permissions from '../../models/permissions.model.js';
import User from '../../models/user.model.js';
import Department from '../../models/department.model.js';

describe('Permissions Model', () => {
  let testEmployee, testDepartment, testApprover;

  beforeAll(async () => {
    // Create test department
    testDepartment = await Department.create({
      tenantId: 'test_tenant_123',
      name: 'Test Department',
      code: 'TEST-DEPT',
      description: 'Test department for permissions tests'
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

  afterEach(async () => {
    await Permissions.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid permission with required fields', async () => {
      const permission = new Permissions({
        employee: testEmployee._id,
        permissionType: 'late-arrival',
        date: new Date('2025-12-01'),
        time: '09:30',
        duration: 0.5,
        reason: 'Doctor appointment',
        department: testDepartment._id
      });

      const savedPermission = await permission.save();
      expect(savedPermission).toBeDefined();
      expect(savedPermission.employee.toString()).toBe(testEmployee._id.toString());
      expect(savedPermission.permissionType).toBe('late-arrival');
      expect(savedPermission.time).toBe('09:30');
      expect(savedPermission.duration).toBe(0.5);
      expect(savedPermission.status).toBe('pending');
    });

    it('should fail validation when employee is missing', async () => {
      const permission = new Permissions({
        permissionType: 'late-arrival',
        date: new Date('2025-12-01'),
        time: '09:30',
        duration: 0.5,
        reason: 'Doctor appointment'
      });

      let err;
      try {
        await permission.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.employee).toBeDefined();
    });

    it('should fail validation when permission type is invalid', async () => {
      const permission = new Permissions({
        employee: testEmployee._id,
        permissionType: 'invalid-type',
        date: new Date('2025-12-01'),
        time: '09:30',
        duration: 0.5,
        reason: 'Doctor appointment'
      });

      let err;
      try {
        await permission.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.permissionType).toBeDefined();
    });

    it('should accept valid permission types', async () => {
      const lateArrival = await Permissions.create({
        employee: testEmployee._id,
        permissionType: 'late-arrival',
        date: new Date('2025-12-01'),
        time: '09:30',
        duration: 0.5,
        reason: 'Doctor appointment',
        department: testDepartment._id
      });

      const earlyDeparture = await Permissions.create({
        employee: testEmployee._id,
        permissionType: 'early-departure',
        date: new Date('2025-12-02'),
        time: '15:30',
        duration: 1.5,
        reason: 'Personal matter',
        department: testDepartment._id
      });

      expect(lateArrival.permissionType).toBe('late-arrival');
      expect(earlyDeparture.permissionType).toBe('early-departure');
    });

    it('should fail validation when time format is invalid', async () => {
      const permission = new Permissions({
        employee: testEmployee._id,
        permissionType: 'late-arrival',
        date: new Date('2025-12-01'),
        time: '9:30', // Invalid format (should be 09:30)
        duration: 0.5,
        reason: 'Doctor appointment'
      });

      let err;
      try {
        await permission.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.time).toBeDefined();
    });

    it('should accept valid time formats', async () => {
      const validTimes = ['00:00', '09:30', '12:45', '18:00', '23:59'];

      for (const time of validTimes) {
        const permission = await Permissions.create({
          employee: testEmployee._id,
          permissionType: 'late-arrival',
          date: new Date('2025-12-01'),
          time: time,
          duration: 0.5,
          reason: 'Test reason',
          department: testDepartment._id
        });

        expect(permission.time).toBe(time);
      }
    });

    it('should reject invalid time formats', async () => {
      const invalidTimes = ['9:30', '24:00', '12:60', '25:30', 'invalid'];

      for (const time of invalidTimes) {
        const permission = new Permissions({
          employee: testEmployee._id,
          permissionType: 'late-arrival',
          date: new Date('2025-12-01'),
          time: time,
          duration: 0.5,
          reason: 'Test reason'
        });

        let err;
        try {
          await permission.save();
        } catch (error) {
          err = error;
        }

        expect(err).toBeDefined();
        expect(err.name).toBe('ValidationError');
        expect(err.errors.time).toBeDefined();
      }
    });

    it('should fail validation when reason exceeds max length', async () => {
      const longReason = 'a'.repeat(301);
      const permission = new Permissions({
        employee: testEmployee._id,
        permissionType: 'late-arrival',
        date: new Date('2025-12-01'),
        time: '09:30',
        duration: 0.5,
        reason: longReason
      });

      let err;
      try {
        await permission.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.reason).toBeDefined();
    });
  });

  describe('Duration Calculation', () => {
    it('should store duration in hours', async () => {
      const permission = await Permissions.create({
        employee: testEmployee._id,
        permissionType: 'late-arrival',
        date: new Date('2025-12-01'),
        time: '09:30',
        duration: 1.5,
        reason: 'Doctor appointment',
        department: testDepartment._id
      });

      expect(permission.duration).toBe(1.5);
    });

    it('should handle fractional hours', async () => {
      const permission = await Permissions.create({
        employee: testEmployee._id,
        permissionType: 'early-departure',
        date: new Date('2025-12-01'),
        time: '16:30',
        duration: 0.25,
        reason: 'Quick errand',
        department: testDepartment._id
      });

      expect(permission.duration).toBe(0.25);
    });
  });

  describe('Instance Methods', () => {
    describe('approve()', () => {
      it('should approve a permission', async () => {
        const permission = await Permissions.create({
          employee: testEmployee._id,
          permissionType: 'late-arrival',
          date: new Date('2025-12-01'),
          time: '09:30',
          duration: 0.5,
          reason: 'Doctor appointment',
          department: testDepartment._id
        });

        await permission.approve(testApprover._id, 'Approved for medical reasons');

        expect(permission.status).toBe('approved');
        expect(permission.approvedBy.toString()).toBe(testApprover._id.toString());
        expect(permission.approvedAt).toBeDefined();
        expect(permission.approverNotes).toBe('Approved for medical reasons');
      });

      it('should approve without notes', async () => {
        const permission = await Permissions.create({
          employee: testEmployee._id,
          permissionType: 'late-arrival',
          date: new Date('2025-12-01'),
          time: '09:30',
          duration: 0.5,
          reason: 'Doctor appointment',
          department: testDepartment._id
        });

        await permission.approve(testApprover._id);

        expect(permission.status).toBe('approved');
        expect(permission.approvedBy.toString()).toBe(testApprover._id.toString());
        expect(permission.approvedAt).toBeDefined();
        expect(permission.approverNotes).toBeUndefined();
      });
    });

    describe('reject()', () => {
      it('should reject a permission with reason', async () => {
        const permission = await Permissions.create({
          employee: testEmployee._id,
          permissionType: 'late-arrival',
          date: new Date('2025-12-01'),
          time: '09:30',
          duration: 0.5,
          reason: 'Doctor appointment',
          department: testDepartment._id
        });

        await permission.reject(testApprover._id, 'Insufficient justification');

        expect(permission.status).toBe('rejected');
        expect(permission.rejectedBy.toString()).toBe(testApprover._id.toString());
        expect(permission.rejectedAt).toBeDefined();
        expect(permission.rejectionReason).toBe('Insufficient justification');
      });

      it('should reject without reason', async () => {
        const permission = await Permissions.create({
          employee: testEmployee._id,
          permissionType: 'late-arrival',
          date: new Date('2025-12-01'),
          time: '09:30',
          duration: 0.5,
          reason: 'Doctor appointment',
          department: testDepartment._id
        });

        await permission.reject(testApprover._id);

        expect(permission.status).toBe('rejected');
        expect(permission.rejectedBy.toString()).toBe(testApprover._id.toString());
        expect(permission.rejectedAt).toBeDefined();
        expect(permission.rejectionReason).toBe('');
      });
    });
  });

  describe('Static Methods', () => {
    describe('getPermissionsByEmployee()', () => {
      it('should get all permissions for an employee', async () => {
        await Permissions.create([
          {
            employee: testEmployee._id,
            permissionType: 'late-arrival',
            date: new Date('2025-12-01'),
            time: '09:30',
            duration: 0.5,
            reason: 'Doctor appointment',
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            permissionType: 'early-departure',
            date: new Date('2025-12-02'),
            time: '15:30',
            duration: 1.5,
            reason: 'Personal matter',
            department: testDepartment._id
          }
        ]);

        const permissions = await Permissions.getPermissionsByEmployee(testEmployee._id);
        expect(permissions).toHaveLength(2);
      });

      it('should filter permissions by status', async () => {
        const permission1 = await Permissions.create({
          employee: testEmployee._id,
          permissionType: 'late-arrival',
          date: new Date('2025-12-01'),
          time: '09:30',
          duration: 0.5,
          reason: 'Doctor appointment',
          department: testDepartment._id
        });

        await permission1.approve(testApprover._id);

        await Permissions.create({
          employee: testEmployee._id,
          permissionType: 'early-departure',
          date: new Date('2025-12-02'),
          time: '15:30',
          duration: 1.5,
          reason: 'Personal matter',
          department: testDepartment._id,
          status: 'pending'
        });

        const approvedPermissions = await Permissions.getPermissionsByEmployee(
          testEmployee._id,
          { status: 'approved' }
        );
        expect(approvedPermissions).toHaveLength(1);
        expect(approvedPermissions[0].status).toBe('approved');
      });
    });

    describe('getPendingPermissions()', () => {
      it('should get all pending permissions', async () => {
        await Permissions.create([
          {
            employee: testEmployee._id,
            permissionType: 'late-arrival',
            date: new Date('2025-12-01'),
            time: '09:30',
            duration: 0.5,
            reason: 'Doctor appointment',
            department: testDepartment._id,
            status: 'pending'
          },
          {
            employee: testEmployee._id,
            permissionType: 'early-departure',
            date: new Date('2025-12-02'),
            time: '15:30',
            duration: 1.5,
            reason: 'Personal matter',
            department: testDepartment._id,
            status: 'approved'
          }
        ]);

        const permissions = await Permissions.getPendingPermissions();
        expect(permissions).toHaveLength(1);
        expect(permissions[0].status).toBe('pending');
      });

      it('should filter pending permissions by department', async () => {
        const otherDepartment = await Department.create({
      tenantId: 'test_tenant_123',
          name: 'Other Department',
          code: 'OTHER-DEPT',
          description: 'Another test department'
        });

        await Permissions.create([
          {
            employee: testEmployee._id,
            permissionType: 'late-arrival',
            date: new Date('2025-12-01'),
            time: '09:30',
            duration: 0.5,
            reason: 'Doctor appointment',
            department: testDepartment._id,
            status: 'pending'
          },
          {
            employee: testEmployee._id,
            permissionType: 'early-departure',
            date: new Date('2025-12-02'),
            time: '15:30',
            duration: 1.5,
            reason: 'Personal matter',
            department: otherDepartment._id,
            status: 'pending'
          }
        ]);

        const permissions = await Permissions.getPendingPermissions(testDepartment._id);
        expect(permissions).toHaveLength(1);
        expect(permissions[0].permissionType).toBe('late-arrival');
      });
    });

    describe('getPermissionsByDateRange()', () => {
      it('should get permissions within date range', async () => {
        await Permissions.create([
          {
            employee: testEmployee._id,
            permissionType: 'late-arrival',
            date: new Date('2025-12-01'),
            time: '09:30',
            duration: 0.5,
            reason: 'Doctor appointment',
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            permissionType: 'early-departure',
            date: new Date('2025-12-15'),
            time: '15:30',
            duration: 1.5,
            reason: 'Personal matter',
            department: testDepartment._id
          },
          {
            employee: testEmployee._id,
            permissionType: 'late-arrival',
            date: new Date('2025-12-25'),
            time: '10:00',
            duration: 1,
            reason: 'Traffic',
            department: testDepartment._id
          }
        ]);

        const permissions = await Permissions.getPermissionsByDateRange(
          testEmployee._id,
          new Date('2025-12-01'),
          new Date('2025-12-20')
        );

        expect(permissions).toHaveLength(2);
      });
    });

    describe('getMonthlyStats()', () => {
      it('should calculate monthly statistics', async () => {
        await Permissions.create([
          {
            employee: testEmployee._id,
            permissionType: 'late-arrival',
            date: new Date('2025-12-01'),
            time: '09:30',
            duration: 0.5,
            reason: 'Doctor appointment',
            department: testDepartment._id,
            status: 'approved'
          },
          {
            employee: testEmployee._id,
            permissionType: 'late-arrival',
            date: new Date('2025-12-05'),
            time: '09:45',
            duration: 0.75,
            reason: 'Traffic',
            department: testDepartment._id,
            status: 'approved'
          },
          {
            employee: testEmployee._id,
            permissionType: 'early-departure',
            date: new Date('2025-12-10'),
            time: '15:30',
            duration: 1.5,
            reason: 'Personal matter',
            department: testDepartment._id,
            status: 'pending'
          }
        ]);

        const stats = await Permissions.getMonthlyStats(testEmployee._id, 2025, 12);
        expect(stats).toBeInstanceOf(Array);
        expect(stats.length).toBeGreaterThan(0);

        // Check that stats contain expected structure
        const lateArrivalApproved = stats.find(
          s => s._id.permissionType === 'late-arrival' && s._id.status === 'approved'
        );
        expect(lateArrivalApproved).toBeDefined();
        expect(lateArrivalApproved.count).toBe(2);
        expect(lateArrivalApproved.totalHours).toBe(1.25);
      });
    });
  });
});
