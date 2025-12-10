import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Database Connection Monitor
 * Monitors database connection health and provides reconnection logic
 */
class DatabaseMonitor {
    constructor() {
        this.isMonitoring = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000; // 5 seconds
        this.healthCheckInterval = 30000; // 30 seconds
        this.healthCheckTimer = null;
        this.connectionMetrics = {
            totalConnections: 0,
            totalDisconnections: 0,
            totalReconnections: 0,
            lastConnected: null,
            lastDisconnected: null,
            uptime: 0
        };
    }

    /**
     * Start monitoring database connection
     */
    startMonitoring() {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        logger.info('Database monitor started');

        // Set up event listeners
        this.setupEventListeners();

        // Start periodic health checks
        this.startHealthChecks();
    }

    /**
     * Stop monitoring database connection
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }

        logger.info('Database monitor stopped');
    }

    /**
     * Set up mongoose event listeners
     */
    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            this.connectionMetrics.totalConnections++;
            this.connectionMetrics.lastConnected = new Date();
            this.reconnectAttempts = 0;
            
            logger.info('Database connected', {
                host: mongoose.connection.host,
                database: mongoose.connection.name,
                totalConnections: this.connectionMetrics.totalConnections
            });
        });

        mongoose.connection.on('disconnected', () => {
            this.connectionMetrics.totalDisconnections++;
            this.connectionMetrics.lastDisconnected = new Date();
            
            logger.warn('Database disconnected', {
                totalDisconnections: this.connectionMetrics.totalDisconnections,
                reconnectAttempts: this.reconnectAttempts
            });

            // Attempt reconnection if monitoring is active
            if (this.isMonitoring && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnection();
            }
        });

        mongoose.connection.on('reconnected', () => {
            this.connectionMetrics.totalReconnections++;
            this.reconnectAttempts = 0;
            
            logger.info('Database reconnected successfully', {
                totalReconnections: this.connectionMetrics.totalReconnections
            });
        });

        mongoose.connection.on('error', (error) => {
            logger.error('Database connection error', {
                error: error.message,
                stack: error.stack,
                reconnectAttempts: this.reconnectAttempts
            });
        });
    }

    /**
     * Attempt to reconnect to database
     */
    async attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Maximum reconnection attempts reached', {
                maxAttempts: this.maxReconnectAttempts
            });
            return;
        }

        this.reconnectAttempts++;
        
        logger.info('Attempting database reconnection', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts
        });

        try {
            await new Promise(resolve => setTimeout(resolve, this.reconnectInterval));
            
            // Mongoose will automatically attempt to reconnect
            // We just need to wait and let the event handlers track the result
            
        } catch (error) {
            logger.error('Reconnection attempt failed', {
                attempt: this.reconnectAttempts,
                error: error.message
            });
        }
    }

    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        this.healthCheckTimer = setInterval(async () => {
            await this.performHealthCheck();
        }, this.healthCheckInterval);
    }

    /**
     * Perform database health check
     */
    async performHealthCheck() {
        try {
            const state = mongoose.connection.readyState;
            
            if (state === 1) {
                // Test connection with ping
                const startTime = Date.now();
                await mongoose.connection.db.admin().ping();
                const responseTime = Date.now() - startTime;
                
                logger.debug('Database health check passed', {
                    responseTime: `${responseTime}ms`,
                    state: this.getConnectionState(state)
                });
            } else {
                logger.warn('Database health check failed', {
                    state: this.getConnectionState(state),
                    reconnectAttempts: this.reconnectAttempts
                });
            }
        } catch (error) {
            logger.error('Database health check error', {
                error: error.message,
                state: this.getConnectionState(mongoose.connection.readyState)
            });
        }
    }

    /**
     * Get current connection status
     */
    getConnectionStatus() {
        const state = mongoose.connection.readyState;
        const now = new Date();
        
        // Calculate uptime
        if (this.connectionMetrics.lastConnected) {
            this.connectionMetrics.uptime = now - this.connectionMetrics.lastConnected;
        }

        return {
            state: this.getConnectionState(state),
            isConnected: state === 1,
            host: mongoose.connection.host,
            database: mongoose.connection.name,
            metrics: {
                ...this.connectionMetrics,
                reconnectAttempts: this.reconnectAttempts,
                maxReconnectAttempts: this.maxReconnectAttempts
            }
        };
    }

    /**
     * Get readable connection state
     */
    getConnectionState(state) {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[state] || 'unknown';
    }

    /**
     * Get connection metrics
     */
    getMetrics() {
        return {
            ...this.connectionMetrics,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            isMonitoring: this.isMonitoring,
            currentState: this.getConnectionState(mongoose.connection.readyState)
        };
    }

    /**
     * Reset connection metrics
     */
    resetMetrics() {
        this.connectionMetrics = {
            totalConnections: 0,
            totalDisconnections: 0,
            totalReconnections: 0,
            lastConnected: null,
            lastDisconnected: null,
            uptime: 0
        };
        this.reconnectAttempts = 0;
        
        logger.info('Database connection metrics reset');
    }
}

// Export singleton instance
const databaseMonitor = new DatabaseMonitor();
export default databaseMonitor;