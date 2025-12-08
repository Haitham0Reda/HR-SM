# License Management API Implementation

## Overview

This document describes the implementation of the License Management API endpoints for the HRMS productization feature.

## Implemented Endpoints

All endpoints require authentication (`protect` middleware) and admin privileges (`admin` middleware).

### 1. Create or Update License
**POST** `/api/v1/licenses`

Creates a new license or updates an existing one for a tenant.

**Request Body:**
```json
{
  "tenantId": "ObjectId",
  "subscriptionId": "string",
  "modules": [
    {
      "key": "attendance",
      "enabled": true,
      "tier": "starter",
      "limits": {
        "employees": 50,
        "storage": 1073741824,
        "apiCalls": 10000
      },
      "expiresAt": "2025-12-31T23:59:59Z"
    }
  ],
  "billingCycle": "monthly",
  "status": "active",
  "trialEndsAt": "2025-01-31T23:59:59Z",
  "paymentMethod": "credit_card",
  "billingEmail": "billing@company.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "License created successfully",
  "license": { ... }
}
```

### 2. Get License Details
**GET** `/api/v1/licenses/:tenantId`

Retrieves license details for a specific tenant.

**Response:**
```json
{
  "success": true,
  "license": {
    "tenantId": "ObjectId",
    "subscriptionId": "string",
    "modules": [...],
    "isExpired": false,
    "isInTrial": false,
    "billingCycle": "monthly",
    "status": "active"
  }
}
```

### 3. Get Usage Metrics
**GET** `/api/v1/licenses/:tenantId/usage`

Retrieves usage metrics for a tenant's modules.

**Query Parameters:**
- `period` (optional): Period in YYYY-MM format (defaults to current month)
- `moduleKey` (optional): Specific module key to get usage for

**Response:**
```json
{
  "success": true,
  "usage": {
    "tenantId": "ObjectId",
    "period": "2025-12",
    "modules": {
      "attendance": {
        "usage": {
          "employees": {
            "current": 45,
            "limit": 50,
            "percentage": 90,
            "isApproachingLimit": true,
            "hasExceeded": false
          },
          "storage": { ... },
          "apiCalls": { ... }
        },
        "warnings": 1,
        "violations": 0
      }
    }
  }
}
```

### 4. Query Audit Logs
**GET** `/api/v1/licenses/audit`

Queries license audit logs with filtering options.

**Query Parameters:**
- `tenantId` (optional): Filter by tenant ID
- `moduleKey` (optional): Filter by module key
- `eventType` (optional): Filter by event type
- `severity` (optional): Filter by severity (info, warning, error, critical)
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `limit` (optional): Number of records to return (1-1000, default: 100)
- `skip` (optional): Number of records to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "tenantId": "ObjectId",
      "moduleKey": "attendance",
      "eventType": "MODULE_ACTIVATED",
      "severity": "info",
      "timestamp": "2025-12-08T12:00:00Z",
      "details": { ... }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "skip": 0,
    "hasMore": true
  }
}
```

### 5. Activate Module
**POST** `/api/v1/licenses/:tenantId/modules/:moduleKey/activate`

Activates a module for a tenant.

**Request Body:**
```json
{
  "tier": "starter",
  "limits": {
    "employees": 50,
    "storage": 1073741824,
    "apiCalls": 10000
  },
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Module activated successfully",
  "module": {
    "key": "attendance",
    "enabled": true,
    "tier": "starter",
    "limits": { ... },
    "activatedAt": "2025-12-08T12:00:00Z",
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

### 6. Deactivate Module
**POST** `/api/v1/licenses/:tenantId/modules/:moduleKey/deactivate`

Deactivates a module for a tenant.

**Response:**
```json
{
  "success": true,
  "message": "Module deactivated successfully",
  "module": {
    "key": "attendance",
    "enabled": false,
    "tier": "starter",
    "limits": { ... }
  }
}
```

## Files Created

1. **server/controller/license.controller.js** - Controller with all endpoint handlers
2. **server/routes/license.routes.js** - Route definitions
3. **server/testing/controller/license.controller.test.js** - Integration tests

## Files Modified

1. **server/routes/index.js** - Added license routes export
2. **server/app.js** - Registered license routes

## Features

- ✅ Full CRUD operations for licenses
- ✅ Module activation/deactivation
- ✅ Usage metrics retrieval
- ✅ Audit log querying with filtering
- ✅ Automatic audit logging for all operations
- ✅ Cache invalidation on license changes
- ✅ Input validation and error handling
- ✅ Integration with existing license validator service
- ✅ Integration with usage tracker service
- ✅ Comprehensive test coverage (14 tests, all passing)

## Security

- All endpoints require authentication (`protect` middleware)
- All endpoints require admin privileges (`admin` middleware)
- Input validation for all parameters
- Prevents deactivation of Core HR module
- Validates module keys and pricing tiers

## Validation Requirements

The implementation validates:
- **Requirements 1.1**: Module license status independence (each module can be queried independently)
- **Requirements 7.4**: Usage reporting with detailed metrics per module
- **Requirements 10.4**: Audit log querying with comprehensive filtering options

## Testing

Run tests with:
```bash
npm test -- server/testing/controller/license.controller.test.js
```

All 14 tests pass successfully:
- ✅ Create new license
- ✅ Update existing license
- ✅ Get license details
- ✅ Activate module
- ✅ Deactivate module
- ✅ Query audit logs
- ✅ Get usage metrics
- ✅ Error handling for invalid inputs
- ✅ Validation of required fields
- ✅ Protection of Core HR module

## Next Steps

The license management API is now complete and ready for use. The next task in the implementation plan is:

**Task 22**: Checkpoint - Ensure all integration tests pass
