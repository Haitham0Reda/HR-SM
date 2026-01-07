/**
 * Feature Guard Middleware for Life Insurance Module
 * 
 * Provides middleware functions to check feature availability based on
 * tenant configuration, subscription plan, and license features.
 * 
 * Requirements: 9.3, 9.4, 9.5
 */

import moduleConfigService from '../services/moduleConfigService.js';
import { sendError } from '../../../core/utils/response.js';
import logger from '../../../utils/logger.js';
import auditService from '../services/auditService.js';

/**
 * Middleware to check if a specific feature is available for the tenant
 * 
 * @param {string} featureName - Name of the feature to check
 * @returns {Function} Express middleware function
 */
export const requireFeature = (featureName) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenant?.id;
            
            if (!tenantId) {
                return sendError(res, 'Tenant context required', 400);
            }

            // Check if feature is available
            const isAvailable = await moduleConfigService.isFeatureAvailable(tenantId, featureName);
            
            if (!isAvailable) {
                // Log access denial with audit service
                await auditService.logAccessDenied(req, `feature:${featureName}`, 'feature-not-available', {
                    featureName,
                    subscriptionPlan: req.moduleConfig?.subscription?.plan
                });
                
                logger.warn('Feature access denied', {
                    tenantId,
                    featureName,
                    userId: req.user?._id,
                    path: req.path
                });
                
                return sendError(res, `Feature '${featureName}' is not available for your subscription plan`, 403);
            }

            // Log successful feature access
            await auditService.logInsuranceAuthorizationEvent(req, 'feature-access', `feature:${featureName}`, true, {
                featureName
            });

            // Attach feature info to request for controllers to use
            req.featureInfo = req.featureInfo || {};
            req.featureInfo[featureName] = true;

            next();
        } catch (error) {
            logger.error('Feature guard error', {
                featureName,
                tenantId: req.tenant?.id,
                error: error.message
            });
            
            return sendError(res, 'Failed to verify feature availability', 500);
        }
    };
};

/**
 * Middleware to check if multiple features are available
 * 
 * @param {Array<string>} featureNames - Array of feature names to check
 * @param {boolean} requireAll - If true, all features must be available. If false, at least one must be available
 * @returns {Function} Express middleware function
 */
export const requireFeatures = (featureNames, requireAll = true) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenant?.id;
            
            if (!tenantId) {
                return sendError(res, 'Tenant context required', 400);
            }

            // Check availability of all requested features
            const featureChecks = await Promise.all(
                featureNames.map(async (featureName) => ({
                    name: featureName,
                    available: await moduleConfigService.isFeatureAvailable(tenantId, featureName)
                }))
            );

            const availableFeatures = featureChecks.filter(f => f.available);
            const unavailableFeatures = featureChecks.filter(f => !f.available);

            // Check requirements
            let accessGranted = false;
            let errorMessage = '';

            if (requireAll) {
                accessGranted = unavailableFeatures.length === 0;
                if (!accessGranted) {
                    errorMessage = `Required features not available: ${unavailableFeatures.map(f => f.name).join(', ')}`;
                }
            } else {
                accessGranted = availableFeatures.length > 0;
                if (!accessGranted) {
                    errorMessage = `None of the required features are available: ${featureNames.join(', ')}`;
                }
            }

            if (!accessGranted) {
                logger.warn('Multiple feature access denied', {
                    tenantId,
                    requestedFeatures: featureNames,
                    availableFeatures: availableFeatures.map(f => f.name),
                    unavailableFeatures: unavailableFeatures.map(f => f.name),
                    requireAll,
                    userId: req.user?._id,
                    path: req.path
                });
                
                return sendError(res, errorMessage, 403);
            }

            // Attach feature info to request
            req.featureInfo = req.featureInfo || {};
            availableFeatures.forEach(feature => {
                req.featureInfo[feature.name] = true;
            });

            next();
        } catch (error) {
            logger.error('Multiple feature guard error', {
                featureNames,
                tenantId: req.tenant?.id,
                error: error.message
            });
            
            return sendError(res, 'Failed to verify feature availability', 500);
        }
    };
};

