// testing/services/subscription.service.test.js
import mongoose from 'mongoose';
import subscriptionService from '../../services/subscription.service.js';
import License, { MODULES } from '../../platform/system/models/license.model.js';
import LicenseAudit from '../../platform/system/models/licenseAudit.model.js';

describe('Subscription Service', () => {
    let testTenantId;

    beforeEach(async () => {
        // Clear test data
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});

        testTenantId = new mongoose.Types.ObjectId();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('createSubscription', () => {
        it('should create a new subscription with modules', async () => {
            const modules = [
                {
                    moduleKey: MODULES.ATTENDANCE,
                    tier: 'business',
                    limits: {
                        employees: 200,
                        devices: 10,
                        storage: 10737418240,
                        apiCalls: 50000
                    }
                },
                {
                    moduleKey: MODULES.LEAVE,
                    tier: 'starter',
                    limits: {
                        employees: 50,
                        storage: 536870912,
                        apiCalls: 5000
                    }
                }
            ];

            const license = await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules,
                billingCycle: 'monthly',
                billingEmail: 'billing@test.com',
                isTrial: false
            });

            expect(license).toBeDefined();
            expect(license.tenantId.toString()).toBe(testTenantId.toString());
            expect(license.subscriptionId).toContain('sub-');
            expect(license.status).toBe('active');
            expect(license.modules).toHaveLength(2);
            expect(license.billingCycle).toBe('monthly');
            expect(license.billingEmail).toBe('billing@test.com');

            // Verify modules are enabled
            const attendanceModule = license.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule).toBeDefined();
            expect(attendanceModule.enabled).toBe(true);
            expect(attendanceModule.tier).toBe('business');
            expect(attendanceModule.limits.employees).toBe(200);

            const leaveModule = license.getModuleLicense(MODULES.LEAVE);
            expect(leaveModule).toBeDefined();
            expect(leaveModule.enabled).toBe(true);
            expect(leaveModule.tier).toBe('starter');
        });

        it('should create a trial subscription', async () => {
            const modules = [
                {
                    moduleKey: MODULES.ATTENDANCE,
                    tier: 'business'
                }
            ];

            const license = await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules,
                isTrial: true,
                trialDays: 14
            });

            expect(license.status).toBe('trial');
            expect(license.trialEndsAt).toBeDefined();

            // Check trial ends in approximately 14 days
            const now = new Date();
            const trialEnd = new Date(license.trialEndsAt);
            const daysDiff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
            expect(daysDiff).toBeGreaterThanOrEqual(13);
            expect(daysDiff).toBeLessThanOrEqual(15);
        });

        it('should fail if subscription already exists', async () => {
            const modules = [{ moduleKey: MODULES.ATTENDANCE, tier: 'starter' }];

            // Create first subscription
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules
            });

            // Try to create second subscription for same tenant
            await expect(
                subscriptionService.createSubscription({
                    tenantId: testTenantId,
                    modules
                })
            ).rejects.toThrow('Subscription already exists');
        });
    });

    describe('upgradeSubscription', () => {
        beforeEach(async () => {
            // Create initial subscription
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules: [
                    { moduleKey: MODULES.ATTENDANCE, tier: 'starter' }
                ]
            });
        });

        it('should add new modules to subscription', async () => {
            const modulesToAdd = [
                {
                    moduleKey: MODULES.LEAVE,
                    tier: 'business',
                    limits: { employees: 200 }
                }
            ];

            const license = await subscriptionService.upgradeSubscription(
                testTenantId,
                modulesToAdd
            );

            expect(license.modules).toHaveLength(2);

            const leaveModule = license.getModuleLicense(MODULES.LEAVE);
            expect(leaveModule).toBeDefined();
            expect(leaveModule.enabled).toBe(true);
            expect(leaveModule.tier).toBe('business');
        });

        it('should upgrade existing module tier', async () => {
            const modulesToUpgrade = [
                {
                    moduleKey: MODULES.ATTENDANCE,
                    tier: 'enterprise',
                    limits: { employees: 999999 } // Large number to represent unlimited
                }
            ];

            const license = await subscriptionService.upgradeSubscription(
                testTenantId,
                modulesToUpgrade
            );

            const attendanceModule = license.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule.tier).toBe('enterprise');
            expect(attendanceModule.limits.employees).toBe(999999);
        });

        it('should convert trial to active on upgrade', async () => {
            // Create trial subscription
            const trialTenantId = new mongoose.Types.ObjectId();
            await subscriptionService.createSubscription({
                tenantId: trialTenantId,
                modules: [{ moduleKey: MODULES.ATTENDANCE, tier: 'starter' }],
                isTrial: true
            });

            // Upgrade subscription
            const license = await subscriptionService.upgradeSubscription(
                trialTenantId,
                [{ moduleKey: MODULES.LEAVE, tier: 'business' }]
            );

            expect(license.status).toBe('active');
            expect(license.trialEndsAt).toBeNull();
        });
    });

    describe('downgradeSubscription', () => {
        beforeEach(async () => {
            // Create subscription with multiple modules
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules: [
                    { moduleKey: MODULES.ATTENDANCE, tier: 'business' },
                    { moduleKey: MODULES.LEAVE, tier: 'business' }
                ]
            });
        });

        it('should remove module from subscription', async () => {
            const modulesToModify = [
                {
                    moduleKey: MODULES.LEAVE,
                    action: 'remove'
                }
            ];

            const license = await subscriptionService.downgradeSubscription(
                testTenantId,
                modulesToModify
            );

            const leaveModule = license.getModuleLicense(MODULES.LEAVE);
            expect(leaveModule.enabled).toBe(false);
        });

        it('should downgrade module tier', async () => {
            const modulesToModify = [
                {
                    moduleKey: MODULES.ATTENDANCE,
                    action: 'downgrade',
                    tier: 'starter',
                    limits: { employees: 50 }
                }
            ];

            const license = await subscriptionService.downgradeSubscription(
                testTenantId,
                modulesToModify
            );

            const attendanceModule = license.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule.tier).toBe('starter');
            expect(attendanceModule.limits.employees).toBe(50);
        });
    });

    describe('handleTrialExpiration', () => {
        beforeEach(async () => {
            // Create trial subscription
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules: [{ moduleKey: MODULES.ATTENDANCE, tier: 'starter' }],
                isTrial: true
            });
        });

        it('should convert trial to active subscription', async () => {
            const license = await subscriptionService.handleTrialExpiration(
                testTenantId,
                true
            );

            expect(license.status).toBe('active');
            expect(license.trialEndsAt).toBeNull();
        });

        it('should expire trial and disable modules', async () => {
            const license = await subscriptionService.handleTrialExpiration(
                testTenantId,
                false
            );

            expect(license.status).toBe('expired');

            const attendanceModule = license.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule.enabled).toBe(false);
        });
    });

    describe('handleSubscriptionExpiration', () => {
        beforeEach(async () => {
            // Create active subscription
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules: [
                    { moduleKey: MODULES.ATTENDANCE, tier: 'business' },
                    { moduleKey: MODULES.LEAVE, tier: 'starter' }
                ]
            });
        });

        it('should expire subscription and disable all non-Core modules', async () => {
            const license = await subscriptionService.handleSubscriptionExpiration(
                testTenantId
            );

            expect(license.status).toBe('expired');

            // All non-Core modules should be disabled
            const attendanceModule = license.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule.enabled).toBe(false);

            const leaveModule = license.getModuleLicense(MODULES.LEAVE);
            expect(leaveModule.enabled).toBe(false);
        });
    });

    describe('getSubscriptionStatus', () => {
        it('should return status for existing subscription', async () => {
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules: [{ moduleKey: MODULES.ATTENDANCE, tier: 'business' }],
                billingCycle: 'annual'
            });

            const status = await subscriptionService.getSubscriptionStatus(testTenantId);

            expect(status.exists).toBe(true);
            expect(status.status).toBe('active');
            expect(status.billingCycle).toBe('annual');
            expect(status.modules).toHaveLength(1);
            expect(status.modules[0].key).toBe(MODULES.ATTENDANCE);
            expect(status.modules[0].enabled).toBe(true);
        });

        it('should return not found for non-existent subscription', async () => {
            const status = await subscriptionService.getSubscriptionStatus(
                new mongoose.Types.ObjectId()
            );

            expect(status.exists).toBe(false);
            expect(status.status).toBeNull();
        });

        it('should include trial information for trial subscriptions', async () => {
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules: [{ moduleKey: MODULES.ATTENDANCE, tier: 'starter' }],
                isTrial: true,
                trialDays: 14
            });

            const status = await subscriptionService.getSubscriptionStatus(testTenantId);

            expect(status.trial).toBeDefined();
            expect(status.trial.isActive).toBe(true);
            expect(status.trial.daysRemaining).toBeGreaterThan(0);
        });
    });

    describe('cancelSubscription', () => {
        beforeEach(async () => {
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules: [{ moduleKey: MODULES.ATTENDANCE, tier: 'business' }]
            });
        });

        it('should cancel subscription immediately', async () => {
            const license = await subscriptionService.cancelSubscription(
                testTenantId,
                true
            );

            expect(license.status).toBe('cancelled');

            const attendanceModule = license.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule.enabled).toBe(false);
        });

        it('should fail to cancel already cancelled subscription', async () => {
            await subscriptionService.cancelSubscription(testTenantId, true);

            await expect(
                subscriptionService.cancelSubscription(testTenantId, true)
            ).rejects.toThrow('already cancelled');
        });
    });

    describe('reactivateSubscription', () => {
        beforeEach(async () => {
            // Create and cancel subscription
            await subscriptionService.createSubscription({
                tenantId: testTenantId,
                modules: [{ moduleKey: MODULES.ATTENDANCE, tier: 'business' }]
            });
            await subscriptionService.cancelSubscription(testTenantId, true);
        });

        it('should reactivate cancelled subscription', async () => {
            const license = await subscriptionService.reactivateSubscription(testTenantId);

            expect(license.status).toBe('active');

            const attendanceModule = license.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule.enabled).toBe(true);
        });

        it('should fail to reactivate already active subscription', async () => {
            await subscriptionService.reactivateSubscription(testTenantId);

            await expect(
                subscriptionService.reactivateSubscription(testTenantId)
            ).rejects.toThrow('already active');
        });
    });
});
