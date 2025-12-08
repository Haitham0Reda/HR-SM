import mongoose from 'mongoose';
import License, { MODULES, PRICING_TIERS, LICENSE_STATUS, BILLING_CYCLES } from '../../models/license.model.js';

describe('License Model', () => {
    describe('Schema Validation', () => {
        it('should create and save a license successfully', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-123',
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'business',
                        limits: {
                            employees: 200,
                            storage: 10737418240,
                            apiCalls: 50000
                        },
                        activatedAt: new Date(),
                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    }
                ],
                billingCycle: 'monthly',
                status: 'active'
            };

            const license = new License(licenseData);
            const savedLicense = await license.save();

            expect(savedLicense._id).toBeDefined();
            expect(savedLicense.tenantId.toString()).toBe(licenseData.tenantId.toString());
            expect(savedLicense.subscriptionId).toBe(licenseData.subscriptionId);
            expect(savedLicense.modules).toHaveLength(1);
            expect(savedLicense.modules[0].key).toBe(MODULES.ATTENDANCE);
            expect(savedLicense.status).toBe('active');
        });

        it('should fail to create a license without required fields', async () => {
            const license = new License({});

            let err;
            try {
                await license.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors.tenantId).toBeDefined();
            expect(err.errors.subscriptionId).toBeDefined();
        });

        it('should fail to create a license without tenantId', async () => {
            const licenseData = {
                subscriptionId: 'sub-test-no-tenant'
            };

            const license = new License(licenseData);

            let err;
            try {
                await license.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors.tenantId).toBeDefined();
            expect(err.errors.tenantId.kind).toBe('required');
        });

        it('should fail to create a license without subscriptionId', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId()
            };

            const license = new License(licenseData);

            let err;
            try {
                await license.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors.subscriptionId).toBeDefined();
            expect(err.errors.subscriptionId.kind).toBe('required');
        });

        it('should set default values correctly', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-456'
            };

            const license = new License(licenseData);
            const savedLicense = await license.save();

            expect(savedLicense.modules).toEqual([]);
            expect(savedLicense.billingCycle).toBe('monthly');
            expect(savedLicense.status).toBe('trial');
            expect(savedLicense.trialEndsAt).toBeNull();
            expect(savedLicense.paymentMethod).toBeNull();
            expect(savedLicense.billingEmail).toBeNull();
        });

        it('should validate module key enum', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-invalid-key',
                modules: [
                    {
                        key: 'invalid-module-key',
                        enabled: true,
                        tier: 'business'
                    }
                ]
            };

            const license = new License(licenseData);

            let err;
            try {
                await license.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors['modules.0.key']).toBeDefined();
        });

        it('should validate module tier enum', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-789',
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'invalid-tier'
                    }
                ]
            };

            const license = new License(licenseData);

            let err;
            try {
                await license.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors['modules.0.tier']).toBeDefined();
        });

        it('should validate billing cycle enum', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-invalid-cycle',
                billingCycle: 'invalid-cycle'
            };

            const license = new License(licenseData);

            let err;
            try {
                await license.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors.billingCycle).toBeDefined();
        });

        it('should validate status enum', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-invalid-status',
                status: 'invalid-status'
            };

            const license = new License(licenseData);

            let err;
            try {
                await license.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors.status).toBeDefined();
        });

        it('should accept all valid module keys', async () => {
            const moduleKeys = Object.values(MODULES);

            for (const moduleKey of moduleKeys) {
                const licenseData = {
                    tenantId: new mongoose.Types.ObjectId(),
                    subscriptionId: `sub-test-${moduleKey}`,
                    modules: [
                        {
                            key: moduleKey,
                            enabled: true,
                            tier: 'business'
                        }
                    ]
                };

                const license = new License(licenseData);
                const savedLicense = await license.save();

                expect(savedLicense.modules[0].key).toBe(moduleKey);
            }
        });

        it('should accept all valid pricing tiers', async () => {
            for (const tier of PRICING_TIERS) {
                const licenseData = {
                    tenantId: new mongoose.Types.ObjectId(),
                    subscriptionId: `sub-test-tier-${tier}`,
                    modules: [
                        {
                            key: MODULES.ATTENDANCE,
                            enabled: true,
                            tier: tier
                        }
                    ]
                };

                const license = new License(licenseData);
                const savedLicense = await license.save();

                expect(savedLicense.modules[0].tier).toBe(tier);
            }
        });

        it('should accept all valid license statuses', async () => {
            for (const status of LICENSE_STATUS) {
                const licenseData = {
                    tenantId: new mongoose.Types.ObjectId(),
                    subscriptionId: `sub-test-status-${status}`,
                    status: status
                };

                const license = new License(licenseData);
                const savedLicense = await license.save();

                expect(savedLicense.status).toBe(status);
            }
        });

        it('should accept all valid billing cycles', async () => {
            for (const cycle of BILLING_CYCLES) {
                const licenseData = {
                    tenantId: new mongoose.Types.ObjectId(),
                    subscriptionId: `sub-test-cycle-${cycle}`,
                    billingCycle: cycle
                };

                const license = new License(licenseData);
                const savedLicense = await license.save();

                expect(savedLicense.billingCycle).toBe(cycle);
            }
        });

        it('should store custom limits in module', async () => {
            const customLimits = {
                maxReports: 100,
                maxDashboards: 10,
                customFeature: true
            };

            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-custom-limits',
                modules: [
                    {
                        key: MODULES.REPORTING,
                        enabled: true,
                        tier: 'enterprise',
                        limits: {
                            employees: 1000,
                            customLimits: customLimits
                        }
                    }
                ]
            };

            const license = new License(licenseData);
            const savedLicense = await license.save();

            expect(savedLicense.modules[0].limits.customLimits).toEqual(customLimits);
        });

        it('should enforce unique subscriptionId', async () => {
            const subscriptionId = 'sub-test-unique';

            await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: subscriptionId
            });

            const duplicateLicense = new License({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: subscriptionId
            });

            let err;
            try {
                await duplicateLicense.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.code).toBe(11000); // MongoDB duplicate key error
        });

        it('should set module enabled default to false', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-module-default',
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        tier: 'business'
                    }
                ]
            };

            const license = new License(licenseData);
            const savedLicense = await license.save();

            expect(savedLicense.modules[0].enabled).toBe(false);
        });

        it('should set module limit defaults to null', async () => {
            const licenseData = {
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-test-limit-defaults',
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'business'
                    }
                ]
            };

            const license = new License(licenseData);
            const savedLicense = await license.save();

            expect(savedLicense.modules[0].limits.employees).toBeNull();
            expect(savedLicense.modules[0].limits.storage).toBeNull();
            expect(savedLicense.modules[0].limits.apiCalls).toBeNull();
        });
    });

    describe('Instance Methods', () => {
        let testLicense;

        beforeEach(async () => {
            testLicense = await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-methods-test',
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'business',
                        limits: { employees: 200 },
                        activatedAt: new Date(),
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    },
                    {
                        key: MODULES.LEAVE,
                        enabled: false,
                        tier: 'starter',
                        limits: { employees: 50 }
                    }
                ],
                status: 'active'
            });
        });

        it('should get module license by key', () => {
            const attendanceModule = testLicense.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule).toBeDefined();
            expect(attendanceModule.key).toBe(MODULES.ATTENDANCE);
            expect(attendanceModule.enabled).toBe(true);

            const nonExistentModule = testLicense.getModuleLicense('non-existent');
            expect(nonExistentModule).toBeNull();
        });

        it('should check if module is enabled', () => {
            expect(testLicense.isModuleEnabled(MODULES.ATTENDANCE)).toBe(true);
            expect(testLicense.isModuleEnabled(MODULES.LEAVE)).toBe(false);
            expect(testLicense.isModuleEnabled('non-existent')).toBe(false);
        });

        it('should check if license is expired', () => {
            expect(testLicense.isExpired()).toBe(false);

            testLicense.status = 'expired';
            expect(testLicense.isExpired()).toBe(true);
        });

        it('should detect expired module', async () => {
            const expiredLicense = await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-expired-test',
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'business',
                        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
                    }
                ],
                status: 'active'
            });

            expect(expiredLicense.isExpired()).toBe(true);
        });

        it('should check if license is in trial', () => {
            testLicense.status = 'trial';
            testLicense.trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            expect(testLicense.isInTrial()).toBe(true);

            testLicense.trialEndsAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
            expect(testLicense.isInTrial()).toBe(false);

            testLicense.status = 'active';
            expect(testLicense.isInTrial()).toBe(false);
        });

        it('should get days until expiration', () => {
            const days = testLicense.getDaysUntilExpiration(MODULES.ATTENDANCE);
            expect(days).toBeGreaterThan(29);
            expect(days).toBeLessThanOrEqual(31);

            const noDays = testLicense.getDaysUntilExpiration(MODULES.LEAVE);
            expect(noDays).toBeNull();
        });

        it('should activate a module', async () => {
            const updatedLicense = await testLicense.activateModule(
                MODULES.PAYROLL,
                'enterprise',
                { employees: 500 },
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            );

            const payrollModule = updatedLicense.getModuleLicense(MODULES.PAYROLL);
            expect(payrollModule).toBeDefined();
            expect(payrollModule.enabled).toBe(true);
            expect(payrollModule.tier).toBe('enterprise');
            expect(payrollModule.limits.employees).toBe(500);
        });

        it('should update existing module on activation', async () => {
            const updatedLicense = await testLicense.activateModule(
                MODULES.LEAVE,
                'business',
                { employees: 200 }
            );

            const leaveModule = updatedLicense.getModuleLicense(MODULES.LEAVE);
            expect(leaveModule.enabled).toBe(true);
            expect(leaveModule.tier).toBe('business');
            expect(leaveModule.limits.employees).toBe(200);
        });

        it('should deactivate a module', async () => {
            const updatedLicense = await testLicense.deactivateModule(MODULES.ATTENDANCE);

            const attendanceModule = updatedLicense.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceModule.enabled).toBe(false);
        });

        it('should handle deactivating non-existent module gracefully', async () => {
            const updatedLicense = await testLicense.deactivateModule('non-existent-module');

            // Should not throw error, just return the license unchanged
            expect(updatedLicense).toBeDefined();
            expect(updatedLicense._id.toString()).toBe(testLicense._id.toString());
        });

        it('should preserve other module data when activating', async () => {
            const originalAttendance = testLicense.getModuleLicense(MODULES.ATTENDANCE);

            await testLicense.activateModule(
                MODULES.PAYROLL,
                'business',
                { employees: 200 }
            );

            const attendanceAfter = testLicense.getModuleLicense(MODULES.ATTENDANCE);
            expect(attendanceAfter.key).toBe(originalAttendance.key);
            expect(attendanceAfter.enabled).toBe(originalAttendance.enabled);
            expect(attendanceAfter.tier).toBe(originalAttendance.tier);
        });

        it('should preserve other module data when deactivating', async () => {
            const originalLeave = testLicense.getModuleLicense(MODULES.LEAVE);

            await testLicense.deactivateModule(MODULES.ATTENDANCE);

            const leaveAfter = testLicense.getModuleLicense(MODULES.LEAVE);
            expect(leaveAfter.key).toBe(originalLeave.key);
            expect(leaveAfter.enabled).toBe(originalLeave.enabled);
            expect(leaveAfter.tier).toBe(originalLeave.tier);
        });

        it('should calculate negative days for expired modules', async () => {
            const expiredLicense = await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-negative-days',
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'business',
                        expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
                    }
                ],
                status: 'active'
            });

            const days = expiredLicense.getDaysUntilExpiration(MODULES.ATTENDANCE);
            expect(days).toBeLessThan(0);
            expect(days).toBeGreaterThanOrEqual(-11);
        });

        it('should return null for getDaysUntilExpiration on non-existent module', () => {
            const days = testLicense.getDaysUntilExpiration('non-existent-module');
            expect(days).toBeNull();
        });

        it('should check trial status correctly when trialEndsAt is null', () => {
            testLicense.status = 'trial';
            testLicense.trialEndsAt = null;

            expect(testLicense.isInTrial()).toBe(false);
        });

        it('should merge limits when activating existing module', async () => {
            // First activation with some limits
            await testLicense.activateModule(
                MODULES.DOCUMENTS,
                'business',
                { employees: 200, storage: 10000 }
            );

            // Second activation with additional limits
            const updatedLicense = await testLicense.activateModule(
                MODULES.DOCUMENTS,
                'enterprise',
                { employees: 500, apiCalls: 100000 }
            );

            const documentsModule = updatedLicense.getModuleLicense(MODULES.DOCUMENTS);
            expect(documentsModule.limits.employees).toBe(500);
            expect(documentsModule.limits.storage).toBe(10000); // Preserved from first activation
            expect(documentsModule.limits.apiCalls).toBe(100000);
        });

        it('should set activatedAt timestamp when activating module', async () => {
            const beforeActivation = new Date();

            const updatedLicense = await testLicense.activateModule(
                MODULES.COMMUNICATION,
                'business',
                { employees: 200 }
            );

            const communicationModule = updatedLicense.getModuleLicense(MODULES.COMMUNICATION);
            expect(communicationModule.activatedAt).toBeDefined();
            expect(communicationModule.activatedAt).toBeInstanceOf(Date);
            expect(communicationModule.activatedAt.getTime()).toBeGreaterThanOrEqual(beforeActivation.getTime());
        });

        it('should update activatedAt when reactivating module', async () => {
            // First activation
            await testLicense.activateModule(MODULES.TASKS, 'starter', {});
            const firstActivation = testLicense.getModuleLicense(MODULES.TASKS).activatedAt;

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 10));

            // Second activation
            await testLicense.activateModule(MODULES.TASKS, 'business', {});
            const secondActivation = testLicense.getModuleLicense(MODULES.TASKS).activatedAt;

            expect(secondActivation.getTime()).toBeGreaterThan(firstActivation.getTime());
        });
    });

    describe('Static Methods', () => {
        let tenantId1, tenantId2;

        beforeEach(async () => {
            tenantId1 = new mongoose.Types.ObjectId();
            tenantId2 = new mongoose.Types.ObjectId();

            await License.create({
                tenantId: tenantId1,
                subscriptionId: 'sub-static-1',
                status: 'active',
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'business',
                        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                    }
                ]
            });

            await License.create({
                tenantId: tenantId2,
                subscriptionId: 'sub-static-2',
                status: 'trial',
                trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
        });

        it('should find license by tenant ID', async () => {
            const license = await License.findByTenantId(tenantId1);
            expect(license).toBeDefined();
            expect(license.tenantId.toString()).toBe(tenantId1.toString());
        });

        it('should find active licenses', async () => {
            const activeLicenses = await License.findActiveLicenses();
            expect(activeLicenses).toHaveLength(1);
            expect(activeLicenses[0].status).toBe('active');
        });

        it('should find expiring licenses', async () => {
            const expiringLicenses = await License.findExpiringLicenses(30);
            expect(expiringLicenses.length).toBeGreaterThan(0);
        });

        it('should find trial licenses', async () => {
            const trialLicenses = await License.findTrialLicenses();
            expect(trialLicenses).toHaveLength(1);
            expect(trialLicenses[0].status).toBe('trial');
        });

        it('should return null when license not found by tenant ID', async () => {
            const nonExistentTenantId = new mongoose.Types.ObjectId();
            const license = await License.findByTenantId(nonExistentTenantId);
            expect(license).toBeNull();
        });

        it('should find expiring licenses within custom threshold', async () => {
            // Create a license expiring in 20 days
            await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-expiring-20',
                status: 'active',
                modules: [
                    {
                        key: MODULES.PAYROLL,
                        enabled: true,
                        tier: 'business',
                        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
                    }
                ]
            });

            const expiringIn30 = await License.findExpiringLicenses(30);
            const expiringIn15 = await License.findExpiringLicenses(15);

            expect(expiringIn30.length).toBeGreaterThanOrEqual(2); // Original + new one
            expect(expiringIn15.length).toBeGreaterThanOrEqual(1); // Only the 15-day one
        });

        it('should not include expired licenses in expiring licenses query', async () => {
            await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-already-expired',
                status: 'active',
                modules: [
                    {
                        key: MODULES.DOCUMENTS,
                        enabled: true,
                        tier: 'business',
                        expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
                    }
                ]
            });

            const expiringLicenses = await License.findExpiringLicenses(30);

            // Should not include the already expired license
            const expiredLicense = expiringLicenses.find(l => l.subscriptionId === 'sub-already-expired');
            expect(expiredLicense).toBeUndefined();
        });

        it('should find only active licenses, not other statuses', async () => {
            await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-suspended',
                status: 'suspended'
            });

            await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: 'sub-cancelled',
                status: 'cancelled'
            });

            const activeLicenses = await License.findActiveLicenses();

            const suspendedFound = activeLicenses.find(l => l.status === 'suspended');
            const cancelledFound = activeLicenses.find(l => l.status === 'cancelled');

            expect(suspendedFound).toBeUndefined();
            expect(cancelledFound).toBeUndefined();

            activeLicenses.forEach(license => {
                expect(license.status).toBe('active');
            });
        });

        it('should return empty array when no active licenses exist', async () => {
            // Clear all licenses
            await License.deleteMany({});

            const activeLicenses = await License.findActiveLicenses();
            expect(activeLicenses).toEqual([]);
        });

        it('should return empty array when no trial licenses exist', async () => {
            // Clear all licenses
            await License.deleteMany({});

            const trialLicenses = await License.findTrialLicenses();
            expect(trialLicenses).toEqual([]);
        });

        it('should return empty array when no expiring licenses exist', async () => {
            // Clear all licenses
            await License.deleteMany({});

            const expiringLicenses = await License.findExpiringLicenses(30);
            expect(expiringLicenses).toEqual([]);
        });
    });

    describe('Indexes', () => {
        it('should have required indexes', async () => {
            const indexes = await License.collection.getIndexes();

            expect(indexes).toHaveProperty('tenantId_1');
            expect(indexes).toHaveProperty('subscriptionId_1');
        });

        it('should have tenantId index', async () => {
            const indexes = await License.collection.getIndexes();

            expect(indexes.tenantId_1).toBeDefined();
            expect(indexes.tenantId_1).toEqual([['tenantId', 1]]);
        });

        it('should have subscriptionId unique index', async () => {
            const indexes = await License.collection.getIndexes();

            expect(indexes.subscriptionId_1).toBeDefined();
            expect(indexes.subscriptionId_1).toEqual([['subscriptionId', 1]]);
        });

        it('should have status index', async () => {
            const indexes = await License.collection.getIndexes();

            expect(indexes.status_1).toBeDefined();
            expect(indexes.status_1).toEqual([['status', 1]]);
        });

        it('should have compound tenantId and status index', async () => {
            const indexes = await License.collection.getIndexes();

            expect(indexes.tenantId_1_status_1).toBeDefined();
            expect(indexes.tenantId_1_status_1).toEqual([['tenantId', 1], ['status', 1]]);
        });

        it('should have compound modules.key and modules.enabled index', async () => {
            const indexes = await License.collection.getIndexes();

            expect(indexes['modules.key_1_modules.enabled_1']).toBeDefined();
            expect(indexes['modules.key_1_modules.enabled_1']).toEqual([['modules.key', 1], ['modules.enabled', 1]]);
        });

        it('should have trialEndsAt index', async () => {
            const indexes = await License.collection.getIndexes();

            expect(indexes.trialEndsAt_1).toBeDefined();
            expect(indexes.trialEndsAt_1).toEqual([['trialEndsAt', 1]]);
        });

        it('should enforce unique constraint on subscriptionId', async () => {
            const subscriptionId = 'sub-unique-test';

            await License.create({
                tenantId: new mongoose.Types.ObjectId(),
                subscriptionId: subscriptionId
            });

            let err;
            try {
                await License.create({
                    tenantId: new mongoose.Types.ObjectId(),
                    subscriptionId: subscriptionId
                });
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.code).toBe(11000);
        });
    });
});
