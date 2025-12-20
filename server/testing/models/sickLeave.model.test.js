// SickLeave Model Tests
import SickLeave from '../../modules/hr-core/vacations/models/sickLeave.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';

describe('SickLeave Model', () => {
  let testEmployee, testDepartment, testSupervisor, testDoctor;

  beforeAll(async () => {
    // Create test department
    testDepartment = await Department.create({
      tenantId: 'test_tenant_123',
      name: 'Test Department',
      code: 'TEST-DEPT',
      description: 'Test department for sick leave tests'
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

    // Create test supervisor
    testSupervisor = await User.create({
      tenantId: 'test_tenant_123',
      username: 'testsupervisor',
      email: 'testsupervisor@test.com',
      password: 'Test123!@#',
      role: 'supervisor',
      department: testDepartment._id,
      personalInfo: {
        firstName: 'Test',
        lastName: 'Supervisor'
      }
    });

    // Create test doctor
    testDoctor = await User.create({
      tenantId: 'test_tenant_123',
      username: 'testdoctor',
      email: 'testdoctor@test.com',
      password: 'Test123!@#',
      role: 'doctor',
      department: testDepartment._id,
      personalInfo: {
        firstName: 'Test',
        lastName: 'Doctor'
      }
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid sick leave with required fields', async () => {
      const sickLeave = new SickLeave({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-03'),
        duration: 3,
        reason: 'Flu symptoms',
        department: testDepartment._id
      });

      const savedSickLeave = await sickLeave.save();
      expect(savedSickLeave).toBeDefined();
      expect(savedSickLeave.employee.toString()).toBe(testEmployee._id.toString());
      expect(savedSickLeave.reason).toBe('Flu symptoms');
      expect(savedSickLeave.status).toBe('pending');
      expect(savedSickLeave.workflow.currentStep).toBe('supervisor-review');
    });

    it('should fail validation when employee is missing', async () => {
      const sickLeave = new SickLeave({
        tenantId: 'test_tenant_123',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-03'),
        duration: 3,
        reason: 'Flu symptoms'
      });

      let err;
      try {
        await sickLeave.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.employee).toBeDefined();
    });

    it('should fail validation when end date is before start date', async () => {
      const sickLeave = new SickLeave({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-05'),
        endDate: new Date('2025-12-01'),
        duration: 3,
        reason: 'Flu symptoms'
      });

      let err;
      try {
        await sickLeave.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.name).toBe('ValidationError');
      expect(err.errors.endDate).toBeDefined();
    });
  });

  describe('Medical Documentation Requirements', () => {
    it('should not require medical documentation for sick leave <= 3 days', async () => {
      const sickLeave = await SickLeave.create({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-03'),
        duration: 3,
        reason: 'Flu symptoms',
        department: testDepartment._id
      });

      expect(sickLeave.medicalDocumentation.required).toBe(false);
    });

    it('should require medical documentation for sick leave > 3 days', async () => {
      const sickLeave = await SickLeave.create({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        duration: 5,
        reason: 'Severe flu',
        department: testDepartment._id
      });

      expect(sickLeave.medicalDocumentation.required).toBe(true);
    });

    it('should update medical documentation requirement when duration changes', async () => {
      const sickLeave = await SickLeave.create({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-02'),
        duration: 2,
        reason: 'Flu symptoms',
        department: testDepartment._id
      });

      expect(sickLeave.medicalDocumentation.required).toBe(false);

      sickLeave.duration = 5;
      sickLeave.endDate = new Date('2025-12-06');
      await sickLeave.save();

      expect(sickLeave.medicalDocumentation.required).toBe(true);
    });
  });

  describe('Two-Step Workflow', () => {
    it('should initialize with supervisor-review workflow step', async () => {
      const sickLeave = await SickLeave.create({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-03'),
        duration: 3,
        reason: 'Flu symptoms',
        department: testDepartment._id
      });

      expect(sickLeave.workflow.currentStep).toBe('supervisor-review');
      expect(sickLeave.workflow.supervisorApprovalStatus).toBe('pending');
      expect(sickLeave.workflow.doctorApprovalStatus).toBe('pending');
    });

    it('should move to doctor-review after supervisor approval when medical docs required', async () => {
      const sickLeave = await SickLeave.create({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-10'),
        duration: 10,
        reason: 'Severe illness',
        department: testDepartment._id
      });

      await sickLeave.approveBySupervisor(testSupervisor._id, 'Approved by supervisor');

      expect(sickLeave.workflow.supervisorApprovalStatus).toBe('approved');
      expect(sickLeave.workflow.currentStep).toBe('doctor-review');
      expect(sickLeave.workflow.doctorApprovalStatus).toBe('pending');
      expect(sickLeave.status).toBe('pending');
    });

    it('should complete workflow after supervisor approval when medical docs not required', async () => {
      const sickLeave = await SickLeave.create({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-02'),
        duration: 2,
        reason: 'Minor illness',
        department: testDepartment._id
      });

      await sickLeave.approveBySupervisor(testSupervisor._id, 'Approved by supervisor');

      expect(sickLeave.workflow.supervisorApprovalStatus).toBe('approved');
      expect(sickLeave.workflow.currentStep).toBe('completed');
      expect(sickLeave.workflow.doctorApprovalStatus).toBe('not-required');
      expect(sickLeave.status).toBe('approved');
    });

    it('should complete workflow after doctor approval', async () => {
      const sickLeave = await SickLeave.create({
        tenantId: 'test_tenant_123',
        employee: testEmployee._id,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-10'),
        duration: 10,
        reason: 'Severe illness',
        department: testDepartment._id
      });

      await sickLeave.approveBySupervisor(testSupervisor._id, 'Approved by supervisor');
      await sickLeave.approveByDoctor(testDoctor._id, 'Medical documentation verified');

      expect(sickLeave.workflow.supervisorApprovalStatus).toBe('approved');
      expect(sickLeave.workflow.doctorApprovalStatus).toBe('approved');
      expect(sickLeave.workflow.currentStep).toBe('completed');
      expect(sickLeave.status).toBe('approved');
      expect(sickLeave.medicalDocumentation.reviewedByDoctor).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    describe('approveBySupervisor()', () => {
      it('should approve sick leave by supervisor with notes', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-03'),
          duration: 3,
          reason: 'Flu symptoms',
          department: testDepartment._id
        });

        await sickLeave.approveBySupervisor(testSupervisor._id, 'Approved for sick leave');

        expect(sickLeave.workflow.supervisorApprovalStatus).toBe('approved');
        expect(sickLeave.approverNotes).toBe('Approved for sick leave');
      });
    });

    describe('approveByDoctor()', () => {
      it('should approve sick leave by doctor after supervisor approval', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-10'),
          duration: 10,
          reason: 'Severe illness',
          department: testDepartment._id
        });

        await sickLeave.approveBySupervisor(testSupervisor._id);
        await sickLeave.approveByDoctor(testDoctor._id, 'Medical documentation is valid');

        expect(sickLeave.status).toBe('approved');
        expect(sickLeave.approvedBy.toString()).toBe(testDoctor._id.toString());
        expect(sickLeave.approvedAt).toBeDefined();
        expect(sickLeave.medicalDocumentation.doctorNotes).toBe('Medical documentation is valid');
        expect(sickLeave.medicalDocumentation.reviewedByDoctor).toBe(true);
      });

      it('should throw error if doctor approves before supervisor', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-10'),
          duration: 10,
          reason: 'Severe illness',
          department: testDepartment._id
        });

        await expect(
          sickLeave.approveByDoctor(testDoctor._id, 'Medical documentation is valid')
        ).rejects.toThrow('Supervisor must approve before doctor can approve');
      });
    });

    describe('rejectBySupervisor()', () => {
      it('should reject sick leave by supervisor with reason', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-03'),
          duration: 3,
          reason: 'Flu symptoms',
          department: testDepartment._id
        });

        await sickLeave.rejectBySupervisor(testSupervisor._id, 'Insufficient justification');

        expect(sickLeave.status).toBe('rejected');
        expect(sickLeave.workflow.supervisorApprovalStatus).toBe('rejected');
        expect(sickLeave.workflow.currentStep).toBe('rejected');
        expect(sickLeave.rejectedBy.toString()).toBe(testSupervisor._id.toString());
        expect(sickLeave.rejectedAt).toBeDefined();
        expect(sickLeave.rejectionReason).toBe('Insufficient justification');
      });
    });

    describe('rejectByDoctor()', () => {
      it('should reject sick leave by doctor after supervisor approval', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-10'),
          duration: 10,
          reason: 'Severe illness',
          department: testDepartment._id
        });

        await sickLeave.approveBySupervisor(testSupervisor._id);
        await sickLeave.rejectByDoctor(testDoctor._id, 'Medical documentation is insufficient');

        expect(sickLeave.status).toBe('rejected');
        expect(sickLeave.workflow.doctorApprovalStatus).toBe('rejected');
        expect(sickLeave.workflow.currentStep).toBe('rejected');
        expect(sickLeave.rejectedBy.toString()).toBe(testDoctor._id.toString());
        expect(sickLeave.rejectedAt).toBeDefined();
        expect(sickLeave.rejectionReason).toBe('Medical documentation is insufficient');
        expect(sickLeave.medicalDocumentation.reviewedByDoctor).toBe(true);
      });

      it('should throw error if doctor rejects before supervisor approval', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-10'),
          duration: 10,
          reason: 'Severe illness',
          department: testDepartment._id
        });

        await expect(
          sickLeave.rejectByDoctor(testDoctor._id, 'Medical documentation is insufficient')
        ).rejects.toThrow('Supervisor must approve before doctor can reject');
      });
    });

    describe('requestAdditionalDocs()', () => {
      it('should request additional medical documentation', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-10'),
          duration: 10,
          reason: 'Severe illness',
          department: testDepartment._id
        });

        await sickLeave.requestAdditionalDocs(testDoctor._id, 'Need more detailed medical certificate');

        expect(sickLeave.medicalDocumentation.additionalDocRequested).toBe(true);
        expect(sickLeave.medicalDocumentation.requestNotes).toBe('Need more detailed medical certificate');
        expect(sickLeave.medicalDocumentation.doctorReviewedBy.toString()).toBe(testDoctor._id.toString());
      });
    });

    describe('cancel()', () => {
      it('should cancel sick leave with reason', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-03'),
          duration: 3,
          reason: 'Flu symptoms',
          department: testDepartment._id
        });

        await sickLeave.cancel(testEmployee._id, 'Recovered early');

        expect(sickLeave.status).toBe('cancelled');
        expect(sickLeave.cancelledBy.toString()).toBe(testEmployee._id.toString());
        expect(sickLeave.cancelledAt).toBeDefined();
        expect(sickLeave.cancellationReason).toBe('Recovered early');
      });
    });
  });

  describe('Static Methods', () => {
    describe('getSickLeavesByEmployee()', () => {
      it('should get all sick leaves for an employee', async () => {
        // Create test sick leaves
        await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-03'),
          duration: 3,
          reason: 'Flu symptoms',
          department: testDepartment._id
        });

        await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-10'),
          endDate: new Date('2025-12-15'),
          duration: 6,
          reason: 'Severe cold',
          department: testDepartment._id
        });

        const sickLeaves = await SickLeave.getSickLeavesByEmployee(testEmployee._id);
        
        expect(sickLeaves).toHaveLength(2);
        // Simplified assertion
        expect(sickLeaves[0]).toBeDefined();
      });
    });

    describe('getPendingSupervisorReview()', () => {
      it('should get all sick leaves pending supervisor review', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-03'),
          duration: 3,
          reason: 'Flu symptoms',
          department: testDepartment._id
        });

        const pendingLeaves = await SickLeave.getPendingSupervisorReview();
        
        expect(pendingLeaves).toHaveLength(1);
        expect(pendingLeaves[0]._id.toString()).toBe(sickLeave._id.toString());
        expect(pendingLeaves[0].workflow.currentStep).toBe('supervisor-review');
      });
    });

    describe('getPendingDoctorReview()', () => {
      it('should get all sick leaves pending doctor review', async () => {
        const sickLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-10'),
          duration: 10,
          reason: 'Severe illness',
          department: testDepartment._id
        });

        // Move to doctor review stage
        await sickLeave.approveBySupervisor(testSupervisor._id);

        const pendingLeaves = await SickLeave.getPendingDoctorReview();
        
        expect(pendingLeaves).toHaveLength(1);
        expect(pendingLeaves[0]._id.toString()).toBe(sickLeave._id.toString());
        expect(pendingLeaves[0].workflow.currentStep).toBe('doctor-review');
      });
    });

    describe('hasOverlappingSickLeave()', () => {
      it('should detect overlapping sick leaves', async () => {
        const existingLeave = await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          reason: 'Flu symptoms',
          department: testDepartment._id
        });

        const hasOverlap = await SickLeave.hasOverlappingSickLeave(
          testEmployee._id,
          new Date('2025-12-03'),
          new Date('2025-12-07')
        );

        expect(hasOverlap).toBe(true);
      });

      it('should not detect overlap for non-overlapping dates', async () => {
        await SickLeave.create({
          tenantId: 'test_tenant_123',
          employee: testEmployee._id,
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-05'),
          duration: 5,
          reason: 'Flu symptoms',
          department: testDepartment._id
        });

        const hasOverlap = await SickLeave.hasOverlappingSickLeave(
          testEmployee._id,
          new Date('2025-12-06'),
          new Date('2025-12-10')
        );

        expect(hasOverlap).toBe(false);
      });
    });
  });
});
