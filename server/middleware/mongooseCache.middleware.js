/**
 * Mongoose Cache Middleware
 * Provides automatic caching for Mongoose queries with intelligent invalidation
 * Integrates with the cache service for performance optimization
 */

import cacheService from '../services/cacheService.js';
import cacheInvalidationService from '../services/cacheInvalidationService.js';
import logger from '../utils/logger.js';

/**
 * Cache middleware for Mongoose queries
 * @param {Object} options - Caching options
 * @param {number} options.ttl - Time to live in seconds
 * @param {string} options.namespace - Cache namespace
 * @param {boolean} options.enabled - Whether caching is enabled
 * @returns {Function} Middleware function
 */
export const cacheQuery = (options = {}) => {
    const {
        ttl = 300, // 5 minutes default
        namespace = 'query',
        enabled = true
    } = options;

    return function(next) {
        // Only cache for find operations
        if (!enabled || !['find', 'findOne', 'findById', 'count', 'countDocuments'].includes(this.op)) {
            return next();
        }

        const query = this;
        const model = query.model;
        const modelName = model.modelName;
        
        // Generate cache key based on query
        const cacheKey = generateQueryCacheKey(query, namespace);
        
        // Try to get from cache first
        cacheService.get(cacheKey)
            .then(cachedResult => {
                if (cachedResult !== null) {
                    logger.debug('Query cache hit', { modelName, cacheKey });
                    
                    // Return cached result
                    if (query.op === 'findOne' || query.op === 'findById') {
                        return query.setOptions({ skipCache: true }).then(() => cachedResult);
                    } else {
                        return Promise.resolve(cachedResult);
                    }
                } else {
                    logger.debug('Query cache miss', { modelName, cacheKey });
                    
                    // Execute original query
                    return next().then(result => {
                        // Cache the result
                        if (result !== null && result !== undefined) {
                            cacheService.set(cacheKey, result, ttl)
                                .catch(error => {
                                    logger.error('Error caching query result', { 
                                        modelName, 
                                        cacheKey, 
                                        error: error.message 
                                    });
                                });
                        }
                        return result;
                    });
                }
            })
            .catch(error => {
                logger.error('Error in query cache middleware', { 
                    modelName, 
                    cacheKey, 
                    error: error.message 
                });
                // Fall back to original query on cache error
                return next();
            });
    };
};

/**
 * Generate cache key for Mongoose query
 * @param {Object} query - Mongoose query object
 * @param {string} namespace - Cache namespace
 * @returns {string} Cache key
 */
function generateQueryCacheKey(query, namespace) {
    const model = query.model;
    const modelName = model.modelName;
    const conditions = JSON.stringify(query.getQuery());
    const options = JSON.stringify(query.getOptions());
    const populate = JSON.stringify(query.getPopulatedPaths());
    
    // Create a hash of the query components
    const crypto = require('crypto');
    const queryHash = crypto
        .createHash('md5')
        .update(conditions + options + populate)
        .digest('hex');
    
    return cacheService.generateKey(namespace, `${modelName.toLowerCase()}:${queryHash}`);
}

/**
 * Middleware to automatically invalidate cache on document changes
 * @param {Object} schema - Mongoose schema
 */
export const setupCacheInvalidation = (schema) => {
    // Post-save hook for create and update operations
    schema.post('save', async function(doc) {
        try {
            const modelName = this.constructor.modelName;
            await cacheInvalidationService.invalidateModelCache(modelName, doc, 'save');
        } catch (error) {
            logger.error('Error in post-save cache invalidation', { 
                modelName: this.constructor.modelName,
                error: error.message 
            });
        }
    });

    // Post-remove hook for delete operations
    schema.post('remove', async function(doc) {
        try {
            const modelName = this.constructor.modelName;
            await cacheInvalidationService.invalidateModelCache(modelName, doc, 'remove');
        } catch (error) {
            logger.error('Error in post-remove cache invalidation', { 
                modelName: this.constructor.modelName,
                error: error.message 
            });
        }
    });

    // Post-findOneAndUpdate hook
    schema.post('findOneAndUpdate', async function(doc) {
        try {
            if (doc) {
                const modelName = this.model.modelName;
                await cacheInvalidationService.invalidateModelCache(modelName, doc, 'update');
            }
        } catch (error) {
            logger.error('Error in post-findOneAndUpdate cache invalidation', { 
                modelName: this.model.modelName,
                error: error.message 
            });
        }
    });

    // Post-findOneAndDelete hook
    schema.post('findOneAndDelete', async function(doc) {
        try {
            if (doc) {
                const modelName = this.model.modelName;
                await cacheInvalidationService.invalidateModelCache(modelName, doc, 'delete');
            }
        } catch (error) {
            logger.error('Error in post-findOneAndDelete cache invalidation', { 
                modelName: this.model.modelName,
                error: error.message 
            });
        }
    });

    // Post-updateMany hook
    schema.post('updateMany', async function() {
        try {
            const modelName = this.model.modelName;
            // For bulk operations, invalidate all cache for this model
            await cacheInvalidationService.invalidateNamespace(`query:${modelName.toLowerCase()}`);
        } catch (error) {
            logger.error('Error in post-updateMany cache invalidation', { 
                modelName: this.model.modelName,
                error: error.message 
            });
        }
    });

    // Post-deleteMany hook
    schema.post('deleteMany', async function() {
        try {
            const modelName = this.model.modelName;
            // For bulk operations, invalidate all cache for this model
            await cacheInvalidationService.invalidateNamespace(`query:${modelName.toLowerCase()}`);
        } catch (error) {
            logger.error('Error in post-deleteMany cache invalidation', { 
                modelName: this.model.modelName,
                error: error.message 
            });
        }
    });
};

