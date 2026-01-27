# Platform Data Migration Runbook

## Overview

This runbook provides step-by-step instructions for migrating platform metadata (tenant information, subscriptions, and module configurations) from the main application database (`hrsm_platform`) to the license server database (`hrsm-licenses`).

**Migration Goal:** Establish proper separation of concerns between platform control (license server) and business data (main application).

**Estimated Duration:** 2-4 hours (depending on data volume)

**Risk Level:** Medium (rollback available)

---

## Pre-Migration Checklist

### 1. Environment Verification

- [ ] **Verify License Server is running**
  ```bash
  curl http://localhost:4000/health
  # Expected: {"status": "healthy"}
  ```

- [ ] **Verify Main Backend is running**
  ```bash
  curl http://localhost:5000/health
  # Expected: {"status": "healthy"}
  ```

- [ ] **Check database connectivity**
  ```bash
  node server/scripts/migrations/cli/migrationCli.js --check-connections
  ```

### 2. Data Validation

- [ ] **Count tenant records in source database**
  ```bash
  mongosh hrsm_platform --eval "db.tenants.countDocuments()"
  ```

- [ ] **Verify data integrity**
  ```bash
  node server/scripts/migrations/cli/migrationCli.js --validate-source
  ```

- [ ] **Check for required fields**
  - All tenants have `tenantId`
  - All tenants have `name`
  - All tenants have `domain`

### 3. Backup Preparation

- [ ] **Create backup of hrsm_platform database**
  ```bash
  mongodump --db=hrsm_platform --out=./backups/pre-migration-$(date +%Y%m%d-%H%M%S)
  ```

- [ ] **Create backup of hrsm-licenses database**
  ```bash
  mongodump --db=hrsm-licenses --out=./backups/pre-migration-licenses-$(date +%Y%m%d-%H%M%S)
  ```

- [ ] **Verify backup integrity**
  ```bash
  ls -lh ./backups/
  # Ensure backup files exist and have reasonable size
  ```

### 4. System Resources

- [ ] **Check disk space (minimum 10GB free)**
  ```bash
  df -h
  ```

- [ ] **Check memory availability (minimum 2GB free)**
  ```bash
  free -h
  ```

- [ ] **Verify no other migrations are running**
  ```bash
  ps aux | grep migration
  ```

### 5. Communication

- [ ] **Notify stakeholders of migration window**
- [ ] **Schedule maintenance window (recommended: off-peak hours)**
- [ ] **Prepare rollback communication plan**

### 6. Configuration

- [ ] **Verify environment variables**
  ```bash
  # License Server
  cat hrsm-license-server/.env | grep -E "MONGODB_URI|PORT"
  
  # Main Backend
  cat server/.env | grep -E "MONGODB_URI|LICENSE_SERVER_URL|LICENSE_SERVER_API_KEY"
  ```

- [ ] **Verify API keys are configured**
  ```bash
  node server/scripts/migrations/cli/migrationCli.js --verify-api-keys
  ```

---

## Migration Execution Steps

### Phase 1: Dry Run (30 minutes)

**Purpose:** Validate migration process without making changes

1. **Run dry-run migration**
   ```bash
   node server/scripts/migrations/cli/migrationCli.js --dry-run
   ```

2. **Review dry-run report**
   - Check `logs/migrations/dry-run-report-[timestamp].json`
   - Verify tenant count matches expectations
   - Review any warnings or validation errors

3. **Address any issues found**
   - Fix data validation errors
   - Resolve missing required fields
   - Correct data type mismatches

### Phase 2: Execute Migration (1-2 hours)

**Purpose:** Perform actual data migration

1. **Enable backward compatibility mode**
   ```bash
   # In server/.env
   ENABLE_BACKWARD_COMPATIBILITY=true
   ```

2. **Restart services with compatibility mode**
   ```bash
   # Restart License Server
   cd hrsm-license-server
   npm restart
   
   # Restart Main Backend
   cd ../server
   npm restart
   ```

3. **Execute migration**
   ```bash
   node server/scripts/migrations/cli/migrationCli.js --execute
   ```

4. **Monitor migration progress**
   - Watch console output for progress updates
   - Monitor log file: `logs/migrations/migration-[timestamp].log`
   - Check for errors in real-time

5. **Wait for completion**
   - Migration will display progress bar
   - Do not interrupt the process
   - Expected duration: 1-2 hours for large datasets

### Phase 3: Verification (30 minutes)

**Purpose:** Confirm migration success

1. **Run post-migration verification**
   ```bash
   node server/scripts/migrations/cli/migrationCli.js --verify
   ```

2. **Check verification report**
   - Review `logs/migrations/verification-report-[timestamp].json`
   - Verify all tenants migrated successfully
   - Confirm record counts match

3. **Manual spot checks**
   ```bash
   # Check a few tenants in License Server database
   mongosh hrsm-licenses --eval "db.tenants.find().limit(5).pretty()"
   
   # Verify enabled modules
   mongosh hrsm-licenses --eval "db.tenants.findOne({tenantId: 'techcorp_solutions'})"
   ```

