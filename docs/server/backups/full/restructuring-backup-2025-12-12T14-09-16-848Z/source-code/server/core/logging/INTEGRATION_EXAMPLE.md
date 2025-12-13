# Logging System Integration Example

## Quick Start

### 1. Update app.js

```javascript
import express from 'express';
import { requestLogger, errorLogger } from './core/middleware/requestLogger.js';
import trackApiUsage from './core/middleware/usageTracking.js';
import { 
  performanceMonitoring, 
  errorMonitoring, 
  setupAlertingListeners 
} from './core/middleware/alerting.js';
import { logger } from './core/logging/logger.js';

const app = express();

// Early middleware - request logging and performance monitoring
app.use(requestLogger);
app.use(performanceMonitoring);

// ... other middleware (body-parser, cors, etc.)

// Tenant routes with usage tracking
app.use('/api/v1', 
  tenantContext,  // Existing middleware
  trackApiUsage,  // NEW: Track API usage
  tenantRoutes
);

// Platform routes (no usage tracking)
app.use('/api/platform', platformRoutes);

// Error handling middleware
app.use(errorMonitoring);  // NEW: Monitor errors
app.use(errorLogger);      // NEW: Log errors
app.use(errorHandler);     // Existing error handler

// Setup alerting listeners
setupAlertingListeners(app);

// Log server start
logger.info('Server started', {
  port: process.env.PORT || 5000,
  environment: process.env.NODE_ENV || 'development'
});

export default app;
```

### 2. Use in Controllers

```javascript
// server/modules/hr-core/requests/controllers/requestController.js
import { logger } from '../../../../core/logging/logger.js';

export const createRequest = async (req, res) => {
  try {
    // Use request-scoped logger (already has tenant and request context)
    req.logger.info('Creating request', {
      requestType: req.body.requestType,
      userId: req.user.id
    });
    
    const request = await requestService.createRequest({
      tenantId: req.tenant.tenantId,
      requestedBy: req.user.id,
      ...req.body
    });
    
    req.logger.info('Request created successfully', {
      requestId: request._id
    });
    
    res.status(201).json({
      success: true,
      data: request
    });
    
  } catch (error) {
    req.logger.error('Failed to create request', {
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
};
```

### 3. Use in Services

```javascript
// server/modules/hr-core/requests/services/requestService.js
import { logger } from '../../../../core/logging/logger.js';

class RequestService {
  constructor() {
    this.logger = logger.forModule('hr-core/requests');
  }
  
  async createRequest(data) {
    const tenantLogger = this.logger.forTenant(data.tenantId);
    
    try {
      tenantLogger.info('Creating request in database', {
        requestType: data.requestType,
        requestedBy: data.requestedBy
      });
      
      const request = await Request.create(data);
      
      tenantLogger.info('Request created', {
        requestId: request._id
      });
      
      return request;
      
    } catch (error) {
      tenantLogger.error('Failed to create request', {
        error: error.message,
        stack: error.stack,
        data
      });
      
      throw error;
    }
  }
}

export default new RequestService();
```

### 4. Use Audit Logging

```javascript
// server/platform/tenants/services/tenantService.js
import { auditLogger } from '../../../core/logging/logger.js';

class TenantService {
  async createTenant(data, createdBy) {
    const tenant = await Tenant.create(data);
    
    // Log platform action
    auditLogger.logPlatformAction('TENANT_CREATED', {
      platformUserId: createdBy,
      targetTenantId: tenant.tenantId,
      resource: 'tenants',
      metadata: {
        name: tenant.name,
        domain: tenant.domain
      }
    });
    
    return tenant;
  }
  
  async suspendTenant(tenantId, suspendedBy, reason) {
    const tenant = await Tenant.findOne({ tenantId });
    tenant.status = 'suspended';
    await tenant.save();
    
    // Log security event
    auditLogger.logSecurityEvent('TENANT_SUSPENDED', {
      tenantId,
      metadata: {
        suspendedBy,
        reason,
        previousStatus: 'active'
      }
    });
    
    return tenant;
  }
}
```

### 5. Module Loading with Alerting

```javascript
// server/core/registry/moduleLoader.js
import alertingService from '../../platform/system/services/alertingService.js';
import { logger } from '../logging/logger.js';

class ModuleLoader {
  async loadModule(moduleId, tenantId) {
    try {
      logger.info('Loading module', { moduleId, tenantId });
      
      // ... module loading logic
      
      logger.info('Module loaded successfully', { moduleId, tenantId });
      
    } catch (error) {
      logger.error('Module loading failed', {
        moduleId,
        tenantId,
        error: error.message,
        stack: error.stack
      });
      
      // Alert on module loading failure
      alertingService.alertModuleLoadingFailure({
        moduleId,
        tenantId,
        error: error.message,
        metadata: {
          stack: error.stack
        }
      });
      
      throw error;
    }
  }
}
```

### 6. Usage Tracking Integration

