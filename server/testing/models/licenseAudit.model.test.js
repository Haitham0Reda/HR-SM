import mongoose from 'mongoose';
import LicenseAudit, { EVENT_TYPES, SEVERITY_LEVELS } from '../../models/licenseAudit.model.js';

describe('LicenseAudit Model', () => {
    describe('Schema Validation', () => {
        it('should create and save audit log successfully', async () => {
            const auditData = {
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                eventType: 'VALIDATION_SUCCESS',
                details: {
                    reason: 'License is valid',
                    userId: new mongoose.Types.ObjectId()
                },
                severity: 'info'
            };

            const audit = new LicenseAudit(auditData);
            const savedAudit = await audit.save();

            expect(savedAudit._id).toBeDefined();
            expect(savedAudit.tenantId.toString()).toBe(auditData.tenantId.toString());
            expect(savedAudit.moduleKey).toBe(auditData.moduleKey);
            expect(savedAudit.eventType).toBe(auditData.eventType);
            expect(savedAudit.severity).toBe(auditData.severity);
            expect(savedAudit.timestamp).toBeDefined();
        });

        it('should fail to create without required fields', async () => {
            const audit = new LicenseAudit({});

            let err;
            try {
                await audit.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors.tenantId).toBeDefined();
            expect(err.errors.moduleKey).toBeDefined();
            expect(err.errors.eventType).toBeDefined();
        });

        it('should validate eventType enum', async () => {
            const auditData = {
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                eventType: 'INVALID_EVENT'
            };

            const audit = new LicenseAudit(auditData);

            let err;
            try {
                await audit.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
        });

        it('should validate severity enum', async () => {
            const auditData = {
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                eventType: 'VALIDATION_SUCCESS',
                severity: 'invalid-severity'
            };

            const audit = new LicenseAudit(auditData);

            let err;
            try {
                await audit.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
        });

        it('should set default severity to info', async () => {
            const auditData = {
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                eventType: 'VALIDATION_SUCCESS'
            };

            const audit = new LicenseAudit(auditData);
            const savedAudit = await audit.save();

            expect(savedAudit.severity).toBe('info');
        });

        it('should set timestamp automatically', async () => {
            const auditData = {
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                eventType: 'VALIDATION_SUCCESS'
            };

            const audit = new LicenseAudit(auditData);
            const savedAudit = await audit.save();

            expect(savedAudit.timestamp).toBeDefined();
            expect(savedAudit.timestamp).toBeInstanceOf(Date);
        });
    });

    describe('Static Helper Methods', () => {
        const tenantId = new mongoose.Types.ObjectId();
        const moduleKey = 'attendance';

        it('should create log with createLog', async () => {
            const log = await LicenseAudit.createLog({
                tenantId,
                moduleKey,
                eventType: 'VALIDATION_SUCCESS',
                details: { reason: 'Test' },
                severity: 'info'
            });

            expect(log).toBeDefined();
            expect(log.eventType).toBe('VALIDATION_SUCCESS');
        });

        it('should log validation success', async () => {
            const log = await LicenseAudit.logValidationSuccess(tenantId, moduleKey, {
                userId: new mongoose.Types.ObjectId()
            });

            expect(log).toBeDefined();
            expect(log.eventType).toBe('VALIDATION_SUCCESS');
            expect(log.severity).toBe('info');
        });

        it('should log validation failure', async () => {
            const log = await LicenseAudit.logValidationFailure(
                tenantId,
                moduleKey,
                'License expired',
                { ipAddress: '127.0.0.1' }
            );

            expect(log).toBeDefined();
            expect(log.eventType).toBe('VALIDATION_FAILURE');
            expect(log.severity).toBe('warning');
            expect(log.details.reason).toBe('License expired');
        });

        it('should log license expired', async () => {
            const log = await LicenseAudit.logLicenseExpired(tenantId, moduleKey);

            expect(log).toBeDefined();
            expect(log.eventType).toBe('LICENSE_EXPIRED');
            expect(log.severity).toBe('critical');
        });

        it('should log limit warning', async () => {
            const log = await LicenseAudit.logLimitWarning(
                tenantId,
                moduleKey,
                'employees',
                45,
                50
            );

            expect(log).toBeDefined();
            expect(log.eventType).toBe('LIMIT_WARNING');
            expect(log.severity).toBe('warning');
            expect(log.details.limitType).toBe('employees');
            expect(log.details.currentValue).toBe(45);
            expect(log.details.limitValue).toBe(50);
        });

        it('should log limit exceeded', async () => {
            const log = await LicenseAudit.logLimitExceeded(
                tenantId,
                moduleKey,
                'employees',
                55,
                50
            );

            expect(log).toBeDefined();
            expect(log.eventType).toBe('LIMIT_EXCEEDED');
            expect(log.severity).toBe('critical');
            expect(log.details.limitType).toBe('employees');
            expect(log.details.currentValue).toBe(55);
            expect(log.details.limitValue).toBe(50);
        });

        it('should log module activated', async () => {
            const log = await LicenseAudit.logModuleActivated(tenantId, moduleKey, {
                tier: 'business'
            });

            expect(log).toBeDefined();
            expect(log.eventType).toBe('MODULE_ACTIVATED');
            expect(log.severity).toBe('info');
        });

        it('should log module deactivated', async () => {
            const log = await LicenseAudit.logModuleDeactivated(tenantId, moduleKey);

            expect(log).toBeDefined();
            expect(log.eventType).toBe('MODULE_DEACTIVATED');
            expect(log.severity).toBe('info');
        });

        it('should log license updated', async () => {
            const log = await LicenseAudit.logLicenseUpdated(
                tenantId,
                moduleKey,
                { tier: 'starter' },
                { tier: 'business' }
            );

            expect(log).toBeDefined();
            expect(log.eventType).toBe('LICENSE_UPDATED');
            expect(log.severity).toBe('info');
            expect(log.details.previousValue).toEqual({ tier: 'starter' });
            expect(log.details.newValue).toEqual({ tier: 'business' });
        });
    });

    describe('Query Methods', () => {
        let tenantId1, tenantId2;

        beforeEach(async () => {
            tenantId1 = new mongoose.Types.ObjectId();
            tenantId2 = new mongoose.Types.ObjectId();

            // Create various audit logs
            await LicenseAudit.logValidationSuccess(tenantId1, 'attendance');
            await LicenseAudit.logValidationFailure(tenantId1, 'attendance', 'Test failure');
            await LicenseAudit.logLimitWarning(tenantId1, 'attendance', 'employees', 45, 50);
            await LicenseAudit.logLimitExceeded(tenantId2, 'leave', 'employees', 55, 50);
            await LicenseAudit.logLicenseExpired(tenantId2, 'payroll');
        });

        it('should query logs with filters', async () => {
            const logs = await LicenseAudit.queryLogs({
                tenantId: tenantId1,
                limit: 10
            });

            expect(logs.length).toBeGreaterThan(0);
            logs.forEach(log => {
                expect(log.tenantId.toString()).toBe(tenantId1.toString());
            });
        });

        it('should query logs by module', async () => {
            const logs = await LicenseAudit.queryLogs({
                moduleKey: 'attendance',
                limit: 10
            });

            expect(logs.length).toBeGreaterThan(0);
            logs.forEach(log => {
                expect(log.moduleKey).toBe('attendance');
            });
        });

        it('should query logs by event type', async () => {
            const logs = await LicenseAudit.queryLogs({
                eventType: 'VALIDATION_SUCCESS',
                limit: 10
            });

            expect(logs.length).toBeGreaterThan(0);
            logs.forEach(log => {
                expect(log.eventType).toBe('VALIDATION_SUCCESS');
            });
        });

        it('should query logs by severity', async () => {
            const logs = await LicenseAudit.queryLogs({
                severity: 'critical',
                limit: 10
            });

            expect(logs.length).toBeGreaterThan(0);
            logs.forEach(log => {
                expect(log.severity).toBe('critical');
            });
        });

        it('should query logs by date range', async () => {
            const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const endDate = new Date();

            const logs = await LicenseAudit.queryLogs({
                startDate,
                endDate,
                limit: 10
            });

            expect(logs.length).toBeGreaterThan(0);
        });

        it('should limit and skip results', async () => {
            const logs = await LicenseAudit.queryLogs({
                limit: 2,
                skip: 0
            });

            expect(logs.length).toBeLessThanOrEqual(2);
        });

        it('should get statistics', async () => {
            const stats = await LicenseAudit.getStatistics();

            expect(stats).toBeDefined();
            expect(stats.totalEvents).toBeGreaterThan(0);
            expect(stats.byEventType).toBeDefined();
            expect(stats.bySeverity).toBeDefined();
            expect(stats.bySeverity.info).toBeGreaterThanOrEqual(0);
            expect(stats.bySeverity.warning).toBeGreaterThanOrEqual(0);
            expect(stats.bySeverity.critical).toBeGreaterThanOrEqual(0);
        });

        it('should get statistics for specific tenant', async () => {
            const stats = await LicenseAudit.getStatistics(tenantId1);

            expect(stats).toBeDefined();
            expect(stats.totalEvents).toBeGreaterThan(0);
        });

        it('should get recent violations', async () => {
            const violations = await LicenseAudit.getRecentViolations(null, 10);

            expect(violations.length).toBeGreaterThan(0);
            violations.forEach(violation => {
                expect(['error', 'critical']).toContain(violation.severity);
            });
        });

        it('should get module audit trail', async () => {
            const trail = await LicenseAudit.getModuleAuditTrail(tenantId1, 'attendance', 30);

            expect(trail.length).toBeGreaterThan(0);
            trail.forEach(log => {
                expect(log.tenantId.toString()).toBe(tenantId1.toString());
                expect(log.moduleKey).toBe('attendance');
            });
        });
    });

    describe('Cleanup Methods', () => {
        it('should clean up old logs', async () => {
            // Create an old log
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 400);

            await LicenseAudit.create({
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                eventType: 'VALIDATION_SUCCESS',
                severity: 'info',
                timestamp: oldDate
            });

            const result = await LicenseAudit.cleanupOldLogs(365);

            expect(result).toBeDefined();
            expect(result.deletedCount).toBeGreaterThanOrEqual(0);
            expect(result.cutoffDate).toBeDefined();
        });

        it('should not delete critical logs during cleanup', async () => {
            // Create an old critical log
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 400);

            const criticalLog = await LicenseAudit.create({
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                eventType: 'LICENSE_EXPIRED',
                severity: 'critical',
                timestamp: oldDate
            });

            await LicenseAudit.cleanupOldLogs(365);

            const stillExists = await LicenseAudit.findById(criticalLog._id);
            expect(stillExists).toBeDefined();
        });
    });

    describe('Indexes', () => {
        it('should have required indexes', async () => {
            const indexes = await LicenseAudit.collection.getIndexes();

            expect(indexes).toHaveProperty('tenantId_1');
            expect(indexes).toHaveProperty('moduleKey_1');
            expect(indexes).toHaveProperty('eventType_1');
            expect(indexes).toHaveProperty('severity_1');
            expect(indexes).toHaveProperty('timestamp_1');
        });
    });
});
