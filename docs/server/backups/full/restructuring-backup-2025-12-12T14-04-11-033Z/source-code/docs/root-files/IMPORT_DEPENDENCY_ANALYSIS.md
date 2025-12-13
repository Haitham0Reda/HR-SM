# Import Dependency Analysis

## Overview
This document analyzes the current import dependencies to understand what needs to be updated when files are moved during the physical restructuring.

## Critical Dependencies

### 1. Route Index File (server/routes/index.js)
**Impact**: HIGH - This file exports all legacy routes and is imported by app.js
**Files affected**: All route files being moved
**Update required**: Remove exports for moved routes, as they will be handled by module system

### 2. App.js Route Registrations
**Impact**: HIGH - Main application file that registers all routes
**Current imports**: Imports from routes/index.js
**Update required**: Remove legacy route registrations for moved modules

### 3. Test Files
**Impact**: MEDIUM - All controller tests import from legacy paths
**Files affected**: All files in server/testing/controllers/
**Pattern**: `import * as controller from '../../controller/[name].controller.js'`
**Update required**: Update import paths to new module locations

### 4. Cross-Controller Dependencies
**Impact**: MEDIUM - Some controllers import other controllers
**Example**: `server/routes/user.routes.js` imports from `userPhoto.controller.js`
**Update required**: Update import paths when files move

## Import Pattern Analysis

### Current Legacy Patterns
```javascript
// Controllers
import controller from '../controller/[name].controller.js';
import * as controller from '../../controller/[name].controller.js';

// Models  
import Model from '../models/[name].model.js';
import Model from '../../models/[name].model.js';

// Routes
import routes from './[name].routes.js';
export { default as nameRoutes } from './[name].routes.js';
```

### Target Module Patterns
```javascript
// Controllers
import controller from '../modules/[module]/controllers/[name].controller.js';
import controller from '../modules/[module]/[submodule]/controllers/[name].controller.js';

// Models
import Model from '../modules/[module]/models/[name].model.js';
import Model from '../modules/[module]/[submodule]/models/[name].model.js';

// Routes (handled by module system)
// No direct imports needed - handled by moduleRegistry.js
```

## Files Requiring Import Updates

### High Priority (Break application if not updated)

#### server/app.js
- Remove legacy route imports from routes/index.js
- Routes will be loaded by module system instead

#### server/routes/index.js  
- Remove exports for moved routes
- Keep only platform-level routes

### Medium Priority (Break tests/functionality)

#### Test Files (server/testing/controllers/*.test.js)
All test files need import path updates:
- `announcement.controller.test.js` → Update to announcements module
- `analytics.controller.test.js` → Update to analytics module  
- `attendance.controller.test.js` → Update to hr-core/attendance module
- `auth.controller.test.js` → Update to hr-core/auth module
- `backup.controller.test.js` → Update to hr-core/backup module
- `backupExecution.controller.test.js` → Update to hr-core/backup module
- `department.controller.test.js` → Update to hr-core/users module
- `document.controller.test.js` → Update to documents module
- `documentTemplate.controller.test.js` → Update to documents module
- `event.controller.test.js` → Update to events module
- `hardcopy.controller.test.js` → Update to documents module
- `mixedVacation.controller.test.js` → Update to hr-core/vacations module
- `notification.controller.test.js` → Update to notifications module
- `payroll.controller.test.js` → Update to payroll module
- `permission.controller.test.js` → Update to permissions module (new)
- `permissionAudit.controller.test.js` → Update to permissions module (new)
- `position.controller.test.js` → Update to hr-core/users module
- `report.controller.test.js` → Update to reports module
- `request.controller.test.js` → Update to hr-core/requests module
- `resignedEmployee.controller.test.js` → Update to resigned-employees module (new)
- `securityAudit.controller.test.js` → Update to security module (new)
- `securitySettings.controller.test.js` → Update to security module (new)
- `survey.controller.test.js` → Update to surveys module
- `surveyNotification.controller.test.js` → Update to surveys module
- `user.controller.test.js` → Update to hr-core/users module

#### Cross-Module Dependencies
- `server/routes/user.routes.js` imports `userPhoto.controller.js`
- `server/routes/auth.routes.js` imports from `auth.controller.js`
- `server/routes/subscription.routes.js` imports `subscription.controller.js`

### Low Priority (Internal module dependencies)

#### Within-Module Imports
These will be updated as part of the file move process:
- Controller imports of models within same module
- Route imports of controllers within same module
- Service imports within modules

## Update Strategy

### Phase 1: Prepare for Updates
1. Create automated script to find and replace import paths
2. Create backup of all files with imports
3. Document all current import patterns

### Phase 2: Update High Priority Files
1. Update app.js to remove legacy route imports
2. Update routes/index.js to remove moved route exports
3. Test application startup

### Phase 3: Update Test Files
1. Update all test file imports (can be automated)
2. Run test suite to verify updates
3. Fix any remaining import issues

### Phase 4: Update Cross-Module Dependencies
1. Update cross-controller imports
2. Update any remaining legacy imports
3. Final verification

## Automation Opportunities

### Find and Replace Patterns
```bash
# Controllers
find . -name "*.js" -exec sed -i 's|../controller/attendance.controller.js|../modules/hr-core/attendance/controllers/attendance.controller.js|g' {} \;

# Models  
find . -name "*.js" -exec sed -i 's|../models/attendance.model.js|../modules/hr-core/attendance/models/attendance.model.js|g' {} \;

# Test files (different path depth)
find . -name "*.test.js" -exec sed -i 's|../../controller/attendance.controller.js|../../modules/hr-core/attendance/controllers/attendance.controller.js|g' {} \;
```

### Verification Script
```bash
# Find any remaining legacy imports
grep -r "from.*\.\./controller/" server/ --include="*.js"
grep -r "from.*\.\./models/" server/ --include="*.js" 
grep -r "from.*\.\./routes/" server/ --include="*.js"
```

## Risk Assessment

### High Risk
- **app.js updates**: Critical for application startup
- **routes/index.js updates**: Critical for route loading
- **Module route merging**: Complex merge operations for HR-Core routes

### Medium Risk  
- **Test file updates**: Many files to update, but automated
- **Cross-module dependencies**: Need careful path updates

### Low Risk
- **Within-module imports**: Updated during file moves
- **New module creation**: Clean slate, no legacy dependencies

## Success Criteria

### Import Update Completion
- [ ] No imports from legacy controller/ directory
- [ ] No imports from legacy models/ directory  
- [ ] No imports from legacy routes/ directory (except platform routes)
- [ ] All test files use new import paths
- [ ] Application starts without import errors
- [ ] All tests pass with new import paths

### Verification Commands
```bash
# Should return no results after completion
grep -r "from.*\.\./controller/" server/ --include="*.js"
grep -r "from.*\.\./models/" server/ --include="*.js"
grep -r "from.*routes/.*\.routes\.js" server/app.js

# Application should start successfully
npm start

# Tests should pass
npm test
```

This analysis provides a roadmap for updating all import dependencies during the physical file restructuring process.