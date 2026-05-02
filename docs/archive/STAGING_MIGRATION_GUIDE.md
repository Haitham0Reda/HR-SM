# Staging Environment Migration Execution Guide

## Overview

This guide provides step-by-step instructions for executing the MongoDB to PostgreSQL migration in your staging environment. This is the final validation before production deployment.

## Pre-Migration Checklist

### 1. Environment Verification

```bash
# Verify staging environment is accessible
echo "Checking staging environment..."

# Check PostgreSQL is installed and running
psql --version
pg_isready -h <staging-db-host> -p 5432

# Check Node.js version
node --version  # Should be 14+ or 16+

# Verify MongoDB is accessible (source data)
mongosh --version
mongosh "mongodb://<staging-mongo-host>:27017" --eval "db.adminCommand('ping')"
```

### 2. Backup Current State

```bash
# Backup MongoDB data (CRITICAL - DO NOT SKIP)
mongodump --uri="mongodb://<staging-mongo-host>:27017" --out=/backups/staging-mongo-$(date +%Y%m%d-%H%M%S)

# Backup current application code
cd /path/to/staging/app
git branch backup-pre-postgres-migration
git push origin backup-pre-postgres-migration

# Document current state
echo "MongoDB backup completed at: $(date)" >> migration-log.txt
```

### 3. Create PostgreSQL Databases

```bash
# Connect to PostgreSQL
psql -h <staging-db-host> -U postgres

# Create databases
CREATE DATABASE "hrsm-licenses";
CREATE DATABASE "hrsm_platform";

# Create application user
CREATE USER hrsm_app WITH PASSWORD 'secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE "hrsm-licenses" TO hrsm_app;
GRANT ALL PRIVILEGES ON DATABASE "hrsm_platform" TO hrsm_app;

\q
```

### 4. Configure Environment Variables

```bash
# Update staging .env file
cat > .env.staging << 'EOF'
# PostgreSQL Connections
LICENSE_DATABASE_URL=postgresql://hrsm_app:secure_password_here@<staging-db-host>:5432/hrsm-licenses
MAIN_DATABASE_URL=postgresql://hrsm_app:secure_password_here@<staging-db-host>:5432/hrsm_platform

# MongoDB (for migration script only)
MONGODB_URI=mongodb://<staging-mongo-host>:27017/hrsm_platform
MONGODB_LICENSE_URI=mongodb://<staging-mongo-host>:27017/hrsm-licenses

# Application Settings
NODE_ENV=staging
PORT=5000
LICENSE_SERVER_PORT=4000

# Logging
LOG_LEVEL=debug
ENABLE_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD=1000

# Migration Settings
MIGRATION_BATCH_SIZE=1000
MIGRATION_DRY_RUN=false
EOF

# Load environment variables
export $(cat .env.staging | xargs)
```

## Migration Execution

### Step 1: Deploy PostgreSQL Code

```bash
# Pull latest code with PostgreSQL implementation
cd /path/to/staging/app
git fetch origin
git checkout main  # or your PostgreSQL branch
git pull origin main

# Install dependencies
npm install

# Verify no MongoDB dependencies remain
npm list mongoose mongodb
# Should show: (empty) or not found
```

### Step 2: Run Database Migrations

```bash
# Create database schema
echo "Creating PostgreSQL schema..."

# Run SQL migrations
psql -h <staging-db-host> -U hrsm_app -d hrsm-licenses -f migrations/001-create-license-tables.sql
psql -h <staging-db-host> -U hrsm_app -d hrsm_platform -f migrations/002-create-main-tables.sql
psql -h <staging-db-host> -U hrsm_app -d hrsm_platform -f migrations/003-create-indexes.sql

# Verify tables were created
psql -h <staging-db-host> -U hrsm_app -d hrsm_platform -c "\dt"
psql -h <staging-db-host> -U hrsm_app -d hrsm-licenses -c "\dt"
```

### Step 3: Run Data Migration

```bash
# Start data migration (this may take several hours)
echo "Starting data migration at: $(date)"
node scripts/migrate-mongo-to-postgres.js 2>&1 | tee migration-output.log

# Monitor progress
tail -f migration-output.log

# Expected output:
# Starting MongoDB to PostgreSQL migration...
# Migrating license server database...
#   Migrating licenses: 150 documents
#   Progress: 100.00%
#   ✓ Completed licenses
# Migrating main application database...
#   Migrating tenant: techcorp_solutions
#   ...
# ✓ Migration completed successfully
```

### Step 4: Validate Migrated Data

