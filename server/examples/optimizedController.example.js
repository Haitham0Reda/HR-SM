/**
 * Example Controller Demonstrating Database Performance Optimizations
 * Shows how to use lean queries, read replicas, and performance monitoring
 */

import { asyncHandler } from '../core/utils/asyncHandler.js';
import User from '../modules/hr-core/models/User.js';
import Tenant from '../platform/tenants/models/Tenant.js';
import { 
  leanQuery, 
  leanFindOne, 
  optimizedAggregate, 
  analyzeQueryPerformance,
  createOptimizedQueryBuilder 
} from '../utils/queryOptimizer.js';

// Create optimized query builder for User model
const UserQuery = createOptimizedQueryBuilder(User);
const TenantQuery = createOptimizedQueryBuilder(Tenant);

/**
 * Example: Get users list with lean query for read-only operations
 * Uses lean() for better performance when you don't need Mongoose document methods
 */
export const getUsersOptimized = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, department, status, search } = req.query;
  const skip = (page - 1) * limit;
  
  // Build filter
  const filter = { tenantId: req.tenantId };
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Use lean query for better performance (read-only operation)
  const users = await leanQuery(User, filter, {
    select: 'firstName lastName email role department status hireDate',
    sort: { lastName: 1, firstName: 1 },
    limit: parseInt(limit),
    skip: skip,
    populate: {
      path: 'department',
      select: 'name',
      options: { lean: true } // Also use lean for populated documents
    },
    useSecondary: true, // Use read replica if available
    maxTimeMS: 10000 // 10 second timeout
  });
  
  // Get total count (also optimized)
  const total = await User.countDocuments(filter).maxTimeMS(5000);
  
  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Example: Get single user with lean query
 * Demonstrates optimized single document retrieval
 */
export const getUserOptimized = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Use lean findOne for read-only operation
  const user = await leanFindOne(User, 
    { _id: id, tenantId: req.tenantId },
    {
      populate: [
        { path: 'department', select: 'name', options: { lean: true } },
        { path: 'manager', select: 'firstName lastName', options: { lean: true } }
      ],
      useSecondary: true
    }
  );
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: user
  });
});

/**
 * Example: Analytics query using optimized aggregation
 * Demonstrates complex analytics with read replica usage
 */
export const getUserAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const pipeline = [
    {
      $match: {
        tenantId: req.tenantId,
        ...(startDate && endDate && {
          hireDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        })
      }
    },
    {
      $group: {
        _id: {
          department: '$department',
          role: '$role',
          status: '$status'
        },
        count: { $sum: 1 },
        avgHireDate: { $avg: '$hireDate' }
      }
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id.department',
        foreignField: '_id',
        as: 'departmentInfo'
      }
    },
    {
      $project: {
        department: { $arrayElemAt: ['$departmentInfo.name', 0] },
        role: '$_id.role',
        status: '$_id.status',
        count: 1,
        avgHireDate: 1
      }
    },
    {
      $sort: { count: -1 }
    }
  ];
  
  // Use optimized aggregation with secondary read preference
  const analytics = await optimizedAggregate(User, pipeline, {
    useSecondary: true, // Use read replica for analytics
    maxTimeMS: 30000, // 30 second timeout for complex analytics
    allowDiskUse: true // Allow disk usage for large datasets
  });
  
  res.json({
    success: true,
    data: analytics
  });
});

/**
 * Example: Performance-monitored query
 * Demonstrates query performance analysis
 */
export const getPerformanceMonitoredData = asyncHandler(async (req, res) => {
  const queryFunction = async () => {
    return await leanQuery(User, 
      { tenantId: req.tenantId, status: 'active' },
      {
        select: 'firstName lastName email role',
        sort: { lastName: 1 },
        limit: 100,
        useSecondary: true
      }
    );
  };
  
  // Analyze query performance
  const { result, performance } = await analyzeQueryPerformance(
    queryFunction, 
    'Get Active Users'
  );
  
  res.json({
    success: true,
    data: result,
    performance: {
      duration: performance.duration,
      queryName: performance.queryName,
      timestamp: performance.timestamp
    }
  });
});