4. **Test API endpoints**
   ```bash
   # Get tenant via API
   curl -H "X-API-Key: YOUR_API_KEY" http://localhost:4000/api/tenants/techcorp_solutions
   
   # Get enabled modules
   curl -H "X-API-Key: YOUR_API_KEY" http://localhost:4000/api/tenants/techcorp_solutions/modules
   ```

5. **Test main backend integration**
   ```bash
   # Test license validation
   curl -X POST http://localhost:5000/api/auth/validate-license \
     -H "Content-Type: application/json" \
     -d '{"tenantId": "techcorp_solutions"}'
   ```

### Phase 4: Cache Initialization (15 minutes)

**Purpose:** Populate license cache in main backend

1. **Trigger cache refresh for all tenants**
   ```bash
   node server/scripts/migrations/cli/migrationCli.js --refresh-cache
   ```

2. **Verify cache population**
   ```bash
   mongosh hrsm_platform --eval "db.company_license.countDocuments()"
   # Should match tenant count
   ```

3. **Check cache timestamps**
   ```bash
   mongosh hrsm_platform --eval "db.company_license.find({}, {'quickAccess.lastSyncedAt': 1}).limit(5)"
   # All should have recent timestamps
   ```

### Phase 5: Disable Backward Compatibility (15 minutes)

**Purpose:** Switch to license server as single source of truth

1. **Disable backward compatibility mode**
   ```bash
   # In server/.env
   ENABLE_BACKWARD_COMPATIBILITY=false
   ```

2. **Restart services**
   ```bash
   # Restart License Server
   cd hrsm-license-server
   npm restart
   
   # Restart Main Backend
   cd ../server
   npm restart
   ```

3. **Verify services are using license server**
   - Check logs for "Using License Server API" messages
   - Verify no "Using local database" warnings

4. **Test end-to-end functionality**
   - Login to application
   - Access different modules
   - Verify module access control works
   - Check subscription status displays correctly

---

## Post-Migration Verification Steps

### Functional Testing

1. **Test tenant operations**
   - [ ] Create new tenant via API
   - [ ] Update tenant information
   - [ ] Query tenant details
   - [ ] List all tenants

2. **Test module management**
   - [ ] Enable module for tenant
   - [ ] Disable module for tenant
   - [ ] Query enabled modules
   - [ ] Verify module access control

3. **Test license validation**
   - [ ] Validate active license
   - [ ] Validate expired license
   - [ ] Validate suspended tenant
   - [ ] Check cache behavior

4. **Test main backend integration**
   - [ ] User login with valid tenant
   - [ ] Access enabled modules
   - [ ] Verify disabled modules are blocked
   - [ ] Check subscription status

### Performance Testing

1. **Measure API response times**
   ```bash
   # Should be < 200ms
   time curl -H "X-API-Key: YOUR_API_KEY" http://localhost:4000/api/tenants/techcorp_solutions
   ```

2. **Test cache performance**
   ```bash
   # Should be < 50ms
   node server/scripts/migrations/cli/migrationCli.js --test-cache-performance
   ```

3. **Monitor database query performance**
   - Check MongoDB slow query log
   - Verify indexes are being used

### Data Integrity Checks

1. **Compare record counts**
   ```bash
   # Source (should be same as before migration)
   mongosh hrsm_platform --eval "db.tenants.countDocuments()"
   
   # Destination (should match source)
   mongosh hrsm-licenses --eval "db.tenants.countDocuments()"
   ```

2. **Verify field preservation**
   ```bash
   node server/scripts/migrations/cli/migrationCli.js --verify-fields
   ```

3. **Check for data loss**
   ```bash
   node server/scripts/migrations/cli/migrationCli.js --check-data-loss
   ```

---

## Rollback Procedures

### When to Rollback

Rollback if any of the following occur:
- Migration verification fails
- Critical data is missing or corrupted
- Application functionality is broken
- Performance degradation is severe
- Stakeholder decision to abort

### Rollback Steps

1. **Initiate rollback**
   ```bash
   node server/scripts/migrations/cli/migrationCli.js --rollback
   ```

2. **Restore database backups (if needed)**
   ```bash
   # Restore hrsm_platform
   mongorestore --db=hrsm_platform ./backups/pre-migration-[timestamp]/hrsm_platform
   
   # Restore hrsm-licenses
   mongorestore --db=hrsm-licenses ./backups/pre-migration-licenses-[timestamp]/hrsm-licenses
   ```

3. **Revert code changes**
   ```bash
   # Re-enable backward compatibility
   # In server/.env
   ENABLE_BACKWARD_COMPATIBILITY=true
   
   # Restart services
   npm restart
   ```

4. **Verify rollback success**
   ```bash
   node server/scripts/migrations/cli/migrationCli.js --verify-rollback
   ```

5. **Test application functionality**
   - Login to application
   - Verify all features work
   - Check data integrity

