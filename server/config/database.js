/**
 * PostgreSQL Database Configuration
 * 
 * Manages connections to two separate PostgreSQL databases:
 * 1. License Server Database (hrsm-licenses) - stores license information and tenant metadata
 * 2. Main Application Database (hrsm_platform) - stores HR business data for all tenants
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
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
        max: parseInt(process.env.PG_MAX_POOL_SIZE) || 20,
        min: parseInt(process.env.PG_MIN_POOL_SIZE) || 5,
        acquire: parseInt(process.env.PG_CONNECTION_TIMEOUT) || 30000,
        idle: parseInt(process.env.PG_IDLE_TIMEOUT) || 10000
    },
    timezone: '+00:00', // UTC
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
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

        // Authenticate Main Application Database
        await mainAppDb.authenticate();
        console.log('✓ Main Application PostgreSQL connected');
        console.log(`  Host: ${mainAppDb.config.host}`);
        console.log(`  Database: ${mainAppDb.config.database}`);
        console.log(`  Pool: max=${mainAppDb.config.pool.max}, min=${mainAppDb.config.pool.min}`);

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
    // License Server Database events
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

    // Main Application Database events
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
};

/**
 * Set up graceful shutdown handlers
 */
const setupGracefulShutdown = () => {
    const shutdown = async (signal) => {
        console.log(`\n${signal} received. Closing database connections...`);
        
        try {
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
            poolAvailable: licenseServerDb.connectionManager.pool.available
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
            poolAvailable: mainAppDb.connectionManager.pool.available
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

export default connectDatabases;
