/**
 * Namespace Validator Middleware
 * 
 * Enforces API namespace separation:
 * - Platform routes must start with /api/platform
 * - Tenant routes must start with /api/v1
 * 
 * This middleware helps catch routing errors during development
 * and ensures consistent API structure.
 */

import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';

/**
 * Validates that routes follow the correct namespace conventions
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.strict - If true, throws error on invalid namespace. If false, logs warning.
 * @returns {Function} Express middleware
 */
const namespaceValidator = (options = { strict: false }) => {
  return (req, res, next) => {
    const path = req.path;
    
    // Skip validation for health check and root paths
    if (path === '/health' || path === '/' || path === '/favicon.ico') {
      return next();
    }
    
    // Check if path starts with /api
    if (!path.startsWith('/api')) {
      return next();
    }
    
    // Validate namespace
    const isPlatformRoute = path.startsWith('/api/platform');
    const isTenantRoute = path.startsWith('/api/v1');
    
    // If it's neither platform nor tenant route, it's invalid
    if (!isPlatformRoute && !isTenantRoute) {
      const message = `Invalid API namespace: ${path}. Routes must start with /api/platform or /api/v1`;
      
      if (options.strict) {
        return next(new AppError(message, 500, ERROR_TYPES.SYSTEM_CONFIGURATION_ERROR));
      } else {
        console.warn(`⚠️  ${message}`);
      }
    }
    
    next();
  };
};

/**
 * Validates route registration at startup
 * Checks that all registered routes follow namespace conventions
 * 
 * @param {Object} app - Express app instance
 * @returns {Object} Validation results
 */
const validateRouteNamespaces = (app) => {
  const results = {
    valid: [],
    invalid: [],
    warnings: []
  };
  
  // Get all registered routes
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Routes registered via Router
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const basePath = middleware.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\^/g, '')
            .replace(/\$/g, '');
          
          routes.push({
            path: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  // Validate each route
  routes.forEach((route) => {
    const path = route.path;
    
    // Skip non-API routes
    if (!path.startsWith('/api')) {
      return;
    }
    
    const isPlatformRoute = path.startsWith('/api/platform');
    const isTenantRoute = path.startsWith('/api/v1');
    
    if (isPlatformRoute || isTenantRoute) {
      results.valid.push({
        path,
        namespace: isPlatformRoute ? 'platform' : 'tenant',
        methods: route.methods
      });
    } else {
      results.invalid.push({
        path,
        methods: route.methods,
        suggestion: 'Should start with /api/platform or /api/v1'
      });
    }
  });
  
  return results;
};

/**
 * Logs route namespace validation results
 * 
 * @param {Object} results - Validation results from validateRouteNamespaces
 */
const logValidationResults = (results) => {
  console.log('\n📋 Route Namespace Validation Results:');
  console.log(`✓ Valid routes: ${results.valid.length}`);
  
  if (results.invalid.length > 0) {
    console.warn(`⚠️  Invalid routes: ${results.invalid.length}`);
    results.invalid.forEach((route) => {
      console.warn(`   - ${route.path} (${route.methods.join(', ')})`);
      console.warn(`     ${route.suggestion}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.warn(`⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach((warning) => {
      console.warn(`   - ${warning}`);
    });
  }
  
  console.log('');
};

export {
  namespaceValidator,
  validateRouteNamespaces,
  logValidationResults
};
