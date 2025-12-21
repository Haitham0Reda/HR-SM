// testing/services/tenantRestrictionEnforcement.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import Tenant from '../../platform/tenants/models/Tenant.js';
import tenantService from '../../platform/tenants/services/tenantService.js';
import AppError from '../../core/errors/AppError.js';

describe('Tenant Restriction Enforcement Property-Based Tests', () => {
    let testTenantId;
    let testTenant;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create a test tenant with defined restrictions
        testTenant = await Tenant.create({
            tenantId: testTenantId,
            name: 'Test Tenant for Restrictions',
            status: 'active',
            deploymentMode: 'saas',
            usage: {
                userCount: 0,
                activeUsers: 0,
                storageUsed: 0,
                apiCallsThisMonth: 0,
                lastActivityAt: new Date()
            },
            restrictions: {
                maxUsers: 100,
                maxStorage: 1024, // MB
                maxAPICallsPerMonth: 10000
            },
            billing: {
                currentPlan: 'professional',
                billingCycle: 'monthly',
                paymentStatus: 'active',
                totalRevenue: 0
            }
        });
    });

    afterEach(async () => {
        // Clean up
        await Tenant.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    describe('Property 6: Tenant Restriction Enforcement', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 6: Tenant Restriction Enforcement
         * Validates: Requirements 2.3
         * 
         * For any tenant with defined limits, the system should enforce restrictions for users, 
         * storage, and API calls, preventing operations that exceed the limits.
         */
        test('should enforce user count restrictions and prevent exceeding limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        maxUsers: fc.integer({ min: 10, max: 200 }),
                        currentUsers: fc.integer({ min: 0, max: 50 }),
                        attemptedUsers: fc.integer({ min: 1, max: 300 })
                    }),
                    async ({ maxUsers, currentUsers, attemptedUsers }) => {
                        // Setup: Update tenant with test restrictions and current usage
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'restrictions.maxUsers': maxUsers,
                                'usage.userCount': currentUsers,
                                'usage.activeUsers': currentUsers
                            }
                        );

                        // Calculate if the attempted operation would exceed limits
                        const wouldExceedLimit = attemptedUsers > maxUsers;
                        const finalUserCount = Math.min(attemptedUsers, maxUsers);

                        // Action: Attempt to update user count
                        try {
                            // Simulate a user count update operation
                            const updatedTenant = await tenantService.updateUsage(testTenantId, {
                                userCount: attemptedUsers,
                                activeUsers: attemptedUsers
                            });

                            // Assertion 1: If within limits, operation should succeed
                            if (!wouldExceedLimit) {
                                expect(updatedTenant).toBeDefined();
                                expect(updatedTenant.usage.userCount).toBe(attemptedUsers);
                                expect(updatedTenant.usage.activeUsers).toBe(attemptedUsers);
                            }

                            // Assertion 2: User count should never exceed the restriction
                            const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                            expect(finalTenant.usage.userCount).toBeLessThanOrEqual(maxUsers);
                            expect(finalTenant.usage.activeUsers).toBeLessThanOrEqual(maxUsers);

                            // Assertion 3: Usage percentage should be calculated correctly
                            const expectedPercentage = (finalTenant.usage.activeUsers / maxUsers) * 100;
                            expect(finalTenant.userUsagePercentage).toBeCloseTo(expectedPercentage, 2);

                        } catch (error) {
                            // Assertion 4: If exceeding limits, should get appropriate error
                            if (wouldExceedLimit) {
                                expect(error).toBeInstanceOf(AppError);
                                expect(error.message).toMatch(/limit|exceed|restriction/i);
                            } else {
                                // If within limits, should not throw error
                                throw error;
                            }
                        }

                        // Assertion 5: Restrictions should remain unchanged
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant.restrictions.maxUsers).toBe(maxUsers);
                    }
                ),
                { numRuns: 30 }
            );
        });

        test('should enforce storage restrictions and prevent exceeding limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        maxStorageMB: fc.integer({ min: 100, max: 5000 }),
                        currentStorageMB: fc.integer({ min: 0, max: 1000 }),
                        attemptedStorageMB: fc.integer({ min: 0, max: 10000 })
                    }),
                    async ({ maxStorageMB, currentStorageMB, attemptedStorageMB }) => {
                        // Setup: Update tenant with test restrictions and current usage
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'restrictions.maxStorage': maxStorageMB,
                                'usage.storageUsed': currentStorageMB
                            }
                        );

                        // Calculate if the attempted operation would exceed limits
                        const wouldExceedLimit = attemptedStorageMB > maxStorageMB;

                        // Action: Attempt to update storage usage
                        try {
                            const updatedTenant = await tenantService.updateUsage(testTenantId, {
                                storageUsed: attemptedStorageMB
                            });

                            // Assertion 1: If within limits, operation should succeed
                            if (!wouldExceedLimit) {
                                expect(updatedTenant).toBeDefined();
                                expect(updatedTenant.usage.storageUsed).toBe(attemptedStorageMB);
                            }

                            // Assertion 2: Storage usage should never exceed the restriction
                            const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                            expect(finalTenant.usage.storageUsed).toBeLessThanOrEqual(maxStorageMB);

                            // Assertion 3: Storage percentage should be calculated correctly
                            const expectedPercentage = (finalTenant.usage.storageUsed / (maxStorageMB * 1024 * 1024)) * 100;
                            expect(finalTenant.storageUsagePercentage).toBeCloseTo(expectedPercentage, 2);

                        } catch (error) {
                            // Assertion 4: If exceeding limits, should get appropriate error
                            if (wouldExceedLimit) {
                                expect(error).toBeInstanceOf(AppError);
                                expect(error.message).toMatch(/storage|limit|exceed|restriction/i);
                            } else {
                                // If within limits, should not throw error
                                throw error;
                            }
                        }

                        // Assertion 5: Restrictions should remain unchanged
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant.restrictions.maxStorage).toBe(maxStorageMB);
                    }
                ),
                { numRuns: 30 }
            );
        });

        test('should enforce API call restrictions and prevent exceeding limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        maxAPICalls: fc.integer({ min: 1000, max: 50000 }),
                        currentAPICalls: fc.integer({ min: 0, max: 10000 }),
                        attemptedAPICalls: fc.integer({ min: 0, max: 100000 })
                    }),
                    async ({ maxAPICalls, currentAPICalls, attemptedAPICalls }) => {
                        // Setup: Update tenant with test restrictions and current usage
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'restrictions.maxAPICallsPerMonth': maxAPICalls,
                                'usage.apiCallsThisMonth': currentAPICalls
                            }
                        );

                        // Calculate if the attempted operation would exceed limits
                        const wouldExceedLimit = attemptedAPICalls > maxAPICalls;

                        // Action: Attempt to update API call usage
                        try {
                            const updatedTenant = await tenantService.updateUsage(testTenantId, {
                                apiCallsThisMonth: attemptedAPICalls
                            });

                            // Assertion 1: If within limits, operation should succeed
                            if (!wouldExceedLimit) {
                                expect(updatedTenant).toBeDefined();
                                expect(updatedTenant.usage.apiCallsThisMonth).toBe(attemptedAPICalls);
                            }

                            // Assertion 2: API calls should never exceed the restriction
                            const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                            expect(finalTenant.usage.apiCallsThisMonth).toBeLessThanOrEqual(maxAPICalls);

                            // Assertion 3: API usage percentage should be calculated correctly
                            const expectedPercentage = (finalTenant.usage.apiCallsThisMonth / maxAPICalls) * 100;
                            expect(finalTenant.apiUsagePercentage).toBeCloseTo(expectedPercentage, 2);

                        } catch (error) {
                            // Assertion 4: If exceeding limits, should get appropriate error
                            if (wouldExceedLimit) {
                                expect(error).toBeInstanceOf(AppError);
                                expect(error.message).toMatch(/api|call|limit|exceed|restriction/i);
                            } else {
                                // If within limits, should not throw error
                                throw error;
                            }
                        }

                        // Assertion 5: Restrictions should remain unchanged
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant.restrictions.maxAPICallsPerMonth).toBe(maxAPICalls);
                    }
                ),
                { numRuns: 30 }
            );
        });

        test('should enforce multiple restrictions simultaneously', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        restrictions: fc.record({
                            maxUsers: fc.integer({ min: 10, max: 100 }),
                            maxStorage: fc.integer({ min: 100, max: 2000 }),
                            maxAPICalls: fc.integer({ min: 1000, max: 20000 })
                        }),
                        attemptedUsage: fc.record({
                            users: fc.integer({ min: 0, max: 150 }),
                            storage: fc.integer({ min: 0, max: 3000 }),
                            apiCalls: fc.integer({ min: 0, max: 30000 })
                        })
                    }),
                    async ({ restrictions, attemptedUsage }) => {
                        // Setup: Update tenant with test restrictions
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'restrictions.maxUsers': restrictions.maxUsers,
                                'restrictions.maxStorage': restrictions.maxStorage,
                                'restrictions.maxAPICallsPerMonth': restrictions.maxAPICalls,
                                'usage.userCount': 0,
                                'usage.activeUsers': 0,
                                'usage.storageUsed': 0,
                                'usage.apiCallsThisMonth': 0
                            }
                        );

                        // Calculate which restrictions would be exceeded
                        const exceedsUsers = attemptedUsage.users > restrictions.maxUsers;
                        const exceedsStorage = attemptedUsage.storage > restrictions.maxStorage;
                        const exceedsAPICalls = attemptedUsage.apiCalls > restrictions.maxAPICalls;
                        const exceedsAny = exceedsUsers || exceedsStorage || exceedsAPICalls;

                        // Action: Attempt to update all usage metrics simultaneously
                        try {
                            const updatedTenant = await tenantService.updateUsage(testTenantId, {
                                userCount: attemptedUsage.users,
                                activeUsers: attemptedUsage.users,
                                storageUsed: attemptedUsage.storage,
                                apiCallsThisMonth: attemptedUsage.apiCalls
                            });

                            // Assertion 1: If all within limits, operation should succeed
                            if (!exceedsAny) {
                                expect(updatedTenant).toBeDefined();
                                expect(updatedTenant.usage.userCount).toBe(attemptedUsage.users);
                                expect(updatedTenant.usage.storageUsed).toBe(attemptedUsage.storage);
                                expect(updatedTenant.usage.apiCallsThisMonth).toBe(attemptedUsage.apiCalls);
                            }

                        } catch (error) {
                            // Assertion 2: If any restriction exceeded, should get appropriate error
                            if (exceedsAny) {
                                expect(error).toBeInstanceOf(AppError);
                                expect(error.message).toMatch(/limit|exceed|restriction/i);
                            } else {
                                // If all within limits, should not throw error
                                throw error;
                            }
                        }

                        // Assertion 3: All usage metrics should respect their respective limits
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant.usage.userCount).toBeLessThanOrEqual(restrictions.maxUsers);
                        expect(finalTenant.usage.activeUsers).toBeLessThanOrEqual(restrictions.maxUsers);
                        expect(finalTenant.usage.storageUsed).toBeLessThanOrEqual(restrictions.maxStorage);
                        expect(finalTenant.usage.apiCallsThisMonth).toBeLessThanOrEqual(restrictions.maxAPICalls);

                        // Assertion 4: All restrictions should remain unchanged
                        expect(finalTenant.restrictions.maxUsers).toBe(restrictions.maxUsers);
                        expect(finalTenant.restrictions.maxStorage).toBe(restrictions.maxStorage);
                        expect(finalTenant.restrictions.maxAPICallsPerMonth).toBe(restrictions.maxAPICalls);

                        // Assertion 5: Usage percentages should be calculated correctly
                        expect(finalTenant.userUsagePercentage).toBeLessThanOrEqual(100);
                        expect(finalTenant.storageUsagePercentage).toBeLessThanOrEqual(100);
                        expect(finalTenant.apiUsagePercentage).toBeLessThanOrEqual(100);
                    }
                ),
                { numRuns: 25 }
            );
        });

        test('should handle incremental API call restrictions correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        maxAPICalls: fc.integer({ min: 100, max: 1000 }),
                        initialCalls: fc.integer({ min: 0, max: 50 }),
                        incrementCount: fc.integer({ min: 1, max: 100 })
                    }),
                    async ({ maxAPICalls, initialCalls, incrementCount }) => {
                        // Setup: Update tenant with test restrictions and initial usage
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'restrictions.maxAPICallsPerMonth': maxAPICalls,
                                'usage.apiCallsThisMonth': initialCalls
                            }
                        );

                        let currentCalls = initialCalls;
                        let restrictionHit = false;
                        let successfulIncrements = 0;

                        // Action: Increment API calls one by one until limit is reached
                        for (let i = 0; i < incrementCount; i++) {
                            try {
                                await tenantService.incrementApiCalls(testTenantId);
                                currentCalls++;
                                successfulIncrements++;

                                // Check if we've hit the limit
                                if (currentCalls >= maxAPICalls) {
                                    restrictionHit = true;
                                    break;
                                }
                            } catch (error) {
                                // Should get restriction error when limit is reached
                                expect(error).toBeInstanceOf(AppError);
                                expect(error.message).toMatch(/api|call|limit|exceed|restriction/i);
                                restrictionHit = true;
                                break;
                            }
                        }

                        // Assertion 1: Final API call count should not exceed the limit
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant.usage.apiCallsThisMonth).toBeLessThanOrEqual(maxAPICalls);

                        // Assertion 2: If we started below the limit, we should have made some progress
                        if (initialCalls < maxAPICalls) {
                            expect(successfulIncrements).toBeGreaterThan(0);
                        }

                        // Assertion 3: If restriction was hit, final count should be at or near the limit
                        if (restrictionHit) {
                            expect(finalTenant.usage.apiCallsThisMonth).toBeGreaterThanOrEqual(
                                Math.min(maxAPICalls - 1, initialCalls)
                            );
                        }

                        // Assertion 4: API usage percentage should be accurate
                        const expectedPercentage = (finalTenant.usage.apiCallsThisMonth / maxAPICalls) * 100;
                        expect(finalTenant.apiUsagePercentage).toBeCloseTo(expectedPercentage, 2);

                        // Assertion 5: Restriction limit should remain unchanged
                        expect(finalTenant.restrictions.maxAPICallsPerMonth).toBe(maxAPICalls);
                    }
                ),
                { numRuns: 20 }
            );
        });

        test('should maintain restriction enforcement consistency during concurrent operations', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        maxUsers: fc.integer({ min: 50, max: 200 }),
                        concurrentOperations: fc.array(
                            fc.record({
                                type: fc.constantFrom('users', 'storage', 'apiCalls'),
                                value: fc.integer({ min: 1, max: 100 })
                            }),
                            { minLength: 2, maxLength: 8 }
                        )
                    }),
                    async ({ maxUsers, concurrentOperations }) => {
                        // Setup: Update tenant with test restrictions
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'restrictions.maxUsers': maxUsers,
                                'restrictions.maxStorage': 1000,
                                'restrictions.maxAPICallsPerMonth': 5000,
                                'usage.userCount': 0,
                                'usage.activeUsers': 0,
                                'usage.storageUsed': 0,
                                'usage.apiCallsThisMonth': 0
                            }
                        );

                        // Action: Perform concurrent operations
                        const operationPromises = concurrentOperations.map(async (op, index) => {
                            // Small delay to simulate real-world timing
                            await new Promise(resolve => setTimeout(resolve, index * 5));
                            
                            try {
                                if (op.type === 'users') {
                                    return await tenantService.updateUsage(testTenantId, {
                                        userCount: op.value,
                                        activeUsers: op.value
                                    });
                                } else if (op.type === 'storage') {
                                    return await tenantService.updateUsage(testTenantId, {
                                        storageUsed: op.value
                                    });
                                } else if (op.type === 'apiCalls') {
                                    return await tenantService.updateUsage(testTenantId, {
                                        apiCallsThisMonth: op.value
                                    });
                                }
                            } catch (error) {
                                // Expected for operations that exceed limits
                                return { error: error.message };
                            }
                        });

                        // Wait for all operations to complete
                        const results = await Promise.all(operationPromises);

                        // Assertion 1: All operations should complete (either success or controlled failure)
                        expect(results).toHaveLength(concurrentOperations.length);

                        // Assertion 2: Final state should respect all restrictions
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant.usage.userCount).toBeLessThanOrEqual(maxUsers);
                        expect(finalTenant.usage.activeUsers).toBeLessThanOrEqual(maxUsers);
                        expect(finalTenant.usage.storageUsed).toBeLessThanOrEqual(1000);
                        expect(finalTenant.usage.apiCallsThisMonth).toBeLessThanOrEqual(5000);

                        // Assertion 3: All restrictions should remain unchanged
                        expect(finalTenant.restrictions.maxUsers).toBe(maxUsers);
                        expect(finalTenant.restrictions.maxStorage).toBe(1000);
                        expect(finalTenant.restrictions.maxAPICallsPerMonth).toBe(5000);

                        // Assertion 4: Usage percentages should be within valid range
                        expect(finalTenant.userUsagePercentage).toBeGreaterThanOrEqual(0);
                        expect(finalTenant.userUsagePercentage).toBeLessThanOrEqual(100);
                        expect(finalTenant.storageUsagePercentage).toBeGreaterThanOrEqual(0);
                        expect(finalTenant.storageUsagePercentage).toBeLessThanOrEqual(100);
                        expect(finalTenant.apiUsagePercentage).toBeGreaterThanOrEqual(0);
                        expect(finalTenant.apiUsagePercentage).toBeLessThanOrEqual(100);
                    }
                ),
                { numRuns: 15 }
            );
        });

        test('should correctly identify when restrictions are exceeded in limit checking', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        restrictions: fc.record({
                            maxUsers: fc.integer({ min: 10, max: 100 }),
                            maxStorage: fc.integer({ min: 100, max: 1000 }),
                            maxAPICalls: fc.integer({ min: 1000, max: 10000 })
                        }),
                        usage: fc.record({
                            users: fc.integer({ min: 0, max: 150 }),
                            storage: fc.integer({ min: 0, max: 1500 }),
                            apiCalls: fc.integer({ min: 0, max: 15000 })
                        })
                    }),
                    async ({ restrictions, usage }) => {
                        // Setup: Update tenant with test data
                        await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'restrictions.maxUsers': restrictions.maxUsers,
                                'restrictions.maxStorage': restrictions.maxStorage,
                                'restrictions.maxAPICallsPerMonth': restrictions.maxAPICalls,
                                'usage.userCount': usage.users,
                                'usage.activeUsers': usage.users,
                                'usage.storageUsed': usage.storage,
                                'usage.apiCallsThisMonth': usage.apiCalls
                            }
                        );

                        // Action: Check limits
                        const limitCheck = await tenantService.checkLimits(testTenantId);

                        // Calculate expected exceeded status
                        const expectedExceededUsers = usage.users >= restrictions.maxUsers;
                        const expectedExceededStorage = usage.storage >= restrictions.maxStorage;
                        const expectedExceededAPICalls = usage.apiCalls >= restrictions.maxAPICalls;

                        // Assertion 1: Limit check should correctly identify exceeded users
                        if (expectedExceededUsers) {
                            expect(limitCheck.users).toBe(true);
                        } else {
                            expect(limitCheck.users).toBeFalsy();
                        }

                        // Assertion 2: Limit check should correctly identify exceeded storage
                        if (expectedExceededStorage) {
                            expect(limitCheck.storage).toBe(true);
                        } else {
                            expect(limitCheck.storage).toBeFalsy();
                        }

                        // Assertion 3: Limit check should correctly identify exceeded API calls
                        if (expectedExceededAPICalls) {
                            expect(limitCheck.apiCalls).toBe(true);
                        } else {
                            expect(limitCheck.apiCalls).toBeFalsy();
                        }

                        // Assertion 4: Usage percentages should reflect actual usage
                        const tenant = await Tenant.findOne({ tenantId: testTenantId });
                        const expectedUserPercentage = (usage.users / restrictions.maxUsers) * 100;
                        const expectedStoragePercentage = (usage.storage / (restrictions.maxStorage * 1024 * 1024)) * 100;
                        const expectedAPIPercentage = (usage.apiCalls / restrictions.maxAPICalls) * 100;

                        expect(tenant.userUsagePercentage).toBeCloseTo(expectedUserPercentage, 2);
                        expect(tenant.storageUsagePercentage).toBeCloseTo(expectedStoragePercentage, 2);
                        expect(tenant.apiUsagePercentage).toBeCloseTo(expectedAPIPercentage, 2);
                    }
                ),
                { numRuns: 25 }
            );
        });
    });
});