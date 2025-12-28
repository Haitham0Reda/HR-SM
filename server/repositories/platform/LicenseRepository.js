import BaseRepository from '../BaseRepository.js';
import License from '../../platform/system/models/license.model.js';

/**
 * License Repository
 * Handles database operations for License model with integration to license server
 */
class LicenseRepository extends BaseRepository {
    constructor() {
        super(License);
    }

    /**
     * Find license by tenant ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} License or null
     */
    async findByTenantId(tenantId, options = {}) {
        try {
            const filter = { tenantId };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByTenantId');
        }
    }

    /**
     * Find license by subscription ID
     * @param {string} subscriptionId - Subscription ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} License or null
     */
    async findBySubscriptionId(subscriptionId, options = {}) {
        try {
            const filter = { subscriptionId };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findBySubscriptionId');
        }
    }

    /**
     * Find licenses by status
     * @param {string} status - License status (active, trial, expired, suspended, cancelled)
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of licenses
     */
    async findByStatus(status, options = {}) {
        try {
            const filter = { status };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    /**
     * Find active licenses
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of active licenses
     */
    async findActiveLicenses(options = {}) {
        try {
            const filter = { status: 'active' };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findActiveLicenses');
        }
    }

    /**
     * Find trial licenses
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of trial licenses
     */
    async findTrialLicenses(options = {}) {
        try {
            const filter = { status: 'trial' };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findTrialLicenses');
        }
    }

    /**
     * Find expired licenses
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of expired licenses
     */
    async findExpiredLicenses(options = {}) {
        try {
            const now = new Date();
            const filter = {
                $or: [
                    { status: 'expired' },
                    {
                        status: { $in: ['active', 'trial'] },
                        'modules.expiresAt': { $lt: now }
                    }
                ]
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findExpiredLicenses');
        }
    }

    /**
     * Find expiring licenses
     * @param {number} [daysThreshold=30] - Days until expiration threshold
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of expiring licenses
     */
    async findExpiringLicenses(daysThreshold = 30, options = {}) {
        try {
            const now = new Date();
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

            const filter = {
                status: 'active',
                'modules.expiresAt': {
                    $gte: now,
                    $lte: thresholdDate
                }
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findExpiringLicenses');
        }
    }

    /**
     * Find licenses by module
     * @param {string} moduleKey - Module key
     * @param {boolean} [enabledOnly=true] - Only return licenses with module enabled
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of licenses
     */
    async findByModule(moduleKey, enabledOnly = true, options = {}) {
        try {
            const filter = { 'modules.key': moduleKey };
            if (enabledOnly) {
                filter['modules.enabled'] = true;
            }
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByModule');
        }
    }

    /**
     * Find licenses by billing cycle
     * @param {string} billingCycle - Billing cycle (monthly, annual)
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of licenses
     */
    async findByBillingCycle(billingCycle, options = {}) {
        try {
            const filter = { billingCycle };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByBillingCycle');
        }
    }

    /**
     * Create license with modules
     * @param {Object} licenseData - License data
     * @param {Array} modules - Array of module configurations
     * @param {Object} [options] - Create options
     * @returns {Promise<Object>} Created license
     */
    async createLicenseWithModules(licenseData, modules = [], options = {}) {
        try {
            const license = await this.create({
                ...licenseData,
                modules: modules.map(module => ({
                    key: module.key,
                    enabled: module.enabled || false,
                    tier: module.tier,
                    limits: module.limits || {},
                    activatedAt: module.enabled ? new Date() : null,
                    expiresAt: module.expiresAt || null
                }))
            }, options);

            return license;
        } catch (error) {
            throw this._handleError(error, 'createLicenseWithModules');
        }
    }

    /**
     * Activate module for license
     * @param {string} licenseId - License ID
     * @param {string} moduleKey - Module key
     * @param {string} tier - Pricing tier
     * @param {Object} [limits] - Module limits
     * @param {Date} [expiresAt] - Expiration date
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated license or null
     */
    async activateModule(licenseId, moduleKey, tier, limits = {}, expiresAt = null, options = {}) {
        try {
            const license = await this.findById(licenseId);
            if (!license) {
                return null;
            }

            await license.activateModule(moduleKey, tier, limits, expiresAt);
            return license;
        } catch (error) {
            throw this._handleError(error, 'activateModule');
        }
    }

    /**
     * Deactivate module for license
     * @param {string} licenseId - License ID
     * @param {string} moduleKey - Module key
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated license or null
     */
    async deactivateModule(licenseId, moduleKey, options = {}) {
        try {
            const license = await this.findById(licenseId);
            if (!license) {
                return null;
            }

            await license.deactivateModule(moduleKey);
            return license;
        } catch (error) {
            throw this._handleError(error, 'deactivateModule');
        }
    }

    /**
     * Update license status
     * @param {string} licenseId - License ID
     * @param {string} status - New status
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated license or null
     */
    async updateStatus(licenseId, status, options = {}) {
        try {
            const updateData = { status };
            return await this.update(licenseId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updateStatus');
        }
    }

    /**
     * Extend license expiration
     * @param {string} licenseId - License ID
     * @param {string} moduleKey - Module key
     * @param {Date} newExpirationDate - New expiration date
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated license or null
     */
    async extendLicenseExpiration(licenseId, moduleKey, newExpirationDate, options = {}) {
        try {
            const license = await this.findById(licenseId);
            if (!license) {
                return null;
            }

            const module = license.modules.find(m => m.key === moduleKey);
            if (module) {
                module.expiresAt = newExpirationDate;
                await license.save();
            }

            return license;
        } catch (error) {
            throw this._handleError(error, 'extendLicenseExpiration');
        }
    }

    /**
     * Update module limits
     * @param {string} licenseId - License ID
     * @param {string} moduleKey - Module key
     * @param {Object} limits - New limits
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated license or null
     */
    async updateModuleLimits(licenseId, moduleKey, limits, options = {}) {
        try {
            const license = await this.findById(licenseId);
            if (!license) {
                return null;
            }

            const module = license.modules.find(m => m.key === moduleKey);
            if (module) {
                module.limits = { ...module.limits, ...limits };
                await license.save();
            }

            return license;
        } catch (error) {
            throw this._handleError(error, 'updateModuleLimits');
        }
    }

    /**
     * Get license analytics
     * @param {Object} [filter] - Additional filter criteria
     * @returns {Promise<Object>} License analytics
     */
    async getLicenseAnalytics(filter = {}) {
        try {
            const pipeline = [
                { $match: filter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        billingCycles: {
                            $push: '$billingCycle'
                        }
                    }
                },
                {
                    $project: {
                        status: '$_id',
                        count: 1,
                        monthlyCount: {
                            $size: {
                                $filter: {
                                    input: '$billingCycles',
                                    cond: { $eq: ['$$this', 'monthly'] }
                                }
                            }
                        },
                        yearlyCount: {
                            $size: {
                                $filter: {
                                    input: '$billingCycles',
                                    cond: { $eq: ['$$this', 'annual'] }
                                }
                            }
                        },
                        _id: 0
                    }
                }
            ];

            const statusResults = await this.model.aggregate(pipeline);

            // Get module analytics
            const moduleAnalytics = await this.model.aggregate([
                { $match: filter },
                { $unwind: '$modules' },
                {
                    $group: {
                        _id: '$modules.key',
                        totalLicenses: { $sum: 1 },
                        enabledCount: {
                            $sum: {
                                $cond: [{ $eq: ['$modules.enabled', true] }, 1, 0]
                            }
                        },
                        tierBreakdown: {
                            $push: '$modules.tier'
                        }
                    }
                },
                {
                    $project: {
                        moduleKey: '$_id',
                        totalLicenses: 1,
                        enabledCount: 1,
                        disabledCount: { $subtract: ['$totalLicenses', '$enabledCount'] },
                        tierBreakdown: {
                            $reduce: {
                                input: '$tierBreakdown',
                                initialValue: { starter: 0, business: 0, enterprise: 0 },
                                in: {
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
                                }
                            }
                        },
                        _id: 0
                    }
                }
            ]);

            return {
                byStatus: statusResults,
                byModule: moduleAnalytics,
                totals: statusResults.reduce((acc, item) => {
                    acc.totalLicenses += item.count;
                    acc.monthlyLicenses += item.monthlyCount;
                    acc.yearlyLicenses += item.yearlyCount;
                    return acc;
                }, { totalLicenses: 0, monthlyLicenses: 0, yearlyLicenses: 0 })
            };
        } catch (error) {
            throw this._handleError(error, 'getLicenseAnalytics');
        }
    }

    /**
     * Get usage analytics for licenses
     * @param {Object} [filter] - Additional filter criteria
     * @returns {Promise<Object>} Usage analytics
     */
    async getUsageAnalytics(filter = {}) {
        try {
            const pipeline = [
                { $match: filter },
                { $unwind: '$modules' },
                {
                    $group: {
                        _id: '$modules.key',
                        totalEmployeeLimit: { $sum: '$modules.limits.employees' },
                        totalStorageLimit: { $sum: '$modules.limits.storage' },
                        totalApiCallsLimit: { $sum: '$modules.limits.apiCalls' },
                        avgEmployeeLimit: { $avg: '$modules.limits.employees' },
                        avgStorageLimit: { $avg: '$modules.limits.storage' },
                        avgApiCallsLimit: { $avg: '$modules.limits.apiCalls' },
                        licensesWithLimits: {
                            $sum: {
                                $cond: [
                                    {
                                        $or: [
                                            { $gt: ['$modules.limits.employees', 0] },
                                            { $gt: ['$modules.limits.storage', 0] },
                                            { $gt: ['$modules.limits.apiCalls', 0] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        moduleKey: '$_id',
                        totalEmployeeLimit: 1,
                        totalStorageLimit: 1,
                        totalApiCallsLimit: 1,
                        avgEmployeeLimit: { $round: ['$avgEmployeeLimit', 2] },
                        avgStorageLimit: { $round: ['$avgStorageLimit', 2] },
                        avgApiCallsLimit: { $round: ['$avgApiCallsLimit', 2] },
                        licensesWithLimits: 1,
                        _id: 0
                    }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getUsageAnalytics');
        }
    }

    /**
     * Find licenses requiring renewal
     * @param {number} [days=7] - Days before expiration to consider for renewal
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of licenses requiring renewal
     */
    async findLicensesRequiringRenewal(days = 7, options = {}) {
        try {
            const now = new Date();
            const renewalDate = new Date();
            renewalDate.setDate(renewalDate.getDate() + days);

            const filter = {
                status: { $in: ['active', 'trial'] },
                $or: [
                    {
                        status: 'trial',
                        trialEndsAt: {
                            $gte: now,
                            $lte: renewalDate
                        }
                    },
                    {
                        'modules.expiresAt': {
                            $gte: now,
                            $lte: renewalDate
                        }
                    }
                ]
            };

            return await this.find(filter, {
                ...options,
                sort: { trialEndsAt: 1, 'modules.expiresAt': 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findLicensesRequiringRenewal');
        }
    }
}

export default LicenseRepository;