/**
 * Dynamic Module Loader Middleware
 * 
 * Dynamically loads module routes based on tenant configuration and license features.
 * This ensures that only enabled and licensed modules are accessible to each tenant.
 * 
 * Requirements: 5.1, 4.2, 4.5
 */

import { loadModuleRoutes } from '../config/moduleRegistry.js';
import { MODULES } from '../shared/constants/modules.js';
import logger from '../utils/logger.js';

/**
 * Cache for loaded module routes per tenant
 * Structure: { tenantId: { moduleName: boolean } }
 */
const tenantModuleCache = new Map();

/**
 * Map of module names to their license feature requirements
 */
const MODULE_LICENSE_REQUIREMENTS = {
    [MODULES.LIFE_INSURANCE]: 'life-insurance',
    [MODULES.PAYROLL]: 'payroll',
    [MODULES.REPORTING]: 'advanced-reports',
    // Add more mappings as needed
};

/**
 * Optional modules that can be enabled/disabled per tenant
 * Core modules like HR_CORE are always enabled
 */
const OPTIONAL_MODULES = [
    MODULES.TASKS,
    MODULES.COMMUNICATION,
    MODULES.DOCUMENTS,
    MODULES.REPORTING,
    MODULES.PAYROLL,
    MODULES.LIFE_INSURANCE
];

/**
 * Check if a module should be available for a tenant
 * 
 * @param {Object} tenant - Tenant object
 * @param {Object} licenseInfo - License information
 * @param {string} moduleName - Module name to check
 * @returns {boolean} True if module should be available
 */
function shouldModuleBeAvailable(tenant, licenseInfo, moduleName) {
    // Core modules are always available
    if (moduleName === MODULES.HR_CORE) {
        return true;
    }

    // Check if module is enabled at tenant level
    const isEnabledForTenant = tenant.enabledModules && tenant.enabledModules.includes(moduleName);
    if (!isEnabledForTenant) {
        return false;
    }

    // Check license requirements
    const requiredFeature = MODULE_LICENSE_REQUIREMENTS[moduleName];
    if (requiredFeature) {
        // If module requires a license feature, check if it's available
        if (!licenseInfo || !licenseInfo.valid) {
            return false;
        }

        const hasFeature = licenseInfo.features && licenseInfo.features.includes(requiredFeature);
        if (!hasFeature) {
            return false;
        }
    }

    return true;
}

/**
 * Get available modules for a tenant
 * 
 * @param {Object} tenant - Tenant object
 * @param {Object} licenseInfo - License information
 * @returns {Array<string>} Array of available module names
 */
function getAvailableModules(tenant, licenseInfo) {
    const availableModules = [];

    // Always include core module
    availableModules.push(MODULES.HR_CORE);

    // Check optional modules
    for (const moduleName of OPTIONAL_MODULES) {
        if (shouldModuleBeAvailable(tenant, licenseInfo, moduleName)) {
            availableModules.push(moduleName);
        }
    }

    return availableModules;
}

/**
 * Dynamic module loading middleware
 * This middleware should be applied after tenant context and license validation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const dynamicModuleLoader = async (req, res, next) => {
    try {
        const tenant = req.tenant;
        const licenseInfo = req.licenseInfo;

        if (!tenant) {
            // No tenant context, skip module loading
            return next();
        }

        const tenantId = tenant.id || tenant._id;
        const cacheKey = `${tenantId}`;

        // Check if we've already determined available modules for this tenant
        let cachedModules = tenantModuleCache.get(cacheKey);
        
        if (!cachedModules) {
            // Determine available modules for this tenant
            const availableModules = getAvailableModules(tenant, licenseInfo);
            
            // Cache the result
            cachedModules = {};
            for (const moduleName of availableModules) {
                cachedModules[moduleName] = true;
            }
            tenantModuleCache.set(cacheKey, cachedModules);

            logger.debug(`Cached available modules for tenant ${tenantId}:`, Object.keys(cachedModules));
        }

        // Attach available modules to request for use by other middleware
        req.availableModules = Object.keys(cachedModules);
        req.isModuleAvailable = (moduleName) => Boolean(cachedModules[moduleName]);

        next();

    } catch (error) {
        logger.error('Dynamic module loader error:', {
            error: error.message,
            tenantId: req.tenant?.id,
            stack: error.stack
        });
        next(error);
    }
};

/**
 * Clear module cache for a specific tenant
 * Useful when tenant configuration or license changes
 * 
 * @param {string} tenantId - Tenant ID
 */
export const clearTenantModuleCache = (tenantId) => {
    const cacheKey = `${tenantId}`;
    tenantModuleCache.delete(cacheKey);
    logger.info(`Cleared module cache for tenant: ${tenantId}`);
};

/**
 * Clear all module cache
 * Useful for testing or when global configuration changes
 */
export const clearAllModuleCache = () => {
    tenantModuleCache.clear();
    logger.info('Cleared all module cache');
};

/**
 * Get cached modules for a tenant (for debugging)
 * 
 * @param {string} tenantId - Tenant ID
 * @returns {Object|null} Cached modules or null if not cached
 */
export const getCachedModules = (tenantId) => {
    const cacheKey = `${tenantId}`;
    return tenantModuleCache.get(cacheKey) || null;
};

/**
 * Middleware to check if current request path requires a specific module
 * This should be used in conjunction with the module guard
 * 
 * @param {string} moduleName - Required module name
 * @returns {Function} Express middleware function
 */
export const requireModuleAvailability = (moduleName) => {
    return (req, res, next) => {
        // Check if module is available for this tenant
        if (req.isModuleAvailable && !req.isModuleAvailable(moduleName)) {
            logger.warn(`Module ${moduleName} not available for tenant`, {
                tenantId: req.tenant?.id,
                availableModules: req.availableModules
            });

            return res.status(403).json({
                success: false,
                error: 'MODULE_NOT_AVAILABLE',
                message: `Module ${moduleName} is not available for your organization`,
                moduleName,
                availableModules: req.availableModules || []
            });
        }

        next();
    };
};

export default {
    dynamicModuleLoader,
    clearTenantModuleCache,
    clearAllModuleCache,
    getCachedModules,
    requireModuleAvailability,
    shouldModuleBeAvailable,
    getAvailableModules
};