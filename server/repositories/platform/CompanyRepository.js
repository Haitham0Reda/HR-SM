import BaseRepository from '../BaseRepository.js';
import Company from '../../platform/models/Company.js';

/**
 * Company Repository
 * Handles database operations for Company model with subscription queries
 */
class CompanyRepository extends BaseRepository {
    constructor() {
        super(Company);
    }

    /**
     * Find companies by subscription plan
     * @param {string} plan - Subscription plan (starter, business, enterprise, trial)
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of companies
     */
    async findBySubscriptionPlan(plan, options = {}) {
        try {
            const filter = { 'subscription.plan': plan };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findBySubscriptionPlan');
        }
    }

    /**
     * Find companies with active subscriptions
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of companies with active subscriptions
     */
    async findActiveSubscriptions(options = {}) {
        try {
            const now = new Date();
            const filter = {
                status: 'active',
                'subscription.endDate': { $gte: now }
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findActiveSubscriptions');
        }
    }

    /**
     * Find companies with expired subscriptions
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of companies with expired subscriptions
     */
    async findExpiredSubscriptions(options = {}) {
        try {
            const now = new Date();
            const filter = {
                'subscription.endDate': { $lt: now },
                status: { $in: ['active', 'trial'] }
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findExpiredSubscriptions');
        }
    }

    /**
     * Find companies with subscriptions expiring soon
     * @param {number} [days=30] - Number of days to look ahead
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of companies with expiring subscriptions
     */
    async findExpiringSubscriptions(days = 30, options = {}) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);

            const filter = {
                status: 'active',
                'subscription.endDate': {
                    $gte: now,
                    $lte: futureDate
                }
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findExpiringSubscriptions');
        }
    }

    /**
     * Find companies by module enablement
     * @param {string} moduleKey - Module key to check
     * @param {boolean} [enabledOnly=true] - Only return companies with module enabled
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of companies
     */
    async findByModule(moduleKey, enabledOnly = true, options = {}) {
        try {
            const filter = {};
            if (enabledOnly) {
                filter[`modules.${moduleKey}.enabled`] = true;
            } else {
                filter[`modules.${moduleKey}`] = { $exists: true };
            }
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByModule');
        }
    }

    /**
     * Find company by slug
     * @param {string} slug - Company slug
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} Company or null
     */
    async findBySlug(slug, options = {}) {
        try {
            const filter = { slug: slug.toLowerCase() };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findBySlug');
        }
    }

    /**
     * Find company by database name
     * @param {string} databaseName - Database name
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} Company or null
     */
    async findByDatabaseName(databaseName, options = {}) {
        try {
            const filter = { databaseName };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByDatabaseName');
        }
    }

    /**
     * Find company by license key
     * @param {string} licenseKey - License key
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} Company or null
     */
    async findByLicenseKey(licenseKey, options = {}) {
        try {
            const filter = { licenseKey };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByLicenseKey');
        }
    }

    /**
     * Update company usage statistics
     * @param {string} id - Company ID
     * @param {Object} usageData - Usage data to update
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated company or null
     */
    async updateUsage(id, usageData, options = {}) {
        try {
            const updateData = {
                'usage.employees': usageData.employees,
                'usage.storage': usageData.storage,
                'usage.apiCalls': usageData.apiCalls,
                'usage.lastUpdated': new Date()
            };

            // Remove undefined values
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });

