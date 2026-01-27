# License Cache Service

## Overview

The License Cache Service provides local caching of license data from the License Server for performance optimization. It implements a 6-hour TTL (Time To Live) cache strategy with automatic fallback support when the License Server is unavailable.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    License Data Service                     │
│  (High-level API with caching and fallback logic)          │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                    │                    │
        ┌───────────▼──────────┐    ┌───▼──────────────┐
        │ License Server Client│    │  License Cache   │
        │  (HTTP API calls)    │    │  (Local MongoDB) │
        └──────────────────────┘    └──────────────────┘
                    │                         │
                    │                         │
        ┌───────────▼──────────┐    ┌────────▼─────────┐
        │  License Server API  │    │ company_license  │
        │  (Port 4000)         │    │   collection     │
        └──────────────────────┘    └──────────────────┘
```

## Components

### 1. License Cache Service (`licenseCache.js`)

Low-level cache management functions for direct cache operations.

**Functions:**

- `getCachedLicense(tenantId, connection)` - Retrieve cached license data
- `isCacheStale(cachedLicense)` - Check if cache is older than 6 hours
- `updateLicenseCache(tenantId, licenseData, connection)` - Update cache with fresh data
- `invalidateCache(tenantId, connection)` - Force cache refresh on next request
- `getCacheStats(connection)` - Get cache statistics for monitoring

**Cache TTL:** 6 hours (21,600,000 milliseconds)

### 2. License Data Service (`licenseDataService.js`)

High-level service that integrates License Server API calls with local caching and implements fallback logic.

**Methods:**

- `getTenant(tenantId, connection, options)` - Get tenant information with caching
- `getEnabledModules(tenantId, connection, options)` - Get enabled modules with caching
- `isModuleEnabled(tenantId, moduleId, connection, options)` - Check if module is enabled
- `validateLicense(tenantId, licenseKey, connection)` - Validate license with fallback
- `getSubscription(tenantId, connection, options)` - Get subscription details
- `invalidateTenantCache(tenantId, connection)` - Invalidate cache for tenant

## Usage Examples

### Basic Usage

```javascript
import { createLicenseDataService } from './services/licenseDataService.js';

// Create service instance
const licenseService = createLicenseDataService({
  licenseServerUrl: process.env.LICENSE_SERVER_URL || 'http://localhost:4000',
  licenseServerApiKey: process.env.LICENSE_SERVER_API_KEY,
  clientOptions: {
    timeout: 5000,
    maxRetries: 3
  }
});

// Get tenant information (uses cache if fresh)
const tenant = await licenseService.getTenant('techcorp_solutions');
console.log('Tenant:', tenant.name);
console.log('Subscription:', tenant.subscription.status);
console.log('Modules:', tenant.enabledModules);

// Check if specific module is enabled
const hasSurveys = await licenseService.isModuleEnabled('techcorp_solutions', 'surveys');
if (hasSurveys) {
  console.log('Surveys module is enabled');
}

// Force refresh from License Server
const freshTenant = await licenseService.getTenant('techcorp_solutions', null, {
  forceRefresh: true
});
```

### Cache Management

```javascript
import {
  getCachedLicense,
  isCacheStale,
  updateLicenseCache,
  invalidateCache,
  getCacheStats
} from './services/licenseCache.js';

// Check cache status
const cached = await getCachedLicense('techcorp_solutions');
if (cached) {
  const isStale = isCacheStale(cached);
  console.log('Cache is', isStale ? 'stale' : 'fresh');
}

// Manually update cache
await updateLicenseCache('techcorp_solutions', {
  enabledModules: ['surveys', 'payroll'],
  subscription: { status: 'active' }
});

// Invalidate cache (force refresh on next request)
await invalidateCache('techcorp_solutions');

// Get cache statistics
const stats = await getCacheStats();
console.log('Total cached licenses:', stats.total);
console.log('Fresh caches:', stats.fresh);
console.log('Stale caches:', stats.stale);
```

### Fallback Behavior

```javascript
// When License Server is unavailable, the service automatically falls back to cached data
try {
  const tenant = await licenseService.getTenant('techcorp_solutions');
  
  if (tenant.cached) {
    console.warn('Using cached data - License Server unavailable');
    console.log('Last synced:', tenant.lastSyncedAt);
  }
} catch (error) {
  // Only throws if License Server is unavailable AND no cache exists
  console.error('No license data available:', error.message);
}
```

## Cache Strategy

### Cache Flow

1. **Request arrives** for tenant data
2. **Check cache** - Is there cached data?
   - No → Query License Server → Update cache → Return data
   - Yes → Is cache fresh (< 6 hours old)?
     - Yes → Return cached data (fast path)
     - No → Query License Server → Update cache → Return data
3. **If License Server fails:**
   - Use stale cached data (if available)
   - Log warning about using stale data
   - Continue operation

### Cache Invalidation

Cache is invalidated in these scenarios:

1. **Time-based:** Automatically after 6 hours
2. **Manual:** Via `invalidateCache()` function
3. **Update-triggered:** When License Server updates tenant data

### Performance Benefits

- **Reduced API calls:** Fresh cache prevents unnecessary License Server requests
- **Lower latency:** Local cache queries are ~100x faster than API calls
- **High availability:** System continues operating when License Server is down
- **Reduced load:** License Server handles fewer requests

## Data Model

### Cached License Document

```javascript
{
  _id: ObjectId,
  companyId: "techcorp_solutions",
  licenseId: "lic_123",
  licenseNumber: "LIC-TECHCORP-001",
  
  quickAccess: {
    enabledModules: ["surveys", "payroll", "attendance"],
    subscriptionStatus: "active",
    licenseValid: true,
    status: "active",
    expiresAt: ISODate("2026-12-31T23:59:59Z"),
    lastSyncedAt: ISODate("2026-01-26T10:00:00Z")  // Cache timestamp
  },
  
  cacheInfo: {
    lastSyncedFromServer: ISODate("2026-01-26T10:00:00Z"),
    syncVersion: 5,
    checksumHash: "abc123..."
  },
  
  createdAt: ISODate("2025-01-01T00:00:00Z"),
  updatedAt: ISODate("2026-01-26T10:00:00Z")
}
```

## Error Handling

### License Server Unavailable

```javascript
// Automatic fallback to stale cache
const tenant = await licenseService.getTenant('techcorp_solutions');
// Returns cached data with warning logged

