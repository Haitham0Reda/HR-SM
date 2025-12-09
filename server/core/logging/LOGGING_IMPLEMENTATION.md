# Comprehensive Logging Implementation

## Overview

This document describes the comprehensive logging, usage tracking, and alerting system implemented for the enterprise SaaS architecture.

## Components

### 1. Enhanced Logger (`server/core/logging/logger.js`)

**Features:**
- Tenant context in all logs
- Request ID tracking
- Module context support
- Structured JSON logging for files
- Colorized console output for development
- Daily log rotation (30 days retention)
- Separate error logs
- Audit logs (90 days retention)

**Usage:**

```javascript
import { logger } from './core/logging/logger.js';

// Basic logging
logger.info('User logged in');

// With tenant context
const tenantLogger = logger.forTenant('tenant_123');
tenantLogger.info('Request processed');

// With request context
const requestLogger = logger.forRequest('req_abc123', { 
  tenantId: 'tenant_123',
  userId: 'user_456'
});
requestLogger.info('Processing request');

// With module context
const moduleLogger = logger.forModule('hr-core');
moduleLogger.info('Module loaded');

// Custom context
const contextLogger = logger.withContext({
  tenantId: 'tenant_123',
  module: 'tasks',
  requestId: 'req_abc123'
});
contextLogger.info('Task created');
```

### 2. Audit Logger

**Features:**
- Separate audit log file
- 90-day retention
- Platform action logging
- Security event logging

**Usage:**

```javascript
import { auditLogger } from './core/logging/logger.js';

// Log a tenant action
auditLogger.logAction('USER_CREATED', {
  tenantId: 'tenant_123',
  userId: 'admin_456',
  resource: 'users',
  metadata: { email: 'user@example.com' }
});

// Log a platform action
auditLogger.logPlatformAction('TENANT_CREATED', {
  platformUserId: 'platform_admin_123',
  targetTenantId: 'tenant_456',
  resource: 'tenants',
  metadata: { name: 'Acme Corp' }
});

// Log a security event
auditLogger.logSecurityEvent('FAILED_LOGIN', {
  tenantId: 'tenant_123',
  userId: 'user_456',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: { attempts: 3 }
});
```

### 3. Request Logger Middleware (`server/core/middleware/requestLogger.js`)

**Features:**
- Automatic request ID generation
- Request/response logging
- Response time tracking
- Sensitive data sanitization
- Error logging

**Usage:**

```javascript
import { requestLogger, errorLogger } from './core/middleware/requestLogger.js';

app.use(requestLogger);
// ... other middleware
app.use(errorLogger);
```

**What it logs:**
- Request start (method, path, query, sanitized body)
- Request completion (status code, duration)
- Request failures (status >= 400)
- Errors (with full context)

### 4. Usage Tracking Service (`server/platform/system/services/usageTrackingService.js`)

**Features:**
- API call tracking per tenant
- Storage usage tracking
- Active user tracking
- In-memory caching with periodic database flush
- Usage metrics retrieval
- Quota warning detection

**Usage:**

```javascript
import usageTrackingService from './platform/system/services/usageTrackingService.js';

// Track API call
await usageTrackingService.trackApiCall('tenant_123', {
  endpoint: '/api/v1/tasks',
  method: 'POST',
  duration: 150
});

// Track storage usage
await usageTrackingService.trackStorageUsage('tenant_123', 1024000, {
  resource: 'documents'
});

// Track active user
await usageTrackingService.trackActiveUser('tenant_123', 'user_456');

// Get usage metrics
const metrics = await usageTrackingService.getUsageMetrics('tenant_123');
console.log(metrics);
// {
//   tenantId: 'tenant_123',
//   apiCalls: { thisMonth: 1500, cached: 23, byEndpoint: {...} },
//   storage: { used: 5242880, limit: 10737418240, percentage: '48.83' },
//   users: { total: 50, active: 12, limit: 100 }
// }

// Get all tenants usage
const allUsage = await usageTrackingService.getAllTenantsUsage();

// Update user count
await usageTrackingService.updateUserCount('tenant_123', 51);

// Flush cached data to database
await usageTrackingService.flushAll();
```

### 5. Usage Tracking Middleware (`server/core/middleware/usageTracking.js`)

