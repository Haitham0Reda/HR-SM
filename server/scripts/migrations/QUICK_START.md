# Migration Quick Start Guide

## 🚀 Quick Commands

### Test Connection
```bash
node server/scripts/migrations/testConnection.js
```

### Dry Run (Recommended First)
```bash
node server/scripts/migrations/runAllMigrations.js --dry-run
```

### Run Full Migration
```bash
node server/scripts/migrations/runAllMigrations.js
```

### Validate Results
```bash
node server/scripts/migrations/validateMigration.js
```

## 📁 Files Created

```
server/scripts/migrations/
├── README.md                    # Comprehensive documentation
├── TESTING.md                   # Test results and procedures
├── QUICK_START.md              # This file
├── backupLeaveCollection.js    # Backup script
├── migrateMissions.js          # Mission migration
├── migrateSickLeaves.js        # Sick leave migration
├── migrateVacations.js         # Vacation migration
├── validateMigration.js        # Validation script
├── runAllMigrations.js         # Master orchestration script
├── testMigration.js            # Automated test suite
└── testConnection.js           # Connection verification
```

## ⚡ Quick Migration Steps

1. **Backup** (automatic in runAllMigrations.js)
2. **Dry Run** to preview changes
3. **Run Migration** when ready
4. **Validate** to verify integrity
5. **Test Application** to ensure everything works

## 🔍 Current Database State

Based on connection test:
- **Total Leaves**: 9
- **Missions**: 8 (will be migrated)
- **Sick Leaves**: 1 (will be migrated)
- **Vacations**: 0 (none to migrate)

## ✅ What Gets Migrated

### Mission Leaves → missions collection
- Location, purpose, related department
- All approval/rejection data
- Timestamps preserved

### Sick Leaves → sickleaves collection
- Medical documentation
- Workflow state (supervisor/doctor approval)
- All approval/rejection data
- Timestamps preserved

### Vacation Leaves → vacations collection
- Vacation type (annual/casual/unpaid)
- Vacation balance references
- All approval/rejection data
- Timestamps preserved

## 🛡️ Safety Features

- ✅ Automatic backup before migration
- ✅ Dry-run mode available
- ✅ Duplicate detection (won't re-migrate)
- ✅ Error tracking and reporting
- ✅ Rollback procedures documented
- ✅ Validation checks included

## 📊 Verification

After migration, check:
1. Document counts match
2. New collections exist (missions, sickleaves, vacations)
3. Backup collection created (leaves_backup_*)
4. Migration metadata saved
5. Application works with new models

## 🆘 If Something Goes Wrong

1. Check exit code (0 = success, 1 = error)
2. Query `migration_metadata` collection for details
3. Follow rollback procedure in README.md
4. Restore from backup if needed

## 📚 More Information

- See `README.md` for detailed documentation
- See `TESTING.md` for test results and procedures
- See design document at `.kiro/specs/leave-system-refactor/design.md`
