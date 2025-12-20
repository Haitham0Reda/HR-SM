# License-Controlled Logging System

## Overview

The License-Controlled Logging System ensures that the platform has complete control over company logging capabilities through comprehensive license validation and enforcement. This system guarantees that all logging operations are subject to license restrictions, usage limits, and platform policies.

## Key Features

### 1. Platform Control
- **Complete Control**: Platform has full authority over all company logging capabilities
- **License Enforcement**: All logging features are tied to valid licenses
- **Usage Monitoring**: Real-time tracking of logging usage across all companies
- **Policy Enforcement**: Automatic enforcement of platform policies and compliance requirements

### 2. License Integration
- **Module-Based Licensing**: Logging is a licensed module (`MODULES.LOGGING`)
- **Tier-Based Features**: Different features available based on license tier
- **Usage Limits**: Daily log entry limits based on license tier
- **Automatic Enforcement**: License validation on every logging operation

### 3. Essential Logging Protection
- **Platform-Mandatory Events**: Certain events must always be logged regardless of license
- **Security Events**: Security-related events are always captured
- **Audit Requirements**: Compliance events cannot be disabled
- **Emergency Override**: Platform can force essential logging when needed

## Architecture

### Core Components

#### 1. License-Controlled Logging Service
**File**: `server/services/licenseControlledLogging.service.js`

Main service that manages license validation and logging control:
- Validates logging licenses
- Enforces usage limits
- Manages logging capabilities by tier
- Tracks usage statistics
- Enforces platform policies

#### 2. Platform Logging Control Service
**File**: `server/services/platformLoggingControl.service.js`

Administrative service for platform control:
- Provides dashboard and monitoring
- Manages company suspensions/restorations
- Bulk policy enforcement
- Compliance monitoring
- Administrative reporting

#### 3. License-Controlled Logging Middleware
**File**: `server/middleware/licenseControlledLogging.middleware.js`

Middleware components for request-level enforcement:
- `requireLoggingLicense()`: Validates logging license
- `requireLoggingFeature()`: Checks specific feature permissions
- `enforceUsageLimits()`: Enforces daily usage limits
- `trackLoggingOperation()`: Tracks all logging operations
- `enforcePlatformPolicies()`: Applies platform policies

#### 4. Platform Logging Control Controller
**File**: `server/controllers/platformLoggingControl.controller.js`

API endpoints for platform administrators:
- Dashboard and monitoring endpoints
- Company management endpoints
- Bulk operations
- Reporting and analytics

## License Tiers and Capabilities

### Starter Tier
```javascript
{
    dailyLogEntries: 10000,
    retentionDays: 30,
    storageGB: 1,
    features: {
        auditLogging: true,
        securityLogging: true,
        performanceLogging: false,
        userActionLogging: false,
        frontendLogging: false,
        detailedErrorLogging: false,
        realTimeMonitoring: false,
        logExport: false,
        customRetention: false
    }
}
```

### Business Tier
```javascript
{
    dailyLogEntries: 100000,
    retentionDays: 90,
    storageGB: 10,
    features: {
        auditLogging: true,
        securityLogging: true,
        performanceLogging: true,
        userActionLogging: true,
        frontendLogging: true,
        detailedErrorLogging: true,
        realTimeMonitoring: false,
        logExport: true,
        customRetention: false
    }
}
```

### Enterprise Tier
```javascript
{
    dailyLogEntries: 1000000,
    retentionDays: 365,
    storageGB: 100,
    features: {
        auditLogging: true,
        securityLogging: true,
        performanceLogging: true,
        userActionLogging: true,
        frontendLogging: true,
        detailedErrorLogging: true,
        realTimeMonitoring: true,
        logExport: true,
        customRetention: true
    }
}
```

## Platform-Mandatory Events

These events are always logged regardless of license status:

```javascript
const PLATFORM_MANDATORY_EVENTS = [
    'authentication_attempt',
    'authorization_failure',
    'security_breach',
    'data_access_violation',
    'system_error',
    'compliance_event',
    'license_violation',
    'platform_security_event',
    'cross_tenant_access',
    'admin_action'
];
```

## Usage Examples

### 1. Checking Logging License
```javascript
import licenseControlledLoggingService from './services/licenseControlledLogging.service.js';

// Check if company has valid logging license
const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense(tenantId);

if (!licenseCheck.valid) {
    console.log('No valid logging license:', licenseCheck.reason);
}
```

### 2. Getting Company Capabilities
```javascript
// Get logging capabilities based on license
const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(tenantId);

console.log('Licensed features:', capabilities.features);
console.log('Daily limit:', capabilities.limits.dailyLogEntries);
```

### 3. Checking Feature Permissions
```javascript
// Check if specific feature is allowed
const featureCheck = await licenseControlledLoggingService.isLoggingFeatureAllowed(
    tenantId, 
    'performanceLogging'
);

if (!featureCheck.allowed) {
    console.log('Feature not licensed:', featureCheck.reason);
}
```

### 4. Platform Administrative Actions
```javascript
import platformLoggingControlService from './services/platformLoggingControl.service.js';

// Suspend company logging
await platformLoggingControlService.suspendCompanyLogging(
    tenantId, 
    adminUser, 
    'License violation'
);

// Force essential logging
await platformLoggingControlService.forceEssentialLogging(
    tenantId, 
    adminUser, 
    'Security incident', 
    '24h'
);
```

