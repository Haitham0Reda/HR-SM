import BaseRepository from '../BaseRepository.js';
import TenantConfig from '../../modules/hr-core/models/TenantConfig.js';

/**
 * Repository for TenantConfig model operations
 * Provides specialized methods for tenant configuration management
 * 
 * @extends BaseRepository
 */
class TenantConfigRepository extends BaseRepository {
    constructor() {
        super(TenantConfig);
    }

    /**
     * Find tenant config by tenant ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} Tenant config document or null
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
     * Find tenant configs by deployment mode
     * @param {string} deploymentMode - Deployment mode (saas, on-premise)
     * @param {Object} [options] - Query options
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of tenant configs
     */
    async findByDeploymentMode(deploymentMode, options = {}) {
        try {
            const filter = { deploymentMode };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByDeploymentMode');
        }
    }

    /**
     * Find tenant configs by subscription plan
     * @param {string} plan - Subscription plan (free, basic, professional, enterprise)
     * @param {Object} [options] - Query options
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of tenant configs
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
     * Find tenant configs by subscription status
     * @param {string} status - Subscription status (active, suspended, cancelled)
     * @param {Object} [options] - Query options
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of tenant configs
     */
    async findBySubscriptionStatus(status, options = {}) {
        try {
            const filter = { 'subscription.status': status };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findBySubscriptionStatus');
        }
    }

