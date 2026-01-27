# Backward Compatibility Mode

## Overview

The Backward Compatibility Mode provides a safe transition mechanism during the platform data migration from the main application database to the License Server database. It allows the system to read tenant data from both sources while prioritizing License Server data.

## Purpose

During the migration transition period, this mode:
- Supports reading from both License Server (via cache) and local database
- Prioritizes License Server data when available
- Provides fallback to local database when License Server is unavailable
- Logs data source being used for audit and troubleshooting
- Enables safe rollback to original data access patterns if needed

## Requirements

Implements requirements:
- **6.1**: Support reading tenant data from both databases
- **6.2**: Prioritize data from License Server when available
- **6.4**: Enable rollback to original data access patterns
- **6.5**: Log which data source is being used
- **12.2**: Verify functionality after rollback

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Backward Compatibility Mode (for migration transition)
BACKWARD_COMPATIBILITY_MODE=false
# Set to true to enable reading from both License Server and local database

PRIMARY_DATA_SOURCE=license_server
# Options: license_server | local_database (which source to try first)

LOG_DATA_SOURCE=true
# Set to false to disable logging which data source is being used

ENABLE_DATA_SOURCE_FALLBACK=true
# Set to false to disable fallback to secondary source when primary fails
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKWARD_COMPATIBILITY_MODE` | `false` | Enable/disable compatibility mode |
| `PRIMARY_DATA_SOURCE` | `license_server` | Which data source to try first |
| `LOG_DATA_SOURCE` | `true` | Whether to log data source usage |
| `ENABLE_DATA_SOURCE_FALLBACK` | `true` | Enable fallback to secondary source |

## Usage

### Basic Usage

```javascript
import { createLicenseDataService } from './services/licenseDataService.js';
import {
  getTenantWithCompatibility,
  getEnabledModulesWithCompatibility,
  isModuleEnabledWithCompatibility
} from './services/backwardCompatibility.js';

// Create License Data Service
const licenseDataService = createLicenseDataService({
  licenseServerUrl: process.env.LICENSE_SERVER_URL,
  licenseServerApiKey: process.env.LICENSE_SERVER_API_KEY
});

// Get tenant with compatibility mode
const tenant = await getTenantWithCompatibility(
  'techcorp_solutions',
  licenseDataService,
  connection
);

// Check data source
console.log('Data source:', tenant._dataSource); // 'license_server' or 'local_database'
console.log('Compatibility mode:', tenant._compatibilityMode); // true

// Get enabled modules with compatibility mode
const modules = await getEnabledModulesWithCompatibility(
  'techcorp_solutions',
  licenseDataService,
  connection
);

// Check if module is enabled with compatibility mode
const isEnabled = await isModuleEnabledWithCompatibility(
  'techcorp_solutions',
  'surveys',
  licenseDataService,
  connection
);
```

### Runtime Configuration

You can update compatibility configuration at runtime:

```javascript
import { updateCompatibilityConfig } from './services/backwardCompatibility.js';

// Enable compatibility mode
updateCompatibilityConfig({
  enabled: true,
  primarySource: 'license_server',
  logDataSource: true,
  enableFallback: true
});

// Disable compatibility mode (use License Server only)
updateCompatibilityConfig({
  enabled: false
});

// Switch primary source to local database
updateCompatibilityConfig({
  primarySource: 'local_database'
});
```

### Check Configuration

```javascript
import { getCompatibilityConfig, isCompatibilityModeEnabled } from './services/backwardCompatibility.js';

// Get current configuration
const config = getCompatibilityConfig();
console.log('Compatibility config:', config);

// Check if enabled
if (isCompatibilityModeEnabled()) {
  console.log('Compatibility mode is active');
}
```

## Rollback Functionality

### Using Rollback Data Service

If you need to rollback to original data access patterns (querying local database only):

```javascript
import { RollbackDataService } from './services/rollbackDataAccess.js';

// Create rollback service
const rollbackService = new RollbackDataService();