## API Endpoints

### Platform Administration
- `GET /api/platform/logging-control/dashboard` - Control dashboard
- `GET /api/platform/logging-control/company/:tenantId/status` - Company status
- `POST /api/platform/logging-control/company/:tenantId/suspend` - Suspend logging
- `POST /api/platform/logging-control/company/:tenantId/restore` - Restore logging
- `POST /api/platform/logging-control/bulk-enforce` - Bulk policy enforcement

### Company Logging (License-Protected)
- `POST /api/v1/logs` - Log ingestion (requires logging license)
- `GET /api/v1/logs/stats` - Usage statistics (requires logging license)

## Middleware Integration

### Route Protection Example
```javascript
import { requireModuleLicense } from '../middleware/licenseValidation.middleware.js';
import { 
    requireLoggingLicense, 
    enforceUsageLimits, 
    trackLoggingOperation 
} from '../middleware/licenseControlledLogging.middleware.js';

router.post('/logs',
    authenticateJWT,
    extractCompanyContext,
    requireModuleLicense(MODULES.LOGGING),      // Validate logging module license
    requireLoggingLicense(),                    // Validate logging-specific license
    enforceUsageLimits(),                       // Check daily usage limits
    trackLoggingOperation(),                    // Track the operation
    logIngestionController.ingestLogs
);
```

## Monitoring and Compliance

### Usage Tracking
- Real-time usage monitoring per company
- Daily usage limits enforcement
- Usage statistics and reporting
- Automatic cleanup of old usage data

### Compliance Monitoring
- License compliance checking
- Policy violation detection
- Audit trail maintenance
- Compliance reporting

### Platform Control
- Administrative dashboard
- Company status monitoring
- Bulk operations for policy enforcement
- Emergency override capabilities

## Security Features

### License Violation Detection
- Automatic detection of license violations
- Immediate suspension of violating companies
- Platform security event logging
- Administrative notifications

### Platform Policy Enforcement
- Mandatory event logging
- Security event escalation
- Cross-tenant violation detection
- Emergency response capabilities

### Audit and Compliance
- Tamper-proof audit logs
- Platform action logging
- Compliance status tracking
- Regulatory requirement enforcement

## Configuration

### Environment Variables
```bash
# Logging module configuration
LOGGING_MODULE_CONFIG_PATH=/path/to/logging/config
LOG_TO_FILE=true
PLATFORM_LOG_LEVEL=info

# License validation
LICENSE_VALIDATION_CACHE_TTL=300
PLATFORM_AUDIT_SECRET=your-audit-secret
```

### License Configuration
The logging module must be properly configured in the license system:

```javascript
// Add to license when creating/updating
await license.activateModule(
    MODULES.LOGGING,
    'business',  // tier
    {
        dailyLogEntries: 100000,
        storageGB: 10,
        customLimits: {
            logging: {
                realTimeAlerts: true,
                exportFormats: ['json', 'csv']
            }
        }
    },
    expirationDate
);
```

## Best Practices

### For Platform Administrators
1. **Regular Monitoring**: Monitor the control dashboard regularly
2. **License Compliance**: Ensure all companies have appropriate licenses
3. **Usage Monitoring**: Track usage patterns and adjust limits as needed
4. **Policy Enforcement**: Regularly run bulk policy enforcement
5. **Emergency Procedures**: Have procedures for emergency logging overrides

### For Company Integration
1. **License Validation**: Always validate licenses before logging operations
2. **Graceful Degradation**: Handle license failures gracefully
3. **Usage Awareness**: Monitor usage to avoid hitting limits
4. **Essential Events**: Ensure essential events are properly classified
5. **Error Handling**: Implement proper error handling for license failures

## Troubleshooting

### Common Issues

#### License Validation Failures
```javascript
// Check license status
const status = await licenseControlledLoggingService.hasValidLoggingLicense(tenantId);
console.log('License status:', status);
```

#### Usage Limit Exceeded
```javascript
// Check current usage
const usage = await licenseControlledLoggingService.getUsageStatistics(tenantId);
console.log('Current usage:', usage);
```

#### Feature Not Available
```javascript
// Check feature availability
const featureCheck = await licenseControlledLoggingService.isLoggingFeatureAllowed(
    tenantId, 
    'performanceLogging'
);
console.log('Feature status:', featureCheck);
```

### Platform Control Issues
- Check platform logger for administrative actions
- Verify license module configuration
- Review compliance status
- Check for policy violations

## Integration Points

### With Existing Systems
- **License Validation Middleware**: Integrates with existing license system
- **Company Logger**: Enhanced with license control
- **Platform Logger**: Receives all control events
- **Logging Module Service**: Enhanced with platform control
- **Authentication**: Uses existing auth middleware

### Database Integration
- License information stored in existing license collection
- Usage statistics cached in memory with periodic cleanup
- Configuration stored in logging module configuration files
- Audit events logged to platform audit logs

This system ensures complete platform control over company logging while maintaining security, compliance, and proper resource management.