import { io } from 'socket.io-client';

class RealtimeService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  // Initialize Socket.io connection
  connect() {
    if (this.socket) {
      return this.socket;
    }

    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    this.socket = io(`${serverUrl}/platform-metrics`, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 10
    });

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Connected to real-time monitoring');
      this.isConnected = true;
      this.notifyListeners('connection', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from real-time monitoring:', reason);
      this.isConnected = false;
      this.notifyListeners('connection', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error.message);
      this.notifyListeners('connection', { connected: false, error: error.message });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.notifyListeners('connection', { connected: true, reconnected: true });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection failed:', error.message);
    });

    // Real-time data handlers
    this.socket.on('metrics-update', (data) => {
      this.notifyListeners('metrics', data);
    });

    this.socket.on('tenant-update', (data) => {
      this.notifyListeners('tenants', data);
    });

    this.socket.on('system-alert', (alert) => {
      this.notifyListeners('alerts', alert);
    });

    this.socket.on('license-update', (data) => {
      this.notifyListeners('licenses', data);
    });

    this.socket.on('performance-update', (data) => {
      this.notifyListeners('performance', data);
    });

    // Handle ping/pong for latency measurement
    this.socket.on('pong', (timestamp) => {
      const latency = Date.now() - timestamp;
      this.notifyListeners('connection', { 
        connected: true, 
        latency 
      });
    });

    return this.socket;
  }

  // Disconnect from Socket.io
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Subscribe to real-time updates
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Auto-connect if not already connected
    if (!this.socket) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // Notify all listeners for an event
  notifyListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null
    };
  }

  // Request specific data updates
  requestMetricsUpdate() {
    if (this.socket && this.isConnected) {
      this.socket.emit('request-metrics');
    }
  }

  requestTenantUpdate(tenantId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('request-tenant-data', { tenantId });
    }
  }

  // Send commands to server
  sendCommand(command, data = {}) {
    if (this.socket && this.isConnected) {
      this.socket.emit('platform-command', { command, data });
    }
  }

  // Request license data update
  requestLicenseUpdate(licenseNumber) {
    if (this.socket && this.isConnected) {
      this.socket.emit('request-license-data', { licenseNumber });
    }
  }

  // Request performance metrics
  requestPerformanceUpdate() {
    if (this.socket && this.isConnected) {
      this.socket.emit('request-performance-metrics');
    }
  }

  // Ping server to measure latency
  async pingServer() {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve(-1);
        return;
      }

      const startTime = Date.now();
      this.socket.emit('ping', startTime);
      
      const timeout = setTimeout(() => {
        resolve(-1);
      }, 5000);

      this.socket.once('pong', (timestamp) => {
        clearTimeout(timeout);
        const latency = Date.now() - timestamp;
        resolve(latency);
      });
    });
  }

  // Get detailed connection info
  getDetailedConnectionInfo() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
      transport: this.socket?.io?.engine?.transport?.name || null,
      readyState: this.socket?.io?.engine?.readyState || null,
      listeners: Array.from(this.listeners.keys())
    };
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

export default realtimeService;