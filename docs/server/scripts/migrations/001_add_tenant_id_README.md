# Migration 001: Add Tenant ID

## Overview

This migration adds `tenantId` field to all tenant-scoped collections and creates compound indexes for performance and tenant isolation.

## Purpose

- **Requirement**: 14.4
- **Goal**: Enable multi-tenancy by adding tenant isolation at the database level
- **Impact**: All existing data will be assigned to the default tenant

## What This Migration Does

### 1. Adds tenantId Field
- Adds `tenantId` field to all tenant-scoped collections
- Assigns default value `'default_tenant'` to existing records
- Updates `updatedAt` timestamp for modified documents

### 2. Creates Compound Indexes
Creates compound indexes on `(tenantId, other_field)` for:
- **Performance**: Faster queries when filtering by tenant
- **Isolation**: Ensures queries are automatically scoped to tenant
- **Uniqueness**: Enforces unique constraints within tenant scope

### Collections Affected

The migration processes 40+ collections including:
- Core HR: users, departments, positions
- Attendance: attendances, attendancedevices, forgetchecks
- Requests: requests, permissions, overtimes
- Leave Management: vacations, missions, sickleaves, mixedvacations
- Documents: documents, documenttemplates
- Tasks: tasks, taskreports
- Payroll: payrolls
- Reports: reports, reportconfigs, reportexecutions
- And more...

## Usage

### Running the Migration

```bash
# From project root
node server/scripts/migrations/001_add_tenant_id.js

# Or with custom tenant ID
DEFAULT_TENANT_ID=my_company node server/scripts/migrations/001_add_tenant_id.js
```

### Rolling Back the Migration

```bash
# Remove tenantId and drop indexes
node server/scripts/migrations/001_add_tenant_id.js rollback
```

## Environment Variables

- `MONGODB_URI`: Database connection string (required)
- `DEFAULT_TENANT_ID`: Default tenant identifier (default: 'default_tenant')

## Example Output

```
======================================================================
🔧 Starting Migration: 001_add_tenant_id.js
======================================================================
📍 Default Tenant ID: default_tenant
📍 Database: localhost:27017/hrms
======================================================================

✓ Connected to database

📦 Processing collection: users
  ✓ Added tenantId to 150 documents in 'users'
  📊 Creating compound indexes...
    ✓ Created index on {"tenantId":1,"email":1}
    ✓ Created index on {"tenantId":1,"username":1}
    ✓ Created index on {"tenantId":1,"employeeId":1}
    ✓ Created index on {"tenantId":1,"role":1}
    ✓ Created index on {"tenantId":1,"department":1}
    ✓ Created index on {"tenantId":1,"status":1}

📦 Processing collection: attendances
  ✓ Added tenantId to 3500 documents in 'attendances'
  📊 Creating compound indexes...
    ✓ Created index on {"tenantId":1,"employee":1,"date":1}
    ✓ Created index on {"tenantId":1,"department":1,"date":1}
    ✓ Created index on {"tenantId":1,"status":1}
    ✓ Created index on {"tenantId":1,"date":1}

...

======================================================================
✓ Migration Complete!
======================================================================
📊 Collections processed: 38
📊 Collections skipped: 2
📊 Total documents updated: 5247
📊 Total indexes created: 95
======================================================================
```

## Verification

After running the migration, verify:

### 1. Check tenantId Field
```javascript
// In MongoDB shell or Compass
db.users.findOne()
// Should show: { ..., tenantId: 'default_tenant', ... }
```

### 2. Check Indexes
```javascript
db.users.getIndexes()
// Should show compound indexes like:
// { "tenantId": 1, "email": 1 }
// { "tenantId": 1, "username": 1 }
```

### 3. Verify All Documents Updated
```javascript
// Should return 0
db.users.countDocuments({ tenantId: { $exists: false } })
```

## Important Notes

### Before Running
1. **Backup your database** - Always backup before running migrations
2. **Test in development** - Run on dev/staging environment first
3. **Check disk space** - Ensure sufficient space for index creation
4. **Plan downtime** - Large databases may take time to migrate

### After Running
1. **Update models** - Ensure all Mongoose models include `tenantId` field
2. **Update middleware** - Add tenant context middleware to routes
3. **Update queries** - Ensure all queries filter by `tenantId`
4. **Test thoroughly** - Verify tenant isolation works correctly

### Performance Considerations
- Index creation may take time on large collections
- Database will be locked during index creation
- Consider running during low-traffic periods
- Monitor database performance after migration

## Rollback Procedure

If issues occur:

1. **Stop the application**
2. **Run rollback**:
   ```bash
   node server/scripts/migrations/001_add_tenant_id.js rollback
   ```
3. **Restore from backup** (if needed)
4. **Investigate issues**
5. **Fix and retry**

## Next Steps

After successful migration:

1. ✅ Run migration 002: Update models to require tenantId
2. ✅ Implement tenant context middleware
3. ✅ Update all queries to filter by tenantId
4. ✅ Test tenant isolation thoroughly
5. ✅ Create default tenant record in tenants collection

## Troubleshooting

### Migration Fails Midway
- Check error message for specific collection
- Verify database connection
- Check disk space
- Review database logs

### Indexes Not Created
- Check for existing conflicting indexes
- Verify unique constraint violations
- Review index creation errors in output

### Performance Issues After Migration
- Analyze query patterns
- Check index usage with `.explain()`
- Consider additional indexes if needed
- Monitor database metrics

## Related Files

- `server/core/middleware/tenantContext.js` - Tenant context middleware
- `server/platform/tenants/models/Tenant.js` - Tenant model
- `server/scripts/migrations/README.md` - General migration guide

## Support

For issues or questions:
1. Check migration output for specific errors
2. Review database logs
3. Verify environment variables
4. Test in development environment first
