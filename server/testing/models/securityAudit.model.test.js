import mongoose from 'mongoose';
import SecurityAudit from '../../models/securityAudit.model.js';
import User from '../../models/user.model.js';

let user;

beforeAll(async () => {
  // Create user for testing
  user = await User.create({
      tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP001'
  });
});

beforeEach(async () => {
  await SecurityAudit.deleteMany({});
});

describe('SecurityAudit Model', () => {
  it('should create a new security audit record with required fields', async () => {
    const auditRecord = await SecurityAudit.create({
      eventType: 'login-success',
      user: user._id,
      username: 'testuser',
      userEmail: 'test@example.com',
      userRole: 'employee',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      requestUrl: '/api/users/login',
      requestMethod: 'POST'
    });

    expect(auditRecord.eventType).toBe('login-success');
    expect(auditRecord.user.toString()).toBe(user._id.toString());
    expect(auditRecord.username).toBe('testuser');
    expect(auditRecord.userEmail).toBe('test@example.com');
    expect(auditRecord.userRole).toBe('employee');
    expect(auditRecord.ipAddress).toBe('192.168.1.100');
    expect(auditRecord.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    expect(auditRecord.requestUrl).toBe('/api/users/login');
    expect(auditRecord.requestMethod).toBe('POST');
    expect(auditRecord.severity).toBe('info');
    expect(auditRecord.success).toBe(true);
  });

  it('should validate eventType enum values', async () => {
    const validEventTypes = [
      'login-success',
      'login-failed',
      'logout',
      '2fa-enabled',
      '2fa-disabled',
      '2fa-verified',
      '2fa-failed',
      'password-changed',
      'password-reset-requested',
      'password-reset-completed',
      'password-expired',
      'account-locked',
      'account-unlocked',
      'account-created',
      'account-deleted',
      'account-updated',
      'role-changed',
      'permission-added',
      'permission-removed',
      'permission-audit-cleanup',
      'ip-blocked',
      'unauthorized-access',
      'session-terminated',
      'suspicious-activity',
      'data-accessed',
      'data-modified',
      'data-deleted',
      'data-exported',
      'settings-changed',
      'backup-created',
      'maintenance-mode-enabled',
      'maintenance-mode-disabled'
    ];

    for (const eventType of validEventTypes) {
      const auditRecord = new SecurityAudit({
        eventType: eventType,
        ipAddress: '192.168.1.100'
      });

      await expect(auditRecord.validate()).resolves.toBeUndefined();
    }

    // Test invalid event type
    const invalidRecord = new SecurityAudit({
      eventType: 'invalid-event',
      ipAddress: '192.168.1.100'
    });

    await expect(invalidRecord.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate severity enum values', async () => {
    const validSeverities = ['info', 'warning', 'critical'];

    for (const severity of validSeverities) {
      const auditRecord = new SecurityAudit({
        eventType: 'login-success',
        severity: severity,
        ipAddress: '192.168.1.100'
      });

      await expect(auditRecord.validate()).resolves.toBeUndefined();
    }

    // Test invalid severity
    const invalidRecord = new SecurityAudit({
      eventType: 'login-success',
      severity: 'invalid-severity',
      ipAddress: '192.168.1.100'
    });

    await expect(invalidRecord.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should log security events', async () => {
    const eventData = {
      eventType: 'login-success',
      user: user._id,
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser',
      requestUrl: '/api/login',
      requestMethod: 'POST',
      details: { loginMethod: 'password' }
    };

    const loggedEvent = await SecurityAudit.logEvent(eventData);

    expect(loggedEvent.eventType).toBe('login-success');
    expect(loggedEvent.user.toString()).toBe(user._id.toString());
    expect(loggedEvent.ipAddress).toBe('192.168.1.100');
    expect(loggedEvent.details.loginMethod).toBe('password');
  });

  it('should log authentication events with proper severity', async () => {
    // Mock request object
    const mockReq = {
      ip: '192.168.1.100',
      get: () => 'Test Browser',
      originalUrl: '/api/login',
      method: 'POST'
    };

    // Test successful login
    const successEvent = await SecurityAudit.logAuth('login-success', user, mockReq);

    expect(successEvent.eventType).toBe('login-success');
    expect(successEvent.severity).toBe('info');
    expect(successEvent.success).toBe(true);

    // Test failed login
    const failedEvent = await SecurityAudit.logAuth('login-failed', user, mockReq);

    expect(failedEvent.eventType).toBe('login-failed');
    expect(failedEvent.severity).toBe('warning');
    expect(failedEvent.success).toBe(false);
  });

  it('should get user activity', async () => {
    // Create multiple audit records for the user
    await SecurityAudit.create([
      {
        eventType: 'login-success',
        user: user._id,
        ipAddress: '192.168.1.100'
      },
      {
        eventType: 'password-changed',
        user: user._id,
        ipAddress: '192.168.1.100'
      },
      {
        eventType: 'logout',
        user: user._id,
        ipAddress: '192.168.1.100'
      }
    ]);

    const userActivity = await SecurityAudit.getUserActivity(user._id);

    expect(userActivity).toHaveLength(3);
    // Should be sorted by timestamp descending (newest first)
    expect(userActivity[0].timestamp.getTime()).toBeGreaterThanOrEqual(userActivity[1].timestamp.getTime());

    // Test with event type filter
    const loginActivity = await SecurityAudit.getUserActivity(user._id, { eventType: 'login-success' });

    expect(loginActivity).toHaveLength(1);
    expect(loginActivity[0].eventType).toBe('login-success');
  });

  it('should get suspicious activities', async () => {
    // Create audit records including suspicious ones
    await SecurityAudit.create([
      {
        eventType: 'login-success',
        ipAddress: '192.168.1.100',
        severity: 'info'
      },
      {
        eventType: 'login-failed',
        ipAddress: '192.168.1.101',
        severity: 'warning'
      },
      {
        eventType: 'unauthorized-access',
        ipAddress: '192.168.1.102',
        severity: 'warning'
      },
      {
        eventType: 'data-accessed',
        ipAddress: '192.168.1.103',
        severity: 'critical'
      }
    ]);

    const suspiciousActivities = await SecurityAudit.getSuspiciousActivities();

    expect(suspiciousActivities).toHaveLength(3);
    // Should include login-failed, unauthorized-access, and critical severity events
    const eventTypes = suspiciousActivities.map(a => a.eventType);
    expect(eventTypes).toContain('login-failed');
    expect(eventTypes).toContain('unauthorized-access');
    expect(eventTypes).toContain('data-accessed');
  });

  it('should get failed login attempts', async () => {
    // Create multiple failed login attempts
    const recentDate = new Date();
    const oldDate = new Date(recentDate.getTime() - 35 * 60 * 1000); // 35 minutes ago

    await SecurityAudit.create([
      {
        eventType: 'login-failed',
        user: user._id,
        timestamp: recentDate
      },
      {
        eventType: 'login-failed',
        user: user._id,
        timestamp: recentDate
      },
      {
        eventType: 'login-failed',
        user: user._id,
        timestamp: oldDate // Outside 30-minute window
      },
      {
        eventType: 'login-success', // Not a failed login
        user: user._id,
        timestamp: recentDate
      }
    ]);

    const failedLoginCount = await SecurityAudit.getFailedLogins(user._id, 30);

    expect(failedLoginCount).toBe(2); // Only recent failed logins within 30 minutes
  });

  it('should get security statistics', async () => {
    // Create various audit records
    await SecurityAudit.create([
      {
        eventType: 'login-success',
        severity: 'info',
        success: true
      },
      {
        eventType: 'login-success',
        severity: 'info',
        success: true
      },
      {
        eventType: 'login-failed',
        severity: 'warning',
        success: false
      },
      {
        eventType: 'password-changed',
        severity: 'info',
        success: true
      }
    ]);

    const stats = await SecurityAudit.getSecurityStats(1); // Last 1 day

    expect(stats.eventStats).toHaveLength(3); // login-success, login-failed, password-changed
    expect(stats.severityStats).toHaveLength(2); // info, warning

    // Check event stats
    const loginSuccessStats = stats.eventStats.find(s => s._id === 'login-success');
    expect(loginSuccessStats.count).toBe(2);
    expect(loginSuccessStats.failures).toBe(0);

    const loginFailedStats = stats.eventStats.find(s => s._id === 'login-failed');
    expect(loginFailedStats.count).toBe(1);
    expect(loginFailedStats.failures).toBe(1);

    // Check severity stats
    const infoStats = stats.severityStats.find(s => s._id === 'info');
    expect(infoStats.count).toBe(3); // 2 login-success + 1 password-changed

    const warningStats = stats.severityStats.find(s => s._id === 'warning');
    expect(warningStats.count).toBe(1); // 1 login-failed
  });

  it('should handle mixed data types in details field', async () => {
    const auditRecord = await SecurityAudit.create({
      eventType: 'data-modified',
      user: user._id,
      ipAddress: '192.168.1.100',
      details: {
        modifiedFields: ['name', 'email'],
        oldValue: { name: 'John Doe' },
        newValue: { name: 'Jane Doe' },
        timestamp: new Date(),
        count: 1
      }
    });

    expect(auditRecord.details.modifiedFields).toEqual(['name', 'email']);
    expect(auditRecord.details.oldValue.name).toBe('John Doe');
    expect(auditRecord.details.newValue.name).toBe('Jane Doe');
    expect(auditRecord.details.count).toBe(1);
  });

  it('should handle error messages for failed events', async () => {
    const auditRecord = await SecurityAudit.create({
      eventType: 'login-failed',
      user: user._id,
      ipAddress: '192.168.1.100',
      success: false,
      errorMessage: 'Invalid credentials provided',
      severity: 'warning'
    });

    expect(auditRecord.eventType).toBe('login-failed');
    expect(auditRecord.success).toBe(false);
    expect(auditRecord.errorMessage).toBe('Invalid credentials provided');
    expect(auditRecord.severity).toBe('warning');
  });
});