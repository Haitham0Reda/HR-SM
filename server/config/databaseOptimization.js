import mongoose from 'mongoose';
import winston from 'winston';

// Configure logger for database optimization
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/database-optimization.log' })
  ]
});

/**
 * Enhanced MongoDB Connection Configuration with Performance Optimizations
 */
export const getOptimizedConnectionOptions = () => {
  return {
    // Connection pool settings - optimized for high performance
    maxPoolSize: 20, // Increased from 10 for better concurrency
    minPoolSize: 5,  // Increased from 2 to maintain warm connections
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    
    // Timeout settings - balanced for performance and reliability
    serverSelectionTimeoutMS: 5000, // How long to try selecting a server
    socketTimeoutMS: 45000, // How long to wait for a response
    connectTimeoutMS: 10000, // How long to wait for initial connection
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
    
    // Buffer settings
    bufferCommands: true, // Enable mongoose buffering
    
    // Modern MongoDB driver settings
    
    // Heartbeat settings
    heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
    
    // Write concern for performance vs durability balance
    writeConcern: {
      w: 'majority',
      journal: true // Enable journaling for durability (replaces deprecated 'j' option)
    },
    
    // Read preference for analytics queries
    readPreference: 'primaryPreferred', // Allow reads from secondaries when available
    
    // Compression for network efficiency
    compressors: ['zlib', 'snappy'],
    
    // Additional performance options
    readConcern: { level: 'local' }, // Faster reads for most use cases
    
    // Connection monitoring
    monitorCommands: process.env.NODE_ENV === 'development',
    
    // Auto-index creation (disable in production for performance)
    autoIndex: process.env.NODE_ENV !== 'production',
    
    // Connection pool monitoring
    maxConnecting: 2, // Maximum number of connections being established
    
    // Server discovery settings (removed deprecated serverSelectionRetryFrequencyMS)
    
    // Socket keep-alive (removed deprecated keepAlive option)
    keepAliveInitialDelay: 300000, // 5 minutes
    
    // Family preference for IPv4/IPv6
    family: 4, // Use IPv4
    
    // SSL/TLS settings (if needed)
    ...(process.env.MONGODB_SSL === 'true' && {
      ssl: true,
      sslValidate: true,
      sslCA: process.env.MONGODB_SSL_CA,
      sslCert: process.env.MONGODB_SSL_CERT,
      sslKey: process.env.MONGODB_SSL_KEY
    })
  };
};

/**
 * Configure MongoDB Slow Query Logging
 */
export const configureSlowQueryLogging = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Check if we're running on MongoDB Atlas
    const isAtlas = process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb.net');
    
    if (isAtlas) {
      logger.warn('⚠️  MongoDB Atlas detected - slow query logging managed by Atlas, skipping profiler setup');
      return true;
    }
    
    // Enable profiling for slow operations (>100ms) - only for self-hosted MongoDB
    await db.admin().command({
      profile: 2, // Profile all operations
      slowms: 100, // Log operations slower than 100ms
      sampleRate: 1.0 // Sample 100% of operations
    });
    
    logger.info('✅ MongoDB slow query logging enabled (>100ms)');
    
    // Set up profiler collection capped size (100MB)
    const collections = await db.listCollections({ name: 'system.profile' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('system.profile', {
        capped: true,
        size: 104857600, // 100MB
        max: 10000 // Maximum 10,000 documents
      });
      logger.info('✅ Created capped profiler collection (100MB, 10k docs)');
    }
    
    return true;
  } catch (error) {
    logger.warn('⚠️  Could not configure slow query logging (likely Atlas or permission issue):', error.message);
    return false;
  }
};

/**
 * Create Performance Indexes for All Collections
 */
