import mongoose from 'mongoose';
import { logger } from '../logging/logger.js';
import { initializeDatabaseLogging } from '../../middleware/database.middleware.js';

/**
 * Establishes a connection to MongoDB
 * @returns {Promise<void>}
 */
export const connectDatabase = async () => {
    try {
        const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';

        // Parse the connection string to remove unsupported options
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4, skip trying IPv6
            // Remove buffermaxentries from the connection string if present
            ...(DB_URI.includes('buffermaxentries') && {
                // This will ensure the option is not passed to the driver
            })
        };

        // Clean the connection string if it contains buffermaxentries
        const cleanUri = DB_URI.replace(/[?&]buffermaxentries=[^&]*/g, '');

        await mongoose.connect(cleanUri, connectionOptions);

        logger.info('✅ MongoDB connection established');
        
        // Initialize database operation logging
        initializeDatabaseLogging();
        logger.info('✅ Database logging middleware initialized');

        // Log database connection events
        mongoose.connection.on('connected', () => {
            logger.info('Mongoose connected to DB');
        });

        mongoose.connection.on('error', (err) => {
            logger.error(`Mongoose connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Mongoose disconnected from DB');
        });

    } catch (error) {
        logger.error('❌ MongoDB connection error:', error);
        throw error;
    }
};

/**
 * Closes the MongoDB connection
 * @returns {Promise<void>}
 */
export const closeDatabase = async () => {
    try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
    } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        throw error;
    }
};

/**
 * Drops the entire database
 * WARNING: Only use in development or testing
 * @returns {Promise<void>}
 */
export const dropDatabase = async () => {
    if (process.env.NODE_ENV === 'test') {
        await mongoose.connection.dropDatabase();
        logger.warn('Database dropped (test environment)');
    } else {
        throw new Error('Database can only be dropped in test environment');
    }
};
