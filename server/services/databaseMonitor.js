import { mainAppDb as sequelize } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Database Connection Monitor
 * Monitors PostgreSQL connection health and provides reconnection logic
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
            const startTime = Date.now();
            await sequelize.authenticate();
            const responseTime = Date.now() - startTime;
            
            logger.debug('Database health check passed', {
                responseTime: `${responseTime}ms`,
                state: 'connected'
            });
        } catch (error) {
            logger.error('Database health check error', {
                error: error.message,
                reconnectAttempts: this.reconnectAttempts
            });

            // Attempt reconnection if monitoring is active
            if (this.isMonitoring && this.reconnectAttempts < this.maxReconnectAttempts) {
                await this.attemptReconnection();
            }
        }
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
            await sequelize.authenticate();
            
            this.connectionMetrics.totalReconnections++;
            this.reconnectAttempts = 0;
            
            logger.info('Database reconnected successfully', {
                totalReconnections: this.connectionMetrics.totalReconnections
            });
        } catch (error) {
            logger.error('Reconnection attempt failed', {
                attempt: this.reconnectAttempts,
                error: error.message
            });
        }
    }

    /**
     * Get current connection status
     */
    async getConnectionStatus() {
        try {
            await sequelize.authenticate();
            const now = new Date();
            
            // Calculate uptime
            if (this.connectionMetrics.lastConnected) {
                this.connectionMetrics.uptime = now - this.connectionMetrics.lastConnected;
            }

            return {
                state: 'connected',
                isConnected: true,
                database: sequelize.config.database,
                host: sequelize.config.host,
                metrics: {
                    ...this.connectionMetrics,
                    reconnectAttempts: this.reconnectAttempts,
                    maxReconnectAttempts: this.maxReconnectAttempts
                }
            };
        } catch (error) {
            return {
                state: 'disconnected',
                isConnected: false,
                error: error.message,
                metrics: {
                    ...this.connectionMetrics,
                    reconnectAttempts: this.reconnectAttempts,
                    maxReconnectAttempts: this.maxReconnectAttempts
                }
            };
        }
    }

    /**
     * Get connection metrics
     */
    getMetrics() {
        return {
            ...this.connectionMetrics,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            isMonitoring: this.isMonitoring
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
