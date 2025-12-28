import mongoose from 'mongoose';
import SubscriptionRepository from '../../../repositories/platform/SubscriptionRepository.js';
import Company from '../../../platform/models/Company.js';

describe('SubscriptionRepository', () => {
    let subscriptionRepository;
    let testCompanies = [];

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        subscriptionRepository = new SubscriptionRepository();
    });

    beforeEach(async () => {
        // Clean up test data
        await Company.deleteMany({ name: /^Test Subscription/ });
        testCompanies = [];
    });

    afterAll(async () => {
        // Clean up test data
        await Company.deleteMany({ name: /^Test Subscription/ });
    });

    describe('Subscription Creation and Updates', () => {
        beforeEach(async () => {
            // Create a test company with basic subscription
            const companyData = {
                name: 'Test Subscription Company',
                slug: 'test-subscription-company',
                databaseName: 'test_subscription_company_db',
                adminEmail: 'admin@subscription.com',
                subscription: {
                    plan: 'trial',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    autoRenew: false
                }
            };

            const company = await Company.create(companyData);
            testCompanies.push(company);
        });

        it('should create a subscription successfully', async () => {
            const company = testCompanies[0];
            const subscriptionData = {
                plan: 'business',
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                autoRenew: true
            };

            const updatedCompany = await subscriptionRepository.createSubscription(
                company._id,
                subscriptionData
            );

            expect(updatedCompany).toBeDefined();
            expect(updatedCompany.subscription.plan).toBe('business');
            expect(updatedCompany.subscription.autoRenew).toBe(true);
            expect(updatedCompany.status).toBe('active');
        });

        it('should update subscription successfully', async () => {
            const company = testCompanies[0];
            
            // First create a subscription
            await subscriptionRepository.createSubscription(company._id, {
                plan: 'starter',
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            // Then update it
            const updateData = {
                plan: 'business',
                autoRenew: true
            };

            const updatedCompany = await subscriptionRepository.updateSubscription(
                company._id,
                updateData
            );

            expect(updatedCompany).toBeDefined();
            expect(updatedCompany.subscription.plan).toBe('business');
            expect(updatedCompany.subscription.autoRenew).toBe(true);
        });

        it('should renew subscription successfully', async () => {
            const company = testCompanies[0];
            const originalEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            // Create initial subscription
            await subscriptionRepository.createSubscription(company._id, {
                plan: 'starter',
                endDate: originalEndDate
            });

            // Renew subscription
            const newEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            const renewedCompany = await subscriptionRepository.renewSubscription(
                company._id,
                newEndDate
            );

            expect(renewedCompany).toBeDefined();
            expect(renewedCompany.subscription.endDate.getTime()).toBe(newEndDate.getTime());
            expect(renewedCompany.status).toBe('active');
        });

        it('should cancel subscription successfully', async () => {
            const company = testCompanies[0];
            
            // Create subscription with auto-renew
            await subscriptionRepository.createSubscription(company._id, {
                plan: 'business',
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                autoRenew: true
            });

            // Cancel subscription
            const cancelledCompany = await subscriptionRepository.cancelSubscription(company._id);

            expect(cancelledCompany).toBeDefined();
            expect(cancelledCompany.status).toBe('inactive');
            expect(cancelledCompany.subscription.autoRenew).toBe(false);
        });

        it('should suspend subscription successfully', async () => {
            const company = testCompanies[0];
            
            // Create active subscription
            await subscriptionRepository.createSubscription(company._id, {
                plan: 'business',
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            // Suspend subscription
            const suspendedCompany = await subscriptionRepository.suspendSubscription(company._id);

            expect(suspendedCompany).toBeDefined();
            expect(suspendedCompany.status).toBe('suspended');
        });

        it('should reactivate suspended subscription successfully', async () => {
            const company = testCompanies[0];
            
            // Create and suspend subscription
            await subscriptionRepository.createSubscription(company._id, {
                plan: 'business',
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            await subscriptionRepository.suspendSubscription(company._id);

            // Reactivate subscription
            const reactivatedCompany = await subscriptionRepository.reactivateSubscription(company._id);

            expect(reactivatedCompany).toBeDefined();
            expect(reactivatedCompany.status).toBe('active');
        });

        it('should not reactivate expired subscription', async () => {
            const company = testCompanies[0];
            
            // Create expired subscription
            await subscriptionRepository.createSubscription(company._id, {
                plan: 'business',
                endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
            });
            await subscriptionRepository.suspendSubscription(company._id);

            // Try to reactivate expired subscription
            const reactivatedCompany = await subscriptionRepository.reactivateSubscription(company._id);

            expect(reactivatedCompany).toBeDefined();
            expect(reactivatedCompany.status).toBe('inactive'); // Should remain inactive due to expiry
        });
    });

    describe('Plan Upgrades and Downgrades', () => {
        beforeEach(async () => {
            const companyData = {
                name: 'Test Plan Change Company',
                slug: 'test-plan-change-company',
                databaseName: 'test_plan_change_company_db',
                adminEmail: 'admin@planchange.com',
                subscription: {
                    plan: 'starter',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                status: 'active'
            };

            const company = await Company.create(companyData);
            testCompanies.push(company);
        });

        it('should upgrade subscription plan successfully', async () => {
            const company = testCompanies[0];

            const upgradedCompany = await subscriptionRepository.upgradeSubscription(
                company._id,
                'business'
            );

            expect(upgradedCompany).toBeDefined();
            expect(upgradedCompany.subscription.plan).toBe('business');
        });

        it('should downgrade subscription plan successfully', async () => {
            const company = testCompanies[0];
            
            // First upgrade to business
            await subscriptionRepository.upgradeSubscription(company._id, 'business');

            // Then downgrade back to starter
            const downgradedCompany = await subscriptionRepository.downgradeSubscription(
                company._id,
                'starter'
            );

            expect(downgradedCompany).toBeDefined();
            expect(downgradedCompany.subscription.plan).toBe('starter');
        });

        it('should schedule future upgrade', async () => {
            const company = testCompanies[0];
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

            const scheduledCompany = await subscriptionRepository.upgradeSubscription(
                company._id,
                'enterprise',
                futureDate
            );

            expect(scheduledCompany).toBeDefined();
            expect(scheduledCompany.subscription.plan).toBe('starter'); // Should remain current plan
            expect(scheduledCompany.subscription.scheduledUpgrade).toBeDefined();
            expect(scheduledCompany.subscription.scheduledUpgrade.plan).toBe('enterprise');
        });
    });

    describe('Subscription Queries', () => {
        beforeEach(async () => {
            const companies = [
                {
                    name: 'Test Subscription Query 1',
                    slug: 'test-subscription-query-1',
                    databaseName: 'test_subscription_query_1_db',
                    adminEmail: 'admin1@query.com',
                    subscription: {
                        plan: 'starter',
                        startDate: new Date(),
                        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    },
                    status: 'active'
                },
                {
                    name: 'Test Subscription Query 2',
                    slug: 'test-subscription-query-2',
                    databaseName: 'test_subscription_query_2_db',
                    adminEmail: 'admin2@query.com',
                    subscription: {
                        plan: 'business',
                        startDate: new Date(),
                        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                    },
                    status: 'active'
                },
                {
                    name: 'Test Subscription Query 3',
                    slug: 'test-subscription-query-3',
                    databaseName: 'test_subscription_query_3_db',
                    adminEmail: 'admin3@query.com',
                    subscription: {
                        plan: 'starter',
                        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // Expires in 15 days
                    },
                    status: 'active'
                }
            ];

            for (const companyData of companies) {
                const company = await Company.create(companyData);
                testCompanies.push(company);
            }
        });

        it('should get subscription by company ID', async () => {
            const company = testCompanies[0];

            const subscription = await subscriptionRepository.getSubscriptionByCompanyId(company._id);

            expect(subscription).toBeDefined();
            expect(subscription.companyId.toString()).toBe(company._id.toString());
            expect(subscription.companyName).toBe(company.name);
            expect(subscription.subscription.plan).toBe('starter');
        });

        it('should find subscriptions by plan', async () => {
            const starterSubscriptions = await subscriptionRepository.findSubscriptionsByPlan('starter');
            const businessSubscriptions = await subscriptionRepository.findSubscriptionsByPlan('business');

            expect(starterSubscriptions.length).toBeGreaterThanOrEqual(2);
            expect(businessSubscriptions.length).toBeGreaterThanOrEqual(1);

            starterSubscriptions.forEach(sub => {
                expect(sub.subscription.plan).toBe('starter');
            });
        });

        it('should find expiring subscriptions', async () => {
            const expiringSubscriptions = await subscriptionRepository.findExpiringSubscriptions(20); // 20 days

            expect(expiringSubscriptions.length).toBeGreaterThanOrEqual(1);
            expiringSubscriptions.forEach(sub => {
                expect(sub.daysUntilExpiration).toBeLessThanOrEqual(20);
                expect(sub.daysUntilExpiration).toBeGreaterThan(0);
            });
        });

        it('should return null for non-existent company subscription', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const subscription = await subscriptionRepository.getSubscriptionByCompanyId(nonExistentId);

            expect(subscription).toBeNull();
        });
    });

    describe('Analytics', () => {
        beforeEach(async () => {
            const companies = [
                {
                    name: 'Test Analytics Sub 1',
                    slug: 'test-analytics-sub-1',
                    databaseName: 'test_analytics_sub_1_db',
                    adminEmail: 'admin1@analytics.com',
                    subscription: { plan: 'starter', endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                    status: 'active'
                },
                {
                    name: 'Test Analytics Sub 2',
                    slug: 'test-analytics-sub-2',
                    databaseName: 'test_analytics_sub_2_db',
                    adminEmail: 'admin2@analytics.com',
                    subscription: { plan: 'business', endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
                    status: 'active'
                },
                {
                    name: 'Test Analytics Sub 3',
                    slug: 'test-analytics-sub-3',
                    databaseName: 'test_analytics_sub_3_db',
                    adminEmail: 'admin3@analytics.com',
                    subscription: { plan: 'starter', endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
                    status: 'inactive'
                }
            ];

            for (const companyData of companies) {
                const company = await Company.create(companyData);
                testCompanies.push(company);
            }
        });

        it('should get subscription analytics', async () => {
            const analytics = await subscriptionRepository.getSubscriptionAnalytics();

            expect(analytics).toBeDefined();
            expect(analytics.byPlan).toBeInstanceOf(Array);
            expect(analytics.totals).toBeDefined();
            expect(analytics.totals.totalSubscriptions).toBeGreaterThanOrEqual(3);

            analytics.byPlan.forEach(planData => {
                expect(planData.plan).toBeDefined();
                expect(planData.statuses).toBeInstanceOf(Array);
                expect(planData.totalSubscriptions).toBeGreaterThanOrEqual(0);
            });
        });

        it('should get revenue analytics', async () => {
            const revenueAnalytics = await subscriptionRepository.getRevenueAnalytics();

            expect(revenueAnalytics).toBeInstanceOf(Array);
            // Note: This test might return empty results if Plan collection is not populated
            // In a real scenario, you'd have Plan documents with pricing information
        });

        it('should filter analytics by date range', async () => {
            const dateRange = {
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                endDate: new Date()
            };

            const analytics = await subscriptionRepository.getSubscriptionAnalytics(dateRange);

            expect(analytics).toBeDefined();
            expect(analytics.byPlan).toBeInstanceOf(Array);
            expect(analytics.totals).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent company for subscription operations', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const createResult = await subscriptionRepository.createSubscription(nonExistentId, {
                plan: 'starter',
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            expect(createResult).toBeNull();

            const updateResult = await subscriptionRepository.updateSubscription(nonExistentId, {
                plan: 'business'
            });
            expect(updateResult).toBeNull();

            const renewResult = await subscriptionRepository.renewSubscription(
                nonExistentId,
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            );
            expect(renewResult).toBeNull();
        });

        it('should handle invalid ObjectId gracefully', async () => {
            const subscription = await subscriptionRepository.getSubscriptionByCompanyId('invalid-id');
            expect(subscription).toBeNull();
        });
    });
});