**Features:**
- Automatic API call tracking
- Automatic active user tracking
- Non-blocking (doesn't fail requests)

**Usage:**

```javascript
import trackApiUsage from './core/middleware/usageTracking.js';

// Apply to tenant routes
app.use('/api/v1', tenantContext, trackApiUsage);
```

### 6. Alerting Service (`server/platform/system/services/alertingService.js`)

**Features:**
- Module loading failure alerts
- Quota exceeded alerts
- System error alerts
- Performance degradation alerts
- Alert suppression (prevents duplicates)
- Alert history (last 1000 alerts)
- Alert acknowledgment
- Alert statistics

**Alert Types:**
- `MODULE_LOADING_FAILURE` - Critical
- `QUOTA_EXCEEDED` - Warning/Critical
- `SYSTEM_ERROR` - Error/Critical
- `PERFORMANCE_DEGRADATION` - Warning/Critical

**Usage:**

```javascript
import alertingService from './platform/system/services/alertingService.js';

// Alert on module loading failure
alertingService.alertModuleLoadingFailure({
  moduleId: 'tasks',
  tenantId: 'tenant_123',
  error: 'Module not found',
  metadata: { path: '/modules/tasks' }
});

// Alert on quota exceeded
alertingService.alertQuotaExceeded({
  tenantId: 'tenant_123',
  quotaType: 'storage',
  current: 10737418240,
  limit: 10737418240,
  percentage: 100
});

// Alert on system error
alertingService.alertSystemError({
  error: 'Database connection failed',
  stack: err.stack,
  tenantId: 'tenant_123',
  requestId: 'req_abc123'
});

// Alert on performance degradation
alertingService.alertPerformanceDegradation({
  endpoint: '/api/v1/tasks',
  responseTime: 12000,
  tenantId: 'tenant_123',
  requestId: 'req_abc123'
});

// Get alert history
const alerts = alertingService.getAlertHistory({
  type: 'QUOTA_EXCEEDED',
  severity: 'critical',
  tenantId: 'tenant_123',
  limit: 50
});

// Get alert statistics
const stats = alertingService.getAlertStatistics();
console.log(stats);
// {
//   total: 150,
//   bySeverity: { critical: 10, error: 40, warning: 100 },
//   byType: { QUOTA_EXCEEDED: 50, SYSTEM_ERROR: 40, ... },
//   recent: { last24Hours: 25, lastHour: 3 }
// }

// Acknowledge alert
alertingService.acknowledgeAlert('alert_123', 'admin@example.com');

// Listen for alerts
alertingService.on('alert', (alert) => {
  console.log('Alert triggered:', alert);
});
```

### 7. Alerting Middleware (`server/core/middleware/alerting.js`)

**Features:**
- Performance monitoring
- Error monitoring
- Event listener setup

**Usage:**

```javascript
import { 
  performanceMonitoring, 
  errorMonitoring, 
  setupAlertingListeners 
} from './core/middleware/alerting.js';

// Apply middleware
app.use(performanceMonitoring);
// ... other middleware
app.use(errorMonitoring);

// Setup listeners
setupAlertingListeners(app);
```

### 8. Alert API Endpoints

**Endpoints:**

```
GET    /api/platform/system/alerts
GET    /api/platform/system/alerts/statistics
POST   /api/platform/system/alerts/:alertId/acknowledge
DELETE /api/platform/system/alerts
```

**Example:**

```bash
# Get alert history
curl -H "Authorization: Bearer $PLATFORM_TOKEN" \
  "http://localhost:5000/api/platform/system/alerts?severity=critical&limit=10"

# Get alert statistics
curl -H "Authorization: Bearer $PLATFORM_TOKEN" \
  "http://localhost:5000/api/platform/system/alerts/statistics"

# Acknowledge alert
curl -X POST \
  -H "Authorization: Bearer $PLATFORM_TOKEN" \
  "http://localhost:5000/api/platform/system/alerts/alert_123/acknowledge"

# Clear alert history
curl -X DELETE \
  -H "Authorization: Bearer $PLATFORM_TOKEN" \
  "http://localhost:5000/api/platform/system/alerts"
```

## Integration

### In app.js

```javascript
import { requestLogger, errorLogger } from './core/middleware/requestLogger.js';
import trackApiUsage from './core/middleware/usageTracking.js';
import { 
  performanceMonitoring, 
  errorMonitoring, 
  setupAlertingListeners 
} from './core/middleware/alerting.js';

// Early middleware
app.use(requestLogger);
app.use(performanceMonitoring);

// Tenant routes
app.use('/api/v1', tenantContext, trackApiUsage, tenantRoutes);

// Error handling
app.use(errorMonitoring);
app.use(errorLogger);
app.use(errorHandler);

// Setup alerting
setupAlertingListeners(app);
```

### In Module Code

```javascript
import { logger } from '../../../core/logging/logger.js';

class TaskService {
  async createTask(tenantId, taskData) {
    const taskLogger = logger.forTenant(tenantId).forModule('tasks');
    
    try {
      taskLogger.info('Creating task', { taskData });
      
      const task = await Task.create({
        tenantId,
        ...taskData
      });
      
      taskLogger.info('Task created successfully', { 
        taskId: task._id 
      });
      
      return task;
      
    } catch (error) {
      taskLogger.error('Failed to create task', {
        error: error.message,
        stack: error.stack,
        taskData
      });
      
      throw error;
    }
  }
}
```

## Log Files

### Location
All logs are stored in `logs/` directory:

```
logs/
├── 2025-12-09-application.log    # All application logs
├── 2025-12-09-error.log          # Error logs only
├── 2025-12-09-audit.log          # Audit logs
└── ...
```

### Format

**JSON Format (files):**
```json
{
  "timestamp": "2025-12-09 10:30:45",
  "level": "info",
  "message": "Request completed",
  "context": {
    "requestId": "req_abc123",
    "tenantId": "tenant_123",
    "userId": "user_456",
    "module": "tasks"
  },
  "statusCode": 200,
  "duration": "150ms"
}
```

**Console Format (development):**
```
2025-12-09 10:30:45 [info]: Request completed [Tenant: tenant_123] [Request: req_abc123] [Module: tasks]
{
  "statusCode": 200,
  "duration": "150ms"
}
```

## Log Filtering

### By Tenant

```bash
# Using jq
cat logs/2025-12-09-application.log | jq 'select(.context.tenantId == "tenant_123")'
```

### By Module

```bash
cat logs/2025-12-09-application.log | jq 'select(.context.module == "tasks")'
```

### By Severity

```bash
cat logs/2025-12-09-application.log | jq 'select(.level == "error")'
```

### By Request ID

```bash
cat logs/2025-12-09-application.log | jq 'select(.context.requestId == "req_abc123")'
```

## Performance Considerations

### Usage Tracking
- API calls are cached in memory and flushed every 100 calls or 5 minutes
- Active users are tracked in memory and flushed every 5 minutes
- Storage updates are immediate (critical for quota enforcement)

### Alerting
- Alert suppression prevents duplicate alerts within 5-minute window
- Alert history limited to last 1000 alerts
- Performance metrics tracked in memory

### Logging
- Structured JSON logging for efficient parsing
- Daily log rotation prevents disk space issues
- Separate error logs for quick error analysis
- Console logging only in development

## Monitoring

### Health Checks
- Database connectivity
- Redis connectivity (if enabled)
- Module loading status
- Error rates
- Response times

### Metrics
- API calls per tenant
- Storage usage per tenant
- Active users per tenant
- Error rates
- Response times
- Alert counts

## Best Practices

1. **Always use context loggers:**
   ```javascript
   const logger = logger.forTenant(tenantId).forModule('tasks');
   ```

2. **Log at appropriate levels:**
   - `debug`: Detailed debugging information
   - `info`: General informational messages
   - `warn`: Warning messages (potential issues)
   - `error`: Error messages (actual problems)

3. **Include relevant context:**
   ```javascript
   logger.info('Task created', {
     taskId: task._id,
     userId: user._id,
     assignedTo: task.assignedTo
   });
   ```

4. **Sanitize sensitive data:**
   - Passwords, tokens, secrets are automatically sanitized
   - Add custom sanitization for domain-specific sensitive data

5. **Use audit logging for important actions:**
   ```javascript
   auditLogger.logAction('USER_DELETED', {
     tenantId,
     userId: admin._id,
     resource: 'users',
     metadata: { deletedUserId: user._id }
   });
   ```

## Requirements Validation

This implementation satisfies the following requirements:

- **19.2**: Comprehensive logging with tenant context ✓
- **19.5**: Log filtering by tenant, module, severity ✓
- **19.3**: Usage tracking (API calls, storage, active users) ✓
- **19.4**: Alerting system (module failures, quotas, errors, performance) ✓

## Future Enhancements

1. **Log aggregation**: Send logs to centralized logging service (ELK, Splunk)
2. **Alert notifications**: Email, Slack, SMS notifications
3. **Advanced metrics**: Custom dashboards, real-time monitoring
4. **Log retention policies**: Configurable retention per log type
5. **Performance profiling**: Detailed performance analysis per endpoint
