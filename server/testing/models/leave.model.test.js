import mongoose from 'mongoose';
import Leave from '../../models/leave.model.js';

describe('Leave Model', () => {
  it('should create and save a leave request successfully', async () => {
    // Use a future date to avoid "Start date cannot be in the past" error
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const endDate = new Date(futureDate);
    endDate.setDate(futureDate.getDate() + 5);
    
    const leaveData = {
      employee: new mongoose.Types.ObjectId(),
      leaveType: 'annual',
      startDate: futureDate,
      endDate: endDate,
      duration: 5,
      reason: 'Annual vacation trip with family',
      status: 'pending'
    };

    const leave = new Leave(leaveData);
    const savedLeave = await leave.save();

    expect(savedLeave._id).toBeDefined();
    expect(savedLeave.employee.toString()).toBe(leaveData.employee.toString());
    expect(savedLeave.leaveType).toBe(leaveData.leaveType);
    expect(savedLeave.startDate.toISOString()).toBe(leaveData.startDate.toISOString());
    expect(savedLeave.endDate.toISOString()).toBe(leaveData.endDate.toISOString());
    expect(savedLeave.duration).toBe(leaveData.duration);
    expect(savedLeave.reason).toBe(leaveData.reason);
    expect(savedLeave.status).toBe(leaveData.status);
  });

  it('should fail to create a leave request without required fields', async () => {
    const leaveData = {
      reason: 'Leave without required fields'
    };

    const leave = new Leave(leaveData);
    
    let err;
    try {
      await leave.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.employee).toBeDefined();
    expect(err.errors.leaveType).toBeDefined();
    expect(err.errors.startDate).toBeDefined();
    expect(err.errors.endDate).toBeDefined();
    expect(err.errors.duration).toBeDefined();
    // The reason field is provided in our test data, so it shouldn't have an error
  });

  it('should validate that endDate is after startDate', async () => {
    const leaveData = {
      employee: new mongoose.Types.ObjectId(),
      leaveType: 'annual',
      startDate: new Date('2023-06-05'),
      endDate: new Date('2023-06-01'), // End date before start date
      duration: 5,
      reason: 'Invalid leave dates'
    };

    const leave = new Leave(leaveData);
    
    let err;
    try {
      await leave.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.endDate).toBeDefined();
  });

  it('should validate reason length', async () => {
    const leaveData = {
      employee: new mongoose.Types.ObjectId(),
      leaveType: 'annual',
      startDate: new Date('2023-06-01'),
      endDate: new Date('2023-06-05'),
      duration: 5,
      reason: 'Short' // Too short, minimum 10 characters
    };

    const leave = new Leave(leaveData);
    
    let err;
    try {
      await leave.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.reason).toBeDefined();
  });

  it('should approve leave by supervisor', async () => {
    // Use a future date to avoid "Start date cannot be in the past" error
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const endDate = new Date(futureDate);
    endDate.setDate(futureDate.getDate() + 5);
    
    const leaveData = {
      employee: new mongoose.Types.ObjectId(),
      leaveType: 'annual',
      startDate: futureDate,
      endDate: endDate,
      duration: 5,
      reason: 'Annual vacation trip with family',
      status: 'pending'
    };

    const leave = new Leave(leaveData);
    const savedLeave = await leave.save();

    const supervisorId = new mongoose.Types.ObjectId();
    await savedLeave.approveBySupervisor(supervisorId, 'Approved for vacation');

    expect(savedLeave.status).toBe('approved');
    expect(savedLeave.workflow.supervisorApprovalStatus).toBe('approved');
    expect(savedLeave.workflow.currentStep).toBe('completed');
    expect(savedLeave.approvedBy.toString()).toBe(supervisorId.toString());
    expect(savedLeave.approvedAt).toBeDefined();
  });
});