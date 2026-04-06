# Staging Migration Quick Start Guide

## Prerequisites

Before starting the staging migration, ensure you have:

- [ ] PostgreSQL 14+ installed and running
- [ ] MongoDB accessible (source data)
- [ ] Node.js 14+ installed
- [ ] All environment variables configured
- [ ] Backup of current MongoDB data
- [ ] Stakeholder approval to proceed

## Quick Start (Automated)

### Option 1: Full Automated Migration

```bash
# Run the complete automated migration
node scripts/execute-staging-migration.js
```

This will:
1. Check prerequisites
2. Backup MongoDB
3. Create PostgreSQL databases
4. Run schema migrations
5. Migrate data
6. Validate migration
7. Create indexes
8. Run tests
9. Verify license validation
10. Test performance
11. Generate report

### Option 2: Dry Run First

```bash
# Test the migration without making changes
node scripts/execute-staging-migration.js --dry-run
```

### Option 3: Skip Certain Steps

```bash
# Skip backup (not recommended)
node scripts/execute-staging-migration.js --skip-backup

# Skip tests (not recommended)
node scripts/execute-staging-migration.js --skip-tests

# Skip validation (not recommended)
node scripts/execute-staging-migration.js --skip-validation
```

## Quick Start (Manual)

### Step 1: Configure Environment (5 minutes)

```bash
# Copy and edit environment file
cp .env.example .env.staging

# Edit .env.staging with your staging database URLs
nano .env.staging

# Load environment variables
export $(cat .env.staging | xargs)
```

### Step 2: Backup MongoDB (10-30 minutes)

```bash
# Backup MongoDB data
mongodump --uri="$MONGODB_URI" --out=backups/staging-mongo-$(date +%Y%m%d)
```

### Step 3: Create PostgreSQL Databases (2 minutes)

```bash
# Connect to PostgreSQL
psql -h <staging-db-host> -U postgres

# Create databases
CREATE DATABASE "hrsm-licenses";
CREATE DATABASE "hrsm_platform";
CREATE USER hrsm_app WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE "hrsm-licenses" TO hrsm_app;
GRANT ALL PRIVILEGES ON DATABASE "hrsm_platform" TO hrsm_app;
\q
```

### Step 4: Run Schema Migrations (5 minutes)

```bash
# Run SQL migrations (if you have migration files)
psql "$LICENSE_DATABASE_URL" -f migrations/001-create-license-tables.sql
psql "$MAIN_DATABASE_URL" -f migrations/002-create-main-tables.sql
psql "$MAIN_DATABASE_URL" -f migrations/003-create-indexes.sql
```

### Step 5: Migrate Data (1-4 hours depending on data size)

```bash
# Run data migration
node scripts/migrate-mongo-to-postgres.js 2>&1 | tee migration.log

# Monitor progress
tail -f migration.log
```

### Step 6: Validate Migration (10-20 minutes)

```bash
# Validate migrated data
node scripts/validate-migration.js 2>&1 | tee validation.log

# Check for errors
grep -i "error\|fail" validation.log
```

### Step 7: Create Performance Indexes (5 minutes)

```bash
# Create indexes
node scripts/create-performance-indexes.js
```

### Step 8: Run Tests (20-40 minutes)

```bash
# Run all tests
npm test 2>&1 | tee test-results.log

# Run integration tests
npm run test:integration 2>&1 | tee integration-tests.log

# Check test results
grep -E "Tests:.*passed" test-results.log
```

### Step 9: Start Application (2 minutes)

```bash
# Start license server
NODE_ENV=staging node hrsm-license-server/src/server.js &

# Start main application
NODE_ENV=staging node server/server.js &

# Check health
curl http://localhost:4000/health
curl http://localhost:5000/health
```

### Step 10: Manual Testing (2-4 hours)

```bash
# Use the manual testing checklist
open STAGING_TEST_CHECKLIST.md

# Complete all test cases
# Document any issues found
```

## Verification Commands

### Check Migration Status

```bash
# Check record counts in PostgreSQL
psql "$MAIN_DATABASE_URL" -c "
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'attendances', COUNT(*) FROM attendances
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'surveys', COUNT(*) FROM surveys;
"

# Compare with MongoDB counts
mongosh "$MONGODB_URI" --eval "
db.users.countDocuments();
db.attendances.countDocuments();
db.departments.countDocuments();
db.surveys.countDocuments();
"
```

