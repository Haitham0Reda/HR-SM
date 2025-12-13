# Migration Scripts

This directory contains migration scripts for various system upgrades and data transformations.

## Available Migrations

### 1. Multi-Tenancy Migration (001_add_tenant_id.js)
**NEW** - Adds tenantId field to all tenant-scoped collections and creates compound indexes for multi-tenancy support.

**Purpose**: Enable multi-tenancy by adding tenant isolation at the database level

**Usage**:
```bash
# Run migration
node server/scripts/migrations/001_add_tenant_id.js

# Rollback migration
node server/scripts/migrations/001_add_tenant_id.js rollback

# Test migration
node server/scripts/migrations/test_001_migration.js
```

**Documentation**: See `001_add_tenant_id_README.md` for detailed information

### 2. Leave System Migration
Scripts to migrate data from the monolithic Leave model to specialized models (Mission, SickLeave, Vacation).

### 3. Productization Migration
Scripts to migrate existing deployments to the new license-based productization system.

## Overview

The migration process consists of the following steps:

1. **Backup** - Create a backup of the Leave collection
2. **Migrate Missions** - Transfer mission-type leaves to Mission model
3. **Migrate SickLeaves** - Transfer sick-type leaves to SickLeave model
4. **Migrate Vacations** - Transfer annual/casual/unpaid leaves to Vacation model
5. **Validate** - Verify data integrity after migration

## Scripts

### `backupLeaveCollection.js`
Creates a timestamped backup of the Leave collection before migration.

**Usage:**
```bash
node server/scripts/migrations/backupLeaveCollection.js
```

**Output:**
- Creates a new collection: `leaves_backup_<timestamp>`
- Saves metadata to `migration_metadata` collection

### `migrateMissions.js`
Migrates mission-type leaves from Leave model to Mission model.

**Usage:**
```bash
# Dry run (no data written)
node server/scripts/migrations/migrateMissions.js --dry-run

# Actual migration
node server/scripts/migrations/migrateMissions.js
```

**Features:**
- Preserves all original field values and timestamps
- Maps mission-specific fields (location, purpose, relatedDepartment)
- Skips already migrated records
- Stores original Leave ID for reference

### `migrateSickLeaves.js`
Migrates sick-type leaves from Leave model to SickLeave model.

**Usage:**
```bash
# Dry run (no data written)
node server/scripts/migrations/migrateSickLeaves.js --dry-run

# Actual migration
node server/scripts/migrations/migrateSickLeaves.js
```

**Features:**
- Preserves workflow state (supervisor/doctor approval)
- Preserves medical documentation and attachments
- Maintains vacation balance references
- Skips already migrated records

### `migrateVacations.js`
Migrates annual, casual, and unpaid leaves from Leave model to Vacation model.

**Usage:**
```bash
# Dry run (no data written)
node server/scripts/migrations/migrateVacations.js --dry-run

# Actual migration
node server/scripts/migrations/migrateVacations.js
```

**Features:**
- Handles multiple vacation types (annual, casual, unpaid)
- Preserves vacation balance references
- Maintains all approval and cancellation data
- Skips already migrated records

### `validateMigration.js`
Validates data integrity after migration.

**Usage:**
```bash
node server/scripts/migrations/validateMigration.js
```

**Checks:**
- Document counts match between source and target collections
- Required fields are present in migrated documents
- Reference integrity (employee, department, position)
- Vacation type distribution

### `runAllMigrations.js`
Master script that runs all migrations in sequence.

**Usage:**
```bash
# Dry run (recommended first)
node server/scripts/migrations/runAllMigrations.js --dry-run

# Actual migration
node server/scripts/migrations/runAllMigrations.js
```

**Process:**
1. Backup Leave collection
2. Migrate Missions
3. Migrate SickLeaves
4. Migrate Vacations
5. Validate all migrations
6. Print comprehensive summary

## Migration Workflow

### Step 1: Test with Dry Run

Always start with a dry run to see what will be migrated without writing any data:

```bash
node server/scripts/migrations/runAllMigrations.js --dry-run
```

Review the output to ensure:
- Document counts are as expected
- No unexpected errors
- All leave types are accounted for

### Step 2: Backup Production Data

Before running the actual migration, ensure you have a backup:

```bash
node server/scripts/migrations/backupLeaveCollection.js
```

This creates a timestamped backup collection that can be used for rollback if needed.

### Step 3: Run Migration

Execute the full migration:

```bash
node server/scripts/migrations/runAllMigrations.js
```

Monitor the output for any errors or warnings.

### Step 4: Validate Results

The validation runs automatically as part of `runAllMigrations.js`, but you can run it separately:

```bash
node server/scripts/migrations/validateMigration.js
```

