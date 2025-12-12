// testing/services/usageLimitCheckLogging.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import usageTracker from '../../services/usageTracker.service.js';
import License, { MODULES, PRICING_TIERS } from '../../platform/system/models/license.model.js';
import LicenseAudit from '../../platform/system/models/licenseAudit.model.js';
import UsageTracking from '../../platform/system/models/usageTracking.model.js';

describe('Usage Limit Check Logging - Property-Based Tests', () => {
    beforeEach(async () => {
        // Clean up any existing data
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
        await UsageTracking.deleteMany({});
    });

    afterEach(async () => {
        // Clean up
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
        await UsageTracking.deleteMany({});
    });

    describe('Property 33: Usage Limit Check Logging', () => {
        /**
         * Feature: feature-productization, Property 33: Usage Limit Check Logging
         * Validates: Requirements 10.2
         * 
         * For any usage limit check, the current usage value and limit value should be logged.
         */
        test('should log current usage and limit values when checking usage limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS,
                            MODULES.TASKS
                        ),
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        currentUsage: fc.integer({ min: 0, max: 100 }),
                        limit: fc.integer({ min: 50, max: 200 }),
                        checkAmount: fc.integer({ min: 1, max: 50 })
                    }),
                    async ({ moduleKey, limitType, tier, currentUsage, limit, checkAmount }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with module enabled
                        const limits = {
                            employees: limitType === 'employees' ? limit : 100,
                            storage: limitType === 'storage' ? limit : 10737418240,
                            apiCalls: limitType === 'apiCalls' ? limit : 50000
                        };

                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Setup: Create usage tracking with current usage
                        const period = UsageTracking.getCurrentPeriod();
                        const usage = {
                            employees: limitType === 'employees' ? currentUsage : 0,
                            storage: limitType === 'storage' ? currentUsage : 0,
                            apiCalls: limitType === 'apiCalls' ? currentUsage : 0
                        };

                        await UsageTracking.create({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            period,
                            usage,
                            limits
                        });

                        // Clear any existing audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Check usage limit
                        const checkResult = await usageTracker.checkBeforeTrack(
                            uniqueTenantId.toString(),
                            moduleKey,
                            limitType,
                            checkAmount
                        );

                        // Assertion 1: Check result should be defined
                        expect(checkResult).toBeDefined();
                        expect(checkResult).not.toBeNull();

                        // Assertion 2: Check result should contain current usage
                        expect(checkResult.currentUsage).toBeDefined();
                        expect(checkResult.currentUsage).toBe(currentUsage);

                        // Assertion 3: Check result should contain limit
                        expect(checkResult.limit).toBeDefined();
                        expect(checkResult.limit).toBe(limit);

                        // Assertion 4: Check result should contain limit type
                        expect(checkResult.limitType).toBeDefined();
                        expect(checkResult.limitType).toBe(limitType);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should log usage and limit values for checks that would exceed limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, limitType, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create a scenario where check will exceed limit
                        const limit = 100;
                        const currentUsage = 95; // Close to limit
                        const checkAmount = 10; // Will exceed

                        const limits = {
                            employees: limitType === 'employees' ? limit : 200,
                            storage: limitType === 'storage' ? limit : 21474836480,
                            apiCalls: limitType === 'apiCalls' ? limit : 100000
                        };

                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Setup: Create usage tracking
                        const period = UsageTracking.getCurrentPeriod();
                        const usage = {
                            employees: limitType === 'employees' ? currentUsage : 0,
                            storage: limitType === 'storage' ? currentUsage : 0,
                            apiCalls: limitType === 'apiCalls' ? currentUsage : 0
                        };

                        await UsageTracking.create({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            period,
                            usage,
                            limits
                        });

                        // Action: Check usage limit (should fail)
                        const checkResult = await usageTracker.checkBeforeTrack(
                            uniqueTenantId.toString(),
                            moduleKey,
                            limitType,
                            checkAmount
                        );

                        // Assertion 1: Check should not be allowed
                        expect(checkResult.allowed).toBe(false);

                        // Assertion 2: Current usage should be logged
                        expect(checkResult.currentUsage).toBeDefined();
                        expect(checkResult.currentUsage).toBe(currentUsage);

                        // Assertion 3: Limit should be logged
                        expect(checkResult.limit).toBeDefined();
                        expect(checkResult.limit).toBe(limit);

                        // Assertion 4: Projected usage should be logged
                        expect(checkResult.projectedUsage).toBeDefined();
                        expect(checkResult.projectedUsage).toBe(currentUsage + checkAmount);

                        // Assertion 5: Error should indicate limit exceeded
                        expect(checkResult.error).toBe('LIMIT_EXCEEDED');

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should log usage and limit values for checks within limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.DOCUMENTS
                        ),
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        usagePercentage: fc.integer({ min: 10, max: 70 }) // Well within limits
                    }),
                    async ({ moduleKey, limitType, tier, usagePercentage }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create a scenario where check will succeed
                        const limit = 100;
                        const currentUsage = Math.floor((limit * usagePercentage) / 100);
                        const checkAmount = 5; // Small amount

                        const limits = {
                            employees: limitType === 'employees' ? limit : 200,
                            storage: limitType === 'storage' ? limit : 21474836480,
                            apiCalls: limitType === 'apiCalls' ? limit : 100000
                        };

                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Setup: Create usage tracking
                        const period = UsageTracking.getCurrentPeriod();
                        const usage = {
                            employees: limitType === 'employees' ? currentUsage : 0,
                            storage: limitType === 'storage' ? currentUsage : 0,
                            apiCalls: limitType === 'apiCalls' ? currentUsage : 0
                        };

                        await UsageTracking.create({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            period,
                            usage,
                            limits
                        });

                        // Action: Check usage limit (should succeed)
                        const checkResult = await usageTracker.checkBeforeTrack(
                            uniqueTenantId.toString(),
                            moduleKey,
                            limitType,
                            checkAmount
                        );

                        // Assertion 1: Check should be allowed
                        expect(checkResult.allowed).toBe(true);

                        // Assertion 2: Current usage should be logged
                        expect(checkResult.currentUsage).toBeDefined();
                        expect(checkResult.currentUsage).toBe(currentUsage);

                        // Assertion 3: Limit should be logged
                        expect(checkResult.limit).toBeDefined();
                        expect(checkResult.limit).toBe(limit);

                        // Assertion 4: Projected usage should be logged
                        expect(checkResult.projectedUsage).toBeDefined();
                        expect(checkResult.projectedUsage).toBe(currentUsage + checkAmount);

                        // Assertion 5: Percentage should be calculated
                        expect(checkResult.percentage).toBeDefined();
                        expect(checkResult.percentage).toBe(Math.round((currentUsage / limit) * 100));

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should log usage and limit values for all limit types', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with all limit types
                        const limits = {
                            employees: 100,
                            storage: 10737418240,
                            apiCalls: 50000
                        };

                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Setup: Create usage tracking with some usage
                        const period = UsageTracking.getCurrentPeriod();
                        await UsageTracking.create({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            period,
                            usage: {
                                employees: 50,
                                storage: 5368709120,
                                apiCalls: 25000
                            },
                            limits
                        });

                        // Action: Check each limit type
                        const limitTypes = ['employees', 'storage', 'apiCalls'];
                        
                        for (const limitType of limitTypes) {
                            const checkResult = await usageTracker.checkBeforeTrack(
                                uniqueTenantId.toString(),
                                moduleKey,
                                limitType,
                                1
                            );

                            // Assertion 1: Check result should contain current usage
                            expect(checkResult.currentUsage).toBeDefined();
                            expect(typeof checkResult.currentUsage).toBe('number');
                            expect(checkResult.currentUsage).toBeGreaterThanOrEqual(0);

                            // Assertion 2: Check result should contain limit
                            expect(checkResult.limit).toBeDefined();
                            expect(typeof checkResult.limit).toBe('number');
                            expect(checkResult.limit).toBe(limits[limitType]);

                            // Assertion 3: Check result should contain limit type
                            expect(checkResult.limitType).toBe(limitType);

                            // Assertion 4: Percentage should be calculated correctly
                            if (checkResult.limit && checkResult.limit > 0) {
                                const expectedPercentage = Math.round(
                                    (checkResult.currentUsage / checkResult.limit) * 100
                                );
                                expect(checkResult.percentage).toBe(expectedPercentage);
                            }
                        }

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should handle checks for modules with no limits configured', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.COMMUNICATION,
                            MODULES.REPORTING,
                            MODULES.TASKS
                        ),
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, limitType, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with no limits for the specific limit type
                        const limits = {
                            employees: limitType === 'employees' ? null : 100,
                            storage: limitType === 'storage' ? null : 10737418240,
                            apiCalls: limitType === 'apiCalls' ? null : 50000
                        };

                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Setup: Create usage tracking
                        const period = UsageTracking.getCurrentPeriod();
                        await UsageTracking.create({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            period,
                            usage: {
                                employees: 50,
                                storage: 5368709120,
                                apiCalls: 25000
                            },
                            limits
                        });

                        // Action: Check usage limit
                        const checkResult = await usageTracker.checkBeforeTrack(
                            uniqueTenantId.toString(),
                            moduleKey,
                            limitType,
                            10
                        );

                        // Assertion 1: Check should be allowed (no limit)
                        expect(checkResult.allowed).toBe(true);

                        // Assertion 2: Current usage should still be logged
                        expect(checkResult.currentUsage).toBeDefined();
                        expect(typeof checkResult.currentUsage).toBe('number');

                        // Assertion 3: Limit should be null
                        expect(checkResult.limit).toBeNull();

                        // Assertion 4: Reason should indicate no limit
                        expect(checkResult.reason).toBe('No limit configured');

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should log usage and limit values consistently across multiple checks', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        checkCount: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, limitType, tier, checkCount }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license
                        const limit = 100;
                        const limits = {
                            employees: limitType === 'employees' ? limit : 200,
                            storage: limitType === 'storage' ? limit : 21474836480,
                            apiCalls: limitType === 'apiCalls' ? limit : 100000
                        };

                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Setup: Create usage tracking
                        const period = UsageTracking.getCurrentPeriod();
                        const initialUsage = 30;
                        const usage = {
                            employees: limitType === 'employees' ? initialUsage : 0,
                            storage: limitType === 'storage' ? initialUsage : 0,
                            apiCalls: limitType === 'apiCalls' ? initialUsage : 0
                        };

                        await UsageTracking.create({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            period,
                            usage,
                            limits
                        });

                        // Action: Perform multiple checks
                        const checkResults = [];
                        for (let i = 0; i < checkCount; i++) {
                            const result = await usageTracker.checkBeforeTrack(
                                uniqueTenantId.toString(),
                                moduleKey,
                                limitType,
                                5
                            );
                            checkResults.push(result);
                        }

                        // Assertion 1: All checks should return consistent current usage
                        for (const result of checkResults) {
                            expect(result.currentUsage).toBe(initialUsage);
                        }

                        // Assertion 2: All checks should return consistent limit
                        for (const result of checkResults) {
                            expect(result.limit).toBe(limit);
                        }

                        // Assertion 3: All checks should return consistent limit type
                        for (const result of checkResults) {
                            expect(result.limitType).toBe(limitType);
                        }

                        // Assertion 4: All checks should calculate same percentage
                        const expectedPercentage = Math.round((initialUsage / limit) * 100);
                        for (const result of checkResults) {
                            expect(result.percentage).toBe(expectedPercentage);
                        }

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should handle Core HR module checks without logging limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        checkAmount: fc.integer({ min: 1, max: 100 })
                    }),
                    async ({ limitType, checkAmount }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Action: Check Core HR (should bypass limits)
                        const checkResult = await usageTracker.checkBeforeTrack(
                            uniqueTenantId.toString(),
                            MODULES.CORE_HR,
                            limitType,
                            checkAmount
                        );

                        // Assertion 1: Check should be allowed
                        expect(checkResult.allowed).toBe(true);

                        // Assertion 2: Reason should indicate Core HR has no limits
                        expect(checkResult.reason).toBe('Core HR has no usage limits');

                        // Assertion 3: No usage or limit values should be present
                        expect(checkResult.currentUsage).toBeUndefined();
                        expect(checkResult.limit).toBeUndefined();

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
