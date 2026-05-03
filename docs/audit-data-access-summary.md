# Database Access Audit Summary

**Date:** 2024
**Spec:** 001-mongo-postgres-migration
**Task:** 8 - Audit all direct database access in server code

## Overview

This audit identifies all direct database access patterns outside the repository layer to inform the repository pattern refactoring in Phase 2.

## Summary Statistics

- **Total Direct Access Points:** 108
- **High Risk (N+1 potential):** 12
- **Medium Risk:** 78
- **Low Risk (already using repos):** 18

## Risk Level Definitions

- **High Risk:** N+1 query patterns, loops with queries, multiple sequential queries, or operations without proper scoping
- **Medium Risk:** Direct model access in services/controllers that should use repositories
- **Low Risk:** Already using repository pattern but could be improved

## Key Findings

### 1. N+1 Query Risks (High Priority)

#### Platform Companies Service
- **File:** `server/platform/companies/services/companyService.js`
- **Lines:** 196-245, 638-657
- **Issue:** Multiple sequential `findAll` calls in `backupCompany()` method - 8 separate queries for different models
- **Impact:** Performance degradation when backing up large tenants
- **Recommendation:** Use bulk query with joins or parallel Promise.all()

#### HR Core Backup Service
- **File:** `server/modules/hr-core/backup/services/backupService.js`
- **Lines:** 124-148
- **Issue:** Loop iterating over collections with `destroy()` and `bulkCreate()` for each
- **Impact:** N+1 pattern when restoring multiple collections
- **Recommendation:** Batch operations or use transaction with bulk operations

#### Data Retention Service
- **File:** `server/services/dataRetentionService.js`
- **Lines:** 266-288
- **Issue:** Sequential `findAll()` followed by `destroy()` for each policy
- **Impact:** Performance issues with multiple retention policies
- **Recommendation:** Batch deletion queries

#### Compliance Reporting Service
- **File:** `server/services/complianceReportingService.js`
- **Lines:** 131-695
- **Issue:** Multiple sequential `findAll` calls throughout the service
- **Impact:** Slow report generation
- **Recommendation:** Consolidate queries, use joins

### 2. Direct Model Access Without Repositories

#### Services Without Repository Pattern
- `server/services/alertSystem.service.js` - SystemAlert model
- `server/services/securityEventTracking.service.js` - SecurityEvent model
- `server/services/dataRetentionService.js` - DataRetentionPolicy, DataArchive models
- `server/modules/email-service/services/emailService.js` - EmailLog model

#### Controllers With Direct Model Access
- `server/modules/hr-core/requests/controllers/permissionRequest.controller.js` - Permission.destroy()
- `server/modules/hr-core/attendance/controllers/forgetCheck.controller.js` - ForgetCheck.destroy()
- `server/modules/hr-core/attendance/controllers/attendanceDevice.controller.js` - AttendanceDevice.destroy()
- `server/modules/documents/controllers/hardcopy.controller.js` - HardCopy.destroy()

#### Models With Static Methods (Should Be in Repositories)
- `server/modules/system/models/securityEvents.model.js` - getEventsByType()
- `server/modules/reports/models/reportExecution.model.js` - multiple static methods
- `server/modules/reports/models/reportExport.model.js` - cleanupExpired(), getStatistics()
- `server/modules/documents/models/idCard.model.js` - statistics methods
- `server/modules/clinic/models/Prescription.js` - getStatistics()
- `server/modules/email-service/models/EmailLog.js` - getRecentEmails(), getFailedEmails()
- `server/modules/tasks/models/TaskReport.js` - getHistoryForTask()
- `server/modules/system/models/backupLog.model.js` - findExpiredBackups(), getRecentBackups()
- `server/modules/system/models/performanceMetrics.model.js` - getSlowestEndpoints()
- `server/modules/system/models/systemAlerts.model.js` - getCriticalAlerts(), getAlertsByCategory()
- `server/modules/reports/models/report.model.js` - getScheduledReports(), getUserReports(), getTemplates()
- `server/modules/surveys/models/survey.model.js` - findActive()
- `server/modules/dashboard/models/dashboardConfig.model.js` - withTenant()
- `server/platform/system/models/securityAudit.model.js` - multiple query methods
- `server/platform/system/models/permissions.model.js` - getPermissionsByEmployee()

