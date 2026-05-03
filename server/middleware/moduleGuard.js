/**
 * Module Guard Middleware
 * Enforces module access based on license features
 * 
 * Usage:
 *   import { moduleGuard } from './middleware/moduleGuard.js';
 *   router.use(moduleGuard('payroll'));
 */

import logger from '../utils/logger.js';

/**
 * Module guard middleware factory
 * Checks if the requested module is included in the tenant's licensed features
 * 
 * @param {string} moduleName - Name of the module to guard (e.g., 'payroll', 'tasks')
 * @returns {Function} Express middleware function
 */
export const moduleGuard = (moduleName) => {
  return (req, res, next) => {
    // If license validation failed open, allow access
    // This ensures service availability during license server downtime
    if (req.licenseValidation?.failedOpen) {
      logger.debug('Module guard bypassed - license validation failed open', {
        module: moduleName,
        tenantId: req.user?.tenantId,
        path: req.path
      });
      return next();
    }
    
    // Check if module is in licensed features
    const licenseFeatures = req.licenseFeatures || [];
    const hasModule = licenseFeatures.includes(moduleName);
    
    if (!hasModule) {
      logger.warn('Module access denied - not licensed', {
        module: moduleName,
        tenantId: req.user?.tenantId,
        licensedFeatures: licenseFeatures,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        error: `Module '${moduleName}' not enabled`,
        code: 'MODULE_NOT_ENABLED',
        module: moduleName,
        message: `Your license does not include access to the ${moduleName} module. Please contact your administrator to upgrade your license.`
      });
    }
    
    // Module is licensed - allow access
    logger.debug('Module access granted', {
      module: moduleName,
      tenantId: req.user?.tenantId,
      path: req.path
    });
    
    next();
  };
};

/**
 * Multiple module guard - requires ANY of the specified modules
 * Useful for routes that can be accessed by multiple modules
 * 
 * @param {string[]} moduleNames - Array of module names
 * @returns {Function} Express middleware function
 */
export const moduleGuardAny = (moduleNames) => {
  return (req, res, next) => {
    // If license validation failed open, allow access
    if (req.licenseValidation?.failedOpen) {
      logger.debug('Module guard (any) bypassed - license validation failed open', {
        modules: moduleNames,
        tenantId: req.user?.tenantId
      });
      return next();
    }
    
    // Check if any module is in licensed features
    const licenseFeatures = req.licenseFeatures || [];
    const hasAnyModule = moduleNames.some(module => licenseFeatures.includes(module));
    
    if (!hasAnyModule) {
      logger.warn('Module access denied - none of required modules licensed', {
        requiredModules: moduleNames,
        tenantId: req.user?.tenantId,
        licensedFeatures: licenseFeatures,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: `Access requires one of: ${moduleNames.join(', ')}`,
        code: 'MODULES_NOT_ENABLED',
        requiredModules: moduleNames,
        message: `Your license does not include access to any of the required modules. Please contact your administrator.`
      });
    }
    
    next();
  };
};

/**
 * Multiple module guard - requires ALL of the specified modules
 * Useful for routes that need multiple modules to function
 * 
 * @param {string[]} moduleNames - Array of module names
 * @returns {Function} Express middleware function
 */
export const moduleGuardAll = (moduleNames) => {
  return (req, res, next) => {
    // If license validation failed open, allow access
    if (req.licenseValidation?.failedOpen) {
      logger.debug('Module guard (all) bypassed - license validation failed open', {
        modules: moduleNames,
        tenantId: req.user?.tenantId
      });
      return next();
    }
    
    // Check if all modules are in licensed features
    const licenseFeatures = req.licenseFeatures || [];
    const missingModules = moduleNames.filter(module => !licenseFeatures.includes(module));
    
    if (missingModules.length > 0) {
      logger.warn('Module access denied - missing required modules', {
        requiredModules: moduleNames,
        missingModules,
        tenantId: req.user?.tenantId,
        licensedFeatures: licenseFeatures,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: `Access requires all of: ${moduleNames.join(', ')}`,
        code: 'MODULES_NOT_ENABLED',
        requiredModules: moduleNames,
        missingModules,
        message: `Your license is missing required modules: ${missingModules.join(', ')}. Please contact your administrator.`
      });
    }
    
    next();
  };
};

export default moduleGuard;
