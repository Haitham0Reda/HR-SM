# PostgreSQL Verification - Quick Start

## 🚀 Quick Commands

### Run Full Verification
```bash
node scripts/verify-postgresql-functionality.js
```

### Run Specific Area
```bash
# Area 1: CRUD Operations
node scripts/verify-postgresql-functionality.js --area=1

# Area 2: Tenant Isolation
node scripts/verify-postgresql-functionality.js --area=2

# Area 4: Transactions
node scripts/verify-postgresql-functionality.js --area=4

# Area 5: License Validation
node scripts/verify-postgresql-functionality.js --area=5
```

### Fast Verification (Skip Tests & API)
```bash
node scripts/verify-postgresql-functionality.js --skip-tests --skip-api
```

## ✅ What Gets Tested

| Area | Tests | Time | Critical |
|------|-------|------|----------|
| 1. CRUD Operations | 4 | ~5s | ✅ Yes |
| 2. Tenant Isolation | 4 | ~5s | ✅ Yes |
| 3. Relationships & FKs | 4 | ~5s | ✅ Yes |
| 4. Transactions | 4 | ~10s | ✅ Yes |
| 5. License Validation | 4 | ~5s | ✅ Yes |
| 6. Performance & Indexes | 4 | ~15s | ⚠️ Important |
| 7. Error Handling | 4 | ~5s | ✅ Yes |
| 8. Backup & Restore | 4 | ~5s | ⚠️ Important |
| 9. Full Test Suite | 4 | ~3min | ⚠️ Important |
| 10. API Endpoints | 4 | ~10s | ⚠️ Important |

**Total:** 40 tests, ~4-5 minutes (full run)

## 📋 Prerequisites Checklist

- [ ] PostgreSQL 14+ running
- [ ] Environment variables set:
  - `MAIN_DATABASE_URL`
  - `LICENSE_DATABASE_URL`
- [ ] Both databases created
- [ ] Tables migrated
- [ ] `npm install` completed

## 🎯 Success Criteria

```
✅ SUCCESS: All verification tests passed (40/40)

Pass Rate: 100.0%
Status: ✅ ALL TESTS PASSED

PostgreSQL functionality is verified and ready for production migration.
```

## ⚠️ Common Issues

### Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d hrsm_platform -c "SELECT 1"
```

### Missing Tables
```bash
# Run migrations
npm run migrate

# Or manually create tables
psql -U postgres -d hrsm_platform -f schema.sql
```

### Permission Denied
```bash
# Grant permissions
psql -U postgres -c "GRANT ALL ON DATABASE hrsm_platform TO your_user"
```

## 📊 Report Location

Default: `logs/postgresql-verification-report.json`

```bash
# View report
cat logs/postgresql-verification-report.json | jq

# Check pass rate
cat logs/postgresql-verification-report.json | jq '.passed, .failed, .totalTests'
```

## 🔄 Typical Workflow

1. **Initial Verification**
   ```bash
   node scripts/verify-postgresql-functionality.js
   ```

2. **Fix Any Issues**
   - Review failed tests
   - Check error messages
   - Fix and re-run

3. **Quick Re-verification**
   ```bash
   # Test only the area you fixed
   node scripts/verify-postgresql-functionality.js --area=2
   ```

4. **Final Full Verification**
   ```bash
   node scripts/verify-postgresql-functionality.js --verbose
   ```

5. **Review Report**
   ```bash
   cat logs/postgresql-verification-report.json
   ```

## 🎓 Understanding Results

### All Green ✅
```
✓ Area 1: CRUD Operations
  Duration: 4.2s
  Tests: 4/4 passed
```
**Action:** None needed, proceed to next area

### Some Failures ❌
```
✗ Area 2: Tenant Isolation
  Duration: 3.8s
  Tests: 3/4 passed
  Failed Tests:
    - Cross-tenant data access is prevented: security issue
```
**Action:** Fix the issue and re-run Area 2

### Warnings ⚠️
```
⚠️ Query took 1500ms (expected < 1000ms)
```
**Action:** Review but doesn't block migration

## 🚦 Go/No-Go Decision

### ✅ GO for Production
- All critical tests pass (Areas 1-5, 7)
- Performance acceptable (Area 6)
- Test suite passes (Area 9)
- No critical warnings

### ❌ NO-GO for Production
- Any critical test fails
- Transaction support broken
- Tenant isolation issues
- License validation fails
- Major performance problems

### ⚠️ REVIEW Required
- Some warnings present
- Performance below optimal
- Test coverage <70%
- API tests skipped

## 📞 Need Help?

1. Check full guide: `POSTGRESQL_VERIFICATION_GUIDE.md`
2. Review troubleshooting: `docs/POSTGRESQL_TROUBLESHOOTING.md`
3. Check logs: `logs/postgresql-verification-report.json`
4. Contact database team

## 🔗 Related Commands

```bash
# Run specific test suite
npm test -- --testPathPattern="test/integration"

# Check database status
psql -U postgres -c "\l"

# View table structure
psql -U postgres -d hrsm_platform -c "\dt"

# Check indexes
psql -U postgres -d hrsm_platform -c "\di"

# Run performance analysis
node scripts/create-performance-indexes.js
```

---

**Quick Tip:** Run with `--verbose` flag to see detailed SQL queries and execution details.
