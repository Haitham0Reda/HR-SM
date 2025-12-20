# Module Configuration API Documentation

This document describes the REST API endpoints for managing logging module configuration, implementing Requirements 13.1 and 13.4.

## Base URL

All endpoints are prefixed with `/api/v1/logging/module`

## Authentication

All endpoints require JWT authentication. Users can only access their own company's configuration unless they are platform administrators.

## Endpoints

### Get Module Configuration

**GET** `/api/v1/logging/module/:companyId`

Retrieves the current module configuration for a company.

**Parameters:**
- `companyId` (path) - Company identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-123",
    "moduleConfig": {
      "companyId": "company-123",
      "enabled": true,
      "features": {
        "auditLogging": true,
        "securityLogging": true,
        "performanceLogging": false,
        "userActionLogging": true,
        "frontendLogging": true,
        "detailedErrorLogging": true
      },
      "retentionPolicies": {
        "auditLogs": 2555,
        "securityLogs": 365,
        "performanceLogs": 90,
        "errorLogs": 180
      },
      "alerting": {
        "enabled": true,
        "criticalErrors": true,
        "securityEvents": true,
        "performanceThresholds": false
      },
      "lastModified": "2023-12-01T10:00:00Z",
      "modifiedBy": "admin-user"
    },
    "essentialEvents": ["authentication_attempt", "security_breach", ...]
  }
}
```

### Update Module Configuration

**PUT** `/api/v1/logging/module/:companyId`

Updates the module configuration for a company.

**Parameters:**
- `companyId` (path) - Company identifier

**Request Body:**
```json
{
  "enabled": true,
  "features": {
    "performanceLogging": true
  },
  "retentionPolicies": {
    "performanceLogs": 120
  },
  "alerting": {
    "performanceThresholds": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Module configuration updated successfully",
  "data": {
    "companyId": "company-123",
    "moduleConfig": { ... },
    "updatedBy": "company:user-123",
    "updatedAt": "2023-12-01T11:00:00Z"
  }
}
```

### Update Module Status

**PUT** `/api/v1/logging/module/:companyId/status`

Enables or disables the logging module for a company.

**Parameters:**
- `companyId` (path) - Company identifier

**Request Body:**
```json
{
  "enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logging module disabled successfully",
  "data": {
    "companyId": "company-123",
    "enabled": false,
    "essentialLoggingActive": true,
    "updatedBy": "company:user-123",
    "updatedAt": "2023-12-01T11:00:00Z"
  }
}
```

### Get Enabled Features

**GET** `/api/v1/logging/module/:companyId/features`

Retrieves the list of enabled features for a company.

**Parameters:**
- `companyId` (path) - Company identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-123",
    "moduleEnabled": true,
    "enabledFeatures": ["auditLogging", "securityLogging", "frontendLogging"],
    "allFeatures": { ... },
    "essentialFeatures": ["auditLogging", "securityLogging"]
  }
}
```

### Check Feature Status

**GET** `/api/v1/logging/module/:companyId/features/:featureName`

Checks if a specific feature is enabled for a company.

**Parameters:**
- `companyId` (path) - Company identifier
- `featureName` (path) - Feature name

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-123",
    "featureName": "performanceLogging",
    "enabled": true,
    "essential": false,
    "reason": "Feature enabled by configuration"
  }
}
```

### Toggle Individual Feature

**PUT** `/api/v1/logging/module/:companyId/features/:featureName/toggle`

Toggles an individual feature on or off.

**Parameters:**
- `companyId` (path) - Company identifier
- `featureName` (path) - Feature name

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feature performanceLogging enabled successfully",
  "data": {
    "companyId": "company-123",
    "featureName": "performanceLogging",
    "enabled": true,
    "essential": false,
    "updatedBy": "company:user-123",
    "updatedAt": "2023-12-01T11:00:00Z"
  }
}
```

### Batch Update Features

**PUT** `/api/v1/logging/module/:companyId/features/batch`

Updates multiple features in a single request.

**Parameters:**
- `companyId` (path) - Company identifier

**Request Body:**
```json
{
  "features": {
    "performanceLogging": true,
    "userActionLogging": false,
    "frontendLogging": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Features updated successfully",
  "data": {
    "companyId": "company-123",
    "updatedFeatures": ["performanceLogging", "userActionLogging", "frontendLogging"],
    "currentFeatures": { ... },
    "updatedBy": "company:user-123",
    "updatedAt": "2023-12-01T11:00:00Z"
  }
}
```

### Update Retention Policy

**PUT** `/api/v1/logging/module/:companyId/retention/:logType`

Updates the retention policy for a specific log type.

**Parameters:**
- `companyId` (path) - Company identifier
- `logType` (path) - Log type (auditLogs, securityLogs, performanceLogs, errorLogs)

**Request Body:**
```json
{
  "retentionDays": 180
}
```

**Response:**
```json
{
  "success": true,
  "message": "Retention policy for performanceLogs updated successfully",
  "data": {
    "companyId": "company-123",
    "logType": "performanceLogs",
    "retentionDays": 180,
    "allRetentionPolicies": { ... },
    "updatedBy": "company:user-123",
    "updatedAt": "2023-12-01T11:00:00Z"
  }
}
```

