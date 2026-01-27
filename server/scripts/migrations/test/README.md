# Staging Migration Test Suite

Comprehensive test suite for validating the platform data migration in a staging environment.

## Overview

This test suite executes a complete end-to-end test of the platform data migration, including:

1. **Pre-Migration Validation** - Validates database connections, source data, and system readiness
2. **Migration Execution** - Runs the full migration with backup creation
3. **Post-Migration Verification** - Verifies data integrity and completeness
4. **Functional Tests** - Tests that migrated data works correctly
5. **Rollback Test** - Validates that rollback procedures work as expected

## Requirements

- Node.js 14+ installed
- Access to both source (`hrsm_platform`) and destination (`hrsm-licenses`) databases
- Proper environment configuration in `server/.env`
- Sufficient disk space for backups and reports

## Quick Start

### Linux/Mac

```bash
# Make the script executable
chmod +x server/scripts/migrations/test/run-staging-test.sh

# Run the test suite
./server/scripts/migrations/test/run-staging-test.sh
```

### Windows

```cmd
# Run the test suite
server\scripts\migrations\test\run-staging-test.bat
```

### Direct Node.js Execution

```bash
# From project root
node server/scripts/migrations/test/staging-migration-test.js
```

## Test Phases

### Phase 1: Pre-Migration Validation

Tests executed:
- ✓ Database connections (source and destination)
- ✓ Source data exists and is accessible
- ✓ Pre-migration validation checks pass
- ✓ Sufficient disk space available
- ✓ Database credentials are valid

**Expected Result:** All validation checks pass before proceeding to migration.

### Phase 2: Migration Execution

Tests executed:
- ✓ Migration completes successfully
- ✓ Backup is created before migration
- ✓ All tenant records are migrated
- ✓ Migration statistics are accurate

**Expected Result:** Migration completes with success status and valid backup ID.

### Phase 3: Post-Migration Verification

Tests executed:
- ✓ Record counts match between source and destination
- ✓ Data integrity verification passes
- ✓ All test tenants are found in destination
- ✓ Field values are preserved correctly
- ✓ Related data (subscriptions, modules) is intact

**Expected Result:** All verification checks pass with no discrepancies.

### Phase 4: Functional Tests

Tests executed:
- ✓ Tenant data can be queried successfully
- ✓ Module data is accessible and valid
- ✓ Subscription data is complete
- ✓ Database indexes are created correctly
- ✓ Required fields are present

**Expected Result:** All functional queries work correctly with migrated data.

### Phase 5: Rollback Test

Tests executed:
- ✓ Rollback procedure executes successfully
- ✓ Destination database is cleaned
- ✓ Source database is restored to original state
- ✓ Rollback completes within time limit

**Expected Result:** System is restored to pre-migration state successfully.

## Test Configuration

The test suite can be configured by modifying `TEST_CONFIG` in `staging-migration-test.js`:

```javascript
const TEST_CONFIG = {
  // Enable/disable test phases
  phases: {
    preMigration: true,
    migration: true,
    postMigration: true,
    functionalTests: true,
    rollbackTest: true
  },
  
  // Migration options
  migrationOptions: {
    dryRun: false,        // Set to true for dry-run
    batchSize: 50,        // Records per batch
    backup: true,         // Create backup before migration
    validateBeforeMigration: true,
    verifyAfterMigration: true,
    verbose: true
  },
  
  // Test tenants to verify
  testTenants: [
    'techcorp_solutions',
    'global_manufacturing',
    'healthcare_plus'
  ],
  
  // Report configuration
  reportDir: 'logs/migrations/staging-tests',
  reportFormat: 'all'
};
```

## Test Reports

After execution, the test suite generates comprehensive reports:

### Report Location

```
logs/migrations/staging-tests/
├── staging-test-YYYY-MM-DDTHH-MM-SS.json  # JSON format
└── staging-test-YYYY-MM-DDTHH-MM-SS.txt   # Text format
```

### Report Contents

- **Summary Statistics**
  - Total tests executed
  - Tests passed/failed
  - Success rate
  - Total duration

- **Phase Results**
  - Detailed results for each test phase
  - Individual test outcomes
  - Error messages and details

- **Migration Statistics**
  - Records migrated
  - Backup ID
  - Verification results

## Exit Codes

- `0` - All tests passed successfully
- `1` - One or more tests failed

## Troubleshooting

### Database Connection Errors

**Problem:** Cannot connect to source or destination database

**Solution:**
1. Check `server/.env` configuration
2. Verify database credentials
3. Ensure databases are accessible from your network
4. Check MongoDB connection strings

### Pre-Migration Validation Failures

**Problem:** Pre-migration validation checks fail

**Solution:**
1. Review validation error messages
2. Ensure source database has tenant data
3. Check disk space availability
4. Verify database permissions

### Migration Failures

**Problem:** Migration execution fails

**Solution:**
1. Check migration logs in `logs/migrations/`
2. Verify backup was created successfully
3. Review error messages for specific issues
4. Ensure no concurrent migrations are running

### Rollback Failures

**Problem:** Rollback test fails

**Solution:**
1. Check if backup exists and is valid
2. Verify database permissions for restore operations
3. Review rollback logs for specific errors
4. May need manual intervention if both migration and rollback fail

## Best Practices

### Before Running Tests

1. **Backup Production Data** - Always have a separate backup before testing
2. **Use Staging Environment** - Never run on production databases
3. **Review Configuration** - Verify all settings in `.env` and test config
4. **Check Disk Space** - Ensure sufficient space for backups and reports

### During Test Execution

1. **Monitor Progress** - Watch console output for any warnings
2. **Don't Interrupt** - Let the test suite complete all phases
3. **Review Logs** - Check logs if any phase fails

### After Test Execution

1. **Review Reports** - Examine generated test reports thoroughly
2. **Verify Results** - Manually spot-check some migrated data
3. **Document Issues** - Record any failures or unexpected behavior
4. **Clean Up** - Remove test data if needed

## Integration with CI/CD

The test suite can be integrated into CI/CD pipelines:

```yaml
# Example GitLab CI configuration
staging-migration-test:
  stage: test
  script:
    - node server/scripts/migrations/test/staging-migration-test.js
  only:
    - staging
  artifacts:
    paths:
      - logs/migrations/staging-tests/
    when: always
```

## Related Documentation

- [Migration Runbook](../../../docs/platform/PLATFORM_DATA_MIGRATION_RUNBOOK.md)
- [Architecture Documentation](../../../docs/platform/PLATFORM_DATA_MIGRATION_ARCHITECTURE.md)
- [Troubleshooting Guide](../../../docs/platform/PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md)
- [API Documentation](../../../docs/platform/LICENSE_SERVER_API_DOCUMENTATION.md)

## Support

For issues or questions:
1. Check the [Troubleshooting Guide](../../../docs/platform/PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md)
2. Review test reports for detailed error information
3. Check migration logs in `logs/migrations/`
4. Contact the platform team for assistance

## Requirements Validation

This test suite validates the following requirements:

- **Requirement 2.1** - Automated migration script execution
- **Requirement 2.5** - Migration verification and reporting
- **Requirement 2.6** - Rollback mechanism
- **Requirement 7.1** - Data validation and verification
- **Requirement 7.2** - Record count comparison
- **Requirement 7.5** - Success report generation
- **Requirement 12.1** - Backup functionality
- **Requirement 12.2** - Rollback to original patterns
- **Requirement 12.3** - Restoration verification