export const createPerformanceIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    let indexesCreated = 0;
    
    logger.info('🔍 Creating performance indexes...');
    
    // Core HR indexes
    const hrIndexes = [
      // Users collection
      {
        collection: 'users',
        indexes: [
          { fields: { email: 1, tenantId: 1 }, options: { unique: true, background: true } },
          { fields: { employeeId: 1, tenantId: 1 }, options: { unique: true, sparse: true, background: true } },
          { fields: { tenantId: 1, status: 1 }, options: { background: true } },
          { fields: { tenantId: 1, department: 1 }, options: { background: true } },
          { fields: { tenantId: 1, manager: 1 }, options: { background: true } },
          { fields: { tenantId: 1, role: 1 }, options: { background: true } },
          { fields: { tenantId: 1, hireDate: 1 }, options: { background: true } },
          { fields: { tenantId: 1, status: 1, role: 1 }, options: { background: true } },
          { fields: { updatedAt: -1 }, options: { background: true } },
          { fields: { createdAt: -1 }, options: { background: true } }
        ]
      },
      
      // Departments collection
      {
        collection: 'departments',
        indexes: [
          { fields: { tenantId: 1, name: 1 }, options: { unique: true, background: true } },
          { fields: { tenantId: 1, isActive: 1 }, options: { background: true } },
          { fields: { tenantId: 1, parentDepartment: 1 }, options: { background: true } }
        ]
      },
      
      // Attendances collection
      {
        collection: 'attendances',
        indexes: [
          { fields: { tenantId: 1, employee: 1, date: 1 }, options: { unique: true, background: true } },
          { fields: { tenantId: 1, date: 1 }, options: { background: true } },
          { fields: { tenantId: 1, status: 1, date: 1 }, options: { background: true } },
          { fields: { tenantId: 1, employee: 1, date: -1 }, options: { background: true } },
          { fields: { tenantId: 1, department: 1, date: 1 }, options: { background: true } }
        ]
      },
      
      // Tasks collection
      {
        collection: 'tasks',
        indexes: [
          { fields: { tenantId: 1, assignedTo: 1, status: 1 }, options: { background: true } },
          { fields: { tenantId: 1, assignedBy: 1 }, options: { background: true } },
          { fields: { tenantId: 1, dueDate: 1, status: 1 }, options: { background: true } },
          { fields: { tenantId: 1, priority: 1, status: 1 }, options: { background: true } },
          { fields: { tenantId: 1, createdAt: -1 }, options: { background: true } }
        ]
      },
      
      // Audit logs collection
      {
        collection: 'auditlogs',
        indexes: [
          { fields: { tenantId: 1, timestamp: -1 }, options: { background: true } },
          { fields: { tenantId: 1, userId: 1, timestamp: -1 }, options: { background: true } },
          { fields: { tenantId: 1, action: 1, timestamp: -1 }, options: { background: true } },
          { fields: { tenantId: 1, resource: 1, timestamp: -1 }, options: { background: true } },
          { fields: { ipAddress: 1, timestamp: -1 }, options: { background: true } },
          // TTL index for automatic cleanup (keep logs for 2 years)
          { fields: { timestamp: 1 }, options: { expireAfterSeconds: 63072000, background: true } }
        ]
      },
      
      // Performance metrics collection
      {
        collection: 'performancemetrics',
        indexes: [
          { fields: { tenantId: 1, timestamp: -1 }, options: { background: true } },
          { fields: { path: 1, method: 1, timestamp: -1 }, options: { background: true } },
          { fields: { responseTime: -1 }, options: { background: true } },
          { fields: { statusCode: 1, timestamp: -1 }, options: { background: true } },
          // TTL index for automatic cleanup (keep metrics for 90 days)
          { fields: { timestamp: 1 }, options: { expireAfterSeconds: 7776000, background: true } }
        ]
      },
      
      // Security events collection
      {
        collection: 'securityevents',
        indexes: [
          { fields: { tenantId: 1, timestamp: -1 }, options: { background: true } },
          { fields: { eventType: 1, severity: 1 }, options: { background: true } },
          { fields: { ipAddress: 1, timestamp: -1 }, options: { background: true } },
          { fields: { resolved: 1, severity: 1 }, options: { background: true } },
          { fields: { timestamp: -1 }, options: { background: true } },
          // TTL index for automatic cleanup (keep events for 1 year)
          { fields: { timestamp: 1 }, options: { expireAfterSeconds: 31536000, background: true } }
        ]
      },
      
      // System alerts collection
      {
        collection: 'systemalerts',
        indexes: [
          { fields: { createdAt: -1 }, options: { background: true } },
          { fields: { status: 1, severity: 1 }, options: { background: true } },
          { fields: { type: 1, category: 1 }, options: { background: true } },
          { fields: { tenantId: 1, status: 1 }, options: { sparse: true, background: true } }
        ]
      }
    ];
    
    // Create indexes for each collection
    for (const collectionConfig of hrIndexes) {
      const collectionExists = collections.some(c => c.name === collectionConfig.collection);
      
      if (collectionExists) {
        const collection = db.collection(collectionConfig.collection);
        
        for (const indexConfig of collectionConfig.indexes) {
          try {
            await collection.createIndex(indexConfig.fields, indexConfig.options);
            indexesCreated++;
            logger.info(`✅ Created index on ${collectionConfig.collection}: ${JSON.stringify(indexConfig.fields)}`);
          } catch (error) {
            if (error.code === 85) {
              // Index already exists with different options
              logger.warn(`⚠️  Index already exists on ${collectionConfig.collection}: ${JSON.stringify(indexConfig.fields)}`);
            } else {
              logger.error(`❌ Failed to create index on ${collectionConfig.collection}:`, error.message);
            }
          }
        }
      } else {
        logger.warn(`⚠️  Collection ${collectionConfig.collection} does not exist, skipping indexes`);
      }
    }
    
    logger.info(`✅ Created ${indexesCreated} performance indexes`);
    return indexesCreated;
    
  } catch (error) {
    logger.error('❌ Failed to create performance indexes:', error.message);
    throw error;
  }
};

