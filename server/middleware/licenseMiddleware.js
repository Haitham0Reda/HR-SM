import licenseValidationService from '../services/licenseValidationService.js';
import logger from '../utils/logger.js';

/**
 * License Validation Middleware
 * Protects routes based on license validation and module access
 */

/**
 * Require valid license for company
 */
export const requireValidLicense = (options = {}) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.tenantId || req.headers['x-company-id'] || options.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID not provided',
          code: 'COMPANY_ID_MISSING'
        });
      }

      // Validate license
      const validation = await licenseValidationService.validateLicense(companyId, {
        useCache: options.useCache !== false,
        forceOffline: options.forceOffline
      });

      if (!validation.valid) {
        logger.warn('License validation failed for request', {
          companyId,
          reason: validation.reason,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Invalid or expired license',
          code: 'LICENSE_INVALID',
          reason: validation.reason,
          license: validation.license ? {
            licenseNumber: validation.license.licenseNumber,
            status: validation.license.status,
            expiresAt: validation.license.expiresAt
          } : null
        });
      }

      // Add license info to request
      req.license = validation.license;
      req.licenseValidation = validation;

      // Log successful validation (debug level)
      logger.debug('License validation successful', {
        companyId,
        licenseNumber: validation.license.licenseNumber,
        online: validation.online,
        cached: validation.cached
      });

      next();

    } catch (error) {
      logger.error('License middleware error', {
        error: error.message,
        path: req.path,
        method: req.method
      });

      return res.status(500).json({
        success: false,
        message: 'License validation error',
        code: 'LICENSE_VALIDATION_ERROR'
      });
    }
  };
};

/**
 * Require specific module to be licensed
 */
export const requireModule = (moduleId, options = {}) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.tenantId || req.headers['x-company-id'] || options.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID not provided',
          code: 'COMPANY_ID_MISSING'
        });
      }

      // Validate module license
      const moduleValidation = await licenseValidationService.validateModule(companyId, moduleId);

      if (!moduleValidation.valid) {
        logger.warn('Module access denied', {
          companyId,
          moduleId,
          reason: moduleValidation.reason,
          path: req.path,
          method: req.method
        });

        return res.status(403).json({
          success: false,
          message: `Module '${moduleId}' is not licensed`,
          code: 'MODULE_NOT_LICENSED',
          moduleId,
          reason: moduleValidation.reason
        });
      }

      // Add module info to request
      req.licensedModule = moduleId;
      req.moduleValidation = moduleValidation;

      next();

    } catch (error) {
      logger.error('Module validation middleware error', {
        error: error.message,
        moduleId,
        path: req.path,
        method: req.method
      });

      return res.status(500).json({
        success: false,
        message: 'Module validation error',
        code: 'MODULE_VALIDATION_ERROR'
      });
    }
  };
};

/**
 * Check license limits before allowing operation
 */
export const checkLimits = (limitType, options = {}) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.tenantId || req.headers['x-company-id'] || options.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID not provided',
          code: 'COMPANY_ID_MISSING'
        });
      }

      // Get current usage
      const currentUsage = await licenseValidationService.getCurrentUsage(companyId);
      
      // Check limits
      const limitCheck = await licenseValidationService.checkLimits(companyId, currentUsage);

      if (!limitCheck.withinLimits) {
        const relevantViolations = limitCheck.violations.filter(v => 
          !limitType || v.type === limitType
        );

        if (relevantViolations.length > 0) {
          logger.warn('License limit exceeded', {
            companyId,
            limitType,
            violations: relevantViolations,
            path: req.path,
            method: req.method
          });

          return res.status(429).json({
            success: false,
            message: 'License limit exceeded',
            code: 'LICENSE_LIMIT_EXCEEDED',
            limitType,
            violations: relevantViolations,
            currentUsage: limitCheck.usage
          });
        }
      }

      // Add limit info to request
      req.licenseUsage = currentUsage;
      req.licenseLimits = limitCheck;

      next();

    } catch (error) {
      logger.error('License limits middleware error', {
        error: error.message,
        limitType,
        path: req.path,
        method: req.method
      });

      return res.status(500).json({
        success: false,
        message: 'License limits check error',
        code: 'LICENSE_LIMITS_ERROR'
      });
    }
  };
};

/**
 * Soft license check (warns but doesn't block)
 */
export const softLicenseCheck = (options = {}) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.tenantId || req.headers['x-company-id'] || options.companyId;
      
      if (!companyId) {
        // Just log warning and continue
        logger.warn('Company ID not provided for soft license check', {
          path: req.path,
          method: req.method
        });
        return next();
      }

      // Validate license
      const validation = await licenseValidationService.validateLicense(companyId, {
        useCache: true
      });

      if (!validation.valid) {
        logger.warn('Soft license check failed', {
          companyId,
          reason: validation.reason,
          path: req.path,
          method: req.method
        });

        // Add warning header but continue
        res.set('X-License-Warning', `License invalid: ${validation.reason}`);
      }

      // Add license info to request (even if invalid)
      req.license = validation.license;
      req.licenseValidation = validation;

      next();

    } catch (error) {
      logger.error('Soft license check error', {
        error: error.message,
        path: req.path,
        method: req.method
      });

      // Continue on error for soft check
      next();
    }
  };
};

/**
 * License info middleware (adds license info to request without validation)
 */
export const addLicenseInfo = (options = {}) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.tenantId || req.headers['x-company-id'] || options.companyId;
      
      if (companyId) {
        const validation = await licenseValidationService.validateLicense(companyId, {
          useCache: true
        });

        req.license = validation.license;
        req.licenseValidation = validation;
      }

      next();

    } catch (error) {
      logger.debug('License info middleware error (non-blocking)', {
        error: error.message
      });
      
      // Continue without license info
      next();
    }
  };
};

/**
 * Development/testing bypass (only in non-production)
 */
export const bypassLicenseInDev = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_LICENSE === 'true') {
    logger.warn('License validation bypassed (development mode)', {
      path: req.path,
      method: req.method
    });
    
    // Add mock license info
    req.license = {
      licenseId: 'dev-license',
      licenseNumber: 'DEV-000000-000000',
      licenseType: 'enterprise',
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      maxUsers: 999999,
      enabledModules: ['*'] // All modules
    };
    
    req.licenseValidation = {
      valid: true,
      online: false,
      development: true
    };
    
    return next();
  }
  
  next();
};

/**
 * Composite middleware for common license requirements
 */
export const requireLicenseAndModule = (moduleId, options = {}) => {
  return [
    requireValidLicense(options),
    requireModule(moduleId, options)
  ];
};

export const requireLicenseWithLimits = (limitType, options = {}) => {
  return [
    requireValidLicense(options),
    checkLimits(limitType, options)
  ];
};

export const requireModuleWithLimits = (moduleId, limitType, options = {}) => {
  return [
    requireValidLicense(options),
    requireModule(moduleId, options),
    checkLimits(limitType, options)
  ];
};