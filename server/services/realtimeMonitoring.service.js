import { Server } from 'socket.io';
import systemMetricsService from './systemMetrics.service.js';
import mongoMetricsService from './mongoMetrics.service.js';
import alertSystemService from './alertSystem.service.js';

/**
 * Real-time Monitoring Service
 * Integrates Socket.io with existing Express.js server for real-time dashboard communication
 */
class RealtimeMonitoringService {
  constructor() {
    this.io = null;
    this.platformNamespace = null;
    this.metricsInterval = null;
    this.alertsInterval = null;
    this.connectedClients = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize Socket.io server with existing Express server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    if (this.isInitialized) {
      console.log('Real-time monitoring service already initialized');
      return;
    }

    // Create Socket.io server with CORS settings for platform-admin
    this.io = new Server(server, {
      cors: {
        origin: [
          process.env.CLIENT_URL || 'http://localhost:3000',
          'http://localhost:3001', // Platform admin
          'http://localhost:3002', // Platform admin (alternative port)
          'http://localhost:6006'  // Storybook
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupNamespaces();
    this.setupConnectionHandlers();
    this.startMetricsCollection();
    this.startAlertsProcessing();

    this.isInitialized = true;
    console.log('✓ Real-time monitoring service initialized');
  }

  /**
   * Setup Socket.io namespaces for different types of real-time communication
   */
  setupNamespaces() {
    // Platform metrics namespace for platform admin dashboard
    this.platformNamespace = this.io.of('/platform-metrics');
    
    this.platformNamespace.on('connection', (socket) => {
      console.log(`Platform admin connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send current metrics immediately upon connection
      this.sendCurrentMetrics(socket);

      // Handle client requests for specific data
      socket.on('request-system-health', async () => {
        try {
          const systemHealth = await systemMetricsService.getSystemHealth();
          socket.emit('system-health-response', systemHealth);
        } catch (error) {
          socket.emit('error', { message: 'Failed to get system health', error: error.message });
        }
      });

      socket.on('request-mongo-health', async () => {
        try {
          const mongoHealth = await mongoMetricsService.getMongoHealth();
          socket.emit('mongo-health-response', mongoHealth);
        } catch (error) {
          socket.emit('error', { message: 'Failed to get MongoDB health', error: error.message });
        }
      });

      socket.on('request-active-alerts', async () => {
        try {
          const alerts = await alertSystemService.getActiveAlerts({ limit: 20 });
          socket.emit('active-alerts-response', alerts);
        } catch (error) {
          socket.emit('error', { message: 'Failed to get active alerts', error: error.message });
        }
      });

      socket.on('acknowledge-alert', async (data) => {
        try {
          const { alertId, acknowledgedBy } = data;
          const alert = await alertSystemService.acknowledgeAlert(alertId, acknowledgedBy);
          
          // Broadcast alert acknowledgment to all connected clients
          this.platformNamespace.emit('alert-acknowledged', {
            alertId,
            acknowledgedBy,
            acknowledgedAt: alert.acknowledgedAt
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to acknowledge alert', error: error.message });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`Platform admin disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });

    // Add middleware for authentication (optional - can be implemented later)
    this.platformNamespace.use((socket, next) => {
      // For now, allow all connections
      // In production, you might want to verify JWT tokens here
      next();
    });
  }

  /**
   * Setup connection handlers and middleware
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected to main namespace: ${socket.id}`);
      
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected from main namespace: ${socket.id}, reason: ${reason}`);
      });
    });

    // Global error handler
    this.io.engine.on('connection_error', (err) => {
      console.error('Socket.io connection error:', err);
    });
  }

  /**
   * Send current metrics to a specific socket
   * @param {Socket} socket - Socket.io socket instance
   */
  async sendCurrentMetrics(socket) {
    try {
      const [systemHealth, mongoHealth, alertStats] = await Promise.all([
        systemMetricsService.getSystemHealth(),
        mongoMetricsService.getMongoHealth(),
        alertSystemService.getAlertStatistics()
      ]);

      const metricsData = {
        timestamp: new Date().toISOString(),
        system: systemHealth,
        database: mongoHealth,
        alerts: alertStats
      };

      socket.emit('metrics-update', metricsData);
    } catch (error) {
      console.error('Error sending current metrics:', error);
      socket.emit('error', { message: 'Failed to get current metrics', error: error.message });
    }
  }

  /**
   * Start periodic metrics collection and broadcasting
   */
  startMetricsCollection() {
    const collectAndBroadcastMetrics = async () => {
      if (this.connectedClients.size === 0) {
        // No clients connected, skip collection
        return;
      }

      try {
        const [systemHealth, mongoHealth, alertStats] = await Promise.all([
          systemMetricsService.getSystemHealth(),
          mongoMetricsService.getMongoHealth(),
          alertSystemService.getAlertStatistics()
        ]);

        const metricsData = {
          timestamp: new Date().toISOString(),
          system: systemHealth,
          database: mongoHealth,
          alerts: alertStats,
          connectedClients: this.connectedClients.size
        };

        // Broadcast to all connected platform admin clients
        this.platformNamespace.emit('metrics-update', metricsData);

        // Also emit individual metric updates for specific components
        this.platformNamespace.emit('system-metrics', systemHealth);
        this.platformNamespace.emit('database-metrics', mongoHealth);
        this.platformNamespace.emit('alert-statistics', alertStats);

      } catch (error) {
        console.error('Error collecting and broadcasting metrics:', error);
        
        // Send error to connected clients
        this.platformNamespace.emit('metrics-error', {
          message: 'Failed to collect system metrics',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Collect and broadcast immediately
    collectAndBroadcastMetrics();

    // Set up periodic collection every 30 seconds
    this.metricsInterval = setInterval(collectAndBroadcastMetrics, 30000);
    console.log('✓ Metrics collection started (30s interval)');
  }

  /**
   * Start periodic alerts processing and broadcasting
   */
  startAlertsProcessing() {
    const processAndBroadcastAlerts = async () => {
      if (this.connectedClients.size === 0) {
        // No clients connected, skip processing
        return;
      }

      try {
        // Process system health and generate new alerts
        const newAlerts = await alertSystemService.processSystemHealth();
        
        if (newAlerts.length > 0) {
          // Broadcast new alerts to all connected clients
          this.platformNamespace.emit('new-alerts', {
            alerts: newAlerts,
            timestamp: new Date().toISOString()
          });

          // Send individual alert notifications for critical alerts
          const criticalAlerts = newAlerts.filter(alert => alert.severity === 'critical');
          if (criticalAlerts.length > 0) {
            this.platformNamespace.emit('critical-alerts', {
              alerts: criticalAlerts,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Get updated alert statistics
        const alertStats = await alertSystemService.getAlertStatistics();
        this.platformNamespace.emit('alert-statistics-update', alertStats);

      } catch (error) {
        console.error('Error processing and broadcasting alerts:', error);
        
        this.platformNamespace.emit('alerts-error', {
          message: 'Failed to process system alerts',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Process alerts immediately
    processAndBroadcastAlerts();

    // Set up periodic processing every 5 minutes
    this.alertsInterval = setInterval(processAndBroadcastAlerts, 300000);
    console.log('✓ Alerts processing started (5m interval)');
  }

  /**
   * Broadcast custom event to platform admin clients
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcastToPlatform(event, data) {
    if (this.platformNamespace) {
      this.platformNamespace.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send notification to specific client
   * @param {string} socketId - Socket ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  sendToClient(socketId, event, data) {
    if (this.platformNamespace) {
      this.platformNamespace.to(socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.io ? this.io.engine.clientsCount : 0,
      platformConnections: this.connectedClients.size,
      isInitialized: this.isInitialized,
      metricsCollectionActive: !!this.metricsInterval,
      alertsProcessingActive: !!this.alertsInterval
    };
  }

  /**
   * Shutdown the real-time monitoring service
   */
  shutdown() {
    console.log('Shutting down real-time monitoring service...');

    // Clear intervals
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.alertsInterval) {
      clearInterval(this.alertsInterval);
      this.alertsInterval = null;
    }

    // Disconnect all clients
    if (this.io) {
      this.io.disconnectSockets();
      this.io.close();
    }

    // Clear client tracking
    this.connectedClients.clear();
    this.isInitialized = false;

    console.log('✓ Real-time monitoring service shutdown complete');
  }

  /**
   * Health check for the real-time monitoring service
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: this.isInitialized ? 'healthy' : 'not_initialized',
      connections: this.getConnectionStats(),
      services: {
        metricsCollection: !!this.metricsInterval,
        alertsProcessing: !!this.alertsInterval
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default new RealtimeMonitoringService();