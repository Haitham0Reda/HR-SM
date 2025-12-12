# Rollback Plan for Physical File Restructuring

## Overview
This document provides detailed rollback procedures for each phase of the physical file restructuring process.

## Pre-Rollback Requirements

### Backup Strategy
1. **Full System Backup**: Create complete backup before starting any moves
2. **Phase Checkpoints**: Create backup after each successful phase
3. **Git Commits**: Commit working state before each specialization change
4. **File Inventory**: Maintain detailed log of all file moves

### Backup Locations
- **Primary Backup**: `backups/full/pre-restructuring-[timestamp]/`
- **Phase Backups**: `backups/incremental/phase-[n]-[timestamp]/`
- **Git Tags**: `pre-restructuring`, `phase-1-complete`, etc.

## Rollback Triggers

### Immediate Rollback Required
- Application fails to start
- Critical functionality broken (auth, user management)
- Database connection issues
- More than 50% of tests failing
- Import/export errors preventing module loading

### Partial Rollback Considered
- Single module functionality broken
- Non-critical features not working
- Performance degradation
- Less than 25% of tests failing

## Rollback Procedures

### Full System Rollback (Emergency)

#### Step 1: Stop Application
```bash
# Stop all running processes
npm run stop
# or
pkill -f "node.*server"
```

#### Step 2: Restore from Backup
```bash
# Navigate to project root
cd /path/to/project

# Remove current state
rm -rf server/modules/*/controllers/
rm -rf server/modules/*/models/
rm -rf server/modules/*/routes/

# Restore from full backup
cp -r backups/full/pre-restructuring-[timestamp]/* .

# Restore node_modules if needed
npm install
```

#### Step 3: Verify Restoration
```bash
# Check file structure
ls -la server/controller/
ls -la server/models/
ls -la server/routes/

# Start application
npm start

# Run tests
npm test
```

#### Step 4: Confirm Rollback Success
- [ ] Application starts successfully
- [ ] All legacy routes accessible
- [ ] Tests pass (should match pre-restructuring results)
- [ ] Database connections working
- [ ] User authentication working

### Phase-Specific Rollback

#### Phase 1 Rollback (HR-Core Module)

**Trigger**: HR-Core functionality broken after file moves

**Steps**:
1. **Move files back to legacy locations**
```bash
# Controllers
mv server/modules/hr-core/*/controllers/*.controller.js server/controller/
# Models  
mv server/modules/hr-core/*/models/*.model.js server/models/
# Routes
mv server/modules/hr-core/*/routes.js server/routes/[original-name].routes.js
```

2. **Restore import paths**
```bash
# Revert import changes in test files
git checkout HEAD~1 -- server/testing/controllers/
# Revert app.js changes
git checkout HEAD~1 -- server/app.js
# Revert routes/index.js changes  
git checkout HEAD~1 -- server/routes/index.js
```

3. **Test HR-Core functionality**
```bash
# Test specific HR functions
npm test -- --grep "attendance|auth|user|vacation|holiday"
```

#### Phase 2 Rollback (Existing Modules)

**Trigger**: Existing module functionality broken

**Steps**:
1. **Identify problematic module**
2. **Move files back for specific module**
```bash
# Example for analytics module
mv server/modules/analytics/controllers/*.js server/controller/
mv server/modules/analytics/routes/*.js server/routes/
```

3. **Restore specific imports**
```bash
# Restore imports for specific module
sed -i 's|modules/analytics/controllers/|controller/|g' server/testing/controllers/analytics.controller.test.js
```

4. **Re-register routes in app.js**
```javascript
// Add back to app.js
import { analyticsRoutes } from './routes/index.js';
app.use('/api/analytics', analyticsRoutes);
```

#### Phase 3 Rollback (New Modules)

**Trigger**: New module creation issues

**Steps**:
1. **Remove new module directories**
```bash
rm -rf server/modules/permissions/
rm -rf server/modules/security/
rm -rf server/modules/roles/
# etc.
```

2. **Move files back to legacy locations**
```bash
mv server/modules/permissions/controllers/*.js server/controller/
mv server/modules/permissions/models/*.js server/models/
mv server/modules/permissions/routes/*.js server/routes/
```

3. **Remove module registrations**
```javascript
// Remove from moduleRegistry.js
// Remove from app.js module loading
```

### Partial Rollback (Single File/Feature)

#### When to Use
- Single controller/model causing issues
- Specific route not working
- Individual test failing

#### Steps
1. **Identify problematic file**
2. **Move single file back**
```bash
cp backups/incremental/phase-[n]/server/controller/[file].js server/controller/
```

3. **Update specific imports**
```bash
# Update only imports for this file
grep -r "modules/.*/[file]" server/ --include="*.js" -l | xargs sed -i 's|modules/.*/[file]|controller/[file]|g'
```

