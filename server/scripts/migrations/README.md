# Platform Data Migration

This directory contains the infrastructure and scripts for migrating platform metadata (tenant information, subscriptions, and module configurations) from the main application database (`hrsm_platform`) to the license server database (`hrsm-licenses`).

## Overview

The migration establishes proper architectural separation between:
- **Platform Control** (license server) - tenant metadata, subscriptions, modules
- **Business Operations** (main application) - HR data scoped by tenantId

## Directory Structure

```
migrations/
├── config/
│   └── migrationConfig.js      # Configuration management
├── utils/
│   ├── databaseConnections.js  # Database connection utilities
│   └── migrationLogger.js      # Logging infrastructure
├── migrate-platform-data.js    # Main migration script
└── README.md                   # This file
```

## Prerequisites

1. **Environment Variables**: Ensure the following are set in your `.env` file:
   ```bash
   # Main application database
   MONGODB_URI=mongodb://localhost:27017/hrsm_platform
   
   # License server database
   LICENSE_SERVER_MONGODB_URI=mongodb://localhost:27017/hrsm-licenses
   ```

2. **Database Access**: Ensure you have read/write access to both databases

3. **Node.js**: Version 16 or higher

## Usage

### Basic Migration

```bash
# Run the migration
node server/scripts/migrations/migrate-platform-data.js
```

### Dry Run Mode

Test the migration without making changes:

```bash
node server/scripts/migrations/migrate-platform-data.js --dry-run
```

### Custom Batch Size

Process records in smaller batches:

```bash
node server/scripts/migrations/migrate-platform-data.js --batch-size 50
```

### Help

View all available options:

```bash
node server/scripts/migrations/migrate-platform-data.js --help
```

## Configuration

The migration can be configured through:

1. **Environment Variables**:
   - `MONGODB_URI` - Source database connection string
   - `LICENSE_SERVER_MONGODB_URI` - Destination database connection string
   - `LOG_LEVEL` - Logging level (debug, info, warn, error)

2. **Command-Line Options**:
   - `--dry-run` - Run without making changes
   - `--batch-size <number>` - Records per batch (default: 100)

3. **Programmatic Configuration**:
   ```javascript
   import { migratePlatformData } from './migrate-platform-data.js';
   
   await migratePlatformData({
     dryRun: false,
     batchSize: 100,
     backupBeforeMigration: true,
     validateBeforeMigration: true,
     validateAfterMigration: true
   });
   ```

## Logging

Migration logs are stored in `logs/migrations/` with the following files:

- `migration-<timestamp>.log` - Complete migration log
- `migration-<timestamp>-errors.log` - Error-only log
- `migration-<timestamp>-report.json` - Migration summary report

### Log Levels

- **info**: General migration progress
- **warn**: Non-critical issues
- **error**: Critical errors with stack traces
- **debug**: Detailed debugging information

## Error Handling

The migration includes comprehensive error handling:

1. **Connection Errors**: Automatic retry with exponential backoff
2. **Validation Errors**: Pre-migration validation to catch issues early
3. **Migration Errors**: Transaction support for atomic operations
4. **Rollback**: Automatic rollback on critical failures

## Safety Features

1. **Dry Run Mode**: Test migration without changes
2. **Backup**: Optional backup before migration
3. **Validation**: Pre and post-migration validation
4. **Logging**: Comprehensive audit trail
5. **Rollback**: Restore original state on failure

## Components

### MigrationConfig

Manages configuration parameters with validation:
- Database connection strings
- Batch sizes and timeouts
- Retry settings
- Logging configuration

### DatabaseConnections

Handles database connections:
- Connection pooling
- Health checks
- Retry logic
- Graceful disconnection

### MigrationLogger

Provides structured logging:
- Console output with colors
- File-based logging with rotation
- Progress tracking
- Error reporting with stack traces
- Migration statistics

## Requirements Mapping

This infrastructure satisfies the following requirements:

- **Requirement 2.1**: Automated migration script
- **Requirement 9.1**: Log migration start time and configuration
- **Requirement 9.2**: Log each tenant record migration
- **Requirement 9.3**: Log detailed error messages with stack traces
- **Requirement 9.4**: Log summary statistics

## Next Steps

The following tasks will build upon this infrastructure:

1. **Task 2**: Implement data export functionality
2. **Task 3**: Implement data import functionality
3. **Task 4**: Implement migration verification and reporting
4. **Task 6**: Implement rollback mechanism
5. **Task 7**: Implement error handling for migration

## Support

For issues or questions:
1. Check the error logs in `logs/migrations/`
2. Review the migration report JSON file
3. Run with `--dry-run` to test without changes
4. Consult the design document at `.kiro/specs/platform-data-migration/design.md`
