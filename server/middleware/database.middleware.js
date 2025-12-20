/**
 * Database Operation Logging Middleware
 * Logs database operations with performance metrics and security analysis
 * 
 * Requirements: 1.3, 7.4
 */

import mongoose from 'mongoose';
import { getLoggerForTenant } from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';
import backendSecurityDetectionService from '../services/backendSecurityDetection.service.js';

/**
 * Database operation logging middleware
 * Intercepts Mongoose operations to log database activities
 */
class DatabaseLoggingMiddleware {
    constructor() {
        this.isInitialized = false;
        this.operationCounts = new Map(); // Track operations per tenant
        this.slowQueryThreshold = 1000; // 1 second
        this.sensitiveCollections = [
            'users', 'employees', 'payroll', 'salaries', 
            'personalinfo', 'medicalrecords', 'licenses'
        ];
    }

    /**
     * Initialize database logging middleware
     */
    initialize() {
        if (this.isInitialized) return;

        // Add pre and post hooks for all operations
        this.addQueryHooks();
        this.addAggregateHooks();
        this.addDocumentHooks();
        
        this.isInitialized = true;
        platformLogger.info('Database logging middleware initialized');
    }

    /**
     * Add hooks for query operations (find, findOne, etc.)
     */
    addQueryHooks() {
        const queryOperations = [
            'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 
            'findOneAndReplace', 'count', 'countDocuments', 'distinct'
        ];

        queryOperations.forEach(operation => {
            mongoose.Query.prototype[`_original_${operation}`] = mongoose.Query.prototype[operation];
            
            mongoose.Query.prototype[operation] = function(...args) {
                const startTime = Date.now();
                const query = this.getQuery();
                const collection = this.model.collection.name;
                const tenantId = this.getOptions().tenantId || query.tenantId;
                
                // Log query start
                this._logQueryStart(operation, collection, query, tenantId);
                
                // Execute original operation
                const result = this[`_original_${operation}`](...args);
                
                // If result is a promise, add completion logging
                if (result && typeof result.then === 'function') {
                    return result.then(
                        (data) => {
                            this._logQueryComplete(operation, collection, query, tenantId, startTime, data, null);
                            return data;
                        },
                        (error) => {
                            this._logQueryComplete(operation, collection, query, tenantId, startTime, null, error);
                            throw error;
                        }
                    );
                } else {
                    // Synchronous operation
                    this._logQueryComplete(operation, collection, query, tenantId, startTime, result, null);
                    return result;
                }
            };
        });
    }

    /**
     * Add hooks for aggregation operations
     */
    addAggregateHooks() {
        const originalAggregate = mongoose.Model.aggregate;
        
        mongoose.Model.aggregate = function(pipeline, options = {}) {
            const startTime = Date.now();
            const collection = this.collection.name;
            const tenantId = options.tenantId;
            
            // Log aggregation start
            this._logAggregationStart(collection, pipeline, tenantId);
            
            const result = originalAggregate.call(this, pipeline, options);
            
            if (result && typeof result.then === 'function') {
                return result.then(
                    (data) => {
                        this._logAggregationComplete(collection, pipeline, tenantId, startTime, data, null);
                        return data;
                    },
                    (error) => {
                        this._logAggregationComplete(collection, pipeline, tenantId, startTime, null, error);
                        throw error;
                    }
                );
            }
            
            return result;
        };
    }

    /**
     * Add hooks for document operations (save, remove, etc.)
     */
    addDocumentHooks() {
        // Pre-save hook
        mongoose.Schema.add({}, { 
            pre: function(operation, next) {
                if (['save', 'remove', 'deleteOne'].includes(operation)) {
                    this._operationStartTime = Date.now();
                    this._logDocumentOperation(operation, 'start');
                }
                next();
            }
        });

        // Post-save hook
        mongoose.Schema.add({}, {
            post: function(operation, doc, next) {
                if (['save', 'remove', 'deleteOne'].includes(operation)) {
                    this._logDocumentOperation(operation, 'complete', doc);
                }
                if (next) next();
            }
        });
    }

