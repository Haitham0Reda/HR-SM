import mongoose from 'mongoose';
import { getOptimizedConnectionOptions, optimizeDatabase } from './databaseOptimization.js';

export const connectDatabase = async () => {
    try {
        // Use optimized connection options for enhanced performance
        const options = getOptimizedConnectionOptions();

        const conn = await mongoose.connect(process.env.MONGODB_URI, options);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
        console.log(`Connection state: ${getConnectionState(conn.connection.readyState)}`);

        // Enhanced connection event handlers
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected successfully');
        });

        mongoose.connection.on('connecting', () => {
            console.log('MongoDB connecting...');
        });

        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });

        // Run database optimization after successful connection
        if (process.env.NODE_ENV !== 'test') {
            setTimeout(async () => {
                try {
                    console.log('🔧 Running database optimization...');
                    const result = await optimizeDatabase();
                    console.log(`✅ Database optimization completed: ${result.totalIndexes} indexes created`);
                } catch (error) {
                    console.error('⚠️  Database optimization failed:', error.message);
                }
            }, 5000); // Wait 5 seconds after connection to run optimization
        }

        return conn;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);

        // Retry connection after delay
        console.log('Retrying connection in 5 seconds...');
        setTimeout(() => {
            connectDatabase();
        }, 5000);
    }
};

// Helper function to get readable connection state
const getConnectionState = (state) => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[state] || 'unknown';
};

// Function to check database health
export const checkDatabaseHealth = async () => {
    try {
        const state = mongoose.connection.readyState;

        if (state === 1) {
            // Test the connection with a ping
            await mongoose.connection.db.admin().ping();
            return {
                status: 'healthy',
                state: getConnectionState(state),
                host: mongoose.connection.host,
                database: mongoose.connection.name
            };
        } else {
            return {
                status: 'unhealthy',
                state: getConnectionState(state),
                message: 'Database not connected'
            };
        }
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
};

export default connectDatabase;
