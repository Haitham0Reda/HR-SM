/**
 * License Feature Guard Middleware
 * 
 * Extends the existing moduleGuard pattern to include license-based feature access control
 * Integrates with the separate license server validation
 * Provides backward compatibility with existing moduleGuard usage
 */

import { moduleGuard, isModuleAvailable } from '../core/middleware/moduleGuard.js';
import logger from '../utils/logger.js';

/**
 * Create license-aware module guard middleware
 * Combines existing module enablement check with license feature validation
 * 
 * @param {string} moduleName - Module name to guard
 * @param {Object} options - Guard options
 * @param {boolean} options.optional - If true, allows access even if module is disabled
 * @param {string} options.requiredFeature - License feature required for this module
 * @returns {Function} Express middleware function
 */
export const licenseModuleGuard = (moduleName, options = {}) => {
    const { optional = false, requiredFeature = null } = options;
    
    // Get the base module guard
    const baseModuleGuard = moduleGuard(moduleName, { optional });
    
    return async (req, res, next) => {
        try {
            // First, run the existing module guard logic
            await new Promise((resolve, reject) => {
                baseModuleGuard(req, res, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            
            // If module guard passed, check license features
            if (req.moduleAvailable !== false) {
                const licenseInfo = req.licenseInfo;
                
                // If no license info available, check if we can proceed
                if (!licenseInfo || !licenseInfo.valid) {
                    if (optional) {
                        logger.debug(`Optional module ${moduleName} - no valid license, allowing degraded access`);
                        req.moduleAvailable = false;
                        req.licenseRestricted = true;
                        return next();
                    }
                    
                    logger.warn(`Module ${moduleName} requires valid license`, {
                        tenantId: req.tenant?.id,
                        moduleName
                    });
                    
                    return res.status(403).json({
                        success: false,
                        error: 'LICENSE_REQUIRED',
                        message: `Module ${moduleName} requires a valid license`,
                        moduleName,
                        upgradeUrl: `/pricing?module=${moduleName}`
                    });
                }
                
                // Check if specific feature is required and licensed
                if (requiredFeature) {
                    const hasFeature = licenseInfo.features && licenseInfo.features.includes(requiredFeature);
                    
                    if (!hasFeature) {
                        if (optional) {
                            logger.debug(`Optional module ${moduleName} - feature ${requiredFeature} not licensed`);
                            req.moduleAvailable = false;
                            req.licenseRestricted = true;
                            return next();
                        }
                        
                        logger.warn(`Module ${moduleName} requires license feature ${requiredFeature}`, {
                            tenantId: req.tenant?.id,
                            moduleName,
                            requiredFeature,
                            availableFeatures: licenseInfo.features
                        });
                        
                        return res.status(403).json({
                            success: false,
                            error: 'FEATURE_NOT_LICENSED',
                            message: `Feature ${requiredFeature} is not included in your license`,
                            moduleName,
                            requiredFeature,
                            availableFeatures: licenseInfo.features,
                            upgradeUrl: `/pricing?feature=${requiredFeature}`
                        });
                    }
                }
                
                // Add license info to module context
                if (req.module) {
                    req.module.licenseInfo = {
                        valid: licenseInfo.valid,
                        features: licenseInfo.features,
                        licenseType: licenseInfo.licenseType,
                        expiresAt: licenseInfo.expiresAt
                    };
                }
                
                req.licenseRestricted = false;
            }
            
            next();
            
        } catch (error) {
            logger.error('License module guard error', {
                moduleName,
                error: error.message,
                stack: error.stack
            });
            next(error);
        }
    };
};

/**
 * Check license limits before allowing operations
 * @param {string} limitType - Type of limit to check (users, storage, apiCalls)
 * @param {Function} amountExtractor - Function to extract requested amount from request
 * @returns {Function} Express middleware function
 */
export const checkLicenseLimit = (limitType, amountExtractor = null) => {
    return (req, res, next) => {
        try {
            const licenseInfo = req.licenseInfo;
            
            if (!licenseInfo || !licenseInfo.valid) {
                // If no license info, let other middleware handle it
                return next();
            }
            
            const limits = licenseInfo;
            let currentUsage = 0;
            let limit = 0;
            let requestedAmount = amountExtractor ? amountExtractor(req) : 1;
            
            // Get current usage and limits based on type
            switch (limitType) {
                case 'users':
                    currentUsage = req.tenant?.usage?.activeUsers || 0;
                    limit = limits.maxUsers || Infinity;
                    break;
                case 'storage':
                    currentUsage = req.tenant?.usage?.storageUsed || 0;
                    limit = (limits.maxStorage || Infinity) * 1024 * 1024; // Convert MB to bytes
                    break;
                case 'apiCalls':
                    currentUsage = req.tenant?.usage?.apiCallsThisMonth || 0;
                    limit = limits.maxAPI || Infinity;
                    break;
                default:
                    logger.warn(`Unknown limit type: ${limitType}`);
                    return next();
            }
            
            // Check if adding requested amount would exceed limit
            if (currentUsage + requestedAmount > limit) {
                logger.warn('License limit exceeded', {
                    tenantId: req.tenant?.id,
                    limitType,
                    currentUsage,
                    limit,
                    requestedAmount
                });
                
                return res.status(429).json({
                    success: false,
                    error: 'LICENSE_LIMIT_EXCEEDED',
                    message: `${limitType} limit exceeded`,
                    limitType,
                    currentUsage,
                    limit,
                    requestedAmount,
                    upgradeUrl: `/pricing?upgrade=${limitType}`
                });
            }
            
            // Attach limit info to request
            req.licenseLimit = {
                limitType,
                currentUsage,
                limit,
                requestedAmount,
                remainingCapacity: limit - currentUsage,
                utilizationPercentage: (currentUsage / limit) * 100
            };
            
            // Warn if approaching limit (>80%)
            if ((currentUsage / limit) > 0.8) {
                logger.warn('Approaching license limit', {
                    tenantId: req.tenant?.id,
                    limitType,
                    utilizationPercentage: req.licenseLimit.utilizationPercentage
                });
            }
            
            next();
            
        } catch (error) {
            logger.error('License limit check error', {
                limitType,
                error: error.message
            });
            next(error);
        }
    };
};

/**
 * Require specific license feature
 * @param {string} featureName - Required feature name
 * @param {Object} options - Options
 * @param {boolean} options.optional - If true, allows access without feature but marks as restricted
 * @returns {Function} Express middleware function
 */
export const requireLicenseFeature = (featureName, options = {}) => {
    const { optional = false } = options;
    
    return (req, res, next) => {
        try {
            const licenseInfo = req.licenseInfo;
            
            if (!licenseInfo || !licenseInfo.valid) {
                if (optional) {
                    req.featureAvailable = false;
                    req.licenseRestricted = true;
                    return next();
                }
                
                return res.status(403).json({
                    success: false,
                    error: 'LICENSE_REQUIRED',
                    message: 'Valid license required for this feature',
                    feature: featureName
                });
            }
            
            const hasFeature = licenseInfo.features && licenseInfo.features.includes(featureName);
            
            if (!hasFeature) {
                if (optional) {
                    req.featureAvailable = false;
                    req.licenseRestricted = true;
                    return next();
                }
                
                return res.status(403).json({
                    success: false,
                    error: 'FEATURE_NOT_LICENSED',
                    message: `Feature '${featureName}' is not included in your license`,
                    feature: featureName,
                    availableFeatures: licenseInfo.features,
                    upgradeUrl: `/pricing?feature=${featureName}`
                });
            }
            
            req.featureAvailable = true;
            req.licenseRestricted = false;
            
            next();
            
        } catch (error) {
            logger.error('License feature check error', {
                featureName,
                error: error.message
            });
            next(error);
        }
    };
};

/**
 * Backward compatibility wrapper for existing moduleGuard usage
 * Automatically applies license checking to module guards
 * @param {string} moduleName - Module name
 * @param {Object} options - Options
 * @returns {Function} Express middleware function
 */
export const requireModule = (moduleName, options = {}) => {
    // Map module names to required license features
    const moduleFeatureMap = {
        'life-insurance': 'life-insurance',
        'payroll': 'payroll',
        'advanced-reports': 'advanced-reports',
        'clinic': 'clinic',
        'tasks': 'tasks'
        // Add more mappings as needed
    };
    
    const requiredFeature = moduleFeatureMap[moduleName];
    
    return async (req, res, next) => {
        try {
            // First check if module exists in registry (same as original moduleGuard)
            const moduleRegistry = await import('../core/registry/moduleRegistry.js');
            if (!moduleRegistry.default.hasModule(moduleName)) {
                logger.error(`Module guard: Module not found in registry: ${moduleName}`);
                return res.status(404).json({
                    success: false,
                    error: 'MODULE_NOT_FOUND',
                    message: `Module not found: ${moduleName}`,
                    moduleName
                });
            }

            // Check tenant context
            const tenant = req.tenant;
            if (!tenant) {
                logger.warn(`No tenant found for module ${moduleName} access`);
                return res.status(401).json({
                    success: false,
                    error: 'TENANT_REQUIRED',
                    message: 'Valid tenant context required',
                    moduleName
                });
            }

            // Check if module is enabled at tenant level
            const isModuleEnabled = tenant.enabledModules && tenant.enabledModules.includes(moduleName);
            if (!isModuleEnabled) {
                logger.warn(`Module ${moduleName} not enabled for tenant`, {
                    tenantId: tenant.id,
                    enabledModules: tenant.enabledModules
                });
                
                return res.status(403).json({
                    success: false,
                    error: 'MODULE_DISABLED',
                    message: `Module ${moduleName} is not enabled for your organization`,
                    moduleName,
                    enabledModules: tenant.enabledModules
                });
            }

            // For hr-core module, always allow access (it's the base module)
            if (moduleName === 'hr-core') {
                req.moduleAvailable = true;
                return next();
            }

            // Check license requirements for other modules
            const licenseInfo = req.licenseInfo;
            
            // If no license info available, deny access to premium modules
            if (!licenseInfo || !licenseInfo.valid) {
                logger.warn(`Module ${moduleName} requires valid license`, {
                    tenantId: tenant.id,
                    moduleName,
                    licenseValid: licenseInfo?.valid
                });
                
                return res.status(403).json({
                    success: false,
                    error: 'LICENSE_REQUIRED',
                    message: `Module ${moduleName} requires a valid license`,
                    moduleName,
                    upgradeUrl: `/pricing?module=${moduleName}`
                });
            }
            
            // Check if specific feature is required and licensed
            if (requiredFeature) {
                const hasFeature = licenseInfo.features && licenseInfo.features.includes(requiredFeature);
                
                if (!hasFeature) {
                    logger.warn(`Module ${moduleName} requires license feature ${requiredFeature}`, {
                        tenantId: tenant.id,
                        moduleName,
                        requiredFeature,
                        availableFeatures: licenseInfo.features
                    });
                    
                    return res.status(403).json({
                        success: false,
                        error: 'FEATURE_NOT_LICENSED',
                        message: `Feature ${requiredFeature} is not included in your license`,
                        moduleName,
                        requiredFeature,
                        availableFeatures: licenseInfo.features,
                        upgradeUrl: `/pricing?feature=${requiredFeature}`
                    });
                }
            }
            
            // Module access granted
            req.moduleAvailable = true;
            req.licenseRestricted = false;
            
            // Add license info to module context
            req.module = {
                name: moduleName,
                enabled: true,
                licenseInfo: {
                    valid: licenseInfo.valid,
                    features: licenseInfo.features,
                    licenseType: licenseInfo.licenseType,
                    expiresAt: licenseInfo.expiresAt
                }
            };
            
            next();
            
        } catch (error) {
            logger.error('Module access control error', {
                moduleName,
                error: error.message,
                stack: error.stack
            });
            
            return res.status(500).json({
                success: false,
                error: 'MODULE_ACCESS_ERROR',
                message: 'An error occurred while checking module access'
            });
        }
    };
};

/**
 * Check if feature is available in current license
 * @param {Object} req - Express request object
 * @param {string} featureName - Feature name to check
 * @returns {boolean} True if feature is available
 */
export const isFeatureAvailable = (req, featureName) => {
    const licenseInfo = req.licenseInfo;
    if (!licenseInfo || !licenseInfo.valid) return false;
    
    return licenseInfo.features && licenseInfo.features.includes(featureName);
};

/**
 * Get license information from request
 * @param {Object} req - Express request object
 * @returns {Object|null} License information or null
 */
export const getLicenseInfo = (req) => {
    return req.licenseInfo || null;
};

export default {
    licenseModuleGuard,
    checkLicenseLimit,
    requireLicenseFeature,
    requireModule,
    isFeatureAvailable,
    getLicenseInfo
};