/**
 * Middleware to attach module configuration to request
 * 
 * @returns {Function} Express middleware function
 */
export const attachModuleConfig = () => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenant?.id;
            
            if (!tenantId) {
                return sendError(res, 'Tenant context required', 400);
            }

            // Get module configuration
            const moduleConfig = await moduleConfigService.getTenantModuleConfig(tenantId);
            
            // Attach to request
            req.moduleConfig = moduleConfig;
            req.moduleSettings = moduleConfig.tenantSettings;
            req.availableFeatures = moduleConfig.features;

            next();
        } catch (error) {
            logger.error('Failed to attach module configuration', {
                tenantId: req.tenant?.id,
                error: error.message
            });
            
            return sendError(res, 'Failed to load module configuration', 500);
        }
    };
};

/**
 * Middleware to check if the module is available for the tenant
 * 
 * @returns {Function} Express middleware function
 */
export const requireModuleAvailable = () => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenant?.id;
            
            if (!tenantId) {
                return sendError(res, 'Tenant context required', 400);
            }

            // Check module availability
            const availability = await moduleConfigService.checkModuleAvailability(tenantId);
            
            if (!availability.available) {
                const errorMessages = {
                    module_disabled: 'Life Insurance module is not enabled for your organization',
                    license_invalid: 'Your license is invalid or expired',
                    feature_not_licensed: 'Life Insurance feature is not included in your license',
                    subscription_inactive: 'Your subscription is not active',
                    configuration_error: 'Module configuration error'
                };
                
                const message = errorMessages[availability.reason] || 'Life Insurance module is not available';
                
                // Log module access denial with audit service
                await auditService.logAccessDenied(req, 'module:life-insurance', availability.reason, {
                    moduleEnabled: availability.moduleEnabled,
                    licensed: availability.licensed,
                    subscriptionStatus: availability.subscriptionStatus
                });
                
                logger.warn('Module access denied', {
                    tenantId,
                    reason: availability.reason,
                    moduleEnabled: availability.moduleEnabled,
                    licensed: availability.licensed,
                    userId: req.user?._id,
                    path: req.path
                });
                
                return sendError(res, message, 403);
            }

            // Log successful module access
            await auditService.logInsuranceAuthorizationEvent(req, 'module-access', 'module:life-insurance', true, {
                moduleEnabled: availability.moduleEnabled,
                licensed: availability.licensed
            });

            // Attach availability info to request
            req.moduleAvailability = availability;

            next();
        } catch (error) {
            logger.error('Module availability check error', {
                tenantId: req.tenant?.id,
                error: error.message
            });
            
            return sendError(res, 'Failed to verify module availability', 500);
        }
    };
};

/**
 * Middleware to check subscription limits (e.g., max employees)
 * 
 * @param {string} limitType - Type of limit to check (e.g., 'employees', 'policies')
 * @returns {Function} Express middleware function
 */
export const checkSubscriptionLimit = (limitType) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenant?.id;
            
            if (!tenantId) {
                return sendError(res, 'Tenant context required', 400);
            }

            const moduleConfig = await moduleConfigService.getTenantModuleConfig(tenantId);
            
            // For now, we only check employee limits
            if (limitType === 'employees') {
                const maxEmployees = moduleConfig.subscription.maxEmployees;
                
                // This would typically involve counting current employees
                // For now, we'll just attach the limit to the request
                req.subscriptionLimits = {
                    maxEmployees,
                    limitType
                };
            }

            next();
        } catch (error) {
            logger.error('Subscription limit check error', {
                limitType,
                tenantId: req.tenant?.id,
                error: error.message
            });
            
            return sendError(res, 'Failed to verify subscription limits', 500);
        }
    };
};

export default {
    requireFeature,
    requireFeatures,
    attachModuleConfig,
    requireModuleAvailable,
    checkSubscriptionLimit
};