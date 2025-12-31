import mongoose from 'mongoose';

const systemAlertsSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    sparse: true // Some alerts might be system-wide
  },
  type: {
    type: String,
    required: true,
    enum: [
      'system_error',
      'performance_degradation',
      'high_memory_usage',
      'high_cpu_usage',
      'disk_space_low',
      'database_connection_issue',
      'license_expiry_warning',
      'security_threat',
      'backup_failure',
      'service_unavailable',
      'rate_limit_exceeded',
      'integration_failure',
      'data_inconsistency',
      'maintenance_required',
      'configuration_error',
      'network_issue',
      'authentication_service_down',
      'email_service_failure',
      'file_storage_issue',
      'cache_failure'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: ['system', 'security', 'performance', 'business', 'infrastructure'],
    default: 'system'
  },
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'warning'
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'acknowledged', 'resolved', 'suppressed'],
    default: 'active'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true // e.g., 'database', 'auth-service', 'payment-gateway'
  },
  sourceDetails: {
    service: String,
    component: String,
    version: String,
    environment: String
  },
  affectedUsers: [{
    userId: String,
    tenantId: String,
    impact: String
  }],
  metrics: {
    errorCount: Number,
    affectedRequests: Number,
    responseTime: Number,
    memoryUsage: Number,
    cpuUsage: Number,
    diskUsage: Number
  },
  thresholds: {
    warning: Number,
    critical: Number,
    unit: String
  },
  actions: [{
    action: String,
    performedBy: String,
    performedAt: Date,
    result: String,
    notes: String
  }],
  acknowledgedBy: {
    type: String
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedBy: {
    type: String
  },
  resolvedAt: {
    type: Date
  },
  resolutionNotes: {
    type: String
  },
  suppressedUntil: {
    type: Date
  },
  suppressedBy: {
    type: String
  },
  suppressionReason: {
    type: String
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  escalatedAt: {
    type: Date
  },
  escalatedTo: {
    type: String
  },
  notificationsSent: [{
    channel: String, // email, sms, slack, webhook
    recipient: String,
    sentAt: Date,
    status: String,
    response: String
  }],
  relatedAlerts: [{
    alertId: mongoose.Schema.Types.ObjectId,
    relationship: String // 'duplicate', 'related', 'caused_by', 'causes'
  }],
  tags: [String],
  priority: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  autoResolve: {
    type: Boolean,
    default: false
  },
  autoResolveAfter: {
    type: Number // minutes
  },
  recurrence: {
    isRecurring: Boolean,
    pattern: String,
    count: Number,
    lastOccurrence: Date,
    nextExpected: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'systemalerts'
});

// Compound indexes for better query performance
systemAlertsSchema.index({ createdAt: -1 });
systemAlertsSchema.index({ status: 1, severity: 1 });
systemAlertsSchema.index({ type: 1, category: 1 });
systemAlertsSchema.index({ tenantId: 1, status: 1 }, { sparse: true });
systemAlertsSchema.index({ severity: 1, status: 1, createdAt: -1 });
systemAlertsSchema.index({ source: 1, type: 1, createdAt: -1 });
systemAlertsSchema.index({ priority: -1, createdAt: -1 });

// TTL index for auto-cleanup of resolved alerts after 6 months
systemAlertsSchema.index(
  { resolvedAt: 1 }, 
  { 
    expireAfterSeconds: 15552000, // 6 months
    partialFilterExpression: { status: 'resolved' }
  }
);

const SystemAlerts = mongoose.model('SystemAlerts', systemAlertsSchema);

export default SystemAlerts;