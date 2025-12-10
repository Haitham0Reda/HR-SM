# Complete Physical File Restructuring - Implementation Tasks

## Overview

This spec completes the physical file restructuring that was started in Phase 8 of the enterprise SaaS architecture. The goal is to move all remaining legacy files to their appropriate module locations and clean up the directory structure.

## Task Breakdown

### Phase 1: Assessment and Preparation

- [ ] 1. Audit current file locations

  - Create inventory of files in `server/controller/`, `server/models/`, `server/routes/`, `server/services/`
  - Identify which module each file belongs to
  - Check for any duplicate files already moved
  - Document current import dependencies

- [ ] 2. Create file movement plan
  - Map each legacy file to its target module location
  - Identify files that need to stay in legacy locations (core platform files)
  - Plan movement order to minimize broken dependencies
  - Create rollback plan if needed

### Phase 2: HR-Core Module File Movement

- [ ] 3. Move HR-Core controllers

  - Move `attendance.controller.js` to `server/modules/hr-core/attendance/controllers/`
  - Move `auth.controller.js` to `server/modules/hr-core/auth/controllers/`
  - Move `department.controller.js` to `server/modules/hr-core/users/controllers/`
  - Move `forgetCheck.controller.js` to `server/modules/hr-core/attendance/controllers/`
  - Move `holiday.controller.js` to `server/modules/hr-core/holidays/controllers/`
  - Move `mission.controller.js` to `server/modules/hr-core/missions/controllers/`
  - Move `mixedVacation.controller.js` to `server/modules/hr-core/vacations/controllers/`
  - Move `overtime.controller.js` to `server/modules/hr-core/overtime/controllers/`
  - Move `position.controller.js` to `server/modules/hr-core/users/controllers/`
  - Move `request.controller.js` to `server/modules/hr-core/requests/controllers/`
  - Move `user.controller.js` to `server/modules/hr-core/users/controllers/`
  - Move `vacation.controller.js` to `server/modules/hr-core/vacations/controllers/`

- [ ] 4. Move HR-Core models

  - Move `attendance.model.js` to `server/modules/hr-core/attendance/models/`
  - Move `department.model.js` to `server/modules/hr-core/users/models/`
  - Move `forgetCheck.model.js` to `server/modules/hr-core/attendance/models/`
  - Move `holiday.model.js` to `server/modules/hr-core/holidays/models/`
  - Move `mission.model.js` to `server/modules/hr-core/missions/models/`
  - Move `mixedVacation.model.js` to `server/modules/hr-core/vacations/models/`
  - Move `overtime.model.js` to `server/modules/hr-core/overtime/models/`
  - Move `position.model.js` to `server/modules/hr-core/users/models/`
  - Move `request.model.js` to `server/modules/hr-core/requests/models/`
  - Move `user.model.js` to `server/modules/hr-core/users/models/`
  - Move `vacation.model.js` to `server/modules/hr-core/vacations/models/`
  - Move `vacationBalance.model.js` to `server/modules/hr-core/vacations/models/`

- [ ] 5. Move HR-Core routes

  - Move `attendance.routes.js` to `server/modules/hr-core/attendance/routes.js`
  - Move `auth.routes.js` to `server/modules/hr-core/auth/routes.js`
  - Move `department.routes.js` to `server/modules/hr-core/users/routes.js` (merge)
  - Move `forgetCheck.routes.js` to `server/modules/hr-core/attendance/routes.js` (merge)
  - Move `holiday.routes.js` to `server/modules/hr-core/holidays/routes.js`
  - Move `mission.routes.js` to `server/modules/hr-core/missions/routes.js`
  - Move `mixedVacation.routes.js` to `server/modules/hr-core/vacations/routes.js` (merge)
  - Move `overtime.routes.js` to `server/modules/hr-core/overtime/routes.js`
  - Move `position.routes.js` to `server/modules/hr-core/users/routes.js` (merge)
  - Move `request.routes.js` to `server/modules/hr-core/requests/routes.js`
  - Move `user.routes.js` to `server/modules/hr-core/users/routes.js` (merge)
  - Move `vacation.routes.js` to `server/modules/hr-core/vacations/routes.js` (merge)

