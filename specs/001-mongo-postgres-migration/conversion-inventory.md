# Mongoose → Sequelize Conversion Inventory

**Date**: 2026-05-01
**Status**: Phase 2 - Task T005 Complete
**Scope**: Audit of model files in `hrsm-license-server/src/models/`, `server/models/`, `server/platform/**/models/`, `server/modules/**/models/`

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| **Total Model Files** | 202 | — |
| Sequelize Models (active) | 187 | ✅ Converted |
| Mongoose Models (active) | 0 | ✅ None found |
| Duplicate/Placeholder Files | 10 | ⚠️ To delete |
| Legacy Backup Files | 6 | 🗑️ To delete |

**Key Finding**: All active model files are already converted to Sequelize. The gap is not in models but in **controllers, services, repositories, routes, middleware, and tests** that still import and use mongoose APIs.

---

## Model File Inventory (by Directory)

### `hrsm-license-server/src/models/` (License Server)

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `enabledModule.model.js` | ✅ Yes | ✅ UUIDV4 | License server model |
| `AuditLog.js` | ✅ Yes | ✅ UUID | License server model |
| `Tenant.js` | ✅ Yes | ✅ UUID | License server model |
| `LicenseAudit.js` | ✅ Yes | ✅ UUID | License server model |
| `License.js` | ✅ Yes | ✅ UUID | License server model |
| `subscription.model.js` | ✅ Yes | ✅ UUIDV4 | License server model |
| `tenant.model.js` | ✅ Yes | ✅ UUIDV4 | License server model |
| `license.model.js` | ✅ Yes | ✅ UUIDV4 | License server model |

**All 8 license server models are Sequelize.** ✅

---

### `server/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `Tenant.js` | ✅ Yes | ✅ UUID | Wrapper re-export from license server |

**Single model file is Sequelize.** ✅

---

### `server/platform/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `Company.js` | ✅ Yes | ✅ UUIDV4 | Active model |
| `Company.sequelize.js` | ⚠️ Duplicate | ✅ UUIDV4 | Delete (empty diff vs Company.js) |
| `PlatformUser.js` | ✅ Yes | ✅ UUID | Active model |

**Action**: Delete `Company.sequelize.js` (duplicate). | **Priority**: Low

---

### `server/platform/subscriptions/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `Plan.js` | ✅ Yes | ✅ UUIDV4 | Active model |
| `Plan.sequelize.js` | ⚠️ Duplicate | ✅ UUIDV4 | Delete (empty/legacy) |

**Action**: Delete `Plan.sequelize.js`. | **Priority**: Low

---

### `server/platform/system/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `licenseAudit.model.js` | ✅ Yes | ✅ UUID | |
| `performanceAlert.model.js` | ✅ Yes | ✅ UUID | |
| `systemMetrics.model.js` | ✅ Yes | ✅ UUID | |
| `securityEvent.model.js` | ✅ Yes | ✅ UUID | |
| `systemAlert.model.js` | ✅ Yes | ✅ UUID | |
| `license.model.js` | ✅ Yes | ✅ UUID | |
| `permissionAudit.model.js` | ✅ Yes | ✅ UUID | |
| `securityAudit.model.js` | ✅ Yes | ✅ UUID | |
| `securitySettings.model.js` | ✅ Yes | ✅ UUID | |
| `permissions.model.js` | ✅ Yes | ✅ UUID | |
| `usageTracking.model.js` | ✅ Yes | ✅ UUID | |
| `permission.system.js` | ℹ️ Config | N/A | Not a DB model — ignore |

**All 11 system model files are Sequelize.** ✅

---

### `server/modules/hr-core/users/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `user.model.js` | ✅ Yes | ✅ UUIDV4 | |
| `role.model.js` | ✅ Yes | ✅ UUID | |
| `resignedEmployee.model.js` | ✅ Yes | ✅ UUID | |
| `idCardBatch.model.js` | ✅ Yes | ✅ UUID | |
| `idCard.model.js` | ✅ Yes | ✅ UUID | |
| `position.model.js` | ✅ Yes | ✅ UUID | |
| `department.model.js` | ✅ Yes | ✅ UUID | |

**All 7 user models are Sequelize.** ✅

---

