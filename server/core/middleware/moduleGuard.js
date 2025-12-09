/**
 * Module Guard Middleware
 * 
 * Checks if a module is enabled for the current tenant
 * Returns HTTP 403 if module is disabled
 * Supports optional dependencies with graceful degradation
 * 
 * Requirements: 1.5, 3.2, 7.3
 */

import moduleRegistry from '../registry/moduleRegistry.js';
import { resolveDependencies } from '../registry/dependencyResolver.js';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';
import logger from '../../utils/logger.js';

/**
 * Create module guard middleware for a specific module
 * 
 * @param {string} moduleName - Module name to guard
 * @param {Object} options - Guard options
 * @param {boolean} options.optional - If true, allows access even if module is disabled (for optional features)
 * @returns {Function} Express middleware function
 */
export const moduleGuard = (moduleName, options = {}) => {
    const { optional = false } = options;

    return async (req, res, next) => {
        try {
            // Check if module exists in registry
            if (!moduleRegistry.hasModule(moduleName)) {
                logger.error(`Module guard: Module not found in registry: ${moduleName}`);
                throw new AppError(
                    `Module not found: ${moduleName}`,
                    404,
                    ERROR_TYPES.MODULE_NOT_FOUND,
                    { moduleName }
                );
            }

            // Get tenant context
            const tenant = req.tenant;
            
            if (!tenant) {
                throw new AppError(
                    'Tenant context required for module access',
                    401,
                    ERROR_TYPES.UNAUTHORIZED
                );
            }

            // Get enabled modules for tenant
            const enabledModules = tenant.enabledModules || [];
            
            // Check if module is enabled for this tenant
            const isEnabled = enabledModules.includes(moduleName);

            if (!isEnabled) {
                if (optional) {
                    // Optional module - allow access but mark as unavailable
                    req.moduleAvailable = false;
                    logger.debug(`Optional module ${moduleName} not enabled for tenant ${tenant.id}`);
                    return next();
                }

                // Required module - block access
                logger.warn(`Module ${moduleName} not enabled for tenant ${tenant.id}`);
                throw new AppError(
                    `Module ${moduleName} is not enabled for your account`,
                    403,
                    ERROR_TYPES.MODULE_DISABLED,
                    { moduleName, tenantId: tenant.id }
                );
            }

            // Module is enabled - check dependencies
            const dependencyCheck = resolveDependencies(moduleName, enabledModules);
            
            if (!dependencyCheck.canEnable) {
                logger.error(`Module ${moduleName} dependencies not met for tenant ${tenant.id}:`, dependencyCheck.missingDependencies);
                throw new AppError(
                    `Module ${moduleName} cannot be used: missing dependencies`,
                    403,
                    ERROR_TYPES.MODULE_DEPENDENCY_MISSING,
                    {
                        moduleName,
                        missingDependencies: dependencyCheck.missingDependencies
                    }
                );
            }

            // Mark module as available
            req.moduleAvailable = true;
            
            // Add module info to request for downstream use
            req.module = {
                name: moduleName,
                enabled: true,
                missingOptionalDependencies: dependencyCheck.missingOptionalDependencies || []
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Create module guard for multiple modules (any one must be enabled)
 * 
 * @param {Array<string>} moduleNames - Array of module names
 * @returns {Function} Express middleware function
 */
export const anyModuleGuard = (moduleNames) => {
    return async (req, res, next) => {
        try {
            const tenant = req.tenant;
            
            if (!tenant) {
                throw new AppError(
                    'Tenant context required for module access',
                    401,
                    ERROR_TYPES.UNAUTHORIZED
                );
            }

            const enabledModules = tenant.enabledModules || [];
            
            // Check if any of the modules is enabled
            const enabledModule = moduleNames.find(name => enabledModules.includes(name));

            if (!enabledModule) {
                logger.warn(`None of the required modules enabled for tenant ${tenant.id}: ${moduleNames.join(', ')}`);
                throw new AppError(
                    `Access requires one of: ${moduleNames.join(', ')}`,
                    403,
                    ERROR_TYPES.MODULE_DISABLED,
                    { requiredModules: moduleNames, tenantId: tenant.id }
                );
            }

            req.moduleAvailable = true;
            req.module = {
                name: enabledModule,
                enabled: true
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Create module guard for multiple modules (all must be enabled)
 * 
 * @param {Array<string>} moduleNames - Array of module names
 * @returns {Function} Express middleware function
 */
export const allModulesGuard = (moduleNames) => {
    return async (req, res, next) => {
        try {
            const tenant = req.tenant;
            
            if (!tenant) {
                throw new AppError(
                    'Tenant context required for module access',
                    401,
                    ERROR_TYPES.UNAUTHORIZED
                );
            }

            const enabledModules = tenant.enabledModules || [];
            
            // Check if all modules are enabled
            const disabledModules = moduleNames.filter(name => !enabledModules.includes(name));

            if (disabledModules.length > 0) {
                logger.warn(`Required modules not enabled for tenant ${tenant.id}: ${disabledModules.join(', ')}`);
                throw new AppError(
                    `Access requires all of: ${moduleNames.join(', ')}`,
                    403,
                    ERROR_TYPES.MODULE_DISABLED,
                    { requiredModules: moduleNames, disabledModules, tenantId: tenant.id }
                );
            }

            req.moduleAvailable = true;
            req.modules = moduleNames.map(name => ({
                name,
                enabled: true
            }));

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Check if module is available in request context
 * Useful for conditional logic in controllers
 * 
 * @param {Object} req - Express request object
 * @param {string} moduleName - Module name to check
 * @returns {boolean} True if module is available
 */
export const isModuleAvailable = (req, moduleName) => {
    const tenant = req.tenant;
    if (!tenant) return false;
    
    const enabledModules = tenant.enabledModules || [];
    return enabledModules.includes(moduleName);
};

export default {
    moduleGuard,
    anyModuleGuard,
    allModulesGuard,
    isModuleAvailable
};
