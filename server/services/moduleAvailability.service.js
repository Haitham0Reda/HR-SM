/**
 * Module Availability Service
 * 
 * Provides utilities for checking module availability based on tenant configuration and license.
 * Used by both backend middleware and frontend API endpoints.
 * 
 * Requirements: 5.1, 4.2, 4.5
 */

import { MODULES } from '../shared/constants/modules.js';
import logger from '../utils/logger.js';

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
 * Core modules that are always available (cannot be disabled)
 */
const CORE_MODULES = [
    MODULES.HR_CORE
];

/**
 * Optional modules that can be enabled/disabled per tenant
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
 * Check if a module is available for a tenant
 * 
 * @param {Object} tenant - Tenant object
 * @param {Object} licenseInfo - License information
 * @param {string} moduleName - Module name to check
 * @returns {Object} Availability result with details
 */
export function checkModuleAvailability(tenant, licenseInfo, moduleName) {
    const result = {
        available: false,
        reason: null,
        details: {}
    };

    // Core modules are always available
    if (CORE_MODULES.includes(moduleName)) {
        result.available = true;
        result.reason = 'core_module';
        return result;
    }

    // Check if module exists in optional modules
    if (!OPTIONAL_MODULES.includes(moduleName)) {
        result.reason = 'module_not_found';
        result.details.moduleName = moduleName;
        return result;
    }

    // Check if module is enabled at tenant level
    const isEnabledForTenant = tenant.enabledModules && tenant.enabledModules.includes(moduleName);
    if (!isEnabledForTenant) {
        result.reason = 'module_disabled';
        result.details.enabledModules = tenant.enabledModules || [];
        return result;
    }

    // Check license requirements
    const requiredFeature = MODULE_LICENSE_REQUIREMENTS[moduleName];
    if (requiredFeature) {
        // If module requires a license feature, check if it's available
        if (!licenseInfo || !licenseInfo.valid) {
            result.reason = 'license_invalid';
            result.details.requiredFeature = requiredFeature;
            result.details.licenseValid = licenseInfo?.valid || false;
            return result;
        }

        const hasFeature = licenseInfo.features && licenseInfo.features.includes(requiredFeature);
        if (!hasFeature) {
            result.reason = 'feature_not_licensed';
            result.details.requiredFeature = requiredFeature;
            result.details.availableFeatures = licenseInfo.features || [];
            return result;
        }
    }

    // Module is available
    result.available = true;
    result.reason = 'available';
    result.details.requiredFeature = requiredFeature;
    result.details.licenseValid = licenseInfo?.valid || false;
    
    return result;
}

/**
 * Get all available modules for a tenant
 * 
 * @param {Object} tenant - Tenant object
 * @param {Object} licenseInfo - License information
 * @returns {Object} Object with available modules and details
 */
export function getAvailableModules(tenant, licenseInfo) {
    const result = {
        coreModules: [],
        optionalModules: [],
        unavailableModules: [],
        totalAvailable: 0,
        licenseInfo: {
            valid: licenseInfo?.valid || false,
            features: licenseInfo?.features || [],
            licenseType: licenseInfo?.licenseType || null
        }
    };

    // Check core modules
    for (const moduleName of CORE_MODULES) {
        const availability = checkModuleAvailability(tenant, licenseInfo, moduleName);
        if (availability.available) {
            result.coreModules.push({
                name: moduleName,
                available: true,
                reason: availability.reason
            });
        }
    }

    // Check optional modules
    for (const moduleName of OPTIONAL_MODULES) {
        const availability = checkModuleAvailability(tenant, licenseInfo, moduleName);
        
        const moduleInfo = {
            name: moduleName,
            available: availability.available,
            reason: availability.reason,
            details: availability.details
        };

        if (availability.available) {
            result.optionalModules.push(moduleInfo);
        } else {
            result.unavailableModules.push(moduleInfo);
        }
    }

    result.totalAvailable = result.coreModules.length + result.optionalModules.length;

    return result;
}

/**
 * Check if a specific feature is required for a module
 * 
 * @param {string} moduleName - Module name
 * @returns {string|null} Required license feature or null if none required
 */
export function getRequiredFeature(moduleName) {
    return MODULE_LICENSE_REQUIREMENTS[moduleName] || null;
}

/**
 * Get module availability summary for API responses
 * 
 * @param {Object} tenant - Tenant object
 * @param {Object} licenseInfo - License information
 * @returns {Object} Summary object for API responses
 */
export function getModuleAvailabilitySummary(tenant, licenseInfo) {
    const availability = getAvailableModules(tenant, licenseInfo);
    
    return {
        tenant: {
            id: tenant.id || tenant._id,
            name: tenant.name,
            enabledModules: tenant.enabledModules || []
        },
        license: availability.licenseInfo,
        modules: {
            core: availability.coreModules.map(m => m.name),
            available: availability.optionalModules.map(m => m.name),
            unavailable: availability.unavailableModules.map(m => ({
                name: m.name,
                reason: m.reason,
                details: m.details
            })),
            total: availability.totalAvailable
        }
    };
}

/**
 * Validate module configuration for a tenant
 * 
 * @param {Object} tenant - Tenant object
 * @param {Array<string>} requestedModules - Modules to validate
 * @param {Object} licenseInfo - License information
 * @returns {Object} Validation result
 */
export function validateModuleConfiguration(tenant, requestedModules, licenseInfo) {
    const result = {
        valid: true,
        validModules: [],
        invalidModules: [],
        errors: []
    };

    for (const moduleName of requestedModules) {
        const availability = checkModuleAvailability(tenant, licenseInfo, moduleName);
        
        if (availability.available) {
            result.validModules.push(moduleName);
        } else {
            result.valid = false;
            result.invalidModules.push({
                name: moduleName,
                reason: availability.reason,
                details: availability.details
            });
            
            result.errors.push(`Module ${moduleName} is not available: ${availability.reason}`);
        }
    }

    return result;
}

export default {
    checkModuleAvailability,
    getAvailableModules,
    getRequiredFeature,
    getModuleAvailabilitySummary,
    validateModuleConfiguration,
    CORE_MODULES,
    OPTIONAL_MODULES,
    MODULE_LICENSE_REQUIREMENTS
};

// Named exports for direct import
export {
    CORE_MODULES,
    OPTIONAL_MODULES,
    MODULE_LICENSE_REQUIREMENTS
};