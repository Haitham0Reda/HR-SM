import mongoose from 'mongoose';

export const connectDatabase = async () => {
    try {
        // Enhanced connection options for stability
        const options = {
            // Connection pool settings
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2,  // Minimum number of connections in the pool
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            
            // Timeout settings
            serverSelectionTimeoutMS: 5000, // How long to try selecting a server
            socketTimeoutMS: 45000, // How long to wait for a response
            connectTimeoutMS: 10000, // How long to wait for initial connection
            
            // Retry settings
            retryWrites: true,
            retryReads: true,
            
            // Buffer settings
            bufferMaxEntries: 0, // Disable mongoose buffering
            bufferCommands: false, // Disable mongoose buffering
            
            // Heartbeat settings
            heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
            
            // Write concern
            w: 'majority',
            
            // Read preference
            readPreference: 'primary',
            
            // Compression
            compressors: ['zlib'],
        };

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
