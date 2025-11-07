import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import PermissionAudit from '../../../models/permissionAudit.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('PermissionAudit Model', () => {
  afterEach(async () => {
    await PermissionAudit.deleteMany({});
  });

  it('should create a permission audit record with required fields', async () => {
    const auditData = {
      user: new mongoose.Types.ObjectId(),
      modifiedBy: new mongoose.Types.ObjectId(),
      action: 'permission-added',
      ipAddress: '192.168.1.1'
    };

    const audit = new PermissionAudit(auditData);
    const savedAudit = await audit.save();

    expect(savedAudit.user.toString()).toBe(auditData.user.toString());
    expect(savedAudit.modifiedBy.toString()).toBe(auditData.modifiedBy.toString());
    expect(savedAudit.action).toBe(auditData.action);
    expect(savedAudit.ipAddress).toBe(auditData.ipAddress);
    expect(savedAudit.timestamp).toBeDefined();
    expect(savedAudit._id).toBeDefined();
  });

  it('should fail to create audit record without required fields', async () => {
    const auditData = {
      action: 'permission-added'
      // Missing user, modifiedBy
    };

    const audit = new PermissionAudit(auditData);
    
    await expect(audit.save()).rejects.toThrow();
  });

  it('should only allow valid actions', async () => {
    const auditData = {
      user: new mongoose.Types.ObjectId(),
      modifiedBy: new mongoose.Types.ObjectId(),
      action: 'invalid-action', // Invalid action
      ipAddress: '192.168.1.1'
    };

    const audit = new PermissionAudit(auditData);
    
    await expect(audit.save()).rejects.toThrow();
  });
});