/**
 * Optimize License Database Queries (for license server)
 */
export const optimizeLicenseDatabase = async () => {
  try {
    logger.info('🔍 Optimizing license database indexes...');
    
    // Skip license database optimization if not available
    // This will be handled by the license server itself
    logger.info('⚠️  License database optimization skipped - handled by license server');
    
    return 0;
    
  } catch (error) {
    logger.error('❌ Failed to optimize license database:', error.message);
    throw error;
  }
};

/**
 * Configure Read Replicas for Analytics Queries
 */
export const configureReadReplicas = async () => {
  try {
    // Check if read replicas are configured
    const replicaSetStatus = await mongoose.connection.db.admin().command({ replSetGetStatus: 1 });
    
    if (replicaSetStatus.ok) {
      logger.info('✅ MongoDB replica set detected');
      
      // Configure read preference for analytics using mongoose connection
      mongoose.connection.readPreference = 'secondaryPreferred';
      
      // Create a separate connection for analytics with secondary read preference
      const analyticsConnectionOptions = {
        ...getOptimizedConnectionOptions(),
        readPreference: 'secondary',
        readConcern: { level: 'available' }, // Faster reads, eventual consistency
        maxStalenessSeconds: 120, // Allow up to 2 minutes of staleness
        autoIndex: false // Disable auto-index creation for secondary connections
      };
      
      // Store analytics connection for use in analytics queries
      global.analyticsConnection = mongoose.createConnection(
        process.env.MONGODB_URI, 
        analyticsConnectionOptions
      );
      
      logger.info('✅ Analytics connection configured with secondary read preference');
      return true;
    } else {
      logger.warn('⚠️  No replica set detected, using primary for all reads');
      return false;
    }
  } catch (error) {
    // Check if it's an Atlas cluster (which has replica sets but may not allow replSetGetStatus)
    const isAtlas = process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb.net');
    
    if (isAtlas) {
      logger.info('ℹ️  MongoDB Atlas detected - replica set configuration managed by Atlas');
      
      // Configure read preference for Atlas using mongoose connection
      mongoose.connection.readPreference = 'secondaryPreferred';
      logger.info('✅ Read preference set to secondaryPreferred for Atlas');
      return true;
    } else {
      logger.warn('⚠️  Could not configure read replicas:', error.message);
      return false;
    }
  }
};

/**
 * Optimize Mongoose Query Performance
 */
