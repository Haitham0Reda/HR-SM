# Complete Physical File Restructuring - Movement Plan

## Overview
This document provides a comprehensive mapping of all legacy files to their target module locations and establishes the movement order to minimize broken dependencies.

## File Movement Categories

### Category 1: HR-Core Module Files (Priority 1)

#### Controllers → `server/modules/hr-core/*/controllers/`
- `server/controller/attendance.controller.js` → `server/modules/hr-core/attendance/controllers/`
- `server/controller/auth.controller.js` → `server/modules/hr-core/auth/controllers/`
- `server/controller/department.controller.js` → `server/modules/hr-core/users/controllers/`
- `server/controller/forgetCheck.controller.js` → `server/modules/hr-core/attendance/controllers/`
- `server/controller/holiday.controller.js` → `server/modules/hr-core/holidays/controllers/`
- `server/controller/mission.controller.js` → `server/modules/hr-core/missions/controllers/`
- `server/controller/mixedVacation.controller.js` → `server/modules/hr-core/vacations/controllers/`
- `server/controller/overtime.controller.js` → `server/modules/hr-core/overtime/controllers/`
- `server/controller/position.controller.js` → `server/modules/hr-core/users/controllers/`
- `server/controller/request.controller.js` → `server/modules/hr-core/requests/controllers/`
- `server/controller/user.controller.js` → `server/modules/hr-core/users/controllers/`
- `server/controller/vacation.controller.js` → `server/modules/hr-core/vacations/controllers/`
- `server/controller/backup.controller.js` → `server/modules/hr-core/backup/controllers/`

#### Models → `server/modules/hr-core/*/models/`
- `server/models/attendance.model.js` → `server/modules/hr-core/attendance/models/`
- `server/models/department.model.js` → `server/modules/hr-core/users/models/`
- `server/models/forgetCheck.model.js` → `server/modules/hr-core/attendance/models/`
- `server/models/holiday.model.js` → `server/modules/hr-core/holidays/models/`
- `server/models/mission.model.js` → `server/modules/hr-core/missions/models/`
- `server/models/mixedVacation.model.js` → `server/modules/hr-core/vacations/models/`
- `server/models/overtime.model.js` → `server/modules/hr-core/overtime/models/`
- `server/models/position.model.js` → `server/modules/hr-core/users/models/`
- `server/models/request.model.js` → `server/modules/hr-core/requests/models/`
- `server/models/requestControl.model.js` → `server/modules/hr-core/requests/models/`
- `server/models/user.model.js` → `server/modules/hr-core/users/models/`
- `server/models/vacation.model.js` → `server/modules/hr-core/vacations/models/`
- `server/models/vacationBalance.model.js` → `server/modules/hr-core/vacations/models/`
- `server/models/backup.model.js` → `server/modules/hr-core/backup/models/`
- `server/models/backupExecution.model.js` → `server/modules/hr-core/backup/models/`

#### Routes → `server/modules/hr-core/*/routes.js` (merge into existing)
- `server/routes/attendance.routes.js` → merge into `server/modules/hr-core/attendance/routes.js`
- `server/routes/auth.routes.js` → merge into `server/modules/hr-core/auth/routes.js`
- `server/routes/department.routes.js` → merge into `server/modules/hr-core/users/routes.js`
- `server/routes/forgetCheck.routes.js` → merge into `server/modules/hr-core/attendance/routes.js`
- `server/routes/holiday.routes.js` → merge into `server/modules/hr-core/holidays/routes.js`
- `server/routes/mission.routes.js` → merge into `server/modules/hr-core/missions/routes.js`
- `server/routes/mixedVacation.routes.js` → merge into `server/modules/hr-core/vacations/routes.js`
- `server/routes/overtime.routes.js` → merge into `server/modules/hr-core/overtime/routes.js`
- `server/routes/position.routes.js` → merge into `server/modules/hr-core/users/routes.js`
- `server/routes/request.routes.js` → merge into `server/modules/hr-core/requests/routes.js`
- `server/routes/user.routes.js` → merge into `server/modules/hr-core/users/routes.js`
- `server/routes/vacation.routes.js` → merge into `server/modules/hr-core/vacations/routes.js`
- `server/routes/backup.routes.js` → create new `server/modules/hr-core/backup/routes.js`
- `server/routes/backupExecution.routes.js` → merge into `server/modules/hr-core/backup/routes.js`

### Category 2: Existing Module Files (Priority 2)

#### Analytics Module
- `server/controller/analytics.controller.js` → `server/modules/analytics/controllers/`
- `server/routes/analytics.routes.js` → `server/modules/analytics/routes/`

#### Announcements Module
- `server/controller/announcement.controller.js` → `server/modules/announcements/controllers/`
- `server/models/announcement.model.js` → `server/modules/announcements/models/`
- `server/routes/announcement.routes.js` → `server/modules/announcements/routes/`

