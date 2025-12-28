import mongoose from 'mongoose';
import LicenseRepository from '../../../repositories/platform/LicenseRepository.js';
import License, { MODULES, PRICING_TIERS, LICENSE_STATUS } from '../../../platform/system/models/license.model.js';

describe('LicenseRepository', () => {
    let licenseRepository;
    let testLicenses = [];

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        licenseRepository = new LicenseRepository();
    });

    beforeEach(async () => {
        // Clean up test data
        await License.deleteMany({ tenantId: /^test-tenant/ });
        testLicenses = [];
    });

    afterAll(async () => {
        // Clean up test data
        await License.deleteMany({ tenantId: /^test-tenant/ });
    });

    describe('Basic CRUD Operations', () => {
        it('should create a license successfully', async () => {
            const licenseData = {
                tenantId: 'test-tenant-1',
                subscriptionId: 'test-subscription-1',
                status: 'active',
                billingCycle: 'monthly'
            };

            const license = await licenseRepository.create(licenseData);
            testLicenses.push(license);

            expect(license).toBeDefined();
            expect(license.tenantId).toBe(licenseData.tenantId);
            expect(license.subscriptionId).toBe(licenseData.subscriptionId);
            expect(license.status).toBe(licenseData.status);
            expect(license.billingCycle).toBe(licenseData.billingCycle);
        });

        it('should create license with modules', async () => {
            const licenseData = {
                tenantId: 'test-tenant-2',
                subscriptionId: 'test-subscription-2',
                status: 'active'
            };

            const modules = [
                {
                    key: MODULES.CORE_HR,
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                },
                {
                    key: MODULES.ATTENDANCE,
                    enabled: false,
                    tier: 'starter',
                    limits: { employees: 50 }
                }
            ];

            const license = await licenseRepository.createLicenseWithModules(licenseData, modules);
            testLicenses.push(license);

            expect(license).toBeDefined();
            expect(license.modules).toHaveLength(2);
            expect(license.modules[0].key).toBe(MODULES.CORE_HR);
            expect(license.modules[0].enabled).toBe(true);
            expect(license.modules[1].key).toBe(MODULES.ATTENDANCE);
            expect(license.modules[1].enabled).toBe(false);
        });

        it('should find license by ID', async () => {
            const licenseData = {
                tenantId: 'test-tenant-3',
                subscriptionId: 'test-subscription-3',
                status: 'trial'
            };

            const createdLicense = await licenseRepository.create(licenseData);
            testLicenses.push(createdLicense);

            const foundLicense = await licenseRepository.findById(createdLicense._id);

            expect(foundLicense).toBeDefined();
            expect(foundLicense._id.toString()).toBe(createdLicense._id.toString());
            expect(foundLicense.tenantId).toBe(licenseData.tenantId);
        });

        it('should update license successfully', async () => {
            const licenseData = {
                tenantId: 'test-tenant-4',
                subscriptionId: 'test-subscription-4',
                status: 'trial'
            };

            const createdLicense = await licenseRepository.create(licenseData);
            testLicenses.push(createdLicense);

            const updateData = { status: 'active' };
            const updatedLicense = await licenseRepository.update(createdLicense._id, updateData);

            expect(updatedLicense).toBeDefined();
            expect(updatedLicense.status).toBe('active');
        });

        it('should delete license successfully', async () => {
            const licenseData = {
                tenantId: 'test-tenant-5',
                subscriptionId: 'test-subscription-5',
                status: 'trial'
            };

            const createdLicense = await licenseRepository.create(licenseData);
            const deleted = await licenseRepository.delete(createdLicense._id);

            expect(deleted).toBe(true);

            const foundLicense = await licenseRepository.findById(createdLicense._id);
            expect(foundLicense).toBeNull();
        });
    });

    describe('License Lookup Methods', () => {
        beforeEach(async () => {
            const licenses = [
                {
                    tenantId: 'test-tenant-lookup-1',
                    subscriptionId: 'test-subscription-lookup-1',
                    status: 'active',
                    billingCycle: 'monthly'
                },
                {
                    tenantId: 'test-tenant-lookup-2',
                    subscriptionId: 'test-subscription-lookup-2',
                    status: 'trial',
                    billingCycle: 'annual',
                    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                },
                {
                    tenantId: 'test-tenant-lookup-3',
                    subscriptionId: 'test-subscription-lookup-3',
                    status: 'expired',
                    billingCycle: 'monthly'
                }
            ];

            for (const licenseData of licenses) {
                const license = await licenseRepository.create(licenseData);
                testLicenses.push(license);
            }
        });

        it('should find license by tenant ID', async () => {
            const license = await licenseRepository.findByTenantId('test-tenant-lookup-1');

            expect(license).toBeDefined();
            expect(license.tenantId).toBe('test-tenant-lookup-1');
        });

        it('should find license by subscription ID', async () => {
            const license = await licenseRepository.findBySubscriptionId('test-subscription-lookup-2');

            expect(license).toBeDefined();
            expect(license.subscriptionId).toBe('test-subscription-lookup-2');
        });

        it('should find licenses by status', async () => {
            const activeLicenses = await licenseRepository.findByStatus('active');
            const trialLicenses = await licenseRepository.findByStatus('trial');
            const expiredLicenses = await licenseRepository.findByStatus('expired');

            expect(activeLicenses.length).toBeGreaterThanOrEqual(1);
            expect(trialLicenses.length).toBeGreaterThanOrEqual(1);
            expect(expiredLicenses.length).toBeGreaterThanOrEqual(1);

            activeLicenses.forEach(license => {
                expect(license.status).toBe('active');
            });
        });

        it('should find active licenses', async () => {
            const activeLicenses = await licenseRepository.findActiveLicenses();

            expect(activeLicenses.length).toBeGreaterThanOrEqual(1);
            activeLicenses.forEach(license => {
                expect(license.status).toBe('active');
            });
        });

        it('should find trial licenses', async () => {
            const trialLicenses = await licenseRepository.findTrialLicenses();

            expect(trialLicenses.length).toBeGreaterThanOrEqual(1);
            trialLicenses.forEach(license => {
                expect(license.status).toBe('trial');
            });
        });

        it('should find licenses by billing cycle', async () => {
            const monthlyLicenses = await licenseRepository.findByBillingCycle('monthly');
            const annualLicenses = await licenseRepository.findByBillingCycle('annual');

            expect(monthlyLicenses.length).toBeGreaterThanOrEqual(2);
            expect(annualLicenses.length).toBeGreaterThanOrEqual(1);

            monthlyLicenses.forEach(license => {
                expect(license.billingCycle).toBe('monthly');
            });
        });
    });

    describe('Module Operations', () => {
        beforeEach(async () => {
            const licenseData = {
                tenantId: 'test-tenant-modules',
                subscriptionId: 'test-subscription-modules',
                status: 'active',
                modules: [
                    {
                        key: MODULES.CORE_HR,
                        enabled: true,
                        tier: 'business',
                        limits: { employees: 100 },
                        activatedAt: new Date(),
                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    }
                ]
            };

            const license = await licenseRepository.create(licenseData);
            testLicenses.push(license);
        });

        it('should activate module successfully', async () => {
            const license = testLicenses[0];
            const limits = { employees: 200, storage: 10000000 };
            const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

            const updatedLicense = await licenseRepository.activateModule(
                license._id,
                MODULES.ATTENDANCE,
                'enterprise',
                limits,
                expiresAt
            );

            expect(updatedLicense).toBeDefined();
            const attendanceModule = updatedLicense.modules.find(m => m.key === MODULES.ATTENDANCE);
            expect(attendanceModule).toBeDefined();
            expect(attendanceModule.enabled).toBe(true);
            expect(attendanceModule.tier).toBe('enterprise');
            expect(attendanceModule.limits.employees).toBe(200);
        });

        it('should deactivate module successfully', async () => {
            const license = testLicenses[0];

            const updatedLicense = await licenseRepository.deactivateModule(
                license._id,
                MODULES.CORE_HR
            );

            expect(updatedLicense).toBeDefined();
            const coreHrModule = updatedLicense.modules.find(m => m.key === MODULES.CORE_HR);
            expect(coreHrModule).toBeDefined();
            expect(coreHrModule.enabled).toBe(false);
        });

        it('should update module limits successfully', async () => {
            const license = testLicenses[0];
            const newLimits = { employees: 150, storage: 20000000 };

            const updatedLicense = await licenseRepository.updateModuleLimits(
                license._id,
                MODULES.CORE_HR,
                newLimits
            );

            expect(updatedLicense).toBeDefined();
            const coreHrModule = updatedLicense.modules.find(m => m.key === MODULES.CORE_HR);
            expect(coreHrModule.limits.employees).toBe(150);
            expect(coreHrModule.limits.storage).toBe(20000000);
        });

        it('should extend license expiration successfully', async () => {
            const license = testLicenses[0];
            const newExpirationDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years

            const updatedLicense = await licenseRepository.extendLicenseExpiration(
                license._id,
                MODULES.CORE_HR,
                newExpirationDate
            );

            expect(updatedLicense).toBeDefined();
            const coreHrModule = updatedLicense.modules.find(m => m.key === MODULES.CORE_HR);
            expect(coreHrModule.expiresAt.getTime()).toBe(newExpirationDate.getTime());
        });

        it('should find licenses by module', async () => {
            const licensesWithCoreHr = await licenseRepository.findByModule(MODULES.CORE_HR, true);
            const licensesWithAttendance = await licenseRepository.findByModule(MODULES.ATTENDANCE, true);

            expect(licensesWithCoreHr.length).toBeGreaterThanOrEqual(1);
            expect(licensesWithAttendance.length).toBe(0); // Not activated yet

            licensesWithCoreHr.forEach(license => {
                const module = license.modules.find(m => m.key === MODULES.CORE_HR);
                expect(module).toBeDefined();
                expect(module.enabled).toBe(true);
            });
        });
    });

    describe('Expiration and Renewal', () => {
        beforeEach(async () => {
            const licenses = [
                {
                    tenantId: 'test-tenant-expiry-1',
                    subscriptionId: 'test-subscription-expiry-1',
                    status: 'active',
                    modules: [{
                        key: MODULES.CORE_HR,
                        enabled: true,
                        tier: 'business',
                        expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) // 8 days (within 10 days)
                    }]
                },
                {
                    tenantId: 'test-tenant-expiry-2',
                    subscriptionId: 'test-subscription-expiry-2',
                    status: 'active',
                    modules: [{
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'starter',
                        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // Expired yesterday
                    }]
                },
                {
                    tenantId: 'test-tenant-trial',
                    subscriptionId: 'test-subscription-trial',
                    status: 'trial',
                    trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
                }
            ];

            for (const licenseData of licenses) {
                const license = await licenseRepository.create(licenseData);
                testLicenses.push(license);
            }
        });

        it('should find expiring licenses', async () => {
            const expiringLicenses = await licenseRepository.findExpiringLicenses(20); // 20 days

            expect(expiringLicenses.length).toBeGreaterThanOrEqual(1);
            expiringLicenses.forEach(license => {
                const hasExpiringModule = license.modules.some(module => {
                    if (!module.expiresAt) return false;
                    const daysUntilExpiry = Math.ceil((module.expiresAt - new Date()) / (1000 * 60 * 60 * 24));
                    return daysUntilExpiry <= 20 && daysUntilExpiry > 0;
                });
                expect(hasExpiringModule).toBe(true);
            });
        });

        it('should find expired licenses', async () => {
            const expiredLicenses = await licenseRepository.findExpiredLicenses();

            expect(expiredLicenses.length).toBeGreaterThanOrEqual(1);
            // Note: This test checks for licenses with expired modules or expired status
        });

        it('should find licenses requiring renewal', async () => {
            const licensesRequiringRenewal = await licenseRepository.findLicensesRequiringRenewal(10); // 10 days

            expect(licensesRequiringRenewal.length).toBeGreaterThanOrEqual(2); // Trial + expiring module
        });

        it('should update license status', async () => {
            const license = testLicenses[0];

            const updatedLicense = await licenseRepository.updateStatus(license._id, 'suspended');

            expect(updatedLicense).toBeDefined();
            expect(updatedLicense.status).toBe('suspended');
        });
    });

    describe('Analytics', () => {
        beforeEach(async () => {
            const licenses = [
                {
                    tenantId: 'test-tenant-analytics-1',
                    subscriptionId: 'test-subscription-analytics-1',
                    status: 'active',
                    billingCycle: 'monthly',
                    modules: [{
                        key: MODULES.CORE_HR,
                        enabled: true,
                        tier: 'starter',
                        limits: { employees: 50, storage: 1000000 }
                    }]
                },
                {
                    tenantId: 'test-tenant-analytics-2',
                    subscriptionId: 'test-subscription-analytics-2',
                    status: 'trial',
                    billingCycle: 'annual',
                    modules: [{
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'business',
                        limits: { employees: 100, storage: 5000000 }
                    }]
                },
                {
                    tenantId: 'test-tenant-analytics-3',
                    subscriptionId: 'test-subscription-analytics-3',
                    status: 'expired',
                    billingCycle: 'monthly',
                    modules: [{
                        key: MODULES.PAYROLL,
                        enabled: false,
                        tier: 'enterprise',
                        limits: { employees: 200, storage: 10000000 }
                    }]
                }
            ];

            for (const licenseData of licenses) {
                const license = await licenseRepository.create(licenseData);
                testLicenses.push(license);
            }
        });

        it('should get license analytics', async () => {
            const analytics = await licenseRepository.getLicenseAnalytics();

            expect(analytics).toBeDefined();
            expect(analytics.byStatus).toBeInstanceOf(Array);
            expect(analytics.byModule).toBeInstanceOf(Array);
            expect(analytics.totals).toBeDefined();
            expect(analytics.totals.totalLicenses).toBeGreaterThanOrEqual(3);

            analytics.byStatus.forEach(statusData => {
                expect(statusData.status).toBeDefined();
                expect(statusData.count).toBeGreaterThanOrEqual(0);
                expect(statusData.monthlyCount).toBeGreaterThanOrEqual(0);
                expect(statusData.yearlyCount).toBeGreaterThanOrEqual(0);
            });

            analytics.byModule.forEach(moduleData => {
                expect(moduleData.moduleKey).toBeDefined();
                expect(moduleData.totalLicenses).toBeGreaterThanOrEqual(0);
                expect(moduleData.enabledCount).toBeGreaterThanOrEqual(0);
                expect(moduleData.disabledCount).toBeGreaterThanOrEqual(0);
            });
        });

        it('should get usage analytics', async () => {
            const usageAnalytics = await licenseRepository.getUsageAnalytics();

            expect(usageAnalytics).toBeInstanceOf(Array);
            usageAnalytics.forEach(moduleUsage => {
                expect(moduleUsage.moduleKey).toBeDefined();
                expect(moduleUsage.totalEmployeeLimit).toBeGreaterThanOrEqual(0);
                expect(moduleUsage.totalStorageLimit).toBeGreaterThanOrEqual(0);
                expect(moduleUsage.avgEmployeeLimit).toBeGreaterThanOrEqual(0);
                expect(moduleUsage.avgStorageLimit).toBeGreaterThanOrEqual(0);
            });
        });

        it('should filter analytics by criteria', async () => {
            const filter = { status: 'active' };
            const analytics = await licenseRepository.getLicenseAnalytics(filter);

            expect(analytics).toBeDefined();
            expect(analytics.byStatus).toBeInstanceOf(Array);
            
            // Should only include active licenses in the results
            const activeStatusData = analytics.byStatus.find(s => s.status === 'active');
            expect(activeStatusData).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid ObjectId gracefully', async () => {
            const license = await licenseRepository.findById('invalid-id');
            expect(license).toBeNull();
        });

        it('should handle non-existent license operations', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const updateResult = await licenseRepository.update(nonExistentId, { status: 'active' });
            expect(updateResult).toBeNull();

            const deleteResult = await licenseRepository.delete(nonExistentId);
            expect(deleteResult).toBe(false);

            const activateResult = await licenseRepository.activateModule(
                nonExistentId,
                MODULES.CORE_HR,
                'starter'
            );
            expect(activateResult).toBeNull();
        });

        it('should handle non-existent tenant and subscription lookups', async () => {
            const tenantResult = await licenseRepository.findByTenantId('non-existent-tenant');
            expect(tenantResult).toBeNull();

            const subscriptionResult = await licenseRepository.findBySubscriptionId('non-existent-subscription');
            expect(subscriptionResult).toBeNull();
        });
    });
});