- [ ] 6. Update HR-Core import paths
  - Update all imports in moved HR-Core files
  - Update imports in files that reference moved HR-Core files
  - Update route registration in `app.js` for HR-Core routes
  - Test HR-Core functionality after moves

### Phase 3: Optional Module File Movement

- [ ] 7. Move optional module files

  - Move `backup.controller.js` to `server/modules/hr-core/backup/controllers/`
  - Move `task.controller.js` to `server/modules/tasks/controllers/` (if not already moved)
  - Move `payroll.controller.js` to `server/modules/payroll/controllers/` (if not already moved)
  - Move `report.controller.js` to `server/modules/reports/controllers/` (if not already moved)
  - Move corresponding models and routes for each

- [ ] 8. Move remaining module files
  - Identify any remaining files that belong to existing modules
  - Move files to appropriate module locations
  - Update import paths for moved files
  - Test each module after file moves

### Phase 4: Import Path Updates

- [ ] 9. Update all import statements

  - Scan codebase for imports from old paths
  - Update imports to use new module paths
  - Use automated tools where possible (find/replace with regex)
  - Verify no broken imports remain

- [ ] 10. Update route registrations
  - Update `app.js` to import routes from new locations
  - Remove legacy route imports that have been moved to modules
  - Ensure all routes are still accessible
  - Test route functionality

### Phase 5: Cleanup and Verification

- [ ] 11. Clean up legacy directories

  - Remove empty `server/controller/` directory
  - Remove empty `server/models/` directory
  - Remove empty `server/routes/` directory
  - Keep `server/services/` for core platform services only
  - Remove any duplicate files

- [ ] 12. Update documentation

  - Update README files to reflect new structure
  - Update import examples in documentation
  - Update development guides
  - Update deployment documentation if needed

- [ ] 13. Final verification
  - Run all tests to ensure nothing is broken
  - Start application and verify it works
  - Test key user flows (login, attendance, leave requests, etc.)
  - Verify no 404 errors on existing endpoints
  - Check for any console errors or warnings

### Phase 6: Rollback Plan (if needed)

- [ ] 14. Create rollback procedure
  - Document steps to revert file moves if issues arise
  - Keep backup of working state before major changes
  - Test rollback procedure on development environment
  - Document any issues encountered and solutions

## Success Criteria

- [ ] All legacy files moved to appropriate module locations
- [ ] All import paths updated and working correctly
- [ ] Application starts without errors
- [ ] All tests pass
- [ ] All existing functionality preserved
- [ ] Clean directory structure with no legacy artifacts
- [ ] Updated documentation reflects new structure

## Risk Mitigation

### Before Starting

- [ ] Ensure all tests are currently passing
- [ ] Create backup of current working state
- [ ] Verify application starts and works correctly

### During Implementation

- [ ] Move files in small batches
- [ ] Test after each batch of moves
- [ ] Keep detailed log of changes made
- [ ] Stop and rollback if major issues arise

### After Completion

- [ ] Run comprehensive test suite
- [ ] Perform manual testing of key features
- [ ] Monitor for any runtime errors
- [ ] Document any issues and resolutions

## Timeline

**Estimated Duration**: 4-6 hours

**Breakdown**:

- Assessment and Planning: 1 hour
- HR-Core File Movement: 2 hours
- Optional Module Movement: 1 hour
- Import Path Updates: 1 hour
- Cleanup and Verification: 1 hour

## Dependencies

**Prerequisites**:

- Current hybrid system working ✅
- All tests passing ✅
- Module system functional ✅

**No Blockers Identified** - Ready to proceed when desired.

## Alternative: Maintain Hybrid State

If immediate completion is not required, the current hybrid state can be maintained while focusing on:

1. Phase 9: Testing and Documentation
2. Gradual migration over time
3. New development using modular structure

This provides flexibility while keeping the system functional.
