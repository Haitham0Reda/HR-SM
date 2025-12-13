# License Validator Service

The License Validator Service provides centralized license validation, usage limit checking, and audit logging for the HRMS productization system.

## Features

- **Module Access Validation**: Validates if a tenant has access to a specific module
- **Core HR Bypass**: Core HR module always bypasses license validation
- **Usage Limit Checking**: Enforces usage limits (employees, storage, API calls)
- **Caching**: 5-minute TTL cache for validation results to improve performance
- **Audit Logging**: Comprehensive audit trail for all validation operations
- **Expiration Checking**: Validates license and module expiration dates

## Usage

### Basic Module Validation

```javascript
import licenseValidator from "./services/licenseValidator.service.js";

// Validate module access
const result = await licenseValidator.validateModuleAccess(
  tenantId,
  "attendance"
);

if (result.valid) {
  // Module is licensed and accessible
  console.log("License tier:", result.license.tier);
  console.log("Limits:", result.license.limits);
} else {
  // Access denied
  console.log("Error:", result.error);
  console.log("Reason:", result.reason);
}
```

### With Request Information (for audit logging)

```javascript
const result = await licenseValidator.validateModuleAccess(
  tenantId,
  "attendance",
  {
    requestInfo: {
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    },
  }
);
```

### Skip Cache

```javascript
const result = await licenseValidator.validateModuleAccess(
  tenantId,
  "attendance",
  { skipCache: true }
);
```

### Check Usage Limits

```javascript
// Check if adding 10 employees would exceed the limit
const limitCheck = await licenseValidator.checkLimit(
  tenantId,
  "attendance",
  "employees",
  10 // requested amount
);

if (limitCheck.allowed) {
  // Within limits
  console.log("Current usage:", limitCheck.currentUsage);
  console.log("Limit:", limitCheck.limit);
  console.log("Percentage:", limitCheck.percentage);

  if (limitCheck.isApproachingLimit) {
    console.warn("Approaching limit threshold (>= 80%)");
  }
} else {
  // Limit exceeded
  console.log("Error:", limitCheck.error);
  console.log("Projected usage:", limitCheck.projectedUsage);
}
```

### Cache Management

```javascript
// Invalidate cache for a specific module
licenseValidator.invalidateCache(tenantId, "attendance");

// Invalidate all cache for a tenant
licenseValidator.invalidateCache(tenantId);

// Clear all cache
licenseValidator.clearCache();

// Get cache statistics
const stats = licenseValidator.getCacheStats();
console.log("Valid entries:", stats.validEntries);
console.log("Expired entries:", stats.expiredEntries);
```

## Response Formats

### Successful Validation

```javascript
{
    valid: true,
    moduleKey: 'attendance',
    license: {
        tier: 'business',
        limits: {
            employees: 100,
            storage: 10737418240,
            apiCalls: 50000
        },
        expiresAt: '2026-12-08T00:00:00.000Z',
        activatedAt: '2025-01-01T00:00:00.000Z'
    }
}
```

### Core HR Bypass

```javascript
{
    valid: true,
    bypassedValidation: true,
    moduleKey: 'hr-core',
    reason: 'Core HR is always accessible'
}
```

### Failed Validation

```javascript
{
    valid: false,
    moduleKey: 'attendance',
    reason: 'Module not included in license',
    error: 'MODULE_NOT_LICENSED'
}
```

### License Expired

```javascript
{
    valid: false,
    moduleKey: 'attendance',
    reason: 'Module license has expired',
    error: 'LICENSE_EXPIRED',
    expiresAt: '2025-01-01T00:00:00.000Z'
}
```

### Limit Check Success

```javascript
{
    allowed: true,
    limitType: 'employees',
    currentUsage: 50,
    limit: 100,
    percentage: 50,
    projectedUsage: 60,
    projectedPercentage: 60,
    isApproachingLimit: false,
    reason: 'Within usage limits'
}
```

### Limit Exceeded

```javascript
{
    allowed: false,
    limitType: 'employees',
    currentUsage: 95,
    limit: 100,
    percentage: 95,
    projectedUsage: 105,
    projectedPercentage: 105,
    reason: 'Usage limit exceeded',
    error: 'LIMIT_EXCEEDED'
}
```

## Error Codes

- `MODULE_NOT_LICENSED`: Module is not included in the license or is disabled
- `LICENSE_EXPIRED`: License or module license has expired
- `LIMIT_EXCEEDED`: Usage limit has been exceeded
- `LICENSE_VALIDATION_FAILED`: Validation process encountered an error
- `LIMIT_CHECK_FAILED`: Limit check process encountered an error

## Audit Logging

All validation operations are automatically logged to the `LicenseAudit` collection with the following event types:

- `VALIDATION_SUCCESS`: Successful module access validation
- `VALIDATION_FAILURE`: Failed module access validation
- `LICENSE_EXPIRED`: License expiration detected
- `LIMIT_WARNING`: Usage approaching limit (>= 80%)
- `LIMIT_EXCEEDED`: Usage limit exceeded

## Performance Considerations

- **Caching**: Validation results are cached for 5 minutes to reduce database queries
- **Cache Invalidation**: Cache is automatically invalidated when licenses are updated
- **Batch Operations**: For bulk operations, consider using `skipCache: true` to ensure fresh data

## Integration with Middleware

The license validator is designed to be used with the `requireModuleLicense` middleware:

```javascript
import { requireModuleLicense } from "./middleware/licenseValidation.middleware.js";

router.get(
  "/attendance/records",
  requireModuleLicense("attendance"),
  attendanceController.getRecords
);
```

## Testing

Comprehensive unit tests are available in `server/testing/services/licenseValidator.service.test.js`.

Run tests with:

```bash
npm test -- server/testing/services/licenseValidator.service.test.js
```