    /**
     * Log query operation start
     */
    _logQueryStart(operation, collection, query, tenantId) {
        const logData = {
            eventType: 'database_operation_start',
            operation,
            collection,
            query: this._sanitizeQuery(query),
            tenantId,
            timestamp: new Date().toISOString()
        };

        this._logToAppropriateLogger(logData, tenantId);
    }

    /**
     * Log query operation completion
     */
    _logQueryComplete(operation, collection, query, tenantId, startTime, result, error) {
        const executionTime = Date.now() - startTime;
        const isSlowQuery = executionTime > this.slowQueryThreshold;
        const isSensitiveCollection = this.sensitiveCollections.includes(collection.toLowerCase());
        
        const logData = {
            eventType: 'database_operation_complete',
            operation,
            collection,
            query: this._sanitizeQuery(query),
            tenantId,
            executionTime,
            isSlowQuery,
            isSensitiveCollection,
            success: !error,
            error: error ? error.message : null,
            resultCount: this._getResultCount(result),
            timestamp: new Date().toISOString()
        };

        // Add performance metrics
        logData.performance = {
            executionTime,
            isSlowQuery,
            memoryUsage: process.memoryUsage()
        };

        // Log sensitive data access
        if (isSensitiveCollection && !error) {
            logData.sensitiveDataAccess = {
                dataType: collection,
                operation,
                recordsAccessed: this._getResultCount(result),
                queryPattern: this._getQueryPattern(query)
            };
        }

        this._logToAppropriateLogger(logData, tenantId);

        // Analyze for security threats
        this._analyzeSecurityThreats(operation, collection, query, tenantId, executionTime);

        // Track operation counts
        this._trackOperationCount(tenantId, operation);

        // Log slow queries to platform logger
        if (isSlowQuery) {
            platformLogger.systemPerformance({
                eventType: 'slow_database_query',
                collection,
                operation,
                executionTime,
                tenantId,
                query: this._sanitizeQuery(query)
            });
        }
    }

    /**
     * Log aggregation operation start
     */
    _logAggregationStart(collection, pipeline, tenantId) {
        const logData = {
            eventType: 'database_aggregation_start',
            operation: 'aggregate',
            collection,
            pipeline: this._sanitizePipeline(pipeline),
            tenantId,
            timestamp: new Date().toISOString()
        };

        this._logToAppropriateLogger(logData, tenantId);
    }

    /**
     * Log aggregation operation completion
     */
    _logAggregationComplete(collection, pipeline, tenantId, startTime, result, error) {
        const executionTime = Date.now() - startTime;
        const isSlowQuery = executionTime > this.slowQueryThreshold;
        const isSensitiveCollection = this.sensitiveCollections.includes(collection.toLowerCase());

        const logData = {
            eventType: 'database_aggregation_complete',
            operation: 'aggregate',
            collection,
            pipeline: this._sanitizePipeline(pipeline),
            tenantId,
            executionTime,
            isSlowQuery,
            isSensitiveCollection,
            success: !error,
            error: error ? error.message : null,
            resultCount: this._getResultCount(result),
            timestamp: new Date().toISOString()
        };

        this._logToAppropriateLogger(logData, tenantId);

        // Track operation counts
        this._trackOperationCount(tenantId, 'aggregate');
    }

