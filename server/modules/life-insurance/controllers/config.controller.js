/**
 * Life Insurance Module Configuration Controller
 * 
 * Handles tenant-specific module configuration management,
 * feature availability, and settings updates.
 * 
 * Requirements: 9.3, 9.4, 9.5
 */

import asyncHandler from '../../../core/utils/asyncHandler.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import { ROLES } from '../../../shared/constants/modules.js';
import logger from '../../../utils/logger.js';
import moduleConfigService from '../services/moduleConfigService.js';
import auditService from '../services/auditService.js';

/**
 * Get module configuration for tenant
 * @route GET /api/v1/life-insurance/config
 * @access Private (HR, Admin)
 */
export const getModuleConfig = asyncHandler(async (req, res) => {
    try {
        // Log data access for configuration retrieval
        await auditService.logInsuranceDataAccess(req, 'read', 'module-config', [], {
            operation: 'get-module-config'
        });

        const config = await moduleConfigService.getTenantModuleConfig(req.tenant.id);
        
        // Filter sensitive information for non-admin users
        const responseConfig = {
            moduleEnabled: config.moduleEnabled,
            features: config.features,
            tenantSettings: config.tenantSettings,
            subscription: {
                plan: config.subscription.plan,
                status: config.subscription.status,
                maxEmployees: config.subscription.maxEmployees
            },
            license: {
                valid: config.license.valid,
                hasLifeInsurance: config.license.hasLifeInsurance
            }
        };

        // Include additional details for admin users
        if (req.user.role === ROLES.ADMIN) {
            responseConfig.moduleConfig = {
                name: config.moduleConfig.name,
                displayName: config.moduleConfig.displayName,
                version: config.moduleConfig.version,
                description: config.moduleConfig.description,
                configSchema: config.moduleConfig.configSchema
            };
        }

        sendSuccess(res, responseConfig, 'Module configuration retrieved successfully');
    } catch (error) {
        logger.error('Failed to get module configuration', {
            tenantId: req.tenant.id,
            userId: req.user._id,
            error: error.message
        });
        
        return sendError(res, 'Failed to retrieve module configuration', 500);
    }
});

/**
 * Update module settings for tenant
 * @route PUT /api/v1/life-insurance/config/settings
 * @access Private (Admin only)
 */
export const updateModuleSettings = asyncHandler(async (req, res) => {
    try {
        const { settings } = req.body;
        
        // Log authentication event for configuration update attempt
        await auditService.logInsuranceAuthEvent(req, 'config-update-attempt', {
            settingsKeys: Object.keys(settings || {})
        });
        
        if (!settings || typeof settings !== 'object') {
            await auditService.logAccessDenied(req, 'config-update', 'invalid-settings-object', {
                providedSettings: settings
            });
            return sendError(res, 'Valid settings object is required', 400);
        }

        // Validate settings against schema
        const validSettings = {};
        const allowedSettings = [
            'emailNotifications',
            'autoApproveSmallClaims',
            'smallClaimThreshold',
            'requireDocumentsForClaims',
            'maxFamilyMembers'
        ];

        for (const [key, value] of Object.entries(settings)) {
            if (!allowedSettings.includes(key)) {
                await auditService.logAccessDenied(req, 'config-update', 'invalid-setting-key', {
                    invalidKey: key,
                    allowedSettings
                });
                return sendError(res, `Invalid setting: ${key}`, 400);
            }
            
            // Basic type validation
            switch (key) {
                case 'emailNotifications':
                case 'autoApproveSmallClaims':
                case 'requireDocumentsForClaims':
                    if (typeof value !== 'boolean') {
                        await auditService.logAccessDenied(req, 'config-update', 'invalid-setting-type', {
                            key,
                            expectedType: 'boolean',
                            actualType: typeof value
                        });
                        return sendError(res, `Setting ${key} must be a boolean`, 400);
                    }
                    break;
                case 'smallClaimThreshold':
                case 'maxFamilyMembers':
                    if (typeof value !== 'number' || value < 0) {
                        await auditService.logAccessDenied(req, 'config-update', 'invalid-setting-value', {
                            key,
                            expectedType: 'positive number',
                            actualValue: value
                        });
                        return sendError(res, `Setting ${key} must be a positive number`, 400);
                    }
                    break;
            }
            
            validSettings[key] = value;
        }

        // Get previous settings for audit trail
        const previousConfig = await moduleConfigService.getTenantModuleConfig(req.tenant.id);
        const previousSettings = previousConfig.tenantSettings;

        // Update settings
        const updatedConfig = await moduleConfigService.updateTenantSettings(req.tenant.id, validSettings);
        
        // Log successful configuration change
        await auditService.logConfigurationChange(req, 'tenant-settings', validSettings, {
            previousSettings,
            updatedSettings: validSettings,
            changedKeys: Object.keys(validSettings)
        });
        
        logger.info('Module settings updated', {
            tenantId: req.tenant.id,
            updatedBy: req.user._id,
            updatedSettings: Object.keys(validSettings)
        });

        sendSuccess(res, {
            tenantSettings: updatedConfig.tenantSettings,
            updatedAt: new Date().toISOString()
        }, 'Module settings updated successfully');
    } catch (error) {
        logger.error('Failed to update module settings', {
            tenantId: req.tenant.id,
            userId: req.user._id,
            error: error.message
        });
        
        return sendError(res, 'Failed to update module settings', 500);
    }
});

/**
 * Get feature availability for tenant
 * @route GET /api/v1/life-insurance/config/features
 * @access Private (All authenticated users)
 */
