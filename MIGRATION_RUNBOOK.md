# MongoDB to PostgreSQL Migration Runbook

## Overview

This runbook provides step-by-step instructions for migrating data from MongoDB to PostgreSQL. Follow these steps carefully to ensure a successful migration.

## Prerequisites

### 1. Environment Setup

Ensure the following are installed and configured:
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- MongoDB (v4.4 or higher)
- Required npm packages (run `npm install`)

### 2. Database Access

Verify you have access to:
- MongoDB License Server database
- MongoDB tenant databases
- PostgreSQL License Server database
- PostgreSQL Main Application database

### 3. Environment Variables

Set the following environment variables:

```bash
# MongoDB
export LICENSE_SERVER_MONGODB_URI="mongodb://localhost:27017/hrsm-license-server"
export MAIN_APP_MONGODB_URI="mongodb://localhost:27017/"

# PostgreSQL
export LICENSE_DATABASE_URL="postgresql://user:password@localhost:5432/hrsm_license_server"
export MAIN_DATABASE_URL="postgresql://user:password@localhost:5432/hrsm_main_app"

# Optional
export BATCH_SIZE=1000
```

### 4. Backup Current Data

**CRITICAL**: Always backup your data before migration!

```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017" --out=/backup/mongodb/$(date +%Y%m%d)

# Backup PostgreSQL (if exists)
pg_dump -h localhost -U postgres hrsm_license_server > /backup/postgres/license_$(date +%Y%m%d).sql
pg_dump -h localhost -U postgres hrsm_main_app > /backup/postgres/main_$(date +%Y%m%d).sql
```

## Migration Steps

### Step 1: Prepare PostgreSQL Databases

Create the PostgreSQL databases and run migrations to create tables:

```bash
# Create databases
createdb hrsm_license_server
createdb hrsm_main_app

# Run Sequelize migrations (if you have migration files)
npx sequelize-cli db:migrate --env production

# Or sync models (development only)
node -e "require('./server/config/database').syncModels()"
```

### Step 2: Dry Run Migration

Always perform a dry run first to identify potential issues:

```bash
node scripts/migrate-mongo-to-postgres.js --dry-run
```

Review the output for:
- Connection issues
- Missing collections
- Data transformation errors
- Estimated migration time

### Step 3: Run Migration (License Server)

Migrate the license server data first:

```bash
node scripts/migrate-mongo-to-postgres.js --skip-main
```

This will migrate:
- Tenants
- Licenses
- Subscriptions
- Plans

**Expected Duration**: 5-15 minutes (depending on data size)

### Step 4: Validate License Server Migration

```bash
node scripts/validate-migration.js --skip-main
```

Verify:
- Record counts match
- No discrepancies reported
- All relationships intact

### Step 5: Run Migration (Main Application)

Migrate tenant data:

```bash
# Migrate all tenants
node scripts/migrate-mongo-to-postgres.js --skip-license

# Or migrate specific tenant
node scripts/migrate-mongo-to-postgres.js --skip-license --tenant=company_name
```

**Expected Duration**: 30 minutes - 2 hours (depending on data size and tenant count)

### Step 6: Validate Main Application Migration

```bash
# Validate all tenants
node scripts/validate-migration.js --skip-license

# Or validate specific tenant
node scripts/validate-migration.js --skip-license --tenant=company_name
```

### Step 7: Verify Application Functionality

Test critical application features:

1. **User Authentication**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'
   ```

2. **Tenant Data Access**
   - Log in to the application
   - Verify user list loads
   - Check attendance records
   - Test CRUD operations

3. **License Validation**
   - Verify license checks work
   - Test module access control
   - Check subscription status

4. **Cross-Database Queries**
   - Verify license server queries work from main app
   - Test cache synchronization

### Step 8: Performance Testing

Run performance tests to ensure acceptable response times:

```bash
# Run performance test suite
npm run test:performance

