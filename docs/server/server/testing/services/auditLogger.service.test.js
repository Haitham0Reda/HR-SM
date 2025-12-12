// testing/services/auditLogger.service.test.js
import mongoose from 'mongoose';
import auditLoggerService from '../../services/auditLogger.service.js';
import LicenseAudit from '../../platform/system/models/licenseAudit.model.js';

beforeEach(async () => {
    await LicenseAudit.deleteMany({});
});

describe('AuditLoggerService', () => {
    const testTenantId = new mongoose.Types.ObjectId();
    const testModuleKey = 'attendance';

    describe('createLog', () => {
        it('should create a basic audit log entry', async () => {
            const log = await auditLoggerService.createLog({
                tenantId: testTenantId,
                moduleKey: testModuleKey,
                eventType: 'VALIDATION_SUCCESS',
                details: { additionalInfo: { test: 'data' } },
                severity: 'info'
            });

            expect(log).toBeDefined();
            expect(log.tenantId.toString()).toBe(testTenantId.toString());
            expect(log.moduleKey).toBe(testModuleKey);
            expect(log.eventType).toBe('VALIDATION_SUCCESS');
            expect(log.severity).toBe('info');
            expect(log.details.additionalInfo.test).toBe('data');
        });

        it('should reject invalid event type', async () => {
            await expect(
                auditLoggerService.createLog({
                    tenantId: testTenantId,
                    moduleKey: testModuleKey,
                    eventType: 'INVALID_EVENT',
                    severity: 'info'
                })
            ).rejects.toThrow('Invalid event type');
        });

        it('should reject invalid severity level', async () => {
            await expect(
                auditLoggerService.createLog({
                    tenantId: testTenantId,
                    moduleKey: testModuleKey,
                    eventType: 'VALIDATION_SUCCESS',
                    severity: 'invalid'
                })
            ).rejects.toThrow('Invalid severity level');
        });
    });

    describe('logValidationSuccess', () => {
        it('should log validation success with info severity', async () => {
            const log = await auditLoggerService.logValidationSuccess(
                testTenantId,
                testModuleKey,
                { reason: 'Test success' }
            );

            expect(log.eventType).toBe('VALIDATION_SUCCESS');
            expect(log.severity).toBe('info');
            expect(log.details.reason).toBe('Test success');
        });
    });

    describe('logValidationFailure', () => {
        it('should log validation failure with warning severity', async () => {
            const log = await auditLoggerService.logValidationFailure(
                testTenantId,
                testModuleKey,
                'Module not licensed',
                { additionalInfo: 'test' }
            );

            expect(log.eventType).toBe('VALIDATION_FAILURE');
            expect(log.severity).toBe('warning');
            expect(log.details.reason).toBe('Module not licensed');
            expect(log.details.additionalInfo).toBe('test');
        });
    });

    describe('logLicenseExpired', () => {
        it('should log license expiration with critical severity', async () => {
            const log = await auditLoggerService.logLicenseExpired(
                testTenantId,
                testModuleKey,
                { expiresAt: new Date() }
            );

            expect(log.eventType).toBe('LICENSE_EXPIRED');
            expect(log.severity).toBe('critical');
        });
    });

    describe('logLimitWarning', () => {
        it('should log limit warning with correct details', async () => {
            const log = await auditLoggerService.logLimitWarning(
                testTenantId,
                testModuleKey,
                'employees',
                45,
                50,
                { additionalInfo: { percentage: 90 } }
            );

            expect(log.eventType).toBe('LIMIT_WARNING');
            expect(log.severity).toBe('warning');
            expect(log.details.limitType).toBe('employees');
            expect(log.details.currentValue).toBe(45);
            expect(log.details.limitValue).toBe(50);
            expect(log.details.additionalInfo.percentage).toBe(90);
        });
    });

    describe('logLimitExceeded', () => {
        it('should log limit exceeded with critical severity', async () => {
            const log = await auditLoggerService.logLimitExceeded(
                testTenantId,
                testModuleKey,
                'storage',
                11000000000,
                10000000000
            );

            expect(log.eventType).toBe('LIMIT_EXCEEDED');
            expect(log.severity).toBe('critical');
            expect(log.details.limitType).toBe('storage');
            expect(log.details.currentValue).toBe(11000000000);
            expect(log.details.limitValue).toBe(10000000000);
        });
    });

    describe('logModuleActivated', () => {
        it('should log module activation', async () => {
            const log = await auditLoggerService.logModuleActivated(
                testTenantId,
                testModuleKey,
                { additionalInfo: { tier: 'business', limits: { employees: 200 } } }
            );

            expect(log.eventType).toBe('MODULE_ACTIVATED');
            expect(log.severity).toBe('info');
            expect(log.details.additionalInfo.tier).toBe('business');
        });
    });

    describe('logModuleDeactivated', () => {
        it('should log module deactivation', async () => {
            const log = await auditLoggerService.logModuleDeactivated(
                testTenantId,
                testModuleKey,
                { reason: 'Subscription downgrade' }
            );

            expect(log.eventType).toBe('MODULE_DEACTIVATED');
            expect(log.severity).toBe('info');
        });
    });

    describe('logLicenseUpdated', () => {
        it('should log license update with change tracking', async () => {
            const previousValue = { tier: 'starter', limits: { employees: 50 } };
            const newValue = { tier: 'business', limits: { employees: 200 } };

            const log = await auditLoggerService.logLicenseUpdated(
                testTenantId,
                testModuleKey,
                previousValue,
                newValue
            );

            expect(log.eventType).toBe('LICENSE_UPDATED');
            expect(log.severity).toBe('info');
            expect(log.details.previousValue).toEqual(previousValue);
            expect(log.details.newValue).toEqual(newValue);
        });
    });

    describe('logSubscriptionEvent', () => {
        it('should log subscription created', async () => {
            const log = await auditLoggerService.logSubscriptionEvent(
                testTenantId,
                testModuleKey,
                'SUBSCRIPTION_CREATED',
                { plan: 'business' }
            );

            expect(log.eventType).toBe('SUBSCRIPTION_CREATED');
            expect(log.severity).toBe('info');
        });

        it('should log subscription expired with warning severity', async () => {
            const log = await auditLoggerService.logSubscriptionEvent(
                testTenantId,
                testModuleKey,
                'SUBSCRIPTION_EXPIRED'
            );

            expect(log.eventType).toBe('SUBSCRIPTION_EXPIRED');
            expect(log.severity).toBe('warning');
        });

        it('should reject invalid subscription event type', async () => {
            await expect(
                auditLoggerService.logSubscriptionEvent(
                    testTenantId,
                    testModuleKey,
                    'INVALID_SUBSCRIPTION_EVENT'
                )
            ).rejects.toThrow('Invalid subscription event type');
        });
    });

    describe('logTrialEvent', () => {
        it('should log trial started', async () => {
            const log = await auditLoggerService.logTrialEvent(
                testTenantId,
                testModuleKey,
                'TRIAL_STARTED',
                { duration: 30 }
            );

            expect(log.eventType).toBe('TRIAL_STARTED');
            expect(log.severity).toBe('info');
        });

        it('should reject invalid trial event type', async () => {
            await expect(
                auditLoggerService.logTrialEvent(
                    testTenantId,
                    testModuleKey,
                    'INVALID_TRIAL_EVENT'
                )
            ).rejects.toThrow('Invalid trial event type');
        });
    });

    describe('logUsageTracked', () => {
        it('should log usage tracking', async () => {
            const log = await auditLoggerService.logUsageTracked(
                testTenantId,
                testModuleKey,
                { metric: 'apiCalls', value: 100 }
            );

            expect(log.eventType).toBe('USAGE_TRACKED');
            expect(log.severity).toBe('info');
        });
    });

    describe('logDependencyViolation', () => {
        it('should log dependency violation with error severity', async () => {
            const log = await auditLoggerService.logDependencyViolation(
                testTenantId,
                testModuleKey,
                { missingDependency: 'hr-core' }
            );

            expect(log.eventType).toBe('DEPENDENCY_VIOLATION');
            expect(log.severity).toBe('error');
        });
    });

    describe('queryLogs', () => {
        beforeEach(async () => {
            // Create test logs
            await auditLoggerService.logValidationSuccess(testTenantId, 'attendance');
            await auditLoggerService.logValidationSuccess(testTenantId, 'leave');
            await auditLoggerService.logValidationFailure(testTenantId, 'payroll', 'Not licensed');
            await auditLoggerService.logLimitExceeded(testTenantId, 'attendance', 'employees', 51, 50);
        });

        it('should query all logs', async () => {
            const logs = await auditLoggerService.queryLogs({});
            expect(logs.length).toBe(4);
        });

        it('should filter by tenant', async () => {
            const logs = await auditLoggerService.queryLogs({ tenantId: testTenantId });
            expect(logs.length).toBe(4);
        });

        it('should filter by module', async () => {
            const logs = await auditLoggerService.queryLogs({ moduleKey: 'attendance' });
            expect(logs.length).toBe(2);
        });

        it('should filter by event type', async () => {
            const logs = await auditLoggerService.queryLogs({ eventType: 'VALIDATION_SUCCESS' });
            expect(logs.length).toBe(2);
        });

        it('should filter by severity', async () => {
            const logs = await auditLoggerService.queryLogs({ severity: 'critical' });
            expect(logs.length).toBe(1);
        });

        it('should limit results', async () => {
            const logs = await auditLoggerService.queryLogs({ limit: 2 });
            expect(logs.length).toBe(2);
        });
    });

    describe('getStatistics', () => {
        beforeEach(async () => {
            await auditLoggerService.logValidationSuccess(testTenantId, 'attendance');
            await auditLoggerService.logValidationSuccess(testTenantId, 'leave');
            await auditLoggerService.logValidationFailure(testTenantId, 'payroll', 'Not licensed');
            await auditLoggerService.logLimitExceeded(testTenantId, 'attendance', 'employees', 51, 50);
        });

        it('should return statistics', async () => {
            const stats = await auditLoggerService.getStatistics(testTenantId);

            expect(stats).toBeDefined();
            expect(stats.totalEvents).toBe(4);
            expect(stats.byEventType).toBeDefined();
            expect(stats.bySeverity).toBeDefined();
        });
    });

    describe('getRecentViolations', () => {
        beforeEach(async () => {
            await auditLoggerService.logValidationSuccess(testTenantId, 'attendance');
            await auditLoggerService.logLimitExceeded(testTenantId, 'attendance', 'employees', 51, 50);
            await auditLoggerService.logLicenseExpired(testTenantId, 'payroll');
        });

        it('should return only high-priority events', async () => {
            const violations = await auditLoggerService.getRecentViolations(testTenantId);
            expect(violations.length).toBe(2); // Only critical and error events
        });
    });

    describe('getModuleAuditTrail', () => {
        beforeEach(async () => {
            await auditLoggerService.logValidationSuccess(testTenantId, 'attendance');
            await auditLoggerService.logModuleActivated(testTenantId, 'attendance');
            await auditLoggerService.logValidationSuccess(testTenantId, 'leave');
        });

        it('should return audit trail for specific module', async () => {
            const trail = await auditLoggerService.getModuleAuditTrail(
                testTenantId,
                'attendance',
                30
            );

            expect(trail.length).toBe(2);
            trail.forEach(log => {
                expect(log.moduleKey).toBe('attendance');
            });
        });
    });

    describe('getEventTypes', () => {
        it('should return all event types', () => {
            const eventTypes = auditLoggerService.getEventTypes();
            expect(Array.isArray(eventTypes)).toBe(true);
            expect(eventTypes.length).toBeGreaterThan(0);
            expect(eventTypes).toContain('VALIDATION_SUCCESS');
            expect(eventTypes).toContain('LICENSE_EXPIRED');
        });
    });

    describe('getSeverityLevels', () => {
        it('should return all severity levels', () => {
            const severityLevels = auditLoggerService.getSeverityLevels();
            expect(Array.isArray(severityLevels)).toBe(true);
            expect(severityLevels).toEqual(['info', 'warning', 'error', 'critical']);
        });
    });
});