```bash
# Run validation script
echo "Validating migrated data..."
node scripts/validate-migration.js 2>&1 | tee validation-output.log

# Check validation results
cat validation-output.log | grep -E "(✓|✗|PASS|FAIL)"

# Expected output:
# ✓ License Server Database Validation
# ✓ Main Application Database Validation
# ✓ All validations passed
```

### Step 5: Create Performance Indexes

```bash
# Create indexes for optimal performance
echo "Creating performance indexes..."
node scripts/create-performance-indexes.js

# Verify indexes were created
psql -h <staging-db-host> -U hrsm_app -d hrsm_platform -c "
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"
```

## Application Testing

### Step 6: Start Application Services

```bash
# Start license server
cd /path/to/staging/app
NODE_ENV=staging node hrsm-license-server/src/server.js > license-server.log 2>&1 &
LICENSE_SERVER_PID=$!
echo "License server started with PID: $LICENSE_SERVER_PID"

# Wait for license server to be ready
sleep 5
curl http://localhost:4000/health

# Start main application
NODE_ENV=staging node server/server.js > main-app.log 2>&1 &
MAIN_APP_PID=$!
echo "Main application started with PID: $MAIN_APP_PID"

# Wait for main app to be ready
sleep 5
curl http://localhost:5000/health
```

### Step 7: Run Automated Tests

```bash
# Run full test suite against PostgreSQL
echo "Running test suite..."
npm test 2>&1 | tee test-results.log

# Run integration tests
npm run test:integration 2>&1 | tee integration-test-results.log

# Run property-based tests
npm run test:property 2>&1 | tee property-test-results.log

# Check test results
echo "Test Summary:"
grep -E "(PASS|FAIL|Tests:)" test-results.log
```

### Step 8: Verify License Validation

```bash
# Test license validation between databases
echo "Testing license validation..."

# Test 1: Valid license
curl -X POST http://localhost:5000/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "techcorp_solutions"}' | jq

# Expected: { "valid": true, "expiresAt": "...", "modules": [...] }

# Test 2: License cache
curl http://localhost:5000/api/license/cache/techcorp_solutions | jq

# Test 3: Module access
curl http://localhost:5000/api/license/modules/techcorp_solutions | jq
```

### Step 9: Manual Functional Testing

```bash
# Create test checklist
cat > staging-test-checklist.md << 'EOF'
# Staging Functional Test Checklist

## Authentication & Authorization
- [ ] User login works
- [ ] JWT token generation works
- [ ] Role-based access control works
- [ ] Tenant isolation enforced

## User Management
- [ ] Create new user
- [ ] Update user profile
- [ ] List users (filtered by tenant)
- [ ] Delete user
- [ ] Search users by name/email

## Attendance Management
- [ ] Clock in/out works
- [ ] View attendance records
- [ ] Generate attendance reports
- [ ] Filter by date range

## HR Core Features
- [ ] Department management
- [ ] Position management
- [ ] Vacation requests
- [ ] Overtime tracking

## Payroll
- [ ] View payroll records
- [ ] Calculate payroll
- [ ] Generate payroll reports

## Surveys
- [ ] Create survey
- [ ] Submit survey response
- [ ] View survey results

## Multi-Tenancy
- [ ] Switch between tenants
- [ ] Verify data isolation
- [ ] Cross-tenant access blocked

## Performance
- [ ] Page load times acceptable
- [ ] API response times < 500ms
- [ ] Large dataset queries performant
- [ ] Connection pool stable

## License Validation
- [ ] License validation works
- [ ] Module access control works
- [ ] Cache fallback works
- [ ] Expired license handling works
EOF

echo "Complete the manual test checklist in staging-test-checklist.md"
```

### Step 10: Performance Testing

```bash
# Run performance verification
echo "Running performance tests..."
node scripts/verify-postgresql-functionality.js --performance

# Load testing (optional, requires artillery or similar)
# npm install -g artillery
# artillery quick --count 100 --num 10 http://localhost:5000/api/users

# Monitor query performance
psql -h <staging-db-host> -U hrsm_app -d hrsm_platform -c "
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
"
```

## Validation Checklist

### Data Integrity
- [ ] All MongoDB collections migrated
- [ ] Record counts match between MongoDB and PostgreSQL
- [ ] No data loss detected
- [ ] Relationships preserved
- [ ] Tenant isolation working

### Application Functionality
- [ ] All API endpoints working
- [ ] Authentication/authorization working
- [ ] CRUD operations working
- [ ] Search/filter working
- [ ] Reports generating correctly