export const optimizeMongooseQueries = () => {
  // Set global Mongoose options for performance
  mongoose.set('bufferCommands', false); // Disable buffering for better error handling
  mongoose.set('maxTimeMS', 30000); // Set maximum query execution time to 30 seconds
  
  // Enable query result caching for frequently accessed data
  mongoose.set('applyPluginsToDiscriminators', true);
  
  // Enable strict mode for better performance
  mongoose.set('strict', true);
  mongoose.set('strictQuery', true);
  
  // Disable automatic index creation in production
  if (process.env.NODE_ENV === 'production') {
    mongoose.set('autoIndex', false);
  }
  
  logger.info('✅ Mongoose query optimizations applied');
};

/**
 * Create Database Performance Monitoring
 */
export const setupPerformanceMonitoring = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Create performance monitoring collection
    const perfCollectionExists = await db.listCollections({ name: 'database_performance' }).hasNext();
    
    if (!perfCollectionExists) {
      await db.createCollection('database_performance', {
        capped: true,
        size: 52428800, // 50MB
        max: 50000 // Maximum 50,000 documents
      });
      
      // Create indexes for performance collection
      const perfCollection = db.collection('database_performance');
      await perfCollection.createIndex({ timestamp: -1 }, { background: true });
      await perfCollection.createIndex({ operation: 1, timestamp: -1 }, { background: true });
      await perfCollection.createIndex({ duration: -1 }, { background: true });
      
      logger.info('✅ Database performance monitoring collection created');
    }
    
    // Set up command monitoring
    if (process.env.NODE_ENV === 'development') {
      mongoose.connection.on('commandStarted', (event) => {
        if (event.commandName !== 'isMaster' && event.commandName !== 'ping') {
          logger.debug(`MongoDB Command Started: ${event.commandName}`, {
            command: event.command,
            requestId: event.requestId
          });
        }
      });
      
      mongoose.connection.on('commandSucceeded', (event) => {
        if (event.commandName !== 'isMaster' && event.commandName !== 'ping') {
          logger.debug(`MongoDB Command Succeeded: ${event.commandName} (${event.duration}ms)`, {
            duration: event.duration,
            requestId: event.requestId
          });
        }
      });
      
      mongoose.connection.on('commandFailed', (event) => {
        logger.error(`MongoDB Command Failed: ${event.commandName}`, {
          error: event.failure,
          duration: event.duration,
          requestId: event.requestId
        });
      });
    }
    
    return true;
  } catch (error) {
    logger.error('❌ Failed to setup performance monitoring:', error.message);
    return false;
  }
};

/**
 * Analyze and Report Database Performance
 */
export const analyzePerformance = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Get database statistics
    const dbStats = await db.stats();
    
    // Get collection statistics (handle Atlas permission issues)
    const collections = await db.listCollections().toArray();
    const collectionStats = {};
    
    for (const collection of collections) {
      try {
        const stats = await db.collection(collection.name).stats();
        collectionStats[collection.name] = {
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          indexes: stats.nindexes,
          indexSize: stats.totalIndexSize
        };
      } catch (error) {
        // Some collections might not support stats or have permission issues
        if (error.code === 8000 || error.codeName === 'AtlasError') {
          // Atlas permission issue - use basic info
          collectionStats[collection.name] = {
            count: 'N/A (Atlas)',
            size: 'N/A (Atlas)',
            avgObjSize: 'N/A (Atlas)',
            storageSize: 'N/A (Atlas)',
            indexes: 'N/A (Atlas)',
            indexSize: 'N/A (Atlas)'
          };
        } else {
          logger.warn(`Could not get stats for collection ${collection.name}: ${error.message}`);
        }
      }
    }
    
    // Get slow queries from profiler (skip for Atlas)
    let slowQueries = [];
    try {
      const isAtlas = process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb.net');
      
      if (!isAtlas) {
        const profilerCollection = db.collection('system.profile');
        slowQueries = await profilerCollection
          .find({ ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }) // Last 24 hours
          .sort({ ts: -1 })
          .limit(10)
          .toArray();
      } else {
        logger.info('ℹ️  Slow query analysis skipped for MongoDB Atlas (use Atlas Performance Advisor)');
      }
    } catch (error) {
      logger.warn('⚠️  Could not retrieve slow queries from profiler (likely Atlas or permission issue)');
    }
    
    const performanceReport = {
      timestamp: new Date(),
      database: {
        name: db.databaseName,
        collections: dbStats.collections,
        objects: dbStats.objects,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexes: dbStats.indexes,
        indexSize: dbStats.indexSize,
        avgObjSize: dbStats.avgObjSize
      },
      collections: collectionStats,
      slowQueries: slowQueries.map(q => ({
        operation: q.command || q.op,
        duration: q.millis,
        timestamp: q.ts,
        namespace: q.ns
      })),
      recommendations: generatePerformanceRecommendations(dbStats, collectionStats, slowQueries)
    };
    
    logger.info('📊 Database Performance Report Generated', performanceReport);
    
    return performanceReport;
  } catch (error) {
    logger.error('❌ Failed to analyze database performance:', error.message);
    throw error;
  }
};

