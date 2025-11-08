import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Permission from '../../models/permission.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Permission Model', () => {
  it('should create and save a permission request successfully', async () => {
    const permissionData = {
      employee: new mongoose.Types.ObjectId(),
      permissionType: 'late-arrival',
      date: new Date(), // Use current date
      time: {
        scheduled: '09:00',
        requested: '10:30'
      },
      reason: 'Traffic delay caused late arrival to office',
      status: 'pending'
    };

    const permission = new Permission(permissionData);
    const savedPermission = await permission.save();

    expect(savedPermission._id).toBeDefined();
    expect(savedPermission.employee.toString()).toBe(permissionData.employee.toString());
    expect(savedPermission.permissionType).toBe(permissionData.permissionType);
    expect(savedPermission.date.toISOString().split('T')[0]).toBe(permissionData.date.toISOString().split('T')[0]);
    expect(savedPermission.time.scheduled).toBe(permissionData.time.scheduled);
    expect(savedPermission.time.requested).toBe(permissionData.time.requested);
    expect(savedPermission.reason).toBe(permissionData.reason);
    expect(savedPermission.status).toBe(permissionData.status);
  });

  it('should fail to create a permission request without required fields', async () => {
    const permissionData = {
      reason: 'Permission without required fields'
    };

    const permission = new Permission(permissionData);
    
    let err;
    try {
      await permission.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.employee).toBeDefined();
    expect(err.errors.permissionType).toBeDefined();
    expect(err.errors.date).toBeDefined();
    expect(err.errors['time.scheduled']).toBeDefined();
    expect(err.errors['time.requested']).toBeDefined();
    // The reason field is provided in our test data, so it shouldn't have an error
  });

  it('should validate reason length', async () => {
    const permissionData = {
      employee: new mongoose.Types.ObjectId(),
      permissionType: 'late-arrival',
      date: new Date(),
      time: {
        scheduled: '09:00',
        requested: '10:30'
      },
      reason: 'Short' // Too short, minimum 10 characters
    };

    const permission = new Permission(permissionData);
    
    let err;
    try {
      await permission.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.reason).toBeDefined();
  });

  it('should approve permission request', async () => {
    const permissionData = {
      employee: new mongoose.Types.ObjectId(),
      permissionType: 'late-arrival',
      date: new Date(),
      time: {
        scheduled: '09:00',
        requested: '10:30'
      },
      reason: 'Traffic delay caused late arrival to office',
      status: 'pending'
    };

    const permission = new Permission(permissionData);
    const savedPermission = await permission.save();

    const supervisorId = new mongoose.Types.ObjectId();
    await savedPermission.approve(supervisorId, 'Approved due to valid reason');

    expect(savedPermission.status).toBe('approved');
    expect(savedPermission.approval.reviewedBy.toString()).toBe(supervisorId.toString());
    expect(savedPermission.approval.reviewedAt).toBeDefined();
    expect(savedPermission.approval.comments).toBe('Approved due to valid reason');
  });

  it('should reject permission request', async () => {
    const permissionData = {
      employee: new mongoose.Types.ObjectId(),
      permissionType: 'early-departure',
      date: new Date(),
      time: {
        scheduled: '17:00',
        requested: '15:00'
      },
      reason: 'Need to leave early for personal appointment',
      status: 'pending'
    };

    const permission = new Permission(permissionData);
    const savedPermission = await permission.save();

    const supervisorId = new mongoose.Types.ObjectId();
    await savedPermission.reject(supervisorId, 'Early departure not justified');

    expect(savedPermission.status).toBe('rejected');
    expect(savedPermission.approval.reviewedBy.toString()).toBe(supervisorId.toString());
    expect(savedPermission.approval.reviewedAt).toBeDefined();
    expect(savedPermission.rejection.reason).toBe('Early departure not justified');
    expect(savedPermission.rejection.rejectedAt).toBeDefined();
  });
});