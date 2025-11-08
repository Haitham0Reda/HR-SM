import mongoose from 'mongoose';
import IDCardBatch from '../../models/idCardBatch.model.js';
import User from '../../models/user.model.js';
import Department from '../../models/department.model.js';

let user;
let department;

beforeAll(async () => {
  // Create required references
  department = await Department.create({
    name: 'Test Department',
    code: 'TEST'
  });
  
  user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin',
    employeeId: 'EMP001'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await IDCardBatch.deleteMany({});
});

describe('IDCardBatch Model', () => {
  it('should create a new ID card batch with required fields', async () => {
    const batch = await IDCardBatch.create({
      batchNumber: 'BATCH001',
      name: 'Test Batch',
      batchType: 'new-hire',
      createdBy: user._id
    });

    expect(batch.batchNumber).toBe('BATCH001');
    expect(batch.name).toBe('Test Batch');
    expect(batch.batchType).toBe('new-hire');
    expect(batch.createdBy.toString()).toBe(user._id.toString());
    expect(batch.status).toBe('pending');
  });

  it('should validate batchType enum values', async () => {
    const validTypes = ['new-hire', 'renewal', 'replacement', 'all-employees', 'department', 'custom'];
    
    for (const type of validTypes) {
      const batch = new IDCardBatch({
        batchNumber: `BATCH${Math.floor(Math.random() * 1000)}`,
        name: 'Test Batch',
        batchType: type,
        createdBy: user._id
      });
      
      await expect(batch.validate()).resolves.toBeUndefined();
    }
    
    // Test invalid type
    const invalidBatch = new IDCardBatch({
      batchNumber: 'BATCH002',
      name: 'Invalid Batch',
      batchType: 'invalid',
      createdBy: user._id
    });
    
    await expect(invalidBatch.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['pending', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'partially-completed'];
    
    for (const status of validStatuses) {
      const batch = new IDCardBatch({
        batchNumber: `BATCH${Math.floor(Math.random() * 1000)}`,
        name: 'Test Batch',
        batchType: 'new-hire',
        status: status,
        createdBy: user._id
      });
      
      await expect(batch.validate()).resolves.toBeUndefined();
    }
    
    // Test invalid status
    const invalidBatch = new IDCardBatch({
      batchNumber: 'BATCH003',
      name: 'Invalid Batch',
      batchType: 'new-hire',
      status: 'invalid',
      createdBy: user._id
    });
    
    await expect(invalidBatch.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate virtual properties correctly', async () => {
    const batch = await IDCardBatch.create({
      batchNumber: 'BATCH004',
      name: 'Test Batch',
      batchType: 'new-hire',
      createdBy: user._id,
      'processing.totalCards': 100,
      'processing.processedCards': 50,
      'processing.successfulCards': 45,
      'processing.failedCards': 5
    });

    expect(batch.completionPercentage).toBe(50);
    expect(batch.isComplete).toBe(false);
    expect(batch.hasFailures).toBe(true);
  });

  it('should start batch processing', async () => {
    const batch = await IDCardBatch.create({
      batchNumber: 'BATCH005',
      name: 'Test Batch',
      batchType: 'new-hire',
      createdBy: user._id
    });

    const startedBatch = await batch.start();
    
    expect(startedBatch.status).toBe('processing');
    expect(startedBatch.processing.startedAt).toBeDefined();
    expect(startedBatch.processing.totalCards).toBe(0);
  });

  it('should update batch progress', async () => {
    const batch = await IDCardBatch.create({
      batchNumber: 'BATCH006',
      name: 'Test Batch',
      batchType: 'new-hire',
      createdBy: user._id
    });

    const updatedBatch = await batch.updateProgress(10, 8, 2);
    
    expect(updatedBatch.processing.processedCards).toBe(10);
    expect(updatedBatch.processing.successfulCards).toBe(8);
    expect(updatedBatch.processing.failedCards).toBe(2);
  });

  it('should add failure to batch', async () => {
    const batch = await IDCardBatch.create({
      batchNumber: 'BATCH007',
      name: 'Test Batch',
      batchType: 'new-hire',
      createdBy: user._id
    });

    const employee = await User.create({
      username: 'employee1',
      email: 'employee1@example.com',
      password: 'password123',
      role: 'employee',
      employeeId: 'EMP002'
    });

    const updatedBatch = await batch.addFailure(
      new mongoose.Types.ObjectId(),
      employee._id,
      'Printer error',
      'PRINTER_ERROR'
    );
    
    expect(updatedBatch.failures).toHaveLength(1);
    expect(updatedBatch.failures[0].employee.toString()).toBe(employee._id.toString());
    expect(updatedBatch.failures[0].errorMessage).toBe('Printer error');
    expect(updatedBatch.failures[0].errorCode).toBe('PRINTER_ERROR');
  });

  it('should complete batch successfully', async () => {
    const batch = await IDCardBatch.create({
      batchNumber: 'BATCH008',
      name: 'Test Batch',
      batchType: 'new-hire',
      createdBy: user._id,
      'processing.startedAt': new Date(Date.now() - 10000), // 10 seconds ago
      'processing.totalCards': 10,
      'processing.processedCards': 10,
      'processing.successfulCards': 10,
      'processing.failedCards': 0
    });

    const completedBatch = await batch.complete();
    
    expect(completedBatch.status).toBe('completed');
    expect(completedBatch.processing.completedAt).toBeDefined();
  });
});