import mongoose from 'mongoose';
import PermissionAudit from '../../platform/system/models/permissionAudit.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
// organization model removed - not needed for general HR system

let user;
let adminUser;
// organization variable removed
beforeAll(async () => {
  // Create a organization for testing with valid enum values
  // organization = await organization.create({
  //   organizationCode: 'ENG',
  //   name: 'organization of Engineering',
  //   arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  // });
});

beforeEach(async () => {
  await PermissionAudit.deleteMany({});

  // Create users for testing (in beforeEach because the global afterEach clears all data)
  user = await User.create({
    tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP001'
    // organization._id removed as not needed
  });

  adminUser = await User.create({
    tenantId: 'test_tenant_123',
    username: 'adminuser',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    employeeId: 'EMP002'
    // organization._id removed as not needed
  });
});

describe('PermissionAudit Model', () => {
  it('should create a new permission audit record with required fields', async () => {
    const auditRecord = await PermissionAudit.create({
      user: user._id,
      modifiedBy: adminUser._id,
      action: 'permission-added',
      changes: {
        permissionsAdded: ['reports.view', 'reports.export']
      },
      reason: 'Granting access for quarterly reporting',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    expect(auditRecord.user.toString()).toBe(user._id.toString());
    expect(auditRecord.modifiedBy.toString()).toBe(adminUser._id.toString());
    expect(auditRecord.action).toBe('permission-added');
    expect(auditRecord.changes.permissionsAdded).toEqual(['reports.view', 'reports.export']);
    expect(auditRecord.reason).toBe('Granting access for quarterly reporting');
    expect(auditRecord.ipAddress).toBe('192.168.1.100');
  });

  it('should validate action enum values', async () => {
    const validActions = ['role-change', 'permission-added', 'permission-removed', 'permission-reset'];

    for (const action of validActions) {
      const auditRecord = new PermissionAudit({
        user: user._id,
        modifiedBy: adminUser._id,
        action: action,
        changes: {}
      });

      await expect(auditRecord.validate()).resolves.toBeUndefined();
    }

    // Test invalid action
    const invalidRecord = new PermissionAudit({
      user: user._id,
      modifiedBy: adminUser._id,
      action: 'invalid-action',
      changes: {}
    });

    await expect(invalidRecord.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should log a permission change', async () => {
    const changeData = {
      user: user._id,
      modifiedBy: adminUser._id,
      action: 'role-change',
      changes: {
        previousRole: 'employee',
        newRole: 'manager'
      },
      reason: 'Promotion to team manager',
      ipAddress: '192.168.1.100'
    };

    const loggedChange = await PermissionAudit.logChange(changeData);

    expect(loggedChange.user.toString()).toBe(user._id.toString());
    expect(loggedChange.action).toBe('role-change');
    expect(loggedChange.changes.previousRole).toBe('employee');
    expect(loggedChange.changes.newRole).toBe('manager');
  });

  it('should get user\'s audit trail', async () => {
    // Create multiple audit records for the user
    await PermissionAudit.create([
      {
        user: user._id,
        modifiedBy: adminUser._id,
        action: 'permission-added',
        changes: { permissionsAdded: ['reports.view'] },
        reason: 'Initial access grant',
        ipAddress: '192.168.1.100'
      },
      {
        user: user._id,
        modifiedBy: adminUser._id,
        action: 'permission-added',
        changes: { permissionsAdded: ['reports.export'] },
        reason: 'Additional access for exports',
        ipAddress: '192.168.1.100'
      }
    ]);

    const auditTrail = await PermissionAudit.getUserAuditTrail(user._id);

    expect(auditTrail).toHaveLength(2);
    // Check that modifiedBy is populated
    expect(auditTrail[0].modifiedBy).toBeDefined();
    expect(auditTrail[0].modifiedBy.username).toBe('adminuser');
  });

  it('should get recent permission changes', async () => {
    // Create audit records with different timestamps
    const recentDate = new Date();
    const oldDate = new Date(recentDate.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago

    await PermissionAudit.create([
      {
        user: user._id,
        modifiedBy: adminUser._id,
        action: 'permission-added',
        changes: { permissionsAdded: ['reports.view'] },
        timestamp: recentDate
      },
      {
        user: user._id,
        modifiedBy: adminUser._id,
        action: 'permission-removed',
        changes: { permissionsRemoved: ['reports.export'] },
        timestamp: oldDate
      }
    ]);

    // Get changes from last 30 days
    const recentChanges = await PermissionAudit.getRecentChanges(30);

    expect(recentChanges).toHaveLength(1);
    expect(recentChanges[0].action).toBe('permission-added');
    expect(recentChanges[0].changes.permissionsAdded).toEqual(['reports.view']);

    // Check that both user and modifiedBy are populated
    expect(recentChanges[0].user).toBeDefined();
    expect(recentChanges[0].user.username).toBe('testuser');
    expect(recentChanges[0].modifiedBy).toBeDefined();
    expect(recentChanges[0].modifiedBy.username).toBe('adminuser');
  });

  it('should handle role change audit records', async () => {
    const auditRecord = await PermissionAudit.create({
      user: user._id,
      modifiedBy: adminUser._id,
      action: 'role-change',
      changes: {
        previousRole: 'employee',
        newRole: 'hr'
      },
      reason: 'HR department transfer',
      ipAddress: '192.168.1.100'
    });

    expect(auditRecord.action).toBe('role-change');
    expect(auditRecord.changes.previousRole).toBe('employee');
    expect(auditRecord.changes.newRole).toBe('hr');
  });

  it('should handle permission reset audit records', async () => {
    const auditRecord = await PermissionAudit.create({
      user: user._id,
      modifiedBy: adminUser._id,
      action: 'permission-reset',
      changes: {
        addedPermissions: ['reports.view', 'reports.export'],
        removedPermissions: ['basic.view']
      },
      reason: 'Security policy reset',
      ipAddress: '192.168.1.100'
    });

    expect(auditRecord.action).toBe('permission-reset');
    expect(auditRecord.changes.addedPermissions).toEqual(['reports.view', 'reports.export']);
    expect(auditRecord.changes.removedPermissions).toEqual(['basic.view']);
  });
});