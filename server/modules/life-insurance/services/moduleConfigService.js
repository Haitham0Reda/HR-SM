/**
 * Life Insurance Module Configuration Service
 * 
 * Handles tenant-specific module configuration, feature availability checks,
 * and integration with the module registry system.
 * 
 * Requirements: 9.3, 9.4, 9.5
 */

import moduleRegistry from '../../../core/registry/moduleRegistry.js';
import TenantConfig from '../../hr-core/models/TenantConfig.js';
import { MODULES } from '../../../shared/constants/modules.js';
import logger from '../../../utils/logger.js';
import AppError from '../../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../../core/errors/errorTypes.js';

class ModuleConfigService {
    constructor() {
        this.configCache = new Map();
        this.cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get module configuration for a tenant
     * 
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Module configuration
     */
    async getTenantModuleConfig(tenantId) {
        try {
            // Check cache first
            const cacheKey = `${tenantId}:${MODULES.LIFE_INSURANCE}`;
            const cached = this.configCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryTime) {
                return cached.config;
            }

            // Get tenant configuration
            const tenantConfig = await TenantConfig.findOne({ tenantId }).lean();
            
            if (!tenantConfig) {
                throw new AppError(
                    `Tenant configuration not found: ${tenantId}`,
                    404,
                    ERROR_TYPES.TENANT_NOT_FOUND,
                    { tenantId }
                );
            }

            // Get module registry configuration
            const moduleConfig = moduleRegistry.getModule(MODULES.LIFE_INSURANCE);
            
            if (!moduleConfig) {
                throw new AppError(
                    `Module not found in registry: ${MODULES.LIFE_INSURANCE}`,
                    404,
                    ERROR_TYPES.MODULE_NOT_FOUND,
                    { moduleName: MODULES.LIFE_INSURANCE }
                );
            }

            // Check if module is enabled for tenant
            const isModuleEnabled = tenantConfig.isModuleEnabled(MODULES.LIFE_INSURANCE);

            // Build configuration object
            const config = {
                tenantId,
                moduleEnabled: isModuleEnabled,
                moduleConfig: moduleConfig,
                tenantSettings: this.getTenantSpecificSettings(tenantConfig),
                features: this.getAvailableFeatures(tenantConfig, moduleConfig),
                license: {
                    valid: tenantConfig.validateLicense(),
                    features: tenantConfig.license?.enabledModules || [],
                    hasLifeInsurance: tenantConfig.license?.enabledModules?.includes('life-insurance') || false
                },
                subscription: {
                    plan: tenantConfig.subscription?.plan || 'free',
                    status: tenantConfig.subscription?.status || 'active',
                    maxEmployees: tenantConfig.subscription?.maxEmployees || 10
                }
            };

            // Cache the configuration
            this.configCache.set(cacheKey, {
                config,
                timestamp: Date.now()
            });

            return config;
        } catch (error) {
            logger.error('Failed to get tenant module configuration', {
                tenantId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get tenant-specific settings for the life insurance module
     * 
     * @param {Object} tenantConfig - Tenant configuration
     * @returns {Object} Tenant-specific settings
     */
    getTenantSpecificSettings(tenantConfig) {
        // Default settings from module config schema
        const defaultSettings = {
            emailNotifications: true,
            autoApproveSmallClaims: false,
            smallClaimThreshold: 1000,
            requireDocumentsForClaims: true,
            maxFamilyMembers: 10
        };

        // Get tenant-specific overrides (if any)
        const moduleSettings = tenantConfig.modules?.get(MODULES.LIFE_INSURANCE);
        const customSettings = moduleSettings?.settings || {};

        return {
            ...defaultSettings,
            ...customSettings
        };
    }

    /**
     * Get available features based on tenant configuration and license
     * 
     * @param {Object} tenantConfig - Tenant configuration
     * @param {Object} moduleConfig - Module configuration from registry
     * @returns {Object} Available features
     */
    getAvailableFeatures(tenantConfig, moduleConfig) {
        const baseFeatures = moduleConfig.features || {};
        const licenseFeatures = tenantConfig.license?.enabledModules || [];
        const subscriptionPlan = tenantConfig.subscription?.plan || 'free';

        // Feature availability based on subscription plan
        const planFeatures = {
            free: {
                policyManagement: true,
                familyMembers: false,
                claimsProcessing: false,
                beneficiaryManagement: false,
                insuranceReports: false,
                documentUpload: false,
                emailNotifications: false,
                policyAnalytics: false
            },
            basic: {
                policyManagement: true,
                familyMembers: true,
                claimsProcessing: true,
                beneficiaryManagement: false,
                insuranceReports: false,
                documentUpload: true,
                emailNotifications: true,
                policyAnalytics: false
            },
            professional: {
                policyManagement: true,
                familyMembers: true,
                claimsProcessing: true,
                beneficiaryManagement: true,
                insuranceReports: true,
                documentUpload: true,
                emailNotifications: true,
                policyAnalytics: false
            },
            enterprise: {
                policyManagement: true,
                familyMembers: true,
                claimsProcessing: true,
                beneficiaryManagement: true,
                insuranceReports: true,
                documentUpload: true,
                emailNotifications: true,
                policyAnalytics: true
            }
        };

        const availableFeatures = planFeatures[subscriptionPlan] || planFeatures.free;

        // Override with license restrictions
        if (!licenseFeatures.includes('life-insurance')) {
            // If no life insurance license, disable all features
            Object.keys(availableFeatures).forEach(key => {
                availableFeatures[key] = false;
            });
        }

        return availableFeatures;
    }

    /**
     * Check if a specific feature is available for a tenant
     * 
     * @param {string} tenantId - Tenant ID
     * @param {string} featureName - Feature name to check
     * @returns {Promise<boolean>} True if feature is available
     */
    async isFeatureAvailable(tenantId, featureName) {
        try {
            const config = await this.getTenantModuleConfig(tenantId);
            
            if (!config.moduleEnabled) {
                return false;
            }

            return config.features[featureName] || false;
        } catch (error) {
            logger.error('Failed to check feature availability', {
                tenantId,
                featureName,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Check if the module is enabled and licensed for a tenant
     * 
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Module availability status
     */
    async checkModuleAvailability(tenantId) {
        try {
            const config = await this.getTenantModuleConfig(tenantId);
            
            return {
                available: config.moduleEnabled && config.license.hasLifeInsurance,
                moduleEnabled: config.moduleEnabled,
                licensed: config.license.hasLifeInsurance,
                licenseValid: config.license.valid,
                subscriptionStatus: config.subscription.status,
                reason: this.getAvailabilityReason(config)
            };
        } catch (error) {
            logger.error('Failed to check module availability', {
                tenantId,
                error: error.message
            });
            
            return {
                available: false,
                moduleEnabled: false,
                licensed: false,
                licenseValid: false,
                subscriptionStatus: 'unknown',
                reason: 'configuration_error'
            };
        }
    }

    /**
     * Get the reason why module is available or not
     * 
     * @param {Object} config - Module configuration
     * @returns {string} Availability reason
     */
    getAvailabilityReason(config) {
        if (!config.moduleEnabled) {
            return 'module_disabled';
        }
        
        if (!config.license.valid) {
            return 'license_invalid';
        }
        
        if (!config.license.hasLifeInsurance) {
            return 'feature_not_licensed';
        }
        
        if (config.subscription.status !== 'active') {
            return 'subscription_inactive';
        }
        
        return 'available';
    }

    /**
     * Update tenant-specific module settings
     * 
     * @param {string} tenantId - Tenant ID
     * @param {Object} settings - Settings to update
     * @returns {Promise<Object>} Updated configuration
     */
    async updateTenantSettings(tenantId, settings) {
        try {
            const tenantConfig = await TenantConfig.findOne({ tenantId });
            
            if (!tenantConfig) {
                throw new AppError(
                    `Tenant configuration not found: ${tenantId}`,
                    404,
                    ERROR_TYPES.TENANT_NOT_FOUND,
                    { tenantId }
                );
            }

            // Get current module configuration
            const currentModuleConfig = tenantConfig.modules.get(MODULES.LIFE_INSURANCE) || {};
            
            // Update settings
            const updatedModuleConfig = {
                ...currentModuleConfig,
                settings: {
                    ...currentModuleConfig.settings,
                    ...settings
                },
                updatedAt: new Date()
            };

            tenantConfig.modules.set(MODULES.LIFE_INSURANCE, updatedModuleConfig);
            await tenantConfig.save();

            // Clear cache
            const cacheKey = `${tenantId}:${MODULES.LIFE_INSURANCE}`;
            this.configCache.delete(cacheKey);

            logger.info('Tenant module settings updated', {
                tenantId,
                moduleName: MODULES.LIFE_INSURANCE,
                updatedSettings: Object.keys(settings)
            });

            return await this.getTenantModuleConfig(tenantId);
        } catch (error) {
            logger.error('Failed to update tenant settings', {
                tenantId,
                settings,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Clear configuration cache for a tenant
     * 
     * @param {string} tenantId - Tenant ID (optional, clears all if not provided)
     */
    clearCache(tenantId = null) {
        if (tenantId) {
            const cacheKey = `${tenantId}:${MODULES.LIFE_INSURANCE}`;
            this.configCache.delete(cacheKey);
        } else {
            this.configCache.clear();
        }
        
        logger.info('Module configuration cache cleared', { tenantId });
    }

    /**
     * Get cache statistics
     * 
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.configCache.size,
            expiryTime: this.cacheExpiryTime,
            keys: Array.from(this.configCache.keys())
        };
    }
}

// Export singleton instance
const moduleConfigService = new ModuleConfigService();
export default moduleConfigService;