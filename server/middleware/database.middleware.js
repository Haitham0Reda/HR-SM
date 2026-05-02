/**
 * Database Operation Logging Middleware
 * Logs database operations with performance metrics and security analysis
 * 
 * Requirements: 1.3, 7.4
 * 
 * NOTE: This middleware was designed for Mongoose/MongoDB.
 * It needs to be completely rewritten for Sequelize/PostgreSQL.
 * Currently disabled to allow server startup.
 */

import { getLoggerForTenant } from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';

/**
 * Database operation logging middleware
 * DISABLED: Needs complete Sequelize rewrite
 */
class DatabaseLoggingMiddleware {
    constructor() {
        this.isInitialized = false;
        this.operationCounts = new Map();
        this.slowQueryThreshold = 1000;
        this.sensitiveCollections = [
            'users', 'employees', 'payroll', 'salaries', 
            'personalinfo', 'medicalrecords', 'licenses'
        ];
    }

    /**
     * Initialize database logging middleware
     * DISABLED: Needs Sequelize rewrite
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.warn('Database logging middleware is disabled - needs Sequelize rewrite');
        this.isInitialized = true;
        platformLogger.info('Database logging middleware initialized (disabled - needs migration)');
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