### License Validation
- [ ] License server database accessible
- [ ] Main app queries license server
- [ ] Cache synchronization working
- [ ] Module access control working
- [ ] Expired license handling working

### Performance
- [ ] Query response times acceptable
- [ ] Connection pool stable
- [ ] No memory leaks detected
- [ ] Indexes being used
- [ ] Slow query log reviewed

### Testing
- [ ] Unit tests passing (100%)
- [ ] Integration tests passing (100%)
- [ ] Property-based tests passing (100%)
- [ ] Manual testing completed
- [ ] No critical bugs found

### Monitoring
- [ ] Performance monitoring active
- [ ] Connection pool monitoring active
- [ ] Error logging working
- [ ] Slow query logging working
- [ ] Alerts configured

## Troubleshooting

### Issue: Migration Script Fails

```bash
# Check MongoDB connectivity
mongosh "mongodb://<staging-mongo-host>:27017" --eval "db.adminCommand('ping')"

# Check PostgreSQL connectivity
psql -h <staging-db-host> -U hrsm_app -d hrsm_platform -c "SELECT 1"

# Review migration logs
tail -100 migration-output.log

# Check for specific errors
grep -i error migration-output.log
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
db.authenticate().then(() => console.log('Connected')).catch(console.error);
"
```

### Issue: Tests Failing

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- test/integration/license-validation.postgres.test.js

# Check test database configuration
cat test/setup/postgres-test-config.js
```

### Issue: Poor Performance

```bash
# Check if indexes are being used
psql -h <staging-db-host> -U hrsm_app -d hrsm_platform -c "
EXPLAIN ANALYZE
SELECT * FROM users WHERE tenant_id = 'techcorp_solutions' AND email = 'test@example.com';
"

# Check connection pool status
curl http://localhost:5000/api/monitoring/pool-status | jq

# Review slow queries
curl http://localhost:5000/api/monitoring/slow-queries | jq
```

## Rollback Procedure

If critical issues are found:

```bash
# Stop application services
kill $MAIN_APP_PID $LICENSE_SERVER_PID

# Follow rollback plan
cat ROLLBACK_PLAN.md

# Execute rollback
node scripts/test-rollback-procedures.js --execute

# Verify rollback success
node scripts/verify-rollback-success.js
```

## Post-Migration Tasks

### 1. Document Results

```bash
# Create migration report
cat > staging-migration-report.md << 'EOF'
# Staging Migration Report

## Migration Details
- Date: $(date)
- Duration: [FILL IN]
- Records Migrated: [FILL IN]
- Errors: [FILL IN]

## Validation Results
- Data Integrity: [PASS/FAIL]
- Application Functionality: [PASS/FAIL]
- License Validation: [PASS/FAIL]
- Performance: [PASS/FAIL]
- Testing: [PASS/FAIL]

## Issues Found
[LIST ANY ISSUES]

## Recommendations
[LIST RECOMMENDATIONS FOR PRODUCTION]

## Sign-off
- Developer: [NAME]
- QA: [NAME]
- DevOps: [NAME]
- Date: $(date)
EOF
```

### 2. Update Documentation

```bash
# Update staging environment docs
echo "Staging environment now running PostgreSQL" >> docs/ENVIRONMENTS.md
echo "Migration completed: $(date)" >> docs/CHANGELOG.md
```

### 3. Notify Stakeholders

```bash
# Send notification (customize as needed)
echo "Staging migration completed successfully. Ready for production planning." | \
  mail -s "Staging Migration Complete" stakeholders@company.com
```

## Next Steps

After successful staging migration:

1. **Review Results**: Analyze all test results and performance metrics
2. **Address Issues**: Fix any bugs or performance issues found
3. **Update Documentation**: Document any lessons learned
4. **Plan Production**: Schedule production migration window
5. **Prepare Rollback**: Ensure rollback plan is tested and ready
6. **Stakeholder Approval**: Get sign-off from all stakeholders

## Success Criteria

The staging migration is considered successful when:

- ✅ All data migrated without loss
- ✅ All tests passing (100%)
- ✅ All functionality working
- ✅ Performance acceptable
- ✅ License validation working
- ✅ No critical bugs found
- ✅ Monitoring active
- ✅ Rollback plan tested
- ✅ Stakeholder approval obtained

## Questions or Issues?

If you encounter any issues during staging migration:

1. Check the troubleshooting section above
2. Review logs in migration-output.log and validation-output.log
3. Consult POSTGRESQL_TROUBLESHOOTING.md
4. Contact the development team

---

**IMPORTANT**: Do not proceed to production until all success criteria are met and stakeholders have approved.