    /**
     * Log document operation
     */
    _logDocumentOperation(operation, phase, doc = null) {
        const collection = this.collection?.name || 'unknown';
        const tenantId = this.tenantId || doc?.tenantId;
        const executionTime = phase === 'complete' ? Date.now() - (this._operationStartTime || Date.now()) : 0;

        const logData = {
            eventType: `database_document_${phase}`,
            operation,
            collection,
            tenantId,
            documentId: doc?._id?.toString(),
            executionTime: phase === 'complete' ? executionTime : undefined,
            timestamp: new Date().toISOString()
        };

        // Add sensitive data context for document operations
        if (phase === 'complete' && this.sensitiveCollections.includes(collection.toLowerCase())) {
            logData.sensitiveDataAccess = {
                dataType: collection,
                operation,
                recordsAffected: 1,
                documentId: doc?._id?.toString()
            };
        }

        this._logToAppropriateLogger(logData, tenantId);

        if (phase === 'complete') {
            this._trackOperationCount(tenantId, operation);
        }
    }

    /**
     * Analyze database operations for security threats
     */
    _analyzeSecurityThreats(operation, collection, query, tenantId, executionTime) {
        try {
            // Convert query to string for analysis
            const queryString = JSON.stringify(query);
            
            // Analyze for SQL injection patterns (even in NoSQL)
            const threats = backendSecurityDetectionService.analyzeDatabaseOperation(
                operation,
                queryString,
                null, // userId - not available in this context
                tenantId,
                executionTime
            );

            if (threats.length > 0) {
                const logger = tenantId ? getLoggerForTenant(tenantId) : platformLogger;
                logger.security('Database security threats detected', {
                    operation,
                    collection,
                    query: this._sanitizeQuery(query),
                    threats,
                    tenantId,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            platformLogger.warn('Database security analysis failed', {
                error: error.message,
                operation,
                collection,
                tenantId
            });
        }
    }

    /**
     * Track operation counts per tenant
     */
    _trackOperationCount(tenantId, operation) {
        const key = `${tenantId || 'platform'}_${operation}`;
        const current = this.operationCounts.get(key) || 0;
        this.operationCounts.set(key, current + 1);

        // Log high operation counts
        if (current > 0 && current % 1000 === 0) {
            platformLogger.systemPerformance({
                eventType: 'high_database_operation_count',
                tenantId,
                operation,
                count: current,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Log to appropriate logger based on tenant context
     */
    _logToAppropriateLogger(logData, tenantId) {
        if (tenantId) {
            const logger = getLoggerForTenant(tenantId);
            
            // Determine log level based on event type and data
            if (logData.error) {
                logger.error('Database operation error', logData);
            } else if (logData.isSlowQuery || logData.isSensitiveCollection) {
                logger.warn('Database operation warning', logData);
            } else {
                logger.info('Database operation', logData);
            }
        } else {
            // Platform-level operation
            if (logData.error) {
                platformLogger.error('Platform database operation error', logData);
            } else {
                platformLogger.info('Platform database operation', logData);
            }
        }
    }

    /**
     * Sanitize query for logging (remove sensitive data)
     */
    _sanitizeQuery(query) {
        if (!query || typeof query !== 'object') return query;

        const sanitized = { ...query };
        const sensitiveFields = ['password', 'token', 'secret', 'ssn', 'creditCard', 'bankAccount'];

        const sanitizeObject = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;

            const result = Array.isArray(obj) ? [] : {};
            
            for (const [key, value] of Object.entries(obj)) {
                if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    result[key] = '[REDACTED]';
                } else if (typeof value === 'object' && value !== null) {
                    result[key] = sanitizeObject(value);
                } else {
                    result[key] = value;
                }
            }
            
            return result;
        };

        return sanitizeObject(sanitized);
    }

    /**
     * Sanitize aggregation pipeline for logging
     */
    _sanitizePipeline(pipeline) {
        if (!Array.isArray(pipeline)) return pipeline;

        return pipeline.map(stage => {
            if (typeof stage === 'object' && stage !== null) {
                return this._sanitizeQuery(stage);
            }
            return stage;
        });
    }

    /**
     * Get result count from query result
     */
    _getResultCount(result) {
        if (!result) return 0;
        if (Array.isArray(result)) return result.length;
        if (typeof result === 'object' && result.length !== undefined) return result.length;
        return 1;
    }

    /**
     * Get query pattern for analysis
     */
    _getQueryPattern(query) {
        if (!query || typeof query !== 'object') return 'simple';

        const keys = Object.keys(query);
        if (keys.length === 0) return 'empty';
        if (keys.length === 1) return 'single_field';
        if (keys.includes('$or') || keys.includes('$and')) return 'complex_logical';
        if (keys.some(key => key.startsWith('$'))) return 'operator_query';
        return 'multi_field';
    }

    /**
     * Get operation statistics
     */
    getOperationStats(tenantId = null) {
        const stats = {};
        
        for (const [key, count] of this.operationCounts.entries()) {
            const [keyTenantId, operation] = key.split('_');
            
            if (tenantId && keyTenantId !== tenantId) continue;
            if (!tenantId && keyTenantId === 'platform') continue;
            
            if (!stats[operation]) stats[operation] = 0;
            stats[operation] += count;
        }
        
        return stats;
    }

    /**
     * Clear operation statistics
     */
    clearStats(tenantId = null) {
        if (tenantId) {
            for (const key of this.operationCounts.keys()) {
                if (key.startsWith(`${tenantId}_`)) {
                    this.operationCounts.delete(key);
                }
            }
        } else {
            this.operationCounts.clear();
        }
    }

    /**
     * Set slow query threshold
     */
    setSlowQueryThreshold(threshold) {
        this.slowQueryThreshold = threshold;
        platformLogger.info(`Database slow query threshold set to ${threshold}ms`);
    }

    /**
     * Add sensitive collection
     */
    addSensitiveCollection(collectionName) {
        if (!this.sensitiveCollections.includes(collectionName.toLowerCase())) {
            this.sensitiveCollections.push(collectionName.toLowerCase());
            platformLogger.info(`Added sensitive collection: ${collectionName}`);
        }
    }

    /**
     * Remove sensitive collection
     */
    removeSensitiveCollection(collectionName) {
        const index = this.sensitiveCollections.indexOf(collectionName.toLowerCase());
        if (index > -1) {
            this.sensitiveCollections.splice(index, 1);
            platformLogger.info(`Removed sensitive collection: ${collectionName}`);
        }
    }
}

// Create singleton instance
const databaseLoggingMiddleware = new DatabaseLoggingMiddleware();

/**
 * Express middleware to add database logging context to requests
 */
export function addDatabaseLoggingContext(req, res, next) {
    // Add tenant context to database operations
    if (req.tenantId) {
        // Store tenant context for database operations
        req.dbContext = {
            tenantId: req.tenantId,
            userId: req.user?.id,
            correlationId: req.correlationId,
            sessionId: req.sessionID || req.headers['x-session-id']
        };
    }
    
    next();
}

/**
 * Initialize database logging middleware
 */
export function initializeDatabaseLogging() {
    databaseLoggingMiddleware.initialize();
}

/**
 * Get database operation statistics
 */
export function getDatabaseStats(tenantId = null) {
    return databaseLoggingMiddleware.getOperationStats(tenantId);
}

/**
 * Clear database operation statistics
 */
export function clearDatabaseStats(tenantId = null) {
    return databaseLoggingMiddleware.clearStats(tenantId);
}

/**
 * Configure database logging settings
 */
export function configureDatabaseLogging(options = {}) {
    if (options.slowQueryThreshold) {
        databaseLoggingMiddleware.setSlowQueryThreshold(options.slowQueryThreshold);
    }
    
    if (options.sensitiveCollections) {
        options.sensitiveCollections.forEach(collection => {
            databaseLoggingMiddleware.addSensitiveCollection(collection);
        });
    }
}

export default {
    addDatabaseLoggingContext,
    initializeDatabaseLogging,
    getDatabaseStats,
    clearDatabaseStats,
    configureDatabaseLogging
};