export const getFeatureAvailability = asyncHandler(async (req, res) => {
    try {
        const config = await moduleConfigService.getTenantModuleConfig(req.tenant.id);
        
        const featureDetails = {};
        
        // Add detailed information about each feature
        for (const [featureName, isAvailable] of Object.entries(config.features)) {
            featureDetails[featureName] = {
                available: isAvailable,
                description: getFeatureDescription(featureName),
                requiredPlan: getRequiredPlan(featureName)
            };
        }

        sendSuccess(res, {
            moduleEnabled: config.moduleEnabled,
            subscriptionPlan: config.subscription.plan,
            features: featureDetails,
            moduleAvailability: await moduleConfigService.checkModuleAvailability(req.tenant.id)
        }, 'Feature availability retrieved successfully');
    } catch (error) {
        logger.error('Failed to get feature availability', {
            tenantId: req.tenant.id,
            userId: req.user._id,
            error: error.message
        });
        
        return sendError(res, 'Failed to retrieve feature availability', 500);
    }
});

/**
 * Check if specific feature is available
 * @route GET /api/v1/life-insurance/config/features/:featureName
 * @access Private (All authenticated users)
 */
export const checkFeatureAvailability = asyncHandler(async (req, res) => {
    try {
        const { featureName } = req.params;
        
        const isAvailable = await moduleConfigService.isFeatureAvailable(req.tenant.id, featureName);
        
        sendSuccess(res, {
            featureName,
            available: isAvailable,
            description: getFeatureDescription(featureName),
            requiredPlan: getRequiredPlan(featureName)
        }, `Feature availability checked for ${featureName}`);
    } catch (error) {
        logger.error('Failed to check feature availability', {
            tenantId: req.tenant.id,
            featureName: req.params.featureName,
            userId: req.user._id,
            error: error.message
        });
        
        return sendError(res, 'Failed to check feature availability', 500);
    }
});

/**
 * Get module availability status
 * @route GET /api/v1/life-insurance/config/availability
 * @access Private (All authenticated users)
 */
export const getModuleAvailability = asyncHandler(async (req, res) => {
    try {
        const availability = await moduleConfigService.checkModuleAvailability(req.tenant.id);
        
        sendSuccess(res, availability, 'Module availability status retrieved successfully');
    } catch (error) {
        logger.error('Failed to get module availability', {
            tenantId: req.tenant.id,
            userId: req.user._id,
            error: error.message
        });
        
        return sendError(res, 'Failed to retrieve module availability', 500);
    }
});

/**
 * Clear module configuration cache
 * @route POST /api/v1/life-insurance/config/cache/clear
 * @access Private (Admin only)
 */
export const clearConfigCache = asyncHandler(async (req, res) => {
    try {
        // Log authentication event for cache clear attempt
        await auditService.logInsuranceAuthEvent(req, 'cache-clear-attempt', {
            operation: 'clear-config-cache'
        });

        moduleConfigService.clearCache(req.tenant.id);
        
        // Log successful configuration change
        await auditService.logConfigurationChange(req, 'cache-clear', {}, {
            operation: 'clear-config-cache',
            clearedAt: new Date().toISOString()
        });
        
        logger.info('Module configuration cache cleared', {
            tenantId: req.tenant.id,
            clearedBy: req.user._id
        });

        sendSuccess(res, {
            tenantId: req.tenant.id,
            clearedAt: new Date().toISOString()
        }, 'Configuration cache cleared successfully');
    } catch (error) {
        logger.error('Failed to clear configuration cache', {
            tenantId: req.tenant.id,
            userId: req.user._id,
            error: error.message
        });
        
        return sendError(res, 'Failed to clear configuration cache', 500);
    }
});

/**
 * Get cache statistics
 * @route GET /api/v1/life-insurance/config/cache/stats
 * @access Private (Admin only)
 */
export const getCacheStats = asyncHandler(async (req, res) => {
    try {
        const stats = moduleConfigService.getCacheStats();
        
        sendSuccess(res, stats, 'Cache statistics retrieved successfully');
    } catch (error) {
        logger.error('Failed to get cache statistics', {
            tenantId: req.tenant.id,
            userId: req.user._id,
            error: error.message
        });
        
        return sendError(res, 'Failed to retrieve cache statistics', 500);
    }
});

/**
 * Helper function to get feature description
 * @param {string} featureName - Feature name
 * @returns {string} Feature description
 */
function getFeatureDescription(featureName) {
    const descriptions = {
        policyManagement: 'Create and manage insurance policies',
        familyMembers: 'Add and manage family members on policies',
        claimsProcessing: 'Submit and process insurance claims',
        beneficiaryManagement: 'Manage policy beneficiaries',
        insuranceReports: 'Generate insurance reports and analytics',
        documentUpload: 'Upload and manage insurance documents',
        emailNotifications: 'Receive email notifications for insurance events',
        policyAnalytics: 'Advanced policy analytics and insights'
    };
    
    return descriptions[featureName] || 'Feature description not available';
}

/**
 * Helper function to get required plan for feature
 * @param {string} featureName - Feature name
 * @returns {string} Required subscription plan
 */
function getRequiredPlan(featureName) {
    const planRequirements = {
        policyManagement: 'free',
        familyMembers: 'basic',
        claimsProcessing: 'basic',
        beneficiaryManagement: 'professional',
        insuranceReports: 'professional',
        documentUpload: 'basic',
        emailNotifications: 'basic',
        policyAnalytics: 'enterprise'
    };
    
    return planRequirements[featureName] || 'enterprise';
}

export default {
    getModuleConfig,
    updateModuleSettings,
    getFeatureAvailability,
    checkFeatureAvailability,
    getModuleAvailability,
    clearConfigCache,
    getCacheStats
};