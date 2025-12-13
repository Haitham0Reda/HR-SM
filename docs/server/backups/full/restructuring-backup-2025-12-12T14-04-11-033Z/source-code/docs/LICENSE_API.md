# License API Reference

## Overview

This document provides a complete API reference for the License Management System in the Modular HRMS. All endpoints require authentication unless otherwise specified.

## Table of Contents

1. [Authentication](#authentication)
2. [License Management](#license-management)
3. [Module Management](#module-management)
4. [Usage Tracking](#usage-tracking)
5. [Audit Logs](#audit-logs)
6. [Error Responses](#error-responses)
7. [Rate Limiting](#rate-limiting)
8. [Webhooks](#webhooks)

## Authentication

All API requests require authentication using JWT tokens.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Tenant-ID: <tenant_id>  (Required for multi-tenant SaaS)
```

### Example Request

```bash
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

## License Management

### Get License Details

Retrieve complete license information for a tenant.

**Endpoint:** `GET /api/v1/licenses/:tenantId`

**Parameters:**
- `tenantId` (path, required): Tenant identifier

**Response:**
```json
{
  "success": true,
  "license": {
    "_id": "507f1f77bcf86cd799439012",
    "tenantId": "507f1f77bcf86cd799439011",
    "subscriptionId": "sub_1234567890",
    "modules": [
      {
        "key": "attendance",
        "enabled": true,
        "tier": "business",
        "limits": {
          "employees": 200,
          "devices": 10,
          "storage": 10737418240,
          "apiCalls": 50000
        },
        "activatedAt": "2025-01-01T00:00:00Z",
        "expiresAt": "2026-01-01T00:00:00Z"
      }
    ],
    "billingCycle": "monthly",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-09T10:00:00Z"
  }
}
```

**Error Responses:**
- `404 Not Found`: License not found for tenant
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: Insufficient permissions

---

### Create or Update License

Create a new license or update an existing one.

**Endpoint:** `POST /api/v1/licenses`

**Request Body:**
```json
{
  "tenantId": "507f1f77bcf86cd799439011",
  "subscriptionId": "sub_1234567890",
  "modules": [
    {
      "key": "attendance",
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200,
        "devices": 10,
        "storage": 10737418240,
        "apiCalls": 50000
      },
      "expiresAt": "2026-01-01T00:00:00Z"
    }
  ],
  "billingCycle": "monthly",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "license": {
    "_id": "507f1f77bcf86cd799439012",
    "tenantId": "507f1f77bcf86cd799439011",
    "modules": [...],
    "status": "active",
    "createdAt": "2025-12-09T10:00:00Z"
  },
  "message": "License created successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `409 Conflict`: License already exists (use PUT to update)
- `401 Unauthorized`: Invalid authentication

---

### Update License

Update an existing license.

**Endpoint:** `PUT /api/v1/licenses/:tenantId`

**Parameters:**
- `tenantId` (path, required): Tenant identifier

**Request Body:**
```json
{
  "modules": [
    {
      "key": "attendance",
      "enabled": true,
      "tier": "enterprise",
      "limits": {
        "employees": "unlimited",
        "devices": "unlimited",
        "storage": "unlimited",
        "apiCalls": "unlimited"
      }
    }
  ],
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "license": {
    "_id": "507f1f77bcf86cd799439012",
    "tenantId": "507f1f77bcf86cd799439011",
    "modules": [...],
    "updatedAt": "2025-12-09T10:30:00Z"
  },
  "message": "License updated successfully"
}
```

---

### Delete License

Delete a license (use with caution).

**Endpoint:** `DELETE /api/v1/licenses/:tenantId`

**Parameters:**
- `tenantId` (path, required): Tenant identifier

**Response:**
```json
{
  "success": true,
  "message": "License deleted successfully"
}
```

**Note:** Deleting a license disables all modules except Core HR. Data is preserved.

---

## Module Management

### Activate Module

Enable a module for a tenant.

**Endpoint:** `POST /api/v1/licenses/:tenantId/modules/:moduleKey/activate`

**Parameters:**
- `tenantId` (path, required): Tenant identifier
- `moduleKey` (path, required): Module key (e.g., "attendance", "leave")

**Request Body:**
```json
{
  "tier": "business",
  "limits": {
    "employees": 200,
    "devices": 10,
    "storage": 10737418240
  },
  "expiresAt": "2026-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "module": {
    "key": "attendance",
    "enabled": true,
    "tier": "business",
    "limits": {...},
    "activatedAt": "2025-12-09T10:00:00Z",
    "expiresAt": "2026-01-01T00:00:00Z"
  },
  "message": "Module activated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing dependencies
- `404 Not Found`: Module not found
- `409 Conflict`: Module already activated

---

### Deactivate Module

Disable a module for a tenant.

**Endpoint:** `POST /api/v1/licenses/:tenantId/modules/:moduleKey/deactivate`

**Parameters:**
- `tenantId` (path, required): Tenant identifier
- `moduleKey` (path, required): Module key

**Response:**
```json
{
  "success": true,
  "message": "Module deactivated successfully",
  "note": "Module data has been preserved and can be reactivated"
}
```

**Note:** Deactivating a module does not delete data.

---

### Get Module Status

Check if a specific module is enabled.

**Endpoint:** `GET /api/v1/licenses/:tenantId/modules/:moduleKey`

**Parameters:**
- `tenantId` (path, required): Tenant identifier
- `moduleKey` (path, required): Module key

**Response:**
```json
{
  "success": true,
  "module": {
    "key": "attendance",
    "enabled": true,
    "tier": "business",
    "limits": {
      "employees": 200,
      "devices": 10
    },
    "usage": {
      "employees": {
        "current": 180,
        "limit": 200,
        "percentage": 90
      },
      "devices": {
        "current": 8,
        "limit": 10,
        "percentage": 80
      }
    },
    "expiresAt": "2026-01-01T00:00:00Z"
  }
}
```

---

### List Available Modules

Get list of all available modules with their configurations.

**Endpoint:** `GET /api/v1/modules`

**Query Parameters:**
- `includeDisabled` (optional): Include disabled modules (default: false)

**Response:**
```json
{
  "success": true,
  "modules": [
    {
      "key": "attendance",
      "displayName": "Attendance & Time Tracking",
      "description": "Track employee attendance, working hours, and time-off",
      "pricing": {
        "starter": {
          "monthly": 5,
          "onPremise": 500
        },
        "business": {
          "monthly": 8,
          "onPremise": 1500
        },
        "enterprise": {
          "monthly": "custom",
          "onPremise": "custom"
        }
      },
      "dependencies": {
        "required": ["hr-core"],
        "optional": ["payroll"]
      }
    }
  ]
}
```

---

## Usage Tracking

### Get Usage Metrics

Retrieve current usage metrics for a tenant.

**Endpoint:** `GET /api/v1/licenses/:tenantId/usage`

**Parameters:**
- `tenantId` (path, required): Tenant identifier

**Query Parameters:**
- `moduleKey` (optional): Filter by specific module
- `period` (optional): Period in format YYYY-MM (default: current month)

**Response:**
```json
{
  "success": true,
  "tenantId": "507f1f77bcf86cd799439011",
  "period": "2025-12",
  "modules": {
    "attendance": {
      "usage": {
        "employees": {
          "current": 180,
          "limit": 200,
          "percentage": 90
        },
        "devices": {
          "current": 8,
          "limit": 10,
          "percentage": 80
        },
        "storage": {
          "current": 8589934592,
          "limit": 10737418240,
          "percentage": 80
        },
        "apiCalls": {
          "current": 42000,
          "limit": 50000,
          "percentage": 84
        }
      },
      "warnings": [
        {
          "limitType": "employees",
          "percentage": 90,
          "triggeredAt": "2025-12-08T14:30:00Z"
        }
      ],
      "violations": []
    }
  }
}
```

---

### Get Usage History

Retrieve historical usage data.

**Endpoint:** `GET /api/v1/licenses/:tenantId/usage/history`

**Parameters:**
- `tenantId` (path, required): Tenant identifier

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `moduleKey` (optional): Filter by module
- `limitType` (optional): Filter by limit type (employees, storage, apiCalls)

**Response:**
```json
{
  "success": true,
  "tenantId": "507f1f77bcf86cd799439011",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "history": [
    {
      "period": "2025-01",
      "moduleKey": "attendance",
      "usage": {
        "employees": { "current": 150, "limit": 200 },
        "devices": { "current": 6, "limit": 10 }
      }
    },
    {
      "period": "2025-02",
      "moduleKey": "attendance",
      "usage": {
        "employees": { "current": 165, "limit": 200 },
        "devices": { "current": 7, "limit": 10 }
      }
    }
  ]
}
```

---

### Track Usage Event

Manually record a usage event (typically called by system, not directly).

**Endpoint:** `POST /api/v1/licenses/:tenantId/usage/track`

**Parameters:**
- `tenantId` (path, required): Tenant identifier

**Request Body:**
```json
{
  "moduleKey": "attendance",
  "usageType": "apiCalls",
  "amount": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usage tracked successfully",
  "currentUsage": {
    "apiCalls": {
      "current": 42001,
      "limit": 50000,
      "percentage": 84
    }
  }
}
```

---

## Audit Logs

### Query Audit Logs

Retrieve license audit logs with filtering.

**Endpoint:** `GET /api/v1/licenses/audit`

**Query Parameters:**
- `tenantId` (optional): Filter by tenant
- `moduleKey` (optional): Filter by module
- `eventType` (optional): Filter by event type
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `severity` (optional): Filter by severity (info, warning, error, critical)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "page": 1,
  "limit": 50,
  "total": 1250,
  "logs": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "tenantId": "507f1f77bcf86cd799439011",
      "moduleKey": "attendance",
      "eventType": "VALIDATION_SUCCESS",
      "details": {
        "userId": "507f1f77bcf86cd799439014",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      },
      "severity": "info",
      "timestamp": "2025-12-09T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "tenantId": "507f1f77bcf86cd799439011",
      "moduleKey": "attendance",
      "eventType": "LIMIT_WARNING",
      "details": {
        "limitType": "employees",
        "currentValue": 180,
        "limitValue": 200,
        "percentage": 90
      },
      "severity": "warning",
      "timestamp": "2025-12-08T14:30:00Z"
    }
  ]
}
```

---

### Get Audit Log by ID

Retrieve a specific audit log entry.

**Endpoint:** `GET /api/v1/licenses/audit/:logId`

**Parameters:**
- `logId` (path, required): Audit log identifier

**Response:**
```json
{
  "success": true,
  "log": {
    "_id": "507f1f77bcf86cd799439013",
    "tenantId": "507f1f77bcf86cd799439011",
    "moduleKey": "attendance",
    "eventType": "VALIDATION_SUCCESS",
    "details": {...},
    "severity": "info",
    "timestamp": "2025-12-09T10:00:00Z"
  }
}
```

---

### Export Audit Logs

Export audit logs in various formats.

**Endpoint:** `GET /api/v1/licenses/audit/export`

**Query Parameters:**
- Same as Query Audit Logs
- `format` (required): Export format (json, csv, pdf)

**Response:**
- Content-Type varies based on format
- File download with appropriate headers

**Example:**
```bash
curl -X GET "http://localhost:5000/api/v1/licenses/audit/export?format=csv&startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer TOKEN" \
  -o audit-logs.csv
```

---

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2025-12-09T10:00:00Z",
  "requestId": "req_1234567890"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MODULE_NOT_LICENSED` | 403 | Module not included in license |
| `LICENSE_EXPIRED` | 403 | License has expired |
| `LIMIT_EXCEEDED` | 429 | Usage limit reached |
| `LICENSE_VALIDATION_FAILED` | 500 | System error during validation |
| `INVALID_LICENSE_FILE` | 500 | Malformed license file |
| `MISSING_DEPENDENCY` | 400 | Required module not enabled |
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Error Response Examples

**Module Not Licensed:**
```json
{
  "success": false,
  "error": "MODULE_NOT_LICENSED",
  "message": "The attendance module is not included in your license",
  "details": {
    "moduleKey": "attendance",
    "upgradeUrl": "/pricing?module=attendance"
  },
  "timestamp": "2025-12-09T10:00:00Z"
}
```

**License Expired:**
```json
{
  "success": false,
  "error": "LICENSE_EXPIRED",
  "message": "Your license expired on 2025-12-01",
  "details": {
    "expiresAt": "2025-12-01T00:00:00Z",
    "renewalUrl": "/settings/license",
    "contactEmail": "support@vendor.com"
  },
  "timestamp": "2025-12-09T10:00:00Z"
}
```

**Limit Exceeded:**
```json
{
  "success": false,
  "error": "LIMIT_EXCEEDED",
  "message": "Employee limit exceeded (200/200)",
  "details": {
    "limitType": "employees",
    "current": 200,
    "limit": 200,
    "upgradeUrl": "/pricing?upgrade=employees"
  },
  "timestamp": "2025-12-09T10:00:00Z"
}
```

---

## Rate Limiting

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638360000
```

### Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET /api/v1/licenses/* | 1000 | 1 hour |
| POST /api/v1/licenses | 100 | 1 hour |
| PUT /api/v1/licenses/* | 100 | 1 hour |
| DELETE /api/v1/licenses/* | 10 | 1 hour |
| GET /api/v1/licenses/*/usage | 500 | 1 hour |
| POST /api/v1/licenses/*/usage/track | 10000 | 1 hour |
| GET /api/v1/licenses/audit | 200 | 1 hour |

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Try again in 3600 seconds",
  "details": {
    "limit": 1000,
    "remaining": 0,
    "resetAt": "2025-12-09T11:00:00Z"
  }
}
```

---

## Webhooks

### Webhook Events

The system can send webhooks for license events.

**Supported Events:**
- `license.created`
- `license.updated`
- `license.expired`
- `module.activated`
- `module.deactivated`
- `usage.warning` (80% threshold)
- `usage.critical` (95% threshold)
- `usage.exceeded` (100% exceeded)
- `license.renewed`

### Webhook Payload Format

```json
{
  "event": "usage.warning",
  "timestamp": "2025-12-09T10:00:00Z",
  "data": {
    "tenantId": "507f1f77bcf86cd799439011",
    "moduleKey": "attendance",
    "limitType": "employees",
    "usage": {
      "current": 180,
      "limit": 200,
      "percentage": 90
    }
  }
}
```

### Webhook Configuration

Configure webhooks in tenant settings:

**Endpoint:** `POST /api/v1/settings/webhooks`

**Request Body:**
```json
{
  "url": "https://your-domain.com/webhooks/license",
  "events": ["usage.warning", "license.expired"],
  "secret": "your-webhook-secret"
}
```

### Webhook Signature Verification

Webhooks include a signature header for verification:

```
X-Webhook-Signature: sha256=abc123...
```

**Verification Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';
const TOKEN = 'your-jwt-token';

// Get license details
async function getLicense(tenantId) {
  const response = await axios.get(`${API_BASE}/licenses/${tenantId}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}

// Activate module
async function activateModule(tenantId, moduleKey, config) {
  const response = await axios.post(
    `${API_BASE}/licenses/${tenantId}/modules/${moduleKey}/activate`,
    config,
    {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

// Get usage metrics
async function getUsage(tenantId) {
  const response = await axios.get(`${API_BASE}/licenses/${tenantId}/usage`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  });
  return response.data;
}
```

### Python

```python
import requests

API_BASE = 'http://localhost:5000/api/v1'
TOKEN = 'your-jwt-token'

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# Get license details
def get_license(tenant_id):
    response = requests.get(
        f'{API_BASE}/licenses/{tenant_id}',
        headers=headers
    )
    return response.json()

# Activate module
def activate_module(tenant_id, module_key, config):
    response = requests.post(
        f'{API_BASE}/licenses/{tenant_id}/modules/{module_key}/activate',
        json=config,
        headers=headers
    )
    return response.json()

# Get usage metrics
def get_usage(tenant_id):
    response = requests.get(
        f'{API_BASE}/licenses/{tenant_id}/usage',
        headers=headers
    )
    return response.json()
```

### cURL

```bash
# Get license details
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"

# Activate module
curl -X POST http://localhost:5000/api/v1/licenses/:tenantId/modules/attendance/activate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "business",
    "limits": {
      "employees": 200,
      "devices": 10
    },
    "expiresAt": "2026-01-01T00:00:00Z"
  }'

# Get usage metrics
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId/usage \
  -H "Authorization: Bearer TOKEN"
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 100)
- `sort`: Sort field (default: varies by endpoint)
- `order`: Sort order (asc, desc)

**Response Format:**
```json
{
  "success": true,
  "page": 1,
  "limit": 50,
  "total": 1250,
  "totalPages": 25,
  "data": [...]
}
```

---

## Filtering and Sorting

Many endpoints support filtering and sorting:

**Example:**
```bash
GET /api/v1/licenses/audit?tenantId=XXX&eventType=LIMIT_WARNING&sort=timestamp&order=desc
```

**Common Filter Fields:**
- `tenantId`: Filter by tenant
- `moduleKey`: Filter by module
- `status`: Filter by status
- `startDate`: Filter by date range start
- `endDate`: Filter by date range end

---

## Best Practices

### 1. Use Caching

Cache license data on the client side to reduce API calls:

```javascript
const licenseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getLicenseCached(tenantId) {
  const cached = licenseCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await getLicense(tenantId);
  licenseCache.set(tenantId, {
    data,
    timestamp: Date.now()
  });
  return data;
}
```

### 2. Handle Rate Limits

Implement exponential backoff for rate limit errors:

```javascript
async function apiCallWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Validate Before Requests

Check module status before making requests:

```javascript
async function ensureModuleEnabled(tenantId, moduleKey) {
  const license = await getLicense(tenantId);
  const module = license.modules.find(m => m.key === moduleKey);
  
  if (!module || !module.enabled) {
    throw new Error(`Module ${moduleKey} is not enabled`);
  }
  
  return module;
}
```

### 4. Monitor Usage

Regularly check usage to avoid hitting limits:

```javascript
async function checkUsageWarnings(tenantId) {
  const usage = await getUsage(tenantId);
  const warnings = [];
  
  for (const [moduleKey, moduleUsage] of Object.entries(usage.modules)) {
    for (const [limitType, limit] of Object.entries(moduleUsage.usage)) {
      if (limit.percentage >= 80) {
        warnings.push({
          module: moduleKey,
          limitType,
          percentage: limit.percentage
        });
      }
    }
  }
  
  return warnings;
}
```

---

## Related Documentation

- [LICENSE_MANAGEMENT.md](LICENSE_MANAGEMENT.md) - License management guide
- [ON_PREMISE_LICENSE.md](ON_PREMISE_LICENSE.md) - On-Premise specific guide
- [LICENSE_TROUBLESHOOTING.md](LICENSE_TROUBLESHOOTING.md) - Troubleshooting guide
- [USAGE_REPORTING.md](USAGE_REPORTING.md) - Usage reporting guide
