/**
 * Query Optimization Middleware
 * Automatically applies performance optimizations to database queries
 * 
 * NOTE: This middleware was designed for Mongoose/MongoDB.
 * Sequelize has different optimization patterns and this needs to be rewritten.
 */

/**
 * Middleware to automatically apply lean queries for GET requests
 * DISABLED: This was Mongoose-specific. Sequelize uses different optimization patterns.
 */
export const autoLeanQueries = (req, res, next) => {
  console.warn('autoLeanQueries middleware is disabled - needs Sequelize rewrite');
  next();
};

/**
 * Middleware to add query performance monitoring
 * DISABLED: This was Mongoose-specific. Sequelize uses different query patterns.
 */
export const queryPerformanceMonitoring = (req, res, next) => {
  console.warn('queryPerformanceMonitoring middleware is disabled - needs Sequelize rewrite');
  next();
};

/**
 * Middleware to optimize aggregation queries
 * DISABLED: This was Mongoose-specific. Sequelize doesn't use aggregation pipelines.
 */
export const optimizeAggregation = (req, res, next) => {
  console.warn('optimizeAggregation middleware is disabled - needs Sequelize rewrite');
  next();
};

/**
 * Middleware to add database connection monitoring
 * DISABLED: This was Mongoose-specific. Sequelize has different connection management.
 */
export const connectionMonitoring = (req, res, next) => {
  console.warn('connectionMonitoring middleware is disabled - needs Sequelize rewrite');
  next();
};

/**
 * Middleware to apply tenant-specific query optimizations
 * DISABLED: This was Mongoose-specific. Sequelize uses scopes for tenant filtering.
 */
export const tenantQueryOptimization = (req, res, next) => {
  console.warn('tenantQueryOptimization middleware is disabled - needs Sequelize rewrite');
  next();
};

/**
 * Middleware to add query result caching headers
 */
export const queryCacheHeaders = (req, res, next) => {
  // Add cache headers for GET requests
  if (req.method === 'GET') {
    // Set cache headers based on route type
    if (req.path.includes('/analytics') || req.path.includes('/reports')) {
      // Analytics can be cached for 5 minutes
      res.set('Cache-Control', 'public, max-age=300');
    } else if (req.path.includes('/users') || req.path.includes('/departments')) {
      // User data can be cached for 1 minute
      res.set('Cache-Control', 'public, max-age=60');
    } else {
      // Default: no cache for dynamic data
      res.set('Cache-Control', 'no-cache');
    }
    
    // Add ETag for conditional requests
    res.set('ETag', `"${Date.now()}"`);
  }
  
  next();
};

/**
 * Combined middleware that applies all query optimizations
 */
export const applyQueryOptimizations = [
  connectionMonitoring,
  tenantQueryOptimization,
  autoLeanQueries,
  optimizeAggregation,
  queryPerformanceMonitoring,
  queryCacheHeaders
];

export default {
  autoLeanQueries,
  queryPerformanceMonitoring,
  optimizeAggregation,
  connectionMonitoring,
  tenantQueryOptimization,
  queryCacheHeaders,
  applyQueryOptimizations
};