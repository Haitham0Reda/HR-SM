import mongoose from 'mongoose';
import BackupExecution from '../../modules/hr-core/backup/models/backupExecution.model.js';
import Backup from '../../modules/hr-core/backup/models/backup.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
// organization model removed - not needed for general HR system

let backup;
let user;
// organization variable removed
beforeAll(async () => {
  // Create a organization first
  organization = await organization.create({
    organizationCode: 'ENG',
    name: 'organization of Engineering',
    arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  });
});

beforeEach(async () => {
  // Create a user for reference (in beforeEach because the global afterEach clears all data)
  user = await User.create({
      tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin',
    employeeId: 'EMP001': organization._id
  });

  // Create a backup for reference
  backup = await Backup.create({
    name: 'Test Backup',
    backupType: 'database',
    createdBy: user._id
  });
});

afterAll(async () => {
  // Clean up test data
});

describe('BackupExecution Model', () => {
  it('should create a new backup execution with default values', async () => {
    const backupExecution = await BackupExecution.create({
      backup: backup._id,
      backupName: 'Test Backup'
    });

    expect(backupExecution.backup.toString()).toBe(backup._id.toString());
    expect(backupExecution.backupName).toBe('Test Backup');
    expect(backupExecution.executionType).toBe('manual');
    expect(backupExecution.status).toBe('pending');
    expect(backupExecution.isEncrypted).toBe(false);
    expect(backupExecution.verified).toBe(false);
    expect(backupExecution.notificationSent).toBe(false);
  });

  it('should validate executionType enum values', async () => {
    const validTypes = ['manual', 'scheduled', 'api'];

    for (const type of validTypes) {
      const backupExecution = new BackupExecution({
        backup: backup._id,
        executionType: type
      });

      await expect(backupExecution.validate()).resolves.toBeUndefined();
    }

    // Test invalid type
    const invalidExecution = new BackupExecution({
      backup: backup._id,
      executionType: 'invalid'
    });

    await expect(invalidExecution.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];

    for (const status of validStatuses) {
      const backupExecution = new BackupExecution({
        backup: backup._id,
        status: status
      });

      await expect(backupExecution.validate()).resolves.toBeUndefined();
    }

    // Test invalid status
    const invalidExecution = new BackupExecution({
      backup: backup._id,
      status: 'invalid'
    });

    await expect(invalidExecution.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should mark execution as completed with result data', async () => {
    const startTime = new Date();
    const backupExecution = await BackupExecution.create({
      backup: backup._id,
      startTime: startTime
    });

    // Wait a bit to ensure duration calculation
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = {
      backupFile: 'backup-file.zip',
      backupPath: '/backups/',
      backupSize: 1024,
      compressedSize: 512,
      compressionRatio: 0.5,
      isEncrypted: true,
      encryptionAlgorithm: 'AES-256',
      itemsBackedUp: {
        databases: 1,
        collections: 5,
        documents: 100,
        files: 10,
        totalSize: 2048
      },
      checksum: 'abc123'
    };

    const updatedExecution = await backupExecution.markCompleted(result);

    expect(updatedExecution.status).toBe('completed');
    expect(updatedExecution.endTime).toBeDefined();
    expect(updatedExecution.duration).toBeGreaterThan(0);
    expect(updatedExecution.backupFile).toBe('backup-file.zip');
    expect(updatedExecution.backupSize).toBe(1024);
    expect(updatedExecution.isEncrypted).toBe(true);
    expect(updatedExecution.encryptionAlgorithm).toBe('AES-256');
    expect(updatedExecution.checksum).toBe('abc123');
  });

  it('should mark execution as failed with error data', async () => {
    const startTime = new Date();
    const backupExecution = await BackupExecution.create({
      backup: backup._id,
      startTime: startTime
    });

    // Wait a bit to ensure duration calculation
    await new Promise(resolve => setTimeout(resolve, 10));

    const error = new Error('Backup failed');
    error.code = 'BACKUP_ERROR';
    error.stack = 'Error stack trace';

    const updatedExecution = await backupExecution.markFailed(error);

    expect(updatedExecution.status).toBe('failed');
    expect(updatedExecution.endTime).toBeDefined();
    expect(updatedExecution.duration).toBeGreaterThan(0);
    expect(updatedExecution.error.message).toBe('Backup failed');
    expect(updatedExecution.error.code).toBe('BACKUP_ERROR');
    expect(updatedExecution.error.stack).toBe('Error stack trace');
  });

  it('should populate triggeredBy field with user reference', async () => {
    const backupExecution = await BackupExecution.create({
      backup: backup._id,
      triggeredBy: user._id
    });

    const populatedExecution = await BackupExecution.findById(backupExecution._id)
      .populate('triggeredBy', 'username email');

    expect(populatedExecution.triggeredBy).toBeDefined();
    expect(populatedExecution.triggeredBy.username).toBe('testuser');
    expect(populatedExecution.triggeredBy.email).toBe('test@example.com');
  });

  it('should get execution history for a backup', async () => {
    // Create multiple executions
    await BackupExecution.create([
      { backup: backup._id, status: 'completed' },
      { backup: backup._id, status: 'failed' },
      { backup: backup._id, status: 'completed' }
    ]);

    const history = await BackupExecution.getHistory(backup._id);

    expect(history).toHaveLength(3);
    // Check that they are sorted by createdAt descending
    expect(history[0].createdAt.getTime()).toBeGreaterThanOrEqual(history[1].createdAt.getTime());
  });

  it('should get statistics for backup executions', async () => {
    // Create multiple executions with different statuses
    await BackupExecution.create([
      { backup: backup._id, status: 'completed', duration: 1000, backupSize: 1024 },
      { backup: backup._id, status: 'completed', duration: 2000, backupSize: 2048 },
      { backup: backup._id, status: 'failed', duration: 500, backupSize: 512 }
    ]);

    const stats = await BackupExecution.getStatistics(backup._id);

    expect(stats).toHaveLength(2); // completed and failed

    const completedStats = stats.find(s => s._id === 'completed');
    const failedStats = stats.find(s => s._id === 'failed');

    expect(completedStats.count).toBe(2);
    expect(completedStats.avgDuration).toBe(1500); // (1000 + 2000) / 2
    expect(completedStats.totalSize).toBe(3072); // 1024 + 2048

    expect(failedStats.count).toBe(1);
    expect(failedStats.avgDuration).toBe(500);
    expect(failedStats.totalSize).toBe(512);
  });

  it('should mark execution as verified', async () => {
    const backupExecution = await BackupExecution.create({
      backup: backup._id,
      status: 'completed'
    });

    const updatedExecution = await backupExecution.markVerified(user._id);

    expect(updatedExecution.verified).toBe(true);
    expect(updatedExecution.verifiedBy.toString()).toBe(user._id.toString());
    expect(updatedExecution.verifiedAt).toBeDefined();
  });

  it('should mark execution as cancelled', async () => {
    const backupExecution = await BackupExecution.create({
      backup: backup._id,
      status: 'pending'
    });

    const updatedExecution = await backupExecution.markCancelled(user._id, 'Manual cancellation');

    expect(updatedExecution.status).toBe('cancelled');
    expect(updatedExecution.cancelledBy.toString()).toBe(user._id.toString());
    expect(updatedExecution.cancellationReason).toBe('Manual cancellation');
    expect(updatedExecution.cancelledAt).toBeDefined();
  });
});