# Database Optimization Guide

## Overview

This document describes the comprehensive database performance optimizations implemented in the HR-SM platform, including connection pooling, indexing strategies, query optimization, and read replica support.

## Table of Contents

1. [Connection Pool Optimization](#connection-pool-optimization)
2. [Index Strategy](#index-strategy)
3. [Query Optimization](#query-optimization)
4. [Read Replica Support](#read-replica-support)
5. [Slow Query Logging](#slow-query-logging)
6. [Performance Monitoring](#performance-monitoring)
7. [Usage Examples](#usage-examples)
8. [Maintenance](#maintenance)

## Connection Pool Optimization

### Main Database Configuration

The main HR-SM database uses optimized connection pool settings:

```javascript
{
  maxPoolSize: 20,        // Maximum connections (increased from 10)
  minPoolSize: 5,         // Minimum warm connections (increased from 2)
  maxIdleTimeMS: 30000,   // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000
}
```

### License Server Configuration

The license server uses a slightly smaller pool optimized for license operations:

```javascript
{
  maxPoolSize: 15,        // Smaller pool for license server
  minPoolSize: 3,         // Maintain warm connections
  w: 'majority',          // Write concern for durability
  j: true                 // Enable journaling for license operations
}
```

### Benefits

- **Improved Concurrency**: Larger pool size handles more simultaneous requests
- **Reduced Latency**: Warm connections eliminate connection overhead
- **Better Resource Management**: Automatic cleanup of idle connections

## Index Strategy

### Comprehensive Indexing

The optimization creates indexes for all frequently queried fields across collections:

#### User Collection Indexes

```javascript
// Compound indexes for multi-tenant queries
{ email: 1, tenantId: 1 }           // Unique constraint
{ employeeId: 1, tenantId: 1 }      // Unique constraint
{ tenantId: 1, status: 1 }          // Status filtering
{ tenantId: 1, department: 1 }      // Department queries
{ tenantId: 1, manager: 1 }         // Manager hierarchy
{ tenantId: 1, role: 1 }            // Role-based queries
{ tenantId: 1, hireDate: 1 }        // Date range queries
{ tenantId: 1, status: 1, role: 1 } // Complex filtering
```

#### Attendance Collection Indexes

```javascript
{ tenantId: 1, employee: 1, date: 1 }  // Unique constraint
{ tenantId: 1, date: 1 }               // Date queries
{ tenantId: 1, status: 1, date: 1 }    // Status filtering
{ tenantId: 1, employee: 1, date: -1 } // Recent attendance
{ tenantId: 1, department: 1, date: 1 } // Department reports
```

#### License Collection Indexes (License Server)

```javascript
{ licenseNumber: 1 }                    // Unique constraint
{ tenantId: 1 }                         // Tenant lookup (REQUIRED)
{ status: 1 }                           // Status filtering (REQUIRED)
{ expiresAt: 1 }                        // Expiry monitoring (REQUIRED)
{ tenantId: 1, status: 1, expiresAt: 1 } // Compound query
{ 'activations.machineId': 1 }          // Machine binding
{ 'usage.lastValidatedAt': -1 }         // Usage tracking
```

#### Performance Metrics Indexes

```javascript
{ tenantId: 1, timestamp: -1 }          // Recent metrics
{ path: 1, method: 1, timestamp: -1 }   // Endpoint analysis
{ responseTime: -1 }                    // Slow query detection
{ timestamp: 1 }                        // TTL index (90 days)
```

#### Audit Log Indexes

```javascript
{ tenantId: 1, timestamp: -1 }          // Recent logs
{ tenantId: 1, userId: 1, timestamp: -1 } // User activity
{ tenantId: 1, action: 1, timestamp: -1 } // Action filtering
{ ipAddress: 1, timestamp: -1 }         // Security analysis
{ timestamp: 1 }                        // TTL index (2 years)
```

### Index Creation

Indexes are created automatically on application startup or can be run manually:

```bash
# Run optimization script
node server/scripts/optimizeDatabase.js
```

### Background Index Creation

All indexes are created with `background: true` to avoid blocking database operations during creation.

## Query Optimization

### Lean Queries for Read-Only Operations

Use `lean()` queries when you don't need Mongoose document methods:

```javascript
import { leanQuery, leanFindOne } from '../utils/queryOptimizer.js';

// Optimized list query
const users = await leanQuery(User, 
  { tenantId: req.tenantId, status: 'active' },
  {
    select: 'firstName lastName email role',
    sort: { lastName: 1 },
    limit: 20,
    skip: 0,
    populate: {
      path: 'department',
      select: 'name',
      options: { lean: true }
    },
    useSecondary: true,  // Use read replica if available
    maxTimeMS: 10000     // 10 second timeout
  }
);

// Optimized single document query
const user = await leanFindOne(User,
  { _id: userId, tenantId: req.tenantId },
  {
    populate: ['department', 'manager'],
    useSecondary: true
  }
);
```

### Benefits of Lean Queries

- **50-60% faster** than regular Mongoose queries
- **Lower memory usage** (plain JavaScript objects)
- **Better for read-only operations** (lists, reports, analytics)

### When NOT to Use Lean Queries

- When you need to call Mongoose document methods
- When you need to save/update the document
- When you need virtuals or getters (unless explicitly enabled)

### Optimized Aggregation

```javascript
import { optimizedAggregate } from '../utils/queryOptimizer.js';

const analytics = await optimizedAggregate(User, [
  { $match: { tenantId: req.tenantId } },
  { $group: { _id: '$department', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
], {
  useSecondary: true,    // Use read replica
  maxTimeMS: 30000,      // 30 second timeout
  allowDiskUse: true,    // Allow disk for large datasets
  cursor: false          // Return all results at once
});
```

### Batch Processing for Large Datasets

```javascript
import { batchProcess } from '../utils/queryOptimizer.js';

const result = await batchProcess(
  User,
  { tenantId: req.tenantId, status: 'active' },
  async (batch) => {
    // Process each batch
    for (const user of batch) {
      await processUser(user);
    }
  },
  {
    batchSize: 500,      // Process 500 at a time
    select: '_id email',
    useSecondary: true
  }
);
```

### Query Builder Pattern

```javascript
import { createOptimizedQueryBuilder } from '../utils/queryOptimizer.js';

const UserQuery = createOptimizedQueryBuilder(User);

// Use optimized methods
const users = await UserQuery.findLean(
  { tenantId: req.tenantId },
  { limit: 20, useSecondary: true }
);

const count = await UserQuery.count({ tenantId: req.tenantId });

const analytics = await UserQuery.aggregate([...pipeline], {
  useSecondary: true
});
```

## Read Replica Support

### Configuration

Read replicas are automatically detected and configured if MongoDB is running in replica set mode:

```javascript
// Automatic configuration on startup
await configureReadReplicas();
```

### Usage

Queries can specify read preference:

```javascript
// Use secondary for analytics (eventual consistency acceptable)
const analytics = await leanQuery(User, filter, {
  useSecondary: true  // Routes to secondary if available
});

// Use primary for critical reads
const user = await leanQuery(User, filter, {
  useSecondary: false  // Always use primary
});
```

### Read Preference Strategies

- **Primary**: All reads from primary (default for writes)
- **PrimaryPreferred**: Primary if available, secondary otherwise
- **Secondary**: Read from secondary only
- **SecondaryPreferred**: Secondary if available, primary otherwise (used for analytics)

### Benefits

- **Reduced load on primary**: Analytics queries use secondaries
- **Better performance**: Distribute read load across replicas
- **High availability**: Automatic failover if primary fails

## Slow Query Logging

### Configuration

Slow query logging is automatically enabled on startup:

```javascript
// Logs operations slower than 100ms
await configureSlowQueryLogging();
```

### Profiler Settings

```javascript
{
  profile: 2,           // Profile all operations
  slowms: 100,          // Log operations > 100ms
  sampleRate: 1.0       // Sample 100% of operations
}
```

### Viewing Slow Queries

```javascript
// Query the profiler collection
db.system.profile.find({
  ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  millis: { $gte: 100 }
}).sort({ ts: -1 }).limit(10);
```

### Analyzing Slow Queries

```javascript
import { analyzeIndexUsage } from '../utils/queryOptimizer.js';

const analysis = await analyzeIndexUsage(User, {
  tenantId: req.tenantId,
  status: 'active'
});

console.log({
  indexUsed: analysis.indexUsed,
  documentsExamined: analysis.documentsExamined,
  documentsReturned: analysis.documentsReturned,
  executionTime: analysis.executionTimeMillis,
  efficiency: analysis.efficiency
});
```

## Performance Monitoring

### Query Performance Tracking

```javascript
import { analyzeQueryPerformance } from '../utils/queryOptimizer.js';

const { result, performance } = await analyzeQueryPerformance(
  async () => {
    return await User.find({ tenantId: req.tenantId }).lean();
  },
  'Get Tenant Users'
);

console.log({
  duration: performance.duration,
  memoryDelta: performance.memoryDelta,
  queryName: performance.queryName
});
```

### Connection Pool Monitoring

```javascript
import { getConnectionPoolStats } from '../utils/queryOptimizer.js';

const stats = getConnectionPoolStats();
console.log({
  readyState: stats.readyState,
  host: stats.host,
  poolSize: stats.poolSize
});
```

### Performance Report Generation

```javascript
import { analyzePerformance } from '../config/databaseOptimization.js';

const report = await analyzePerformance();
console.log({
  database: report.database,
  collections: report.collections,
  slowQueries: report.slowQueries,
  recommendations: report.recommendations
});
```

## Usage Examples

### Example 1: Optimized User List

```javascript
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const users = await leanQuery(User,
    { tenantId: req.tenantId, status: 'active' },
    {
      select: 'firstName lastName email role',
      sort: { lastName: 1 },
      limit: parseInt(limit),
      skip: (page - 1) * limit,
      useSecondary: true
    }
  );
  
  res.json({ success: true, data: users });
});
```

### Example 2: Analytics with Read Replica

```javascript
export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await optimizedAggregate(User, [
    { $match: { tenantId: req.tenantId } },
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ], {
    useSecondary: true,
    maxTimeMS: 30000,
    allowDiskUse: true
  });
  
  res.json({ success: true, data: analytics });
});
```

### Example 3: Batch Update

```javascript
export const batchUpdate = asyncHandler(async (req, res) => {
  const result = await batchProcess(
    User,
    { tenantId: req.tenantId, status: 'inactive' },
    async (batch) => {
      const ids = batch.map(u => u._id);
      await User.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'archived' } }
      );
    },
    { batchSize: 500 }
  );
  
  res.json({ 
    success: true, 
    message: `Updated ${result.processedCount} users` 
  });
});
```

## Maintenance

### Running Optimization

```bash
# Run full database optimization
node server/scripts/optimizeDatabase.js

# Output:
# 🚀 Starting Database Optimization Script...
# ✅ Connected to main database
# ✅ Created 45 performance indexes
# ✅ Optimized license database with 15 indexes
# ✅ Database optimization completed successfully
```

### Monitoring Index Usage

```javascript
// Check index usage for a collection
db.users.aggregate([
  { $indexStats: {} }
]);

// Find unused indexes
db.users.aggregate([
  { $indexStats: {} },
  { $match: { 'accesses.ops': 0 } }
]);
```

### Rebuilding Indexes

```bash
# Rebuild all indexes (run during maintenance window)
db.users.reIndex();
db.attendances.reIndex();
db.licenses.reIndex();
```

### Performance Tuning

1. **Monitor slow queries** regularly using the profiler
2. **Analyze index usage** to identify missing or unused indexes
3. **Review connection pool** metrics during peak load
4. **Optimize aggregation pipelines** for complex analytics
5. **Use read replicas** for analytics and reporting queries

### Best Practices

1. **Always use lean() for read-only operations**
2. **Add indexes for frequently queried fields**
3. **Use compound indexes for multi-field queries**
4. **Set maxTimeMS to prevent runaway queries**
5. **Use batch processing for large datasets**
6. **Monitor and analyze slow queries regularly**
7. **Use read replicas for analytics queries**
8. **Keep indexes in RAM for best performance**
9. **Use TTL indexes for automatic data cleanup**
10. **Test query performance before deploying**

## Performance Metrics

### Expected Improvements

- **Query Performance**: 50-60% faster with lean queries
- **Memory Usage**: 40-50% reduction with lean queries
- **Connection Overhead**: 30-40% reduction with connection pooling
- **Analytics Performance**: 2-3x faster with read replicas
- **Index Lookup**: 10-100x faster than collection scans

### Monitoring Thresholds

- **Slow Query**: > 100ms
- **Very Slow Query**: > 1000ms
- **Connection Pool**: > 80% utilization
- **Index Efficiency**: < 0.5 (examined/returned ratio)
- **Memory Usage**: > 85% of available

## Troubleshooting

### High Query Times

1. Check if indexes are being used: `explain('executionStats')`
2. Review query filters for optimization opportunities
3. Consider adding compound indexes
4. Use lean() for read-only operations
5. Increase maxTimeMS if needed

### Connection Pool Exhaustion

1. Increase maxPoolSize in configuration
2. Review long-running queries
3. Check for connection leaks
4. Monitor connection pool metrics
5. Consider horizontal scaling

### Memory Issues

1. Use lean() queries to reduce memory usage
2. Implement batch processing for large datasets
3. Use cursor-based pagination
4. Limit result set sizes
5. Monitor memory usage patterns

## Additional Resources

- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [Mongoose Performance Tips](https://mongoosejs.com/docs/guide.html#performance)
- [MongoDB Indexing Strategies](https://docs.mongodb.com/manual/indexes/)
- [Connection Pooling](https://docs.mongodb.com/manual/reference/connection-string/#connection-pool-options)