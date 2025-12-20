import mongoose from 'mongoose';

/**
 * Query Optimizer Utility
 * Provides optimized query methods for better performance
 */

/**
 * Optimized lean query for read-only operations
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Promise} Optimized query result
 */
export const leanQuery = (Model, filter = {}, options = {}) => {
  const {
    select,
    sort,
    limit,
    skip,
    populate,
    useSecondary = false,
    maxTimeMS = 30000
  } = options;

  let query = Model.find(filter)
    .lean() // Return plain JavaScript objects instead of Mongoose documents
    .maxTimeMS(maxTimeMS); // Set maximum execution time

  // Use secondary read preference for analytics queries if available
  if (useSecondary && global.analyticsConnection) {
    query = query.read('secondaryPreferred');
  }

  if (select) {
    query = query.select(select);
  }

  if (sort) {
    query = query.sort(sort);
  }

  if (limit) {
    query = query.limit(limit);
  }

  if (skip) {
    query = query.skip(skip);
  }

  if (populate) {
    query = query.populate(populate);
  }

  return query;
};

/**
 * Optimized findOne query for read-only operations
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Promise} Optimized query result
 */
export const leanFindOne = (Model, filter = {}, options = {}) => {
  const {
    select,
    populate,
    useSecondary = false,
    maxTimeMS = 30000
  } = options;

  let query = Model.findOne(filter)
    .lean()
    .maxTimeMS(maxTimeMS);

  if (useSecondary && global.analyticsConnection) {
    query = query.read('secondaryPreferred');
  }

  if (select) {
    query = query.select(select);
  }

  if (populate) {
    query = query.populate(populate);
  }

  return query;
};

/**
 * Optimized count query
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Promise} Count result
 */
export const optimizedCount = (Model, filter = {}, options = {}) => {
  const {
    useSecondary = false,
    maxTimeMS = 30000
  } = options;

  let query = Model.countDocuments(filter)
    .maxTimeMS(maxTimeMS);

  if (useSecondary && global.analyticsConnection) {
    query = query.read('secondaryPreferred');
  }

  return query;
};

/**
 * Optimized aggregation pipeline
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline
 * @param {Object} options - Aggregation options
 * @returns {Promise} Aggregation result
 */
export const optimizedAggregate = (Model, pipeline = [], options = {}) => {
  const {
    useSecondary = true, // Default to secondary for analytics
    maxTimeMS = 60000, // Longer timeout for complex aggregations
    allowDiskUse = true,
    cursor = false
  } = options;

  const aggregateOptions = {
    maxTimeMS,
    allowDiskUse
  };

  if (useSecondary && global.analyticsConnection) {
    aggregateOptions.readPreference = 'secondaryPreferred';
  }

  if (cursor) {
    aggregateOptions.cursor = { batchSize: 1000 };
  }

  return Model.aggregate(pipeline, aggregateOptions);
};

/**
 * Batch processing utility for large datasets
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Function} processor - Function to process each batch
 * @param {Object} options - Batch options
 * @returns {Promise} Processing result
 */
export const batchProcess = async (Model, filter = {}, processor, options = {}) => {
  const {
    batchSize = 1000,
    select,
    sort = { _id: 1 },
    useSecondary = true,
    maxTimeMS = 30000
  } = options;

  let lastId = null;
  let processedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const batchFilter = lastId 
      ? { ...filter, _id: { $gt: lastId } }
      : filter;

    const batch = await leanQuery(Model, batchFilter, {
      select,
      sort,
      limit: batchSize,
      useSecondary,
      maxTimeMS
    });

    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    // Process the batch
    await processor(batch);

    processedCount += batch.length;
    lastId = batch[batch.length - 1]._id;

    // Check if we got fewer documents than requested (end of collection)
    if (batch.length < batchSize) {
      hasMore = false;
    }
  }

  return { processedCount };
};

/**
 * Optimized text search
 * @param {mongoose.Model} Model - Mongoose model
 * @param {string} searchText - Text to search for
 * @param {Object} options - Search options
 * @returns {Promise} Search results
 */
