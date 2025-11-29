# Leave System Migration Scripts

This directory contains scripts to migrate data from the monolithic Leave model to the new specialized models (Mission, SickLeave, Vacation).

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