6. **Document rollback reason**
   - Create incident report
   - Document issues encountered
   - Plan remediation steps

### Rollback Time Estimate

- **Automated rollback:** 15-30 minutes
- **Manual database restore:** 30-60 minutes
- **Full verification:** 30 minutes

**Total rollback time:** 1-2 hours

---

## Troubleshooting

### Common Issues

#### Issue: Migration fails with "Connection timeout"

**Symptoms:**
- Migration script hangs
- "ETIMEDOUT" errors in logs

**Solution:**
```bash
# Check database connectivity
mongosh hrsm_platform --eval "db.runCommand({ping: 1})"
mongosh hrsm-licenses --eval "db.runCommand({ping: 1})"

# Increase timeout in migration config
# Edit server/scripts/migrations/config/migrationConfig.js
# Set connectionTimeout: 30000 (30 seconds)
```

#### Issue: Validation errors for missing fields

**Symptoms:**
- "Required field missing" errors
- Migration halts during validation

**Solution:**
```bash
# Identify problematic records
node server/scripts/migrations/cli/migrationCli.js --find-invalid-records

# Fix records manually
mongosh hrsm_platform
db.tenants.updateMany(
  { name: { $exists: false } },
  { $set: { name: "Unknown" } }
)

# Re-run migration
```

#### Issue: API authentication fails

**Symptoms:**
- 401 errors when testing API
- "Invalid API key" messages

**Solution:**
```bash
# Verify API key configuration
cat server/.env | grep LICENSE_SERVER_API_KEY
cat hrsm-license-server/.env | grep API_KEYS

# Regenerate API key if needed
node hrsm-license-server/src/scripts/generateApiKey.js

# Update main backend .env with new key
```

#### Issue: Cache not refreshing

**Symptoms:**
- Stale data in application
- "Using stale cache" warnings in logs

**Solution:**
```bash
# Manually invalidate cache
mongosh hrsm_platform
db.company_license.updateMany(
  {},
  { $set: { "quickAccess.lastSyncedAt": new Date(0) } }
)

# Trigger refresh
node server/scripts/migrations/cli/migrationCli.js --refresh-cache
```

#### Issue: Performance degradation

**Symptoms:**
- Slow API responses
- High database CPU usage

**Solution:**
```bash
# Check indexes
mongosh hrsm-licenses
db.tenants.getIndexes()

# Create missing indexes
db.tenants.createIndex({ tenantId: 1 }, { unique: true })
db.tenants.createIndex({ "subscription.status": 1 })

# Restart services
npm restart
```

---

## Success Criteria

Migration is considered successful when:

- ✅ All tenant records migrated to license server database
- ✅ Record counts match between source and destination
- ✅ All required fields preserved
- ✅ API endpoints return correct data
- ✅ Main backend successfully queries license server
- ✅ Cache is populated and refreshing correctly
- ✅ Application functionality works end-to-end
- ✅ No critical errors in logs
- ✅ Performance meets SLA requirements
- ✅ Verification report shows 100% success

---

## Post-Migration Tasks

### Immediate (Day 1)

- [ ] Monitor application logs for errors
- [ ] Check cache hit rates
- [ ] Verify API response times
- [ ] Monitor database performance
- [ ] Document any issues encountered

### Short-term (Week 1)

- [ ] Review cache refresh job logs
- [ ] Analyze API usage patterns
- [ ] Optimize slow queries if needed
- [ ] Update monitoring dashboards
- [ ] Train support team on new architecture

### Long-term (Month 1)

- [ ] Remove backward compatibility code
- [ ] Archive old tenant data from main database
- [ ] Update disaster recovery procedures
- [ ] Review and optimize cache TTL
- [ ] Conduct post-migration retrospective

---

## Contact Information

**Migration Team:**
- Database Administrator: [Contact Info]
- Backend Lead: [Contact Info]
- DevOps Engineer: [Contact Info]

**Escalation:**
- On-call Engineer: [Contact Info]
- Technical Lead: [Contact Info]

**Support Channels:**
- Slack: #platform-migration
- Email: platform-team@company.com
- Emergency: [Phone Number]

---

## Appendix

### A. Migration Configuration

Default configuration in `server/scripts/migrations/config/migrationConfig.js`:

```javascript
{
  batchSize: 100,
  connectionTimeout: 10000,
  retryAttempts: 3,
  retryDelay: 5000,
  cacheTTL: 21600000, // 6 hours
  logLevel: 'info'
}
```

### B. Database Schemas

See `.kiro/specs/platform-data-migration/design.md` for complete schema definitions.

### C. API Endpoints

See `docs/platform/LICENSE_SERVER_API_DOCUMENTATION.md` for complete API reference.

### D. Monitoring Queries

```javascript
// Check migration status
db.migration_status.findOne({ type: 'platform_data_migration' })

// Count migrated tenants
db.tenants.countDocuments()

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

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-27  
**Next Review:** After migration completion
