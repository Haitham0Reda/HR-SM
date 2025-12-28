import mongoose from 'mongoose';
import CompanyRepository from '../../../repositories/platform/CompanyRepository.js';
import Company from '../../../platform/models/Company.js';

describe('CompanyRepository', () => {
    let companyRepository;
    let testCompanies = [];

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        companyRepository = new CompanyRepository();
    });

    beforeEach(async () => {
        // Clean up test data
        await Company.deleteMany({ name: /^Test Company/ });
        testCompanies = [];
    });

    afterAll(async () => {
        // Clean up test data
        await Company.deleteMany({ name: /^Test Company/ });
    });

    describe('Basic CRUD Operations', () => {
        it('should create a company successfully', async () => {
            const companyData = {
                name: 'Test Company 1',
                slug: 'test-company-1',
                databaseName: 'test_company_1_db',
                adminEmail: 'admin@testcompany1.com',
                subscription: {
                    plan: 'starter',
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                }
            };

            const company = await companyRepository.create(companyData);
            testCompanies.push(company);

            expect(company).toBeDefined();
            expect(company.name).toBe(companyData.name);
            expect(company.slug).toBe(companyData.slug);
            expect(company.adminEmail).toBe(companyData.adminEmail);
            expect(company.subscription.plan).toBe('starter');
        });

        it('should find company by ID', async () => {
            const companyData = {
                name: 'Test Company 2',
                slug: 'test-company-2',
                databaseName: 'test_company_2_db',
                adminEmail: 'admin@testcompany2.com',
                subscription: {
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            };

            const createdCompany = await companyRepository.create(companyData);
            testCompanies.push(createdCompany);

            const foundCompany = await companyRepository.findById(createdCompany._id);

            expect(foundCompany).toBeDefined();
            expect(foundCompany._id.toString()).toBe(createdCompany._id.toString());
            expect(foundCompany.name).toBe(companyData.name);
        });

        it('should update company successfully', async () => {
            const companyData = {
                name: 'Test Company 3',
                slug: 'test-company-3',
                databaseName: 'test_company_3_db',
                adminEmail: 'admin@testcompany3.com',
                subscription: {
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            };

            const createdCompany = await companyRepository.create(companyData);
            testCompanies.push(createdCompany);

            const updateData = { name: 'Updated Test Company 3' };
            const updatedCompany = await companyRepository.update(createdCompany._id, updateData);

            expect(updatedCompany).toBeDefined();
            expect(updatedCompany.name).toBe('Updated Test Company 3');
        });

        it('should delete company successfully', async () => {
            const companyData = {
                name: 'Test Company 4',
                slug: 'test-company-4',
                databaseName: 'test_company_4_db',
                adminEmail: 'admin@testcompany4.com',
                subscription: {
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            };

            const createdCompany = await companyRepository.create(companyData);
            const deleted = await companyRepository.delete(createdCompany._id);

            expect(deleted).toBe(true);

            const foundCompany = await companyRepository.findById(createdCompany._id);
            expect(foundCompany).toBeNull();
        });
    });

    describe('Subscription Queries', () => {
        beforeEach(async () => {
            // Create test companies with different subscription plans
            const companies = [
                {
                    name: 'Test Company Starter',
                    slug: 'test-company-starter',
                    databaseName: 'test_company_starter_db',
                    adminEmail: 'admin@starter.com',
                    subscription: {
                        plan: 'starter',
                        startDate: new Date(),
                        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    },
                    status: 'active'
                },
                {
                    name: 'Test Company Business',
                    slug: 'test-company-business',
                    databaseName: 'test_company_business_db',
                    adminEmail: 'admin@business.com',
                    subscription: {
                        plan: 'business',
                        startDate: new Date(),
                        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                    },
                    status: 'active'
                },
                {
                    name: 'Test Company Expired',
                    slug: 'test-company-expired',
                    databaseName: 'test_company_expired_db',
                    adminEmail: 'admin@expired.com',
                    subscription: {
                        plan: 'starter',
                        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // Expired yesterday
                    },
                    status: 'active'
                }
            ];

            for (const companyData of companies) {
                const company = await companyRepository.create(companyData);
                testCompanies.push(company);
            }
        });

        it('should find companies by subscription plan', async () => {
            const starterCompanies = await companyRepository.findBySubscriptionPlan('starter');
            const businessCompanies = await companyRepository.findBySubscriptionPlan('business');

            expect(starterCompanies.length).toBeGreaterThanOrEqual(2);
            expect(businessCompanies.length).toBeGreaterThanOrEqual(1);
            
            starterCompanies.forEach(company => {
                expect(company.subscription.plan).toBe('starter');
            });
            
            businessCompanies.forEach(company => {
                expect(company.subscription.plan).toBe('business');
            });
        });

        it('should find active subscriptions', async () => {
            const activeSubscriptions = await companyRepository.findActiveSubscriptions();

            expect(activeSubscriptions.length).toBeGreaterThanOrEqual(2);
            activeSubscriptions.forEach(company => {
                expect(company.status).toBe('active');
                expect(company.subscription.endDate).toBeInstanceOf(Date);
                expect(company.subscription.endDate.getTime()).toBeGreaterThan(Date.now());
            });
        });

        it('should find expired subscriptions', async () => {
            const expiredSubscriptions = await companyRepository.findExpiredSubscriptions();

            expect(expiredSubscriptions.length).toBeGreaterThanOrEqual(1);
            expiredSubscriptions.forEach(company => {
                expect(company.subscription.endDate.getTime()).toBeLessThan(Date.now());
            });
        });

        it('should find expiring subscriptions', async () => {
            const expiringSubscriptions = await companyRepository.findExpiringSubscriptions(45); // 45 days

            expect(expiringSubscriptions.length).toBeGreaterThanOrEqual(1);
            expiringSubscriptions.forEach(company => {
                const daysUntilExpiration = Math.ceil((company.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24));
                expect(daysUntilExpiration).toBeLessThanOrEqual(45);
                expect(daysUntilExpiration).toBeGreaterThan(0);
            });
        });
    });

    describe('Company Lookup Methods', () => {
        beforeEach(async () => {
            const companyData = {
                name: 'Test Company Lookup',
                slug: 'test-company-lookup',
                databaseName: 'test_company_lookup_db',
                adminEmail: 'admin@lookup.com',
                licenseKey: 'test-license-key-123',
                subscription: {
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            };

            const company = await companyRepository.create(companyData);
            testCompanies.push(company);
        });

        it('should find company by slug', async () => {
            const company = await companyRepository.findBySlug('test-company-lookup');

            expect(company).toBeDefined();
            expect(company.slug).toBe('test-company-lookup');
        });

        it('should find company by database name', async () => {
            const company = await companyRepository.findByDatabaseName('test_company_lookup_db');

            expect(company).toBeDefined();
            expect(company.databaseName).toBe('test_company_lookup_db');
        });

        it('should find company by license key', async () => {
            const company = await companyRepository.findByLicenseKey('test-license-key-123');

            expect(company).toBeDefined();
            expect(company.licenseKey).toBe('test-license-key-123');
        });

        it('should return null for non-existent slug', async () => {
            const company = await companyRepository.findBySlug('non-existent-slug');
            expect(company).toBeNull();
        });
    });

    describe('Module Operations', () => {
        beforeEach(async () => {
            const companyData = {
                name: 'Test Company Modules',
                slug: 'test-company-modules',
                databaseName: 'test_company_modules_db',
                adminEmail: 'admin@modules.com',
                subscription: {
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                },
                modules: new Map([
                    ['attendance', {
                        enabled: true,
                        tier: 'business',
                        limits: { employees: 100 },
                        enabledAt: new Date()
                    }],
                    ['payroll', {
                        enabled: false,
                        tier: 'starter',
                        limits: { employees: 50 },
                        enabledAt: null
                    }]
                ])
            };

            const company = await companyRepository.create(companyData);
            testCompanies.push(company);
        });

        it('should find companies by enabled module', async () => {
            const companiesWithAttendance = await companyRepository.findByModule('attendance', true);
            const companiesWithPayroll = await companyRepository.findByModule('payroll', true);

            expect(companiesWithAttendance.length).toBeGreaterThanOrEqual(1);
            expect(companiesWithPayroll.length).toBe(0);
        });

        it('should find companies with any module configuration', async () => {
            const companiesWithPayrollConfig = await companyRepository.findByModule('payroll', false);

            expect(companiesWithPayrollConfig.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Usage Operations', () => {
        beforeEach(async () => {
            const companyData = {
                name: 'Test Company Usage',
                slug: 'test-company-usage',
                databaseName: 'test_company_usage_db',
                adminEmail: 'admin@usage.com',
                subscription: {
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                },
                usage: {
                    employees: 25,
                    storage: 1024000,
                    apiCalls: 5000
                }
            };

            const company = await companyRepository.create(companyData);
            testCompanies.push(company);
        });

        it('should update usage statistics', async () => {
            const company = testCompanies[testCompanies.length - 1];
            const newUsage = {
                employees: 30,
                storage: 2048000,
                apiCalls: 7500
            };

            const updatedCompany = await companyRepository.updateUsage(company._id, newUsage);

            expect(updatedCompany).toBeDefined();
            expect(updatedCompany.usage.employees).toBe(30);
            expect(updatedCompany.usage.storage).toBe(2048000);
            expect(updatedCompany.usage.apiCalls).toBe(7500);
            expect(updatedCompany.usage.lastUpdated).toBeInstanceOf(Date);
        });

        it('should find high usage companies', async () => {
            const thresholds = {
                employees: 20,
                storage: 500000,
                apiCalls: 3000
            };

            const highUsageCompanies = await companyRepository.findHighUsageCompanies(thresholds);

            expect(highUsageCompanies.length).toBeGreaterThanOrEqual(1);
            highUsageCompanies.forEach(company => {
                const usage = company.usage;
                const meetsThreshold = 
                    usage.employees >= thresholds.employees ||
                    usage.storage >= thresholds.storage ||
                    usage.apiCalls >= thresholds.apiCalls;
                expect(meetsThreshold).toBe(true);
            });
        });
    });

    describe('Analytics', () => {
        beforeEach(async () => {
            // Create companies with different plans and statuses for analytics
            const companies = [
                {
                    name: 'Test Analytics Starter 1',
                    slug: 'test-analytics-starter-1',
                    databaseName: 'test_analytics_starter_1_db',
                    adminEmail: 'admin1@analytics.com',
                    subscription: { plan: 'starter', endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                    status: 'active'
                },
                {
                    name: 'Test Analytics Starter 2',
                    slug: 'test-analytics-starter-2',
                    databaseName: 'test_analytics_starter_2_db',
                    adminEmail: 'admin2@analytics.com',
                    subscription: { plan: 'starter', endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
                    status: 'active'
                },
                {
                    name: 'Test Analytics Business',
                    slug: 'test-analytics-business',
                    databaseName: 'test_analytics_business_db',
                    adminEmail: 'admin3@analytics.com',
                    subscription: { plan: 'business', endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
                    status: 'active'
                }
            ];

            for (const companyData of companies) {
                const company = await companyRepository.create(companyData);
                testCompanies.push(company);
            }
        });

        it('should get subscription analytics', async () => {
            const analytics = await companyRepository.getSubscriptionAnalytics();

            expect(analytics).toBeDefined();
            expect(analytics.byPlan).toBeInstanceOf(Array);
            expect(analytics.totals).toBeDefined();
            expect(analytics.totals.totalCompanies).toBeGreaterThanOrEqual(3);
            expect(analytics.totals.activeSubscriptions).toBeGreaterThanOrEqual(2);
            expect(analytics.totals.expiredSubscriptions).toBeGreaterThanOrEqual(1);
        });

        it('should get module usage analytics', async () => {
            // First add some modules to test companies
            const company = testCompanies[0];
            company.modules = new Map([
                ['attendance', { enabled: true, tier: 'starter' }],
                ['payroll', { enabled: false, tier: 'business' }]
            ]);
            await company.save();

            const analytics = await companyRepository.getModuleUsageAnalytics();

            expect(analytics).toBeInstanceOf(Array);
            if (analytics.length > 0) {
                analytics.forEach(moduleData => {
                    expect(moduleData.moduleKey).toBeDefined();
                    expect(moduleData.totalCompanies).toBeGreaterThanOrEqual(0);
                    expect(moduleData.enabledCount).toBeGreaterThanOrEqual(0);
                    expect(moduleData.disabledCount).toBeGreaterThanOrEqual(0);
                });
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid ObjectId gracefully', async () => {
            const company = await companyRepository.findById('invalid-id');
            expect(company).toBeNull();
        });

        it('should handle non-existent company update', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const updatedCompany = await companyRepository.update(nonExistentId, { name: 'Updated' });
            expect(updatedCompany).toBeNull();
        });

        it('should handle non-existent company deletion', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const deleted = await companyRepository.delete(nonExistentId);
            expect(deleted).toBe(false);
        });
    });
});