// Use same interface as LicenseDataService
const tenant = await rollbackService.getTenant('techcorp_solutions', connection);
const modules = await rollbackService.getEnabledModules('techcorp_solutions', connection);
const isEnabled = await rollbackService.isModuleEnabled('techcorp_solutions', 'surveys', connection);
const subscription = await rollbackService.getSubscription('techcorp_solutions', connection);

// Validate license (simplified in rollback mode)
const validation = await rollbackService.validateLicense(
  'techcorp_solutions',
  'dummy-key',
  connection
);
```

### Verify Rollback Functionality

```javascript
import { verifyRollbackFunctionality } from './services/rollbackDataAccess.js';

// Verify that rollback works for a tenant
const results = await verifyRollbackFunctionality('techcorp_solutions', connection);

console.log('Verification results:', results);
// {
//   tenantId: 'techcorp_solutions',
//   timestamp: '2026-01-26T18:00:00.000Z',
//   tests: {
//     getTenant: { success: true, tenantFound: true, source: 'local_database' },
//     getEnabledModules: { success: true, moduleCount: 3, modules: [...] },
//     isModuleEnabled: { success: true, moduleId: 'surveys', isEnabled: true },
//     getSubscription: { success: true, subscriptionStatus: 'active' }
//   },
//   overallSuccess: true,
//   successRate: '4/4'
// }
```

## Migration Workflow

### Phase 1: Pre-Migration (Compatibility Mode Disabled)

```bash
BACKWARD_COMPATIBILITY_MODE=false
PRIMARY_DATA_SOURCE=license_server
```

System uses License Server only (via cache).

### Phase 2: Migration Transition (Compatibility Mode Enabled)

```bash
BACKWARD_COMPATIBILITY_MODE=true
PRIMARY_DATA_SOURCE=license_server
LOG_DATA_SOURCE=true
ENABLE_DATA_SOURCE_FALLBACK=true
```

System tries License Server first, falls back to local database if needed.

### Phase 3: Post-Migration (Compatibility Mode Disabled)

```bash
BACKWARD_COMPATIBILITY_MODE=false
PRIMARY_DATA_SOURCE=license_server
```

System uses License Server only. Local database tenant data can be archived.

### Phase 4: Rollback (If Needed)

If issues arise, switch to rollback mode:

```javascript
// Replace LicenseDataService with RollbackDataService
const dataService = new RollbackDataService();

// All queries now use local database
const tenant = await dataService.getTenant('techcorp_solutions', connection);
```

## Data Source Priority

When compatibility mode is enabled:

1. **Primary Source First**: Try the configured primary source (License Server or local database)
2. **Fallback on Failure**: If primary fails and fallback is enabled, try secondary source
3. **Prioritize License Server**: If both sources return data, use License Server data
4. **Log Data Source**: Log which source was used (if logging enabled)

## Logging

When `LOG_DATA_SOURCE=true`, the system logs:

```javascript
// License Server (primary)
logger.info('Retrieved tenant from License Server (primary source)', {
  tenantId: 'techcorp_solutions',
  source: 'license_server',
  mode: 'compatibility'
});

// Local database (fallback)
logger.info('Retrieved tenant from local database (fallback)', {
  tenantId: 'techcorp_solutions',
  source: 'local_database',
  mode: 'compatibility_fallback'
});

// Both sources available
logger.info('Both data sources available, prioritizing License Server', {
  tenantId: 'techcorp_solutions',
  primarySource: 'license_server',
  secondarySource: 'local_database',
  mode: 'compatibility'
});
```

## Error Handling

### License Server Unavailable

When License Server is unavailable and fallback is enabled:

```javascript
logger.warn('Failed to retrieve tenant from License Server (primary source)', {
  tenantId: 'techcorp_solutions',
  error: 'Connection timeout',
  willTryFallback: true
});

