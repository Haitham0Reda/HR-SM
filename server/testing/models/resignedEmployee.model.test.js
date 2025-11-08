import mongoose from 'mongoose';
import ResignedEmployee from '../../models/resignedEmployee.model.js';
import User from '../../models/user.model.js';
import Department from '../../models/department.model.js';
import Position from '../../models/position.model.js';

let employee;
let department;
let position;
let hrUser;

beforeAll(async () => {
  // Create required references
  department = await Department.create({
    name: 'Test Department',
    code: 'TEST'
  });
  
  position = await Position.create({
    title: 'Test Position',
    department: department._id
  });
  
  employee = await User.create({
    username: 'testemployee',
    email: 'employee@example.com',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP001',
    department: department._id,
    position: position._id,
    employment: {
      hireDate: new Date('2020-01-01'),
      employmentStatus: 'active'
    }
  });
  
  hrUser = await User.create({
    username: 'hruser',
    email: 'hr@example.com',
    password: 'password123',
    role: 'hr',
    employeeId: 'HR001'
  });
});

beforeEach(async () => {
  await ResignedEmployee.deleteMany({});
});

describe('ResignedEmployee Model', () => {
  it('should create a new resigned employee record with required fields', async () => {
    const resignationDate = new Date('2024-01-15');
    const lastWorkingDay = new Date('2024-01-31');
    
    const resignedEmployee = await ResignedEmployee.create({
      employee: employee._id,
      resignationType: 'resignation-letter',
      resignationDate: resignationDate,
      lastWorkingDay: lastWorkingDay,
      reason: 'Personal reasons'
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
        employee: employee._id,
        resignationType: type,
        lastWorkingDay: new Date('2024-01-31')
      });
      
      await expect(resignedEmployee.validate()).resolves.toBeUndefined();
    }
    
    // Test invalid type
    const invalidRecord = new ResignedEmployee({
      employee: employee._id,
      resignationType: 'invalid-type',
      lastWorkingDay: new Date('2024-01-31')
    });
    
    await expect(invalidRecord.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['pending', 'processed', 'archived'];
    
    for (const status of validStatuses) {
      const resignedEmployee = new ResignedEmployee({
        employee: employee._id,
        resignationType: 'resignation-letter',
        lastWorkingDay: new Date('2024-01-31'),
        status: status
      });
      
      await expect(resignedEmployee.validate()).resolves.toBeUndefined();
    }
    
    // Test invalid status
    const invalidRecord = new ResignedEmployee({
      employee: employee._id,
      resignationType: 'resignation-letter',
      lastWorkingDay: new Date('2024-01-31'),
      status: 'invalid-status'
    });
    
    await expect(invalidRecord.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate virtual properties correctly', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      employee: employee._id,
      resignationType: 'resignation-letter',
      lastWorkingDay: new Date('2024-01-31')
    });

    expect(resignedEmployee.totalPenaltyAmount).toBe(0);
    expect(resignedEmployee.canModify).toBe(true);
  });

  it('should add penalties to resigned employee record', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      employee: employee._id,
      resignationType: 'resignation-letter',
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
      employee: employee._id,
      resignationType: 'resignation-letter',
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
      employee: employee._id,
      resignationType: 'resignation-letter',
      lastWorkingDay: new Date('2024-01-31'),
      isLocked: true
    });

    const penaltyData = {
      description: 'Test penalty',
      amount: 100
    };
    
    await expect(resignedEmployee.addPenalty(penaltyData, hrUser._id))
      .rejects.toThrow('Cannot modify penalties after 24 hours');
      
    await expect(resignedEmployee.removePenalty(new mongoose.Types.ObjectId()))
      .rejects.toThrow('Cannot modify penalties after 24 hours');
  });

  it('should update resignation type', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      employee: employee._id,
      resignationType: 'resignation-letter',
      lastWorkingDay: new Date('2024-01-31')
    });

    const updatedRecord = await resignedEmployee.updateResignationType('termination');
    
    expect(updatedRecord.resignationType).toBe('termination');
  });

  it('should lock resigned employee record', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      employee: employee._id,
      resignationType: 'resignation-letter',
      lastWorkingDay: new Date('2024-01-31')
    });

    const updatedRecord = await resignedEmployee.lock();
    
    expect(updatedRecord.isLocked).toBe(true);
    expect(updatedRecord.lockedDate).toBeDefined();
    expect(updatedRecord.canModify).toBe(false);
  });

  it('should generate resignation letter', async () => {
    const resignedEmployee = await ResignedEmployee.create({
      employee: employee._id,
      resignationType: 'resignation-letter',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31'),
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
      employee: employee._id,
      resignationType: 'termination',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31')
    });

    const updatedRecord = await resignedEmployee.generateLetter(hrUser._id);
    
    expect(updatedRecord.letterGenerated).toBe(true);
    expect(updatedRecord.letterGeneratedDate).toBeDefined();
    expect(updatedRecord.letterGeneratedBy.toString()).toBe(hrUser._id.toString());
    expect(updatedRecord.letterContent).toContain('TO WHOM IT MAY CONCERN');
    expect(updatedRecord.letterContent).toContain('terminated');
  });

  it('should find all resigned employees', async () => {
    await ResignedEmployee.create([
      {
        employee: employee._id,
        resignationType: 'resignation-letter',
        lastWorkingDay: new Date('2024-01-31'),
        status: 'pending'
      },
      {
        employee: employee._id,
        resignationType: 'termination',
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
      employee: employee._id,
      resignationType: 'resignation-letter',
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
      employee: employee._id,
      resignationType: 'resignation-letter',
      resignationDate: new Date('2024-01-15'),
      lastWorkingDay: new Date('2024-01-31')
    });

    const updatedRecord = await resignedEmployee.generateLetter(hrUser._id);
    
    expect(updatedRecord.letterGenerated).toBe(true);
    expect(updatedRecord.letterContent).toContain('TO WHOM IT MAY CONCERN');
    expect(updatedRecord.letterContent).not.toContain('Pending Penalties');
  });
});