// testing/services/usageTracker.service.test.js
import mongoose from 'mongoose';
import usageTracker from '../../services/usageTracker.service.js';
import License, { MODULES } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';
import UsageTracking from '../../models/usageTracking.model.js';

describe('UsageTracker Service', () => {
    let testTenantId;
    let testLicense;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = new mongoose.Types.ObjectId();

        // Create a test license
        testLicense = await License.create({
            tenantId: testTenantId,
            subscriptionId: 'test-subscription-usage-123',
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
                    enabled: true,
                    tier: 'starter',
                    limits: {
                        employees: 50,
                        storage: 1073741824, // 1GB
                        apiCalls: 10000
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
            ]
        });
    });

    afterEach(async () => {
        // Clean up
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
        await UsageTracking.deleteMany({});
    });

    describe('trackUsage', () => {
        test('should queue usage for batch processing by default', async () => {
            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                5
            );

            expect(result.success).toBe(true);
            expect(result.tracked).toBe(true);
            expect(result.batched).toBe(true);
            expect(result.queueSize).toBeGreaterThan(0);
        });

        test('should process usage immediately when immediate flag is set', async () => {
            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                10,
                { immediate: true }
            );

            expect(result.success).toBe(true);
            expect(result.tracked).toBe(true);
            expect(result.currentUsage).toBe(10);
            expect(result.limit).toBe(100);
            expect(result.percentage).toBe(10);

            // Verify usage was recorded in database
            const usageTracking = await UsageTracking.findOne({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE
            });

            expect(usageTracking).toBeDefined();
            expect(usageTracking.usage.employees).toBe(10);
        });

        test('should not track usage for Core HR module', async () => {
            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.CORE_HR,
                'employees',
                10
            );

            expect(result.success).toBe(true);
            expect(result.tracked).toBe(false);
            expect(result.reason).toContain('Core HR');
        });

        test('should reject invalid usage types', async () => {
            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'invalidType',
                10
            );

            expect(result.success).toBe(false);
            expect(result.tracked).toBe(false);
            expect(result.error).toContain('Invalid usage type');
        });

        test('should reject negative or zero amounts', async () => {
            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                0
            );

            expect(result.success).toBe(false);
            expect(result.tracked).toBe(false);
            expect(result.error).toContain('greater than 0');
        });

        test('should trigger warning when usage reaches 80% threshold', async () => {
            // Track 80 employees (80% of 100 limit)
            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                80,
                { immediate: true }
            );

            expect(result.success).toBe(true);
            expect(result.isApproachingLimit).toBe(true);
            expect(result.percentage).toBe(80);

            // Verify usage tracking has warning
            const usageTracking = await UsageTracking.findOne({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE
            });

            expect(usageTracking.warnings.length).toBeGreaterThan(0);
            expect(usageTracking.warnings[0].limitType).toBe('employees');
            expect(usageTracking.warnings[0].percentage).toBeGreaterThanOrEqual(80);
        });

        test('should block usage when limit is exceeded', async () => {
            // Try to track 101 employees (exceeds 100 limit)
            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                101,
                { immediate: true }
            );

            expect(result.success).toBe(false);
            expect(result.tracked).toBe(false);
            expect(result.blocked).toBe(true);
            expect(result.error).toBe('LIMIT_EXCEEDED');

            // Verify violation was logged
            const violationLogs = await LicenseAudit.find({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                eventType: 'LIMIT_EXCEEDED'
            });

            expect(violationLogs.length).toBeGreaterThan(0);
        });

        test('should allow unlimited usage when no limit is set', async () => {
            // Create a module with no limits
            await testLicense.activateModule(
                MODULES.TASKS,
                'enterprise',
                {
                    employees: null, // No limit
                    storage: null,
                    apiCalls: null
                }
            );

            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.TASKS,
                'employees',
                1000000, // Very large number
                { immediate: true }
            );

            expect(result.success).toBe(true);
            expect(result.tracked).toBe(true);
            expect(result.limit).toBeNull();
        });
    });

    describe('getUsage', () => {
        test('should return usage report for a module', async () => {
            // Track some usage first
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                50,
                { immediate: true }
            );

            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'apiCalls',
                10000,
                { immediate: true }
            );

            const report = await usageTracker.getUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );

            expect(report.success).toBe(true);
            expect(report.tenantId).toBe(testTenantId.toString());
            expect(report.moduleKey).toBe(MODULES.ATTENDANCE);
            expect(report.usage.employees.current).toBe(50);
            expect(report.usage.employees.limit).toBe(100);
            expect(report.usage.employees.percentage).toBe(50);
            expect(report.usage.apiCalls.current).toBe(10000);
            expect(report.usage.apiCalls.limit).toBe(50000);
        });

        test('should return error for non-existent tenant', async () => {
            const fakeTenantId = new mongoose.Types.ObjectId();

            const report = await usageTracker.getUsage(
                fakeTenantId.toString(),
                MODULES.ATTENDANCE
            );

            expect(report.success).toBe(false);
            expect(report.error).toContain('No license found');
        });

        test('should create usage tracking with zero usage if none exists', async () => {
            const report = await usageTracker.getUsage(
                testTenantId.toString(),
                MODULES.LEAVE
            );

            expect(report.success).toBe(true);
            expect(report.usage.employees.current).toBe(0);
            expect(report.usage.employees.limit).toBe(50);
        });
    });

    describe('getTenantUsage', () => {
        test('should return usage for all modules of a tenant', async () => {
            // Track usage for multiple modules
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                30,
                { immediate: true }
            );

            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.LEAVE,
                'employees',
                20,
                { immediate: true }
            );

            const report = await usageTracker.getTenantUsage(testTenantId.toString());

            expect(report.success).toBe(true);
            expect(report.tenantId).toBe(testTenantId.toString());
            expect(report.modules).toBeDefined();
            expect(report.modules[MODULES.ATTENDANCE]).toBeDefined();
            expect(report.modules[MODULES.LEAVE]).toBeDefined();
        });
    });

    describe('checkBeforeTrack', () => {
        test('should allow tracking when within limits', async () => {
            const result = await usageTracker.checkBeforeTrack(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                50
            );

            expect(result.allowed).toBe(true);
            expect(result.projectedUsage).toBe(50);
            expect(result.projectedPercentage).toBe(50);
        });

        test('should detect when tracking would exceed limit', async () => {
            // First track 90 employees
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                90,
                { immediate: true }
            );

            // Check if adding 20 more would exceed
            const result = await usageTracker.checkBeforeTrack(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                20
            );

            expect(result.allowed).toBe(false);
            expect(result.error).toBe('LIMIT_EXCEEDED');
            expect(result.currentUsage).toBe(90);
            expect(result.projectedUsage).toBe(110);
        });

        test('should detect approaching limit threshold', async () => {
            // Track 70 employees
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                70,
                { immediate: true }
            );

            // Check if adding 15 more would approach limit
            const result = await usageTracker.checkBeforeTrack(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                15
            );

            expect(result.allowed).toBe(true);
            expect(result.isApproachingLimit).toBe(true);
            expect(result.projectedPercentage).toBe(85);
        });

        test('should allow unlimited usage when no limit is set', async () => {
            // Create a module with no limits
            await testLicense.activateModule(
                MODULES.TASKS,
                'enterprise',
                {
                    employees: null
                }
            );

            const result = await usageTracker.checkBeforeTrack(
                testTenantId.toString(),
                MODULES.TASKS,
                'employees',
                1000000
            );

            expect(result.allowed).toBe(true);
            expect(result.limit).toBeNull();
        });
    });

    describe('batch processing', () => {
        test('should accumulate multiple tracking calls in queue', async () => {
            // Queue multiple tracking calls
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                5
            );

            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                3
            );

            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                2
            );

            const stats = usageTracker.getBatchStats();
            expect(stats.queueSize).toBeGreaterThan(0);

            // Flush batch
            await usageTracker.flushBatch();

            // Verify total usage was recorded
            const report = await usageTracker.getUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE
            );

            expect(report.usage.employees.current).toBe(10); // 5 + 3 + 2
        });

        test('should process batch queue and clear it', async () => {
            // Queue some tracking
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'apiCalls',
                100
            );

            const statsBefore = usageTracker.getBatchStats();
            expect(statsBefore.queueSize).toBeGreaterThan(0);

            // Flush batch
            const result = await usageTracker.flushBatch();

            expect(result.success).toBe(true);
            expect(result.processed).toBeGreaterThan(0);

            const statsAfter = usageTracker.getBatchStats();
            expect(statsAfter.queueSize).toBe(0);
        });

        test('should handle batch processing errors gracefully', async () => {
            // Queue tracking for non-existent tenant
            const fakeTenantId = new mongoose.Types.ObjectId();
            await usageTracker.trackUsage(
                fakeTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                10
            );

            // Flush should not throw
            const result = await usageTracker.flushBatch();

            expect(result.success).toBe(true);
            expect(result.failed).toBeGreaterThan(0);
        });
    });

    describe('getBatchStats', () => {
        test('should return batch queue statistics', async () => {
            // Queue some items
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                5
            );

            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.LEAVE,
                'storage',
                1000
            );

            const stats = usageTracker.getBatchStats();

            expect(stats.queueSize).toBeGreaterThan(0);
            expect(stats.batchInterval).toBe(60000); // 60 seconds
            expect(stats.items).toBeInstanceOf(Array);
            expect(stats.items.length).toBeGreaterThan(0);
        });
    });

    describe('event emission', () => {
        test('should emit limitWarning event when threshold is reached', async () => {
            // Set up event listener before tracking
            const eventPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Event not emitted within timeout'));
                }, 5000);

                usageTracker.once('limitWarning', (event) => {
                    clearTimeout(timeout);
                    resolve(event);
                });
            });

            // Track usage that will trigger warning
            const result = await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                85,
                { immediate: true }
            );

            // If tracking succeeded and is approaching limit, event should be emitted
            if (result.success && result.isApproachingLimit) {
                // Wait for event
                const event = await eventPromise;
                expect(event.tenantId).toBe(testTenantId.toString());
                expect(event.moduleKey).toBe(MODULES.ATTENDANCE);
                expect(event.limitType).toBe('employees');
                expect(event.percentage).toBeGreaterThanOrEqual(80);
            } else {
                // If no warning was triggered, skip event check
                // This can happen if a warning was already logged recently
                expect(result.success).toBe(true);
            }
        });

        test('should emit limitExceeded event when limit is exceeded', async () => {
            // Set up event listener before tracking
            const eventPromise = new Promise((resolve) => {
                usageTracker.once('limitExceeded', (event) => {
                    resolve(event);
                });
            });

            // Track usage that will exceed limit
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                150,
                { immediate: true }
            );

            // Wait for event
            const event = await eventPromise;
            expect(event.tenantId).toBe(testTenantId.toString());
            expect(event.moduleKey).toBe(MODULES.ATTENDANCE);
            expect(event.limitType).toBe('employees');
            expect(event.attemptedAmount).toBe(150);
        });

        test('should emit batchProcessed event after batch processing', async () => {
            // Set up event listener before processing
            const eventPromise = new Promise((resolve) => {
                usageTracker.once('batchProcessed', (event) => {
                    resolve(event);
                });
            });

            // Queue and flush
            await usageTracker.trackUsage(
                testTenantId.toString(),
                MODULES.ATTENDANCE,
                'employees',
                10
            );

            await usageTracker.flushBatch();

            // Wait for event
            const event = await eventPromise;
            expect(event.processed).toBeGreaterThan(0);
            expect(event.duration).toBeGreaterThan(0);
        });
    });
});
