/**
 * Model Cache Enhancer Utility
 * Applies caching capabilities to existing Mongoose models
 * Provides automatic cache invalidation and query optimization
 */

import { mongooseCachePlugin } from '../middleware/mongooseCache.middleware.js';
import cacheService from '../services/cacheService.js';
import logger from './logger.js';

/**
 * Enhance existing Mongoose models with caching capabilities
 * @param {Array} models - Array of model objects to enhance
 * @param {Object} options - Caching options
 */
export const enhanceModelsWithCache = (models, options = {}) => {
    const {
        defaultTTL = 300, // 5 minutes
        enabledModels = [], // If empty, enhance all models
        disabledModels = [], // Models to skip
        autoInvalidate = true
    } = options;

    const enhancedModels = [];

    for (const model of models) {
        try {
            const modelName = model.modelName;

            // Skip if model is in disabled list
            if (disabledModels.includes(modelName)) {
                logger.debug('Skipping cache enhancement for disabled model', { modelName });
                continue;
            }

            // Skip if enabledModels is specified and model is not in it
            if (enabledModels.length > 0 && !enabledModels.includes(modelName)) {
                logger.debug('Skipping cache enhancement for non-enabled model', { modelName });
                continue;
            }

            // Apply caching plugin to the model's schema
            const schema = model.schema;
            
            // Check if plugin is already applied
            if (schema.plugins.some(plugin => plugin.fn === mongooseCachePlugin)) {
                logger.debug('Cache plugin already applied to model', { modelName });
                continue;
            }

            // Apply the cache plugin
            schema.plugin(mongooseCachePlugin, {
                ttl: getModelTTL(modelName, defaultTTL),
                namespace: `query:${modelName.toLowerCase()}`,
                enabled: true,
                autoInvalidate
            });

            // Add custom caching methods to the model
            addCustomCachingMethods(model);

            enhancedModels.push(modelName);
            logger.info('Cache enhancement applied to model', { modelName });

        } catch (error) {
            logger.error('Failed to enhance model with cache', { 
                modelName: model.modelName, 
                error: error.message 
            });
        }
    }

    logger.info('Model cache enhancement completed', { 
        enhancedCount: enhancedModels.length,
        enhancedModels 
    });

    return enhancedModels;
};

/**
 * Get appropriate TTL for different model types
 * @param {string} modelName - Model name
 * @param {number} defaultTTL - Default TTL
 * @returns {number} TTL in seconds
 */
function getModelTTL(modelName, defaultTTL) {
    const modelTTLConfig = {
        // User data - medium TTL (users don't change frequently)
        'User': 600, // 10 minutes
        'Department': 1800, // 30 minutes
        'Position': 1800, // 30 minutes
        
        // Tenant data - long TTL (rarely changes)
        'Tenant': 3600, // 1 hour
        'ThemeConfig': 3600, // 1 hour
        
        // License data - medium TTL (important for security)
        'License': 900, // 15 minutes
        
        // Frequently changing data - short TTL
        'Attendance': 180, // 3 minutes
        'Notification': 120, // 2 minutes
        'SystemMetrics': 60, // 1 minute
        'PerformanceMetric': 60, // 1 minute
        
        // Reports and analytics - medium TTL
        'Report': 600, // 10 minutes
        'SystemAlert': 300, // 5 minutes
        
        // Insurance data - medium TTL
        'InsurancePolicy': 600, // 10 minutes
        'InsuranceClaim': 300, // 5 minutes
        'FamilyMember': 600, // 10 minutes
        
        // Audit logs - short TTL (for compliance)
        'AuditLog': 180, // 3 minutes
        'SecurityEvent': 180, // 3 minutes
        
        // Payroll data - medium TTL
        'Payroll': 600, // 10 minutes
        'VacationBalance': 600, // 10 minutes
        
        // Documents - medium TTL
        'Document': 600, // 10 minutes
        'DocumentTemplate': 1800, // 30 minutes
        
        // Communication - short TTL
        'Announcement': 300, // 5 minutes
        'Survey': 600, // 10 minutes
        
        // Tasks and requests - short TTL
        'Task': 300, // 5 minutes
        'Request': 180, // 3 minutes
        'Vacation': 300, // 5 minutes
        'SickLeave': 300, // 5 minutes
        'Mission': 300, // 5 minutes
    };

    return modelTTLConfig[modelName] || defaultTTL;
}

/**
 * Add custom caching methods to a Mongoose model
 * @param {Object} model - Mongoose model
 */