#### Dashboard Module
- `server/controller/dashboard.controller.js` → `server/modules/dashboard/controllers/`
- `server/models/dashboardConfig.model.js` → `server/modules/dashboard/models/`
- `server/routes/dashboard.routes.js` → `server/modules/dashboard/routes/`

#### Documents Module
- `server/controller/document.controller.js` → `server/modules/documents/controllers/`
- `server/controller/documentTemplate.controller.js` → `server/modules/documents/controllers/`
- `server/controller/hardcopy.controller.js` → `server/modules/documents/controllers/`
- `server/models/document.model.js` → `server/modules/documents/models/`
- `server/models/documentTemplate.model.js` → `server/modules/documents/models/`
- `server/models/hardcopy.model.js` → `server/modules/documents/models/`
- `server/models/idCard.model.js` → `server/modules/documents/models/`
- `server/models/idCardBatch.model.js` → `server/modules/documents/models/`
- `server/routes/document.routes.js` → `server/modules/documents/routes/`
- `server/routes/documentTemplate.routes.js` → `server/modules/documents/routes/`
- `server/routes/hardcopy.routes.js` → `server/modules/documents/routes/`

#### Events Module
- `server/controller/event.controller.js` → `server/modules/events/controllers/`
- `server/models/event.model.js` → `server/modules/events/models/`
- `server/routes/event.routes.js` → `server/modules/events/routes/`

#### Notifications Module
- `server/controller/notification.controller.js` → `server/modules/notifications/controllers/`
- `server/models/notification.model.js` → `server/modules/notifications/models/`
- `server/routes/notification.routes.js` → `server/modules/notifications/routes/`

#### Payroll Module
- `server/controller/payroll.controller.js` → `server/modules/payroll/controllers/`
- `server/models/payroll.model.js` → `server/modules/payroll/models/`
- `server/routes/payroll.routes.js` → `server/modules/payroll/routes/`

#### Reports Module
- `server/controller/report.controller.js` → `server/modules/reports/controllers/`
- `server/models/report.model.js` → `server/modules/reports/models/`
- `server/models/reportConfig.model.js` → `server/modules/reports/models/`
- `server/models/reportExecution.model.js` → `server/modules/reports/models/`
- `server/models/reportExport.model.js` → `server/modules/reports/models/`
- `server/routes/report.routes.js` → `server/modules/reports/routes/`

#### Surveys Module
- `server/controller/survey.controller.js` → `server/modules/surveys/controllers/`
- `server/controller/surveyNotification.controller.js` → `server/modules/surveys/controllers/`
- `server/models/survey.model.js` → `server/modules/surveys/models/`
- `server/models/surveyNotification.model.js` → `server/modules/surveys/models/`
- `server/routes/survey.routes.js` → `server/modules/surveys/routes/`

#### Tasks Module
- `server/controller/task.controller.js` → `server/modules/tasks/controllers/`
- `server/models/task.model.js` → `server/modules/tasks/models/`
- `server/models/taskReport.model.js` → `server/modules/tasks/models/`
- `server/routes/task.routes.js` → `server/modules/tasks/routes/`

#### Theme Module
- `server/controller/theme.controller.js` → `server/modules/theme/controllers/`
- `server/models/themeConfig.model.js` → `server/modules/theme/models/`
- `server/routes/theme.routes.js` → `server/modules/theme/routes/`

### Category 3: New Module Files (Priority 3)

#### Attendance Devices Module (New)
- `server/controller/attendanceDevice.controller.js` → `server/modules/attendance-devices/controllers/`
- `server/models/attendanceDevice.model.js` → `server/modules/attendance-devices/models/`
- `server/routes/attendanceDevice.routes.js` → `server/modules/attendance-devices/routes/`

#### Permissions Module (New)
- `server/controller/permission.controller.js` → `server/modules/permissions/controllers/`
- `server/controller/permissionAudit.controller.js` → `server/modules/permissions/controllers/`
- `server/controller/permissions.controller.js` → `server/modules/permissions/controllers/`
- `server/models/permission.model.js` → `server/modules/permissions/models/`
- `server/models/permission.system.js` → `server/modules/permissions/models/`
- `server/models/permissionAudit.model.js` → `server/modules/permissions/models/`
- `server/models/permissions.model.js` → `server/modules/permissions/models/`
- `server/routes/permission.routes.js` → `server/modules/permissions/routes/`
- `server/routes/permissionAudit.routes.js` → `server/modules/permissions/routes/`
- `server/routes/permissionRequest.routes.js` → `server/modules/permissions/routes/`
- `server/routes/permissions.routes.js` → `server/modules/permissions/routes/`

#### Security Module (New)
- `server/controller/securityAudit.controller.js` → `server/modules/security/controllers/`
- `server/controller/securitySettings.controller.js` → `server/modules/security/controllers/`
- `server/models/securityAudit.model.js` → `server/modules/security/models/`
- `server/models/securitySettings.model.js` → `server/modules/security/models/`
- `server/routes/securityAudit.routes.js` → `server/modules/security/routes/`
- `server/routes/securitySettings.routes.js` → `server/modules/security/routes/`

