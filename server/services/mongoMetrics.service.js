import mongoose from 'mongoose';

/**
 * MongoDB Metrics Service
 * Collects MongoDB-specific metrics using existing Mongoose connection patterns
 */
class MongoMetricsService {
  constructor() {
    this.connectionStartTime = Date.now();
  }

  /**
   * Get basic MongoDB connection information
   * @returns {Object} Connection information
   */
  getConnectionInfo() {
    const connection = mongoose.connection;
    
    return {
      readyState: connection.readyState,
      readyStateText: this.getReadyStateText(connection.readyState),
      host: connection.host,
      port: connection.port,
      name: connection.name,
      collections: Object.keys(connection.collections),
      models: Object.keys(connection.models),
      connectionUptime: (Date.now() - this.connectionStartTime) / 1000
    };
  }

  /**
   * Convert readyState number to text
   * @param {number} state - Connection ready state
   * @returns {string} Human-readable state
   */
  getReadyStateText(state) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[state] || 'unknown';
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getDatabaseStats() {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        database: db.databaseName,
        collections: stats.collections,
        views: stats.views || 0,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        totalSize: stats.totalSize || (stats.dataSize + stats.indexSize),
        scaleFactor: stats.scaleFactor || 1,
        fsUsedSize: stats.fsUsedSize,
        fsTotalSize: stats.fsTotalSize
      };
    } catch (error) {
      return {
        error: error.message,
        connected: false
      };
    }
  }

  /**
   * Get collection statistics
   * @param {string} collectionName - Name of the collection
   * @returns {Promise<Object>} Collection statistics
   */
  async getCollectionStats(collectionName) {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      
      // First check if collection exists
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        return {
          collection: collectionName,
          exists: false,
          error: 'Collection does not exist'
        };
      }

      // Use collStats command instead of stats() method
      const stats = await db.command({ collStats: collectionName });
      
      return {
        collection: collectionName,
        exists: true,
        count: stats.count || 0,
        size: stats.size || 0,
        avgObjSize: stats.avgObjSize || 0,
        storageSize: stats.storageSize || 0,
        indexes: stats.nindexes || 0,
        totalIndexSize: stats.totalIndexSize || 0,
        indexSizes: stats.indexSizes || {},
        capped: stats.capped || false,
        maxSize: stats.maxSize || null
      };
    } catch (error) {
      return {
        collection: collectionName,
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Get statistics for all collections
   * @returns {Promise<Array>} Array of collection statistics
   */
  async getAllCollectionStats() {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      const stats = await Promise.all(
        collections.map(async (collection) => {
          try {
            return await this.getCollectionStats(collection.name);
          } catch (error) {
            return {
              collection: collection.name,
              error: error.message
            };
          }
        })
      );

      return stats;
    } catch (error) {
      return [{
        error: error.message,
        connected: false
      }];
    }
  }

  /**
   * Get server status information
   * @returns {Promise<Object>} Server status
   */
  async getServerStatus() {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const admin = db.admin();
      const status = await admin.serverStatus();
      
      return {
        version: status.version,
        uptime: status.uptime,
        uptimeMillis: status.uptimeMillis,
        localTime: status.localTime,
        connections: {
          current: status.connections?.current || 0,
          available: status.connections?.available || 0,
          totalCreated: status.connections?.totalCreated || 0
        },
        network: {
          bytesIn: status.network?.bytesIn || 0,
          bytesOut: status.network?.bytesOut || 0,
          numRequests: status.network?.numRequests || 0
        },
        opcounters: {
          insert: status.opcounters?.insert || 0,
          query: status.opcounters?.query || 0,
          update: status.opcounters?.update || 0,
          delete: status.opcounters?.delete || 0,
          getmore: status.opcounters?.getmore || 0,
          command: status.opcounters?.command || 0
        },
        mem: {
          resident: status.mem?.resident || 0,
          virtual: status.mem?.virtual || 0,
          mapped: status.mem?.mapped || 0,
          mappedWithJournal: status.mem?.mappedWithJournal || 0
        },
        metrics: {
          document: status.metrics?.document || {},
          queryExecutor: status.metrics?.queryExecutor || {},
          operation: status.metrics?.operation || {}
        }
      };
    } catch (error) {
      return {
        error: error.message,
        connected: false
      };
    }
  }

  /**
   * Get current operations
   * @returns {Promise<Array>} Current operations
   */
  async getCurrentOperations() {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const admin = db.admin();
      const currentOp = await admin.command({ currentOp: 1 });
      
      return currentOp.inprog || [];
    } catch (error) {
      return [{
        error: error.message,
        connected: false
      }];
    }
  }

  /**
   * Get replica set status (if applicable)
   * @returns {Promise<Object>} Replica set status
   */
  async getReplicaSetStatus() {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const admin = db.admin();
      const status = await admin.command({ replSetGetStatus: 1 });
      
      return {
        set: status.set,
        date: status.date,
        myState: status.myState,
        members: status.members?.map(member => ({
          id: member._id,
          name: member.name,
          health: member.health,
          state: member.state,
          stateStr: member.stateStr,
          uptime: member.uptime,
          lastHeartbeat: member.lastHeartbeat
        })) || []
      };
    } catch (error) {
      // Not a replica set or no permissions
      return {
        error: error.message,
        isReplicaSet: false
      };
    }
  }

  /**
   * Get index usage statistics
   * @param {string} collectionName - Collection name
   * @returns {Promise<Array>} Index usage statistics
   */
  async getIndexStats(collectionName) {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      const indexStats = await collection.aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      return indexStats.map(stat => ({
        name: stat.name,
        key: stat.key,
        host: stat.host,
        accesses: {
          ops: stat.accesses?.ops || 0,
          since: stat.accesses?.since || null
        }
      }));
    } catch (error) {
      return [{
        collection: collectionName,
        error: error.message
      }];
    }
  }

  /**
   * Get comprehensive MongoDB health metrics
   * @returns {Promise<Object>} Complete MongoDB health data
   */
  async getMongoHealth() {
    const connectionInfo = this.getConnectionInfo();
    
    if (connectionInfo.readyState !== 1) {
      return {
        timestamp: new Date().toISOString(),
        status: 'disconnected',
        healthScore: 0,
        connection: connectionInfo,
        error: 'Database not connected'
      };
    }

    try {
      const [
        dbStats,
        serverStatus,
        collectionStats,
        currentOps,
        replicaSetStatus
      ] = await Promise.all([
        this.getDatabaseStats(),
        this.getServerStatus(),
        this.getAllCollectionStats(),
        this.getCurrentOperations(),
        this.getReplicaSetStatus()
      ]);

      // Calculate health score
      let healthScore = 100;
      
      // Check connection health
      if (serverStatus.connections) {
        const connectionUsage = (serverStatus.connections.current / serverStatus.connections.available) * 100;
        if (connectionUsage > 90) healthScore -= 20;
        else if (connectionUsage > 80) healthScore -= 10;
      }

      // Check for long-running operations
      const longRunningOps = currentOps.filter(op => 
        op.secs_running && op.secs_running > 30
      ).length;
      if (longRunningOps > 5) healthScore -= 15;
      else if (longRunningOps > 0) healthScore -= 5;

      // Check memory usage
      if (serverStatus.mem && serverStatus.mem.resident > 1000) { // > 1GB
        healthScore -= 5;
      }

      // Determine status
      let status = 'healthy';
      if (healthScore < 50) status = 'critical';
      else if (healthScore < 70) status = 'warning';
      else if (healthScore < 85) status = 'degraded';

      return {
        timestamp: new Date().toISOString(),
        status,
        healthScore,
        connection: connectionInfo,
        database: dbStats,
        server: serverStatus,
        collections: collectionStats,
        currentOperations: currentOps.length,
        longRunningOperations: longRunningOps,
        replicaSet: replicaSetStatus,
        alerts: this.generateMongoAlerts(serverStatus, currentOps, dbStats)
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        healthScore: 0,
        connection: connectionInfo,
        error: error.message
      };
    }
  }

  /**
   * Generate MongoDB-specific alerts
   * @param {Object} serverStatus - Server status data
   * @param {Array} currentOps - Current operations
   * @param {Object} dbStats - Database statistics
   * @returns {Array} Array of alerts
   */
  generateMongoAlerts(serverStatus, currentOps, dbStats) {
    const alerts = [];

    // Connection alerts
    if (serverStatus.connections) {
      const connectionUsage = (serverStatus.connections.current / serverStatus.connections.available) * 100;
      if (connectionUsage > 90) {
        alerts.push({
          level: 'critical',
          type: 'connections',
          message: 'MongoDB connection usage is critically high',
          value: connectionUsage,
          threshold: 90
        });
      } else if (connectionUsage > 80) {
        alerts.push({
          level: 'warning',
          type: 'connections',
          message: 'MongoDB connection usage is high',
          value: connectionUsage,
          threshold: 80
        });
      }
    }

    // Long-running operations
    const longRunningOps = currentOps.filter(op => 
      op.secs_running && op.secs_running > 30
    );
    if (longRunningOps.length > 5) {
      alerts.push({
        level: 'warning',
        type: 'operations',
        message: 'Multiple long-running MongoDB operations detected',
        value: longRunningOps.length,
        threshold: 5
      });
    }

    // Storage alerts
    if (dbStats.storageSize && dbStats.dataSize) {
      const storageEfficiency = (dbStats.dataSize / dbStats.storageSize) * 100;
      if (storageEfficiency < 50) {
        alerts.push({
          level: 'info',
          type: 'storage',
          message: 'MongoDB storage efficiency is low - consider compacting',
          value: storageEfficiency,
          threshold: 50
        });
      }
    }

    return alerts;
  }

  /**
   * Get metrics for Prometheus export
   * @returns {Promise<Object>} Prometheus-compatible metrics
   */
  async getPrometheusMetrics() {
    const health = await this.getMongoHealth();
    
    const metrics = {
      // Connection metrics
      'mongodb_connections_current': health.server?.connections?.current || 0,
      'mongodb_connections_available': health.server?.connections?.available || 0,
      'mongodb_connections_total_created': health.server?.connections?.totalCreated || 0,
      
      // Database metrics
      'mongodb_database_collections': health.database?.collections || 0,
      'mongodb_database_objects': health.database?.objects || 0,
      'mongodb_database_data_size_bytes': health.database?.dataSize || 0,
      'mongodb_database_storage_size_bytes': health.database?.storageSize || 0,
      'mongodb_database_index_size_bytes': health.database?.indexSize || 0,
      'mongodb_database_indexes': health.database?.indexes || 0,
      
      // Server metrics
      'mongodb_server_uptime_seconds': health.server?.uptime || 0,
      'mongodb_server_memory_resident_bytes': (health.server?.mem?.resident || 0) * 1024 * 1024,
      'mongodb_server_memory_virtual_bytes': (health.server?.mem?.virtual || 0) * 1024 * 1024,
      
      // Operation counters
      'mongodb_operations_insert_total': health.server?.opcounters?.insert || 0,
      'mongodb_operations_query_total': health.server?.opcounters?.query || 0,
      'mongodb_operations_update_total': health.server?.opcounters?.update || 0,
      'mongodb_operations_delete_total': health.server?.opcounters?.delete || 0,
      'mongodb_operations_command_total': health.server?.opcounters?.command || 0,
      
      // Network metrics
      'mongodb_network_bytes_in_total': health.server?.network?.bytesIn || 0,
      'mongodb_network_bytes_out_total': health.server?.network?.bytesOut || 0,
      'mongodb_network_requests_total': health.server?.network?.numRequests || 0,
      
      // Health metrics
      'mongodb_health_score': health.healthScore,
      'mongodb_current_operations': health.currentOperations || 0,
      'mongodb_long_running_operations': health.longRunningOperations || 0,
      'mongodb_alerts_total': health.alerts?.length || 0
    };

    return metrics;
  }

  /**
   * Start periodic MongoDB metrics collection
   * @param {number} interval - Collection interval in milliseconds
   * @param {Function} callback - Callback function to handle metrics
   */
  startPeriodicCollection(interval = 60000, callback) {
    const collectMetrics = async () => {
      try {
        const metrics = await this.getMongoHealth();
        if (callback) {
          callback(metrics);
        }
      } catch (error) {
        console.error('Error collecting MongoDB metrics:', error);
      }
    };

    // Collect immediately
    collectMetrics();

    // Set up periodic collection
    return setInterval(collectMetrics, interval);
  }

  /**
   * Stop periodic metrics collection
   * @param {NodeJS.Timeout} intervalId - Interval ID returned by startPeriodicCollection
   */
  stopPeriodicCollection(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export default new MongoMetricsService();