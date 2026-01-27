# Migration CLI Tool

Enhanced command-line interface for running platform data migration with comprehensive features.

## Features

- **Command-line argument parsing** - Full support for various migration options
- **Dry-run mode** - Preview migration without making changes
- **Progress display** - Visual feedback during migration execution
- **Pre-migration validation** - Validates system readiness before migration
- **Post-migration verification** - Comprehensive verification after migration
- **Interactive confirmation** - Prompts for confirmation before executing
- **Comprehensive reporting** - Generates detailed migration reports

## Installation

No additional installation required. The CLI tool uses dependencies already installed in the project.

## Usage

### Basic Usage

```bash
# Run migration with default settings
node server/scripts/migrations/cli/migrationCli.js

# Run in dry-run mode (no changes)
node server/scripts/migrations/cli/migrationCli.js --dry-run

# Run with custom batch size
node server/scripts/migrations/cli/migrationCli.js --batch-size 50

# Run in non-interactive mode (skip confirmations)
node server/scripts/migrations/cli/migrationCli.js --yes
```

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dry-run` | Run migration without making changes (preview mode) | false |
| `-b, --batch-size <number>` | Number of records to process per batch | 100 |
| `--no-backup` | Skip backup creation before migration | false (backup enabled) |
| `--no-validation` | Skip pre-migration validation | false (validation enabled) |
| `--skip-validation` | Skip pre-migration validation (alias) | false (validation enabled) |
| `--no-verification` | Skip post-migration verification | false (verification enabled) |
| `-y, --yes` | Skip confirmation prompts (non-interactive mode) | false |
| `-v, --verbose` | Enable verbose logging | false |
| `--source-db <name>` | Source database name | from env |
| `--dest-db <name>` | Destination database name | from env |
| `--progress` | Display progress indicators | true |
| `-h, --help` | Display help information | - |

### Examples

#### 1. Dry-Run Migration

Preview what will be migrated without making any changes:

```bash
node server/scripts/migrations/cli/migrationCli.js --dry-run
```

This will:
- Connect to databases
- Run pre-migration validation
- Export tenant data
- Validate exported data
- Display what would be migrated
- Skip actual import and verification

#### 2. Full Migration with All Checks

Run complete migration with all safety checks:

```bash
node server/scripts/migrations/cli/migrationCli.js
```

This will:
1. Display migration summary
2. Ask for confirmation
3. Run pre-migration validation
4. Create backup
5. Export tenant data
6. Validate exported data
7. Import to destination
8. Run post-migration verification
9. Generate comprehensive reports

#### 3. Quick Migration (Skip Validation)

Run migration without pre-migration validation (not recommended for production):

```bash
node server/scripts/migrations/cli/migrationCli.js --skip-validation --yes
```

#### 4. Migration with Custom Settings

Run migration with custom batch size and specific databases:

```bash
node server/scripts/migrations/cli/migrationCli.js \
  --batch-size 50 \
  --source-db hrsm_platform \
  --dest-db hrsm-licenses
```

## Pre-Migration Validation

The CLI tool runs comprehensive pre-migration validation checks:

### Database Connection Checks
- Validates source database connection
- Validates destination database connection
- Checks for tenants collection in source
- Warns if destination already has data

### Source Data Integrity Checks
- Verifies tenants collection exists
- Counts total tenant records
- Checks for required fields (tenantId, name)
- Detects duplicate tenantIds
- Identifies null or empty tenantIds

### System Resource Checks
- Checks available memory
- Verifies backup directory is writable
- Verifies logs directory is writable

If any validation check fails, the migration will not proceed.

## Post-Migration Verification

After migration completes, the CLI tool runs comprehensive verification:

### Verification Checks
- **Record Count Comparison** - Ensures all records were migrated
- **Tenant ID Verification** - Confirms all tenant IDs exist in destination
- **Field Value Verification** - Validates field values match between source and destination
- **Related Data Verification** - Checks subscriptions and enabled modules

### Report Generation

The CLI tool generates reports in multiple formats:
- **JSON** - Machine-readable format for automation
- **HTML** - Human-readable format with styling
- **Text** - Plain text format for logs

Reports are saved to: `logs/migrations/reports/`

## Output

### Migration Summary

Before migration, the CLI displays:
```
📋 Migration Summary
────────────────────────────────────────────────────────────
Databases:
  Source:      hrsm_platform
  Destination: hrsm-licenses

