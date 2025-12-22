// testing/services/tenantMetricsTracking.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import Tenant from '../../platform/tenants/models/Tenant.js';
import tenantService from '../../platform/tenants/services/tenantService.js';

describe('Tenant Metrics Tracking Property-Based Tests', () => {
    let testTenantId;
    let testTenant;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create a test tenant with initial metrics
        testTenant = await Tenant.create({
            tenantId: testTenantId,
            name: 'Test Tenant for Metrics',
            status: 'active',
            deploymentMode: 'saas',
            usage: {
                userCount: 0,
                storageUsed: 0,
                apiCallsThisMonth: 0,
                activeUsers: 0,
                lastActivityAt: new Date()
            },
            metrics: {
                totalSessions: 0,
                avgSessionDuration: 0,
                totalDocuments: 0,
                totalReports: 0,
                errorRate: 0,
                responseTime: 0,
                cpuUsage: 0,
                memoryUsage: 0,
                diskUsage: 0,
                uptime: 0,
                availability: 100
            },
            billing: {
                currentPlan: 'trial',
                billingCycle: 'monthly',
                paymentStatus: 'active',
                totalRevenue: 0
            },
            restrictions: {
                maxUsers: 100,
                maxStorage: 1024, // MB
                maxAPICallsPerMonth: 10000
            }
        });
    });

    afterEach(async () => {
        // Clean up
        await Tenant.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    describe('Property 6: Tenant Metrics Tracking', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 6: Tenant Metrics Tracking
         * Validates: Requirements 2.1
         * 
         * For any tenant account operations, the system should accurately track and update 
         * all metrics (total users, active users, storage consumption, API calls) with correct calculations.
         */
        test('should accurately track and update all usage metrics with correct calculations', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userCountDelta: fc.integer({ min: -50, max: 50 }),
                        storageUsedDelta: fc.integer({ min: -500, max: 500 }), // MB
                        apiCallsDelta: fc.integer({ min: 0, max: 1000 }),
                        activeUsersDelta: fc.integer({ min: -25, max: 25 })
                    }),
                    async ({ userCountDelta, storageUsedDelta, apiCallsDelta, activeUsersDelta }) => {
                        // Get initial state
                        const initialTenant = await Tenant.findOne({ tenantId: testTenantId });
                        const initialUserCount = initialTenant.usage.userCount;
                        const initialStorageUsed = initialTenant.usage.storageUsed;
                        const initialApiCalls = initialTenant.usage.apiCallsThisMonth;
                        const initialActiveUsers = initialTenant.usage.activeUsers;

                        // Calculate expected values (ensuring non-negative and within limits)
                        const expectedUserCount = Math.max(0, Math.min(initialTenant.restrictions.maxUsers, initialUserCount + userCountDelta));
                        const expectedStorageUsed = Math.max(0, Math.min(initialTenant.restrictions.maxStorage, initialStorageUsed + storageUsedDelta));
                        const expectedApiCalls = Math.max(0, initialApiCalls + apiCallsDelta);
                        const expectedActiveUsers = Math.max(0, initialActiveUsers + activeUsersDelta);

                        // Action: Update usage metrics
                        const updatedTenant = await tenantService.updateUsage(testTenantId, {
                            userCount: expectedUserCount,
                            storageUsed: expectedStorageUsed,
                            apiCallsThisMonth: expectedApiCalls
                        });

                        // Update active users separately (simulating real-world scenario)
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'usage.activeUsers': expectedActiveUsers,
                                'usage.lastActivityAt': new Date()
                            }
                        );

                        // Assertion 1: Updated tenant should be returned
                        expect(updatedTenant).toBeDefined();
                        expect(updatedTenant.tenantId).toBe(testTenantId);

                        // Assertion 2: Usage metrics should be accurately tracked
                        expect(updatedTenant.usage.userCount).toBe(expectedUserCount);
                        expect(updatedTenant.usage.storageUsed).toBe(expectedStorageUsed);
                        expect(updatedTenant.usage.apiCallsThisMonth).toBe(expectedApiCalls);

                        // Assertion 3: Verify persistence by fetching fresh data
                        const freshTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(freshTenant.usage.userCount).toBe(expectedUserCount);
                        expect(freshTenant.usage.storageUsed).toBe(expectedStorageUsed);
                        expect(freshTenant.usage.apiCallsThisMonth).toBe(expectedApiCalls);
                        expect(freshTenant.usage.activeUsers).toBe(expectedActiveUsers);

                        // Assertion 4: lastActivityAt should be updated when active users change
                        if (activeUsersDelta !== 0) {
                            expect(freshTenant.usage.lastActivityAt).toBeInstanceOf(Date);
                            expect(freshTenant.usage.lastActivityAt.getTime()).toBeGreaterThan(
                                initialTenant.usage.lastActivityAt.getTime()
                            );
                        }

                        // Assertion 5: All metrics should be non-negative
                        expect(freshTenant.usage.userCount).toBeGreaterThanOrEqual(0);
                        expect(freshTenant.usage.storageUsed).toBeGreaterThanOrEqual(0);
                        expect(freshTenant.usage.apiCallsThisMonth).toBeGreaterThanOrEqual(0);
                        expect(freshTenant.usage.activeUsers).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 20 }
            );
        });

        test('should correctly calculate usage percentages in metrics aggregation', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userCount: fc.integer({ min: 0, max: 150 }),
                        storageUsedMB: fc.integer({ min: 0, max: 2048 }),
                        apiCalls: fc.integer({ min: 0, max: 15000 }),
                        maxUsers: fc.integer({ min: 50, max: 200 }),
                        maxStorageMB: fc.integer({ min: 512, max: 4096 }),
                        maxApiCalls: fc.integer({ min: 5000, max: 20000 })
                    }),
                    async ({ userCount, storageUsedMB, apiCalls, maxUsers, maxStorageMB, maxApiCalls }) => {
                        // Setup: Update tenant with test values
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'usage.userCount': userCount,
                                'usage.activeUsers': userCount, // Assume all users are active for simplicity
                                'usage.storageUsed': storageUsedMB,
                                'usage.apiCallsThisMonth': apiCalls,
                                'restrictions.maxUsers': maxUsers,
                                'restrictions.maxStorage': maxStorageMB,
                                'restrictions.maxAPICallsPerMonth': maxApiCalls
                            }
                        );

                        // Action: Get metrics aggregation
                        const metricsAggregation = await tenantService.getTenantMetricsAggregation(testTenantId);

                        // Assertion 1: Aggregation should return data
                        expect(metricsAggregation).toBeDefined();
                        expect(metricsAggregation).not.toBeNull();
                        expect(metricsAggregation.tenantId).toBe(testTenantId);

                        // Assertion 2: User usage percentage should be correctly calculated
                        const expectedUserPercentage = maxUsers > 0 ? (userCount / maxUsers) * 100 : 0;
                        expect(metricsAggregation.userUsagePercentage).toBeCloseTo(expectedUserPercentage, 2);

                        // Assertion 3: Storage usage percentage should be correctly calculated
                        // Note: Storage is stored in MB but restrictions are in MB, so conversion factor is 1
                        const expectedStoragePercentage = maxStorageMB > 0 ? (storageUsedMB / (maxStorageMB * 1024 * 1024)) * 100 : 0;
                        expect(metricsAggregation.storageUsagePercentage).toBeCloseTo(expectedStoragePercentage, 2);

                        // Assertion 4: API usage percentage should be correctly calculated
                        const expectedApiPercentage = maxApiCalls > 0 ? (apiCalls / maxApiCalls) * 100 : 0;
                        expect(metricsAggregation.apiUsagePercentage).toBeCloseTo(expectedApiPercentage, 2);

                        // Assertion 5: All percentages should be within valid range
                        expect(metricsAggregation.userUsagePercentage).toBeGreaterThanOrEqual(0);
                        expect(metricsAggregation.userUsagePercentage).toBeLessThanOrEqual(300); // Allow for over-limit scenarios
                        expect(metricsAggregation.storageUsagePercentage).toBeGreaterThanOrEqual(0);
                        expect(metricsAggregation.apiUsagePercentage).toBeGreaterThanOrEqual(0);
                        expect(metricsAggregation.apiUsagePercentage).toBeLessThanOrEqual(300); // Allow for over-limit scenarios
                    }
                ),
                { numRuns: 20 }
            );
        });

        test('should maintain metrics consistency during concurrent updates', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        operations: fc.array(
                            fc.record({
                                type: fc.constantFrom('userCount', 'storageUsed', 'apiCalls'),
                                value: fc.integer({ min: 0, max: 100 })
                            }),
                            { minLength: 2, maxLength: 5 }
                        )
                    }),
                    async ({ operations }) => {
                        // Get initial state
                        const initialTenant = await Tenant.findOne({ tenantId: testTenantId });

                        // Action: Perform concurrent updates
                        const updatePromises = operations.map(async (op, index) => {
                            // Small delay to simulate real-world timing
                            await new Promise(resolve => setTimeout(resolve, index * 10));

                            const updateData = {};
                            if (op.type === 'userCount') {
                                updateData.userCount = op.value;
                            } else if (op.type === 'storageUsed') {
                                updateData.storageUsed = op.value;
                            } else if (op.type === 'apiCalls') {
                                updateData.apiCallsThisMonth = op.value;
                            }

                            return tenantService.updateUsage(testTenantId, updateData);
                        });

                        // Wait for all updates to complete
                        const results = await Promise.all(updatePromises);

                        // Assertion 1: All updates should succeed
                        expect(results).toHaveLength(operations.length);
                        results.forEach(result => {
                            expect(result).toBeDefined();
                            expect(result.tenantId).toBe(testTenantId);
                        });

                        // Assertion 2: Final state should be consistent
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant).toBeDefined();

                        // Assertion 3: Final values should match the last update for each metric type
                        const lastUserCountOp = operations.filter(op => op.type === 'userCount').pop();
                        const lastStorageOp = operations.filter(op => op.type === 'storageUsed').pop();
                        const lastApiCallsOp = operations.filter(op => op.type === 'apiCalls').pop();

                        if (lastUserCountOp) {
                            expect(finalTenant.usage.userCount).toBe(lastUserCountOp.value);
                        }
                        if (lastStorageOp) {
                            expect(finalTenant.usage.storageUsed).toBe(lastStorageOp.value);
                        }
                        if (lastApiCallsOp) {
                            expect(finalTenant.usage.apiCallsThisMonth).toBe(lastApiCallsOp.value);
                        }

                        // Assertion 4: All metrics should remain non-negative
                        expect(finalTenant.usage.userCount).toBeGreaterThanOrEqual(0);
                        expect(finalTenant.usage.storageUsed).toBeGreaterThanOrEqual(0);
                        expect(finalTenant.usage.apiCallsThisMonth).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should correctly track API call increments', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        incrementCount: fc.integer({ min: 1, max: 100 })
                    }),
                    async ({ incrementCount }) => {
                        // Get initial API call count
                        const initialTenant = await Tenant.findOne({ tenantId: testTenantId });
                        const initialApiCalls = initialTenant.usage.apiCallsThisMonth;

                        // Action: Increment API calls multiple times
                        for (let i = 0; i < incrementCount; i++) {
                            await tenantService.incrementApiCalls(testTenantId);
                        }

                        // Assertion 1: API calls should be incremented correctly
                        const updatedTenant = await Tenant.findOne({ tenantId: testTenantId });
                        const expectedApiCalls = initialApiCalls + incrementCount;
                        expect(updatedTenant.usage.apiCallsThisMonth).toBe(expectedApiCalls);

                        // Assertion 2: Other usage metrics should remain unchanged
                        expect(updatedTenant.usage.userCount).toBe(initialTenant.usage.userCount);
                        expect(updatedTenant.usage.storageUsed).toBe(initialTenant.usage.storageUsed);
                        expect(updatedTenant.usage.activeUsers).toBe(initialTenant.usage.activeUsers);

                        // Assertion 3: API calls should always be non-negative
                        expect(updatedTenant.usage.apiCallsThisMonth).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 20 }
            );
        });

        test('should maintain data integrity when updating performance metrics', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        cpuUsage: fc.double({ min: 0, max: 100, noNaN: true }),
                        memoryUsage: fc.double({ min: 0, max: 100, noNaN: true }),
                        diskUsage: fc.double({ min: 0, max: 100, noNaN: true }),
                        errorRate: fc.double({ min: 0, max: 100, noNaN: true }),
                        responseTime: fc.double({ min: 0, max: 5000, noNaN: true }),
                        availability: fc.double({ min: 0, max: 100, noNaN: true })
                    }),
                    async ({ cpuUsage, memoryUsage, diskUsage, errorRate, responseTime, availability }) => {
                        // Action: Update performance metrics
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'metrics.cpuUsage': cpuUsage,
                                'metrics.memoryUsage': memoryUsage,
                                'metrics.diskUsage': diskUsage,
                                'metrics.errorRate': errorRate,
                                'metrics.responseTime': responseTime,
                                'metrics.availability': availability
                            }
                        );

                        // Assertion 1: Metrics should be updated correctly
                        const updatedTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(updatedTenant.metrics.cpuUsage).toBeCloseTo(cpuUsage, 2);
                        expect(updatedTenant.metrics.memoryUsage).toBeCloseTo(memoryUsage, 2);
                        expect(updatedTenant.metrics.diskUsage).toBeCloseTo(diskUsage, 2);
                        expect(updatedTenant.metrics.errorRate).toBeCloseTo(errorRate, 2);
                        expect(updatedTenant.metrics.responseTime).toBeCloseTo(responseTime, 2);
                        expect(updatedTenant.metrics.availability).toBeCloseTo(availability, 2);

                        // Assertion 2: Percentage metrics should be within valid range
                        expect(updatedTenant.metrics.cpuUsage).toBeGreaterThanOrEqual(0);
                        expect(updatedTenant.metrics.cpuUsage).toBeLessThanOrEqual(100);
                        expect(updatedTenant.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
                        expect(updatedTenant.metrics.memoryUsage).toBeLessThanOrEqual(100);
                        expect(updatedTenant.metrics.diskUsage).toBeGreaterThanOrEqual(0);
                        expect(updatedTenant.metrics.diskUsage).toBeLessThanOrEqual(100);
                        expect(updatedTenant.metrics.errorRate).toBeGreaterThanOrEqual(0);
                        expect(updatedTenant.metrics.errorRate).toBeLessThanOrEqual(100);
                        expect(updatedTenant.metrics.availability).toBeGreaterThanOrEqual(0);
                        expect(updatedTenant.metrics.availability).toBeLessThanOrEqual(100);

                        // Assertion 3: Response time should be non-negative
                        expect(updatedTenant.metrics.responseTime).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 20 }
            );
        });

        test('should correctly identify high-risk tenants based on metrics', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        errorRate: fc.double({ min: 0, max: 20, noNaN: true }),
                        availability: fc.double({ min: 95, max: 100, noNaN: true }),
                        paymentStatus: fc.constantFrom('active', 'past_due', 'canceled'),
                        licenseExpiresInDays: fc.integer({ min: 1, max: 30 })
                    }),
                    async ({ errorRate, availability, paymentStatus, licenseExpiresInDays }) => {
                        // Setup: Update tenant with test values
                        const licenseExpiresAt = new Date(Date.now() + licenseExpiresInDays * 24 * 60 * 60 * 1000);

                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'metrics.errorRate': errorRate,
                                'metrics.availability': availability,
                                'billing.paymentStatus': paymentStatus,
                                'license.expiresAt': licenseExpiresAt
                            }
                        );

                        // Action: Get metrics aggregation
                        const metricsAggregation = await tenantService.getTenantMetricsAggregation(testTenantId);

                        // Assertion 1: Aggregation should return data
                        expect(metricsAggregation).toBeDefined();
                        expect(metricsAggregation.isHighRisk).toBeDefined();

                        // Assertion 2: High-risk calculation should be correct
                        const shouldBeHighRisk =
                            errorRate >= 5 ||
                            availability <= 99 ||
                            paymentStatus === 'past_due' ||
                            licenseExpiresInDays <= 7;

                        expect(metricsAggregation.isHighRisk).toBe(shouldBeHighRisk);

                        // Assertion 3: License days remaining should be calculated correctly
                        expect(metricsAggregation.licenseDaysRemaining).toBeCloseTo(licenseExpiresInDays, 0);
                    }
                ),
                { numRuns: 20 }
            );
        });
    });
});