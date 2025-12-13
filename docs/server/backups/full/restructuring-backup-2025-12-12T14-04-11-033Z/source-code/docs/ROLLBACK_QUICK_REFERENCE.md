# Rollback Quick Reference Guide

## Emergency Rollback (Fast Track)

### 🚨 Critical System Failure
```bash
# 1. Stop application
npm stop

# 2. Execute emergency rollback
node server/scripts/execute-rollback.js full --force

# 3. Verify and restart
npm test && npm start
```

### ⚠️ Partial Issues
```bash
# 1. Test what rollback would do
node server/scripts/execute-rollback.js phase hr-core --dry-run

# 2. Execute if safe
node server/scripts/execute-rollback.js phase hr-core
```

## Common Rollback Commands

### Test Rollback Procedures
```bash
# Test all procedures
node server/scripts/test-rollback-procedure.js all

# Test specific type
node server/scripts/test-rollback-procedure.js [full|phase|single]
```

### Execute Rollback
```bash
# Full system rollback
node server/scripts/execute-rollback.js full

# Phase rollback
node server/scripts/execute-rollback.js phase hr-core

# Single file rollback  
node server/scripts/execute-rollback.js single path/to/file.js

# Dry run (safe testing)
node server/scripts/execute-rollback.js full --dry-run

# Force (skip confirmations)
node server/scripts/execute-rollback.js full --force
```

## Verification Commands

### After Rollback
```bash
# Check application
npm start
curl http://localhost:5000/health

# Run tests
npm test

# Check structure
ls -la server/controller/
ls -la server/models/
ls -la server/routes/
```

## File Locations

### Scripts
- `server/scripts/test-rollback-procedure.js` - Test rollback procedures
- `server/scripts/execute-rollback.js` - Execute rollback operations
- `server/scripts/simple-rollback-test.js` - Simple validation test

### Documentation
- `docs/root-files/ROLLBACK_PLAN.md` - Complete rollback plan
- `docs/root-files/ROLLBACK_READINESS_REPORT.md` - Readiness status
- `docs/ROLLBACK_QUICK_REFERENCE.md` - This guide

### Backups
- `backups/full/` - Complete system backups
- `backups/incremental/` - Phase-specific backups
- `backups/rollback-test/` - Test execution logs

## Decision Tree

```
Issue Detected?
├─ Application won't start → Full Rollback
├─ Tests failing (>50%) → Full Rollback  
├─ Single module broken → Phase Rollback
├─ Single feature broken → Single File Rollback
└─ Performance issues → Investigate first, then Phase Rollback
```

## Success Criteria

After rollback, verify:
- [ ] Application starts: `npm start`
- [ ] Health check: `curl http://localhost:5000/health`
- [ ] Tests pass: `npm test`
- [ ] Auth works: Test login
- [ ] Core features work: Test HR functions

## Support

### Documentation
- Full procedures: `docs/root-files/ROLLBACK_PLAN.md`
- Current status: `docs/root-files/ROLLBACK_READINESS_REPORT.md`

### Logs
- Rollback execution: `backups/rollback-execution.log`
- Test results: `backups/rollback-test/rollback-test.log`

---
*Keep this guide accessible during restructuring operations*