// testing/services/violationHighPriorityLogging.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import licenseValidator from '../../services/licenseValidator.service.js';
import usageTracker from '../../services/usageTracker.service.js';
import License, { MODULES, PRICING_TIERS } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';
import UsageTracking from '../../models/usageTracking.model.js';

describe('Violation High-Priority Logging - Property-Based Tests', () => {
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

    describe('Property 34: Violation High-Priority Logging', () => {
        /**
         * Feature: feature-productization, Property 34: Violation High-Priority Logging
         * Validates: Requirements 10.3
         * 
         * For any license violation detected, a high-priority audit event should be created
         * with severity level "critical".
         */
        test('should create high-priority audit logs for license expiration violations', async () => {
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
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with expired module
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'expired',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits: {
                                    employees: 100,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
                                expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // Expired 10 days ago
                            }]
                        });

                        // Clear any existing audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Attempt to validate expired license (should create violation)
                        const validationResult = await licenseValidator.validateModuleAccess(
                            uniqueTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Assertion 1: Validation should fail
                        expect(validationResult.valid).toBe(false);

                        // Assertion 2: Audit log should be created
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_EXPIRED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();

                        // Assertion 3: Audit log MUST have "critical" severity for violation
                        expect(auditLog.severity).toBeDefined();
                        expect(auditLog.severity).toBe('critical');

                        // Assertion 4: Audit log should contain all required fields
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                        expect(auditLog.tenantId.toString()).toBe(uniqueTenantId.toString());
                        expect(auditLog.moduleKey).toBe(moduleKey);
                        expect(auditLog.eventType).toBe('LICENSE_EXPIRED');
                        expect(auditLog.details).toBeDefined();

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should create high-priority audit logs for usage limit exceeded violations', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS
                        ),
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, limitType, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with low limits
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

                        // Setup: Create usage tracking at the limit
                        const period = UsageTracking.getCurrentPeriod();
                        const currentUsage = limit; // Already at limit
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

                        // Action: Attempt to track usage that would exceed limit (should create violation)
                        const trackResult = await usageTracker.trackUsage(
                            uniqueTenantId.toString(),
                            moduleKey,
                            limitType,
                            10, // Try to add more when already at limit
                            { immediate: true } // Process immediately to trigger violation
                        );

                        // Assertion 1: Tracking should be blocked
                        expect(trackResult.blocked).toBe(true);

                        // Assertion 2: Audit log should be created for limit exceeded
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LIMIT_EXCEEDED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();

                        // Assertion 3: Audit log MUST have "critical" severity for violation
                        expect(auditLog.severity).toBeDefined();
                        expect(auditLog.severity).toBe('critical');

                        // Assertion 4: Audit log should contain violation details
                        expect(auditLog.details).toBeDefined();
                        expect(auditLog.details.limitType).toBe(limitType);
                        expect(auditLog.details.currentValue).toBeDefined();
                        expect(auditLog.details.limitValue).toBe(limit);

                        // Assertion 5: Audit log should contain all required fields
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                        expect(auditLog.tenantId.toString()).toBe(uniqueTenantId.toString());
                        expect(auditLog.moduleKey).toBe(moduleKey);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should create high-priority audit logs for all violation types', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        violationType: fc.constantFrom(
                            'license-expired',
                            'limit-exceeded-employees',
                            'limit-exceeded-storage',
                            'limit-exceeded-apiCalls'
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, violationType, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create different violation scenarios
                        if (violationType === 'license-expired') {
                            // Create expired license
                            await License.create({
                                tenantId: uniqueTenantId,
                                subscriptionId: `test-sub-${uniqueTenantId}`,
                                status: 'expired',
                                modules: [{
                                    key: moduleKey,
                                    enabled: true,
                                    tier,
                                    limits: {
                                        employees: 100,
                                        storage: 10737418240,
                                        apiCalls: 50000
                                    },
                                    activatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
                                    expiresAt: new Date(Date.now() - 1000) // Expired
                                }]
                            });

                            // Clear audit logs
                            await LicenseAudit.deleteMany({
                                tenantId: uniqueTenantId,
                                moduleKey
                            });

                            // Trigger violation
                            await licenseValidator.validateModuleAccess(
                                uniqueTenantId.toString(),
                                moduleKey,
                                { skipCache: true }
                            );

                            // Check audit log
                            const auditLog = await LicenseAudit.findOne({
                                tenantId: uniqueTenantId,
                                moduleKey,
                                eventType: 'LICENSE_EXPIRED'
                            }).sort({ timestamp: -1 });

                            expect(auditLog).toBeDefined();
                            expect(auditLog.severity).toBe('critical');

                        } else {
                            // Create limit exceeded scenarios
                            const limitType = violationType.replace('limit-exceeded-', '');
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

                            // Create usage at limit
                            const period = UsageTracking.getCurrentPeriod();
                            const usage = {
                                employees: limitType === 'employees' ? limit : 0,
                                storage: limitType === 'storage' ? limit : 0,
                                apiCalls: limitType === 'apiCalls' ? limit : 0
                            };

                            await UsageTracking.create({
                                tenantId: uniqueTenantId,
                                moduleKey,
                                period,
                                usage,
                                limits
                            });

                            // Clear audit logs
                            await LicenseAudit.deleteMany({
                                tenantId: uniqueTenantId,
                                moduleKey
                            });

                            // Trigger violation
                            await usageTracker.trackUsage(
                                uniqueTenantId.toString(),
                                moduleKey,
                                limitType,
                                10,
                                { immediate: true }
                            );

                            // Check audit log
                            const auditLog = await LicenseAudit.findOne({
                                tenantId: uniqueTenantId,
                                moduleKey,
                                eventType: 'LIMIT_EXCEEDED'
                            }).sort({ timestamp: -1 });

                            expect(auditLog).toBeDefined();
                            expect(auditLog.severity).toBe('critical');
                        }

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                        await UsageTracking.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should distinguish violation severity from non-violation events', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create valid license
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits: {
                                    employees: 100,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action 1: Perform successful validation (non-violation)
                        await licenseValidator.validateModuleAccess(
                            uniqueTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Check non-violation audit log
                        const successLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'VALIDATION_SUCCESS'
                        }).sort({ timestamp: -1 });

                        // Assertion 1: Success log should NOT have critical severity
                        expect(successLog).toBeDefined();
                        expect(successLog.severity).toBe('info');
                        expect(successLog.severity).not.toBe('critical');

                        // Action 2: Create violation by expiring license
                        await License.findOneAndUpdate(
                            { tenantId: uniqueTenantId },
                            {
                                $set: {
                                    status: 'expired',
                                    'modules.$[elem].expiresAt': new Date(Date.now() - 1000)
                                }
                            },
                            {
                                arrayFilters: [{ 'elem.key': moduleKey }]
                            }
                        );

                        // Clear cache
                        licenseValidator.clearCache();

                        // Trigger violation
                        await licenseValidator.validateModuleAccess(
                            uniqueTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Check violation audit log
                        const violationLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_EXPIRED'
                        }).sort({ timestamp: -1 });

                        // Assertion 2: Violation log MUST have critical severity
                        expect(violationLog).toBeDefined();
                        expect(violationLog.severity).toBe('critical');

                        // Assertion 3: Severity levels should be different
                        expect(successLog.severity).not.toBe(violationLog.severity);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should create high-priority logs for multiple concurrent violations', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        violationCount: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, tier, violationCount }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create expired license
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'expired',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits: {
                                    employees: 100,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
                                expiresAt: new Date(Date.now() - 1000)
                            }]
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Trigger multiple violations
                        for (let i = 0; i < violationCount; i++) {
                            await licenseValidator.validateModuleAccess(
                                uniqueTenantId.toString(),
                                moduleKey,
                                { skipCache: true }
                            );
                            // Small delay to ensure different timestamps
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }

                        // Assertion: All violation logs should have critical severity
                        const violationLogs = await LicenseAudit.find({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_EXPIRED'
                        }).sort({ timestamp: -1 });

                        expect(violationLogs.length).toBe(violationCount);

                        // Check each violation log
                        violationLogs.forEach(log => {
                            expect(log.severity).toBe('critical');
                            expect(log.eventType).toBe('LICENSE_EXPIRED');
                            expect(log.timestamp).toBeInstanceOf(Date);
                        });

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should preserve high-priority severity across different violation types', async () => {
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

                        // Setup: Create license with low limits
                        const limit = 50;
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits: {
                                    employees: limit,
                                    storage: limit,
                                    apiCalls: limit
                                },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Setup: Create usage tracking at limits
                        const period = UsageTracking.getCurrentPeriod();
                        await UsageTracking.create({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            period,
                            usage: {
                                employees: limit,
                                storage: limit,
                                apiCalls: limit
                            },
                            limits: {
                                employees: limit,
                                storage: limit,
                                apiCalls: limit
                            }
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Trigger violations for different limit types
                        const limitTypes = ['employees', 'storage', 'apiCalls'];
                        for (const limitType of limitTypes) {
                            await usageTracker.trackUsage(
                                uniqueTenantId.toString(),
                                moduleKey,
                                limitType,
                                10,
                                { immediate: true }
                            );
                        }

                        // Assertion: All limit exceeded logs should have critical severity
                        const violationLogs = await LicenseAudit.find({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LIMIT_EXCEEDED'
                        }).sort({ timestamp: -1 });

                        expect(violationLogs.length).toBeGreaterThanOrEqual(limitTypes.length);

                        // Check each violation log has critical severity
                        violationLogs.forEach(log => {
                            expect(log.severity).toBe('critical');
                            expect(log.eventType).toBe('LIMIT_EXCEEDED');
                            expect(log.details.limitType).toBeDefined();
                            expect(['employees', 'storage', 'apiCalls']).toContain(log.details.limitType);
                        });

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