# Or manual testing
node scripts/test-query-performance.js
```

Monitor:
- Query execution times
- Connection pool usage
- Memory consumption
- CPU utilization

### Step 9: Update Application Configuration

Update the application to use PostgreSQL:

1. **Update Environment Variables**
   ```bash
   # In .env or environment
   DATABASE_TYPE=postgresql
   USE_MONGODB=false
   ```

2. **Update Database Configuration**
   - Ensure `server/config/database.js` uses PostgreSQL connections
   - Verify connection pooling settings
   - Check SSL configuration if needed

3. **Restart Application**
   ```bash
   pm2 restart hr-sm
   # or
   npm run start:production
   ```

### Step 10: Monitor Production

After migration, monitor closely for:

1. **Application Logs**
   ```bash
   tail -f logs/application.log
   ```

2. **Database Performance**
   ```sql
   -- PostgreSQL slow queries
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

3. **Error Rates**
   - Check error logs
   - Monitor API response codes
   - Track failed requests

4. **User Reports**
   - Monitor support tickets
   - Check user feedback
   - Track reported issues

## Migration Options

### Command Line Options

```bash
# Dry run (no changes made)
--dry-run

# Custom batch size
--batch-size=500

# Migrate specific tenant
--tenant=company_name

# Migrate specific collection
--collection=users

# Skip license server
--skip-license

# Skip main application
--skip-main
```

### Examples

```bash
# Test migration without making changes
node scripts/migrate-mongo-to-postgres.js --dry-run

# Migrate with smaller batches (for limited memory)
node scripts/migrate-mongo-to-postgres.js --batch-size=500

# Migrate only one tenant
node scripts/migrate-mongo-to-postgres.js --tenant=acme_corp

# Migrate only users collection for a tenant
node scripts/migrate-mongo-to-postgres.js --tenant=acme_corp --collection=users
```

## Troubleshooting

### Issue: Connection Timeout

**Symptoms**: Migration fails with connection timeout errors

**Solution**:
```bash
# Increase connection timeout in environment
export PG_CONNECT_TIMEOUT=30000
export MONGO_CONNECT_TIMEOUT=30000

# Or reduce batch size
node scripts/migrate-mongo-to-postgres.js --batch-size=100
```

### Issue: Out of Memory

**Symptoms**: Node.js crashes with "JavaScript heap out of memory"

**Solution**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 scripts/migrate-mongo-to-postgres.js --batch-size=500
```

### Issue: Foreign Key Violations

**Symptoms**: Migration fails with foreign key constraint errors

**Solution**:
```bash
# Temporarily disable foreign key checks (PostgreSQL)
psql -d hrsm_main_app -c "SET session_replication_role = 'replica';"

# Run migration
node scripts/migrate-mongo-to-postgres.js

# Re-enable foreign key checks
psql -d hrsm_main_app -c "SET session_replication_role = 'origin';"
```

### Issue: Duplicate Key Errors

**Symptoms**: Migration fails with unique constraint violations

**Solution**:
1. Check for duplicate data in MongoDB
2. Clean up duplicates before migration
3. Or skip duplicates during migration (modify script)

### Issue: Data Type Mismatches

**Symptoms**: Some fields have incorrect data types in PostgreSQL

**Solution**:
1. Review model definitions
2. Update Sequelize models with correct types
3. Re-run migration for affected collections

### Issue: Missing Records

**Symptoms**: Validation shows count mismatches

**Solution**:
```bash
# Check migration logs
cat logs/migration.log | grep ERROR

# Re-run migration for specific collection
node scripts/migrate-mongo-to-postgres.js --collection=users --tenant=acme_corp

# Validate again
node scripts/validate-migration.js --collection=users --tenant=acme_corp
```

## Rollback Procedure

If migration fails or issues are discovered:

### 1. Stop Application

```bash
pm2 stop hr-sm
```

### 2. Restore MongoDB Configuration

```bash
# Update environment variables
export DATABASE_TYPE=mongodb
export USE_MONGODB=true

