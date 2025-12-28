import BaseRepository from '../BaseRepository.js';
import Company from '../../platform/models/Company.js';
import Plan from '../../platform/subscriptions/models/Plan.js';

/**
 * Subscription Repository
 * Handles subscription-related operations on Company model
 * Note: Subscriptions are embedded in Company documents
 */
class SubscriptionRepository extends BaseRepository {
    constructor() {
        super(Company);
    }

    /**
     * Create a new subscription for a company
     * @param {string} companyId - Company ID
     * @param {Object} subscriptionData - Subscription data
     * @param {string} subscriptionData.plan - Plan name
     * @param {Date} subscriptionData.startDate - Start date
     * @param {Date} subscriptionData.endDate - End date
     * @param {boolean} [subscriptionData.autoRenew=false] - Auto-renewal flag
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async createSubscription(companyId, subscriptionData, options = {}) {
        try {
            const updateData = {
                subscription: {
                    plan: subscriptionData.plan,
                    startDate: subscriptionData.startDate || new Date(),
                    endDate: subscriptionData.endDate,
                    autoRenew: subscriptionData.autoRenew || false
                },
                status: 'active'
            };

            return await this.update(companyId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'createSubscription');
        }
    }

    /**
     * Update subscription for a company
     * @param {string} companyId - Company ID
     * @param {Object} subscriptionData - Updated subscription data
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async updateSubscription(companyId, subscriptionData, options = {}) {
        try {
            const updateData = {};
            
            if (subscriptionData.plan) {
                updateData['subscription.plan'] = subscriptionData.plan;
            }
            
            if (subscriptionData.startDate) {
                updateData['subscription.startDate'] = subscriptionData.startDate;
            }
            
            if (subscriptionData.endDate) {
                updateData['subscription.endDate'] = subscriptionData.endDate;
            }
            
            if (subscriptionData.autoRenew !== undefined) {
                updateData['subscription.autoRenew'] = subscriptionData.autoRenew;
            }

            return await this.update(companyId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updateSubscription');
        }
    }

    /**
     * Renew subscription for a company
     * @param {string} companyId - Company ID
     * @param {Date} newEndDate - New end date
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async renewSubscription(companyId, newEndDate, options = {}) {
        try {
            const updateData = {
                'subscription.endDate': newEndDate,
                status: 'active'
            };

            return await this.update(companyId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'renewSubscription');
        }
    }

    /**
     * Cancel subscription for a company
     * @param {string} companyId - Company ID
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async cancelSubscription(companyId, options = {}) {
        try {
            const updateData = {
                status: 'inactive',
                'subscription.autoRenew': false
            };

            return await this.update(companyId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'cancelSubscription');
        }
    }

    /**
     * Suspend subscription for a company
     * @param {string} companyId - Company ID
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async suspendSubscription(companyId, options = {}) {
        try {
            const updateData = {
                status: 'suspended'
            };

            return await this.update(companyId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'suspendSubscription');
        }
    }

    /**
     * Reactivate suspended subscription
     * @param {string} companyId - Company ID
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async reactivateSubscription(companyId, options = {}) {
        try {
            const company = await this.findById(companyId);
            if (!company) {
                return null;
            }

            // Check if subscription is still valid
            const now = new Date();
            const status = now <= company.subscription.endDate ? 'active' : 'inactive';

            const updateData = { status };
            return await this.update(companyId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'reactivateSubscription');
        }
    }

    /**
     * Upgrade subscription plan
     * @param {string} companyId - Company ID
     * @param {string} newPlan - New plan name
     * @param {Date} [effectiveDate] - When the upgrade takes effect
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async upgradeSubscription(companyId, newPlan, effectiveDate = new Date(), options = {}) {
        try {
            const updateData = {};

            // If effective date is in the future, schedule the upgrade
            if (effectiveDate > new Date()) {
                // For future upgrades, store this in scheduledUpgrade field
                updateData['subscription.scheduledUpgrade'] = {
                    plan: newPlan,
                    effectiveDate: effectiveDate
                };
                return await this.update(companyId, updateData, options);
            } else {
                // Apply the upgrade immediately
                updateData['subscription.plan'] = newPlan;
                return await this.update(companyId, updateData, options);
            }
        } catch (error) {
            throw this._handleError(error, 'upgradeSubscription');
        }
    }

    /**
     * Downgrade subscription plan
     * @param {string} companyId - Company ID
     * @param {string} newPlan - New plan name
     * @param {Date} [effectiveDate] - When the downgrade takes effect
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async downgradeSubscription(companyId, newPlan, effectiveDate = new Date(), options = {}) {
        try {
            const updateData = {
                'subscription.plan': newPlan
            };

            // Apply downgrade immediately or schedule for later
            if (effectiveDate <= new Date()) {
                return await this.update(companyId, updateData, options);
            } else {
                updateData['subscription.scheduledDowngrade'] = {
                    plan: newPlan,
                    effectiveDate: effectiveDate
                };
                return await this.update(companyId, updateData, options);
            }
        } catch (error) {
            throw this._handleError(error, 'downgradeSubscription');
        }
    }

    /**
     * Get subscription by company ID
     * @param {string} companyId - Company ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} Subscription data or null
     */
    async getSubscriptionByCompanyId(companyId, options = {}) {
        try {
            const company = await this.findById(companyId, {
                ...options,
                select: 'name slug subscription status createdAt updatedAt'
            });

            if (!company) {
                return null;
            }

            return {
                companyId: company._id,
                companyName: company.name,
                companySlug: company.slug,
                subscription: company.subscription,
                status: company.status,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt
            };
        } catch (error) {
            throw this._handleError(error, 'getSubscriptionByCompanyId');
        }
    }

