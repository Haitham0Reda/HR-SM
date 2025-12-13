import mongoose from 'mongoose';
import ResignedEmployee from '../../modules/hr-core/users/models/resignedEmployee.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';
import Position from '../../modules/hr-core/users/models/position.model.js';
// organization model removed - not needed for general HR system  // Add this import

let employee;
let department;
let position;
let hrUser;

beforeEach(async () => {
  // Create fresh employee and related data for each test
  department = await Department.create({
    tenantId: 'test_tenant_123',
    name: 'Test Department',
    code: 'TEST'
  });

  position = await Position.create({
    tenantId: 'test_tenant_123',
    title: 'Test Position',
    code: 'TP001',
    department: department._id
  });

  employee = await User.create({
    tenantId: 'test_tenant_123',
    username: 'testemployee',
    email: 'employee@example.com',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP001',
    department: department._id,
    position: position._id,
    profile: {
      firstName: 'Test',
      lastName: 'Employee'
    },
    employment: {
      hireDate: new Date('2020-01-01'),
      employmentStatus: 'active'
    }
  });

  hrUser = await User.create({
    tenantId: 'test_tenant_123',
    username: 'hruser',
    email: 'hr@example.com',
    password: 'password123',
    role: 'hr',
    employeeId: 'HR001'
  });

  await ResignedEmployee.deleteMany({});
});

