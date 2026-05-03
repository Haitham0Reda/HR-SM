/**
 * PostgreSQL Database Configuration
 * 
 * Manages connections to two separate PostgreSQL databases:
 * 1. License Server Database (hrsm-licenses) - stores license information and tenant metadata
 * 2. Main Application Database (hrsm_platform) - stores HR business data for all tenants
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import { configureSequelizeLogging } from '../utils/sequelizeLogger.js';

// Load environment variables
dotenv.config();

/**
 * Get SSL configuration based on environment variables
 * Supports custom SSL certificates for secure connections
 * @returns {Object|boolean} SSL configuration object or false
 */
const getSSLConfig = () => {
    // If PG_SSL_ENABLED is explicitly set to true, use custom SSL configuration
    if (process.env.PG_SSL_ENABLED === 'true') {
        const sslConfig = {
            require: true,
            rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false'
        };

        // Add custom SSL certificates if provided
        if (process.env.PG_SSL_CA_PATH) {
            try {
                sslConfig.ca = fs.readFileSync(process.env.PG_SSL_CA_PATH).toString();
            } catch (error) {
                console.warn(`Warning: Could not read SSL CA certificate from ${process.env.PG_SSL_CA_PATH}`);
            }
        }

        if (process.env.PG_SSL_KEY_PATH) {
            try {
                sslConfig.key = fs.readFileSync(process.env.PG_SSL_KEY_PATH).toString();
            } catch (error) {
                console.warn(`Warning: Could not read SSL key from ${process.env.PG_SSL_KEY_PATH}`);
            }
        }

        if (process.env.PG_SSL_CERT_PATH) {
            try {
                sslConfig.cert = fs.readFileSync(process.env.PG_SSL_CERT_PATH).toString();
            } catch (error) {
                console.warn(`Warning: Could not read SSL certificate from ${process.env.PG_SSL_CERT_PATH}`);
            }
        }

        return sslConfig;
    }

    // Default: Enable SSL in production with basic configuration
    if (process.env.NODE_ENV === 'production') {
        return {
            require: true,
            rejectUnauthorized: false
        };
    }

    // Development: No SSL
    return false;
};

// License Server Database Connection
export const licenseServerDb = new Sequelize(process.env.LICENSE_DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: parseInt(process.env.PG_MAX_POOL_SIZE) || 10,
        min: parseInt(process.env.PG_MIN_POOL_SIZE) || 2,
        acquire: parseInt(process.env.PG_CONNECTION_TIMEOUT) || 30000,
        idle: parseInt(process.env.PG_IDLE_TIMEOUT) || 10000
    },
    timezone: '+00:00', // UTC
    dialectOptions: {
        ssl: getSSLConfig()
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});

// Main Application Database Connection
export const mainAppDb = new Sequelize(process.env.MAIN_DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 20,
        min: 2,
        acquire: 30000,
        idle: 10000
    },
    timezone: '+00:00', // UTC
    dialectOptions: {
        ssl: getSSLConfig()
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});

/**
 * Connect to both PostgreSQL databases
 * @returns {Promise<void>}
 */
export const connectDatabases = async () => {
    try {
        console.log('Connecting to PostgreSQL databases...');

        // Authenticate License Server Database
        await licenseServerDb.authenticate();
        console.log('✓ License Server PostgreSQL connected');
        console.log(`  Host: ${licenseServerDb.config.host}`);
        console.log(`  Database: ${licenseServerDb.config.database}`);
        console.log(`  Pool: max=${licenseServerDb.config.pool.max}, min=${licenseServerDb.config.pool.min}`);
        console.log(`  SSL: ${licenseServerDb.config.dialectOptions.ssl ? 'enabled' : 'disabled'}`);

        // Authenticate Main Application Database
        await mainAppDb.authenticate();
        console.log('✓ Main Application PostgreSQL connected');
        console.log(`  Host: ${mainAppDb.config.host}`);
        console.log(`  Database: ${mainAppDb.config.database}`);
        console.log(`  Pool: max=${mainAppDb.config.pool.max}, min=${mainAppDb.config.pool.min}`);
        console.log(`  SSL: ${mainAppDb.config.dialectOptions.ssl ? 'enabled' : 'disabled'}`);

        // Configure logging for both databases
        try {
            configureSequelizeLogging(licenseServerDb, 'licenseServer');
            configureSequelizeLogging(mainAppDb, 'mainApp');
        } catch (error) {
            console.warn('Warning: Could not configure Sequelize logging:', error.message);
        }

        // Register pools for monitoring (optional)
        try {
            const { connectionPoolMonitor } = await import('../monitoring/connectionPoolMonitor.js');
            const { performanceMonitor } = await import('../monitoring/performanceMonitor.js');
            
            connectionPoolMonitor.registerPool('licenseServer', licenseServerDb);
            connectionPoolMonitor.registerPool('mainApp', mainAppDb);

            // Start monitoring if enabled
            if (process.env.ENABLE_PERFORMANCE_MONITORING !== 'false') {
                performanceMonitor.startMonitoring(
                    parseInt(process.env.PERFORMANCE_MONITORING_INTERVAL) || 60000
                );
                connectionPoolMonitor.startMonitoring();
                console.log('✓ Performance monitoring enabled');
            }
        } catch (error) {
            console.warn('Warning: Performance monitoring not available:', error.message);
        }

        // Set up connection event handlers
        setupConnectionHandlers();

        // Graceful shutdown
        setupGracefulShutdown();

        console.log('✓ All PostgreSQL databases connected successfully');
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        console.error('  Please check your database configuration and ensure PostgreSQL is running');
        throw error;
    }
};