4. **Test specific functionality**

## Rollback Verification

### Post-Rollback Checklist
- [ ] Application starts without errors
- [ ] All critical routes accessible (/api/auth, /api/users, etc.)
- [ ] Database connections working
- [ ] User authentication functional
- [ ] Core HR features working (attendance, leave, etc.)
- [ ] Tests passing (at least same level as pre-restructuring)
- [ ] No console errors on startup
- [ ] Module system still functional (if partial rollback)

### Test Commands
```bash
# Application startup
npm start

# Basic functionality test
curl http://localhost:5000/health
curl http://localhost:5000/api/auth/verify

# Run test suite
npm test

# Check for import errors
node -c server/app.js
```

## Rollback Documentation

### Change Log Template
```
ROLLBACK EXECUTED: [timestamp]
Trigger: [reason for rollback]
Phase: [which phase was rolled back]
Files Affected: [list of files moved back]
Import Changes: [list of import path reversions]
Tests Status: [test results after rollback]
Verification: [checklist completion status]
Next Steps: [what to do next]
```

### Post-Rollback Actions
1. **Document Issues**: Record what went wrong and why
2. **Update Plan**: Modify restructuring plan to address issues
3. **Test Environment**: Try fixes in development before re-attempting
4. **Team Communication**: Notify team of rollback and status

## Prevention Strategies

### Pre-Move Validation
- [ ] All tests passing before starting phase
- [ ] Application running correctly
- [ ] Database accessible
- [ ] No existing import errors

### During Move Validation  
- [ ] Test after each batch of file moves
- [ ] Verify imports updated correctly
- [ ] Check application startup after each change
- [ ] Run relevant test subset

### Post-Move Validation
- [ ] Full test suite execution
- [ ] Manual functionality testing
- [ ] Performance verification
- [ ] Error log review

## Recovery Time Estimates

### Full System Rollback
- **Preparation**: 5 minutes
- **File Restoration**: 10 minutes  
- **Verification**: 15 minutes
- **Total**: ~30 minutes

### Phase-Specific Rollback
- **Preparation**: 2 minutes
- **File Movement**: 5 minutes
- **Import Updates**: 10 minutes
- **Testing**: 10 minutes
- **Total**: ~25 minutes

### Single File Rollback
- **Identification**: 5 minutes
- **File Restoration**: 2 minutes
- **Import Updates**: 5 minutes
- **Testing**: 5 minutes
- **Total**: ~15 minutes

## Success Criteria for Rollback

### Rollback Complete When:
- [ ] Application functionality matches pre-restructuring state
- [ ] All critical features working
- [ ] Test results match or exceed pre-restructuring baseline
- [ ] No new errors introduced
- [ ] System performance maintained
- [ ] Documentation updated with rollback details

This rollback plan ensures that any issues during the physical file restructuring can be quickly and safely resolved, maintaining system stability throughout the process.

## Automated Rollback Tools

### Rollback Testing Script
Location: `server/scripts/test-rollback-procedure.js`

Test rollback procedures before executing them:
```bash
# Test all rollback procedures
node server/scripts/test-rollback-procedure.js all

# Test specific rollback type
node server/scripts/test-rollback-procedure.js full
node server/scripts/test-rollback-procedure.js phase
node server/scripts/test-rollback-procedure.js single
```

### Rollback Execution Script
Location: `server/scripts/execute-rollback.js`

Execute rollback procedures safely:
```bash
# Full system rollback
node server/scripts/execute-rollback.js full

# Phase-specific rollback
node server/scripts/execute-rollback.js phase hr-core

# Single file rollback
node server/scripts/execute-rollback.js single server/controller/user.controller.js

# Dry run (show what would be done)
node server/scripts/execute-rollback.js full --dry-run

# Force execution (skip confirmations)
node server/scripts/execute-rollback.js full --force

# Use specific backup
node server/scripts/execute-rollback.js full --backup-path /path/to/backup
```

## Rollback Testing Procedures

### Before Any Restructuring
1. **Test rollback procedures**:
   ```bash
   node server/scripts/test-rollback-procedure.js all
   ```

2. **Create baseline backup**:
   ```bash
   # Manual backup
   cp -r server/ backups/full/pre-restructuring-$(date +%Y%m%d-%H%M%S)/
   
   # Or use automated backup (if available)
   npm run backup:full
   ```

3. **Verify current state**:
   ```bash
   npm test
   npm start
   curl http://localhost:5000/health
   ```

### During Restructuring
1. **Test rollback after each phase**:
   ```bash
   node server/scripts/test-rollback-procedure.js phase
   ```

2. **Create phase checkpoints**:
   ```bash
   cp -r server/ backups/incremental/phase-$(date +%Y%m%d-%H%M%S)/
   ```

### Rollback Execution Testing
1. **Always test with dry-run first**:
   ```bash
   node server/scripts/execute-rollback.js full --dry-run
   ```

