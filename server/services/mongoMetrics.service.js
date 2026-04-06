/**
 * Database Metrics Service - PostgreSQL/Sequelize stub
 * TODO: Implement PostgreSQL-specific metrics
 */

class DatabaseMetricsService {
  constructor() {
    this.connectionStartTime = Date.now();
  }

  getConnectionInfo() {
    console.warn('getConnectionInfo: MongoDB-specific method called - needs PostgreSQL implementation');
    return {
      readyState: 1,
      readyStateText: 'connected',
      host: 'localhost',
      port: 5432,
      name: 'postgres',
      collections: [],
      models: [],
      connectionUptime: (Date.now() - this.connectionStartTime) / 1000
    };
  }

  getReadyStateText(state) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[state] || 'unknown';
  }

  async getDatabaseStats() {
    console.warn('getDatabaseStats: MongoDB-specific method called - needs PostgreSQL implementation');
    return {
      collections: 0,
      dataSize: 0,
      storageSize: 0,
      indexes: 0,
      indexSize: 0
    };
  }

  async getCollectionStats() {
    console.warn('getCollectionStats: MongoDB-specific method called - needs PostgreSQL implementation');
    return [];
  }

  async getConnectionPoolStats() {
    console.warn('getConnectionPoolStats: MongoDB-specific method called - needs PostgreSQL implementation');
    return {
      current: 0,
      available: 0,
      pending: 0
    };
  }

  async getPerformanceMetrics() {
    console.warn('getPerformanceMetrics: MongoDB-specific method called - needs PostgreSQL implementation');
    return {
      operations: {
        insert: 0,
        query: 0,
        update: 0,
        delete: 0
      },
      latency: {
        reads: 0,
        writes: 0
      }
    };
  }
}

const mongoMetricsService = new DatabaseMetricsService();
export default mongoMetricsService;