Data to migrate:
  Tenants: 5 records

Options:
  Mode:        LIVE MIGRATION
  Batch size:  100
  Backup:      Enabled
  Validation:  Enabled
  Verification: Enabled
────────────────────────────────────────────────────────────
```

### Validation Results

During pre-migration validation:
```
Pre-Migration Validation Results
============================================================

Overall Status: PASSED ✓
Total Checks: 8
  Passed: 8
  Failed: 0
  Warnings: 0

databaseConnections:
────────────────────────────────────────────────────────────
  ✓ source_database_connection: Source database connection successful
  ✓ source_tenants_collection: Source database has tenants collection
  ✓ destination_database_connection: Destination database connection successful
...
```

### Migration Progress

During migration:
```
[1/7] Connecting to databases...
✓ [1/7] Connecting to databases

[2/7] Validating connections...
✓ [2/7] Validating connections

[3/7] Creating backup...
✓ [3/7] Creating backup
...
```

### Final Results

After migration:
```
────────────────────────────────────────────────────────────
✓ Migration completed successfully!

Statistics:
  Total records:   5
  Imported:        5
  Skipped:         0
  Failed:          0

Verification:
  Status: PASSED
  Source count:      5
  Destination count: 5

Reports generated:
  JSON: logs/migrations/reports/migration-report-2026-01-27.json
  HTML: logs/migrations/reports/migration-report-2026-01-27.html
  TEXT: logs/migrations/reports/migration-report-2026-01-27.txt
────────────────────────────────────────────────────────────
```

## Error Handling

The CLI tool provides comprehensive error handling:

### Connection Errors
If database connection fails:
```
✗ Failed to connect to databases

Error: Connection timeout
Please check your database configuration and try again.
```

### Validation Errors
If pre-migration validation fails:
```
✗ Pre-migration validation failed!
Please fix the issues above before running the migration.
```

### Migration Errors
If migration fails:
```
✗ Migration failed

Error: Import failed for tenant 'techcorp_solutions'

⚠️  Critical Error - Manual Intervention Required

The migration and automatic rollback both failed.
Please check the logs and contact your database administrator.

Backup ID: backup-2026-01-27-123456
You may need to manually restore from this backup.
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Check your `.env` file has correct database credentials
2. Ensure MongoDB is running
3. Verify network connectivity

### Issue: "Pre-migration validation failed"

**Solution:**
1. Review the validation output for specific errors
2. Fix data integrity issues in source database
3. Ensure sufficient disk space and memory

### Issue: "Migration verification failed"

**Solution:**
1. Check the verification report for discrepancies
2. Review migration logs for errors
3. Consider running rollback if critical issues found

### Issue: "Permission denied writing to backup directory"

**Solution:**
1. Ensure the backup directory exists: `backups/migrations/`
2. Check directory permissions
3. Run with appropriate user permissions

## Best Practices

1. **Always run dry-run first** - Preview migration before executing
2. **Enable all validations** - Don't skip pre-migration validation
3. **Review validation results** - Fix any issues before proceeding
4. **Keep backups** - Don't disable backup creation
5. **Review reports** - Check verification reports after migration
6. **Test in staging** - Run migration in staging environment first
7. **Monitor logs** - Watch logs during migration execution

## Related Documentation

- [Migration Design Document](../.kiro/specs/platform-data-migration/design.md)
- [Migration Requirements](../.kiro/specs/platform-data-migration/requirements.md)
- [Migration Tasks](../.kiro/specs/platform-data-migration/tasks.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review migration logs in `logs/migrations/`
3. Check verification reports in `logs/migrations/reports/`
4. Contact your database administrator for critical issues
