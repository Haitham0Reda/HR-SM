/**
 * Feature Flag Middleware
 * 
 * This middleware checks if requested features/modules are enabled
 * before allowing access to routes.
 */

import featureFlagService from '../platform/system/services/featureFlag.service.js';

/**
 * Middleware to check if a feature is enabled
 * @param {string} feature - Feature name to check
 * @returns {function} - Express middleware function
 */
export const requireFeature = (feature) => {
    return (req, res, next) => {
        // HR Core features are always enabled
        if (feature === 'hrCore') {
            return next();
        }

        // Check if feature is enabled
        const tenantId = req.headers['x-tenant-id'] || null;
        if (!featureFlagService.isFeatureEnabled(feature, tenantId)) {
            return res.status(404).json({
                error: 'Feature not available',
                message: `The ${feature} module is not enabled for this deployment.`
            });
        }

        next();
    };
};

/**
 * Middleware to check employee limit (for On-Premise deployments)
 * @returns {function} - Express middleware function
 */
export const checkEmployeeLimit = () => {
    return (req, res, next) => {
        const license = featureFlagService.getLicense();

        // Only check for On-Premise deployments with licenses
        if (!license) {
            return next();
        }

        // In a real implementation, we would check the current employee count
        // against the license limit. For now, we'll just pass through.
        next();
    };
};

/**
 * Get current feature flags
 * @returns {function} - Express middleware function
 */
export const getFeatureFlags = (req, res, next) => {
    req.featureFlags = featureFlagService.getFeatureFlags();
    next();
};

/**
 * Get license information
 * @returns {function} - Express middleware function
 */
export const getLicenseInfo = (req, res, next) => {
    req.license = featureFlagService.getLicense();
    next();
};

export default {
    requireFeature,
    checkEmployeeLimit,
    getFeatureFlags,
    getLicenseInfo
};