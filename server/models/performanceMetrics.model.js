import mongoose from 'mongoose';

const performanceMetricsSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true
  },
  requestId: {
    type: String,
    required: true,
    index: true
  },
  path: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
  },
  statusCode: {
    type: Number,
    required: true
  },
  responseTime: {
    type: Number,
    required: true
  },
  memoryUsage: {
    type: Number
  },
  cpuUsage: {
    type: Number
  },
  userId: {
    type: String,
    index: true
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 7776000 // 90 days TTL
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'performancemetrics'
});

// Compound indexes for better query performance
performanceMetricsSchema.index({ tenantId: 1, timestamp: -1 });
performanceMetricsSchema.index({ path: 1, method: 1, timestamp: -1 });
performanceMetricsSchema.index({ responseTime: -1 });
performanceMetricsSchema.index({ statusCode: 1, timestamp: -1 });

const PerformanceMetrics = mongoose.model('PerformanceMetrics', performanceMetricsSchema);

export default PerformanceMetrics;