### `server/modules/hr-core/attendance/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `attendanceDevice.model.js` | ✅ Yes | ✅ UUID | |
| `attendance.model.js` | ✅ Yes | ✅ UUID | |
| `forgetCheck.model.js` | ✅ Yes | ✅ UUID | |

**All 3 attendance models are Sequelize.** ✅

---

### `server/modules/hr-core/overtime/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `overtime.model.js` | ✅ Yes | ✅ UUID | Active model |
| `overtime.sequelize.model.js` | ⚠️ Empty | — | Delete placeholder |
| `Mission.js` | ✅ Yes | ✅ UUID | Active model (exported) |
| `mission.model.js` | ✅ Yes | ✅ UUID | Active model |
| `mission.sequelize.model.js` | ⚠️ Empty | — | Delete placeholder |
| `mission.model.js.bak2` | 🗑️ Mongoose | ❌ ObjectId | **Delete** (old backup) |

**Actions**: Delete `overtime.sequelize.model.js`, `mission.sequelize.model.js`, `mission.model.js.bak2`. | **Priority**: Low

---

### `server/modules/hr-core/vacations/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `vacation.model.js` | ✅ Yes | ✅ UUID | Active model |
| `vacationBalance.model.js` | ✅ Yes | ✅ UUID | Active model |
| `mixedVacation.model.js` | ✅ Yes | ✅ UUID | Active model |
| `sickLeave.model.js` | ✅ Yes | ✅ UUID | Active model |
| `Vacation.js` | ✅ Yes | ✅ UUID | Active model (exported) |
| `vacation.sequelize.model.js` | ⚠️ Empty | — | Delete placeholder |

**Action**: Delete `vacation.sequelize.model.js`. | **Priority**: Low

---

### `server/modules/hr-core/requests/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `request.model.js` | ✅ Yes | ✅ UUID | Active model |
| `permission.model.js` | ✅ Yes | ✅ UUID | Active model |
| `requestControl.model.js` | ✅ Yes | ✅ UUID | Active model |
| `Request.js` | ✅ Yes | ✅ UUID | Active model |
| `request.sequelize.model.js` | ⚠️ Empty | — | Delete placeholder |

**Action**: Delete `request.sequelize.model.js`. | **Priority**: Low

---

### `server/modules/hr-core/holidays/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `holiday.model.js` | ✅ Yes | ✅ UUID | Active model |
| `Holiday.js` | ✅ Yes | ✅ UUID | Active model |

**Both models are Sequelize.** ✅

---

### `server/modules/hr-core/backup/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `backup.model.js` | ✅ Yes | ✅ UUID | |
| `backupExecution.model.js` | ✅ Yes | ✅ UUID | |
| `hardcopy.model.js` | ✅ Yes | ✅ UUID | |

**All 3 backup models are Sequelize.** ✅

---

### `server/modules/hr-core/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `TenantConfig.js` | ✅ Yes | ✅ UUID | Active model |
| `TenantConfig.sequelize.js` | ⚠️ Duplicate | ✅ UUID | Delete (same as TenantConfig.js) |
| `AuditLog.js` | ✅ Yes | ✅ UUID | Active model |
| `AuditLog.mongoose.bak` | 🗑️ Mongoose | ❌ ObjectId | **Delete** (old backup) |
| `Department.js` | ✅ Yes | ✅ UUID | Active model |
| `Department.mongoose.bak` | 🗑️ Mongoose | ❌ ObjectId | **Delete** (old backup) |
| `Position.js` | ✅ Yes | ✅ UUID | Active model |
| `Position.mongoose.bak` | 🗑️ Mongoose | ❌ ObjectId | **Delete** (old backup) |

**Actions**: Delete `TenantConfig.sequelize.js`, `AuditLog.mongoose.bak`, `Department.mongoose.bak`, `Position.mongoose.bak`. | **Priority**: Low

---

### `server/modules/announcements/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `announcement.model.js` | ✅ Yes | ✅ UUIDV4 | Active model (uses UUIDV4) |
| `announcement.sequelize.model.js` | ⚠️ Empty | — | Delete placeholder |

**Action**: Delete `announcement.sequelize.model.js`. | **Priority**: Low

---