function addCustomCachingMethods(model) {
    const modelName = model.modelName;

    // Add findByIdCached method
    model.findByIdCached = function(id, options = {}) {
        const { ttl = getModelTTL(modelName, 300), tenantId } = options;
        const cacheKey = cacheService.generateKey(
            `model:${modelName.toLowerCase()}`, 
            `id:${id}`, 
            tenantId
        );

        return cacheService.cacheQuery(
            `model:${modelName.toLowerCase()}`,
            `id:${id}`,
            () => this.findById(id),
            ttl,
            tenantId
        );
    };

    // Add findOneCached method
    model.findOneCached = function(conditions, options = {}) {
        const { ttl = getModelTTL(modelName, 300), tenantId } = options;
        const conditionsHash = require('crypto')
            .createHash('md5')
            .update(JSON.stringify(conditions))
            .digest('hex');

        return cacheService.cacheQuery(
            `model:${modelName.toLowerCase()}`,
            `findOne:${conditionsHash}`,
            () => this.findOne(conditions),
            ttl,
            tenantId
        );
    };

    // Add findCached method for lists
    model.findCached = function(conditions = {}, options = {}) {
        const { ttl = getModelTTL(modelName, 300), tenantId, limit = 100 } = options;
        const conditionsHash = require('crypto')
            .createHash('md5')
            .update(JSON.stringify({ conditions, limit }))
            .digest('hex');

        return cacheService.cacheQuery(
            `model:${modelName.toLowerCase()}`,
            `find:${conditionsHash}`,
            () => this.find(conditions).limit(limit),
            ttl,
            tenantId
        );
    };

    // Add countCached method
    model.countCached = function(conditions = {}, options = {}) {
        const { ttl = getModelTTL(modelName, 300), tenantId } = options;
        const conditionsHash = require('crypto')
            .createHash('md5')
            .update(JSON.stringify(conditions))
            .digest('hex');

        return cacheService.cacheQuery(
            `model:${modelName.toLowerCase()}`,
            `count:${conditionsHash}`,
            () => this.countDocuments(conditions),
            ttl,
            tenantId
        );
    };

    // Add aggregateCached method
    model.aggregateCached = function(pipeline, options = {}) {
        const { ttl = getModelTTL(modelName, 300), tenantId } = options;
        const pipelineHash = require('crypto')
            .createHash('md5')
            .update(JSON.stringify(pipeline))
            .digest('hex');

        return cacheService.cacheQuery(
            `model:${modelName.toLowerCase()}`,
            `aggregate:${pipelineHash}`,
            () => this.aggregate(pipeline),
            ttl,
            tenantId
        );
    };

    logger.debug('Custom caching methods added to model', { modelName });
}

/**
 * Enhance specific models with tenant-aware caching
 * @param {Array} modelNames - Array of model names to enhance
 * @param {Object} mongoose - Mongoose instance
 * @param {Object} options - Enhancement options
 */
export const enhanceSpecificModels = (modelNames, mongoose, options = {}) => {
    const models = [];
    
    for (const modelName of modelNames) {
        try {
            const model = mongoose.model(modelName);
            models.push(model);
        } catch (error) {
            logger.warn('Model not found for cache enhancement', { modelName, error: error.message });
        }
    }

    return enhanceModelsWithCache(models, options);
};

/**
 * Get cache-enhanced query builder for a model
 * @param {Object} model - Mongoose model
 * @param {Object} options - Query options
 * @returns {Object} Enhanced query builder
 */
export const getCachedQueryBuilder = (model, options = {}) => {
    const { tenantId, ttl } = options;
    
    return {
        // Cached find operations
        findById: (id) => model.findByIdCached(id, { ttl, tenantId }),
        findOne: (conditions) => model.findOneCached(conditions, { ttl, tenantId }),
        find: (conditions, limit) => model.findCached(conditions, { ttl, tenantId, limit }),
        count: (conditions) => model.countCached(conditions, { ttl, tenantId }),
        aggregate: (pipeline) => model.aggregateCached(pipeline, { ttl, tenantId }),
        
        // Non-cached operations (for writes)
        create: (data) => model.create(data),
        updateOne: (conditions, update) => model.updateOne(conditions, update),
        updateMany: (conditions, update) => model.updateMany(conditions, update),
        deleteOne: (conditions) => model.deleteOne(conditions),
        deleteMany: (conditions) => model.deleteMany(conditions),
        
        // Direct model access
        model
    };
};

/**
 * Warm up cache for frequently accessed data
 * @param {string} tenantId - Tenant ID
 * @param {Array} modelNames - Models to warm up
 * @param {Object} mongoose - Mongoose instance
 */
export const warmupModelCache = async (tenantId, modelNames, mongoose) => {
    logger.info('Starting model cache warmup', { tenantId, modelNames });
    
    const warmupPromises = modelNames.map(async (modelName) => {
        try {
            const model = mongoose.model(modelName);
            
            // Warm up common queries based on model type
            switch (modelName) {
                case 'User':
                    await model.findCached({ tenantId, status: 'active' }, { tenantId, limit: 100 });
                    await model.countCached({ tenantId }, { tenantId });
                    break;
                    
                case 'Department':
                    await model.findCached({ tenantId }, { tenantId, limit: 50 });
                    break;
                    
                case 'Position':
                    await model.findCached({ tenantId }, { tenantId, limit: 50 });
                    break;
                    
                case 'Tenant':
                    await model.findByIdCached(tenantId, { tenantId });
                    break;
                    
                default:
                    // Generic warmup for other models
                    await model.countCached({ tenantId }, { tenantId });
                    break;
            }
            
            logger.debug('Model cache warmed up', { modelName, tenantId });
        } catch (error) {
            logger.error('Error warming up model cache', { 
                modelName, 
                tenantId, 
                error: error.message 
            });
        }
    });
    
    await Promise.allSettled(warmupPromises);
    logger.info('Model cache warmup completed', { tenantId, modelNames });
};

export default {
    enhanceModelsWithCache,
    enhanceSpecificModels,
    getCachedQueryBuilder,
    warmupModelCache
};