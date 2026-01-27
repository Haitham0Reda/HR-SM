# License Server Client

The `LicenseServerClient` is a service class that handles communication with the License Server API for tenant metadata management. It provides a clean, type-safe interface for querying tenant information, enabled modules, and subscription status.

## Overview

The License Server Client is part of the platform data migration architecture that separates platform control (License Server) from business operations (Main Backend). It enables the main backend to query tenant metadata from the centralized License Server instead of maintaining duplicate data locally.

## Features

- ✅ **HTTP Client with Authentication**: Automatic API key authentication for all requests
- ✅ **Retry Logic**: Automatic retry with exponential backoff for transient failures
- ✅ **Error Handling**: Comprehensive error handling with custom error types
- ✅ **Timeout Management**: Configurable timeouts to prevent hanging requests
- ✅ **Logging**: Detailed logging for debugging and monitoring
- ✅ **Type Safety**: Clear method signatures and error types

## Installation

The client is already included in the main backend. No additional installation is required.

## Configuration

Set the following environment variables in your `.env` file:

```bash
# License Server Configuration
LICENSE_SERVER_URL=http://localhost:4000
LICENSE_SERVER_API_KEY=your-license-server-api-key-change-this-in-production
```

## Basic Usage

### 1. Create Client Instance

```javascript
import { LicenseServerClient } from './services/licenseServerClient.js';

const client = new LicenseServerClient(
  process.env.LICENSE_SERVER_URL,
  process.env.LICENSE_SERVER_API_KEY,
  {
    timeout: 5000,      // Optional: 5 seconds (default)
    maxRetries: 3,      // Optional: 3 retries (default)
    retryDelay: 1000    // Optional: 1 second delay (default)
  }
);
```

### 2. Get Tenant Information

```javascript
try {
  const tenant = await client.getTenant('techcorp_solutions');
  
  console.log('Tenant:', tenant.name);
  console.log('Subscription:', tenant.subscription.status);
  console.log('Modules:', tenant.enabledModules);
} catch (error) {
  console.error('Failed to get tenant:', error.message);
}
```

### 3. Get Enabled Modules

```javascript
try {
  const modules = await client.getEnabledModules('techcorp_solutions');
  
  console.log('Enabled modules:', modules);
  // Output: ['surveys', 'payroll', 'attendance']
} catch (error) {
  console.error('Failed to get modules:', error.message);
}
```

### 4. Check Module Enablement

```javascript
try {
  const isEnabled = await client.isModuleEnabled('techcorp_solutions', 'surveys');
  
  if (isEnabled) {
    console.log('Surveys module is enabled');
  } else {
    console.log('Surveys module is not enabled');
  }
} catch (error) {
  console.error('Failed to check module:', error.message);
}
```

### 5. Validate License

```javascript
try {
  const validation = await client.validateLicense(
    'techcorp_solutions',
    'TECH-CORP-2024-ENTERPRISE'
  );
  
  if (validation.valid) {
    console.log('License is valid');
  } else {
    console.log('License is invalid:', validation.reason);
  }
} catch (error) {
  console.error('License validation failed:', error.message);
}
```

### 6. Get Subscription Details

```javascript
try {
  const subscription = await client.getSubscription('techcorp_solutions');
  
  console.log('Plan:', subscription.plan);
  console.log('Status:', subscription.status);
  console.log('Expires:', subscription.expiresAt);
} catch (error) {
  console.error('Failed to get subscription:', error.message);
}
```

## Error Handling

The client throws `LicenseServerError` for all API failures. This error includes:

- `message`: Human-readable error message
- `originalError`: The original error object (if available)
- `statusCode`: HTTP status code (if available)
- `timestamp`: When the error occurred

### Error Handling Example