logger.info('Retrieved tenant from local database (fallback)', {
  tenantId: 'techcorp_solutions',
  source: 'local_database',
  mode: 'compatibility_fallback'
});
```

### No Data Available

When data is not found in either source:

```javascript
throw new Error('Tenant techcorp_solutions not found in License Server or local database');
```

## Testing

### Unit Tests

Run compatibility mode tests:

```bash
npm test -- backwardCompatibility.test.js
```

Run rollback tests:

```bash
npm test -- rollbackDataAccess.test.js
```

### Integration Testing

Test the complete workflow:

```javascript
// 1. Enable compatibility mode
updateCompatibilityConfig({ enabled: true });

// 2. Test data retrieval
const tenant = await getTenantWithCompatibility('test_tenant', licenseDataService);
expect(tenant._compatibilityMode).toBe(true);

// 3. Verify rollback
const rollbackService = new RollbackDataService();
const rollbackTenant = await rollbackService.getTenant('test_tenant');
expect(rollbackTenant._rollbackMode).toBe(true);
```

## Best Practices

1. **Enable During Migration**: Only enable compatibility mode during the migration transition period
2. **Monitor Logs**: Watch logs to see which data source is being used
3. **Test Rollback**: Verify rollback functionality before migration
4. **Disable After Migration**: Disable compatibility mode once migration is complete
5. **Keep Fallback Enabled**: Keep fallback enabled during transition for safety
6. **Document Changes**: Document when compatibility mode is enabled/disabled

## Troubleshooting

### Issue: Data Inconsistency

**Problem**: Different data from License Server vs local database

**Solution**:
```javascript
// Check which source is being used
const tenant = await getTenantWithCompatibility('tenant_id', licenseDataService);
console.log('Data source:', tenant._dataSource);

// Force License Server
updateCompatibilityConfig({
  enabled: true,
  primarySource: 'license_server',
  enableFallback: false
});
```

### Issue: License Server Unavailable

**Problem**: License Server is down, need to use local database

**Solution**:
```javascript
// Switch to local database as primary
updateCompatibilityConfig({
  enabled: true,
  primarySource: 'local_database'
});

// Or use rollback service
const rollbackService = new RollbackDataService();
const tenant = await rollbackService.getTenant('tenant_id');
```

### Issue: Need to Rollback Migration

**Problem**: Migration issues, need to revert to original pattern

**Solution**:
```javascript
// Replace service with rollback service
const dataService = new RollbackDataService();

// Verify functionality
const results = await verifyRollbackFunctionality('tenant_id');
console.log('Rollback verification:', results);
```

## API Reference

### backwardCompatibility.js

- `getCompatibilityConfig()` - Get current configuration
- `isCompatibilityModeEnabled()` - Check if mode is enabled
- `updateCompatibilityConfig(config)` - Update configuration
- `getTenantWithCompatibility(tenantId, service, connection)` - Get tenant with compatibility
- `getEnabledModulesWithCompatibility(tenantId, service, connection)` - Get modules with compatibility
- `isModuleEnabledWithCompatibility(tenantId, moduleId, service, connection)` - Check module with compatibility

### rollbackDataAccess.js

- `getTenantFromLocalDatabase(tenantId, connection)` - Get tenant from local DB
- `getEnabledModulesFromLocalDatabase(tenantId, connection)` - Get modules from local DB
- `isModuleEnabledInLocalDatabase(tenantId, moduleId, connection)` - Check module in local DB
- `getSubscriptionFromLocalDatabase(tenantId, connection)` - Get subscription from local DB
- `verifyRollbackFunctionality(tenantId, connection)` - Verify rollback works
- `RollbackDataService` - Service class for rollback mode

## Related Documentation

- [License Data Service](./README.licenseDataService.md)
- [License Cache](./README.licenseCache.md)
- [License Server Client](./README.licenseServerClient.md)
- [Platform Data Migration Design](../../.kiro/specs/platform-data-migration/design.md)
- [Platform Data Migration Requirements](../../.kiro/specs/platform-data-migration/requirements.md)