            return await this.update(id, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updateUsage');
        }
    }

    /**
     * Get subscription analytics
     * @param {Object} [filter] - Additional filter criteria
     * @returns {Promise<Object>} Analytics data
     */
    async getSubscriptionAnalytics(filter = {}) {
        try {
            const pipeline = [
                { $match: filter },
                {
                    $group: {
                        _id: '$subscription.plan',
                        count: { $sum: 1 },
                        activeCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$status', 'active'] },
                                            { $gte: ['$subscription.endDate', new Date()] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        expiredCount: {
                            $sum: {
                                $cond: [
                                    { $lt: ['$subscription.endDate', new Date()] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        plan: '$_id',
                        totalCompanies: '$count',
                        activeSubscriptions: '$activeCount',
                        expiredSubscriptions: '$expiredCount',
                        _id: 0
                    }
                }
            ];

            const results = await this.model.aggregate(pipeline);
            
            // Calculate totals
            const totals = results.reduce((acc, item) => {
                acc.totalCompanies += item.totalCompanies;
                acc.activeSubscriptions += item.activeSubscriptions;
                acc.expiredSubscriptions += item.expiredSubscriptions;
                return acc;
            }, { totalCompanies: 0, activeSubscriptions: 0, expiredSubscriptions: 0 });

            return {
                byPlan: results,
                totals
            };
        } catch (error) {
            throw this._handleError(error, 'getSubscriptionAnalytics');
        }
    }

    /**
     * Get module usage analytics
     * @param {Object} [filter] - Additional filter criteria
     * @returns {Promise<Object>} Module usage analytics
     */
    async getModuleUsageAnalytics(filter = {}) {
        try {
            const pipeline = [
                { $match: filter },
                {
                    $project: {
                        modules: { $objectToArray: '$modules' },
                        status: 1
                    }
                },
                { $unwind: '$modules' },
                {
                    $group: {
                        _id: '$modules.k',
                        totalCompanies: { $sum: 1 },
                        enabledCount: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$modules.v.enabled', true] },
                                    1,
                                    0
                                ]
                            }
                        },
                        tierBreakdown: {
                            $push: {
                                $cond: [
                                    { $eq: ['$modules.v.enabled', true] },
                                    '$modules.v.tier',
                                    null
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        moduleKey: '$_id',
                        totalCompanies: 1,
                        enabledCount: 1,
                        disabledCount: { $subtract: ['$totalCompanies', '$enabledCount'] },
                        tierBreakdown: {
                            $reduce: {
                                input: '$tierBreakdown',
                                initialValue: { starter: 0, business: 0, enterprise: 0 },
                                in: {
                                    $cond: [
                                        { $ne: ['$$this', null] },
                                        {
                                            starter: {
                                                $cond: [
                                                    { $eq: ['$$this', 'starter'] },
                                                    { $add: ['$$value.starter', 1] },
                                                    '$$value.starter'
                                                ]
                                            },
                                            business: {
                                                $cond: [
                                                    { $eq: ['$$this', 'business'] },
                                                    { $add: ['$$value.business', 1] },
                                                    '$$value.business'
                                                ]
                                            },
                                            enterprise: {
                                                $cond: [
                                                    { $eq: ['$$this', 'enterprise'] },
                                                    { $add: ['$$value.enterprise', 1] },
                                                    '$$value.enterprise'
                                                ]
                                            }
                                        },
                                        '$$value'
                                    ]
                                }
                            }
                        },
                        _id: 0
                    }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getModuleUsageAnalytics');
        }
    }

    /**
     * Get companies with high usage
     * @param {Object} thresholds - Usage thresholds
     * @param {number} [thresholds.employees] - Employee count threshold
     * @param {number} [thresholds.storage] - Storage threshold in bytes
     * @param {number} [thresholds.apiCalls] - API calls threshold
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of companies with high usage
     */
    async findHighUsageCompanies(thresholds = {}, options = {}) {
        try {
            const filter = {};
            
            if (thresholds.employees) {
                filter['usage.employees'] = { $gte: thresholds.employees };
            }
            
            if (thresholds.storage) {
                filter['usage.storage'] = { $gte: thresholds.storage };
            }
            
            if (thresholds.apiCalls) {
                filter['usage.apiCalls'] = { $gte: thresholds.apiCalls };
            }

            return await this.find(filter, {
                ...options,
                sort: { 'usage.lastUpdated': -1, ...options.sort }
            });
        } catch (error) {
            throw this._handleError(error, 'findHighUsageCompanies');
        }
    }
}

export default CompanyRepository;