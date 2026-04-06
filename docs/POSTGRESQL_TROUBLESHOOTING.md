# PostgreSQL Troubleshooting Guide

## Overview

This guide provides solutions to common PostgreSQL issues encountered in the HR-SM application after migration from MongoDB. It covers connection problems, performance issues, data integrity concerns, and operational challenges.

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Performance Problems](#performance-problems)
3. [Data Integrity Issues](#data-integrity-issues)
4. [Query Errors](#query-errors)
5. [Migration Issues](#migration-issues)
6. [Backup and Restore Issues](#backup-and-restore-issues)
7. [Multi-Tenancy Issues](#multi-tenancy-issues)
8. [License Validation Issues](#license-validation-issues)
9. [Monitoring and Diagnostics](#monitoring-and-diagnostics)

## Connection Issues

### Issue: Connection Refused

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Possible Causes**:
1. PostgreSQL service not running
2. Wrong host or port
3. Firewall blocking connection
4. PostgreSQL not listening on correct interface

**Solutions**:

1. **Check if PostgreSQL is running**:
```bash
# Linux
sudo systemctl status postgresql

# macOS
brew services list | grep postgresql

# Windows
sc query postgresql-x64-14
```

2. **Start PostgreSQL if stopped**:
```bash
# Linux
sudo systemctl start postgresql

# macOS
brew services start postgresql

# Windows
net start postgresql-x64-14
```

3. **Verify PostgreSQL is listening**:
```bash
# Check listening ports
sudo netstat -tlnp | grep 5432

# Or use pg_isready
pg_isready -h localhost -p 5432
```

4. **Check postgresql.conf**:
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Ensure this line is present:
listen_addresses = '*'  # or 'localhost' for local only

# Restart PostgreSQL
sudo systemctl restart postgresql
```

5. **Check firewall**:
```bash
# Linux (ufw)
sudo ufw allow 5432/tcp

# Linux (firewalld)
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

### Issue: Authentication Failed

**Symptoms**:
```
Error: password authentication failed for user "username"
```

**Possible Causes**:
1. Incorrect username or password
2. User doesn't exist
3. Wrong authentication method in pg_hba.conf
4. User doesn't have database access

**Solutions**:

1. **Verify credentials**:
```bash
# Test connection manually
psql -h localhost -U username -d database_name

# If successful, credentials are correct
```

2. **Check if user exists**:
```sql
-- Connect as postgres superuser
psql -U postgres

-- List all users
\du

-- Create user if missing
CREATE USER username WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE hrsm_platform TO username;
```

3. **Check pg_hba.conf**:
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add or modify line:
host    all             all             0.0.0.0/0               md5

# Reload PostgreSQL
sudo systemctl reload postgresql
```

4. **Reset password**:
```sql
-- Connect as postgres
psql -U postgres

-- Reset password
ALTER USER username WITH PASSWORD 'new_password';
```

### Issue: Too Many Connections

**Symptoms**:
```
Error: sorry, too many clients already
```

**Possible Causes**:
1. Connection pool exhausted
2. max_connections limit reached
3. Connection leaks in application
4. Too many concurrent users

**Solutions**:

1. **Check current connections**:
```sql
-- Count active connections
SELECT count(*) FROM pg_stat_activity;

-- See connections by database
SELECT datname, count(*) 
FROM pg_stat_activity 
GROUP BY datname;

-- See connections by user
SELECT usename, count(*) 
FROM pg_stat_activity 
GROUP BY usename;
```

2. **Increase max_connections**:
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Increase max_connections
max_connections = 200  # Default is 100

# Restart PostgreSQL
sudo systemctl restart postgresql
```

3. **Reduce application pool size**:
```env
# In .env file
PG_MAX_POOL_SIZE=20  # Reduce from 50
PG_MIN_POOL_SIZE=5   # Reduce from 10
```

4. **Kill idle connections**:
```sql
-- Kill idle connections older than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

5. **Find connection leaks**:
```javascript
// Add connection pool monitoring
const { mainAppDb } = require('./config/database');

setInterval(() => {
  console.log('Pool size:', mainAppDb.connectionManager.pool.size);
  console.log('Available:', mainAppDb.connectionManager.pool.available);
  console.log('Using:', mainAppDb.connectionManager.pool.using);
}, 60000);
```

### Issue: Connection Timeout

**Symptoms**:
```
Error: Connection timeout
Error: Timeout acquiring connection from pool
```

**Possible Causes**:
1. Network latency
2. Database overloaded
3. Slow queries blocking connections
4. Connection pool too small

**Solutions**:

1. **Increase connection timeout**:
```env
# In .env file
PG_CONNECTION_TIMEOUT=60000  # Increase from 30000
```

2. **Increase pool size**:
```env
PG_MAX_POOL_SIZE=50  # Increase from 20
```

3. **Find slow queries**:
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

4. **Kill long-running queries**:
```sql
-- Find long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > INTERVAL '5 minutes';

-- Kill specific query
SELECT pg_terminate_backend(pid);
```

## Performance Problems

### Issue: Slow Queries

**Symptoms**:
- API responses taking > 2 seconds
- Database CPU usage high
- Query timeouts

**Diagnosis**:

1. **Enable query logging**:
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Add these lines:
log_min_duration_statement = 1000  # Log queries > 1 second
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'all'  # Log all statements (development only)

# Reload PostgreSQL
sudo systemctl reload postgresql
```

2. **Check slow query log**:
```bash
# View PostgreSQL log
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

3. **Analyze query performance**:
```sql
-- Use EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM users WHERE tenant_id = 'techcorp' AND email = 'john@example.com';

-- Look for:
-- - Sequential Scans (should use indexes)
-- - High execution time
-- - Large row counts
```

**Solutions**:

1. **Add missing indexes**:
```sql
-- Check if index is being used
EXPLAIN SELECT * FROM users WHERE tenant_id = 'techcorp';

-- If Sequential Scan, add index:
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Verify index is used
EXPLAIN SELECT * FROM users WHERE tenant_id = 'techcorp';
-- Should show "Index Scan"
```

2. **Optimize queries**:
```javascript
// Bad: SELECT *
const users = await User.findAll({
  where: { tenant_id: 'techcorp' }
});

// Good: SELECT specific columns
const users = await User.findAll({
  where: { tenant_id: 'techcorp' },
  attributes: ['id', 'email', 'first_name', 'last_name']
});
```

3. **Use pagination**:
```javascript
// Bad: Load all records
const users = await User.findAll({ where: { tenant_id: 'techcorp' } });

// Good: Paginate
const users = await User.findAll({
  where: { tenant_id: 'techcorp' },
  limit: 50,
  offset: 0
});
```

4. **Optimize joins**:
```javascript
// Bad: N+1 queries
const users = await User.findAll({ where: { tenant_id: 'techcorp' } });
for (const user of users) {
  user.department = await Department.findByPk(user.department_id);
}

// Good: Eager loading
const users = await User.findAll({
  where: { tenant_id: 'techcorp' },
  include: [{ model: Department }]
});
```

### Issue: High Memory Usage

**Symptoms**:
- PostgreSQL using excessive RAM
- Out of memory errors
- System swapping

**Diagnosis**:

```sql
-- Check memory usage
SELECT 
  pg_size_pretty(pg_database_size('hrsm_platform')) AS db_size,
  pg_size_pretty(pg_total_relation_size('users')) AS users_table_size;

-- Check cache hit ratio
SELECT 
  sum(heap_blks_read) AS heap_read,
  sum(heap_blks_hit) AS heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS ratio
FROM pg_statio_user_tables;
```

**Solutions**:

1. **Adjust shared_buffers**:
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Set to 25% of total RAM
shared_buffers = 2GB  # For 8GB RAM system

# Restart PostgreSQL
sudo systemctl restart postgresql
```

2. **Adjust work_mem**:
```bash
# Edit postgresql.conf
work_mem = 16MB  # Per query operation

# Restart PostgreSQL
sudo systemctl restart postgresql
```

3. **Vacuum and analyze**:
```sql
-- Vacuum all tables
VACUUM ANALYZE;

-- Vacuum specific table
VACUUM ANALYZE users;

-- Full vacuum (requires exclusive lock)
VACUUM FULL ANALYZE users;
```

### Issue: Disk Space Running Out

**Symptoms**:
```
Error: could not extend file: No space left on device
```

**Diagnosis**:

```bash
# Check disk space
df -h

# Check PostgreSQL data directory size
du -sh /var/lib/postgresql/14/main

# Check individual database sizes
psql -U postgres -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;"
```

**Solutions**:

1. **Clean up old data**:
```sql
-- Archive old records
INSERT INTO archived_attendances 
SELECT * FROM attendances 
WHERE date < '2025-01-01';

DELETE FROM attendances 
WHERE date < '2025-01-01';

-- Vacuum to reclaim space
VACUUM FULL attendances;
```

2. **Clean up WAL files**:
```bash
# Check WAL directory size
du -sh /var/lib/postgresql/14/main/pg_wal

# Adjust WAL retention
sudo nano /etc/postgresql/14/main/postgresql.conf

# Set max WAL size
max_wal_size = 1GB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

3. **Remove old backups**:
```bash
# Clean up backups older than 30 days
find /backups/postgres -name "*.dump.gz" -mtime +30 -delete
```

4. **Expand disk space**:
```bash
# Add new disk or expand existing volume
# Then move PostgreSQL data directory
sudo systemctl stop postgresql
sudo rsync -av /var/lib/postgresql/14/main /new/location/
sudo nano /etc/postgresql/14/main/postgresql.conf
# Update data_directory = '/new/location/main'
sudo systemctl start postgresql
```

## Data Integrity Issues

### Issue: Foreign Key Violations

**Symptoms**:
```
Error: insert or update on table "users" violates foreign key constraint
```

**Diagnosis**:

```sql
-- Check foreign key constraints
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

**Solutions**:

1. **Verify referenced record exists**:
```sql
-- Check if department exists
SELECT * FROM departments WHERE id = 'uuid-value';

-- If not, create it or use NULL
UPDATE users SET department_id = NULL WHERE department_id = 'invalid-uuid';
```

2. **Temporarily disable constraints** (migration only):
```sql
-- Disable foreign key checks
SET session_replication_role = 'replica';

-- Perform operations
INSERT INTO users (...) VALUES (...);

-- Re-enable foreign key checks
SET session_replication_role = 'origin';
```

3. **Fix orphaned records**:
```sql
-- Find orphaned users (department doesn't exist)
SELECT u.* 
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.department_id IS NOT NULL AND d.id IS NULL;

-- Fix by setting to NULL or valid department
UPDATE users 
SET department_id = NULL 
WHERE department_id NOT IN (SELECT id FROM departments);
```

### Issue: Unique Constraint Violations

**Symptoms**:
```
Error: duplicate key value violates unique constraint "users_tenant_email_unique"
```

**Diagnosis**:

```sql
-- Find duplicates
SELECT tenant_id, email, COUNT(*) 
FROM users 
GROUP BY tenant_id, email 
HAVING COUNT(*) > 1;
```

**Solutions**:

1. **Remove duplicates**:
```sql
-- Keep first record, delete others
DELETE FROM users a USING users b
WHERE a.id > b.id 
  AND a.tenant_id = b.tenant_id 
  AND a.email = b.email;
```

2. **Update duplicate emails**:
```sql
-- Add suffix to duplicate emails
UPDATE users 
SET email = email || '_' || id::text
WHERE (tenant_id, email) IN (
  SELECT tenant_id, email 
  FROM users 
  GROUP BY tenant_id, email 
  HAVING COUNT(*) > 1
);
```

### Issue: Data Type Mismatches

**Symptoms**:
```
Error: invalid input syntax for type uuid
Error: column "date" is of type date but expression is of type text
```

**Solutions**:

1. **Cast values correctly**:
```javascript
// Bad: String instead of UUID
await User.create({ id: '123', tenant_id: 'techcorp' });

// Good: Proper UUID
await User.create({ 
  id: '550e8400-e29b-41d4-a716-446655440000',
  tenant_id: 'techcorp' 
});
```

2. **Use proper date formats**:
```javascript
// Bad: String date
await Attendance.create({ date: '04/06/2026' });

// Good: Date object or ISO string
await Attendance.create({ date: new Date('2026-04-06') });
await Attendance.create({ date: '2026-04-06' });
```

## Query Errors

### Issue: Syntax Errors

**Symptoms**:
```
Error: syntax error at or near "FROM"
```

**Common Causes**:
1. MongoDB syntax used instead of SQL
2. Missing quotes around strings
3. Incorrect operator usage

**Solutions**:

```javascript
// MongoDB syntax (WRONG)
const users = await User.find({ role: { $in: ['admin', 'manager'] } });

// Sequelize syntax (CORRECT)
const { Op } = require('sequelize');
const users = await User.findAll({
  where: { role: { [Op.in]: ['admin', 'manager'] } }
});

// MongoDB regex (WRONG)
const users = await User.find({ email: { $regex: /john/, $options: 'i' } });

// Sequelize ILIKE (CORRECT)
const users = await User.findAll({
  where: { email: { [Op.iLike]: '%john%' } }
});
```

### Issue: Column Does Not Exist

**Symptoms**:
```
Error: column "firstName" does not exist
```

**Cause**: PostgreSQL uses snake_case, but code uses camelCase

**Solutions**:

1. **Use field mapping in model**:
```javascript
const User = mainAppDb.define('User', {
  firstName: {
    type: DataTypes.STRING,
    field: 'first_name'  // Maps to snake_case column
  }
});
```

2. **Use underscored option**:
```javascript
const User = mainAppDb.define('User', {
  firstName: DataTypes.STRING
}, {
  underscored: true  // Automatically converts to snake_case
});
```

## Migration Issues

### Issue: Migration Fails Midway

**Symptoms**:
- Migration script crashes
- Partial data migrated
- Inconsistent state

**Solutions**:

1. **Check migration logs**:
```bash
cat logs/migration.log | grep ERROR
```

2. **Resume from last successful point**:
```bash
# Get last migrated collection
node scripts/get-migration-status.js

# Resume from specific collection
node scripts/migrate-mongo-to-postgres.js --resume-from=attendances
```

3. **Clean up partial migration**:
```sql
-- Truncate tables to restart
TRUNCATE users, departments, attendances CASCADE;

-- Or drop and recreate
DROP TABLE IF EXISTS users CASCADE;
-- Then recreate tables
```

### Issue: Data Transformation Errors

**Symptoms**:
```
Error: Cannot convert ObjectId to UUID
Error: Invalid date format
```

**Solutions**:

1. **Handle null values**:
```javascript
// Add null checks in transformation
function transformDocument(doc) {
  return {
    id: doc._id ? convertObjectId(doc._id) : uuidv4(),
    hire_date: doc.hireDate || null,
    metadata: doc.metadata || {}
  };
}
```

2. **Handle invalid dates**:
```javascript
function transformDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}
```

## Backup and Restore Issues

### Issue: Backup Fails

**Symptoms**:
```
Error: pg_dump: error: connection to database failed
```

**Solutions**:

1. **Check pg_dump is in PATH**:
```bash
which pg_dump
# If not found, add to PATH
export PATH="/usr/lib/postgresql/14/bin:$PATH"
```

2. **Check permissions**:
```bash
# Ensure backup directory is writable
chmod 755 /backups/postgres
chown postgres:postgres /backups/postgres
```

3. **Check disk space**:
```bash
df -h /backups
```

### Issue: Restore Fails

**Symptoms**:
```
Error: pg_restore: error: could not execute query
```

**Solutions**:

1. **Drop existing database first**:
```bash
dropdb hrsm_platform
createdb hrsm_platform
pg_restore -d hrsm_platform backup.dump
```

2. **Use --clean option**:
```bash
pg_restore --clean -d hrsm_platform backup.dump
```

3. **Ignore errors for non-critical objects**:
```bash
pg_restore --no-owner --no-acl -d hrsm_platform backup.dump
```

## Multi-Tenancy Issues

### Issue: Cross-Tenant Data Leakage

**Symptoms**:
- Users seeing data from other tenants
- Queries returning wrong tenant's data

**Diagnosis**:

```sql
-- Check for missing tenant_id filters
SELECT query 
FROM pg_stat_statements 
WHERE query LIKE '%users%' 
  AND query NOT LIKE '%tenant_id%';
```

**Solutions**:

1. **Always include tenant_id in queries**:
```javascript
// Bad: Missing tenant_id
const users = await User.findAll({ where: { role: 'admin' } });

// Good: Include tenant_id
const users = await User.findAll({
  where: {
    tenant_id: req.tenantId,
    role: 'admin'
  }
});
```

2. **Use default scope**:
```javascript
// Add default scope to model
const User = mainAppDb.define('User', {
  // fields
}, {
  defaultScope: {
    where: {
      tenant_id: null  // Will be overridden at runtime
    }
  }
});
```

3. **Add middleware validation**:
```javascript
// Validate tenant_id in all queries
mainAppDb.addHook('beforeFind', (options) => {
  if (!options.where || !options.where.tenant_id) {
    throw new Error('tenant_id is required');
  }
});
```

### Issue: Tenant Isolation Not Working

**Symptoms**:
- Queries slow due to scanning all tenants
- Indexes not being used

**Solutions**:

1. **Verify indexes include tenant_id**:
```sql
-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users';

-- Add composite index if missing
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
```

2. **Use EXPLAIN to verify index usage**:
```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE tenant_id = 'techcorp' AND email = 'john@example.com';
-- Should show "Index Scan" not "Seq Scan"
```

## License Validation Issues

### Issue: License Validation Fails

**Symptoms**:
- Users unable to access application
- "License invalid" errors
- Module access denied

**Diagnosis**:

```sql
-- Check license status
SELECT * FROM licenses WHERE tenant_id = 'techcorp';

-- Check license expiration
SELECT tenant_id, expires_at, 
       CASE 
         WHEN expires_at < NOW() THEN 'EXPIRED'
         ELSE 'VALID'
       END AS status
FROM licenses;
```

**Solutions**:

1. **Verify license server connection**:
```bash
# Test connection to license server database
psql -h license-server-host -U username -d hrsm-licenses -c "SELECT COUNT(*) FROM licenses;"
```

2. **Check cache synchronization**:
```sql
-- Check last sync time
SELECT tenant_id, last_synced_at,
       NOW() - last_synced_at AS time_since_sync
FROM company_licenses;

-- Refresh cache if stale
UPDATE company_licenses 
SET last_synced_at = NOW() - INTERVAL '25 hours'
WHERE tenant_id = 'techcorp';
```

3. **Manually sync license**:
```javascript
// Force license sync
const licenseService = require('./services/license.service');
await licenseService.syncLicenseFromServer('techcorp');
```

## Monitoring and Diagnostics

### Health Check Queries

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('hrsm_platform'));

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Cache hit ratio (should be > 0.99)
SELECT 
  sum(heap_blks_read) AS heap_read,
  sum(heap_blks_hit) AS heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS ratio
FROM pg_statio_user_tables;

-- Active connections
SELECT 
  datname,
  usename,
  application_name,
  client_addr,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle';

-- Long-running queries
SELECT 
  pid,
  now() - query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > INTERVAL '1 minute'
ORDER BY duration DESC;

-- Locks
SELECT 
  locktype,
  database,
  relation::regclass,
  mode,
  granted
FROM pg_locks
WHERE NOT granted;
```

### Performance Monitoring

```bash
# Install pg_stat_statements
psql -U postgres -d hrsm_platform -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# View slow queries
psql -U postgres -d hrsm_platform -c "
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

### Log Analysis

```bash
# View recent errors
sudo tail -100 /var/log/postgresql/postgresql-14-main.log | grep ERROR

# View slow queries
sudo tail -100 /var/log/postgresql/postgresql-14-main.log | grep "duration:"

# Count errors by type
sudo grep ERROR /var/log/postgresql/postgresql-14-main.log | cut -d: -f4 | sort | uniq -c | sort -rn
```

## Getting Help

### Information to Collect

When reporting issues, collect:

1. **Error message** (full text)
2. **PostgreSQL version**: `psql --version`
3. **Application logs**: Last 100 lines
4. **Database logs**: Last 100 lines
5. **Query that failed**: Full SQL or Sequelize code
6. **EXPLAIN output**: `EXPLAIN ANALYZE <query>`
7. **System resources**: CPU, memory, disk usage
8. **Connection pool status**: Size, available, using

### Useful Commands

```bash
# PostgreSQL version
psql --version

# Database size
psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('hrsm_platform'));"

# Connection count
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check if database is accepting connections
pg_isready -h localhost -p 5432

# View configuration
psql -U postgres -c "SHOW ALL;"

# View current queries
psql -U postgres -c "SELECT pid, query FROM pg_stat_activity WHERE state = 'active';"
```

## Related Documentation

- [Database Schema Documentation](./DATABASE_SCHEMA_POSTGRESQL.md)
- [Sequelize Models Reference](./SEQUELIZE_MODELS_REFERENCE.md)
- [Migration Runbook](../MIGRATION_RUNBOOK.md)
- [PostgreSQL Configuration Guide](../POSTGRESQL_CONFIGURATION_GUIDE.md)
- [Backup and Restore Guide](../POSTGRES_BACKUP_RESTORE_GUIDE.md)

---

**Last Updated**: April 6, 2026  
**Version**: 1.0  
**Status**: Production Ready
