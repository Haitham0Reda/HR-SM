// services/licenseWebSocket.service.js
import { WebSocketServer } from 'ws';
import logger from '../../../utils/logger.js';
import jwt from 'jsonwebtoken';

/**
 * License WebSocket Service
 * Manages real-time license update notifications to connected clients
 */
class LicenseWebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // Map of tenantId -> Set of WebSocket connections
    }

    /**
     * Initialize WebSocket server
     * @param {http.Server} server - HTTP server instance
     */
    initialize(server) {
        this.wss = new WebSocketServer({ 
            server,
            path: '/ws/license'
        });

        this.wss.on('connection', (ws, req) => {
            this._handleConnection(ws, req);
        });

        logger.info('License WebSocket server initialized');
    }

    /**
     * Handle new WebSocket connection
     * @private
     */
    _handleConnection(ws, req) {
        let tenantId = null;
        let authenticated = false;

        // Extract token from query string or headers
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            logger.warn('WebSocket connection attempt without token');
            ws.close(1008, 'Authentication required');
            return;
        }

        try {
            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            tenantId = decoded.tenantId || decoded.tenant?.id;
            authenticated = true;

            if (!tenantId) {
                logger.warn('WebSocket connection with invalid tenant ID');
                ws.close(1008, 'Invalid tenant ID');
                return;
            }

            // Add client to tenant's connection set
            if (!this.clients.has(tenantId)) {
                this.clients.set(tenantId, new Set());
            }
            this.clients.get(tenantId).add(ws);

            logger.info('WebSocket client connected', { tenantId });

            // Send initial connection success message
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'License updates subscription active',
                timestamp: new Date().toISOString()
            }));

        } catch (error) {
            logger.error('WebSocket authentication error', { error: error.message });
            ws.close(1008, 'Authentication failed');
            return;
        }

        // Handle client messages
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                this._handleMessage(ws, tenantId, data);
            } catch (error) {
                logger.error('WebSocket message parse error', { error: error.message });
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            if (authenticated && tenantId) {
                const tenantClients = this.clients.get(tenantId);
                if (tenantClients) {
                    tenantClients.delete(ws);
                    if (tenantClients.size === 0) {
                        this.clients.delete(tenantId);
                    }
                }
                logger.info('WebSocket client disconnected', { tenantId });
            }
        });

        // Handle errors
        ws.on('error', (error) => {
            logger.error('WebSocket error', { tenantId, error: error.message });
        });
    }

    /**
     * Handle incoming message from client
     * @private
     */
    _handleMessage(ws, tenantId, data) {
        switch (data.type) {
            case 'ping':
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                }));
                break;

            case 'subscribe':
                // Client can subscribe to specific module updates
                logger.debug('Client subscribed to module updates', {
                    tenantId,
                    modules: data.modules
                });
                ws.send(JSON.stringify({
                    type: 'subscribed',
                    modules: data.modules,
                    timestamp: new Date().toISOString()
                }));
                break;

            default:
                logger.warn('Unknown WebSocket message type', { type: data.type });
        }
    }

    /**
     * Broadcast license expiration notification to tenant
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     * @param {Date} expiresAt - Expiration date
     * @param {number} daysUntilExpiration - Days until expiration
     */
    notifyLicenseExpiring(tenantId, moduleKey, expiresAt, daysUntilExpiration) {
        const message = {
            type: 'license_expiring',
            moduleKey,
            expiresAt: expiresAt.toISOString(),
            daysUntilExpiration,
            severity: daysUntilExpiration <= 7 ? 'critical' : 'warning',
            timestamp: new Date().toISOString()
        };

        this._broadcastToTenant(tenantId, message);
        logger.info('License expiration notification sent', { tenantId, moduleKey, daysUntilExpiration });
    }

    /**
     * Broadcast license expired notification to tenant
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     */
    notifyLicenseExpired(tenantId, moduleKey) {
        const message = {
            type: 'license_expired',
            moduleKey,
            severity: 'critical',
            timestamp: new Date().toISOString()
        };

        this._broadcastToTenant(tenantId, message);
        logger.info('License expired notification sent', { tenantId, moduleKey });
    }

    /**
     * Broadcast usage limit warning to tenant
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     * @param {string} limitType - Type of limit (employees, storage, apiCalls)
     * @param {number} currentUsage - Current usage value
     * @param {number} limit - Limit value
     * @param {number} percentage - Usage percentage
     */
    notifyUsageLimitWarning(tenantId, moduleKey, limitType, currentUsage, limit, percentage) {
        const message = {
            type: 'usage_limit_warning',
            moduleKey,
            limitType,
            currentUsage,
            limit,
            percentage,
            severity: percentage >= 95 ? 'critical' : 'warning',
            timestamp: new Date().toISOString()
        };

        this._broadcastToTenant(tenantId, message);
        logger.info('Usage limit warning sent', { tenantId, moduleKey, limitType, percentage });
    }

    /**
     * Broadcast usage limit exceeded notification to tenant
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     * @param {string} limitType - Type of limit
     * @param {number} currentUsage - Current usage value
     * @param {number} limit - Limit value
     */
    notifyUsageLimitExceeded(tenantId, moduleKey, limitType, currentUsage, limit) {
        const message = {
            type: 'usage_limit_exceeded',
            moduleKey,
            limitType,
            currentUsage,
            limit,
            severity: 'critical',
            timestamp: new Date().toISOString()
        };

        this._broadcastToTenant(tenantId, message);
        logger.info('Usage limit exceeded notification sent', { tenantId, moduleKey, limitType });
    }

    /**
     * Broadcast module activation notification to tenant
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     */
    notifyModuleActivated(tenantId, moduleKey) {
        const message = {
            type: 'module_activated',
            moduleKey,
            severity: 'info',
            timestamp: new Date().toISOString()
        };

        this._broadcastToTenant(tenantId, message);
        logger.info('Module activation notification sent', { tenantId, moduleKey });
    }

    /**
     * Broadcast module deactivation notification to tenant
     * @param {string} tenantId - Tenant identifier
     * @param {string} moduleKey - Module key
     */
    notifyModuleDeactivated(tenantId, moduleKey) {
        const message = {
            type: 'module_deactivated',
            moduleKey,
            severity: 'warning',
            timestamp: new Date().toISOString()
        };

        this._broadcastToTenant(tenantId, message);
        logger.info('Module deactivation notification sent', { tenantId, moduleKey });
    }

    /**
     * Broadcast license updated notification to tenant
     * @param {string} tenantId - Tenant identifier
     * @param {Object} changes - Changes made to the license
     */
    notifyLicenseUpdated(tenantId, changes) {
        const message = {
            type: 'license_updated',
            changes,
            severity: 'info',
            timestamp: new Date().toISOString()
        };

        this._broadcastToTenant(tenantId, message);
        logger.info('License update notification sent', { tenantId, changes });
    }

    /**
     * Broadcast message to all clients of a tenant
     * @private
     */
    _broadcastToTenant(tenantId, message) {
        const tenantClients = this.clients.get(tenantId);

        if (!tenantClients || tenantClients.size === 0) {
            logger.debug('No connected clients for tenant', { tenantId });
            return;
        }

        const messageStr = JSON.stringify(message);
        let successCount = 0;
        let failureCount = 0;

        tenantClients.forEach((ws) => {
            if (ws.readyState === ws.OPEN) {
                try {
                    ws.send(messageStr);
                    successCount++;
                } catch (error) {
                    logger.error('Failed to send message to client', {
                        tenantId,
                        error: error.message
                    });
                    failureCount++;
                }
            }
        });

        logger.debug('Broadcast complete', {
            tenantId,
            successCount,
            failureCount,
            totalClients: tenantClients.size
        });
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics
     */
    getStats() {
        const stats = {
            totalTenants: this.clients.size,
            totalConnections: 0,
            tenantConnections: {}
        };

        this.clients.forEach((clients, tenantId) => {
            stats.totalConnections += clients.size;
            stats.tenantConnections[tenantId] = clients.size;
        });

        return stats;
    }

    /**
     * Close all connections and shutdown
     */
    shutdown() {
        if (this.wss) {
            this.wss.clients.forEach((ws) => {
                ws.close(1001, 'Server shutting down');
            });
            this.wss.close();
            logger.info('License WebSocket server shut down');
        }
    }
}

// Export singleton instance
const licenseWebSocketService = new LicenseWebSocketService();
export default licenseWebSocketService;
