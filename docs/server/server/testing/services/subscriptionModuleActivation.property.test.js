// testing/services/subscriptionModuleActivation.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import subscriptionService from '../../services/subscription.service.js';
import License, { MODULES, PRICING_TIERS } from '../../platform/system/models/license.model.js';
import LicenseAudit from '../../platform/system/models/licenseAudit.model.js';
import UsageTracking from '../../platform/system/models/usageTracking.model.js';

describe('Subscription Module Activation - Property-Based Tests', () => {
    let testTenantId;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = new mongoose.Types.ObjectId();

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

    describe('Property 18: Subscription Module Activation', () => {
        /**
         * Feature: feature-productization, Property 18: Subscription Module Activation
         * Validates: Requirements 6.1
         * 
         * For any tenant subscription creation, only the modules specified in the subscription
         * should be activated.
         */
        test('should activate only specified modules when creating subscription', async () => {
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
                        billingCycle: fc.constantFrom('monthly', 'annual'),
                        isTrial: fc.boolean()
                    }),
                    async ({ modulesToActivate, tier, billingCycle, isTrial }) => {
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

                        // Action: Create subscription with specified modules
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle,
                            isTrial
                        });

                        // Assertion 1: License should be created
                        expect(license).toBeDefined();
                        expect(license).not.toBeNull();
                        expect(license.tenantId.toString()).toBe(uniqueTenantId.toString());

                        // Assertion 2: Only specified modules should be present in license
                        expect(license.modules.length).toBe(modulesToActivate.length);

                        // Assertion 3: All specified modules should be enabled
                        for (const moduleKey of modulesToActivate) {
                            const module = license.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module).not.toBeNull();
                            expect(module.enabled).toBe(true);
                            expect(module.key).toBe(moduleKey);
                            expect(module.tier).toBe(tier);
                        }

                        // Assertion 4: No unspecified modules should be activated
                        const allModules = Object.values(MODULES).filter(m => m !== MODULES.CORE_HR);
                        const unspecifiedModules = allModules.filter(m => !modulesToActivate.includes(m));

                        for (const moduleKey of unspecifiedModules) {
                            const module = license.getModuleLicense(moduleKey);
                            // Module should either not exist or be disabled
                            if (module) {
                                expect(module.enabled).toBe(false);
                            } else {
                                expect(module).toBeNull();
                            }
                        }

                        // Assertion 5: Each activated module should have proper metadata
                        for (const moduleKey of modulesToActivate) {
                            const module = license.getModuleLicense(moduleKey);
                            expect(module.activatedAt).toBeInstanceOf(Date);
                            expect(module.activatedAt.getTime()).toBeLessThanOrEqual(Date.now());
                            expect(module.limits).toBeDefined();
                            expect(module.limits.employees).toBeDefined();
                        }

                        // Assertion 6: Subscription status should be correct
                        if (isTrial) {
                            expect(license.status).toBe('trial');
                            expect(license.trialEndsAt).toBeInstanceOf(Date);
                            expect(license.trialEndsAt.getTime()).toBeGreaterThan(Date.now());
                        } else {
                            expect(license.status).toBe('active');
                        }

                        // Assertion 7: Audit log should be created for subscription creation
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey: 'subscription',
                            eventType: 'MODULE_ACTIVATED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();
                        expect(auditLog.eventType).toBe('MODULE_ACTIVATED');
                        expect(auditLog.moduleKey).toBe('subscription');
                        
                        // Clean up this iteration's data
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should maintain module activation independence across multiple subscriptions', async () => {
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

                        // Action: Create subscriptions for both tenants
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

                        // Assertion 1: Both licenses should be created independently
                        expect(license1.tenantId.toString()).toBe(tenant1Id.toString());
                        expect(license2.tenantId.toString()).toBe(tenant2Id.toString());
                        expect(license1.subscriptionId).not.toBe(license2.subscriptionId);

                        // Assertion 2: Tenant 1 should only have its specified modules
                        expect(license1.modules.length).toBe(tenant1Modules.length);
                        for (const moduleKey of tenant1Modules) {
                            const module = license1.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(true);
                        }

                        // Assertion 3: Tenant 2 should only have its specified modules
                        expect(license2.modules.length).toBe(tenant2Modules.length);
                        for (const moduleKey of tenant2Modules) {
                            const module = license2.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(true);
                        }

                        // Assertion 4: Tenant 1 should not have tenant 2's modules
                        for (const moduleKey of tenant2Modules) {
                            const module = license1.getModuleLicense(moduleKey);
                            if (module) {
                                expect(module.enabled).toBe(false);
                            } else {
                                expect(module).toBeNull();
                            }
                        }

                        // Assertion 5: Tenant 2 should not have tenant 1's modules
                        for (const moduleKey of tenant1Modules) {
                            const module = license2.getModuleLicense(moduleKey);
                            if (module) {
                                expect(module.enabled).toBe(false);
                            } else {
                                expect(module).toBeNull();
                            }
                        }

                        // Clean up
                        await License.deleteMany({ tenantId: { $in: [tenant1Id, tenant2Id] } });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should activate modules with correct tier and limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        employeeLimit: fc.integer({ min: 10, max: 1000 }),
                        storageLimit: fc.integer({ min: 1073741824, max: 107374182400 }), // 1GB to 100GB
                        apiCallLimit: fc.integer({ min: 1000, max: 100000 })
                    }),
                    async ({ moduleKey, tier, employeeLimit, storageLimit, apiCallLimit }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        // Prepare module spec with specific limits
                        const moduleSpec = {
                            moduleKey,
                            tier,
                            limits: {
                                employees: employeeLimit,
                                storage: storageLimit,
                                apiCalls: apiCallLimit
                            }
                        };

                        // Action: Create subscription
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: [moduleSpec],
                            billingCycle: 'monthly'
                        });

                        // Assertion 1: Module should be activated
                        const module = license.getModuleLicense(moduleKey);
                        expect(module).toBeDefined();
                        expect(module.enabled).toBe(true);

                        // Assertion 2: Tier should match specification
                        expect(module.tier).toBe(tier);

                        // Assertion 3: Limits should match specification exactly
                        expect(module.limits.employees).toBe(employeeLimit);
                        expect(module.limits.storage).toBe(storageLimit);
                        expect(module.limits.apiCalls).toBe(apiCallLimit);

                        // Assertion 4: Module should have activation timestamp
                        expect(module.activatedAt).toBeInstanceOf(Date);
                        expect(module.activatedAt.getTime()).toBeLessThanOrEqual(Date.now());
                        expect(module.activatedAt.getTime()).toBeGreaterThan(Date.now() - 5000);
                        
                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should not activate modules that are not in subscription specification', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        // Select a subset of modules to activate
                        modulesToActivate: fc.subarray(
                            [MODULES.ATTENDANCE, MODULES.LEAVE, MODULES.PAYROLL],
                            { minLength: 1, maxLength: 2 }
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ modulesToActivate, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        // Define all possible modules (excluding CORE_HR)
                        const allModules = [
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS,
                            MODULES.COMMUNICATION,
                            MODULES.REPORTING,
                            MODULES.TASKS
                        ];

                        // Determine which modules should NOT be activated
                        const modulesNotToActivate = allModules.filter(
                            m => !modulesToActivate.includes(m)
                        );

                        // Prepare module specs only for modules to activate
                        const moduleSpecs = modulesToActivate.map(moduleKey => ({
                            moduleKey,
                            tier,
                            limits: { employees: 100, apiCalls: 50000 }
                        }));

                        // Action: Create subscription
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle: 'monthly'
                        });

                        // Assertion 1: Specified modules should be activated
                        for (const moduleKey of modulesToActivate) {
                            const module = license.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(true);
                        }

                        // Assertion 2: Non-specified modules should NOT be activated
                        for (const moduleKey of modulesNotToActivate) {
                            const module = license.getModuleLicense(moduleKey);
                            // Module should either not exist or be disabled
                            if (module !== null) {
                                expect(module.enabled).toBe(false);
                            }
                        }

                        // Assertion 3: Total number of enabled modules should match specification
                        const enabledModules = license.modules.filter(m => m.enabled);
                        expect(enabledModules.length).toBe(modulesToActivate.length);

                        // Assertion 4: Each enabled module should be in the specification
                        for (const module of enabledModules) {
                            expect(modulesToActivate).toContain(module.key);
                        }
                        
                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should handle empty module list by creating subscription with no modules', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        billingCycle: fc.constantFrom('monthly', 'annual'),
                        isTrial: fc.boolean()
                    }),
                    async ({ billingCycle, isTrial }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        // Action: Create subscription with empty module list
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: [],
                            billingCycle,
                            isTrial
                        });

                        // Assertion 1: License should be created
                        expect(license).toBeDefined();
                        expect(license.tenantId.toString()).toBe(uniqueTenantId.toString());

                        // Assertion 2: No modules should be activated
                        expect(license.modules.length).toBe(0);

                        // Assertion 3: Subscription should still have valid status
                        if (isTrial) {
                            expect(license.status).toBe('trial');
                        } else {
                            expect(license.status).toBe('active');
                        }

                        // Assertion 4: Subscription ID should be generated
                        expect(license.subscriptionId).toBeDefined();
                        expect(license.subscriptionId.length).toBeGreaterThan(0);
                        
                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should activate all modules when all are specified', async () => {
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

                        // Action: Create subscription with all modules
                        const license = await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle
                        });

                        // Assertion 1: All modules should be present
                        expect(license.modules.length).toBe(allModules.length);

                        // Assertion 2: All modules should be enabled
                        const enabledModules = license.modules.filter(m => m.enabled);
                        expect(enabledModules.length).toBe(allModules.length);

                        // Assertion 3: Each module should be in the license
                        for (const moduleKey of allModules) {
                            const module = license.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(true);
                            expect(module.tier).toBe(tier);
                        }
                        
                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should preserve module activation state across subscription queries', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        modulesToActivate: fc.subarray(
                            [MODULES.ATTENDANCE, MODULES.LEAVE, MODULES.PAYROLL, MODULES.DOCUMENTS],
                            { minLength: 2, maxLength: 4 }
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
                            limits: { employees: 150, apiCalls: 75000 }
                        }));

                        // Action: Create subscription
                        await subscriptionService.createSubscription({
                            tenantId: uniqueTenantId.toString(),
                            modules: moduleSpecs,
                            billingCycle: 'monthly'
                        });

                        // Query the license from database
                        const queriedLicense = await License.findByTenantId(uniqueTenantId.toString());

                        // Assertion 1: License should be found
                        expect(queriedLicense).toBeDefined();
                        expect(queriedLicense).not.toBeNull();

                        // Assertion 2: Module activation state should be preserved
                        expect(queriedLicense.modules.length).toBe(modulesToActivate.length);

                        // Assertion 3: All specified modules should still be enabled
                        for (const moduleKey of modulesToActivate) {
                            const module = queriedLicense.getModuleLicense(moduleKey);
                            expect(module).toBeDefined();
                            expect(module.enabled).toBe(true);
                            expect(module.tier).toBe(tier);
                        }

                        // Assertion 4: Module metadata should be preserved
                        for (const moduleKey of modulesToActivate) {
                            const module = queriedLicense.getModuleLicense(moduleKey);
                            expect(module.activatedAt).toBeInstanceOf(Date);
                            expect(module.limits).toBeDefined();
                            expect(module.limits.employees).toBe(150);
                            expect(module.limits.apiCalls).toBe(75000);
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