### 3. Raw SQL Queries (sequelize.query)

All raw SQL queries use `sequelize.query()` for statistics/aggregations:
- `server/modules/system/models/securityEvents.model.js:210`
- `server/modules/reports/models/reportExecution.model.js:250`
- `server/modules/reports/models/reportExport.model.js:356`
- `server/modules/documents/models/idCard.model.js:411`
- `server/modules/clinic/models/Prescription.js:385`
- `server/modules/documents/models/idCardBatch.model.js:337`

**Note:** These are aggregation queries that may be appropriate for raw SQL, but should be moved to repositories.

## Modules With Existing Repositories

The following modules already have repositories (low risk):
- ✅ **hr-core/users** - UserRepository exists
- ✅ **hr-core/attendance** - AttendanceRepository exists
- ✅ **hr-core/vacations** - VacationRepository exists
- ✅ **tasks** - TaskRepository exists
- ✅ **surveys** - SurveyRepository exists
- ✅ **payroll** - PayrollRepository exists
- ✅ **documents** - DocumentRepository exists
- ✅ **events** - EventRepository exists
- ✅ **missions** - MissionRepository exists
- ✅ **overtime** - OvertimeRepository exists
- ✅ **notifications** - NotificationRepository exists
- ✅ **announcements** - AnnouncementRepository exists
- ✅ **theme** - ThemeRepository exists
- ✅ **platform/companies** - CompanyRepository exists
- ✅ **platform/licenses** - LicenseRepository exists
- ✅ **platform/subscriptions** - SubscriptionRepository exists

## Modules Needing Repositories

The following modules need new repositories:
- ❌ **reports** - ReportRepository, ReportExecutionRepository, ReportExportRepository
- ❌ **system** - SystemAlertsRepository, BackupLogRepository, PerformanceMetricsRepository, SecurityEventsRepository
- ❌ **email-service** - EmailLogRepository
- ❌ **clinic** - PrescriptionRepository (partial - needs completion)
- ❌ **documents** - IdCardRepository, IdCardBatchRepository, HardCopyRepository
- ❌ **dashboard** - DashboardConfigRepository
- ❌ **data-management** - DataRetentionPolicyRepository, DataArchiveRepository
- ❌ **platform/system** - SecurityAuditRepository, PermissionsRepository

## Recommendations

### Immediate Actions (High Priority)

1. **Fix N+1 Patterns:**
   - Refactor `companyService.js` backup method to use parallel queries
   - Refactor `backupService.js` restore loop to batch operations
   - Refactor `dataRetentionService.js` to batch policy execution
   - Refactor `complianceReportingService.js` to consolidate queries

2. **Create Missing Repositories:**
   - ReportRepository (covers 4 report models)
   - SystemRepository (covers alerts, logs, metrics, events)
   - EmailLogRepository
   - DataRetentionRepository

3. **Move Static Methods:**
   - Move all model static query methods to their respective repositories
   - Update callers to use repository methods instead

### Phase 2 Implementation Order

Based on usage frequency and risk:

1. **Week 1:** Fix N+1 patterns in platform-companies and backup services
2. **Week 2:** Create SystemRepository and ReportRepository (highest usage)
3. **Week 3:** Create DataRetentionRepository and EmailLogRepository
4. **Week 4:** Refactor controllers to use repositories exclusively
5. **Week 5:** Move all model static methods to repositories
6. **Week 6:** Testing and validation

## Testing Recommendations

- Add integration tests for repository methods
- Add performance tests for N+1 fixes (before/after comparison)
- Add tenant isolation tests for all repository queries
- Verify all queries include `tenant_id` / `company_id` scoping

## Notes

- All test files were excluded from this audit
- Repository files were excluded as they are the target pattern
- Some services already use repositories but also have direct model access (mixed pattern)
- Raw SQL queries are primarily for aggregations and statistics
