import mongoose from 'mongoose';
import SecuritySettings from '../../models/securitySettings.model.js';
import User from '../../models/user.model.js';

let user;

beforeAll(async () => {
  // Create user for testing
  user = await User.create({
      tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin',
    employeeId: 'EMP001'
  });
});

beforeEach(async () => {
  await SecuritySettings.deleteMany({});
});

describe('SecuritySettings Model', () => {
  it('should create security settings with default values', async () => {
    const settings = await SecuritySettings.create({});

    expect(settings.twoFactorAuth.enabled).toBe(false);
    expect(settings.twoFactorAuth.enforced).toBe(false);
    expect(settings.twoFactorAuth.backupCodesCount).toBe(8);

    expect(settings.passwordPolicy.minLength).toBe(8);
    expect(settings.passwordPolicy.requireUppercase).toBe(true);
    expect(settings.passwordPolicy.requireLowercase).toBe(true);
    expect(settings.passwordPolicy.requireNumbers).toBe(true);
    expect(settings.passwordPolicy.requireSpecialChars).toBe(false);
    expect(settings.passwordPolicy.expirationDays).toBe(90);
    expect(settings.passwordPolicy.historyCount).toBe(5);
    expect(settings.passwordPolicy.expirationWarningDays).toBe(14);

    expect(settings.accountLockout.enabled).toBe(true);
    expect(settings.accountLockout.maxAttempts).toBe(5);
    expect(settings.accountLockout.lockoutDuration).toBe(30);
    expect(settings.accountLockout.resetOnSuccess).toBe(true);
  });

  it('should validate backup codes count range', async () => {
    // Valid backup codes count
    const validSettings = new SecuritySettings({
      'twoFactorAuth.backupCodesCount': 10
    });

    await expect(validSettings.validate()).resolves.toBeUndefined();

    // Invalid backup codes count (too low)
    const invalidLowSettings = new SecuritySettings({
      'twoFactorAuth.backupCodesCount': 4
    });

    await expect(invalidLowSettings.validate()).rejects.toThrow(mongoose.Error.ValidationError);

    // Invalid backup codes count (too high)
    const invalidHighSettings = new SecuritySettings({
      'twoFactorAuth.backupCodesCount': 21
    });

    await expect(invalidHighSettings.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate password policy ranges', async () => {
    // Valid password policy
    const validSettings = new SecuritySettings({
      'passwordPolicy.minLength': 12,
      'passwordPolicy.expirationDays': 180,
      'passwordPolicy.historyCount': 10
    });

    await expect(validSettings.validate()).resolves.toBeUndefined();

    // Invalid min length (too low)
    const invalidMinLength = new SecuritySettings({
      'passwordPolicy.minLength': 5
    });

    await expect(invalidMinLength.validate()).rejects.toThrow(mongoose.Error.ValidationError);

    // Invalid min length (too high)
    const invalidMaxLength = new SecuritySettings({
      'passwordPolicy.minLength': 129
    });

    await expect(invalidMaxLength.validate()).rejects.toThrow(mongoose.Error.ValidationError);

    // Invalid history count (too high)
    const invalidHistoryCount = new SecuritySettings({
      'passwordPolicy.historyCount': 25
    });

    await expect(invalidHistoryCount.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate account lockout ranges', async () => {
    // Valid account lockout settings
    const validSettings = new SecuritySettings({
      'accountLockout.maxAttempts': 7,
      'accountLockout.lockoutDuration': 60
    });

    await expect(validSettings.validate()).resolves.toBeUndefined();

    // Invalid max attempts (too low)
    const invalidAttemptsLow = new SecuritySettings({
      'accountLockout.maxAttempts': 2
    });

    await expect(invalidAttemptsLow.validate()).rejects.toThrow(mongoose.Error.ValidationError);

    // Invalid max attempts (too high)
    const invalidAttemptsHigh = new SecuritySettings({
      'accountLockout.maxAttempts': 11
    });

    await expect(invalidAttemptsHigh.validate()).rejects.toThrow(mongoose.Error.ValidationError);

    // Invalid lockout duration (too low)
    const invalidDurationLow = new SecuritySettings({
      'accountLockout.lockoutDuration': 4
    });

    await expect(invalidDurationLow.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate session management ranges', async () => {
    // Valid session management settings
    const validSettings = new SecuritySettings({
      'sessionManagement.maxConcurrentSessions': 5,
      'sessionManagement.sessionTimeout': 240,
      'sessionManagement.idleTimeout': 30,
      'sessionManagement.rememberMeDuration': 60
    });

    await expect(validSettings.validate()).resolves.toBeUndefined();

    // Invalid concurrent sessions (too low)
    const invalidSessionsLow = new SecuritySettings({
      'sessionManagement.maxConcurrentSessions': 0
    });

    await expect(invalidSessionsLow.validate()).rejects.toThrow(mongoose.Error.ValidationError);

    // Invalid session timeout (too low)
    const invalidTimeoutLow = new SecuritySettings({
      'sessionManagement.sessionTimeout': 14
    });

    await expect(invalidTimeoutLow.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should get current settings', async () => {
    // First call should create default settings
    const settings1 = await SecuritySettings.getSettings();

    expect(settings1).toBeDefined();
    expect(settings1.twoFactorAuth).toBeDefined();
    expect(settings1.passwordPolicy).toBeDefined();

    // Second call should return existing settings
    const settings2 = await SecuritySettings.getSettings();

    expect(settings2._id.toString()).toBe(settings1._id.toString());
  });

  it('should update settings', async () => {
    const settings = await SecuritySettings.getSettings();

    const updates = {
      'twoFactorAuth.enabled': true,
      'twoFactorAuth.enforced': true,
      'passwordPolicy.minLength': 12,
      'accountLockout.maxAttempts': 3
    };

    const updatedSettings = await SecuritySettings.updateSettings(updates, user._id);

    expect(updatedSettings.twoFactorAuth.enabled).toBe(true);
    expect(updatedSettings.twoFactorAuth.enforced).toBe(true);
    expect(updatedSettings.passwordPolicy.minLength).toBe(12);
    expect(updatedSettings.accountLockout.maxAttempts).toBe(3);
    expect(updatedSettings.lastModifiedBy.toString()).toBe(user._id.toString());
    expect(updatedSettings.lastModified).toBeDefined();
  });

  it('should check if IP is whitelisted', async () => {
    const settings = await SecuritySettings.create({
      ipWhitelist: {
        enabled: true,
        allowedIPs: [
          {
            ip: '192.168.1.100',
            description: 'Office network'
          },
          {
            ip: '10.0.0.1',
            description: 'VPN'
          }
        ]
      }
    });

    // Test whitelisted IP
    expect(settings.isIPWhitelisted('192.168.1.100')).toBe(true);

    // Test non-whitelisted IP
    expect(settings.isIPWhitelisted('192.168.1.101')).toBe(false);

    // Test when whitelist is disabled (should allow all)
    settings.ipWhitelist.enabled = false;
    expect(settings.isIPWhitelisted('192.168.1.101')).toBe(true);
  });

  it('should validate passwords against policy', async () => {
    const settings = await SecuritySettings.create({
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    });

    // Test valid password
    const validPassword = 'Password123!';
    const validResult = settings.validatePassword(validPassword);

    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Test password too short
    const shortPassword = 'Pass1!';
    const shortResult = settings.validatePassword(shortPassword);

    expect(shortResult.valid).toBe(false);
    expect(shortResult.errors).toContain('Password must be at least 8 characters');

    // Test missing uppercase
    const noUppercasePassword = 'password123!';
    const noUppercaseResult = settings.validatePassword(noUppercasePassword);

    expect(noUppercaseResult.valid).toBe(false);
    expect(noUppercaseResult.errors).toContain('Password must contain at least one uppercase letter');

    // Test missing lowercase
    const noLowercasePassword = 'PASSWORD123!';
    const noLowercaseResult = settings.validatePassword(noLowercasePassword);

    expect(noLowercaseResult.valid).toBe(false);
    expect(noLowercaseResult.errors).toContain('Password must contain at least one lowercase letter');

    // Test missing number
    const noNumberPassword = 'Password!';
    const noNumberResult = settings.validatePassword(noNumberPassword);

    expect(noNumberResult.valid).toBe(false);
    expect(noNumberResult.errors).toContain('Password must contain at least one number');

    // Test missing special character
    const noSpecialCharPassword = 'Password123';
    const noSpecialCharResult = settings.validatePassword(noSpecialCharPassword);

    expect(noSpecialCharResult.valid).toBe(false);
    expect(noSpecialCharResult.errors).toContain('Password must contain at least one special character');
  });

  it('should handle development mode settings', async () => {
    const settings = await SecuritySettings.create({
      developmentMode: {
        enabled: true,
        allowedUsers: [user._id],
        maintenanceMessage: 'System under maintenance',
        enabledBy: user._id
      }
    });

    expect(settings.developmentMode.enabled).toBe(true);
    expect(settings.developmentMode.allowedUsers).toHaveLength(1);
    expect(settings.developmentMode.allowedUsers[0].toString()).toBe(user._id.toString());
    expect(settings.developmentMode.maintenanceMessage).toBe('System under maintenance');
    expect(settings.developmentMode.enabledBy.toString()).toBe(user._id.toString());
  });

  it('should handle audit settings', async () => {
    const settings = await SecuritySettings.create({
      auditSettings: {
        enabled: true,
        logLoginAttempts: true,
        logDataChanges: true,
        logSecurityEvents: true,
        retentionDays: 180
      }
    });

    expect(settings.auditSettings.enabled).toBe(true);
    expect(settings.auditSettings.logLoginAttempts).toBe(true);
    expect(settings.auditSettings.logDataChanges).toBe(true);
    expect(settings.auditSettings.logSecurityEvents).toBe(true);
    expect(settings.auditSettings.retentionDays).toBe(180);
  });

  it('should validate audit retention days', async () => {
    // Valid retention days
    const validSettings = new SecuritySettings({
      'auditSettings.retentionDays': 365
    });

    await expect(validSettings.validate()).resolves.toBeUndefined();

    // Invalid retention days (too low)
    const invalidRetention = new SecuritySettings({
      'auditSettings.retentionDays': 29
    });

    await expect(invalidRetention.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });
});