/**
 * Set up connection event handlers for monitoring
 */
const setupConnectionHandlers = () => {
    try {
        // License Server Database events
        if (licenseServerDb.connectionManager?.pool?.on) {
            licenseServerDb.connectionManager.pool.on('acquire', () => {
                if (process.env.LOG_LEVEL === 'debug') {
                    console.log('License Server DB: Connection acquired from pool');
                }
            });

            licenseServerDb.connectionManager.pool.on('release', () => {
                if (process.env.LOG_LEVEL === 'debug') {
                    console.log('License Server DB: Connection released back to pool');
                }
            });
        }

        // Main Application Database events
        if (mainAppDb.connectionManager?.pool?.on) {
            mainAppDb.connectionManager.pool.on('acquire', () => {
                if (process.env.LOG_LEVEL === 'debug') {
                    console.log('Main App DB: Connection acquired from pool');
                }
            });

            mainAppDb.connectionManager.pool.on('release', () => {
                if (process.env.LOG_LEVEL === 'debug') {
                    console.log('Main App DB: Connection released back to pool');
                }
            });
        }
    } catch (error) {
        // Connection pool events not available, skip
        if (process.env.LOG_LEVEL === 'debug') {
            console.log('Connection pool events not available');
        }
    }
};

/**
 * Set up graceful shutdown handlers
 */
const setupGracefulShutdown = () => {
    const shutdown = async (signal) => {
        console.log(`\n${signal} received. Closing database connections...`);
        
        try {
            // Stop monitoring (if available)
            try {
                const { connectionPoolMonitor } = await import('../monitoring/connectionPoolMonitor.js');
                const { performanceMonitor } = await import('../monitoring/performanceMonitor.js');
                
                if (performanceMonitor.isMonitoring) {
                    performanceMonitor.stopMonitoring();
                }
                if (connectionPoolMonitor.isMonitoring) {
                    connectionPoolMonitor.stopMonitoring();
                }
            } catch (error) {
                // Monitoring not available, skip
            }

            await licenseServerDb.close();
            console.log('✓ License Server database connection closed');
            
            await mainAppDb.close();
            console.log('✓ Main Application database connection closed');
            
            console.log('✓ All database connections closed successfully');
            process.exit(0);
        } catch (err) {
            console.error('✗ Error closing database connections:', err);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
};

/**
 * Check health of both databases
 * @returns {Promise<Object>}
 */
export const checkDatabaseHealth = async () => {
    const health = {
        licenseServer: { status: 'unknown' },
        mainApp: { status: 'unknown' },
        overall: 'unhealthy'
    };

    try {
        // Check License Server Database
        await licenseServerDb.authenticate();
        health.licenseServer = {
            status: 'healthy',
            host: licenseServerDb.config.host,
            database: licenseServerDb.config.database,
            poolSize: licenseServerDb.connectionManager.pool.size,
            poolAvailable: licenseServerDb.connectionManager.pool.available,
            ssl: licenseServerDb.config.dialectOptions.ssl ? 'enabled' : 'disabled'
        };
    } catch (error) {
        health.licenseServer = {
            status: 'unhealthy',
            error: error.message
        };
    }

    try {
        // Check Main Application Database
        await mainAppDb.authenticate();
        health.mainApp = {
            status: 'healthy',
            host: mainAppDb.config.host,
            database: mainAppDb.config.database,
            poolSize: mainAppDb.connectionManager.pool.size,
            poolAvailable: mainAppDb.connectionManager.pool.available,
            ssl: mainAppDb.config.dialectOptions.ssl ? 'enabled' : 'disabled'
        };
    } catch (error) {
        health.mainApp = {
            status: 'unhealthy',
            error: error.message
        };
    }

    // Overall health is healthy only if both databases are healthy
    health.overall = (health.licenseServer.status === 'healthy' && health.mainApp.status === 'healthy') 
        ? 'healthy' 
        : 'unhealthy';

    return health;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use connectDatabases() instead
 */
export const connectDatabase = async () => {
    console.warn('Warning: connectDatabase() is deprecated. Use connectDatabases() instead.');
    return await connectDatabases();
};

// Default export for backward compatibility (points to mainAppDb)
export default mainAppDb;
