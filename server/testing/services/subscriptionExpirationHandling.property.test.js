// testing/services/subscriptionExpirationHandling.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import subscriptionService from '../../services/subscription.service.js';
import License, { MODULES, PRICING_TIERS } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';
import UsageTracking from '../../models/usageTracking.model.js';

describe('Subscription Expiration Handling - Property-Based Tests', () => {
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

    describe('Property 19: Subscription Expiration Handling', () => {
        /**
         * Feature: feature-productization, Property 19: Subscription Expiration Handling
         * Validates: Requirements 6.4
         * 
         * For any expired tenant subscription, all Product Modules except Core HR should be disabled.
         */
        test('should disable all Product Modules except Core HR when subscription expires', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        // Generate a subset of available modules (excluding CORE_HR)
                        modulesToActivate: fc.subarray(
                            [
                                MODULES.ATTENDANCE,
                                MODULES.LEAVE,
                                MODULES.PAYROLL,
                                MODULES.DOCUMENTS,
                                MODULES.COMMUNICATION,
                                MODULES.REPORTING,
                                MODULES.TASKS
                            ],
                            { minLength: 1, maxLength: 7 }
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        billingCycle: fc.constantFrom('monthly', 'annual')
                    }),
                    async ({ modulesToActivate, tier, billingCycle }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        
                        // Prepare module specifications
                        const moduleSpecs = modulesToActivate.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: {
                                employees: 100,
                                storage: 10737418240,
                                apiCalls: 50000
                            }
                        }));

                        // Action 1: Create subscription with specified modules
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle,
                            isTrial: false
                        });

                        // Verify initial state: all specified modules should be enabled
                        expect(license).toBeDefined();
                        expect(license.status).toBe('active');
                        
                        for (const moduleKey of modulesToActivate) {
                            const module = license.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(true);
                        }

                        // Action 2: Expire the subscription
                        const expiredLicense = await subscriptionService.handleSubscriptionExpiration(
                            uniqueTenantId.toString()
                        );

                        // Assertion 1: License status should be 'expired'
                        expect(expiredLicense.status).toBe('expired');

                        // Assertion 2: All non-Core modules should be disabled
                        for (const moduleKey of modulesToActivate) {
                            const module = expiredLicense.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(false);
                        }

                        // Assertion 3: Core HR should remain accessible (if it exists)
                        const coreHRModule = expiredLicense.getModuleLicense(MODULES.HR_CORE);
                        if (coreHRModule) {
                            expect(coreHRModule.enabled).toBe(true);
                        }

                        // Assertion 4: All enabled modules should only be Core HR
                        const enabledModules = expiredLicense.modules.filter(m => m.enabled);
                        for (const module of enabledModules) {
                            expect(module.key).toBe(MODULES.HR_CORE);
                        }

                        // Assertion 5: Audit log should record the expiration
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey: 'subscription',
                            eventType: 'LICENSE_EXPIRED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();
                        expect(auditLog.eventType).toBe('LICENSE_EXPIRED');
                        expect(auditLog.details.reason).toBe('subscription_expired');

                        // Assertion 6: Each disabled module should have an audit entry
                        for (const moduleKey of modulesToActivate) {
                            const moduleAuditLog = await LicenseAudit.findOne({
                                tenantId: uniqueTenantId,
                                moduleKey: moduleKey,
                                eventType: 'MODULE_DEACTIVATED'
                            }).sort({ timestamp: -1 });

                            expect(moduleAuditLog).toBeDefined();
                            expect(moduleAuditLog.details.reason).toBe('subscription_expired');
                        }

                        // Clean up this iteration's data
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should handle expiration of subscription with all modules', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        tier: fc.constantFrom(...PRICING_TIERS),
                        billingCycle: fc.constantFrom('monthly', 'annual')
                    }),
                    async ({ tier, billingCycle }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        
                        // All available modules (excluding CORE_HR)
                        const allModules = [
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS,
                            MODULES.COMMUNICATION,
                            MODULES.REPORTING,
                            MODULES.TASKS
                        ];

                        // Prepare specs for all modules
                        const moduleSpecs = allModules.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: { employees: 200, storage: 21474836480, apiCalls: 100000 }
                        }));

                        // Action 1: Create subscription with all modules
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle
                        });

                        // Verify all modules are enabled
                        expect(license.modules.length).toBe(allModules.length);
                        const enabledModulesBeforeExpiration = license.modules.filter(m => m.enabled);
                        expect(enabledModulesBeforeExpiration.length).toBe(allModules.length);

                        // Action 2: Expire the subscription
                        const expiredLicense = await subscriptionService.handleSubscriptionExpiration(
                            uniqueTenantId.toString()
                        );

                        // Assertion 1: Status should be expired
                        expect(expiredLicense.status).toBe('expired');

                        // Assertion 2: All modules should be disabled
                        for (const moduleKey of allModules) {
                            const module = expiredLicense.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(false);
                        }

                        // Assertion 3: No non-Core modules should be enabled
                        const enabledModulesAfterExpiration = expiredLicense.modules.filter(
                            m => m.enabled && m.key !== MODULES.HR_CORE
                        );
                        expect(enabledModulesAfterExpiration.length).toBe(0);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should preserve module data when subscription expires', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        modulesToActivate: fc.subarray(
                            [MODULES.ATTENDANCE, MODULES.LEAVE, MODULES.PAYROLL],
                            { minLength: 2, maxLength: 3 }
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        employeeLimit: fc.integer({ min: 50, max: 500 }),
                        storageLimit: fc.integer({ min: 1073741824, max: 107374182400 })
                    }),
                    async ({ modulesToActivate, tier, employeeLimit, storageLimit }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        
                        // Prepare module specs with specific limits
                        const moduleSpecs = modulesToActivate.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: {
                                employees: employeeLimit,
                                storage: storageLimit,
                                apiCalls: 50000
                            }
                        }));

                        // Action 1: Create subscription
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle: 'monthly'
                        });

                        // Store original module data
                        const originalModuleData = {};
                        for (const moduleKey of modulesToActivate) {
                            const module = license.getModuleLicense(moduleKey);
                            originalModuleData[moduleKey] = {
                                tier: module.tier,
                                limits: { ...module.limits },
                                activatedAt: module.activatedAt,
                                expiresAt: module.expiresAt
                            };
                        }

                        // Action 2: Expire the subscription
                        const expiredLicense = await subscriptionService.handleSubscriptionExpiration(
                            uniqueTenantId.toString()
                        );

                        // Assertion 1: Modules should be disabled but data preserved
                        for (const moduleKey of modulesToActivate) {
                            const module = expiredLicense.getModuleLicense(moduleKey);
                            
                            // Module should be disabled
                            expect(module.enabled).toBe(false);
                            
                            // But data should be preserved
                            expect(module.tier).toBe(originalModuleData[moduleKey].tier);
                            expect(module.limits.employees).toBe(originalModuleData[moduleKey].limits.employees);
                            expect(module.limits.storage).toBe(originalModuleData[moduleKey].limits.storage);
                            expect(module.limits.apiCalls).toBe(originalModuleData[moduleKey].limits.apiCalls);
                            expect(module.activatedAt).toEqual(originalModuleData[moduleKey].activatedAt);
                            expect(module.expiresAt).toEqual(originalModuleData[moduleKey].expiresAt);
                        }

                        // Assertion 2: Module count should remain the same
                        expect(expiredLicense.modules.length).toBe(license.modules.length);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should handle expiration of trial subscriptions', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        modulesToActivate: fc.subarray(
                            [MODULES.ATTENDANCE, MODULES.LEAVE, MODULES.DOCUMENTS],
                            { minLength: 1, maxLength: 3 }
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        trialDays: fc.integer({ min: 7, max: 30 })
                    }),
                    async ({ modulesToActivate, tier, trialDays }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        
                        // Prepare module specs
                        const moduleSpecs = modulesToActivate.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: { employees: 50, apiCalls: 10000 }
                        }));

                        // Action 1: Create trial subscription
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle: 'monthly',
                            isTrial: true,
                            trialDays
                        });

                        // Verify trial status
                        expect(license.status).toBe('trial');
                        expect(license.trialEndsAt).toBeDefined();

                        // Action 2: Expire the trial (without converting to active)
                        const expiredLicense = await subscriptionService.handleTrialExpiration(
                            uniqueTenantId.toString(),
                            false // Don't convert to active
                        );

                        // Assertion 1: Status should be expired
                        expect(expiredLicense.status).toBe('expired');

                        // Assertion 2: All non-Core modules should be disabled
                        for (const moduleKey of modulesToActivate) {
                            const module = expiredLicense.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(false);
                        }

                        // Assertion 3: Audit log should record trial expiration
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey: 'subscription',
                            eventType: 'LICENSE_EXPIRED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog.details.reason).toBe('trial_expired');

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should maintain subscription independence when one expires', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        tenant1Modules: fc.subarray(
                            [MODULES.ATTENDANCE, MODULES.LEAVE, MODULES.PAYROLL],
                            { minLength: 1, maxLength: 3 }
                        ),
                        tenant2Modules: fc.subarray(
                            [MODULES.DOCUMENTS, MODULES.COMMUNICATION, MODULES.REPORTING],
                            { minLength: 1, maxLength: 3 }
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ tenant1Modules, tenant2Modules, tier }) => {
                        // Create two different tenant IDs
                        const tenant1Id = new mongoose.Types.ObjectId();
                        const tenant2Id = new mongoose.Types.ObjectId();

                        // Prepare module specs for both tenants
                        const tenant1Specs = tenant1Modules.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: { employees: 50, apiCalls: 10000 }
                        }));

                        const tenant2Specs = tenant2Modules.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: { employees: 100, apiCalls: 20000 }
                        }));

                        // Action 1: Create subscriptions for both tenants
                        const license1 = await subscriptionService.createSubscription({
                            tenantId: tenant1Id.toString(),
                            modules: tenant1Specs,
                            billingCycle: 'monthly'
                        });

                        const license2 = await subscriptionService.createSubscription({
                            tenantId: tenant2Id.toString(),
                            modules: tenant2Specs,
                            billingCycle: 'monthly'
                        });

                        // Verify both are active
                        expect(license1.status).toBe('active');
                        expect(license2.status).toBe('active');

                        // Action 2: Expire only tenant 1's subscription
                        const expiredLicense1 = await subscriptionService.handleSubscriptionExpiration(
                            tenant1Id.toString()
                        );

                        // Query tenant 2's license to verify it's unchanged
                        const unchangedLicense2 = await License.findByTenantId(tenant2Id.toString());

                        // Assertion 1: Tenant 1's subscription should be expired
                        expect(expiredLicense1.status).toBe('expired');
                        for (const moduleKey of tenant1Modules) {
                            const module = expiredLicense1.getModuleLicense(moduleKey);
                            expect(module.enabled).toBe(false);
                        }

                        // Assertion 2: Tenant 2's subscription should remain active
                        expect(unchangedLicense2.status).toBe('active');
                        for (const moduleKey of tenant2Modules) {
                            const module = unchangedLicense2.getModuleLicense(moduleKey);
                            expect(module.enabled).toBe(true);
                        }

                        // Assertion 3: Tenant 2's modules should not be affected
                        expect(unchangedLicense2.modules.length).toBe(tenant2Modules.length);
                        const enabledModules = unchangedLicense2.modules.filter(m => m.enabled);
                        expect(enabledModules.length).toBe(tenant2Modules.length);

                        // Clean up
                        await License.deleteMany({ tenantId: { $in: [tenant1Id, tenant2Id] } });
                        await LicenseAudit.deleteMany({ tenantId: { $in: [tenant1Id, tenant2Id] } });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should handle expiration idempotently', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        modulesToActivate: fc.subarray(
                            [MODULES.ATTENDANCE, MODULES.LEAVE, MODULES.PAYROLL],
                            { minLength: 1, maxLength: 3 }
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ modulesToActivate, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        
                        // Prepare module specs
                        const moduleSpecs = modulesToActivate.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: { employees: 100, apiCalls: 50000 }
                        }));

                        // Action 1: Create subscription
                        await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle: 'monthly'
                        });

                        // Action 2: Expire the subscription
                        const expiredLicense1 = await subscriptionService.handleSubscriptionExpiration(
                            uniqueTenantId.toString()
                        );

                        // Action 3: Expire again (should be idempotent)
                        const expiredLicense2 = await subscriptionService.handleSubscriptionExpiration(
                            uniqueTenantId.toString()
                        );

                        // Assertion 1: Both results should have expired status
                        expect(expiredLicense1.status).toBe('expired');
                        expect(expiredLicense2.status).toBe('expired');

                        // Assertion 2: All modules should remain disabled
                        for (const moduleKey of modulesToActivate) {
                            const module1 = expiredLicense1.getModuleLicense(moduleKey);
                            const module2 = expiredLicense2.getModuleLicense(moduleKey);
                            
                            expect(module1.enabled).toBe(false);
                            expect(module2.enabled).toBe(false);
                        }

                        // Assertion 3: Module data should be identical
                        expect(expiredLicense1.modules.length).toBe(expiredLicense2.modules.length);
                        
                        for (const moduleKey of modulesToActivate) {
                            const module1 = expiredLicense1.getModuleLicense(moduleKey);
                            const module2 = expiredLicense2.getModuleLicense(moduleKey);
                            
                            expect(module1.tier).toBe(module2.tier);
                            expect(module1.limits).toEqual(module2.limits);
                        }

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should not affect Core HR module when subscription expires', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        modulesToActivate: fc.subarray(
                            [
                                MODULES.ATTENDANCE,
                                MODULES.LEAVE,
                                MODULES.PAYROLL,
                                MODULES.DOCUMENTS
                            ],
                            { minLength: 2, maxLength: 4 }
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ modulesToActivate, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        
                        // Prepare module specs (including Core HR explicitly if needed)
                        const moduleSpecs = modulesToActivate.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: { employees: 150, apiCalls: 75000 }
                        }));

                        // Action 1: Create subscription
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle: 'monthly'
                        });

                        // Action 2: Expire the subscription
                        const expiredLicense = await subscriptionService.handleSubscriptionExpiration(
                            uniqueTenantId.toString()
                        );

                        // Assertion 1: All Product Modules should be disabled
                        for (const moduleKey of modulesToActivate) {
                            const module = expiredLicense.getModuleLicense(moduleKey);
                            expect(module.enabled).toBe(false);
                        }

                        // Assertion 2: If Core HR exists, it should remain enabled
                        const coreHRModule = expiredLicense.getModuleLicense(MODULES.HR_CORE);
                        if (coreHRModule) {
                            expect(coreHRModule.enabled).toBe(true);
                        }

                        // Assertion 3: Only Core HR (if present) should be enabled
                        const enabledModules = expiredLicense.modules.filter(m => m.enabled);
                        for (const module of enabledModules) {
                            expect(module.key).toBe(MODULES.HR_CORE);
                        }

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
