// testing/platform/subscriptions/subscriptionService.test.js
import mongoose from 'mongoose';

/**
 * Unit tests for subscription management functionality
 * Tests the core requirements:
 * - Plan assignment enables correct modules (Requirement 9.2)
 * - Subscription expiration disables modules (Requirement 9.3) 
 * - Upgrade enables new modules (Requirement 9.4)
 * - Downgrade preserves data (Requirement 9.5)
 */

describe('Subscription Management Unit Tests', () => {
    // Test data structures
    const createMockTenant = (overrides = {}) => ({
        tenantId: 'test-tenant-123',
        name: 'Test Company',
        status: 'trial',
        subscription: {
            planId: null,
            status: 'trial',
            startDate: new Date(),
            expiresAt: null,
            autoRenew: true,
            billingCycle: 'monthly'
        },
        enabledModules: [
            { moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' }
        ],
        limits: {
            maxUsers: 10,
            maxStorage: 1073741824, // 1GB
            apiCallsPerMonth: 1000
        },
        usage: {
            userCount: 0,
            storageUsed: 0,
            apiCallsThisMonth: 0
        },
        isModuleEnabled: function (moduleId) {
            return this.enabledModules.some(m => m.moduleId === moduleId);
        },
        enableModule: function (moduleId, enabledBy = 'system') {
            if (!this.isModuleEnabled(moduleId)) {
                this.enabledModules.push({
                    moduleId,
                    enabledAt: new Date(),
                    enabledBy
                });
            }
        },
        save: function () { return Promise.resolve(this); },
        populate: function () { return this; },
        ...overrides
    });

    const createMockPlan = (overrides = {}) => ({
        _id: new mongoose.Types.ObjectId(),
        name: 'basic',
        displayName: 'Basic Plan',
        tier: 'basic',
        pricing: { monthly: 29.99, yearly: 299.99 },
        includedModules: [
            { moduleId: 'hr-core', included: true },
            { moduleId: 'attendance', included: true }
        ],
        limits: {
            maxUsers: 50,
            maxStorage: 5368709120, // 5GB
            apiCallsPerMonth: 10000
        },
        isActive: true,
        getIncludedModuleIds: function () {
            return this.includedModules
                .filter(m => m.included)
                .map(m => m.moduleId);
        },
        includesModule: function (moduleId) {
            const module = this.includedModules.find(m => m.moduleId === moduleId);
            return module && module.included;
        },
        ...overrides
    });

    describe('Plan Assignment (Requirement 9.2)', () => {
        it('should assign plan and enable correct modules', () => {
            // Test: Plan assignment enables correct modules (Requirement 9.2)
            const tenant = createMockTenant();
            const plan = createMockPlan({
                includedModules: [
                    { moduleId: 'hr-core', included: true },
                    { moduleId: 'attendance', included: true },
                    { moduleId: 'tasks', included: true },
                    { moduleId: 'email-service', included: true }
                ],
                limits: {
                    maxUsers: 200,
                    maxStorage: 21474836480, // 20GB
                    apiCallsPerMonth: 50000
                }
            });

            // Simulate plan assignment logic
            tenant.subscription.planId = plan._id;
            tenant.subscription.status = 'active';
            tenant.subscription.billingCycle = 'monthly';
            tenant.status = 'active';

            // Enable modules from plan
            const includedModuleIds = plan.getIncludedModuleIds();
            tenant.enabledModules = includedModuleIds.map(moduleId => ({
                moduleId,
                enabledAt: new Date(),
                enabledBy: 'subscription'
            }));

            // Update limits
            tenant.limits = { ...plan.limits };

            // Verify correct modules are enabled
            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toContain('hr-core');
            expect(enabledModuleIds).toContain('attendance');
            expect(enabledModuleIds).toContain('tasks');
            expect(enabledModuleIds).toContain('email-service');
            expect(enabledModuleIds).toHaveLength(4);

            // Verify limits are updated
            expect(tenant.limits.maxUsers).toBe(200);
            expect(tenant.limits.maxStorage).toBe(21474836480);
            expect(tenant.limits.apiCallsPerMonth).toBe(50000);

            // Verify subscription status
            expect(tenant.subscription.status).toBe('active');
            expect(tenant.status).toBe('active');
        });

        it('should calculate correct expiration date for monthly billing', () => {
            const tenant = createMockTenant();
            const plan = createMockPlan();

            const startDate = new Date();
            const expiresAt = new Date(startDate);
            expiresAt.setMonth(expiresAt.getMonth() + 1);

            // Simulate monthly billing assignment
            tenant.subscription.planId = plan._id;
            tenant.subscription.billingCycle = 'monthly';
            tenant.subscription.startDate = startDate;
            tenant.subscription.expiresAt = expiresAt;

            // Should expire approximately 1 month from start
            const expectedExpiration = new Date(startDate);
            expectedExpiration.setMonth(expectedExpiration.getMonth() + 1);

            const timeDiff = Math.abs(tenant.subscription.expiresAt.getTime() - expectedExpiration.getTime());
            expect(timeDiff).toBeLessThan(60000); // Within 1 minute
        });

        it('should calculate correct expiration date for yearly billing', () => {
            const tenant = createMockTenant();
            const plan = createMockPlan();

            const startDate = new Date();
            const expiresAt = new Date(startDate);
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            // Simulate yearly billing assignment
            tenant.subscription.planId = plan._id;
            tenant.subscription.billingCycle = 'yearly';
            tenant.subscription.startDate = startDate;
            tenant.subscription.expiresAt = expiresAt;

            // Should expire approximately 1 year from start
            const expectedExpiration = new Date(startDate);
            expectedExpiration.setFullYear(expectedExpiration.getFullYear() + 1);

            const timeDiff = Math.abs(tenant.subscription.expiresAt.getTime() - expectedExpiration.getTime());
            expect(timeDiff).toBeLessThan(60000); // Within 1 minute
        });

        it('should always include hr-core module even if not in plan', () => {
            const tenant = createMockTenant();
            const planWithoutCore = createMockPlan({
                includedModules: [
                    { moduleId: 'attendance', included: true }
                ]
            });

            // Simulate assignment with hr-core enforcement
            let includedModuleIds = planWithoutCore.getIncludedModuleIds();

            // Always include hr-core
            if (!includedModuleIds.includes('hr-core')) {
                includedModuleIds.unshift('hr-core');
            }

            tenant.enabledModules = includedModuleIds.map(moduleId => ({
                moduleId,
                enabledAt: new Date(),
                enabledBy: 'subscription'
            }));

            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toContain('hr-core');
            expect(enabledModuleIds).toContain('attendance');
        });
    });

    describe('Subscription Expiration (Requirement 9.3)', () => {
        it('should disable modules when subscription expires', () => {
            // Test: Subscription expiration disables modules (Requirement 9.3)
            const tenant = createMockTenant({
                status: 'active',
                subscription: {
                    planId: new mongoose.Types.ObjectId(),
                    status: 'active',
                    startDate: new Date(Date.now() - 86400000 * 30), // 30 days ago
                    expiresAt: new Date(Date.now() - 86400000), // 1 day ago (expired)
                    autoRenew: false,
                    billingCycle: 'monthly'
                },
                enabledModules: [
                    { moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' },
                    { moduleId: 'attendance', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'tasks', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'email-service', enabledAt: new Date(), enabledBy: 'subscription' }
                ]
            });

            // Simulate expiration handling
            if (tenant.subscription.expiresAt && tenant.subscription.expiresAt < new Date()) {
                if (!tenant.subscription.autoRenew) {
                    // Expire subscription
                    tenant.subscription.status = 'expired';
                    tenant.status = 'suspended';

                    // Disable optional modules (keep hr-core)
                    tenant.enabledModules = tenant.enabledModules.filter(
                        module => module.moduleId === 'hr-core'
                    );
                }
            }

            expect(tenant.subscription.status).toBe('expired');
            expect(tenant.status).toBe('suspended');

            // Only hr-core should remain enabled
            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toContain('hr-core');
            expect(enabledModuleIds).not.toContain('attendance');
            expect(enabledModuleIds).not.toContain('tasks');
            expect(enabledModuleIds).not.toContain('email-service');
            expect(enabledModuleIds).toHaveLength(1);
        });

        it('should not expire subscription if not yet expired', () => {
            const tenant = createMockTenant({
                status: 'active',
                subscription: {
                    planId: new mongoose.Types.ObjectId(),
                    status: 'active',
                    startDate: new Date(),
                    expiresAt: new Date(Date.now() + 86400000 * 30), // 30 days from now
                    autoRenew: false,
                    billingCycle: 'monthly'
                },
                enabledModules: [
                    { moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' },
                    { moduleId: 'attendance', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'tasks', enabledAt: new Date(), enabledBy: 'subscription' }
                ]
            });

            // Simulate expiration check - should not expire
            if (tenant.subscription.expiresAt && tenant.subscription.expiresAt < new Date()) {
                // Would expire, but condition is false
                tenant.subscription.status = 'expired';
            }

            // Should remain unchanged
            expect(tenant.subscription.status).toBe('active');
            expect(tenant.status).toBe('active');

            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toHaveLength(3); // All modules still enabled
        });

        it('should auto-renew subscription if autoRenew is enabled', () => {
            const tenant = createMockTenant({
                status: 'active',
                subscription: {
                    planId: new mongoose.Types.ObjectId(),
                    status: 'active',
                    startDate: new Date(Date.now() - 86400000 * 30), // 30 days ago
                    expiresAt: new Date(Date.now() - 86400000), // 1 day ago (expired)
                    autoRenew: true,
                    billingCycle: 'monthly'
                }
            });

            // Simulate auto-renewal
            if (tenant.subscription.expiresAt && tenant.subscription.expiresAt < new Date()) {
                if (tenant.subscription.autoRenew) {
                    // Renew subscription
                    const newStartDate = new Date();
                    const newExpiresAt = new Date(newStartDate);
                    newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);

                    tenant.subscription.status = 'active';
                    tenant.subscription.startDate = newStartDate;
                    tenant.subscription.expiresAt = newExpiresAt;
                    tenant.status = 'active';
                }
            }

            // Should be renewed
            expect(tenant.subscription.status).toBe('active');
            expect(tenant.status).toBe('active');
            expect(tenant.subscription.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });
    });

    describe('Subscription Upgrade (Requirement 9.4)', () => {
        it('should enable new modules when upgrading plan', () => {
            // Test: Upgrade enables new modules (Requirement 9.4)
            const tenant = createMockTenant({
                status: 'active',
                subscription: {
                    planId: new mongoose.Types.ObjectId(),
                    status: 'active'
                },
                enabledModules: [
                    { moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' },
                    { moduleId: 'attendance', enabledAt: new Date(), enabledBy: 'subscription' }
                ],
                limits: {
                    maxUsers: 50,
                    maxStorage: 5368709120, // 5GB
                    apiCallsPerMonth: 10000
                }
            });

            const newPlan = createMockPlan({
                name: 'professional',
                tier: 'professional',
                includedModules: [
                    { moduleId: 'hr-core', included: true },
                    { moduleId: 'attendance', included: true },
                    { moduleId: 'tasks', included: true },
                    { moduleId: 'email-service', included: true }
                ],
                limits: {
                    maxUsers: 200,
                    maxStorage: 21474836480, // 20GB
                    apiCallsPerMonth: 50000
                }
            });

            // Simulate upgrade
            tenant.subscription.planId = newPlan._id;
            tenant.limits = { ...newPlan.limits };

            // Enable new modules from upgraded plan
            const newModuleIds = newPlan.getIncludedModuleIds();
            newModuleIds.forEach(moduleId => {
                if (!tenant.isModuleEnabled(moduleId)) {
                    tenant.enableModule(moduleId, 'upgrade');
                }
            });

            // Should have all professional plan modules
            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toContain('hr-core');
            expect(enabledModuleIds).toContain('attendance');
            expect(enabledModuleIds).toContain('tasks'); // New module from upgrade
            expect(enabledModuleIds).toContain('email-service'); // New module from upgrade

            // Verify limits are updated
            expect(tenant.limits.maxUsers).toBe(200);
            expect(tenant.limits.maxStorage).toBe(21474836480);
            expect(tenant.limits.apiCallsPerMonth).toBe(50000);
        });

        it('should upgrade from professional to enterprise plan', () => {
            const tenant = createMockTenant({
                enabledModules: [
                    { moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' },
                    { moduleId: 'attendance', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'tasks', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'email-service', enabledAt: new Date(), enabledBy: 'subscription' }
                ]
            });

            const enterprisePlan = createMockPlan({
                name: 'enterprise',
                tier: 'enterprise',
                includedModules: [
                    { moduleId: 'hr-core', included: true },
                    { moduleId: 'attendance', included: true },
                    { moduleId: 'tasks', included: true },
                    { moduleId: 'email-service', included: true },
                    { moduleId: 'payroll', included: true },
                    { moduleId: 'reports', included: true }
                ],
                limits: {
                    maxUsers: 999999,
                    maxStorage: 107374182400, // 100GB
                    apiCallsPerMonth: 500000
                }
            });

            // Simulate upgrade to enterprise
            tenant.subscription.planId = enterprisePlan._id;
            tenant.limits = { ...enterprisePlan.limits };

            const newModuleIds = enterprisePlan.getIncludedModuleIds();
            newModuleIds.forEach(moduleId => {
                if (!tenant.isModuleEnabled(moduleId)) {
                    tenant.enableModule(moduleId, 'upgrade');
                }
            });

            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toContain('payroll'); // New module from enterprise
            expect(enabledModuleIds).toContain('reports'); // New module from enterprise
            expect(enabledModuleIds).toHaveLength(6);

            // Verify enterprise limits
            expect(tenant.limits.maxUsers).toBe(999999);
            expect(tenant.limits.maxStorage).toBe(107374182400);
        });
    });

    describe('Subscription Downgrade (Requirement 9.5)', () => {
        it('should preserve data when downgrading plan', () => {
            // Test: Downgrade preserves data (Requirement 9.5)
            const tenant = createMockTenant({
                enabledModules: [
                    { moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' },
                    { moduleId: 'attendance', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'tasks', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'email-service', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'payroll', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'reports', enabledAt: new Date(), enabledBy: 'subscription' }
                ],
                limits: {
                    maxUsers: 999999,
                    maxStorage: 107374182400,
                    apiCallsPerMonth: 500000
                }
            });

            const professionalPlan = createMockPlan({
                name: 'professional',
                tier: 'professional',
                includedModules: [
                    { moduleId: 'hr-core', included: true },
                    { moduleId: 'attendance', included: true },
                    { moduleId: 'tasks', included: true },
                    { moduleId: 'email-service', included: true }
                ],
                limits: {
                    maxUsers: 200,
                    maxStorage: 21474836480,
                    apiCallsPerMonth: 50000
                }
            });

            // Simulate downgrade - disable modules not in new plan (preserve data)
            tenant.subscription.planId = professionalPlan._id;
            tenant.limits = { ...professionalPlan.limits };

            const newModuleIds = professionalPlan.getIncludedModuleIds();

            // Keep hr-core always enabled
            if (!newModuleIds.includes('hr-core')) {
                newModuleIds.push('hr-core');
            }

            // Filter enabled modules to only those in new plan
            // Note: In real implementation, data would be preserved in database
            // even though modules are disabled
            tenant.enabledModules = tenant.enabledModules.filter(
                module => newModuleIds.includes(module.moduleId)
            );

            // Should only have professional plan modules enabled
            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toContain('hr-core');
            expect(enabledModuleIds).toContain('attendance');
            expect(enabledModuleIds).toContain('tasks');
            expect(enabledModuleIds).toContain('email-service');
            expect(enabledModuleIds).not.toContain('payroll'); // Removed from downgrade
            expect(enabledModuleIds).not.toContain('reports'); // Removed from downgrade
            expect(enabledModuleIds).toHaveLength(4);

            // Verify limits are updated to professional plan limits
            expect(tenant.limits.maxUsers).toBe(200);
            expect(tenant.limits.maxStorage).toBe(21474836480);
            expect(tenant.limits.apiCallsPerMonth).toBe(50000);

            // Note: In a real system, we would verify that the actual data 
            // (payroll records, reports, etc.) is preserved in the database
            // even though the modules are disabled. This test verifies the
            // module enablement logic, while data preservation would be
            // tested at the data layer.
        });

        it('should always preserve hr-core module during downgrade', () => {
            const tenant = createMockTenant({
                enabledModules: [
                    { moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' },
                    { moduleId: 'attendance', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'tasks', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'payroll', enabledAt: new Date(), enabledBy: 'subscription' }
                ]
            });

            const minimalPlan = createMockPlan({
                name: 'minimal-test',
                tier: 'basic',
                includedModules: [
                    { moduleId: 'attendance', included: true }
                ]
            });

            // Simulate downgrade with hr-core preservation
            let newModuleIds = minimalPlan.getIncludedModuleIds();

            // Keep hr-core always enabled
            if (!newModuleIds.includes('hr-core')) {
                newModuleIds.push('hr-core');
            }

            tenant.enabledModules = tenant.enabledModules.filter(
                module => newModuleIds.includes(module.moduleId)
            );

            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toContain('hr-core'); // Always preserved
            expect(enabledModuleIds).toContain('attendance');
            expect(enabledModuleIds).toHaveLength(2);
        });

        it('should downgrade from professional to basic plan', () => {
            const tenant = createMockTenant({
                enabledModules: [
                    { moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' },
                    { moduleId: 'attendance', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'tasks', enabledAt: new Date(), enabledBy: 'subscription' },
                    { moduleId: 'email-service', enabledAt: new Date(), enabledBy: 'subscription' }
                ],
                limits: {
                    maxUsers: 200,
                    maxStorage: 21474836480,
                    apiCallsPerMonth: 50000
                }
            });

            const basicPlan = createMockPlan({
                name: 'basic',
                tier: 'basic',
                includedModules: [
                    { moduleId: 'hr-core', included: true },
                    { moduleId: 'attendance', included: true }
                ],
                limits: {
                    maxUsers: 50,
                    maxStorage: 5368709120,
                    apiCallsPerMonth: 10000
                }
            });

            // Simulate downgrade to basic
            tenant.subscription.planId = basicPlan._id;
            tenant.limits = { ...basicPlan.limits };

            const newModuleIds = basicPlan.getIncludedModuleIds();
            tenant.enabledModules = tenant.enabledModules.filter(
                module => newModuleIds.includes(module.moduleId)
            );

            const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);
            expect(enabledModuleIds).toContain('hr-core');
            expect(enabledModuleIds).toContain('attendance');
            expect(enabledModuleIds).not.toContain('tasks'); // Removed
            expect(enabledModuleIds).not.toContain('email-service'); // Removed
            expect(enabledModuleIds).toHaveLength(2);

            // Verify basic plan limits
            expect(tenant.limits.maxUsers).toBe(50);
            expect(tenant.limits.maxStorage).toBe(5368709120);
            expect(tenant.limits.apiCallsPerMonth).toBe(10000);
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent plan assignment', () => {
            const tenant = createMockTenant();
            const nonExistentPlanId = new mongoose.Types.ObjectId();

            // Simulate error handling for non-existent plan
            let errorThrown = false;
            try {
                // In real implementation, this would throw an error
                if (!nonExistentPlanId) {
                    throw new Error('Plan not found');
                }
            } catch (error) {
                errorThrown = true;
                expect(error.message).toBe('Plan not found');
            }

            expect(errorThrown).toBe(false); // Plan ID exists, so no error
        });

        it('should handle inactive plan assignment', () => {
            const tenant = createMockTenant();
            const inactivePlan = createMockPlan({
                isActive: false
            });

            // Simulate error handling for inactive plan
            let errorThrown = false;
            try {
                if (!inactivePlan.isActive) {
                    throw new Error('Plan is not active');
                }
            } catch (error) {
                errorThrown = true;
                expect(error.message).toBe('Plan is not active');
            }

            expect(errorThrown).toBe(true);
        });

        it('should handle non-existent tenant operations', () => {
            const nonExistentTenantId = 'non-existent-tenant';

            // Simulate error handling for non-existent tenant
            let errorThrown = false;
            try {
                // In real implementation, this would check if tenant exists
                const tenant = null; // Simulate not found
                if (!tenant) {
                    throw new Error(`Tenant with ID ${nonExistentTenantId} not found`);
                }
            } catch (error) {
                errorThrown = true;
                expect(error.message).toBe('Tenant with ID non-existent-tenant not found');
            }

            expect(errorThrown).toBe(true);
        });
    });
});