describe('ResignedEmployee Model', () => {
  it('should create a new resigned employee record with required fields', async () => {
    const resignationDate = new Date('2024-01-15');
    const lastWorkingDay = new Date('2024-01-31');

    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationDate: resignationDate,
      lastWorkingDay: lastWorkingDay,
      resignationReason: 'personal-reasons',
      processedBy: hrUser._id
    });

    expect(resignedEmployee.employee.toString()).toBe(employee._id.toString());
    expect(resignedEmployee.resignationType).toBe('resignation-letter');
    expect(resignedEmployee.resignationDate.toISOString()).toBe(resignationDate.toISOString());
    expect(resignedEmployee.lastWorkingDay.toISOString()).toBe(lastWorkingDay.toISOString());
    expect(resignedEmployee.reason).toBe('Personal reasons');
    expect(resignedEmployee.status).toBe('pending');
  });

  it('should validate resignationType enum values', async () => {
    const validTypes = ['resignation-letter', 'termination'];

    for (const type of validTypes) {
      const resignedEmployee = new ResignedEmployee({
        tenantId: 'test_tenant_123',
        employee: employee._id,
        department: department._id,
        position: position._id,
        resignationType: type,
        resignationReason: 'personal-reasons',
        resignationDate: new Date('2024-01-15'),
        lastWorkingDay: new Date('2024-01-31')
      });

      await expect(resignedEmployee.validate()).resolves.toBeUndefined();
    }

    // Test invalid type
    const invalidRecord = new ResignedEmployee({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'invalid-type',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31')
    });

    await expect(invalidRecord.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['pending', 'processed', 'archived'];

    for (const status of validStatuses) {
      const resignedEmployee = new ResignedEmployee({
        tenantId: 'test_tenant_123',
        employee: employee._id,
        department: department._id,
        position: position._id,
        resignationType: 'resignation-letter',
        resignationReason: 'personal-reasons',
        resignationDate: new Date('2024-01-15'),
        lastWorkingDay: new Date('2024-01-31'),
        status: status
      });

      await expect(resignedEmployee.validate()).resolves.toBeUndefined();
    }

    // Test invalid status
    const invalidRecord = new ResignedEmployee({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31'),
      status: 'invalid-status'
    });

    await expect(invalidRecord.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate virtual properties correctly', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31')
    });

    expect(resignedEmployee.totalPenaltyAmount).toBe(0);
    expect(resignedEmployee.canModify).toBe(true);
  });

  it('should add penalties to resigned employee record', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31')
    });

    const penaltyData = {
      description: 'Late return of company property',
      amount: 500,
      currency: 'EGP'
    };

    const updatedRecord = await resignedEmployee.addPenalty(penaltyData, hrUser._id);

    expect(updatedRecord.penalties).toHaveLength(1);
    expect(updatedRecord.penalties[0].description).toBe('Late return of company property');
    expect(updatedRecord.penalties[0].amount).toBe(500);
    expect(updatedRecord.penalties[0].currency).toBe('EGP');
    expect(updatedRecord.penalties[0].addedBy.toString()).toBe(hrUser._id.toString());
    expect(updatedRecord.totalPenalties).toBe(500);
    expect(updatedRecord.totalPenaltyAmount).toBe(500);
  });

  it('should remove penalties from resigned employee record', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31'),
      penalties: [
        {
          description: 'Late return of company property',
          amount: 500,
          currency: 'EGP',
          addedBy: hrUser._id
        },
        {
          description: 'Damaged equipment',
          amount: 300,
          currency: 'EGP',
          addedBy: hrUser._id
        }
      ]
    });

    const penaltyId = resignedEmployee.penalties[0]._id;
    const updatedRecord = await resignedEmployee.removePenalty(penaltyId);

    expect(updatedRecord.penalties).toHaveLength(1);
    expect(updatedRecord.penalties[0].description).toBe('Damaged equipment');
    expect(updatedRecord.totalPenalties).toBe(300);
    expect(updatedRecord.totalPenaltyAmount).toBe(300);
  });

  it('should prevent modifying penalties after locking', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31'),
      isLocked: true
    });

    const penaltyData = {
      description: 'Test penalty',
      amount: 100
    };

    // Debug: Log the resignedEmployee to see its state

    try {
      await resignedEmployee.addPenalty(penaltyData, hrUser._id);
      // If we reach here, the test should fail because no error was thrown
      expect(true).toBe(false); // This should never be reached
    } catch (error) {
      expect(error.message).toBe('Cannot modify penalties after 24 hours');
    }

    try {
      await resignedEmployee.removePenalty(new mongoose.Types.ObjectId());
      // If we reach here, the test should fail because no error was thrown
      expect(true).toBe(false); // This should never be reached
    } catch (error) {
      expect(error.message).toBe('Cannot modify penalties after 24 hours');
    }
  });

  it('should update resignation type', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31')
    });

    const updatedRecord = await resignedEmployee.updateResignationType('termination');

    expect(updatedRecord.resignationType).toBe('termination');
  });

  it('should lock resigned employee record', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31')
    });

    const updatedRecord = await resignedEmployee.lock();

    expect(updatedRecord.isLocked).toBe(true);
    expect(updatedRecord.lockedDate).toBeDefined();
    expect(updatedRecord.canModify).toBe(false);
  });

  it('should generate resignation letter', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31'),
      resignationReason: 'personal-reasons',
      penalties: [
        {
          description: 'Late return of company property',
          amount: 500,
          currency: 'EGP'
        }
      ]
    });

    const updatedRecord = await resignedEmployee.generateLetter(hrUser._id);

    expect(updatedRecord.letterGenerated).toBe(true);
    expect(updatedRecord.letterGeneratedDate).toBeDefined();
    expect(updatedRecord.letterGeneratedBy.toString()).toBe(hrUser._id.toString());
    expect(updatedRecord.letterContent).toContain('TO WHOM IT MAY CONCERN');
    expect(updatedRecord.letterContent).toContain('resignation letter');
    expect(updatedRecord.letterContent).toContain('Pending Penalties: 500 EGP');
  });

  it('should generate termination letter', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'termination',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31'),
      resignationReason: 'termination'
    });

    const updatedRecord = await resignedEmployee.generateLetter(hrUser._id);

    expect(updatedRecord.letterGenerated).toBe(true);
    expect(updatedRecord.letterGeneratedDate).toBeDefined();
    expect(updatedRecord.letterGeneratedBy.toString()).toBe(hrUser._id.toString());
    expect(updatedRecord.letterContent).toContain('TO WHOM IT MAY CONCERN');
    expect(updatedRecord.letterContent).toContain('terminated');
  });

  it('should find all resigned employees', async () => {
    // Create a second employee for the second record
    const employee2 = await User.create({
      tenantId: 'test_tenant_123',
      username: 'testemployee2',
      email: 'employee2@example.com',
      password: 'password123',
      role: 'employee',
      employeeId: 'EMP002',
      department: department._id,
      position: position._id,
      profile: {
        firstName: 'Test2',
        lastName: 'Employee2'
      },
      employment: {
        hireDate: new Date('2020-01-01'),
        employmentStatus: 'active'
      }
    });

    await ResignedEmployee.create([
      {
        tenantId: 'test_tenant_123',
        employee: employee._id,
        department: department._id,
        position: position._id,
        resignationType: 'resignation-letter',
        resignationReason: 'personal-reasons',
        resignationDate: new Date('2024-01-15'),
        lastWorkingDay: new Date('2024-01-31'),
        status: 'pending'
      },
      {
        tenantId: 'test_tenant_123',
        employee: employee2._id,  // Use different employee
        department: department._id,
        position: position._id,
        resignationType: 'termination',
        resignationReason: 'termination',
        resignationDate: new Date('2024-01-15'),
        lastWorkingDay: new Date('2024-01-31'),
        status: 'processed'
      }
    ]);

    const allResigned = await ResignedEmployee.findAllResigned();

    expect(allResigned).toHaveLength(2);
    expect(allResigned[0].resignationDate.getTime()).toBeGreaterThanOrEqual(allResigned[1].resignationDate.getTime());

    // Check with status filter
    const pendingResigned = await ResignedEmployee.findAllResigned({ status: 'pending' });

    expect(pendingResigned).toHaveLength(1);
    expect(pendingResigned[0].status).toBe('pending');
  });

  it('should auto-lock records after 24 hours', async () => {
    // Create a record that's older than 24 hours
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago

    const resignedEmployee = new ResignedEmployee({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      lastWorkingDay: new Date('2024-01-31'),
      createdAt: oldDate
    });

    await resignedEmployee.save();

    // Reload the record to see if it was auto-locked
    const updatedRecord = await ResignedEmployee.findById(resignedEmployee._id);

    expect(updatedRecord.isLocked).toBe(true);
    expect(updatedRecord.lockedDate).toBeDefined();
  });

  it('should convert numbers to Arabic numerals', () => {
    const arabic123 = ResignedEmployee.toArabicNumerals(123);
    expect(arabic123).toBe('١٢٣');

    const arabic0 = ResignedEmployee.toArabicNumerals(0);
    expect(arabic0).toBe('٠');

    const arabic1000 = ResignedEmployee.toArabicNumerals(1000);
    expect(arabic1000).toBe('١٠٠٠');
  });

  it('should handle letter generation with no penalties', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      tenantId: 'test_tenant_123',
      employee: employee._id,
      department: department._id,
      position: position._id,
      resignationType: 'resignation-letter',
      resignationReason: 'personal-reasons',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31')
    });

    const updatedRecord = await resignedEmployee.generateLetter(hrUser._id);

    expect(updatedRecord.letterGenerated).toBe(true);
    expect(updatedRecord.letterContent).toContain('TO WHOM IT MAY CONCERN');
    expect(updatedRecord.letterContent).not.toContain('Pending Penalties');
  });
});