#### Roles Module (New)
- `server/controller/role.controller.js` → `server/modules/roles/controllers/`
- `server/models/role.model.js` → `server/modules/roles/models/`
- `server/routes/role.routes.js` → `server/modules/roles/routes/`

#### Resigned Employees Module (New)
- `server/controller/resignedEmployee.controller.js` → `server/modules/resigned-employees/controllers/`
- `server/models/resignedEmployee.model.js` → `server/modules/resigned-employees/models/`
- `server/routes/resignedEmployee.routes.js` → `server/modules/resigned-employees/routes/`

#### Sick Leave Module (New)
- `server/controller/sickLeave.controller.js` → `server/modules/sick-leave/controllers/`
- `server/models/sickLeave.model.js` → `server/modules/sick-leave/models/`
- `server/routes/sickLeave.routes.js` → `server/modules/sick-leave/routes/`

#### User Photos Module (New)
- `server/controller/userPhoto.controller.js` → `server/modules/user-photos/controllers/`

### Category 4: Platform/Core Files (DO NOT MOVE)

#### Platform Files (Keep in server/platform/)
- All files in `server/platform/` - Core platform management files

#### Core Services (Keep in server/services/)
- `server/services/alertManager.service.js` - Core platform service
- `server/services/auditLogger.service.js` - Core platform service
- `server/services/databaseMonitor.js` - Core platform service
- `server/services/dependencyResolver.service.js` - Core platform service
- `server/services/email.service.js` - Core platform service
- `server/services/featureFlag.service.js` - Core platform service
- `server/services/licenseFileLoader.service.js` - Core platform service
- `server/services/licenseValidator.service.js` - Core platform service
- `server/services/licenseWebSocket.service.js` - Core platform service
- `server/services/metrics.service.js` - Core platform service
- `server/services/redis.service.js` - Core platform service
- `server/services/subscription.service.js` - Core platform service
- `server/services/usageTracker.service.js` - Core platform service

#### Platform Controllers (Keep in current locations)
- `server/controller/license.controller.js` - Platform-level functionality
- `server/controller/licenseAudit.controller.js` - Platform-level functionality
- `server/controller/pricing.controller.js` - Platform-level functionality
- `server/controller/subscription.controller.js` - Platform-level functionality

#### Platform Routes (Keep in current locations)
- `server/routes/featureFlag.routes.js` - Platform-level functionality
- `server/routes/license.routes.js` - Platform-level functionality
- `server/routes/licenseAudit.routes.js` - Platform-level functionality
- `server/routes/metrics.routes.js` - Platform-level functionality
- `server/routes/pricing.routes.js` - Platform-level functionality
- `server/routes/subscription.routes.js` - Platform-level functionality

#### Platform Models (Keep in current locations)
- `server/models/license.model.js` - Platform-level functionality
- `server/models/licenseAudit.model.js` - Platform-level functionality
- `server/models/usageTracking.model.js` - Platform-level functionality
- `server/models/organization.model.js` - Platform-level functionality (tenant-related)

## Movement Order Strategy

### Phase 1: Preparation
1. Create backup of current working state
2. Ensure all tests are passing
3. Create new module directories as needed
4. Document current import dependencies

### Phase 2: HR-Core Module (Lowest Risk)
1. Move HR-Core controllers (batch 1)
2. Update imports for moved controllers
3. Test HR-Core functionality
4. Move HR-Core models (batch 2)
5. Update imports for moved models
6. Test HR-Core functionality
7. Move and merge HR-Core routes (batch 3)
8. Update route registrations in app.js
9. Test HR-Core functionality

### Phase 3: Existing Modules (Medium Risk)
1. Move files to existing modules (one module at a time)
2. Update imports after each module
3. Test each module after completion

### Phase 4: New Modules (Higher Risk)
1. Create new module directories
2. Move files to new modules (one module at a time)
3. Create module.config.js for each new module
4. Update imports after each module
5. Register new modules in moduleRegistry.js
6. Test each module after completion

### Phase 5: Cleanup
1. Remove empty legacy directories
2. Update documentation
3. Final comprehensive testing

## Rollback Plan

### Immediate Rollback (if specialization issues arise)
1. Stop the application
2. Restore from backup created in Phase 1
3. Restart application
4. Verify functionality

### Partial Rollback (if specific module has issues)
1. Move problematic files back to legacy locations
2. Revert import path changes for those files
3. Update route registrations
4. Test functionality
5. Address issues before attempting move again

## Success Criteria
- All legacy files moved to appropriate module locations
- All import paths updated and working correctly
- Application starts without errors
- All tests pass
- All existing functionality preserved
- Clean directory structure with no legacy artifacts
- Updated documentation reflects new structure