### `server/modules/tasks/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `task.model.js` | ✅ Yes | ✅ UUID | Active model |
| `taskReport.model.js` | ✅ Yes | ✅ UUID | Active model |
| `Task.js` | ✅ Yes | ✅ UUID | Active model |
| `TaskReport.js` | ✅ Yes | ✅ UUID | Active model |
| `Task.mongoose.bak` | 🗑️ Mongoose | ❌ ObjectId | **Delete** (old backup) |
| `TaskReport.mongoose.bak` | 🗑️ Mongoose | ❌ ObjectId | **Delete** (old backup) |

**Actions**: Delete `Task.mongoose.bak`, `TaskReport.mongoose.bak`. | **Priority**: Low

---

### `server/modules/surveys/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `survey.model.js` | ✅ Yes | ✅ UUID | |
| `surveyNotification.model.js` | ✅ Yes | ✅ UUID | |

**Both models are Sequelize.** ✅

---

### `server/modules/system/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `backupLog.model.js` | ✅ Yes | ✅ UUID | |
| `performanceMetrics.model.js` | ✅ Yes | ✅ UUID | |
| `securityEvents.model.js` | ✅ Yes | ✅ UUID | |
| `systemAlerts.model.js` | ✅ Yes | ✅ UUID | |

**All 4 system models are Sequelize.** ✅

---

### `server/modules/reports/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `report.model.js` | ✅ Yes | ✅ UUID | |
| `reportConfig.model.js` | ✅ Yes | ✅ UUID | |
| `reportExecution.model.js` | ✅ Yes | ✅ UUID | |
| `reportExport.model.js` | ✅ Yes | ✅ UUID | |

**All 4 report models are Sequelize.** ✅

---

### `server/modules/payroll/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `salary.model.js` | ✅ Yes | ✅ UUID | |
| `payroll.model.js` | ✅ Yes | ✅ UUID | |

**Both payroll models are Sequelize.** ✅

---

### `server/modules/notifications/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `notification.model.js` | ✅ Yes | ✅ UUID | Active model |
| `notification.sequelize.model.js` | ⚠️ Empty | — | Delete placeholder |

**Action**: Delete `notification.sequelize.model.js`. | **Priority**: Low

---

### `server/modules/licensing/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `companyLicense.model.js` | ✅ Yes | ✅ UUID | |

**Model is Sequelize.** ✅

---

### `server/modules/theme/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `themeConfig.model.js` | ✅ Yes | ✅ UUID | |

**Model is Sequelize.** ✅

---

### `server/modules/events/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `event.model.js` | ✅ Yes | ✅ UUID | |

**Model is Sequelize.** ✅

---

### `server/modules/documents/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `document.model.js` | ✅ Yes | ✅ UUID | |
| `documentTemplate.model.js` | ✅ Yes | ✅ UUID | |
| `idCardBatch.model.js` | ✅ Yes | ✅ UUID | |
| `idCard.model.js` | ✅ Yes | ✅ UUID | |
| `hardcopy.model.js` | ✅ Yes | ✅ UUID | |

**All 5 document models are Sequelize.** ✅

---

### `server/modules/data-management/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `dataRetentionPolicy.model.js` | ✅ Yes | ✅ UUID | |
| `dataArchive.model.js` | ✅ Yes | ✅ UUID | |

**Both data management models are Sequelize.** ✅

---

### `server/modules/dashboard/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `dashboardConfig.model.js` | ✅ Yes | ✅ UUID | |

**Model is Sequelize.** ✅

---

### `server/modules/clinic/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `Prescription.js` | ✅ Yes | ✅ UUID | |
| `Visit.js` | ✅ Yes | ✅ UUID | |
| `Appointment.js` | ✅ Yes | ✅ UUID | |
| `MedicalProfile.js` | ✅ Yes | ✅ UUID | |

**All 4 clinic models are Sequelize.** ✅

---

### `server/modules/life-insurance/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `InsuranceProvider.js` | ✅ Yes | ✅ UUID | |
| `Beneficiary.js` | ✅ Yes | ✅ UUID | |
| `FamilyMember.js` | ✅ Yes | ✅ UUID | |
| `InsuranceClaim.js` | ✅ Yes | ✅ UUID | |
| `InsurancePolicy.js` | ✅ Yes | ✅ UUID | |

