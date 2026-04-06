# PostgreSQL Functionality Verification Guide

## Overview

This guide describes the comprehensive verification process for PostgreSQL functionality before production migration. The verification script tests all critical areas to ensure the system is ready for production deployment.

## Verification Script

**Location:** `scripts/verify-postgresql-functionality.js`

**Purpose:** Comprehensive testing of all PostgreSQL functionality across 10 verification areas.

## Verification Areas

### Area 1: CRUD Operations (Requirements 6.1-6.10)

Tests all Create, Read, Update, Delete operations work correctly with PostgreSQL:

- ✅ Create operations for all models
- ✅ Read operations with various filters (exact match, LIKE, role filters)
- ✅ Update operations with tenant isolation
- ✅ Delete operations with proper constraints

**What's Tested:**
- User and Department creation with tenant_id
- Query filtering with exact match and ILIKE patterns
- Updates respect tenant boundaries
- Deletes work correctly and verify tenant isolation

### Area 2: Tenant Isolation (Requirements 3.2, 3.3, 6.10)

Verifies tenant data isolation is working correctly:

- ✅ Queries return only tenant-specific data
- ✅ Cross-tenant data access is prevented
- ✅ tenant_id column exists in all tenant-scoped tables
- ✅ Multi-tenant scenarios work correctly

**What's Tested:**
- Data from different tenants is properly isolated
- Attempting to access another tenant's data returns empty results
- All tenant-scoped tables have tenant_id column
- Multiple tenants can coexist with correct data separation

### Area 3: Relationships and Foreign Keys (Requirements 4.7, 13.4)

Tests all model associations and foreign key constraints:

- ✅ Model associations (belongsTo, hasMany) work
- ✅ Foreign key constraints prevent invalid references
- ✅ Cascade operations work correctly
- ✅ Eager loading (JOIN queries) work efficiently

**What's Tested:**
- User-Department relationships via foreign keys
- Invalid foreign key references are rejected
- JOIN queries return related data correctly
- Multiple associations work together

### Area 4: Transaction Support (Requirements 12.1, 12.2, 12.3)

Verifies transaction management works correctly:

- ✅ Successful transactions commit all operations
- ✅ Failed transactions rollback all operations
- ✅ Data consistency maintained after rollbacks
- ✅ Nested transactions (savepoints) work correctly

**What's Tested:**
- Multi-step operations commit atomically
- Errors trigger complete rollback
- Database state remains consistent after failures
- Savepoints allow partial rollbacks

### Area 5: License Validation (Requirements 21.1-21.7)

Tests license validation between databases:

- ✅ Main app queries license server database
- ✅ Cache fallback mechanism works
- ✅ Cache synchronization and invalidation
- ✅ API response format preserved

**What's Tested:**
- Cross-database queries work correctly
- Cache provides fallback when license server unavailable
- License updates trigger cache invalidation
- Response format matches API contracts

### Area 6: Query Performance and Indexes (Requirements 13.1-13.4, 19.1-19.3)

Verifies query performance and index usage:

- ✅ Query performance acceptable with large datasets
- ✅ Indexes are being used for queries
- ✅ Pagination queries perform efficiently
- ✅ Connection pool working efficiently

**What's Tested:**
- Queries complete in reasonable time (<1s for 100 records)
- EXPLAIN shows index usage
- Pagination with LIMIT/OFFSET is fast
- Concurrent queries use connection pool efficiently

### Area 7: Error Handling (Requirements 14.1-14.4)

Tests error handling for various constraint violations:

- ✅ Unique constraint violations handled correctly
- ✅ Foreign key constraint violations handled correctly
- ✅ Validation errors handled correctly
- ✅ Connection error handling and recovery

**What's Tested:**
- Duplicate email triggers unique constraint error
- Invalid foreign keys are rejected
- Missing required fields trigger validation errors
- Connection recovers after errors

### Area 8: Backup and Restore (Requirements 11.1-11.3)

Verifies backup and restore procedures:

- ✅ pg_dump command is available
- ✅ Backup scripts exist and are executable
- ✅ Backup directory exists and is writable
- ✅ Restore procedures are documented

**What's Tested:**
- PostgreSQL client tools installed
- Backup service files exist
- Backup directory has write permissions
- Documentation is complete

### Area 9: Full Test Suite (Requirements 15.1-15.4)

Runs the complete test suite:

- ✅ Unit tests pass with PostgreSQL
- ✅ Integration tests pass with PostgreSQL
- ✅ Property-based tests pass
- ✅ Test coverage meets minimum threshold

**What's Tested:**
- All unit tests in test/examples/
- All integration tests in test/integration/
- All property-based tests in test/property-based/
- Code coverage >70% (recommended)

### Area 10: API Endpoints (Requirements 21.1, 21.2, 21.6)

Verifies API endpoints work with PostgreSQL:

- ✅ Application server can start with PostgreSQL
- ✅ Health check endpoint responds
- ✅ Database connection status endpoint works
- ✅ Sample API endpoints return correct responses

**What's Tested:**
- Server starts successfully
- Health check returns OK status
- Database status shows connected
- API endpoints return expected data formats

## Usage

### Run All Verifications

```bash
node scripts/verify-postgresql-functionality.js
```

