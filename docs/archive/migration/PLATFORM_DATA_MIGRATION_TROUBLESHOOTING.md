# Platform Data Migration Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered during and after the platform data migration. It includes diagnostic steps, error message references, and recovery procedures.

---

## Table of Contents

1. [Migration Issues](#migration-issues)
2. [API Connection Issues](#api-connection-issues)
3. [Authentication and Authorization Issues](#authentication-and-authorization-issues)
4. [Cache Issues](#cache-issues)
5. [Performance Issues](#performance-issues)
6. [Data Integrity Issues](#data-integrity-issues)
7. [Error Message Reference](#error-message-reference)
8. [Recovery Procedures](#recovery-procedures)
9. [Diagnostic Tools](#diagnostic-tools)

---

## Migration Issues

### Issue: Migration Script Fails to Start

**Symptoms:**
- Script exits immediately
- "Cannot connect to database" error
- No log file created

**Diagnostic Steps:**

1. Check database connectivity:
```bash
# Test License Server database
mongosh hrsm-licenses --eval "db.runCommand({ping: 1})"

# Test Main Backend database
mongosh hrsm_platform --eval "db.runCommand({ping: 1})"
```

2. Verify environment variables:
```bash
# Check License Server config
cat hrsm-license-server/.env | grep MONGODB_URI

# Check Main Backend config
cat server/.env | grep MONGODB_URI
```

3. Check MongoDB service status:
```bash
# Windows
sc query MongoDB

# Linux/Mac
systemctl status mongod
```

**Solutions:**

**Solution 1: Start MongoDB service**
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

**Solution 2: Fix connection string**
```bash
# Update .env file with correct MongoDB URI
MONGODB_URI=mongodb://localhost:27017/hrsm-licenses
```

**Solution 3: Check firewall rules**
```bash
# Ensure MongoDB port (27017) is accessible
telnet localhost 27017
```

---

### Issue: Migration Hangs During Execution

**Symptoms:**
- Progress bar stops moving
- No log updates for extended period
- High CPU or memory usage

**Diagnostic Steps:**

1. Check migration logs:
```bash
tail -f logs/migrations/migration-[timestamp].log
```

2. Monitor database operations:
```bash
mongosh hrsm_platform
db.currentOp()
```

3. Check system resources:
```bash
# Windows
tasklist /FI "IMAGENAME eq node.exe"

# Linux/Mac
top -p $(pgrep node)
```

**Solutions:**

**Solution 1: Increase timeout**
```javascript
// Edit server/scripts/migrations/config/migrationConfig.js
module.exports = {
  connectionTimeout: 30000, // Increase from 10000 to 30000
  operationTimeout: 60000   // Add operation timeout
};
```

**Solution 2: Reduce batch size**
```javascript
// Edit migration config
module.exports = {
  batchSize: 50 // Reduce from 100 to 50
};
```

**Solution 3: Kill and restart**
```bash
# Find process ID
ps aux | grep migration

# Kill process
kill -9 [PID]

# Restart migration
node server/scripts/migrations/cli/migrationCli.js --execute
```

---

### Issue: Validation Errors During Migration

**Symptoms:**
- "Required field missing" errors
- "Invalid data type" errors
- Migration halts during validation phase

**Diagnostic Steps:**

1. Identify problematic records:
```bash
node server/scripts/migrations/cli/migrationCli.js --find-invalid-records
```

2. Check validation report:
```bash
cat logs/migrations/validation-errors-[timestamp].json
```

3. Query problematic records:
```bash
mongosh hrsm_platform
db.tenants.find({ name: { $exists: false } })
```

**Solutions:**

**Solution 1: Fix missing required fields**
```bash
mongosh hrsm_platform

# Add default values for missing fields
db.tenants.updateMany(
  { name: { $exists: false } },
  { $set: { name: "Unknown Company" } }
)

db.tenants.updateMany(
  { domain: { $exists: false } },
  { $set: { domain: "unknown.com" } }
)
```

**Solution 2: Fix data type mismatches**
```bash
mongosh hrsm_platform

# Convert string dates to Date objects
db.tenants.find({ createdAt: { $type: "string" } }).forEach(function(doc) {
  db.tenants.updateOne(
    { _id: doc._id },
    { $set: { createdAt: new Date(doc.createdAt) } }
  );
});
```

**Solution 3: Remove invalid records**
```bash
# Only if records are truly invalid and can be recreated
mongosh hrsm_platform
db.tenants.deleteMany({ tenantId: { $exists: false } })
```

---

### Issue: Rollback Fails

**Symptoms:**
- Rollback script errors
- Data not restored
- "Backup not found" error

**Diagnostic Steps:**

1. Check backup existence:
```bash
ls -lh ./backups/pre-migration-*
```

2. Verify backup integrity:
```bash
mongorestore --dry-run --db=hrsm_platform ./backups/pre-migration-[timestamp]/hrsm_platform
```

3. Check rollback logs:
```bash
cat logs/migrations/rollback-[timestamp].log
```

**Solutions:**

**Solution 1: Manual database restore**
```bash
# Stop services
npm stop

# Restore from backup
mongorestore --drop --db=hrsm_platform ./backups/pre-migration-[timestamp]/hrsm_platform
mongorestore --drop --db=hrsm-licenses ./backups/pre-migration-licenses-[timestamp]/hrsm-licenses

# Restart services
npm start
```

**Solution 2: Use earlier backup**
```bash
# List available backups
ls -lt ./backups/

# Restore from earlier backup
mongorestore --db=hrsm_platform ./backups/[earlier-timestamp]/hrsm_platform
```

**Solution 3: Point-in-time recovery**
```bash
# If using MongoDB Atlas or replica sets
# Contact DBA for point-in-time recovery
```

---

## API Connection Issues

### Issue: License Server API Unreachable

**Symptoms:**
- "ECONNREFUSED" errors
- "License Server unavailable" warnings
- Main Backend using stale cache

**Diagnostic Steps:**

1. Check License Server status:
```bash
curl http://localhost:4000/health
```

2. Verify License Server is running:
```bash
# Windows
tasklist | findstr node

# Linux/Mac
ps aux | grep "license-server"
```

3. Check network connectivity:
```bash
telnet localhost 4000
```

**Solutions:**

**Solution 1: Start License Server**
```bash
cd hrsm-license-server
npm start
```

**Solution 2: Check port conflicts**
```bash
# Windows
netstat -ano | findstr :4000

# Linux/Mac
lsof -i :4000

# If port is in use, kill the process or change port
```

**Solution 3: Verify firewall rules**
```bash
# Windows
netsh advfirewall firewall show rule name=all | findstr 4000

# Linux
sudo ufw status
sudo ufw allow 4000
```

---

### Issue: API Requests Timeout

**Symptoms:**
- "ETIMEDOUT" errors
- Slow API responses
- Requests take longer than 5 seconds

**Diagnostic Steps:**

1. Check API response time:
```bash
time curl -H "X-API-Key: YOUR_KEY" http://localhost:4000/api/tenants/techcorp_solutions
```

2. Monitor database performance:
```bash
mongosh hrsm-licenses
db.currentOp({ "active": true, "secs_running": { "$gt": 1 } })
```

3. Check server load:
```bash
# Windows
wmic cpu get loadpercentage

# Linux/Mac
uptime
```

**Solutions:**

**Solution 1: Increase timeout**
```javascript
// In server/services/licenseServerClient.js
this.httpClient = axios.create({
  baseURL: baseUrl,
  headers: { 'X-API-Key': apiKey },
  timeout: 10000 // Increase from 5000 to 10000
});
```

**Solution 2: Add database indexes**
```bash
mongosh hrsm-licenses

# Create missing indexes
db.tenants.createIndex({ tenantId: 1 }, { unique: true })
db.tenants.createIndex({ "subscription.status": 1 })
db.enabled_modules.createIndex({ tenantId: 1, moduleId: 1 })
```

**Solution 3: Optimize queries**
```javascript
// Use projection to limit returned fields
db.tenants.find(
  { tenantId: 'techcorp_solutions' },
  { name: 1, enabledModules: 1, subscription: 1 }
)
```

---

## Authentication and Authorization Issues

### Issue: API Key Authentication Fails

**Symptoms:**
- 401 "Invalid API key" errors
- "Authentication failed" messages
- All API requests rejected

**Diagnostic Steps:**

1. Verify API key in environment:
```bash
cat server/.env | grep LICENSE_SERVER_API_KEY
```

2. Check API key format:
```bash
# API keys should be 32+ characters
echo $LICENSE_SERVER_API_KEY | wc -c
```

3. Test API key manually:
```bash
curl -H "X-API-Key: YOUR_KEY" http://localhost:4000/api/tenants
```

**Solutions:**

**Solution 1: Regenerate API key**
```bash
cd hrsm-license-server
node src/scripts/generateApiKey.js --name "Main Backend" --permissions "tenants:read,tenants:write"

# Copy the generated key to server/.env
LICENSE_SERVER_API_KEY=newly-generated-key
```

**Solution 2: Verify key in License Server**
```bash
mongosh hrsm-licenses
db.api_keys.find({ name: "Main Backend" })

# Check if key exists and is active
```

**Solution 3: Check header format**
```javascript
// Ensure header name is correct (case-sensitive)
headers: {
  'X-API-Key': apiKey  // Not 'X-Api-Key' or 'x-api-key'
}
```

---

### Issue: Insufficient Permissions

**Symptoms:**
- 403 "Insufficient permissions" errors
- Some operations work, others fail
- "Permission denied" messages

**Diagnostic Steps:**

1. Check API key permissions:
```bash
mongosh hrsm-licenses
db.api_keys.findOne({ name: "Main Backend" })
```

2. Review required permissions:
```bash
# Check logs for required permission
cat logs/migrations/migration-[timestamp].log | grep "requiredPermission"
```

**Solutions:**

**Solution 1: Update API key permissions**
```bash
mongosh hrsm-licenses

db.api_keys.updateOne(
  { name: "Main Backend" },
  { 
    $set: { 
      permissions: [
        "tenants:read",
        "tenants:write",
        "modules:read",
        "modules:write",
        "licenses:validate"
      ]
    }
  }
)
```

**Solution 2: Create new API key with correct permissions**
```bash
node hrsm-license-server/src/scripts/generateApiKey.js \
  --name "Main Backend Full Access" \
  --permissions "tenants:read,tenants:write,tenants:delete,modules:read,modules:write,licenses:validate"
```

---

## Cache Issues

### Issue: Cache Not Refreshing

**Symptoms:**
- Stale data in application
- "Using stale cache" warnings in logs
- Module changes not reflected

**Diagnostic Steps:**

1. Check cache timestamps:
```bash
mongosh hrsm_platform
db.company_license.find({}, { 
  companyId: 1, 
  "quickAccess.lastSyncedAt": 1 
}).limit(5)
```

2. Verify background job is running:
```bash
# Check logs for cache refresh job
cat logs/migrations/cache-refresh-[timestamp].log
```

3. Test manual refresh:
```bash
node server/scripts/migrations/cli/migrationCli.js --refresh-cache
```

**Solutions:**

**Solution 1: Manually invalidate cache**
```bash
mongosh hrsm_platform

# Force cache refresh by setting old timestamp
db.company_license.updateMany(
  {},
  { $set: { "quickAccess.lastSyncedAt": new Date(0) } }
)
```

**Solution 2: Restart background job**
```bash
# Restart Main Backend to restart cache refresh job
cd server
npm restart
```

**Solution 3: Clear and rebuild cache**
```bash
mongosh hrsm_platform

# Clear all cache
db.company_license.deleteMany({})

# Trigger rebuild
node server/scripts/migrations/cli/migrationCli.js --refresh-cache
```

---

### Issue: Cache Hit Rate Too Low

**Symptoms:**
- High number of API calls to License Server
- Slow application performance
- Cache miss rate > 20%

**Diagnostic Steps:**

1. Check cache statistics:
```bash
# Add to monitoring dashboard
db.company_license.aggregate([
  {
    $project: {
      companyId: 1,
      cacheAge: {
        $subtract: [new Date(), "$quickAccess.lastSyncedAt"]
      }
    }
  },
  {
    $group: {
      _id: null,
      avgAge: { $avg: "$cacheAge" },
      maxAge: { $max: "$cacheAge" }
    }
  }
])
```

2. Monitor API call frequency:
```bash
cat logs/migrations/api-calls-[timestamp].log | grep "GET /api/tenants" | wc -l
```

**Solutions:**

**Solution 1: Increase cache TTL**
```javascript
// In server/services/licenseCache.js
const CACHE_TTL = 12 * 60 * 60 * 1000; // Increase from 6 to 12 hours
```

**Solution 2: Implement cache warming**
```javascript
// Warm cache on application startup
async function warmCache() {
  const tenants = await getAllTenantIds();
  for (const tenantId of tenants) {
    await updateLicenseCache(tenantId);
  }
}
```

**Solution 3: Add application-level cache**
```javascript
// Use in-memory cache (e.g., node-cache) for frequently accessed data
const NodeCache = require('node-cache');
const memoryCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
```

---

## Performance Issues

### Issue: Slow API Response Times

**Symptoms:**
- API responses take > 500ms
- Application feels sluggish
- Timeout errors

**Diagnostic Steps:**

1. Measure API response time:
```bash
# Test multiple endpoints
for i in {1..10}; do
  time curl -H "X-API-Key: YOUR_KEY" http://localhost:4000/api/tenants/techcorp_solutions
done
```

2. Check database query performance:
```bash
mongosh hrsm-licenses

# Enable profiling
db.setProfilingLevel(2)

# Check slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(5)
```

3. Monitor server resources:
```bash
# Check CPU and memory
top -p $(pgrep node)
```

**Solutions:**

**Solution 1: Add missing indexes**
```bash
mongosh hrsm-licenses

# Check existing indexes
db.tenants.getIndexes()

# Add missing indexes
db.tenants.createIndex({ tenantId: 1 }, { unique: true })
db.tenants.createIndex({ domain: 1 })
db.tenants.createIndex({ "subscription.status": 1 })
db.enabled_modules.createIndex({ tenantId: 1, moduleId: 1 }, { unique: true })
```

**Solution 2: Optimize queries**
```javascript
// Use projection to limit returned fields
const tenant = await db.collection('tenants').findOne(
  { tenantId: 'techcorp_solutions' },
  { 
    projection: { 
      name: 1, 
      enabledModules: 1, 
      subscription: 1 
    } 
  }
);
```

**Solution 3: Enable response compression**
```javascript
// In hrsm-license-server/src/app.js
const compression = require('compression');
app.use(compression());
```

**Solution 4: Increase server resources**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

---

### Issue: High Database CPU Usage

**Symptoms:**
- MongoDB CPU usage > 80%
- Slow query responses
- Application timeouts

**Diagnostic Steps:**

1. Check current operations:
```bash
mongosh hrsm-licenses
db.currentOp({ "active": true })
```

2. Identify slow queries:
```bash
db.system.profile.find({ millis: { $gt: 100 } }).sort({ millis: -1 }).limit(10)
```

3. Check index usage:
```bash
db.tenants.aggregate([
  { $indexStats: {} }
])
```

**Solutions:**

**Solution 1: Kill long-running operations**
```bash
mongosh hrsm-licenses

# Find long-running ops
db.currentOp({ "active": true, "secs_running": { "$gt": 5 } })

# Kill operation
db.killOp([opid])
```

**Solution 2: Add compound indexes**
```bash
# For queries that filter on multiple fields
db.tenants.createIndex({ 
  "subscription.status": 1, 
  status: 1 
})
```

**Solution 3: Optimize aggregation pipelines**
```javascript
// Use $match early in pipeline
db.tenants.aggregate([
  { $match: { status: "active" } }, // Filter first
  { $lookup: { ... } },              // Then join
  { $project: { ... } }              // Then project
])
```

---

## Data Integrity Issues

### Issue: Missing Tenant Records

**Symptoms:**
- Tenant exists in source but not in destination
- "Tenant not found" errors after migration
- Record count mismatch

**Diagnostic Steps:**

1. Compare record counts:
```bash
# Source database
mongosh hrsm_platform --eval "db.tenants.countDocuments()"

# Destination database
mongosh hrsm-licenses --eval "db.tenants.countDocuments()"
```

2. Find missing tenants:
```bash
node server/scripts/migrations/cli/migrationCli.js --find-missing-records
```

3. Check migration logs:
```bash
cat logs/migrations/migration-[timestamp].log | grep "ERROR"
```

**Solutions:**

**Solution 1: Re-run migration for missing tenants**
```bash
node server/scripts/migrations/cli/migrationCli.js --migrate-missing
```

**Solution 2: Manually migrate specific tenant**
```bash
mongosh hrsm_platform
const tenant = db.tenants.findOne({ tenantId: "missing_tenant" })

mongosh hrsm-licenses
db.tenants.insertOne(tenant)
```

**Solution 3: Full re-migration**
```bash
# Only if data loss is significant
node server/scripts/migrations/cli/migrationCli.js --rollback
node server/scripts/migrations/cli/migrationCli.js --execute
```

---

### Issue: Data Field Mismatch

**Symptoms:**
- Fields missing in destination
- Data type differences
- Null values where data expected

**Diagnostic Steps:**

1. Compare specific records:
```bash
# Source
mongosh hrsm_platform
db.tenants.findOne({ tenantId: "techcorp_solutions" })

# Destination
mongosh hrsm-licenses
db.tenants.findOne({ tenantId: "techcorp_solutions" })
```

2. Run field verification:
```bash
node server/scripts/migrations/cli/migrationCli.js --verify-fields
```

**Solutions:**

**Solution 1: Update missing fields**
```bash
mongosh hrsm-licenses

# Copy missing field from source
db.tenants.updateOne(
  { tenantId: "techcorp_solutions" },
  { $set: { missingField: "value" } }
)
```

**Solution 2: Re-migrate specific tenant**
```bash
node server/scripts/migrations/cli/migrationCli.js \
  --re-migrate-tenant techcorp_solutions
```

---

## Error Message Reference

### Migration Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| `MIG001` | Connection timeout | Database unreachable | Check MongoDB service, verify connection string |
| `MIG002` | Validation failed | Invalid data in source | Fix data validation errors, see logs |
| `MIG003` | Duplicate key error | Tenant already exists | Check for duplicate tenantIds, clean destination |
| `MIG004` | Insufficient disk space | Not enough storage | Free up disk space, increase storage |
| `MIG005` | Backup creation failed | Cannot create backup | Check write permissions, verify disk space |
| `MIG006` | Rollback failed | Cannot restore data | Use manual restore procedure |

### API Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| `API001` | Authentication failed | Invalid API key | Regenerate API key, update .env |
| `API002` | Insufficient permissions | Missing permissions | Update API key permissions |
| `API003` | Tenant not found | Invalid tenantId | Verify tenant exists, check spelling |
| `API004` | Rate limit exceeded | Too many requests | Wait and retry, increase rate limit |
| `API005` | Service unavailable | License Server down | Start License Server, check health |
| `API006` | Validation error | Invalid request data | Fix request payload, check API docs |

### Cache Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| `CACHE001` | Cache miss | No cached data | Trigger cache refresh |
| `CACHE002` | Stale cache | Cache expired | Invalidate and refresh cache |
| `CACHE003` | Cache update failed | Cannot write to cache | Check database permissions |
| `CACHE004` | Cache corruption | Invalid cache data | Clear and rebuild cache |

---

## Recovery Procedures

### Emergency Rollback

**When to use:** Critical data loss or corruption detected

**Steps:**

1. **Stop all services immediately**
```bash
# Stop License Server
cd hrsm-license-server
npm stop

# Stop Main Backend
cd ../server
npm stop
```

2. **Restore databases from backup**
```bash
# Restore License Server database
mongorestore --drop --db=hrsm-licenses \
  ./backups/pre-migration-licenses-[timestamp]/hrsm-licenses

# Restore Main Backend database
mongorestore --drop --db=hrsm_platform \
  ./backups/pre-migration-[timestamp]/hrsm_platform
```

3. **Revert code changes**
```bash
# Re-enable backward compatibility
# In server/.env
ENABLE_BACKWARD_COMPATIBILITY=true
```

4. **Restart services**
```bash
# Start License Server
cd hrsm-license-server
npm start

# Start Main Backend
cd ../server
npm start
```

5. **Verify functionality**
```bash
# Test health endpoints
curl http://localhost:4000/health
curl http://localhost:5000/health

# Test application login
# Verify critical features work
```

6. **Document incident**
- Record what went wrong
- Document recovery steps taken
- Plan remediation

---

### Cache Rebuild

**When to use:** Cache corruption or inconsistency

**Steps:**

1. **Clear existing cache**
```bash
mongosh hrsm_platform
db.company_license.deleteMany({})
```

2. **Trigger full refresh**
```bash
node server/scripts/migrations/cli/migrationCli.js --refresh-cache
```

3. **Verify cache population**
```bash
mongosh hrsm_platform
db.company_license.countDocuments()
# Should match tenant count
```

4. **Test cache functionality**
```bash
# Login to application
# Verify module access works
# Check subscription status displays
```

---

### Database Repair

**When to use:** Database corruption detected

**Steps:**

1. **Stop services**
```bash
npm stop
```

2. **Run MongoDB repair**
```bash
mongod --repair --dbpath /path/to/data
```

3. **Verify database integrity**
```bash
mongosh hrsm-licenses
db.runCommand({ validate: "tenants", full: true })
```

4. **Rebuild indexes**
```bash
db.tenants.reIndex()
db.subscriptions.reIndex()
db.enabled_modules.reIndex()
```

5. **Restart services**
```bash
npm start
```

---

## Diagnostic Tools

### Migration CLI Diagnostic Commands

```bash
# Check database connections
node server/scripts/migrations/cli/migrationCli.js --check-connections

# Validate source data
node server/scripts/migrations/cli/migrationCli.js --validate-source

# Find invalid records
node server/scripts/migrations/cli/migrationCli.js --find-invalid-records

# Find missing records
node server/scripts/migrations/cli/migrationCli.js --find-missing-records

# Verify field preservation
node server/scripts/migrations/cli/migrationCli.js --verify-fields

# Check data loss
node server/scripts/migrations/cli/migrationCli.js --check-data-loss

# Test cache performance
node server/scripts/migrations/cli/migrationCli.js --test-cache-performance

# Verify API keys
node server/scripts/migrations/cli/migrationCli.js --verify-api-keys
```

### MongoDB Diagnostic Queries

```javascript
// Check database size
db.stats()

// Check collection sizes
db.tenants.stats()

// Find slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })

// Check index usage
db.tenants.aggregate([{ $indexStats: {} }])

// Find duplicate tenantIds
db.tenants.aggregate([
  { $group: { _id: "$tenantId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])

// Check cache freshness
db.company_license.aggregate([
  {
    $project: {
      companyId: 1,
      cacheAge: {
        $subtract: [new Date(), "$quickAccess.lastSyncedAt"]
      }
    }
  },
  {
    $match: {
      cacheAge: { $gt: 21600000 } // > 6 hours
    }
  }
])
```

### Log Analysis

```bash
# Find errors in migration logs
cat logs/migrations/migration-*.log | grep "ERROR"

# Count API calls
cat logs/migrations/api-calls-*.log | grep "GET /api/tenants" | wc -l

# Find slow operations
cat logs/migrations/migration-*.log | grep "took.*ms" | sort -t: -k2 -n

# Check cache hit rate
cat logs/migrations/cache-*.log | grep "cache hit" | wc -l
cat logs/migrations/cache-*.log | grep "cache miss" | wc -l
```

---

## Getting Help

### Support Channels

**Internal Support:**
- Slack: #platform-migration
- Email: platform-team@company.com
- Wiki: https://wiki.company.com/platform-migration

**Emergency Contact:**
- On-call Engineer: [Phone Number]
- Database Administrator: [Phone Number]
- Technical Lead: [Phone Number]

### Escalation Path

1. **Level 1:** Team member attempts resolution using this guide
2. **Level 2:** Escalate to senior engineer if unresolved after 30 minutes
3. **Level 3:** Escalate to technical lead if unresolved after 1 hour
4. **Level 4:** Escalate to CTO if critical system impact

### Information to Provide

When requesting help, include:

1. **Error description**
   - What were you trying to do?
   - What happened instead?
   - Error messages (exact text)

2. **Environment details**
   - Operating system
   - Node.js version
   - MongoDB version
   - Application version

3. **Diagnostic information**
   - Relevant log files
   - Database query results
   - System resource usage

4. **Steps to reproduce**
   - Exact commands run
   - Configuration used
   - Data samples (sanitized)

5. **Impact assessment**
   - How many users affected?
   - Which features broken?
   - Business impact level

---

## Preventive Measures

### Regular Maintenance

**Daily:**
- Monitor error logs
- Check cache hit rates
- Verify API response times

**Weekly:**
- Review slow queries
- Check database size growth
- Verify backup integrity

**Monthly:**
- Optimize database indexes
- Review and update documentation
- Conduct disaster recovery drill

### Monitoring Alerts

Set up alerts for:
- API error rate > 5%
- API response time > 500ms
- Cache hit rate < 80%
- Database CPU > 80%
- Disk space < 20% free

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-27  
**Next Review:** After first production issue