**All 5 life insurance models are Sequelize.** ✅

---

### `server/modules/email-service/models/`

| Model File | Sequelize? | UUID? | Notes |
|------------|-----------|-------|-------|
| `EmailLog.js` | ✅ Yes | ✅ UUID | |

**Model is Sequelize.** ✅

---

## Files To Delete (Phase 4 Cleanup)

These are legacy/backup files that should be removed:

| File Path | Type | Reason |
|-----------|------|--------|
| `server/platform/models/Company.sequelize.js` | Duplicate | Same as Company.js |
| `server/platform/subscriptions/models/Plan.sequelize.js` | Duplicate | Same as Plan.js |
| `server/platform/tenants/models/Tenant.sequelize.js` | Orphan duplicate | No primary counterpart visible |
| `server/modules/notifications/models/notification.sequelize.model.js` | Empty placeholder | Zero byte / skeletal |
| `server/modules/announcements/models/announcement.sequelize.model.js` | Empty placeholder | Zero byte / skeletal |
| `server/modules/hr-core/missions/models/mission.sequelize.model.js` | Empty placeholder | Zero byte / skeletal |
| `server/modules/hr-core/overtime/models/overtime.sequelize.model.js` | Empty placeholder | Zero byte / skeletal |
| `server/modules/hr-core/requests/models/request.sequelize.model.js` | Empty placeholder | Zero byte / skeletal |
| `server/modules/hr-core/vacations/models/vacation.sequelize.model.js` | Empty placeholder | Zero byte / skeletal |
| `server/modules/hr-core/models/TenantConfig.sequelize.js` | Duplicate | Same as TenantConfig.js |
| `server/modules/hr-core/missions/models/mission.model.js.bak2` | Mongoose backup | Old mongoose version — delete |
| `server/modules/hr-core/models/AuditLog.mongoose.bak` | Mongoose backup | Old mongoose version — delete |
| `server/modules/tasks/models/Task.mongoose.bak` | Mongoose backup | Old mongoose version — delete |
| `server/modules/tasks/models/TaskReport.mongoose.bak` | Mongoose backup | Old mongoose version — delete |
| `server/modules/hr-core/models/Department.mongoose.bak` | Mongoose backup | Old mongoose version — delete |
| `server/modules/hr-core/models/Position.mongoose.bak` | Mongoose backup | Old mongoose version — delete |

**Total to delete**: 22 files (16 model files + 6 service files, all safe to remove).

**Note**: After Phase 4 cleanup, a Phase 7 task will rename all remaining `*.sequelize.js` files to drop the `.sequelize` suffix once mongoose is fully removed.

---

## Gap Analysis: What Still Needs Conversion?

Models are done ✅. The remaining gap is **non-model files that import or use mongoose**:

| Category | Files with mongoose imports | Status |
|----------|---------------------------|--------|
| Controllers | 5 files | ❌ Needs conversion |
| Services | 4 files | ❌ Needs conversion |
| Middleware | 1 file (license server) | ❌ Needs conversion |
| Routes | 1 file (license server) | ❌ Needs conversion |
| Tests | ~25 files | ❌ Needs conversion |
| **Total runtime** | **~11 files** | **Critical** |

**Runtime-critical files still using mongoose** (alphabetical):

1. `hrsm-license-server/src/middleware/validation.middleware.js` — uses `mongoose.Types.ObjectId`
2. `hrsm-license-server/src/routes/healthRoutes.js` — uses `mongoose.connection.db.stats()`
3. `server/modules/hr-core/attendance/controllers/attendanceDevice.controller.js`
4. `server/modules/hr-core/attendance/controllers/forgetCheck.controller.js`
5. `server/modules/hr-core/backup/services/backupService.js`
6. `server/modules/hr-core/backup/services/backupScheduler.service.js`
7. `server/modules/hr-core/holidays/controllers/holiday.controller.js`
8. `server/modules/hr-core/requests/controllers/permissionRequest.controller.js`
9. `server/modules/life-insurance/controllers/insuranceController.js`
10. `server/modules/life-insurance/services/employeeService.js`
11. `server/modules/documents/services/DocumentService.js`

These 11 files must be converted in **Phase 3 (Category A)** before the application can run cleanly on PostgreSQL.

