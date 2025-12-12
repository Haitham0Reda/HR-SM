# Quick Start: 001_add_tenant_id Migration

## TL;DR

```bash
# 1. Backup your database first!
mongodump --uri="mongodb://localhost:27017/hrms" --out=./backup-$(date +%Y%m%d)

# 2. Run the migration
node server/scripts/migrations/001_add_tenant_id.js

# 3. Verify it worked
node server/scripts/migrations/test_001_migration.js

# 4. If something goes wrong, rollback
node server/scripts/migrations/001_add_tenant_id.js rollback
```

## What This Does

Adds `tenantId` field to all collections and creates compound indexes for multi-tenancy.

## Before You Run

1. ✅ **Backup your database** (seriously, do this!)
2. ✅ **Test in development first**
3. ✅ **Check disk space** (indexes need space)
4. ✅ **Plan for downtime** (large databases take time)

## Step-by-Step

### 1. Backup Database

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/hrms" --out=./backup-$(date +%Y%m%d)

# Or use your existing backup script
node server/scripts/testBackup.js
```

### 2. Run Migration

```bash
# Standard migration (uses 'default_tenant' as tenantId)
node server/scripts/migrations/001_add_tenant_id.js

# Or with custom tenant ID
DEFAULT_TENANT_ID=my_company node server/scripts/migrations/001_add_tenant_id.js
```

### 3. Verify Results

```bash
# Run automated tests
node server/scripts/migrations/test_001_migration.js

# Or check manually in MongoDB
mongo hrms --eval "db.users.findOne()"
# Should show: { ..., tenantId: 'default_tenant', ... }
```

### 4. Check Indexes

```bash
mongo hrms --eval "db.users.getIndexes()"
# Should show compound indexes with tenantId
```

## Expected Time

- Small database (< 10k records): 1-2 minutes
- Medium database (10k-100k records): 5-10 minutes
- Large database (> 100k records): 15-30 minutes

## What Gets Updated

- 40+ collections get `tenantId` field
- 95+ compound indexes created
- All existing records assigned to 'default_tenant'

## If Something Goes Wrong

### Rollback

```bash
node server/scripts/migrations/001_add_tenant_id.js rollback
```

### Restore from Backup

```bash
# Drop database
mongo hrms --eval "db.dropDatabase()"

# Restore from backup
mongorestore --uri="mongodb://localhost:27017/hrms" ./backup-YYYYMMDD
```

## Common Issues

### "Collection not found"
**Solution**: Normal - script skips missing collections

### "Duplicate key error"
**Solution**: Index already exists - script continues

### "Out of disk space"
**Solution**: Free up space and retry

### "Connection timeout"
**Solution**: Check MongoDB is running and accessible

## After Migration

1. ✅ Update models to include `tenantId` field
2. ✅ Add tenant context middleware
3. ✅ Update queries to filter by `tenantId`
4. ✅ Create default tenant record
5. ✅ Test tenant isolation

## Need Help?

- Read full docs: `001_add_tenant_id_README.md`
- Check implementation: `IMPLEMENTATION_SUMMARY_001.md`
- Review migration code: `001_add_tenant_id.js`

## Environment Variables

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/hrms

# Optional
DEFAULT_TENANT_ID=default_tenant  # Default if not set
```

## Verification Checklist

After migration, verify:

- [ ] All collections have `tenantId` field
- [ ] No documents missing `tenantId`
- [ ] Compound indexes created
- [ ] Test script passes
- [ ] Application still works
- [ ] Queries use indexes (check with `.explain()`)

## Production Checklist

Before running in production:

- [ ] Tested in development
- [ ] Tested in staging
- [ ] Database backed up
- [ ] Downtime scheduled
- [ ] Team notified
- [ ] Rollback plan ready
- [ ] Monitoring in place

## Quick Commands

```bash
# Check migration status
mongo hrms --eval "db.users.countDocuments({ tenantId: { \$exists: true } })"

# Check missing tenantId
mongo hrms --eval "db.users.countDocuments({ tenantId: { \$exists: false } })"

# List all indexes
mongo hrms --eval "db.users.getIndexes()"

# Check index usage
mongo hrms --eval "db.users.find({ tenantId: 'default_tenant' }).limit(1).explain('executionStats')"
```

## Success Indicators

✅ Migration complete message  
✅ All collections processed  
✅ Indexes created  
✅ Test script passes  
✅ No errors in output  

## Red Flags

🚨 Many "Error" messages  
🚨 Test script fails  
🚨 Application won't start  
🚨 Queries are slow  
🚨 Data missing  

If you see red flags, **rollback immediately** and investigate.