/**
 * Example: Batch processing for large datasets
 * Demonstrates efficient processing of large collections
 */
export const processBatchData = asyncHandler(async (req, res) => {
  const { action } = req.body;
  
  let processedCount = 0;
  
  const processor = async (batch) => {
    // Process each batch of users
    for (const user of batch) {
      // Example: Update user status or perform some operation
      if (action === 'updateLastLogin') {
        await User.updateOne(
          { _id: user._id },
          { $set: { lastLoginAt: new Date() } }
        );
      }
      processedCount++;
    }
  };
  
  // Use batch processing for efficient handling of large datasets
  const result = await UserQuery.batchProcess(
    { tenantId: req.tenantId, status: 'active' },
    processor,
    {
      batchSize: 500, // Process 500 users at a time
      select: '_id email status',
      useSecondary: false // Use primary for updates
    }
  );
  
  res.json({
    success: true,
    message: `Processed ${result.processedCount} users in batches`,
    data: {
      processedCount: result.processedCount,
      action
    }
  });
});

/**
 * Example: Tenant analytics with optimized queries
 * Demonstrates complex tenant analytics using multiple optimization techniques
 */
export const getTenantAnalytics = asyncHandler(async (req, res) => {
  const { timeframe = '30d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  switch (timeframe) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }
  
  // Run multiple optimized queries in parallel
  const [
    tenantOverview,
    userGrowth,
    performanceMetrics,
    riskAnalysis
  ] = await Promise.all([
    // Basic tenant overview (lean query)
    leanFindOne(Tenant, 
      { tenantId: req.tenantId },
      {
        select: 'name status billing usage metrics license',
        useSecondary: true
      }
    ),
    
    // User growth analytics (aggregation)
    optimizedAggregate(User, [
      {
        $match: {
          tenantId: req.tenantId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ], {
      useSecondary: true,
      maxTimeMS: 15000
    }),
    
    // Performance metrics (if available)
    optimizedAggregate(mongoose.model('PerformanceMetric'), [
      {
        $match: {
          tenantId: req.tenantId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          totalRequests: { $sum: 1 },
          errorRate: {
            $avg: {
              $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
            }
          }
        }
      }
    ], {
      useSecondary: true,
      maxTimeMS: 10000
    }).catch(() => []), // Gracefully handle if collection doesn't exist
    
    // Risk analysis based on usage patterns
    TenantQuery.findOneLean(
      { tenantId: req.tenantId },
      {
        select: 'usage restrictions license billing',
        useSecondary: true
      }
    )
  ]);
  
  // Calculate risk factors
  const riskFactors = [];
  if (riskAnalysis) {
    const storageUsage = (riskAnalysis.usage.storageUsed / (riskAnalysis.restrictions.maxStorage * 1024 * 1024)) * 100;
    const userUsage = (riskAnalysis.usage.activeUsers / riskAnalysis.restrictions.maxUsers) * 100;
    
    if (storageUsage > 80) riskFactors.push('High storage usage');
    if (userUsage > 90) riskFactors.push('Near user limit');
    if (riskAnalysis.license?.expiresAt && new Date(riskAnalysis.license.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      riskFactors.push('License expiring soon');
    }
  }
  
  res.json({
    success: true,
    data: {
      overview: tenantOverview,
      userGrowth,
      performance: performanceMetrics[0] || null,
      riskFactors,
      timeframe,
      generatedAt: new Date()
    }
  });
});

/**
 * Example: Connection pool status
 * Demonstrates monitoring database connection health
 */
export const getConnectionStatus = asyncHandler(async (req, res) => {
  const { getConnectionPoolStats } = await import('../utils/queryOptimizer.js');
  
  const stats = getConnectionPoolStats();
  
  res.json({
    success: true,
    data: {
      connection: stats,
      timestamp: new Date()
    }
  });
});

export default {
  getUsersOptimized,
  getUserOptimized,
  getUserAnalytics,
  getPerformanceMonitoredData,
  processBatchData,
  getTenantAnalytics,
  getConnectionStatus
};