### Step 5: Verify in Application

After successful migration:
1. Test the new API endpoints
2. Verify data appears correctly in the UI
3. Check that all relationships are intact
4. Confirm notifications and workflows function properly

## Data Mapping

### Mission Mapping
```
Leave.leaveType = 'mission' → Mission
├── mission.location → location
├── mission.purpose → purpose
├── mission.relatedDepartment → relatedDepartment
├── All approval/rejection fields preserved
└── Timestamps preserved
```

### SickLeave Mapping
```
Leave.leaveType = 'sick' → SickLeave
├── medicalDocumentation → medicalDocumentation (all fields)
├── workflow → workflow (all fields)
├── vacationBalance → vacationBalance
├── All approval/rejection fields preserved
└── Timestamps preserved
```

### Vacation Mapping
```
Leave.leaveType in ['annual', 'casual', 'unpaid'] → Vacation
├── leaveType → vacationType
├── vacationBalance → vacationBalance
├── All approval/rejection fields preserved
└── Timestamps preserved
```

## Rollback Procedure

If migration fails or issues are discovered:

1. **Stop the application** to prevent new data from being created

2. **Restore from backup:**
   ```javascript
   // In MongoDB shell or script
   db.missions.drop();
   db.sickleaves.drop();
   db.vacations.drop();
   
   // Leave collection remains unchanged
   ```

3. **Investigate errors** in the migration metadata:
   ```javascript
   db.migration_metadata.find().sort({ createdAt: -1 }).limit(5)
   ```

4. **Fix issues** and re-run migration

## Migration Metadata

All migrations store metadata in the `migration_metadata` collection:

```javascript
{
  type: 'mission_migration' | 'sickleave_migration' | 'vacation_migration' | 'backup',
  sourceCollection: 'leaves',
  targetCollection: 'missions' | 'sickleaves' | 'vacations',
  totalDocuments: Number,
  migrated: Number,
  failed: Number,
  skipped: Number,
  errors: Array,
  createdAt: Date,
  status: 'completed' | 'completed_with_errors'
}
```

Query migration history:
```bash
# In MongoDB shell
db.migration_metadata.find().sort({ createdAt: -1 })
```

## Troubleshooting

### Issue: "Mission count mismatch"
**Cause:** Some missions failed to migrate
**Solution:** Check `migration_metadata` for error details, fix issues, and re-run

### Issue: "Validation failed"
**Cause:** Data integrity issues after migration
**Solution:** Review validation errors, check for missing references, verify field mappings

### Issue: "Duplicate key error"
**Cause:** Attempting to migrate already migrated records
**Solution:** Scripts automatically skip duplicates, but ensure indexes are correct

### Issue: "Reference not found"
**Cause:** Employee, department, or position references are invalid
**Solution:** Clean up orphaned references in Leave collection before migration

## Performance Considerations

- **Large datasets:** Migration processes documents sequentially to avoid memory issues
- **Indexes:** Ensure indexes exist on new collections before migration
- **Timing:** Run migrations during low-traffic periods
- **Monitoring:** Watch database CPU and memory usage during migration

## Post-Migration Tasks

After successful migration:

1. ✅ Verify all data migrated correctly
2. ✅ Test all API endpoints
3. ✅ Update application to use new models
4. ✅ Monitor for errors in production
5. ⏳ Keep Leave collection for reference (don't delete immediately)
6. ⏳ After grace period, archive or remove Leave collection
7. ⏳ Update documentation and training materials

## Support

For issues or questions:
1. Check migration metadata for error details
2. Review validation output
3. Check application logs
4. Consult the design document at `.kiro/specs/leave-system-refactor/design.md`


---

# Productization Migration Scripts

These scripts migrate existing HRMS deployments to the new license-based productization system.

## Overview

The productization migration enables:
- Module-level licensing and access control
- Usage tracking and limit enforcement
- Support for both SaaS and On-Premise deployments
- Backward compatibility with existing installations

## Scripts

### `generateInitialLicenses.js`
Creates initial license records for existing tenants/deployments.

**Usage:**
```bash
# SaaS mode - creates License documents in MongoDB
node server/scripts/migrations/generateInitialLicenses.js --mode saas --tier business --dry-run
node server/scripts/migrations/generateInitialLicenses.js --mode saas --tier business

# On-Premise mode - generates license file
node server/scripts/migrations/generateInitialLicenses.js --mode on-premise --dry-run
node server/scripts/migrations/generateInitialLicenses.js --mode on-premise
```

**Options:**
- `--mode <mode>`: Deployment mode (saas or on-premise, default: saas)
- `--tier <tier>`: Default tier for modules (starter, business, enterprise, default: business)
- `--trial-days <days>`: Trial period in days (default: 30)
- `--dry-run`: Preview changes without applying them

**Features:**
- Automatically determines appropriate tier based on employee count
- Enables all modules by default for backward compatibility
- Sets appropriate limits based on current usage
- Creates trial licenses with configurable duration

### `migrateFeatureFlags.js`
Migrates existing feature flags to the license system.

**Usage:**
```bash
# Migrate from environment variables
node server/scripts/migrations/migrateFeatureFlags.js --source env --dry-run
node server/scripts/migrations/migrateFeatureFlags.js --source env

# Migrate from database
node server/scripts/migrations/migrateFeatureFlags.js --source database --dry-run
node server/scripts/migrations/migrateFeatureFlags.js --source database
```

**Options:**
- `--source <source>`: Source of feature flags (env, database, config, default: env)
- `--dry-run`: Preview changes without applying them

**Features:**
- Converts environment variable feature flags (ENABLE_*, FEATURE_*, MODULE_*)
- Migrates database-stored feature flags
- Preserves existing module enable/disable state
- Intelligent module name matching

### `backfillUsageData.js`
Creates initial usage tracking records based on current system usage.

**Usage:**
```bash
# Backfill current month
node server/scripts/migrations/backfillUsageData.js --months 1 --dry-run
node server/scripts/migrations/backfillUsageData.js --months 1

# Backfill last 6 months
node server/scripts/migrations/backfillUsageData.js --months 6 --dry-run
node server/scripts/migrations/backfillUsageData.js --months 6
```

**Options:**
- `--months <months>`: Number of historical months to backfill (default: 1)
- `--dry-run`: Preview changes without applying them

**Features:**
- Calculates employee count from User collection
- Measures storage usage from uploaded files
- Counts module-specific records (attendance, leave, documents, etc.)
- Creates usage tracking records for each enabled module

### `testMigrations.js`
Tests all productization migration scripts in dry-run mode.

**Usage:**
```bash
node server/scripts/migrations/testMigrations.js
```

**Features:**
- Runs all migrations in dry-run mode
- Validates script execution without making changes
- Provides comprehensive test summary

## Productization Migration Workflow

### Step 1: Review Current System

Before migrating, review your current deployment:

```bash
# Check employee count
node server/scripts/listUsers.js

# Check storage usage
du -sh uploads/

# Review existing feature flags
env | grep -E "ENABLE_|FEATURE_|MODULE_"
```

### Step 2: Test Migrations (Dry Run)

Run all migrations in dry-run mode to preview changes:

```bash
node server/scripts/migrations/testMigrations.js
```

Or test individually:

```bash
node server/scripts/migrations/generateInitialLicenses.js --mode saas --dry-run
node server/scripts/migrations/migrateFeatureFlags.js --source env --dry-run
node server/scripts/migrations/backfillUsageData.js --months 1 --dry-run
```

### Step 3: Backup Database

Create a backup before running migrations:

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/hrms" --out=./backup-$(date +%Y%m%d)

# Or use your backup script
node server/scripts/testBackup.js
```

### Step 4: Run Migrations

Execute migrations in order:

```bash
# 1. Generate initial licenses
node server/scripts/migrations/generateInitialLicenses.js --mode saas --tier business

# 2. Migrate feature flags (if applicable)
node server/scripts/migrations/migrateFeatureFlags.js --source env

# 3. Backfill usage data
node server/scripts/migrations/backfillUsageData.js --months 1
```

### Step 5: Verify Results

After migration, verify the results:

```bash
# Check licenses in MongoDB
mongo hrms --eval "db.licenses.find().pretty()"

# Check usage tracking
mongo hrms --eval "db.usagetrackings.find().pretty()"

# Test license validation
node server/scripts/testLicenseFileSystem.js
```

### Step 6: Update Configuration

Update your `.env` file:

```bash
# Set deployment mode
DEPLOYMENT_MODE=saas  # or on-premise

# For on-premise, set license file path
LICENSE_FILE_PATH=./config/license.json
LICENSE_SECRET_KEY=your-secret-key

# Enable Redis for caching (recommended)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

### Step 7: Restart Application

Restart the application to load the new license system:

```bash
# Stop application
pm2 stop hrms

# Start application
pm2 start hrms

# Or restart
pm2 restart hrms
```

### Step 8: Verify License System

Test the license system is working:

1. Access the application
2. Verify all modules are accessible
3. Check license status page
4. Test module enable/disable
5. Verify usage tracking is recording metrics

## On-Premise License Generation

For On-Premise deployments, use the dedicated license generator:

```bash
# Generate trial license (30 days, all modules, starter limits)
node server/scripts/generateOnPremiseLicense.js --type trial --company "Acme Corp"

# Generate enterprise license (1 year, all modules, unlimited)
node server/scripts/generateOnPremiseLicense.js --type enterprise --company "Big Corp" --days 365

# Generate custom license with specific modules
node server/scripts/generateOnPremiseLicense.js --type custom --company "Custom Corp" \
  --modules "attendance,leave,payroll" --tier business --days 180
```

See `server/scripts/generateOnPremiseLicense.js` for full documentation.

## Data Mapping

### License Structure (SaaS)
```
License {
  tenantId: ObjectId,
  subscriptionId: String,
  modules: [{
    key: String (module key),
    enabled: Boolean,
    tier: String (starter|business|enterprise),
    limits: {
      employees: Number,
      storage: Number,
      apiCalls: Number,
      customLimits: Object
    },
    activatedAt: Date,
    expiresAt: Date
  }],
  billingCycle: String (monthly|annual),
  status: String (active|trial|expired|suspended|cancelled),
  trialEndsAt: Date
}
```

### Usage Tracking Structure
```
UsageTracking {
  tenantId: ObjectId,
  moduleKey: String,
  period: String (YYYY-MM),
  usage: {
    employees: Number,
    storage: Number,
    apiCalls: Number,
    customMetrics: Object
  },
  limits: {
    employees: Number,
    storage: Number,
    apiCalls: Number
  },
  warnings: [{
    limitType: String,
    percentage: Number,
    triggeredAt: Date
  }],
  violations: [{
    limitType: String,
    attemptedValue: Number,
    limit: Number,
    occurredAt: Date
  }]
}
```

## Rollback Procedure

If migration fails or issues are discovered:

### SaaS Rollback

1. **Stop the application**
   ```bash
   pm2 stop hrms
   ```

2. **Remove license data**
   ```javascript
   // In MongoDB shell
   db.licenses.drop();
   db.usagetrackings.drop();
   db.licenseaudits.drop();
   ```

3. **Restore from backup**
   ```bash
   mongorestore --uri="mongodb://localhost:27017/hrms" ./backup-YYYYMMDD
   ```

4. **Revert configuration**
   - Remove license-related environment variables
   - Restore previous `.env` file

5. **Restart application**
   ```bash
   pm2 start hrms
   ```

### On-Premise Rollback

1. **Stop the application**

2. **Remove license file**
   ```bash
   rm config/license.json
   ```

3. **Revert configuration**
   - Set `DEPLOYMENT_MODE=saas` or remove the variable
   - Remove license-related environment variables

4. **Restart application**

## Troubleshooting

### Issue: "No licenses found"
**Cause:** Migration hasn't been run or failed
**Solution:** Run `generateInitialLicenses.js` to create initial licenses

### Issue: "Module not licensed"
**Cause:** Module is disabled in license or license is expired
**Solution:** Check license status, enable module, or renew license

### Issue: "Usage limit exceeded"
**Cause:** Current usage exceeds license limits
**Solution:** Upgrade license tier or reduce usage

### Issue: "License file not found" (On-Premise)
**Cause:** License file missing or path incorrect
**Solution:** Generate license file and verify `LICENSE_FILE_PATH` in `.env`

### Issue: "Invalid license signature" (On-Premise)
**Cause:** License file tampered with or wrong secret key
**Solution:** Regenerate license file with correct secret key

## Environment Variables

Required environment variables for productization:

```bash
# Deployment mode
DEPLOYMENT_MODE=saas  # or on-premise

# For On-Premise deployments
LICENSE_FILE_PATH=./config/license.json
LICENSE_SECRET_KEY=your-secret-key-min-32-chars

# For SaaS deployments (optional)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# Admin email for license notifications
ADMIN_EMAIL=admin@example.com
```

## Performance Considerations

- **Redis Caching**: Enable Redis for improved license validation performance
- **Batch Processing**: Usage tracking uses batch updates (60-second intervals)
- **Database Indexes**: Ensure indexes exist on License and UsageTracking collections
- **Monitoring**: Set up alerts for license expiration and usage limits

## Post-Migration Tasks

After successful migration:

1. ✅ Verify all modules are accessible
2. ✅ Test license validation on API endpoints
3. ✅ Check usage tracking is recording metrics
4. ✅ Verify license status page displays correctly
5. ✅ Test module enable/disable functionality
6. ✅ Set up monitoring and alerts
7. ✅ Update documentation for users
8. ✅ Train administrators on license management

## Support

For issues or questions:
1. Check migration output for error details
2. Review application logs
3. Verify environment variables are set correctly
4. Consult the design document at `.kiro/specs/feature-productization/design.md`
5. Check license validation logs in `licenseaudits` collection