    /**
     * Find tenant configs with enabled module
     * @param {string} moduleName - Module name
     * @param {Object} [options] - Query options
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of tenant configs with the module enabled
     */
    async findWithEnabledModule(moduleName, options = {}) {
        try {
            const filter = {
                [`modules.${moduleName}.enabled`]: true
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findWithEnabledModule');
        }
    }

    /**
     * Find tenant configs with expiring subscriptions
     * @param {number} [daysFromNow=30] - Number of days from now to check for expiration
     * @param {Object} [options] - Query options
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of tenant configs with expiring subscriptions
     */
    async findWithExpiringSubscriptions(daysFromNow = 30, options = {}) {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + daysFromNow);
            
            const filter = {
                'subscription.status': 'active',
                'subscription.endDate': {
                    $lte: expirationDate,
                    $gte: new Date()
                }
            };
            
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findWithExpiringSubscriptions');
        }
    }

    /**
     * Find tenant configs with expiring licenses
     * @param {number} [daysFromNow=30] - Number of days from now to check for expiration
     * @param {Object} [options] - Query options
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of tenant configs with expiring licenses
     */
    async findWithExpiringLicenses(daysFromNow = 30, options = {}) {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + daysFromNow);
            
            const filter = {
                deploymentMode: 'on-premise',
                'license.expiresAt': {
                    $lte: expirationDate,
                    $gte: new Date()
                }
            };
            
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findWithExpiringLicenses');
        }
    }

    /**
     * Search tenant configs by company name
     * @param {string} searchTerm - Search term
     * @param {Object} [options] - Query options
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of matching tenant configs
     */
    async searchByCompanyName(searchTerm, options = {}) {
        try {
            const filter = {
                companyName: { $regex: searchTerm, $options: 'i' }
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'searchByCompanyName');
        }
    }

    /**
     * Enable module for tenant
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleName - Module name to enable
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated tenant config document
     */
    async enableModule(tenantId, moduleName, options = {}) {
        try {
            const config = await this.findByTenantId(tenantId);
            if (!config) {
                throw new Error(`Tenant config not found for tenantId: ${tenantId}`);
            }
            
            config.enableModule(moduleName);
            await config.save();
            
            return config;
        } catch (error) {
            throw this._handleError(error, 'enableModule');
        }
    }

    /**
     * Disable module for tenant
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleName - Module name to disable
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated tenant config document
     */
    async disableModule(tenantId, moduleName, options = {}) {
        try {
            const config = await this.findByTenantId(tenantId);
            if (!config) {
                throw new Error(`Tenant config not found for tenantId: ${tenantId}`);
            }
            
            config.disableModule(moduleName);
            await config.save();
            
            return config;
        } catch (error) {
            throw this._handleError(error, 'disableModule');
        }
    }

    /**
     * Update subscription plan
     * @param {string} tenantId - Tenant ID
     * @param {string} plan - New subscription plan
     * @param {Object} [subscriptionData] - Additional subscription data
     * @param {Date} [subscriptionData.startDate] - Subscription start date
     * @param {Date} [subscriptionData.endDate] - Subscription end date
     * @param {number} [subscriptionData.maxEmployees] - Maximum employees allowed
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated tenant config document
     */
    async updateSubscriptionPlan(tenantId, plan, subscriptionData = {}, options = {}) {
        try {
            const updateData = {
                'subscription.plan': plan,
                'subscription.status': 'active'
            };
            
            if (subscriptionData.startDate) {
                updateData['subscription.startDate'] = subscriptionData.startDate;
            }
            
            if (subscriptionData.endDate) {
                updateData['subscription.endDate'] = subscriptionData.endDate;
            }
            
            if (subscriptionData.maxEmployees) {
                updateData['subscription.maxEmployees'] = subscriptionData.maxEmployees;
            }
            
            const filter = { tenantId };
            return await this.model.findOneAndUpdate(filter, updateData, {
                new: true,
                runValidators: true
            });
        } catch (error) {
            throw this._handleError(error, 'updateSubscriptionPlan');
        }
    }

    /**
     * Update license information
     * @param {string} tenantId - Tenant ID
     * @param {Object} licenseData - License data
     * @param {string} licenseData.key - License key
     * @param {string} licenseData.signature - License signature
     * @param {Date} licenseData.issuedAt - License issued date
     * @param {Date} licenseData.expiresAt - License expiration date
     * @param {number} licenseData.maxEmployees - Maximum employees allowed
     * @param {Array} licenseData.enabledModules - Array of enabled module names
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated tenant config document
     */
    async updateLicense(tenantId, licenseData, options = {}) {
        try {
            const updateData = {
                'license.key': licenseData.key,
                'license.signature': licenseData.signature,
                'license.issuedAt': licenseData.issuedAt,
                'license.expiresAt': licenseData.expiresAt,
                'license.maxEmployees': licenseData.maxEmployees,
                'license.enabledModules': licenseData.enabledModules
            };
            
            const filter = { tenantId };
            return await this.model.findOneAndUpdate(filter, updateData, {
                new: true,
                runValidators: true
            });
        } catch (error) {
            throw this._handleError(error, 'updateLicense');
        }
    }

    /**
     * Update tenant settings
     * @param {string} tenantId - Tenant ID
     * @param {Object} settings - Settings to update
     * @param {string} [settings.timezone] - Timezone
     * @param {string} [settings.dateFormat] - Date format
     * @param {string} [settings.currency] - Currency
     * @param {string} [settings.language] - Language
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated tenant config document
     */
    async updateSettings(tenantId, settings, options = {}) {
        try {
            const updateData = {};
            
            if (settings.timezone) {
                updateData['settings.timezone'] = settings.timezone;
            }
            
            if (settings.dateFormat) {
                updateData['settings.dateFormat'] = settings.dateFormat;
            }
            
            if (settings.currency) {
                updateData['settings.currency'] = settings.currency;
            }
            
            if (settings.language) {
                updateData['settings.language'] = settings.language;
            }
            
            const filter = { tenantId };
            return await this.model.findOneAndUpdate(filter, updateData, {
                new: true,
                runValidators: true
            });
        } catch (error) {
            throw this._handleError(error, 'updateSettings');
        }
    }

    /**
     * Get tenant configuration statistics
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Tenant configuration statistics
     */
    async getTenantStats(options = {}) {
        try {
            const pipeline = [
                {
                    $group: {
                        _id: null,
                        totalTenants: { $sum: 1 },
                        saasDeployments: {
                            $sum: { $cond: [{ $eq: ['$deploymentMode', 'saas'] }, 1, 0] }
                        },
                        onPremiseDeployments: {
                            $sum: { $cond: [{ $eq: ['$deploymentMode', 'on-premise'] }, 1, 0] }
                        },
                        activeSubscriptions: {
                            $sum: { $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0] }
                        },
                        suspendedSubscriptions: {
                            $sum: { $cond: [{ $eq: ['$subscription.status', 'suspended'] }, 1, 0] }
                        },
                        cancelledSubscriptions: {
                            $sum: { $cond: [{ $eq: ['$subscription.status', 'cancelled'] }, 1, 0] }
                        }
                    }
                }
            ];
            
            const [stats] = await this.model.aggregate(pipeline);
            
            return stats || {
                totalTenants: 0,
                saasDeployments: 0,
                onPremiseDeployments: 0,
                activeSubscriptions: 0,
                suspendedSubscriptions: 0,
                cancelledSubscriptions: 0
            };
        } catch (error) {
            throw this._handleError(error, 'getTenantStats');
        }
    }

    /**
     * Get subscription plan distribution
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of subscription plan statistics
     */
    async getSubscriptionPlanStats(options = {}) {
        try {
            const pipeline = [
                {
                    $group: {
                        _id: '$subscription.plan',
                        count: { $sum: 1 },
                        activeCount: {
                            $sum: { $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        plan: '$_id',
                        totalTenants: '$count',
                        activeTenants: '$activeCount'
                    }
                },
                {
                    $sort: { totalTenants: -1 }
                }
            ];
            
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getSubscriptionPlanStats');
        }
    }

    /**
     * Get module usage statistics
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of module usage statistics
     */
    async getModuleUsageStats(options = {}) {
        try {
            const pipeline = [
                {
                    $project: {
                        tenantId: 1,
                        modulesArray: { $objectToArray: '$modules' }
                    }
                },
                {
                    $unwind: '$modulesArray'
                },
                {
                    $match: {
                        'modulesArray.v.enabled': true
                    }
                },
                {
                    $group: {
                        _id: '$modulesArray.k',
                        enabledCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        moduleName: '$_id',
                        enabledTenants: '$enabledCount'
                    }
                },
                {
                    $sort: { enabledTenants: -1 }
                }
            ];
            
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getModuleUsageStats');
        }
    }

    /**
     * Validate tenant license
     * @param {string} tenantId - Tenant ID
     * @param {Object} [options] - Query options
     * @returns {Promise<boolean>} True if license is valid, false otherwise
     */
    async validateTenantLicense(tenantId, options = {}) {
        try {
            const config = await this.findByTenantId(tenantId);
            if (!config) {
                return false;
            }
            
            return config.validateLicense();
        } catch (error) {
            throw this._handleError(error, 'validateTenantLicense');
        }
    }

    /**
     * Check if module is enabled for tenant
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleName - Module name
     * @param {Object} [options] - Query options
     * @returns {Promise<boolean>} True if module is enabled, false otherwise
     */
    async isModuleEnabled(tenantId, moduleName, options = {}) {
        try {
            const config = await this.findByTenantId(tenantId);
            if (!config) {
                return false;
            }
            
            return config.isModuleEnabled(moduleName);
        } catch (error) {
            throw this._handleError(error, 'isModuleEnabled');
        }
    }
}

export default TenantConfigRepository;