/**
 * Generate Performance Recommendations
 */
const generatePerformanceRecommendations = (dbStats, collectionStats, slowQueries) => {
  const recommendations = [];
  
  // Check for large collections without proper indexing
  Object.entries(collectionStats).forEach(([name, stats]) => {
    if (stats.count > 10000 && stats.indexes < 3) {
      recommendations.push({
        type: 'indexing',
        priority: 'high',
        message: `Collection '${name}' has ${stats.count} documents but only ${stats.indexes} indexes. Consider adding more indexes for frequently queried fields.`
      });
    }
    
    if (stats.avgObjSize > 1024 * 1024) { // 1MB
      recommendations.push({
        type: 'schema',
        priority: 'medium',
        message: `Collection '${name}' has large average document size (${Math.round(stats.avgObjSize / 1024)}KB). Consider document restructuring or GridFS for large data.`
      });
    }
  });
  
  // Check for slow queries
  if (slowQueries.length > 0) {
    const avgSlowQueryTime = slowQueries.reduce((sum, q) => sum + q.millis, 0) / slowQueries.length;
    if (avgSlowQueryTime > 1000) {
      recommendations.push({
        type: 'query_optimization',
        priority: 'high',
        message: `Average slow query time is ${Math.round(avgSlowQueryTime)}ms. Review query patterns and add appropriate indexes.`
      });
    }
  }
  
  // Check index to data ratio
  if (dbStats.indexSize > dbStats.dataSize * 0.5) {
    recommendations.push({
      type: 'indexing',
      priority: 'medium',
      message: 'Index size is more than 50% of data size. Review and remove unused indexes.'
    });
  }
  
  return recommendations;
};

/**
 * Main Database Optimization Function
 */
export const optimizeDatabase = async () => {
  logger.info('🚀 Starting database optimization...');
  
  try {
    // Apply Mongoose optimizations
    optimizeMongooseQueries();
    
    // Configure slow query logging
    await configureSlowQueryLogging();
    
    // Create performance indexes
    const mainIndexes = await createPerformanceIndexes();
    
    // Optimize license database
    const licenseIndexes = await optimizeLicenseDatabase();
    
    // Configure read replicas
    await configureReadReplicas();
    
    // Setup performance monitoring
    await setupPerformanceMonitoring();
    
    // Generate performance report
    const report = await analyzePerformance();
    
    logger.info('✅ Database optimization completed successfully', {
      mainIndexes,
      licenseIndexes,
      totalIndexes: mainIndexes + licenseIndexes
    });
    
    return {
      success: true,
      mainIndexes,
      licenseIndexes,
      totalIndexes: mainIndexes + licenseIndexes,
      performanceReport: report
    };
    
  } catch (error) {
    logger.error('❌ Database optimization failed:', error.message);
    throw error;
  }
};

export default {
  optimizeDatabase,
  getOptimizedConnectionOptions,
  configureSlowQueryLogging,
  createPerformanceIndexes,
  optimizeLicenseDatabase,
  configureReadReplicas,
  optimizeMongooseQueries,
  setupPerformanceMonitoring,
  analyzePerformance
};