2. **Execute rollback if needed**:
   ```bash
   node server/scripts/execute-rollback.js full
   ```

3. **Verify rollback success**:
   ```bash
   npm test
   npm start
   ```

## Issues Encountered and Solutions

### Common Rollback Issues

#### Issue: File Permission Errors
**Symptoms**: Cannot move files during rollback
**Solution**: 
```bash
# Fix permissions
chmod -R 755 server/
chown -R $USER:$USER server/
```

#### Issue: Import Path Conflicts
**Symptoms**: Application fails to start after rollback
**Solution**:
1. Check for remaining modular imports:
   ```bash
   grep -r "modules/" server/ --include="*.js"
   ```
2. Update imports to legacy paths:
   ```bash
   sed -i 's|modules/hr-core/[^/]*/controllers/|controller/|g' server/**/*.js
   ```

#### Issue: Missing Legacy Directories
**Symptoms**: Rollback fails because target directories don't exist
**Solution**:
```bash
# Recreate legacy directories
mkdir -p server/controller
mkdir -p server/models
mkdir -p server/routes
```

#### Issue: Backup Not Found
**Symptoms**: Rollback script cannot find backup
**Solution**:
1. Check backup locations:
   ```bash
   find backups/ -name "*pre-restructuring*" -type d
   ```
2. Specify backup path manually:
   ```bash
   node server/scripts/execute-rollback.js full --backup-path /path/to/backup
   ```

#### Issue: Partial Rollback State
**Symptoms**: Some files rolled back, others still in modules
**Solution**:
1. Complete the rollback:
   ```bash
   node server/scripts/execute-rollback.js full --force
   ```
2. Or restore from clean backup:
   ```bash
   rm -rf server/
   cp -r backups/full/pre-restructuring-[timestamp]/ server/
   ```

### Rollback Verification Failures

#### Application Won't Start
1. Check syntax errors:
   ```bash
   node -c server/app.js
   ```
2. Check for missing dependencies:
   ```bash
   npm install
   ```
3. Check for import errors:
   ```bash
   grep -r "from.*modules/" server/ --include="*.js"
   ```

#### Tests Failing After Rollback
1. Clear test cache:
   ```bash
   rm -rf .jest-cache/
   npm test -- --clearCache
   ```
2. Check test file imports:
   ```bash
   grep -r "modules/" server/testing/ --include="*.js"
   ```
3. Restore test files from backup:
   ```bash
   cp -r backups/full/pre-restructuring-[timestamp]/server/testing/ server/
   ```

#### Database Connection Issues
1. Check database configuration:
   ```bash
   node -e "console.log(require('./server/config/database.js'))"
   ```
2. Restart database service:
   ```bash
   sudo systemctl restart mongodb
   # or
   brew services restart mongodb-community
   ```

## Rollback Success Validation

### Automated Validation
The rollback scripts include automated validation:
- Application syntax check
- Critical file existence
- Import path verification
- Module structure validation

### Manual Validation Checklist
After any rollback, verify:

- [ ] Application starts without errors: `npm start`
- [ ] Health endpoint responds: `curl http://localhost:5000/health`
- [ ] Authentication works: Test login functionality
- [ ] Core HR features work: Test attendance, users, vacations
- [ ] Tests pass: `npm test`
- [ ] No console errors on startup
- [ ] Database connections working
- [ ] File structure matches pre-restructuring state

### Performance Validation
- [ ] Application startup time normal
- [ ] API response times normal
- [ ] Memory usage normal
- [ ] No new error logs

## Rollback Documentation Template

### Rollback Execution Log
```
ROLLBACK EXECUTED: [timestamp]
Trigger: [reason for rollback]
Type: [full/phase/single]
Target: [what was rolled back]
Backup Used: [backup path/timestamp]
Execution Time: [duration]
Verification Status: [pass/fail]
Issues Encountered: [list any issues]
Resolution Steps: [steps taken to resolve issues]
Final Status: [success/failure]
Next Steps: [what to do next]
```

### Post-Rollback Report Template
```
# Rollback Report - [Date]

## Summary
- **Rollback Type**: [full/phase/single]
- **Trigger**: [why rollback was needed]
- **Duration**: [how long it took]
- **Status**: [success/failure]

## What Was Rolled Back
- [List of files/modules/changes rolled back]

## Verification Results
- Application Startup: [pass/fail]
- Tests: [X passed, Y failed]
- Functionality: [working/issues]

## Issues Encountered
- [List any issues and how they were resolved]

## Lessons Learned
- [What can be improved for next time]

## Recommendations
- [Suggestions for preventing similar issues]
```

This comprehensive rollback plan with automated tools ensures that any issues during the physical file restructuring can be quickly and safely resolved, maintaining system stability throughout the process.