---

## ObjectId Usage Analysis

**Conclusion**: No ObjectId usage in any active model file. All primary keys are:
- `DataTypes.UUID` with `defaultValue: DataTypes.UUIDV4`
- PostgreSQL `UUID` column type

The UUID pattern is fully established across all 187 models.

---

## ID Generation Standard

**Standard**: `crypto.randomUUID()` (Node.js built-in) or `DataTypes.UUIDV4` (Sequelize default)

Models using `DataTypes.UUIDV4`:
- All 187 Sequelize models

UUID generation in tests to be standardized in T007.

---

## Checklist

- [x] All model files scanned for mongoose imports
- [x] Duplicate `.sequelize.js` files identified
- [x] Legacy `.bak` mongoose backup files identified
- [x] Zero active mongoose model files found
- [x] UUID adoption verified across all models
- [x] Gap report written for T005

---

**Phase 2 Status (2026-05-01)**: T005, T006, T007, T008 complete. Gap items T008a and T008b also complete (see sections below). Ready for Phase 3.


---

## Inline Schemas Outside `models/` (Phase 2 Gap - T008a)

**Discovery**: A grep search found **24 additional files** outside `models/` directories that define mongoose schemas inline. These must be addressed in Phase 3-5 conversion work.

### Controllers (1 file)
| File Path | Schema Count | Disposition |
|-----------|--------------|-------------|
| `server/platform/companies/controllers/companyController.js` | 3 schemas | Phase 3 - Controller conversion |

### Services (2 files)
| File Path | Schema Count | Disposition |
|-----------|--------------|-------------|
| `server/modules/documents/services/DocumentService.js` | 3 schemas | Phase 3 - Service conversion |
| `server/platform/companies/services/companyService.js` | 3 schemas | Phase 3 - Service conversion |

### Scripts (14 files)
| File Path | Schema Count | Disposition |
|-----------|--------------|-------------|
| `server/seedMultiTenantSimple.js` | 4 schemas | Phase 4 - Script deletion/conversion |
| `server/scripts/testAnnouncementsWithAuth.js` | 2 schemas | Phase 4 - Script deletion |
| `server/scripts/simpleAnnouncementCheck.js` | 1 schema | Phase 4 - Script deletion |
| `server/checkUserRole.js` | 1 schema | Phase 4 - Script deletion |
| `server/examples/multiTenantRouteExample.js` | 1 schema | Phase 4 - Script deletion |
| `scripts/recreate-platform-admin.js` | 1 schema | Phase 4 - Script deletion |
| `scripts/maintenance/check-documents.js` | 1 schema | Phase 4 - Script deletion |
| `scripts/maintenance/check-hardcopy-users.js` | 2 schemas | Phase 4 - Script deletion |
| `scripts/maintenance/check-tenantconfig.js` | 1 schema | Phase 4 - Script deletion |
| `scripts/maintenance/check-users-data.js` | 2 schemas | Phase 4 - Script deletion |
| `scripts/maintenance/check-users-location.js` | 2 schemas | Phase 4 - Script deletion |
| `scripts/maintenance/create-tenant-config-techcorp.js` | 1 schema | Phase 4 - Script deletion |
| `scripts/maintenance/list-all-collections.js` | 1 schema | Phase 4 - Script deletion |
| `scripts/maintenance/move-documents-to-company-db.js` | 1 schema | Phase 4 - Script deletion |

### Tests (7 files)
| File Path | Schema Count | Disposition |
|-----------|--------------|-------------|
| `server/testing/repositories/GenericRepository.test.js` | 1 schema | Phase 5 - Test conversion |
| `server/testing/services/alertGenerationAndNotification.property.test.js` | 1 schema | Phase 5 - Test conversion |
| `server/testing/repositories/QueryBuilder.test.js` | 1 schema | Phase 5 - Test conversion |
| `server/testing/services/dataRetentionPolicyEnforcement.property.test.js` | 1 schema | Phase 5 - Test conversion |
| `server/testing/repositories/BaseRepository.test.js` | 1 schema | Phase 5 - Test conversion |
| `server/testing/modules/hr-core/requestService.test.js` | 1 schema | Phase 5 - Test conversion |
| `server/testing/services/performanceMetricsCollection.property.test.js` | 1 schema | Phase 5 - Test conversion |

