import Company from '../../platform/models/Company.js';
import { requireModule as licenseAwareRequireModule } from '../../middleware/licenseFeatureGuard.middleware.js';
import logger from '../../utils/logger.js';

// Cache for feature flags to reduce DB queries
const featureFlagCache = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * Legacy module guard - maintained for backward compatibility
 * @param {string} moduleName - Module name to check
 * @returns {Function} Express middleware function
 */
export const requireModuleLegacy = (moduleName) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant context required'
                });
            }

            // Check cache first
            const cacheKey = `${tenantId}:${moduleName}`;
            const cached = featureFlagCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                if (!cached.enabled) {
                    return res.status(403).json({
                        success: false,
                        message: `Module '${moduleName}' is not enabled for your organization`
                    });
                }
                return next();
            }

            // Fetch company by tenantId (tenantId is the company _id)
            const company = await Company.findById(tenantId);

            if (!company) {
                return res.status(500).json({
                    success: false,
                    message: 'Company not found'
                });
            }

            // Check if company subscription is active
            if (!company.isSubscriptionActive()) {
                return res.status(403).json({
                    success: false,
                    message: 'Subscription expired'
                });
            }

            // Check if module is enabled
            const moduleEnabled = company.isModuleEnabled(moduleName);

            // Update cache
            featureFlagCache.set(cacheKey, {
                enabled: moduleEnabled,
                timestamp: Date.now()
            });

            if (!moduleEnabled) {
                return res.status(403).json({
                    success: false,
                    message: `Module '${moduleName}' is not enabled for your organization`
                });
            }

            next();
        } catch (error) {
            logger.error('Legacy module guard error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking module access'
            });
        }
    };
};

/**
 * Enhanced module guard with license validation
 * Uses the new license-aware module guard for better integration
 * @param {string} moduleName - Module name to check
 * @param {Object} options - Options for module guard
 * @returns {Function} Express middleware function
 */
export const requireModule = (moduleName, options = {}) => {
    // Use the new license-aware module guard
    return licenseAwareRequireModule(moduleName, options);
};

// Clear cache for a tenant (call when config changes)
export const clearModuleCache = (tenantId) => {
    for (const key of featureFlagCache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
            featureFlagCache.delete(key);
        }
    }
};

export default requireModule;