```javascript
import { LicenseServerError } from './services/licenseServerClient.js';

try {
  const tenant = await client.getTenant('nonexistent_tenant');
} catch (error) {
  if (error instanceof LicenseServerError) {
    switch (error.statusCode) {
      case 404:
        console.log('Tenant not found');
        break;
      case 401:
        console.log('Authentication failed');
        break;
      case 403:
        console.log('Insufficient permissions');
        break;
      case 500:
      case 502:
      case 503:
        console.log('License Server error');
        break;
      default:
        console.log('Unexpected error:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Retry Logic

The client automatically retries failed requests in the following scenarios:

- **Network Errors**: ECONNREFUSED, ENOTFOUND, ETIMEDOUT, ECONNRESET
- **Timeout Errors**: Request timeout exceeded
- **Server Errors**: 5xx status codes
- **Rate Limiting**: 429 Too Many Requests

The retry logic uses exponential backoff:
- 1st retry: 1 second delay
- 2nd retry: 2 seconds delay
- 3rd retry: 4 seconds delay

Client errors (4xx except 429) are NOT retried.

## Fallback to Cache Pattern

When the License Server is unavailable, you should fall back to cached data:

```javascript
async function getTenantWithFallback(tenantId) {
  try {
    // Try License Server first
    const tenant = await client.getTenant(tenantId);
    
    // Update cache with fresh data
    await updateCache(tenantId, tenant);
    
    return tenant;
  } catch (error) {
    if (error instanceof LicenseServerError) {
      logger.warn('License Server unavailable, using cache', {
        tenantId,
        error: error.message
      });

      // Fall back to cached data
      const cached = await getCachedLicense(tenantId);
      
      if (cached) {
        return cached;
      }

      throw new Error('License Server unavailable and no cache available');
    }
    throw error;
  }
}
```

## Middleware Integration

Use the client in Express middleware to check module access:

```javascript
function requireModule(moduleId) {
  return async (req, res, next) => {
    const tenantId = req.user?.tenantId;

    try {
      const isEnabled = await client.isModuleEnabled(tenantId, moduleId);

      if (!isEnabled) {
        return res.status(403).json({
          error: `Module '${moduleId}' is not enabled`
        });
      }

      next();
    } catch (error) {
      // Handle error (fail closed or use cache)
      return res.status(503).json({
        error: 'Unable to verify module access'
      });
    }
  };
}

// Usage
app.get('/api/surveys', requireModule('surveys'), getSurveys);
```

## Testing

The client includes comprehensive unit tests. Run them with:

```bash
npm test -- licenseServerClient.test.js
```

## API Reference

### Constructor

```typescript
new LicenseServerClient(baseUrl: string, apiKey: string, options?: {
  timeout?: number;      // Request timeout in milliseconds (default: 5000)
  maxRetries?: number;   // Maximum retry attempts (default: 3)
  retryDelay?: number;   // Initial retry delay in milliseconds (default: 1000)
})
```

### Methods

#### `getTenant(tenantId: string): Promise<Tenant>`

Retrieve complete tenant information including subscription and modules.

**Parameters:**
- `tenantId` (string): The tenant identifier

**Returns:** Promise resolving to tenant object

**Throws:** `LicenseServerError` if request fails

---

#### `getEnabledModules(tenantId: string): Promise<string[]>`

Get list of enabled modules for a tenant.

**Parameters:**
- `tenantId` (string): The tenant identifier

**Returns:** Promise resolving to array of module IDs

**Throws:** `LicenseServerError` if request fails

---

#### `validateLicense(tenantId: string, licenseKey: string): Promise<ValidationResult>`

Validate a license key for a tenant.

**Parameters:**
- `tenantId` (string): The tenant identifier
- `licenseKey` (string): The license key to validate

**Returns:** Promise resolving to validation result

**Throws:** `LicenseServerError` if request fails

---

#### `isModuleEnabled(tenantId: string, moduleId: string): Promise<boolean>`

Check if a specific module is enabled for a tenant.

**Parameters:**
- `tenantId` (string): The tenant identifier
- `moduleId` (string): The module identifier

**Returns:** Promise resolving to boolean

**Throws:** `LicenseServerError` if request fails

---

#### `getSubscription(tenantId: string): Promise<Subscription>`

Get subscription details for a tenant.

**Parameters:**
- `tenantId` (string): The tenant identifier

**Returns:** Promise resolving to subscription object

**Throws:** `LicenseServerError` if request fails

---

#### `testConnection(): Promise<boolean>`

Test connection to License Server.

**Returns:** Promise resolving to true if connected, false otherwise

## Requirements Validation

This implementation satisfies the following requirements from the design document:

- ✅ **Requirement 4.1**: Main backend queries License Server API for tenant information
- ✅ **Requirement 4.2**: Main backend validates module access via License Server API
- ✅ **Requirement 4.3**: Main backend checks subscription status via License Server API
- ✅ **Requirement 4.6**: Graceful error handling for API failures

## Related Documentation

- [Design Document](.kiro/specs/platform-data-migration/design.md)
- [Requirements Document](.kiro/specs/platform-data-migration/requirements.md)
- [Tasks Document](.kiro/specs/platform-data-migration/tasks.md)
- [Usage Examples](./examples/licenseServerClient.example.js)

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