/**
 * Plugin to add caching to Mongoose schemas
 * @param {Object} schema - Mongoose schema
 * @param {Object} options - Plugin options
 */
export const mongooseCachePlugin = function(schema, options = {}) {
    const {
        ttl = 300,
        namespace = 'query',
        enabled = true,
        autoInvalidate = true
    } = options;

    if (!enabled) {
        return;
    }

    // Add cache method to queries
    schema.query.cache = function(customTTL = ttl, customNamespace = namespace) {
        return this.setOptions({ 
            cache: true, 
            cacheTTL: customTTL,
            cacheNamespace: customNamespace
        });
    };

    // Add pre-hook to handle caching
    schema.pre(['find', 'findOne', 'findById', 'count', 'countDocuments'], function() {
        const options = this.getOptions();
        
        if (options.cache) {
            const cacheTTL = options.cacheTTL || ttl;
            const cacheNamespace = options.cacheNamespace || namespace;
            
            this.setOptions({ skipCache: false });
            return cacheQuery({ ttl: cacheTTL, namespace: cacheNamespace, enabled: true }).call(this);
        }
    });

    // Setup automatic cache invalidation
    if (autoInvalidate) {
        setupCacheInvalidation(schema);
    }
};

/**
 * Express middleware to add caching headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const cacheHeadersMiddleware = (req, res, next) => {
    // Add cache control headers for API responses
    if (req.method === 'GET') {
        res.set({
            'Cache-Control': 'private, max-age=300', // 5 minutes
            'ETag': generateETag(req.originalUrl, req.query),
            'Vary': 'Accept-Encoding, Authorization'
        });
    }
    
    next();
};

/**
 * Generate ETag for response caching
 * @param {string} url - Request URL
 * @param {Object} query - Query parameters
 * @returns {string} ETag value
 */
function generateETag(url, query) {
    const crypto = require('crypto');
    const content = url + JSON.stringify(query);
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Middleware to handle conditional requests (304 Not Modified)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const conditionalRequestMiddleware = (req, res, next) => {
    const ifNoneMatch = req.get('If-None-Match');
    const etag = res.get('ETag');
    
    if (ifNoneMatch && etag && ifNoneMatch === etag) {
        return res.status(304).end();
    }
    
    next();
};

/**
 * Middleware to warm up cache for frequently accessed data
 * @param {Array} models - Array of model names to warm up
 * @returns {Function} Middleware function
 */
export const cacheWarmupMiddleware = (models = []) => {
    return async (req, res, next) => {
        try {
            // Only warm up cache for specific routes or conditions
            if (req.path === '/api/v1/cache/warmup' && req.method === 'POST') {
                const tenantId = req.body.tenantId || req.user?.tenantId;
                
                if (tenantId) {
                    await cacheService.warmupCache(tenantId);
                    logger.info('Cache warmup completed', { tenantId });
                }
            }
            
            next();
        } catch (error) {
            logger.error('Error in cache warmup middleware', { error: error.message });
            next();
        }
    };
};

/**
 * Get cache statistics middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const cacheStatsMiddleware = async (req, res, next) => {
    try {
        const stats = cacheService.getStats();
        req.cacheStats = stats;
        next();
    } catch (error) {
        logger.error('Error getting cache stats', { error: error.message });
        next();
    }
};

export default {
    cacheQuery,
    setupCacheInvalidation,
    mongooseCachePlugin,
    cacheHeadersMiddleware,
    conditionalRequestMiddleware,
    cacheWarmupMiddleware,
    cacheStatsMiddleware
};