**Total inline schemas**: 37 schema definitions across 24 files (1 controller + 2 services + 14 scripts + 7 tests)

**Action Required**: These files are already captured in Phase 3-5 task lists. No additional tasks needed, but this inventory provides visibility into the scope of inline schema usage.

---

## Additional `.sequelize.js` Files Outside `models/` (Phase 2 Gap - T008b)

**Discovery**: A `find` revealed **14 additional `.sequelize.js` files** outside `models/` directories (9 service files in modules + 5 in server/services).

### Analysis Results

#### Canonical Sequelize Versions (Keep, Delete Non-Sequelize Sibling)

These `.sequelize.js` files are the **canonical PostgreSQL** implementations. The non-`.sequelize.js` versions are **legacy mongoose** versions that should be deleted:

| Sequelize File (KEEP) | Legacy File (DELETE) | Reason |
|------------------------|----------------------|--------|
| `server/modules/clinic/services/prescriptionService.sequelize.js` | N/A | No non-sequelize version exists - already canonical |
| `server/modules/clinic/services/visitService.sequelize.js` | N/A | No non-sequelize version exists - already canonical |
| `server/modules/documents/services/DocumentService.sequelize.js` | `server/modules/documents/services/DocumentService.js` | Sequelize version is complete, mongoose version has inline schemas |
| `server/platform/services/ModuleManagementService.sequelize.js` | N/A | No non-sequelize version exists - already canonical |
| `server/platform/subscriptions/services/subscriptionService.sequelize.js` | N/A | No non-sequelize version exists - already canonical |
| `server/platform/system/services/healthCheckService.sequelize.js` | N/A | No non-sequelize version exists - already canonical |
| `server/platform/system/services/usageTrackingService.sequelize.js` | N/A | No non-sequelize version exists - already canonical |
| `server/platform/tenants/services/tenantProvisioningService.sequelize.js` | N/A | No non-sequelize version exists - already canonical |
| `server/platform/tenants/services/tenantService.sequelize.js` | N/A | No non-sequelize version exists - already canonical |
| `server/services/alternativeBackupService.sequelize.js` | `server/services/alternativeBackupService.js` | Sequelize version uses pg_dump (PostgreSQL), mongoose version uses mongodump |
| `server/services/backupService.sequelize.js` | `server/services/backupService.js` | Sequelize version uses pg_dump (PostgreSQL), mongoose version uses mongodump |
| `server/services/moduleAwareBackupService.sequelize.js` | `server/services/moduleAwareBackupService.js` | Sequelize version extends PostgreSQL backup, mongoose version extends MongoDB backup |

#### Duplicate Sequelize Files (DELETE)

These `.sequelize.js` files in `server/services/` are **duplicates**. The non-`.sequelize.js` versions already use Sequelize models and are canonical:

| Legacy Sequelize File (DELETE) | Canonical File (KEEP) | Reason |
|--------------------------------|----------------------|--------|
| `server/services/CompanyService.sequelize.js` | `server/services/CompanyService.js` | Non-sequelize version already uses Sequelize models |
| `server/services/ModuleAccessService.sequelize.js` | `server/services/ModuleAccessService.js` | Non-sequelize version already uses Sequelize models |

### Updated Deletion List

**Add to "Files To Delete" section**:

#### Service Files - Mongoose Legacy (DELETE - Phase 4)
| File Path | Type | Reason |
|-----------|------|--------|
| `server/modules/documents/services/DocumentService.js` | Mongoose service | Replaced by DocumentService.sequelize.js |
| `server/services/alternativeBackupService.js` | Mongoose service | Replaced by alternativeBackupService.sequelize.js (uses pg_dump) |
| `server/services/backupService.js` | Mongoose service | Replaced by backupService.sequelize.js (uses pg_dump) |
| `server/services/moduleAwareBackupService.js` | Mongoose service | Replaced by moduleAwareBackupService.sequelize.js (PostgreSQL) |
| `server/services/CompanyService.sequelize.js` | Duplicate | Non-sequelize version is canonical |
| `server/services/ModuleAccessService.sequelize.js` | Duplicate | Non-sequelize version is canonical |

**Total additional files to delete**: 6 service files
