/**
 * Query Optimization Middleware
 * Automatically applies performance optimizations to database queries
 */

import mongoose from 'mongoose';

/**
 * Middleware to automatically apply lean queries for GET requests
 * This middleware modifies Mongoose queries to use lean() for read-only operations
 */
export const autoLeanQueries = (req, res, next) => {
  // Only apply to GET requests (read-only operations)
  if (req.method === 'GET') {
    // Store original query methods
    const originalFind = mongoose.Query.prototype.exec;
    const originalFindOne = mongoose.Query.prototype.exec;
    
    // Override exec method to automatically apply lean()
    mongoose.Query.prototype.exec = function(callback) {
      // Check if this is a find operation and lean is not already applied
      if ((this.op === 'find' || this.op === 'findOne') && !this.getOptions().lean) {
        // Apply lean() for better performance
        this.lean();
        
        // Set maximum execution time
        if (!this.getOptions().maxTimeMS) {
          this.maxTimeMS(30000); // 30 second default timeout
        }
        
        // Use secondary read preference for analytics if available
        if (req.path.includes('/analytics') || req.path.includes('/reports')) {
          this.read('secondaryPreferred');
        }
      }
      
      // Call original exec method
      return originalFind.call(this, callback);
    };
    
    // Restore original methods after request
    res.on('finish', () => {
      mongoose.Query.prototype.exec = originalFind;
    });
  }
  
  next();
};

/**
 * Middleware to add query performance monitoring
 */
export const queryPerformanceMonitoring = (req, res, next) => {
  // Skip monitoring for test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  const startTime = Date.now();
  let queryCount = 0;
  
  // Monitor database operations
  const originalExec = mongoose.Query.prototype.exec;
  
  mongoose.Query.prototype.exec = function(callback) {
    const queryStartTime = Date.now();
    queryCount++;
    
    const result = originalExec.call(this, (error, result) => {
      const queryDuration = Date.now() - queryStartTime;
      
      // Log slow queries (>1000ms)
      if (queryDuration > 1000) {
        console.warn(`🐌 Slow Query: ${this.op} on ${this.model.modelName} took ${queryDuration}ms`, {
          filter: this.getFilter(),
          options: this.getOptions(),
          path: req.path,
          method: req.method
        });
      }
      
      if (callback) callback(error, result);
    });
    
    return result;
  };
  
  // Restore and log summary after request
  res.on('finish', () => {
    const totalDuration = Date.now() - startTime;
    
    // Log request summary for slow requests
    if (totalDuration > 2000 || queryCount > 10) {
      console.warn(`📊 Request Summary: ${req.method} ${req.path}`, {
        duration: totalDuration,
        queryCount,
        avgQueryTime: queryCount > 0 ? totalDuration / queryCount : 0
      });
    }
    
    // Restore original exec method
    mongoose.Query.prototype.exec = originalExec;
  });
  
  next();
};

/**
 * Middleware to optimize aggregation queries
 */
export const optimizeAggregation = (req, res, next) => {
  // Store original aggregate method
  const originalAggregate = mongoose.Model.aggregate;
  
  // Override aggregate method
  mongoose.Model.aggregate = function(pipeline, options = {}) {
    // Apply default optimizations for aggregation
    const optimizedOptions = {
      allowDiskUse: true, // Allow disk usage for large datasets
      maxTimeMS: 60000, // 60 second timeout for complex aggregations
      ...options
    };
    
    // Use secondary read preference for analytics routes
    if (req.path.includes('/analytics') || req.path.includes('/reports')) {
      optimizedOptions.readPreference = 'secondaryPreferred';
    }
    
    return originalAggregate.call(this, pipeline, optimizedOptions);
  };
  
  // Restore original method after request
  res.on('finish', () => {
    mongoose.Model.aggregate = originalAggregate;
  });
  
  next();
};

/**
 * Middleware to add database connection monitoring
 */
export const connectionMonitoring = (req, res, next) => {
  // Check connection health
  const connectionState = mongoose.connection.readyState;
  
  if (connectionState !== 1) { // 1 = connected
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    console.error(`❌ Database connection issue: ${states[connectionState]}`);
    
    return res.status(503).json({
      success: false,
      error: 'Database connection unavailable',
      connectionState: states[connectionState]
    });
  }
  
  // Add connection info to request for debugging
  req.dbConnection = {
    state: connectionState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
  
  next();
};

/**
 * Middleware to apply tenant-specific query optimizations
 */
export const tenantQueryOptimization = (req, res, next) => {
  // Skip if no tenant context
  if (!req.tenantId) {
    return next();
  }
  
  // Store original find methods
  const originalFind = mongoose.Model.find;
  const originalFindOne = mongoose.Model.findOne;
  const originalCount = mongoose.Model.countDocuments;
  
  // Override find to automatically add tenantId filter
  mongoose.Model.find = function(filter = {}, ...args) {
    // Add tenantId to filter if not already present and model has tenantId field
    if (this.schema.paths.tenantId && !filter.tenantId) {
      filter.tenantId = req.tenantId;
    }
    
    return originalFind.call(this, filter, ...args);
  };
  
  // Override findOne to automatically add tenantId filter
  mongoose.Model.findOne = function(filter = {}, ...args) {
    if (this.schema.paths.tenantId && !filter.tenantId) {
      filter.tenantId = req.tenantId;
    }
    
    return originalFindOne.call(this, filter, ...args);
  };
  
  // Override countDocuments to automatically add tenantId filter
  mongoose.Model.countDocuments = function(filter = {}, ...args) {
    if (this.schema.paths.tenantId && !filter.tenantId) {
      filter.tenantId = req.tenantId;
    }
    
    return originalCount.call(this, filter, ...args);
  };
  
  // Restore original methods after request
  res.on('finish', () => {
    mongoose.Model.find = originalFind;
    mongoose.Model.findOne = originalFindOne;
    mongoose.Model.countDocuments = originalCount;
  });
  
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