// services/subscription.service.js
import License, { MODULES, PRICING_TIERS, LICENSE_STATUS } from '../platform/system/models/license.model.js';
import LicenseAudit from '../platform/system/models/licenseAudit.model.js';
import UsageTracking from '../platform/system/models/usageTracking.model.js';
import licenseValidator from './licenseValidator.service.js';
import moduleRegistry from '../config/commercialModuleRegistry.js';
import logger from '../utils/logger.js';

/**
 * Subscription Management Service
 * Handles subscription creation, upgrades, downgrades, and lifecycle management
 */
class SubscriptionService {
    /**
     * Create a new subscription for a tenant
     * @param {Object} params - Subscription parameters
     * @param {string} params.tenantId - Tenant identifier
     * @param {Array<Object>} params.modules - Modules to activate
     * @param {string} params.billingCycle - Billing cycle (monthly/annual)
     * @param {string} params.billingEmail - Billing email address
     * @param {string} params.paymentMethod - Payment method identifier
     * @param {boolean} params.isTrial - Whether this is a trial subscription
     * @param {number} params.trialDays - Number of trial days (default: 14)
     * @returns {Promise<License>} Created license
     */
    async createSubscription({
        tenantId,
        modules = [],
        billingCycle = 'monthly',
        billingEmail = null,
        paymentMethod = null,
        isTrial = false,
        trialDays = 14
    }) {
        try {
            // Check if subscription already exists
            const existingLicense = await License.findByTenantId(tenantId);
            if (existingLicense) {
                throw new Error('Subscription already exists for this tenant');
            }

            // Generate unique subscription ID
            const subscriptionId = this._generateSubscriptionId(tenantId);

            // Validate and prepare modules
            const preparedModules = await this._prepareModules(modules, isTrial);

            // Calculate trial end date if applicable
            let trialEndsAt = null;
            let status = 'active';

            if (isTrial) {
                trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
                status = 'trial';
            }

            // Create license
            const license = await License.create({
                tenantId,
                subscriptionId,
                modules: preparedModules,
                billingCycle,
                status,
                trialEndsAt,
                billingEmail,
                paymentMethod
            });

            // Log subscription creation
            await LicenseAudit.logModuleActivated(
                tenantId,
                'subscription',
                {
                    subscriptionId,
                    moduleCount: preparedModules.length,
                    isTrial,
                    trialEndsAt
                }
            );

            // Invalidate cache
            licenseValidator.invalidateCache(tenantId);

            logger.info('Subscription created', {
                tenantId,
                subscriptionId,
                moduleCount: preparedModules.length,
                isTrial,
                status
            });

            return license;

        } catch (error) {
            logger.error('Failed to create subscription', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Upgrade subscription by adding or upgrading modules
     * @param {string} tenantId - Tenant identifier
     * @param {Array<Object>} modulesToAdd - Modules to add or upgrade
     * @returns {Promise<License>} Updated license
     */
    async upgradeSubscription(tenantId, modulesToAdd = []) {
        try {
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                throw new Error('No subscription found for this tenant');
            }

            if (license.status === 'cancelled') {
                throw new Error('Cannot upgrade a cancelled subscription');
            }

            // Process each module to add/upgrade
            for (const moduleSpec of modulesToAdd) {
                const { moduleKey, tier, limits, expiresAt } = moduleSpec;

                // Validate module exists in registry
                const moduleConfig = moduleRegistry.getModuleConfig(moduleKey);
                if (!moduleConfig) {
                    throw new Error(`Invalid module key: ${moduleKey}`);
                }

                // Validate tier
                if (!PRICING_TIERS.includes(tier)) {
                    throw new Error(`Invalid pricing tier: ${tier}`);
                }

                // Check if module already exists
                const existingModule = license.getModuleLicense(moduleKey);

                if (existingModule) {
                    // Upgrade existing module
                    const oldTier = existingModule.tier;
                    existingModule.tier = tier;
                    existingModule.limits = { ...existingModule.limits, ...limits };
                    existingModule.expiresAt = expiresAt || existingModule.expiresAt;
                    existingModule.enabled = true;

                    await LicenseAudit.logLicenseUpdated(
                        tenantId,
                        moduleKey,
                        {
                            action: 'upgrade',
                            oldTier,
                            newTier: tier,
                            oldLimits: existingModule.limits,
                            newLimits: limits
                        }
                    );
                } else {
                    // Add new module
                    await license.activateModule(moduleKey, tier, limits, expiresAt);

                    await LicenseAudit.logModuleActivated(
                        tenantId,
                        moduleKey,
                        {
                            tier,
                            limits,
                            expiresAt
                        }
                    );
                }
            }

            // If upgrading from trial, change status to active
            if (license.status === 'trial') {
                license.status = 'active';
                license.trialEndsAt = null;
            }

            await license.save();

            // Invalidate cache
            licenseValidator.invalidateCache(tenantId);

            logger.info('Subscription upgraded', {
                tenantId,
                subscriptionId: license.subscriptionId,
                modulesAdded: modulesToAdd.length
            });

            return license;

        } catch (error) {
            logger.error('Failed to upgrade subscription', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Downgrade subscription by removing or downgrading modules
     * @param {string} tenantId - Tenant identifier
     * @param {Array<Object>} modulesToModify - Modules to remove or downgrade
     * @param {boolean} preserveData - Whether to preserve module data (default: true)
     * @returns {Promise<License>} Updated license
     */
    async downgradeSubscription(tenantId, modulesToModify = [], preserveData = true) {
        try {
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                throw new Error('No subscription found for this tenant');
            }

            if (license.status === 'cancelled') {
                throw new Error('Cannot downgrade a cancelled subscription');
            }

            // Process each module to modify
            for (const moduleSpec of modulesToModify) {
                const { moduleKey, action, tier, limits } = moduleSpec;

                // Validate module exists
                const existingModule = license.getModuleLicense(moduleKey);
                if (!existingModule) {
                    logger.warn('Module not found in subscription', { tenantId, moduleKey });
                    continue;
                }

                if (action === 'remove') {
                    // Disable the module
                    existingModule.enabled = false;

                    await LicenseAudit.logModuleDeactivated(
                        tenantId,
                        moduleKey,
                        {
                            preserveData,
                            oldTier: existingModule.tier
                        }
                    );

                    logger.info('Module removed from subscription', {
                        tenantId,
                        moduleKey,
                        preserveData
                    });

                } else if (action === 'downgrade' && tier) {
                    // Downgrade to lower tier
                    const oldTier = existingModule.tier;
                    existingModule.tier = tier;

                    if (limits) {
                        existingModule.limits = { ...existingModule.limits, ...limits };
                    }

                    await LicenseAudit.logLicenseUpdated(
                        tenantId,
                        moduleKey,
                        {
                            action: 'downgrade',
                            oldTier,
                            newTier: tier,
                            oldLimits: existingModule.limits,
                            newLimits: limits
                        }
                    );

                    logger.info('Module downgraded', {
                        tenantId,
                        moduleKey,
                        oldTier,
                        newTier: tier
                    });
                }
            }

            await license.save();

            // Invalidate cache
            licenseValidator.invalidateCache(tenantId);

            logger.info('Subscription downgraded', {
                tenantId,
                subscriptionId: license.subscriptionId,
                modulesModified: modulesToModify.length
            });

            return license;

        } catch (error) {
            logger.error('Failed to downgrade subscription', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Handle trial period expiration
     * @param {string} tenantId - Tenant identifier
     * @param {boolean} convertToActive - Whether to convert to active subscription
     * @returns {Promise<License>} Updated license
     */
    async handleTrialExpiration(tenantId, convertToActive = false) {
        try {
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                throw new Error('No subscription found for this tenant');
            }

            if (license.status !== 'trial') {
                throw new Error('Subscription is not in trial status');
            }

            if (convertToActive) {
                // Convert trial to active subscription
                license.status = 'active';
                license.trialEndsAt = null;

                await LicenseAudit.logLicenseUpdated(
                    tenantId,
                    'subscription',
                    {
                        action: 'trial_converted',
                        oldStatus: 'trial',
                        newStatus: 'active'
                    }
                );

                logger.info('Trial converted to active subscription', {
                    tenantId,
                    subscriptionId: license.subscriptionId
                });
            } else {
                // Expire the trial - disable all non-Core modules
                license.status = 'expired';

                for (const module of license.modules) {
                    if (module.key !== MODULES.CORE_HR) {
                        module.enabled = false;
                    }
                }

                await LicenseAudit.logLicenseExpired(
                    tenantId,
                    'subscription',
                    {
                        reason: 'trial_expired',
                        trialEndsAt: license.trialEndsAt
                    }
                );

                logger.info('Trial subscription expired', {
                    tenantId,
                    subscriptionId: license.subscriptionId
                });
            }

            await license.save();

            // Invalidate cache
            licenseValidator.invalidateCache(tenantId);

            return license;

        } catch (error) {
            logger.error('Failed to handle trial expiration', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Handle subscription expiration
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<License>} Updated license
     */
    async handleSubscriptionExpiration(tenantId) {
        try {
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                throw new Error('No subscription found for this tenant');
            }

            // Mark subscription as expired
            const oldStatus = license.status;
            license.status = 'expired';

            // Disable all non-Core modules
            for (const module of license.modules) {
                if (module.key !== MODULES.CORE_HR && module.enabled) {
                    module.enabled = false;

                    await LicenseAudit.logModuleDeactivated(
                        tenantId,
                        module.key,
                        {
                            reason: 'subscription_expired',
                            expiresAt: module.expiresAt
                        }
                    );
                }
            }

            await license.save();

            await LicenseAudit.logLicenseExpired(
                tenantId,
                'subscription',
                {
                    oldStatus,
                    reason: 'subscription_expired'
                }
            );

            // Invalidate cache
            licenseValidator.invalidateCache(tenantId);

            logger.info('Subscription expired', {
                tenantId,
                subscriptionId: license.subscriptionId,
                oldStatus
            });

            return license;

        } catch (error) {
            logger.error('Failed to handle subscription expiration', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get subscription status
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<Object>} Subscription status
     */
    async getSubscriptionStatus(tenantId) {
        try {
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                return {
                    exists: false,
                    status: null,
                    message: 'No subscription found'
                };
            }

            // Calculate days until expiration for each module
            const modulesStatus = license.modules.map(module => {
                const daysUntilExpiration = license.getDaysUntilExpiration(module.key);

                return {
                    key: module.key,
                    enabled: module.enabled,
                    tier: module.tier,
                    limits: module.limits,
                    activatedAt: module.activatedAt,
                    expiresAt: module.expiresAt,
                    daysUntilExpiration,
                    isExpiring: daysUntilExpiration !== null && daysUntilExpiration <= 30,
                    isCritical: daysUntilExpiration !== null && daysUntilExpiration <= 7
                };
            });

            // Check trial status
            let trialInfo = null;
            if (license.status === 'trial' && license.trialEndsAt) {
                const now = new Date();
                const trialEnd = new Date(license.trialEndsAt);
                const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

                trialInfo = {
                    isActive: license.isInTrial(),
                    endsAt: license.trialEndsAt,
                    daysRemaining: Math.max(0, daysRemaining)
                };
            }

            return {
                exists: true,
                subscriptionId: license.subscriptionId,
                status: license.status,
                billingCycle: license.billingCycle,
                billingEmail: license.billingEmail,
                modules: modulesStatus,
                trial: trialInfo,
                isExpired: license.isExpired(),
                createdAt: license.createdAt,
                updatedAt: license.updatedAt
            };

        } catch (error) {
            logger.error('Failed to get subscription status', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Cancel subscription
     * @param {string} tenantId - Tenant identifier
     * @param {boolean} immediate - Whether to cancel immediately or at end of billing period
     * @returns {Promise<License>} Updated license
     */
    async cancelSubscription(tenantId, immediate = false) {
        try {
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                throw new Error('No subscription found for this tenant');
            }

            if (license.status === 'cancelled') {
                throw new Error('Subscription is already cancelled');
            }

            const oldStatus = license.status;

            if (immediate) {
                // Immediate cancellation - disable all non-Core modules
                license.status = 'cancelled';

                for (const module of license.modules) {
                    if (module.key !== MODULES.CORE_HR && module.enabled) {
                        module.enabled = false;
                    }
                }
            } else {
                // Schedule cancellation at end of billing period
                license.status = 'cancelled';
                // Note: In a real system, you'd set a cancellationDate field
                // and have a scheduled job that disables modules at that date
            }

            await license.save();

            await LicenseAudit.logLicenseUpdated(
                tenantId,
                'subscription',
                {
                    action: 'cancelled',
                    oldStatus,
                    immediate
                }
            );

            // Invalidate cache
            licenseValidator.invalidateCache(tenantId);

            logger.info('Subscription cancelled', {
                tenantId,
                subscriptionId: license.subscriptionId,
                immediate
            });

            return license;

        } catch (error) {
            logger.error('Failed to cancel subscription', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Reactivate a cancelled or expired subscription
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<License>} Updated license
     */
    async reactivateSubscription(tenantId) {
        try {
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                throw new Error('No subscription found for this tenant');
            }

            if (license.status === 'active') {
                throw new Error('Subscription is already active');
            }

            const oldStatus = license.status;
            license.status = 'active';

            // Re-enable all modules that were previously enabled
            for (const module of license.modules) {
                if (module.key !== MODULES.CORE_HR) {
                    module.enabled = true;

                    // Extend expiration if needed
                    if (module.expiresAt && new Date(module.expiresAt) < new Date()) {
                        const newExpiration = new Date();
                        newExpiration.setFullYear(newExpiration.getFullYear() + 1);
                        module.expiresAt = newExpiration;
                    }
                }
            }

            await license.save();

            await LicenseAudit.logLicenseUpdated(
                tenantId,
                'subscription',
                {
                    action: 'reactivated',
                    oldStatus,
                    newStatus: 'active'
                }
            );

            // Invalidate cache
            licenseValidator.invalidateCache(tenantId);

            logger.info('Subscription reactivated', {
                tenantId,
                subscriptionId: license.subscriptionId,
                oldStatus
            });

            return license;

        } catch (error) {
            logger.error('Failed to reactivate subscription', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Generate a unique subscription ID
     * @private
     */
    _generateSubscriptionId(tenantId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `sub-${tenantId}-${timestamp}-${random}`;
    }

    /**
     * Prepare modules for subscription creation
     * @private
     */
    async _prepareModules(modules, isTrial) {
        const preparedModules = [];

        for (const moduleSpec of modules) {
            const { moduleKey, tier, limits } = moduleSpec;

            // Validate module exists in registry
            const moduleConfig = moduleRegistry.getModuleConfig(moduleKey);
            if (!moduleConfig) {
                throw new Error(`Invalid module key: ${moduleKey}`);
            }

            // Validate tier
            if (!PRICING_TIERS.includes(tier)) {
                throw new Error(`Invalid pricing tier: ${tier}`);
            }

            // Get default limits from module config if not provided
            const moduleLimits = limits || moduleConfig.commercial.pricing[tier].limits;

            // Calculate expiration date
            let expiresAt = null;
            if (!isTrial) {
                expiresAt = new Date();
                expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now
            }

            preparedModules.push({
                key: moduleKey,
                enabled: true,
                tier,
                limits: moduleLimits,
                activatedAt: new Date(),
                expiresAt
            });
        }

        return preparedModules;
    }
}

// Export singleton instance
const subscriptionService = new SubscriptionService();
export default subscriptionService;