    /**
     * Find subscriptions by plan
     * @param {string} plan - Plan name
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of subscriptions
     */
    async findSubscriptionsByPlan(plan, options = {}) {
        try {
            const companies = await this.find(
                { 'subscription.plan': plan },
                {
                    ...options,
                    select: 'name slug subscription status createdAt updatedAt'
                }
            );

            return companies.map(company => ({
                companyId: company._id,
                companyName: company.name,
                companySlug: company.slug,
                subscription: company.subscription,
                status: company.status,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt
            }));
        } catch (error) {
            throw this._handleError(error, 'findSubscriptionsByPlan');
        }
    }

    /**
     * Find expiring subscriptions
     * @param {number} [days=30] - Days until expiration
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of expiring subscriptions
     */
    async findExpiringSubscriptions(days = 30, options = {}) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);

            const companies = await this.find(
                {
                    status: 'active',
                    'subscription.endDate': {
                        $gte: now,
                        $lte: futureDate
                    }
                },
                {
                    ...options,
                    select: 'name slug adminEmail subscription status',
                    sort: { 'subscription.endDate': 1 }
                }
            );

            return companies.map(company => ({
                companyId: company._id,
                companyName: company.name,
                companySlug: company.slug,
                adminEmail: company.adminEmail,
                subscription: company.subscription,
                status: company.status,
                daysUntilExpiration: Math.ceil((company.subscription.endDate - now) / (1000 * 60 * 60 * 24))
            }));
        } catch (error) {
            throw this._handleError(error, 'findExpiringSubscriptions');
        }
    }

    /**
     * Get subscription analytics
     * @param {Object} [dateRange] - Date range filter
     * @param {Date} [dateRange.startDate] - Start date
     * @param {Date} [dateRange.endDate] - End date
     * @returns {Promise<Object>} Subscription analytics
     */
    async getSubscriptionAnalytics(dateRange = {}) {
        try {
            const matchStage = {};
            
            if (dateRange.startDate || dateRange.endDate) {
                matchStage.createdAt = {};
                if (dateRange.startDate) {
                    matchStage.createdAt.$gte = dateRange.startDate;
                }
                if (dateRange.endDate) {
                    matchStage.createdAt.$lte = dateRange.endDate;
                }
            }

            const pipeline = [
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            plan: '$subscription.plan',
                            status: '$status'
                        },
                        count: { $sum: 1 },
                        totalRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', 'active'] },
                                    1, // You might want to calculate actual revenue based on plan pricing
                                    0
                                ]
                            }
                        },
                        avgSubscriptionLength: {
                            $avg: {
                                $divide: [
                                    { $subtract: ['$subscription.endDate', '$subscription.startDate'] },
                                    1000 * 60 * 60 * 24 // Convert to days
                                ]
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$_id.plan',
                        statuses: {
                            $push: {
                                status: '$_id.status',
                                count: '$count',
                                totalRevenue: '$totalRevenue',
                                avgSubscriptionLength: '$avgSubscriptionLength'
                            }
                        },
                        totalSubscriptions: { $sum: '$count' }
                    }
                },
                {
                    $project: {
                        plan: '$_id',
                        statuses: 1,
                        totalSubscriptions: 1,
                        _id: 0
                    }
                }
            ];

            const results = await this.model.aggregate(pipeline);

            // Calculate overall totals
            const totals = results.reduce((acc, planData) => {
                acc.totalSubscriptions += planData.totalSubscriptions;
                planData.statuses.forEach(statusData => {
                    if (!acc.byStatus[statusData.status]) {
                        acc.byStatus[statusData.status] = 0;
                    }
                    acc.byStatus[statusData.status] += statusData.count;
                });
                return acc;
            }, { totalSubscriptions: 0, byStatus: {} });

            return {
                byPlan: results,
                totals
            };
        } catch (error) {
            throw this._handleError(error, 'getSubscriptionAnalytics');
        }
    }

    /**
     * Get revenue analytics
     * @param {Object} [dateRange] - Date range filter
     * @returns {Promise<Object>} Revenue analytics
     */
    async getRevenueAnalytics(dateRange = {}) {
        try {
            // This is a simplified version - in a real system, you'd want to
            // integrate with actual billing/payment data
            const pipeline = [
                {
                    $lookup: {
                        from: 'plans',
                        localField: 'subscription.plan',
                        foreignField: 'name',
                        as: 'planDetails'
                    }
                },
                { $unwind: { path: '$planDetails', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        name: 1,
                        subscription: 1,
                        status: 1,
                        monthlyRevenue: {
                            $cond: [
                                { $eq: ['$status', 'active'] },
                                '$planDetails.pricing.monthly',
                                0
                            ]
                        },
                        yearlyRevenue: {
                            $cond: [
                                { $eq: ['$status', 'active'] },
                                '$planDetails.pricing.yearly',
                                0
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: '$subscription.plan',
                        activeSubscriptions: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                            }
                        },
                        monthlyRevenue: { $sum: '$monthlyRevenue' },
                        yearlyRevenue: { $sum: '$yearlyRevenue' }
                    }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getRevenueAnalytics');
        }
    }
}

export default SubscriptionRepository;