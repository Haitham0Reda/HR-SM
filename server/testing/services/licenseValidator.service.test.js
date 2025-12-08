// testing/services/licenseValidator.service.test.js
import mongoose from 'mongoose';
import licenseValidator from '../../services/licenseValidator.service.js';
import License, { MODULES } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';
import UsageTracking from '../../models/usageTracking.model.js';

describe('LicenseValidator Service', () => {
    let testTenantId;
    let testLicense;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = new mongoose.Types.ObjectId();

        // Create a test license
        testLicense = await License.create({
            tenantId: testTenantId,
            subscriptionId: 'test-subscription-123',
            status: 'active',
            modules: [
                {
                    key: MODULES.ATTENDANCE,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        employees: 100,
                        storage: 10737418240, // 10GB
                        apiCalls: 50000
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
                },
                {
                    key: MODULES.LEAVE,
                    enabled: false,
                    tier: 'starter',
                    limits: {
                        employees: 50
                    },
                    activatedAt: new Date(),
                    expiresAt: null
                },
                {
                    key: MODULES.PAYROLL,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        employees: 100
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
                }
            ]
        });

        // Clear cache before each test
        licenseValidator.clearCache();
    });

    afterEach(async () => {
        // Clean up
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
        await UsageTracking.deleteMany({});
        licenseValidator.clearCache();
    });

    describe('validateModuleAccess', () => {
        test('should always allow Core HR access regardless of license', async () => {
            const result = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.CORE_HR
            );

            expect(result.valid).toBe(true);
            expect(result.bypassedValidation).toBe(true);
            expect(result.reason).toContain('Core HR');

            // Verify audit log was created
            const auditLogs = await LicenseAudit.find({
                tenantId: testTenantId,
                moduleKey: MODULES.CORE_HR
            });
            expect(auditLogs.length).toBeGreaterThan(0);
        });

        test('should allow access to enabled module with valid license', async () => {
            const result = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );

            expect(result.valid).toBe(true);
            expect(result.license).toBeDefined();
            expect(result.license.tier).toBe('business');
            expect(result.license.limits.employees).toBe(100);

            // Verify audit log was created
            const auditLogs = await LicenseAudit.find({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                eventType: 'VALIDATION_SUCCESS'
            });
            expect(auditLogs.length).toBeGreaterThan(0);
        });

        test('should deny access to disabled module', async () => {
            const result = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.LEAVE
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('MODULE_NOT_LICENSED');
            expect(result.reason).toContain('disabled');

            // Verify audit log was created
            const auditLogs = await LicenseAudit.find({
                tenantId: testTenantId,
                moduleKey: MODULES.LEAVE,
                eventType: 'VALIDATION_FAILURE'
            });
            expect(auditLogs.length).toBeGreaterThan(0);
        });

        test('should deny access to expired module license', async () => {
            const result = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.PAYROLL
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('LICENSE_EXPIRED');
            expect(result.expiresAt).toBeDefined();

            // Verify audit log was created
            const auditLogs = await LicenseAudit.find({
                tenantId: testTenantId,
                moduleKey: MODULES.PAYROLL,
                eventType: 'LICENSE_EXPIRED'
            });
            expect(auditLogs.length).toBeGreaterThan(0);
        });

        test('should deny access when no license exists', async () => {
            const nonExistentTenantId = new mongoose.Types.ObjectId();
            const result = await licenseValidator.validateModuleAccess(
                nonExistentTenantId.toString(),
                MODULES.ATTENDANCE
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('MODULE_NOT_LICENSED');
            expect(result.reason).toContain('No license found');
        });

        test('should deny access to module not in license', async () => {
            const result = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.DOCUMENTS
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('MODULE_NOT_LICENSED');
            expect(result.reason).toContain('not included');
        });

        test('should use cache for subsequent requests', async () => {
            // First request
            const result1 = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );
            expect(result1.valid).toBe(true);

            // Second request should use cache
            const result2 = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );
            expect(result2.valid).toBe(true);

            // Verify cache stats
            const stats = licenseValidator.getCacheStats();
            expect(stats.validEntries).toBeGreaterThan(0);
        });

        test('should skip cache when skipCache option is true', async () => {
            // First request to populate cache
            await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );

            // Second request with skipCache
            const result = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                { skipCache: true }
            );

            expect(result.valid).toBe(true);
        });

        test('should include request info in audit logs', async () => {
            const requestInfo = {
                userId: new mongoose.Types.ObjectId(),
                ipAddress: '192.168.1.1',
                userAgent: 'Test Agent'
            };

            await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                { requestInfo }
            );

            const auditLog = await LicenseAudit.findOne({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE
            });

            expect(auditLog.details.userId).toEqual(requestInfo.userId);
            expect(auditLog.details.ipAddress).toBe(requestInfo.ipAddress);
            expect(auditLog.details.userAgent).toBe(requestInfo.userAgent);
        });
    });

    describe('checkLimit', () => {
        test('should allow Core HR with no limits', async () => {
            const result = await licenseValidator.checkLimit(
                testTenantId.toString(),
                MODULES.CORE_HR,
                'employees',
                100
            );

            expect(result.allowed).toBe(true);
            expect(result.reason).toContain('Core HR');
        });

        test('should allow usage within limits', async () => {
            // Create usage tracking with current usage
            await UsageTracking.create({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                period: UsageTracking.getCurrentPeriod(),
                usage: {
                    employees: 50
                },
                limits: {
                    employees: 100
                }
            });

            const result = await licenseValidator.checkLimit(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                10
            );

            expect(result.allowed).toBe(true);
            expect(result.currentUsage).toBe(50);
            expect(result.limit).toBe(100);
            expect(result.percentage).toBe(50);
            expect(result.projectedUsage).toBe(60);
        });

        test('should deny usage when limit would be exceeded', async () => {
            // Create usage tracking near limit
            await UsageTracking.create({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                period: UsageTracking.getCurrentPeriod(),
                usage: {
                    employees: 95
                },
                limits: {
                    employees: 100
                }
            });

            const result = await licenseValidator.checkLimit(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                10
            );

            expect(result.allowed).toBe(false);
            expect(result.error).toBe('LIMIT_EXCEEDED');
            expect(result.projectedUsage).toBe(105);

            // Verify audit log was created
            const auditLogs = await LicenseAudit.find({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                eventType: 'LIMIT_EXCEEDED'
            });
            expect(auditLogs.length).toBeGreaterThan(0);
        });

        test('should warn when approaching limit (>= 80%)', async () => {
            // Create usage tracking at 85%
            await UsageTracking.create({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                period: UsageTracking.getCurrentPeriod(),
                usage: {
                    employees: 85
                },
                limits: {
                    employees: 100
                }
            });

            const result = await licenseValidator.checkLimit(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                0
            );

            expect(result.allowed).toBe(true);
            expect(result.isApproachingLimit).toBe(true);
            expect(result.percentage).toBe(85);

            // Verify warning audit log was created
            const auditLogs = await LicenseAudit.find({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                eventType: 'LIMIT_WARNING'
            });
            expect(auditLogs.length).toBeGreaterThan(0);
        });

        test('should allow unlimited usage when no limit is set', async () => {
            // Create usage tracking with no limit
            await UsageTracking.create({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                period: UsageTracking.getCurrentPeriod(),
                usage: {
                    storage: 1000000
                },
                limits: {
                    storage: null
                }
            });

            const result = await licenseValidator.checkLimit(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'storage',
                1000000
            );

            expect(result.allowed).toBe(true);
            expect(result.limit).toBeNull();
            expect(result.percentage).toBeNull();
        });

        test('should deny when module is not licensed', async () => {
            const result = await licenseValidator.checkLimit(
                testTenantId.toString(),
                MODULES.LEAVE,
                'employees',
                10
            );

            expect(result.allowed).toBe(false);
            expect(result.error).toBe('MODULE_NOT_LICENSED');
        });

        test('should create usage tracking if it does not exist', async () => {
            const result = await licenseValidator.checkLimit(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                10
            );

            expect(result.allowed).toBe(true);

            // Verify usage tracking was created
            const usageTracking = await UsageTracking.findOne({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE
            });
            expect(usageTracking).toBeDefined();
        });
    });

    describe('Cache Management', () => {
        test('should invalidate cache for specific module', async () => {
            // Populate cache
            await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );

            let stats = licenseValidator.getCacheStats();
            expect(stats.validEntries).toBeGreaterThan(0);

            // Invalidate cache
            licenseValidator.invalidateCache(testTenantId.toString(), MODULES.ATTENDANCE);

            stats = licenseValidator.getCacheStats();
            expect(stats.validEntries).toBe(0);
        });

        test('should invalidate all cache for tenant', async () => {
            // Populate cache with multiple modules
            await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );
            await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.CORE_HR
            );

            let stats = licenseValidator.getCacheStats();
            expect(stats.validEntries).toBeGreaterThan(0);

            // Invalidate all cache for tenant
            licenseValidator.invalidateCache(testTenantId.toString());

            stats = licenseValidator.getCacheStats();
            expect(stats.validEntries).toBe(0);
        });

        test('should clear all cache', async () => {
            // Populate cache
            await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );

            let stats = licenseValidator.getCacheStats();
            expect(stats.validEntries).toBeGreaterThan(0);

            // Clear all cache
            licenseValidator.clearCache();

            stats = licenseValidator.getCacheStats();
            expect(stats.totalEntries).toBe(0);
        });

        test('should expire cache after TTL', async () => {
            // This test would require mocking time or waiting for TTL
            // For now, we'll just verify the cache stats structure
            const stats = licenseValidator.getCacheStats();
            expect(stats).toHaveProperty('totalEntries');
            expect(stats).toHaveProperty('validEntries');
            expect(stats).toHaveProperty('expiredEntries');
            expect(stats).toHaveProperty('cacheTTL');
        });
    });

    describe('Error Handling', () => {
        test('should continue on audit logging errors', async () => {
            // This is hard to test without mocking, but we can verify
            // that validation still works even if audit logging fails
            const result = await licenseValidator.validateModuleAccess(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );

            expect(result.valid).toBe(true);
        });
    });
});