### Run Specific Area

```bash
# Test only tenant isolation (Area 2)
node scripts/verify-postgresql-functionality.js --area=2

# Test only transactions (Area 4)
node scripts/verify-postgresql-functionality.js --area=4
```

### Skip Optional Tests

```bash
# Skip full test suite execution (faster)
node scripts/verify-postgresql-functionality.js --skip-tests

# Skip API endpoint testing
node scripts/verify-postgresql-functionality.js --skip-api

# Skip both
node scripts/verify-postgresql-functionality.js --skip-tests --skip-api
```

### Verbose Output

```bash
node scripts/verify-postgresql-functionality.js --verbose
```

### Custom Report Path

```bash
node scripts/verify-postgresql-functionality.js --report=./my-verification-report.json
```

## Prerequisites

### Environment Variables

Ensure these environment variables are set:

```bash
# Main application database
MAIN_DATABASE_URL=postgresql://user:password@localhost:5432/hrsm_platform

# License server database
LICENSE_DATABASE_URL=postgresql://user:password@localhost:5432/hrsm-licenses

# Backup directory (optional)
BACKUP_DIR=/backup/postgresql
```

### Database Setup

1. PostgreSQL 14+ installed and running
2. Both databases created (hrsm_platform and hrsm-licenses)
3. All tables created (run migrations)
4. Test data can be created/deleted

### Dependencies

```bash
npm install
```

## Report Output

The script generates a detailed JSON report with:

- **Summary:** Total tests, passed, failed, warnings
- **Area Details:** Results for each verification area
- **Test Results:** Individual test outcomes with errors
- **Timing:** Duration for each area and overall
- **Warnings:** Non-critical issues that should be reviewed

**Default Report Location:** `logs/postgresql-verification-report.json`

## Interpreting Results

### Success Criteria

✅ **All Tests Passed:** System is ready for production migration

- All 40+ tests passed
- No critical errors
- Warnings reviewed and acceptable

### Failure Scenarios

❌ **Some Tests Failed:** Address issues before production

Common failure reasons:
- Database connection issues
- Missing indexes
- Foreign key constraint problems
- Transaction isolation issues
- Performance problems

### Warnings

⚠️ **Warnings Don't Block Migration** but should be reviewed:

- Slow query performance (>1s)
- Missing optional documentation
- Test coverage below 70%
- Backup directory permissions

## Pre-Migration Checklist

Before running production migration, ensure:

- [ ] All verification tests pass
- [ ] Performance is acceptable (queries <1s)
- [ ] Indexes are being used (check EXPLAIN output)
- [ ] Transaction support works correctly
- [ ] License validation between databases works
- [ ] Backup procedures tested
- [ ] Full test suite passes
- [ ] API endpoints respond correctly
- [ ] Rollback plan is ready
- [ ] Team is trained on new system

## Troubleshooting

### Database Connection Errors

```
Error: Database connection failed
```

**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check connection strings in environment variables
- Verify database exists: `psql -l`
- Check user permissions

### Test Failures

```
Error: Unique constraint violation not caught
```

**Solution:**
- Check if constraints are defined in schema
- Verify error handling middleware is installed
- Review model definitions

### Performance Issues

```
Warning: Query took 2500ms (expected < 1000ms)
```

**Solution:**
- Run `scripts/create-performance-indexes.js`
- Check EXPLAIN output for index usage
- Verify connection pool settings
- Consider database tuning

### Missing Dependencies

```
Error: pg_dump not found
```

**Solution:**
- Install PostgreSQL client tools
- Add to PATH: `export PATH=/usr/pgsql-14/bin:$PATH`
- Verify installation: `pg_dump --version`

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# .github/workflows/verify-postgresql.yml
name: PostgreSQL Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run migrations
        run: npm run migrate
      
      - name: Verify PostgreSQL functionality
        run: node scripts/verify-postgresql-functionality.js
        env:
          MAIN_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hrsm_platform
          LICENSE_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hrsm-licenses
      
      - name: Upload verification report
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: verification-report
          path: logs/postgresql-verification-report.json
```

## Next Steps

After successful verification:

1. **Review Report:** Check all areas passed and review warnings
2. **Performance Tuning:** Address any performance warnings
3. **Staging Test:** Run verification in staging environment
4. **Load Testing:** Test with production-like data volumes
5. **Team Review:** Have team review results
6. **Production Migration:** Proceed with migration plan
7. **Post-Migration:** Run verification again in production

## Related Documentation

- [Migration Runbook](MIGRATION_RUNBOOK.md)
- [Rollback Plan](ROLLBACK_PLAN.md)
- [PostgreSQL Configuration Guide](POSTGRESQL_CONFIGURATION_GUIDE.md)
- [Backup and Restore Guide](POSTGRES_BACKUP_RESTORE_GUIDE.md)
- [Troubleshooting Guide](docs/POSTGRESQL_TROUBLESHOOTING.md)

## Support

If verification fails or you encounter issues:

1. Check the detailed report in `logs/postgresql-verification-report.json`
2. Review the troubleshooting section above
3. Check related documentation
4. Review PostgreSQL logs
5. Contact the database team for assistance

---

**Last Updated:** 2024
**Version:** 1.0
**Status:** Ready for Use