```javascript
// server/modules/hr-core/documents/services/documentService.js
import usageTrackingService from '../../../platform/system/services/usageTrackingService.js';

class DocumentService {
  async uploadDocument(tenantId, file) {
    // Save document
    const document = await Document.create({
      tenantId,
      filename: file.originalname,
      size: file.size,
      path: file.path
    });
    
    // Track storage usage
    await usageTrackingService.trackStorageUsage(tenantId, file.size, {
      resource: 'documents'
    });
    
    return document;
  }
  
  async deleteDocument(tenantId, documentId) {
    const document = await Document.findOne({ _id: documentId, tenantId });
    
    // Track storage usage (negative to decrease)
    await usageTrackingService.trackStorageUsage(tenantId, -document.size, {
      resource: 'documents'
    });
    
    await document.remove();
  }
}
```

### 7. Quota Checking Before Operations

```javascript
// server/modules/hr-core/users/services/userService.js
import usageTrackingService from '../../../platform/system/services/usageTrackingService.js';
import Tenant from '../../../platform/tenants/models/Tenant.js';

class UserService {
  async createUser(tenantId, userData) {
    // Check if tenant has reached user limit
    const tenant = await Tenant.findOne({ tenantId });
    
    if (tenant.limits.maxUsers && tenant.usage.userCount >= tenant.limits.maxUsers) {
      throw new Error('User limit exceeded');
    }
    
    // Create user
    const user = await User.create({
      tenantId,
      ...userData
    });
    
    // Update user count
    await usageTrackingService.updateUserCount(
      tenantId, 
      tenant.usage.userCount + 1
    );
    
    return user;
  }
}
```

## Testing the Implementation

### 1. Test Request Logging

```bash
# Make a request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/tasks

# Check logs
tail -f logs/$(date +%Y-%m-%d)-application.log | jq
```

### 2. Test Usage Tracking

```javascript
// In a test file
import usageTrackingService from './platform/system/services/usageTrackingService.js';

// Track some usage
await usageTrackingService.trackApiCall('tenant_123', {
  endpoint: '/api/v1/tasks',
  method: 'GET',
  duration: 150
});

// Get metrics
const metrics = await usageTrackingService.getUsageMetrics('tenant_123');
console.log(metrics);
```

### 3. Test Alerting

```javascript
// In a test file
import alertingService from './platform/system/services/alertingService.js';

// Trigger an alert
alertingService.alertQuotaExceeded({
  tenantId: 'tenant_123',
  quotaType: 'storage',
  current: 10737418240,
  limit: 10737418240,
  percentage: 100
});

// Get alert history
const alerts = alertingService.getAlertHistory({ limit: 10 });
console.log(alerts);
```

### 4. Test Alert API

```bash
# Get alerts
curl -H "Authorization: Bearer $PLATFORM_TOKEN" \
  http://localhost:5000/api/platform/system/alerts

# Get alert statistics
curl -H "Authorization: Bearer $PLATFORM_TOKEN" \
  http://localhost:5000/api/platform/system/alerts/statistics
```

## Log Analysis Examples

### Find all errors for a tenant

```bash
cat logs/$(date +%Y-%m-%d)-error.log | \
  jq 'select(.context.tenantId == "tenant_123")'
```

### Find slow requests

```bash
cat logs/$(date +%Y-%m-%d)-application.log | \
  jq 'select(.duration and (.duration | tonumber) > 1000)'
```

### Find all requests for a specific user

```bash
cat logs/$(date +%Y-%m-%d)-application.log | \
  jq 'select(.context.userId == "user_456")'
```

### Track a request through the system

```bash
cat logs/$(date +%Y-%m-%d)-application.log | \
  jq 'select(.context.requestId == "req_abc123")'
```

### Find all platform actions

```bash
cat logs/$(date +%Y-%m-%d)-audit.log | \
  jq 'select(.context.isPlatformAction == true)'
```

### Find all security events

```bash
cat logs/$(date +%Y-%m-%d)-audit.log | \
  jq 'select(.context.isSecurityEvent == true)'
```

## Monitoring Dashboard Integration

### Prometheus Metrics (Future Enhancement)

```javascript
import promClient from 'prom-client';

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code', 'tenant_id']
});

// Track in middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    httpRequestDuration.labels(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      req.tenant?.tenantId || 'none'
    ).observe(duration);
  });
  
  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

## Best Practices

1. **Always use request-scoped logger in controllers:**
   ```javascript
   req.logger.info('Processing request');
   ```

2. **Use tenant-scoped logger in services:**
   ```javascript
   const logger = this.logger.forTenant(tenantId);
   logger.info('Processing data');
   ```

3. **Log important state changes:**
   ```javascript
   logger.info('User status changed', {
     userId: user._id,
     oldStatus: 'active',
     newStatus: 'suspended'
   });
   ```

4. **Use audit logging for security-relevant actions:**
   ```javascript
   auditLogger.logAction('PASSWORD_CHANGED', {
     tenantId,
     userId,
     resource: 'users'
   });
   ```

5. **Track usage for quota-limited resources:**
   ```javascript
   await usageTrackingService.trackStorageUsage(tenantId, fileSize);
   ```

6. **Alert on critical failures:**
   ```javascript
   alertingService.alertSystemError({
     error: error.message,
     stack: error.stack,
     tenantId,
     requestId
   });
   ```