### Update Alerting Configuration

**PUT** `/api/v1/logging/module/:companyId/alerting`

Updates the alerting configuration for a company.

**Parameters:**
- `companyId` (path) - Company identifier

**Request Body:**
```json
{
  "enabled": true,
  "criticalErrors": true,
  "securityEvents": true,
  "performanceThresholds": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alerting configuration updated successfully",
  "data": {
    "companyId": "company-123",
    "alertingConfig": { ... },
    "updatedBy": "company:user-123",
    "updatedAt": "2023-12-01T11:00:00Z"
  }
}
```

### Preview Configuration Changes

**POST** `/api/v1/logging/module/:companyId/preview`

Previews configuration changes without applying them.

**Parameters:**
- `companyId` (path) - Company identifier

**Request Body:**
```json
{
  "features": {
    "performanceLogging": true
  },
  "retentionPolicies": {
    "performanceLogs": 60
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-123",
    "currentConfig": { ... },
    "previewConfig": { ... },
    "changes": { ... },
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": ["Short retention period for performanceLogs: 60 days"],
      "essentialViolations": []
    },
    "impact": {
      "moduleStatusChange": false,
      "featureChanges": [
        {
          "feature": "performanceLogging",
          "from": false,
          "to": true,
          "essential": false
        }
      ],
      "retentionChanges": [...],
      "alertingChanges": [],
      "estimatedLogVolumeChange": 20
    },
    "previewedAt": "2023-12-01T11:00:00Z"
  }
}
```

### Export Configuration

**GET** `/api/v1/logging/module/:companyId/export`

Exports the module configuration for backup or migration.

**Parameters:**
- `companyId` (path) - Company identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-123",
    "exportedAt": "2023-12-01T11:00:00Z",
    "moduleConfig": { ... },
    "essentialEvents": [...]
  }
}
```

### Import Configuration

**POST** `/api/v1/logging/module/:companyId/import`

Imports a previously exported configuration.

**Parameters:**
- `companyId` (path) - Company identifier

**Request Body:**
```json
{
  "companyId": "company-123",
  "exportedAt": "2023-12-01T10:00:00Z",
  "moduleConfig": { ... },
  "essentialEvents": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Module configuration imported successfully",
  "data": {
    "companyId": "company-123",
    "moduleConfig": { ... },
    "importedBy": "company:user-123",
    "importedAt": "2023-12-01T11:00:00Z"
  }
}
```

### Reset Configuration

**POST** `/api/v1/logging/module/:companyId/reset`

Resets the module configuration to default values.

**Parameters:**
- `companyId` (path) - Company identifier

**Response:**
```json
{
  "success": true,
  "message": "Module configuration reset to defaults successfully",
  "data": {
    "companyId": "company-123",
    "moduleConfig": { ... },
    "resetBy": "company:user-123",
    "resetAt": "2023-12-01T11:00:00Z"
  }
}
```

### Get Configuration Audit Trail

**GET** `/api/v1/logging/module/:companyId/audit`

Retrieves the audit trail for configuration changes.

**Parameters:**
- `companyId` (path) - Company identifier
- `limit` (query, optional) - Maximum number of entries (default: 50)
- `timeRange` (query, optional) - Time range in hours (default: 24)

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-123",
    "auditEntries": [
      {
        "id": "config_audit_1701423600000_abc123",
        "timestamp": "2023-12-01T11:00:00Z",
        "eventType": "configuration_changed",
        "companyId": "company-123",
        "changeCount": 2,
        "hash": "sha256hash..."
      }
    ],
    "statistics": {
      "totalEntries": 5,
      "entriesByType": {
        "configuration_changed": 3,
        "configuration_reset": 1,
        "module_status_changed": 1
      },
      "entriesByCompany": {
        "company-123": 5
      },
      "totalChanges": 8,
      "timeRange": 24
    },
    "totalEntries": 5
  }
}
```

### Validate Configuration

**POST** `/api/v1/logging/module/:companyId/validate`

Validates a configuration object without applying it.

**Parameters:**
- `companyId` (path) - Company identifier

**Request Body:**
```json
{
  "enabled": true,
  "features": {
    "auditLogging": true,
    "performanceLogging": "invalid"
  },
  "retentionPolicies": {
    "auditLogs": -1
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-123",
    "valid": false,
    "errors": [
      "Feature performanceLogging must be a boolean",
      "Invalid retention days for auditLogs: -1"
    ],
    "warnings": [],
    "validatedAt": "2023-12-01T11:00:00Z"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors, missing parameters)
- `401` - Unauthorized (invalid or missing JWT token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (company not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

Configuration change endpoints are rate limited to 20 requests per 15-minute window per IP address.

## Authorization

- **Company Users**: Can only access their own company's configuration
- **Platform Administrators**: Can access any company's configuration
- **Essential Features**: Cannot be disabled by any user (platform security requirement)

## Audit Trail

All configuration changes are automatically logged to an audit trail with:
- Unique audit ID
- Timestamp
- Company ID
- User who made the change
- Type of change
- Tamper-proof hash

The audit trail is immutable and provides complete traceability of all configuration changes as required by compliance standards.