### Check License Validation

```bash
# Test license validation
curl -X POST http://localhost:5000/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "your_tenant_id"}' | jq

# Check cache
curl http://localhost:5000/api/license/cache/your_tenant_id | jq
```

### Check Performance

```bash
# Check slow queries
curl http://localhost:5000/api/monitoring/slow-queries | jq

# Check connection pool
curl http://localhost:5000/api/monitoring/pool-status | jq

# Check query stats
psql "$MAIN_DATABASE_URL" -c "
SELECT 
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

## Common Issues & Quick Fixes

### Issue: Migration Script Fails

```bash
# Check MongoDB connection
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# Check PostgreSQL connection
psql "$MAIN_DATABASE_URL" -c "SELECT 1"

# Check logs
tail -100 migration.log | grep -i error
```

### Issue: Tests Failing

```bash
# Run specific test
npm test -- test/integration/license-validation.postgres.test.js --verbose

# Check test database
psql "$TEST_DATABASE_URL" -c "\dt"

# Reset test database
npm run test:reset
```

### Issue: Application Won't Start

```bash
# Check logs
tail -100 main-app.log
tail -100 license-server.log

# Verify environment variables
node -e "console.log(process.env.MAIN_DATABASE_URL)"

# Test database connection
node -e "
const { Sequelize } = require('sequelize');
const db = new Sequelize(process.env.MAIN_DATABASE_URL);
db.authenticate().then(() => console.log('OK')).catch(console.error);
"
```

### Issue: Poor Performance

```bash
# Check if indexes exist
psql "$MAIN_DATABASE_URL" -c "
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;
"

# Analyze query plan
psql "$MAIN_DATABASE_URL" -c "
EXPLAIN ANALYZE
SELECT * FROM users WHERE tenant_id = 'your_tenant_id' LIMIT 10;
"

# Recreate indexes
node scripts/create-performance-indexes.js
```

## Rollback Procedure

If critical issues are found:

```bash
# Stop application
pkill -f "node.*server.js"

# Run rollback
node scripts/test-rollback-procedures.js --execute

# Verify rollback
node scripts/verify-rollback-success.js

# Restart with MongoDB
NODE_ENV=staging node server/server.js
```

## Success Criteria

The staging migration is successful when:

- ✅ All data migrated (0 discrepancies)
- ✅ All tests passing (100%)
- ✅ All functionality working
- ✅ Performance acceptable (< 500ms API responses)
- ✅ License validation working
- ✅ No critical bugs
- ✅ Manual testing complete
- ✅ Stakeholder approval obtained

## Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Prerequisites | 30 min | Environment setup |
| Backup | 30 min | MongoDB backup |
| Schema Migration | 10 min | Create tables |
| Data Migration | 2-4 hours | Depends on data size |
| Validation | 20 min | Verify data |
| Indexes | 10 min | Create indexes |
| Automated Tests | 40 min | Run test suite |
| Manual Testing | 2-4 hours | Complete checklist |
| **Total** | **6-10 hours** | Full migration |

## Next Steps After Success

1. **Document Results**
   - Save all logs and reports
   - Document any issues found
   - Note performance metrics

2. **Monitor Staging**
   - Monitor for 24-48 hours
   - Check for memory leaks
   - Verify stability

3. **Get Approval**
   - Present results to stakeholders
   - Get sign-off for production
   - Schedule production window

4. **Plan Production**
   - Create production migration plan
   - Schedule maintenance window
   - Prepare communication plan
   - Ensure rollback plan ready

## Support

If you encounter issues:

1. Check STAGING_MIGRATION_GUIDE.md for detailed instructions
2. Check POSTGRESQL_TROUBLESHOOTING.md for common issues
3. Review logs in migration.log and validation.log
4. Contact the development team

## Important Notes

⚠️ **DO NOT** skip the backup step  
⚠️ **DO NOT** proceed to production without stakeholder approval  
⚠️ **DO NOT** skip manual testing  
⚠️ **DO** monitor staging for at least 24 hours before production  
⚠️ **DO** have rollback plan ready  

---

**Ready to start?**

```bash
# Run the automated migration
node scripts/execute-staging-migration.js
```

Good luck! 🚀