export const optimizedTextSearch = (Model, searchText, options = {}) => {
  const {
    select,
    limit = 20,
    skip = 0,
    useSecondary = false,
    maxTimeMS = 30000
  } = options;

  let query = Model.find(
    { $text: { $search: searchText } },
    { score: { $meta: 'textScore' } }
  )
    .lean()
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip)
    .maxTimeMS(maxTimeMS);

  if (useSecondary && global.analyticsConnection) {
    query = query.read('secondaryPreferred');
  }

  if (select) {
    query = query.select(select);
  }

  return query;
};

/**
 * Connection pool monitoring utility
 */
export const getConnectionPoolStats = () => {
  const connection = mongoose.connection;
  
  return {
    readyState: connection.readyState,
    host: connection.host,
    port: connection.port,
    name: connection.name,
    // Connection pool stats (if available)
    poolSize: connection.db?.serverConfig?.poolSize || 'N/A',
    // Additional connection info
    states: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[connection.readyState]
  };
};

/**
 * Query performance analyzer
 * @param {Function} queryFunction - Function that returns a query
 * @param {string} queryName - Name for logging
 * @returns {Promise} Query result with performance metrics
 */
export const analyzeQueryPerformance = async (queryFunction, queryName = 'Unknown Query') => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  try {
    const result = await queryFunction();
    const endTime = Date.now();
    const endMemory = process.memoryUsage();

    const performance = {
      queryName,
      duration: endTime - startTime,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      },
      timestamp: new Date()
    };

    // Log slow queries (>1000ms)
    if (performance.duration > 1000) {
      console.warn(`🐌 Slow Query Detected: ${queryName} took ${performance.duration}ms`);
    }

    return {
      result,
      performance
    };
  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ Query Failed: ${queryName} failed after ${endTime - startTime}ms`, error);
    throw error;
  }
};

/**
 * Index usage analyzer
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} filter - Query filter to analyze
 * @returns {Promise} Index usage information
 */
export const analyzeIndexUsage = async (Model, filter) => {
  try {
    const explain = await Model.find(filter).explain('executionStats');
    
    return {
      indexUsed: explain.executionStats.executionStages.indexName || 'COLLSCAN',
      documentsExamined: explain.executionStats.totalDocsExamined,
      documentsReturned: explain.executionStats.totalDocsReturned,
      executionTimeMillis: explain.executionStats.executionTimeMillis,
      isIndexScan: explain.executionStats.executionStages.stage === 'IXSCAN',
      efficiency: explain.executionStats.totalDocsReturned / Math.max(explain.executionStats.totalDocsExamined, 1)
    };
  } catch (error) {
    console.error('Failed to analyze index usage:', error);
    return null;
  }
};

/**
 * Create optimized query builder
 * @param {mongoose.Model} Model - Mongoose model
 * @returns {Object} Query builder with optimized methods
 */
export const createOptimizedQueryBuilder = (Model) => {
  return {
    // Lean queries for read-only operations
    findLean: (filter, options) => leanQuery(Model, filter, options),
    findOneLean: (filter, options) => leanFindOne(Model, filter, options),
    
    // Count operations
    count: (filter, options) => optimizedCount(Model, filter, options),
    
    // Aggregation
    aggregate: (pipeline, options) => optimizedAggregate(Model, pipeline, options),
    
    // Batch processing
    batchProcess: (filter, processor, options) => batchProcess(Model, filter, processor, options),
    
    // Text search
    textSearch: (searchText, options) => optimizedTextSearch(Model, searchText, options),
    
    // Performance analysis
    analyze: (queryFunction, queryName) => analyzeQueryPerformance(queryFunction, queryName),
    
    // Index analysis
    explainQuery: (filter) => analyzeIndexUsage(Model, filter)
  };
};

export default {
  leanQuery,
  leanFindOne,
  optimizedCount,
  optimizedAggregate,
  batchProcess,
  optimizedTextSearch,
  getConnectionPoolStats,
  analyzeQueryPerformance,
  analyzeIndexUsage,
  createOptimizedQueryBuilder
};