# Restart application
pm2 start hr-sm
```

### 3. Clear PostgreSQL Data (Optional)

```bash
# Drop and recreate databases
dropdb hrsm_license_server
dropdb hrsm_main_app
createdb hrsm_license_server
createdb hrsm_main_app
```

### 4. Restore from Backup (If Needed)

```bash
# Restore MongoDB
mongorestore --uri="mongodb://localhost:27017" /backup/mongodb/20260406

# Restore PostgreSQL
psql -d hrsm_license_server < /backup/postgres/license_20260406.sql
psql -d hrsm_main_app < /backup/postgres/main_20260406.sql
```

### 5. Verify Application

- Test critical functionality
- Check data integrity
- Monitor for errors

## Post-Migration Tasks

### 1. Optimize PostgreSQL

```sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Update statistics
VACUUM FULL ANALYZE;
```

### 2. Create Additional Indexes

```sql
-- Add performance indexes
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_attendances_tenant_date ON attendances(tenant_id, date);
-- Add more as needed
```

### 3. Configure Autovacuum

```sql
-- Update autovacuum settings
ALTER TABLE users SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE attendances SET (autovacuum_vacuum_scale_factor = 0.1);
```

### 4. Set Up Monitoring

- Configure pg_stat_statements
- Set up slow query logging
- Configure connection pool monitoring
- Set up alerts for errors

### 5. Update Documentation

- Document any migration issues encountered
- Update deployment procedures
- Record lessons learned
- Update team knowledge base

### 6. Schedule Regular Backups

```bash
# Add to crontab
0 2 * * * pg_dump -h localhost -U postgres hrsm_license_server | gzip > /backup/postgres/license_$(date +\%Y\%m\%d).sql.gz
0 3 * * * pg_dump -h localhost -U postgres hrsm_main_app | gzip > /backup/postgres/main_$(date +\%Y\%m\%d).sql.gz
```

### 7. Remove MongoDB (After Verification Period)

**Wait at least 30 days before removing MongoDB**

```bash
# Stop MongoDB service
sudo systemctl stop mongod

# Disable MongoDB service
sudo systemctl disable mongod

# Archive MongoDB data
tar -czf mongodb_archive_$(date +%Y%m%d).tar.gz /var/lib/mongodb

# Remove MongoDB (optional)
sudo apt-get remove mongodb-org
```

## Success Criteria

Migration is considered successful when:

- ✅ All record counts match between MongoDB and PostgreSQL
- ✅ Validation script reports zero discrepancies
- ✅ Application starts without errors
- ✅ All critical features work correctly
- ✅ Performance is acceptable (< 2x slower than MongoDB)
- ✅ No data loss or corruption
- ✅ All relationships are intact
- ✅ Tenant isolation is maintained
- ✅ License validation works correctly
- ✅ No user-reported issues for 7 days

## Timeline

### Development/Staging Environment

- **Day 1**: Dry run and testing (2-4 hours)
- **Day 2**: Full migration and validation (4-6 hours)
- **Day 3-7**: Testing and verification (ongoing)
- **Day 8-14**: Performance tuning and optimization

### Production Environment

- **Week 1**: Final staging migration and testing
- **Week 2**: Production migration planning
- **Week 3**: Production migration (during maintenance window)
- **Week 4**: Monitoring and issue resolution
- **Week 5-8**: Verification period (keep MongoDB as backup)
- **Week 9+**: Remove MongoDB after successful verification

## Maintenance Window

Recommended maintenance window for production migration:

- **Duration**: 4-6 hours
- **Timing**: Weekend or off-peak hours
- **Team**: Full team on standby
- **Communication**: Notify users 1 week in advance

## Support Contacts

- **Database Team**: database-team@company.com
- **DevOps Team**: devops@company.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Sequelize Documentation](https://sequelize.org/docs/)
- [Migration Best Practices](./MIGRATION_BEST_PRACTICES.md)
- [Transaction Usage Guide](./TRANSACTION_USAGE_GUIDE.md)

---

**Last Updated**: April 6, 2026  
**Version**: 1.0  
**Status**: Ready for Use
