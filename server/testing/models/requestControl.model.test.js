import mongoose from 'mongoose';
import RequestControl from '../../modules/hr-core/requests/models/requestControl.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
// organization model removed - not needed for general HR system

let user;
// organization variable removed
beforeAll(async () => {
  // Create required references
  // organization variable removed
  // organization = await organization.create({
  //   name: 'organization of Engineering',
  //   code: 'ENG',
  //   arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  // });

  user = await User.create({
    tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin',
    employeeId: 'EMP001'
    // organization._id removed as not needed
  });
});

beforeEach(async () => {
  await RequestControl.deleteMany({});
});

describe('RequestControl Model', () => {
  it('should create a new request control with default values', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    expect(control.organization).toBe('test-org');
    expect(control.systemWide.enabled).toBe(true);
    expect(control.vacationRequests.enabled).toBe(true);
    expect(control.permissionRequests.enabled).toBe(true);
    expect(control.sickLeave.enabled).toBe(true);
    expect(control.missionRequests.enabled).toBe(true);
    expect(control.forgotCheck.enabled).toBe(true);
    expect(control.isActive).toBe(true);
  });

  it('should calculate virtual properties correctly', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    expect(control.hasDisabledRequests).toBe(false);
    expect(control.disabledCount).toBe(0);

    // Disable a request type and check virtuals again
    control.vacationRequests.enabled = false;
    await control.save();

    expect(control.hasDisabledRequests).toBe(true);
    expect(control.disabledCount).toBe(1);
  });

  it('should disable system-wide requests', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    const customMessage = 'System maintenance in progress';
    const reason = 'Scheduled maintenance';

    const updatedControl = await control.disableSystemWide(user._id, customMessage, reason);

    expect(updatedControl.systemWide.enabled).toBe(false);
    expect(updatedControl.systemWide.disabledBy.toString()).toBe(user._id.toString());
    expect(updatedControl.systemWide.disabledAt).toBeDefined();
    expect(updatedControl.systemWide.reason).toBe(reason);
    expect(updatedControl.systemWide.disabledMessage).toBe(customMessage);

    // Check change history
    expect(updatedControl.changeHistory).toHaveLength(1);
    expect(updatedControl.changeHistory[0].requestType).toBe('system-wide');
    expect(updatedControl.changeHistory[0].action).toBe('disabled');
    expect(updatedControl.changeHistory[0].reason).toBe(reason);
  });

  it('should enable system-wide requests', async () => {
    const control = await RequestControl.create({
      organization: 'test-org',
      systemWide: {
        enabled: false,
        disabledBy: user._id,
        disabledAt: new Date()
      }
    });

    const reason = 'Maintenance completed';
    const updatedControl = await control.enableSystemWide(user._id, reason);

    expect(updatedControl.systemWide.enabled).toBe(true);
    expect(updatedControl.systemWide.enabledBy.toString()).toBe(user._id.toString());
    expect(updatedControl.systemWide.enabledAt).toBeDefined();
    expect(updatedControl.systemWide.reason).toBe(reason);

    // Check change history
    expect(updatedControl.changeHistory).toHaveLength(1);
    expect(updatedControl.changeHistory[0].requestType).toBe('system-wide');
    expect(updatedControl.changeHistory[0].action).toBe('enabled');
    expect(updatedControl.changeHistory[0].reason).toBe(reason);
  });

  it('should disable specific request types', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    const customMessage = 'Vacation requests temporarily disabled';
    const reason = 'Annual leave policy update';

    const updatedControl = await control.disableRequestType('vacation', user._id, customMessage, reason);

    expect(updatedControl.vacationRequests.enabled).toBe(false);
    expect(updatedControl.vacationRequests.disabledBy.toString()).toBe(user._id.toString());
    expect(updatedControl.vacationRequests.disabledAt).toBeDefined();
    expect(updatedControl.vacationRequests.reason).toBe(reason);
    expect(updatedControl.vacationRequests.disabledMessage).toBe(customMessage);

    // Check change history
    expect(updatedControl.changeHistory).toHaveLength(1);
    expect(updatedControl.changeHistory[0].requestType).toBe('vacation');
    expect(updatedControl.changeHistory[0].action).toBe('disabled');
    expect(updatedControl.changeHistory[0].reason).toBe(reason);
  });

  it('should enable specific request types', async () => {
    const control = await RequestControl.create({
      organization: 'test-org',
      vacationRequests: {
        enabled: false,
        disabledBy: user._id,
        disabledAt: new Date()
      }
    });

    const reason = 'Vacation policy update completed';
    const updatedControl = await control.enableRequestType('vacation', user._id, reason);

    expect(updatedControl.vacationRequests.enabled).toBe(true);
    expect(updatedControl.vacationRequests.enabledBy.toString()).toBe(user._id.toString());
    expect(updatedControl.vacationRequests.enabledAt).toBeDefined();
    expect(updatedControl.vacationRequests.reason).toBe(reason);

    // Check change history
    expect(updatedControl.changeHistory).toHaveLength(1);
    expect(updatedControl.changeHistory[0].requestType).toBe('vacation');
    expect(updatedControl.changeHistory[0].action).toBe('enabled');
    expect(updatedControl.changeHistory[0].reason).toBe(reason);
  });

  it('should reject invalid request types', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    await expect(control.disableRequestType('invalid-type', user._id))
      .rejects.toThrow('Invalid request type: invalid-type');

    await expect(control.enableRequestType('invalid-type', user._id))
      .rejects.toThrow('Invalid request type: invalid-type');
  });

  it('should check if requests are allowed', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    // System-wide enabled, all request types enabled
    let result = control.isRequestAllowed('vacation');
    expect(result.allowed).toBe(true);
    expect(result.message).toBe('');

    // Disable system-wide
    control.systemWide.enabled = false;
    control.systemWide.disabledMessage = 'System disabled';
    await control.save();

    result = control.isRequestAllowed('vacation');
    expect(result.allowed).toBe(false);
    expect(result.message).toBe('System disabled');

    // Re-enable system-wide, disable specific type
    control.systemWide.enabled = true;
    control.vacationRequests.enabled = false;
    control.vacationRequests.disabledMessage = 'Vacation requests disabled';
    await control.save();

    result = control.isRequestAllowed('vacation');
    expect(result.allowed).toBe(false);
    expect(result.message).toBe('Vacation requests disabled');

    // Check allowed request type
    result = control.isRequestAllowed('permission');
    expect(result.allowed).toBe(true);
    expect(result.message).toBe('');
  });

  it('should get disabled requests', async () => {
    const control = await RequestControl.create({
      organization: 'test-org',
      systemWide: {
        enabled: false,
        disabledMessage: 'System disabled',
        disabledBy: user._id,
        disabledAt: new Date(),
        reason: 'Maintenance'
      },
      vacationRequests: {
        enabled: false,
        disabledMessage: 'Vacation disabled',
        disabledBy: user._id,
        disabledAt: new Date(),
        reason: 'Policy update'
      }
    });

    const disabledRequests = control.getDisabledRequests();

    expect(disabledRequests).toHaveLength(2);

    const systemWideDisabled = disabledRequests.find(r => r.type === 'system-wide');
    const vacationDisabled = disabledRequests.find(r => r.type === 'vacation');

    expect(systemWideDisabled).toBeDefined();
    expect(systemWideDisabled.message).toBe('System disabled');
    expect(vacationDisabled).toBeDefined();
    expect(vacationDisabled.message).toBe('Vacation disabled');
  });

  it('should get or create control configuration', async () => {
    // First call should create new control
    const control1 = await RequestControl.getControl('test-org');

    expect(control1.organization).toBe('test-org');

    // Second call should return existing control
    const control2 = await RequestControl.getControl('test-org');

    expect(control2._id.toString()).toBe(control1._id.toString());
  });

  it('should check if request is allowed (static method)', async () => {
    await RequestControl.create({
      organization: 'test-org',
      vacationRequests: {
        enabled: false,
        disabledMessage: 'Vacation requests disabled'
      }
    });

    const result = await RequestControl.checkRequestAllowed('vacation', 'test-org');

    expect(result.allowed).toBe(false);
    expect(result.message).toBe('Vacation requests disabled');
  });

  it('should get change history', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    // Add some changes
    await control.disableRequestType('vacation', user._id, null, 'Test reason 1');
    await control.disableRequestType('permission', user._id, null, 'Test reason 2');

    const history = await RequestControl.getChangeHistory('test-org');

    expect(history).toHaveLength(2);
    // Should be sorted by changedAt descending (newest first)
    expect(history[0].changedAt.getTime()).toBeGreaterThanOrEqual(history[1].changedAt.getTime());
    expect(history[0].requestType).toBe('permission');
    expect(history[1].requestType).toBe('vacation');
  });

  it('should get control statistics', async () => {
    await RequestControl.create({
      organization: 'test-org',
      vacationRequests: {
        enabled: false
      },
      permissionRequests: {
        enabled: false
      }
    });

    const stats = await RequestControl.getControlStats('test-org');

    expect(stats.systemWideEnabled).toBe(true);
    expect(stats.enabledTypes).toBe(3); // sickLeave, missionRequests, forgotCheck
    expect(stats.disabledTypes).toBe(2); // vacationRequests, permissionRequests
    expect(stats.totalChanges).toBe(0); // No changes yet
    expect(stats.disabledRequests).toHaveLength(2);
  });

  it('should handle sub-type controls', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    // Disable annual leave sub-type
    control.vacationRequests.leaveTypes.annual.enabled = false;
    control.vacationRequests.leaveTypes.annual.disabledMessage = 'Annual leave disabled';
    await control.save();

    const result = control.isRequestAllowed('annual');

    expect(result.allowed).toBe(false);
    expect(result.message).toBe('Annual leave disabled');

    // Check casual leave (still enabled)
    const casualResult = control.isRequestAllowed('casual');

    expect(casualResult.allowed).toBe(true);
    expect(casualResult.message).toBe('');
  });

  it('should handle permission sub-type controls', async () => {
    const control = await RequestControl.create({
      organization: 'test-org'
    });

    // Disable late arrival sub-type
    control.permissionRequests.permissionTypes['late-arrival'].enabled = false;
    control.permissionRequests.permissionTypes['late-arrival'].disabledMessage = 'Late arrival disabled';
    await control.save();

    const result = control.isRequestAllowed('late-arrival');

    expect(result.allowed).toBe(false);
    expect(result.message).toBe('Late arrival disabled');

    // Check overtime (still enabled)
    const overtimeResult = control.isRequestAllowed('overtime');

    expect(overtimeResult.allowed).toBe(true);
    expect(overtimeResult.message).toBe('');
  });

  it('should get all active controls', async () => {
    await RequestControl.create([
      {
        organization: 'org1'
        // organization._id removed as not needed
      },
      {
        organization: 'org2'
      }
    ]);

    const activeControls = await RequestControl.getAllActiveControls();

    expect(activeControls).toHaveLength(2);
    expect(activeControls[0].isActive).toBe(true);
    expect(activeControls[1].isActive).toBe(true);
  });

  it('should validate requests', async () => {
    const employee = await User.create({
      tenantId: 'test_tenant_123',
      username: 'employee1',
      email: 'employee1@example.com',
      password: 'password123',
      role: 'employee',
      employeeId: 'EMP002'
      // organization._id removed as not needed
    });

    await RequestControl.create({
      organization: 'default',
      // organization._id removed as not needed
      vacationRequests: {
        enabled: false,
        disabledMessage: 'Vacation requests disabled for this organization'
      }
    });

    const result = await RequestControl.validateRequest('vacation', employee._id);

    expect(result.allowed).toBe(false);
    expect(result.message).toBe('Vacation requests disabled for this organization');
  });
});