// If no cache exists, throws error
try {
  const tenant = await licenseService.getTenant('new_tenant');
} catch (error) {
  // Error: License Server unavailable and no cached license data available
}
```

### Cache Errors

```javascript
// Database errors are logged and re-thrown
try {
  await updateLicenseCache('tenant', data);
} catch (error) {
  // Error logged with full context
  // Original error re-thrown for handling
}
```

## Monitoring

### Cache Statistics

```javascript
const stats = await getCacheStats();
console.log(stats);
// {
//   total: 50,
//   fresh: 35,
//   stale: 15,
//   cacheTtlHours: 6,
//   timestamp: "2026-01-26T10:00:00Z"
// }
```

### Logging

The service logs important events:

- **Cache hits:** `debug` level
- **Cache misses:** `info` level
- **License Server queries:** `info` level
- **Fallback to stale cache:** `warn` level
- **Errors:** `error` level with full stack traces

## Configuration

### Environment Variables

```bash
# License Server connection
LICENSE_SERVER_URL=http://localhost:4000
LICENSE_SERVER_API_KEY=your-api-key-here

# Optional: Override cache TTL (in milliseconds)
# Default: 21600000 (6 hours)
LICENSE_CACHE_TTL=21600000
```

### Service Configuration

```javascript
const licenseService = createLicenseDataService({
  licenseServerUrl: 'http://localhost:4000',
  licenseServerApiKey: 'your-api-key',
  clientOptions: {
    timeout: 5000,        // Request timeout in ms
    maxRetries: 3,        // Number of retry attempts
    retryDelay: 1000      // Initial retry delay in ms
  }
});
```

## Testing

### Unit Tests

```bash
# Run cache service tests
npm test -- server/testing/licenseCache.test.js

# Run data service tests
npm test -- server/testing/licenseDataService.test.js
```

### Test Coverage

- ✅ Cache retrieval (hit/miss)
- ✅ Cache staleness detection
- ✅ Cache updates and invalidation
- ✅ Fallback to stale cache
- ✅ Error handling
- ✅ Statistics collection

## Best Practices

### 1. Use High-Level Service

```javascript
// ✅ Recommended: Use LicenseDataService
const tenant = await licenseService.getTenant('tenant_id');

// ❌ Avoid: Direct cache access (unless you have specific needs)
const cached = await getCachedLicense('tenant_id');
```

### 2. Handle Fallback Scenarios

```javascript
const tenant = await licenseService.getTenant('tenant_id');

if (tenant.cached) {
  // Inform user that data might be outdated
  console.warn('Using cached license data');
}
```

### 3. Force Refresh When Needed

```javascript
// After critical operations, force refresh
await licenseService.invalidateTenantCache('tenant_id');

// Or use forceRefresh option
const tenant = await licenseService.getTenant('tenant_id', null, {
  forceRefresh: true
});
```

### 4. Monitor Cache Health

```javascript
// Periodically check cache statistics
setInterval(async () => {
  const stats = await getCacheStats();
  if (stats.stale > stats.fresh) {
    console.warn('High number of stale caches detected');
  }
}, 60000); // Every minute
```

## Requirements Validation

This implementation satisfies the following requirements:

- ✅ **Requirement 5.1:** Cache license data locally for performance
- ✅ **Requirement 5.2:** Refresh cache when older than 6 hours
- ✅ **Requirement 5.3:** Invalidate cache when modules are updated
- ✅ **Requirement 4.4:** Fallback to cached data when License Server unavailable
- ✅ **Requirement 4.5:** Log warnings when using stale cache
- ✅ **Requirement 5.5:** Continue operation with cached data on refresh failure

## Related Documentation

- [License Server Client](./README.licenseServerClient.md)
- [Platform Data Migration Design](../../.kiro/specs/platform-data-migration/design.md)
- [Platform Data Migration Requirements](../../.kiro/specs/platform-data-migration/requirements.md)
