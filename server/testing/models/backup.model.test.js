import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Backup from '../../models/backup.model.js';

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

describe('Backup Model', () => {
  it('should create and save a backup configuration successfully', async () => {
    const backupData = {
      name: 'Daily Database Backup',
      description: 'Daily backup of all databases',
      backupType: 'database',
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '02:00'
      },
      settings: {
        encryption: {
          enabled: true,
          algorithm: 'aes-256-cbc'
        },
        compression: {
          enabled: true,
          level: 6
        },
        retention: {
          enabled: true,
          days: 30,
          maxBackups: 10
        }
      },
      sources: {
        databases: [{
          name: 'hrsm_db',
          collections: []
        }],
        filePaths: [],
        configFiles: []
      },
      storage: {
        location: './backups',
        maxSize: 1024
      },
      isActive: true,
      createdBy: new mongoose.Types.ObjectId()
    };

    const backup = new Backup(backupData);
    const savedBackup = await backup.save();

    expect(savedBackup._id).toBeDefined();
    expect(savedBackup.name).toBe(backupData.name);
    expect(savedBackup.description).toBe(backupData.description);
    expect(savedBackup.backupType).toBe(backupData.backupType);
    expect(savedBackup.schedule.enabled).toBe(backupData.schedule.enabled);
    expect(savedBackup.schedule.frequency).toBe(backupData.schedule.frequency);
    expect(savedBackup.schedule.time).toBe(backupData.schedule.time);
    expect(savedBackup.settings.encryption.enabled).toBe(backupData.settings.encryption.enabled);
    expect(savedBackup.settings.encryption.algorithm).toBe(backupData.settings.encryption.algorithm);
    expect(savedBackup.settings.compression.enabled).toBe(backupData.settings.compression.enabled);
    expect(savedBackup.settings.compression.level).toBe(backupData.settings.compression.level);
    expect(savedBackup.settings.retention.enabled).toBe(backupData.settings.retention.enabled);
    expect(savedBackup.settings.retention.days).toBe(backupData.settings.retention.days);
    expect(savedBackup.settings.retention.maxBackups).toBe(backupData.settings.retention.maxBackups);
    expect(savedBackup.sources.databases[0].name).toBe(backupData.sources.databases[0].name);
    expect(savedBackup.storage.location).toBe(backupData.storage.location);
    expect(savedBackup.storage.maxSize).toBe(backupData.storage.maxSize);
    expect(savedBackup.isActive).toBe(backupData.isActive);
    expect(savedBackup.createdBy.toString()).toBe(backupData.createdBy.toString());
  });

  it('should fail to create a backup configuration without required fields', async () => {
    const backupData = {
      description: 'Backup without required fields'
    };

    const backup = new Backup(backupData);
    
    let err;
    try {
      await backup.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.backupType).toBeDefined();
    expect(err.errors.createdBy).toBeDefined();
  });

  it('should validate backup type enum', async () => {
    const backupData = {
      name: 'Invalid Backup',
      backupType: 'invalid-type',
      createdBy: new mongoose.Types.ObjectId()
    };

    const backup = new Backup(backupData);
    
    let err;
    try {
      await backup.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.backupType).toBeDefined();
  });

  it('should calculate next run time for daily backup', async () => {
    const backupData = {
      name: 'Daily Backup',
      backupType: 'database',
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '02:00'
      },
      createdBy: new mongoose.Types.ObjectId()
    };

    const backup = new Backup(backupData);
    const savedBackup = await backup.save();

    const nextRun = savedBackup.calculateNextRun();
    expect(nextRun).toBeDefined();
    expect(nextRun instanceof Date).toBe(true);
  });

  it('should not calculate next run time for disabled schedule', async () => {
    const backupData = {
      name: 'Disabled Backup',
      backupType: 'database',
      schedule: {
        enabled: false
      },
      createdBy: new mongoose.Types.ObjectId()
    };

    const backup = new Backup(backupData);
    const savedBackup = await backup.save();

    const nextRun = savedBackup.calculateNextRun();
    expect(nextRun).toBeNull();
  });
});