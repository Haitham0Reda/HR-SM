import mongoose from 'mongoose';
import TenantConfigRepository from '../../repositories/core/TenantConfigRepository.js';
import TenantConfig from '../../modules/hr-core/models/TenantConfig.js';

describe('TenantConfigRepository', () => {
    let tenantConfigRepository;
    let testTenantId;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        tenantConfigRepository = new TenantConfigRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        // Clean up test data
        await TenantConfig.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    afterAll(async () => {
        // Clean up test data
        await TenantConfig.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    describe('findByTenantId', () => {
        it('should find tenant config by tenant ID', async () => {
            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'Test Company',
                deploymentMode: 'saas'
            });

            const foundConfig = await tenantConfigRepository.findByTenantId(testTenantId);

            expect(foundConfig).toBeTruthy();
            expect(foundConfig.companyName).toBe('Test Company');
            expect(foundConfig.tenantId).toBe(testTenantId);
        });
    });

    describe('findByDeploymentMode', () => {
        it('should find tenant configs by deployment mode', async () => {
            await TenantConfig.create({
                tenantId: testTenantId + '-1',
                companyName: 'SaaS Company 1',
                deploymentMode: 'saas'
            });

            await TenantConfig.create({
                tenantId: testTenantId + '-2',
                companyName: 'SaaS Company 2',
                deploymentMode: 'saas'
            });

            await TenantConfig.create({
                tenantId: testTenantId + '-3',
                companyName: 'On-Premise Company',
                deploymentMode: 'on-premise'
            });

            const saasConfigs = await tenantConfigRepository.findByDeploymentMode('saas');

            expect(saasConfigs.length).toBeGreaterThanOrEqual(2);
            expect(saasConfigs.every(c => c.deploymentMode === 'saas')).toBe(true);
        });
    });

    describe('findBySubscriptionPlan', () => {
        it('should find tenant configs by subscription plan', async () => {
            await TenantConfig.create({
                tenantId: testTenantId + '-1',
                companyName: 'Basic Company',
                subscription: { plan: 'basic', status: 'active' }
            });

            await TenantConfig.create({
                tenantId: testTenantId + '-2',
                companyName: 'Enterprise Company',
                subscription: { plan: 'enterprise', status: 'active' }
            });

            const basicConfigs = await tenantConfigRepository.findBySubscriptionPlan('basic');

            expect(basicConfigs.length).toBeGreaterThanOrEqual(1);
            expect(basicConfigs.every(c => c.subscription.plan === 'basic')).toBe(true);
        });
    });

    describe('findBySubscriptionStatus', () => {
        it('should find tenant configs by subscription status', async () => {
            await TenantConfig.create({
                tenantId: testTenantId + '-1',
                companyName: 'Active Company',
                subscription: { plan: 'basic', status: 'active' }
            });

            await TenantConfig.create({
                tenantId: testTenantId + '-2',
                companyName: 'Suspended Company',
                subscription: { plan: 'basic', status: 'suspended' }
            });

            const activeConfigs = await tenantConfigRepository.findBySubscriptionStatus('active');

            expect(activeConfigs.length).toBeGreaterThanOrEqual(1);
            expect(activeConfigs.every(c => c.subscription.status === 'active')).toBe(true);
        });
    });

    describe('findWithEnabledModule', () => {
        it('should find tenant configs with enabled module', async () => {
            const config1 = await TenantConfig.create({
                tenantId: testTenantId + '-1',
                companyName: 'Company with Attendance',
                modules: new Map([
                    ['attendance', { enabled: true, enabledAt: new Date() }],
                    ['payroll', { enabled: false }]
                ])
            });

            const config2 = await TenantConfig.create({
                tenantId: testTenantId + '-2',
                companyName: 'Company without Attendance',
                modules: new Map([
                    ['payroll', { enabled: true, enabledAt: new Date() }]
                ])
            });

            const configsWithAttendance = await tenantConfigRepository.findWithEnabledModule('attendance');

            expect(configsWithAttendance.length).toBeGreaterThanOrEqual(1);
            expect(configsWithAttendance.some(c => c.tenantId === testTenantId + '-1')).toBe(true);
        });
    });

    describe('findWithExpiringSubscriptions', () => {
        it('should find tenant configs with expiring subscriptions', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

            const farFutureDate = new Date();
            farFutureDate.setDate(farFutureDate.getDate() + 60); // 60 days from now

            await TenantConfig.create({
                tenantId: testTenantId + '-1',
                companyName: 'Expiring Soon',
                subscription: {
                    plan: 'basic',
                    status: 'active',
                    endDate: futureDate
                }
            });

            await TenantConfig.create({
                tenantId: testTenantId + '-2',
                companyName: 'Not Expiring Soon',
                subscription: {
                    plan: 'basic',
                    status: 'active',
                    endDate: farFutureDate
                }
            });

            const expiringConfigs = await tenantConfigRepository.findWithExpiringSubscriptions(30);

            expect(expiringConfigs.length).toBeGreaterThanOrEqual(1);
            expect(expiringConfigs.some(c => c.companyName === 'Expiring Soon')).toBe(true);
        });
    });

    describe('findWithExpiringLicenses', () => {
        it('should find tenant configs with expiring licenses', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

            await TenantConfig.create({
                tenantId: testTenantId + '-1',
                companyName: 'License Expiring Soon',
                deploymentMode: 'on-premise',
                license: {
                    key: 'test-key',
                    expiresAt: futureDate
                }
            });

            const expiringLicenses = await tenantConfigRepository.findWithExpiringLicenses(30);

            expect(expiringLicenses.length).toBeGreaterThanOrEqual(1);
            expect(expiringLicenses.some(c => c.companyName === 'License Expiring Soon')).toBe(true);
        });
    });

    describe('searchByCompanyName', () => {
        it('should search tenant configs by company name', async () => {
            await TenantConfig.create({
                tenantId: testTenantId + '-1',
                companyName: 'Acme Corporation',
                deploymentMode: 'saas'
            });

            await TenantConfig.create({
                tenantId: testTenantId + '-2',
                companyName: 'Beta Industries',
                deploymentMode: 'saas'
            });

            const results = await tenantConfigRepository.searchByCompanyName('acme');

            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results.some(c => c.companyName === 'Acme Corporation')).toBe(true);
        });
    });

    describe('enableModule', () => {
        it('should enable module for tenant', async () => {
            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'Test Company'
            });

            const updatedConfig = await tenantConfigRepository.enableModule(testTenantId, 'attendance');

            expect(updatedConfig.modules.get('attendance').enabled).toBe(true);
            expect(updatedConfig.modules.get('attendance').enabledAt).toBeTruthy();
        });
    });

    describe('disableModule', () => {
        it('should disable module for tenant', async () => {
            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'Test Company',
                modules: new Map([
                    ['attendance', { enabled: true, enabledAt: new Date() }]
                ])
            });

            const updatedConfig = await tenantConfigRepository.disableModule(testTenantId, 'attendance');

            expect(updatedConfig.modules.get('attendance').enabled).toBe(false);
            expect(updatedConfig.modules.get('attendance').disabledAt).toBeTruthy();
        });
    });

    describe('updateSubscriptionPlan', () => {
        it('should update subscription plan', async () => {
            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'Test Company',
                subscription: { plan: 'free', status: 'active' }
            });

            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            const updatedConfig = await tenantConfigRepository.updateSubscriptionPlan(
                testTenantId,
                'professional',
                {
                    endDate: endDate,
                    maxEmployees: 100
                }
            );

            expect(updatedConfig.subscription.plan).toBe('professional');
            expect(updatedConfig.subscription.status).toBe('active');
            expect(updatedConfig.subscription.maxEmployees).toBe(100);
        });
    });

    describe('updateLicense', () => {
        it('should update license information', async () => {
            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'Test Company',
                deploymentMode: 'on-premise'
            });

            const licenseData = {
                key: 'new-license-key',
                signature: 'license-signature',
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                maxEmployees: 50,
                enabledModules: ['hr-core', 'attendance', 'payroll']
            };

            const updatedConfig = await tenantConfigRepository.updateLicense(testTenantId, licenseData);

            expect(updatedConfig.license.key).toBe('new-license-key');
            expect(updatedConfig.license.signature).toBe('license-signature');
            expect(updatedConfig.license.maxEmployees).toBe(50);
            expect(updatedConfig.license.enabledModules).toEqual(['hr-core', 'attendance', 'payroll']);
        });
    });

    describe('updateSettings', () => {
        it('should update tenant settings', async () => {
            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'Test Company'
            });

            const updatedConfig = await tenantConfigRepository.updateSettings(testTenantId, {
                timezone: 'America/New_York',
                currency: 'USD',
                language: 'en'
            });

            expect(updatedConfig.settings.timezone).toBe('America/New_York');
            expect(updatedConfig.settings.currency).toBe('USD');
            expect(updatedConfig.settings.language).toBe('en');
        });
    });

    describe('getTenantStats', () => {
        it('should return tenant configuration statistics', async () => {
            await TenantConfig.create({
                tenantId: testTenantId + '-1',
                companyName: 'SaaS Company',
                deploymentMode: 'saas',
                subscription: { status: 'active' }
            });

            await TenantConfig.create({
                tenantId: testTenantId + '-2',
                companyName: 'On-Premise Company',
                deploymentMode: 'on-premise',
                subscription: { status: 'suspended' }
            });

            const stats = await tenantConfigRepository.getTenantStats();

            expect(stats.totalTenants).toBeGreaterThanOrEqual(2);
            expect(stats.saasDeployments).toBeGreaterThanOrEqual(1);
            expect(stats.onPremiseDeployments).toBeGreaterThanOrEqual(1);
            expect(stats.activeSubscriptions).toBeGreaterThanOrEqual(1);
            expect(stats.suspendedSubscriptions).toBeGreaterThanOrEqual(1);
        });
    });

    describe('validateTenantLicense', () => {
        it('should validate tenant license for SaaS deployment', async () => {
            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'SaaS Company',
                deploymentMode: 'saas'
            });

            const isValid = await tenantConfigRepository.validateTenantLicense(testTenantId);

            expect(isValid).toBe(true); // SaaS deployments don't require license validation
        });

        it('should validate tenant license for on-premise deployment', async () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);

            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'On-Premise Company',
                deploymentMode: 'on-premise',
                license: {
                    key: 'valid-license-key',
                    expiresAt: futureDate
                }
            });

            const isValid = await tenantConfigRepository.validateTenantLicense(testTenantId);

            expect(isValid).toBe(true);
        });
    });

    describe('isModuleEnabled', () => {
        it('should check if module is enabled for tenant', async () => {
            const config = await TenantConfig.create({
                tenantId: testTenantId,
                companyName: 'Test Company',
                modules: new Map([
                    ['attendance', { enabled: true, enabledAt: new Date() }],
                    ['payroll', { enabled: false }]
                ])
            });

            const attendanceEnabled = await tenantConfigRepository.isModuleEnabled(testTenantId, 'attendance');
            const payrollEnabled = await tenantConfigRepository.isModuleEnabled(testTenantId, 'payroll');
            const hrCoreEnabled = await tenantConfigRepository.isModuleEnabled(testTenantId, 'hr-core');

            expect(attendanceEnabled).toBe(true);
            expect(payrollEnabled).toBe(false);
            expect(hrCoreEnabled).toBe(true); // HR Core is always enabled
        });
    });
});