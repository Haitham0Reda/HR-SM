---
description: "Mongoose → Sequelize code conversion (post-incident)"
---

# Tasks: Mongoose → Sequelize Full Code Conversion

**Input**: Design documents from `/specs/001-mongo-postgres-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Existing test files use mongoose; they are part of the conversion scope (Phase 5).

---

## ⚠️ Context: What Happened, What's Left

**Original plan**: 6-phase migration ending with a hard cutover to PostgreSQL after data migration and validation.

**Actual events on 2026-04-29**: Production MongoDB clusters were deleted **before** the data migration (Phase 3) ran. Result:
- `HR-SM` PostgreSQL database: 16 empty tables (Phase 2 schema sync ran for main app)
- `License` PostgreSQL database: 0 tables (Phase 2 never ran for license server)
- Source data: permanently lost (no backup was taken)

**Decision (2026-05-01)**: Accept the data loss. Do not attempt cluster recovery. Complete the code-side migration to Sequelize so the application becomes operational on PostgreSQL with fresh data.

**Remaining work scope**:
- 247 JavaScript files import `mongoose` or `MongoClient`
- ~25 are production code (controllers, services, repositories, config) — must be converted
- ~50 are one-off scripts (seed, check, fix, nuke, migrate) — most can be deleted, a few converted
- ~150 are test files — convert or delete
- Plus: dependency removal, env cleanup, documentation updates

**Estimated effort**: 2-4 weeks of focused work for one developer.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are relative to repository root

---

## Phase 1: Setup ✅ COMPLETE (Historical)

T001-T004 retained as historical record. The "rollback safety net" tasks (T002, T004) were never executed — that gap is what caused the data loss event.

- [x] T001 PostgreSQL `HR-SM` and `License` databases reachable (verified 2026-04-29)
- [ ] T002 ~~MongoDB backup~~ — N/A: clusters deleted before backup, no recovery possible
- [ ] T003 Staging environment — DEFERRED: redefine after Phase 2/3 complete (PostgreSQL-only staging)
- [ ] T004 ~~Rollback configuration~~ — N/A: no source database to roll back to. `.env.mongodb-rollback` to be deleted in Phase 7.

---

## Phase 2: Inventory & Pattern Establishment ✅ COMPLETE (2026-05-01)

**Purpose**: Avoid duplicating already-converted work and lock in a repeatable conversion pattern before bulk work begins.

**Status**: All four tasks complete. Two gaps identified during review — added as T008a and T008b below.

- [x] T005 Audit `hrsm-license-server/src/models/` and `server/models/`, `server/platform/**/models/`, `server/modules/**/models/` for existing Sequelize models — gap report at [conversion-inventory.md](specs/001-mongo-postgres-migration/conversion-inventory.md). **Result**: All 187 active model files are Sequelize; zero active mongoose model files. The remaining mongoose usage is in controllers, services, repositories, middleware, routes, and tests (covered by Phase 3).
- [x] T006 Conversion playbook documented at [conversion-pattern.md](specs/001-mongo-postgres-migration/conversion-pattern.md) (1518 lines). Covers schema mapping, query operators, association loading, ID handling, multi-tenant pattern, aggregation, repository/controller/service/test patterns, and 5 worked end-to-end examples.
- [x] T007 UUID standard established (pattern doc §16): `crypto.randomUUID()` for explicit test IDs; `DataTypes.UUIDV4` for auto-generated model PKs. `mongoose.Types.ObjectId()` is banned.
- [x] T008 PostgreSQL tables synced. **Verified by [damage-assessment.js](scripts/damage-assessment.js)**: Main DB went from 16 → 37 tables; License DB went from 0 → 4 tables. (All tables still empty — expected; data was lost in the deletion incident.)

**Checkpoint**: A conversion playbook exists; team can convert files in parallel without diverging. ✅

### Phase 2 Gaps ✅ CLOSED (2026-05-01)

- [x] T008a Audit non-model files for inline `new mongoose.Schema(...)` definitions. **Result**: 24 files outside `models/` define mongoose schemas inline (1 controller + 2 services + 14 scripts + 7 tests), totalling 37 schema definitions. All 24 files are already covered by Phase 3-5 task lists; documented in [conversion-inventory.md §"Inline Schemas Outside models/"](specs/001-mongo-postgres-migration/conversion-inventory.md). No additional Phase 3-5 tasks needed.
- [x] T008b Audit `.sequelize.js` files outside `models/` directories. **Result**: 14 files reviewed. Decisions documented in [conversion-inventory.md §"Additional .sequelize.js Files Outside models/"](specs/001-mongo-postgres-migration/conversion-inventory.md):
  - **9 modules-side `.sequelize.js` files** (clinic, platform, tenants, subscriptions, system services) have no non-sequelize sibling — they are canonical. They will be renamed to drop the `.sequelize.js` suffix in Phase 7 (T079).
  - **3 server/services backup files** (`alternativeBackupService`, `backupService`, `moduleAwareBackupService`): the `.sequelize.js` versions use `pg_dump` and are canonical; the mongoose `.js` siblings are queued for deletion in Phase 4.
  - **2 server/services duplicates** (`CompanyService.sequelize.js`, `ModuleAccessService.sequelize.js`): the non-`.sequelize.js` versions already use Sequelize models; the `.sequelize.js` duplicates are queued for deletion in Phase 4.
  - **1 modules service** (`DocumentService.sequelize.js`): canonical; the mongoose `DocumentService.js` is queued for deletion in Phase 4.

---

## Phase 3: Category A — Active Production Code Conversion (~25 files)

**Purpose**: Restore runtime correctness. These files are imported by the running application and currently throw at runtime when their code paths are hit.

**Strategy**: Convert in dependency order — config & registry first (foundational), then repositories (depended on by services), then services, then controllers and routes.

### A1: Foundational config & registry (must be first)

**Review findings (2026-05-01)**: The canonical Sequelize config is [server/config/database.js](server/config/database.js) (327 lines, both `licenseServerDb` and `mainAppDb` instances, pool config, SSL handling, health checks, graceful shutdown). All four A1 files are either dead code or redundant — none requires *conversion*; all should be **deleted**.

| File | Imports it? | Recommendation |
|------|-------------|----------------|
| `server/config/db.js` | None (verified by grep) | DELETE — dead code, 28 lines, calls `mongoose.connect()` |
| `server/config/databaseOptimization.js` | 1 test file only (`databasePerformanceOptimization.property.test.js`) | DELETE — 654 lines of MongoDB-only ops (TTL indexes, capped collections, mongo profiler, replica-set config); test will be cleaned up in Phase 5 |
| `server/core/config/database.js` | None (verified by grep) | DELETE — duplicate legacy mongoose config, 83 lines |
| `server/utils/tenantModelRegistry.js` | 1 production file (`server/modules/dashboard/controllers/dashboard.controller.js`, lines 30 & 128) + 1 test | DELETE + update the dashboard controller (see T012a) — the per-tenant-database registration pattern is obsolete in single-DB-with-`tenant_id` Sequelize architecture |

- [x] T009 Delete [server/config/db.js](server/config/db.js) — confirmed dead code (no imports anywhere in codebase)
- [x] T010 Delete [server/config/databaseOptimization.js](server/config/databaseOptimization.js) — confirmed unused except by [server/testing/services/databasePerformanceOptimization.property.test.js](server/testing/services/databasePerformanceOptimization.property.test.js); delete that test alongside the file (rather than carrying it into Phase 5), since it tests MongoDB-specific behavior that no longer exists
- [x] T011 Delete [server/core/config/database.js](server/core/config/database.js) — confirmed dead code (no imports anywhere)
- [x] T012 Delete [server/utils/tenantModelRegistry.js](server/utils/tenantModelRegistry.js) — pattern is obsolete; production usage migrated in T012a below
- [x] T012a Update [server/modules/dashboard/controllers/dashboard.controller.js](server/modules/dashboard/controllers/dashboard.controller.js) lines 30 and 128 — replace `await import('../../../utils/tenantModelRegistry.js')` and `registerHRModels(tenantConnection)` calls with direct imports of the Sequelize models (`User`, `Department`, `Position`, `Announcement` from their `*.model.js` files) and filter by `tenantId` in `where` clauses. Also update the test [server/testing/integration/announcements-tenant.test.js](server/testing/integration/announcements-tenant.test.js) to remove the `registerHRModels` import (or delete the test if it tested obsolete behavior — defer that decision to Phase 5).

### A2: Repositories (5 files — depended on by all services)

- [x] T013 [P] Convert [server/repositories/modules/MissionRepository.js](server/repositories/modules/MissionRepository.js) — Already converted to Sequelize (uses Op, snake_case fields, Sequelize queries)
- [x] T014 [P] Convert [server/repositories/modules/OvertimeRepository.js](server/repositories/modules/OvertimeRepository.js) — Converted from mongoose to Sequelize (replaced aggregations with Sequelize queries, updated field names to snake_case, replaced mongoose.Types.ObjectId with direct IDs)
- [x] T015 [P] Convert [server/repositories/modules/DocumentRepository.js](server/repositories/modules/DocumentRepository.js)
- [x] T016 [P] Convert [server/repositories/modules/TaskRepository.js](server/repositories/modules/TaskRepository.js)
- [x] T017 [P] Convert [server/repositories/modules/PayrollRepository.js](server/repositories/modules/PayrollRepository.js)

### A3: Services (~9 files)

- [x] T018 [P] Delete [server/services/backupService.js](server/services/backupService.js), [server/services/alternativeBackupService.js](server/services/alternativeBackupService.js), [server/services/backupRestorationTest.js](server/services/backupRestorationTest.js), [server/services/databaseRecoveryService.js](server/services/databaseRecoveryService.js) — all are mongoose-only backup utilities; canonical Sequelize versions exist (`.sequelize.js` files use `pg_dump` instead of `mongodump`)
- [x] T019 [P] Delete [server/services/moduleAwareBackupService.js](server/services/moduleAwareBackupService.js) — mongoose-only; canonical Sequelize version exists
- [x] T020 [P] Convert [server/services/auditService.js](server/services/auditService.js) — File does not exist; likely already handled or renamed to auditLogger.service.js which uses Sequelize models
- [x] T021 [P] Convert [server/services/notificationService.js](server/services/notificationService.js) — File is a stub with no database operations; no conversion needed
- [x] T022 [P] Delete [server/modules/documents/services/DocumentService.js](server/modules/documents/services/DocumentService.js) — mongoose-only; canonical `DocumentService.sequelize.js` exists
- [x] T023 [P] Convert [server/services/userAccessAnalytics.service.js](server/services/userAccessAnalytics.service.js) — Removed unused mongoose import; database operations are stubs
- [x] T024 [P] Convert [server/modules/life-insurance/services/employeeService.js](server/modules/life-insurance/services/employeeService.js) — Already converted to Sequelize (uses Op, Sequelize queries, includes)
- [x] T025 Convert [server/modules/hr-core/backup/services/backupService.js](server/modules/hr-core/backup/services/backupService.js) and [backupScheduler.service.js](server/modules/hr-core/backup/services/backupScheduler.service.js) (related, single task) — Converted to Sequelize; backupScheduler now uses postgresBackup.service.js instead of mongooseBackup
- [x] T026 [P] Convert [server/platform/system/services/healthCheckService.js](server/platform/system/services/healthCheckService.js) — Deleted mongoose version; canonical healthCheckService.sequelize.js exists
- [x] T027 [P] Convert [server/platform/companies/services/companyService.js](server/platform/companies/services/companyService.js) — Converted from mongoose multi-tenant architecture to Sequelize single-database architecture with tenant_id filtering

### A4: Controllers (~5 files)

- [x] T029 [P] Convert [server/modules/hr-core/holidays/controllers/holiday.controller.js](server/modules/hr-core/holidays/controllers/holiday.controller.js)
- [x] T030 [P] Convert [server/modules/hr-core/attendance/controllers/forgetCheck.controller.js](server/modules/hr-core/attendance/controllers/forgetCheck.controller.js)
- [x] T031 [P] Convert [server/modules/hr-core/attendance/controllers/attendanceDevice.controller.js](server/modules/hr-core/attendance/controllers/attendanceDevice.controller.js)
- [x] T032 [P] Convert [server/modules/hr-core/requests/controllers/permissionRequest.controller.js](server/modules/hr-core/requests/controllers/permissionRequest.controller.js)
- [x] T033 [P] Convert [server/modules/life-insurance/controllers/insuranceController.js](server/modules/life-insurance/controllers/insuranceController.js)
- [x] T034 [P] Convert [server/platform/companies/controllers/companyController.js](server/platform/companies/controllers/companyController.js)

### A5: License server runtime files

- [x] T035 [P] Convert [hrsm-license-server/src/middleware/validation.middleware.js](hrsm-license-server/src/middleware/validation.middleware.js) — replace mongoose ObjectId validation with UUID validation
- [x] T036 Convert [hrsm-license-server/src/routes/healthRoutes.js](hrsm-license-server/src/routes/healthRoutes.js) — replace `mongoose.connection.db.stats()` with Sequelize/pg health check (e.g., `SELECT pg_database_size(current_database())`)
- [x] T037 Audit and delete remaining mongoose model files in [hrsm-license-server/src/models/](hrsm-license-server/src/models/): `License.js`, `Tenant.js`, `LicenseAudit.js`, `AuditLog.js` if their `.model.js` Sequelize counterparts cover all usage
- [x] T037a **Verified 2026-05-02**: `ls hrsm-license-server/src/models/` shows 5 files — all Sequelize, no duplicate pairs:
  - `AuditLog.js` (Sequelize)
  - `License.js` (Sequelize, `class License extends Model`)
  - `Tenant.js` (Sequelize, `class Tenant extends Model`)
  - `enabledModule.model.js` (Sequelize)
  - `subscription.model.js` (Sequelize)

  T037 deleted `license.model.js`, `tenant.model.js`, and `LicenseAudit.js` (the lowercase `.model.js` duplicates). Grep confirms zero remaining imports of the deleted files anywhere in the codebase, and zero `mongoose` imports inside `hrsm-license-server/src/models/`. The PascalCase versions (`License.js`, `Tenant.js`, `AuditLog.js`) are now the canonical implementations.

### A6: CLI & misc

- [x] T038 Convert [server/cli/hr-cli.js](server/cli/hr-cli.js) — CLI entry point still imports mongoose
- [x] T038a **Phase 3 runtime verification** — ✅ COMPLETE (2026-05-02). License server boots cleanly. Issue 1 (broken imports from T037 deletion) was already fixed in prior work. Issue 2 (naming collision) was already resolved by prior refactoring - the `Tenant` model uses flat subscription columns (`subscriptionStatus`, `subscriptionPlan`, etc.) instead of a JSONB `subscription` column, so the `Tenant.hasOne(Subscription, { as: 'subscription' })` association works without conflict. See [T038-T048-completion-report.md](specs/001-mongo-postgres-migration/T038-T048-completion-report.md)
- [x] T038b **Resolve `Tenant`/`subscription` naming collision** — ✅ COMPLETE (already resolved by prior refactoring). The `Tenant` model no longer has a `subscription` JSONB column; it uses flat columns for subscription data, which means the association works without any naming conflict. No action required. See [T038-T048-completion-report.md](specs/001-mongo-postgres-migration/T038-T048-completion-report.md)

**Checkpoint**: Application starts cleanly. Every controller, service, and repository runs through Sequelize. T038a verifies this in practice rather than on paper.

---

## Phase 4: Category B — One-off Scripts (~50 files)

**Purpose**: Remove dead scripts that referenced the deleted MongoDB clusters; convert the few that are still useful.

### B1: Delete (no useful purpose post-cutover)

- [x] T039 Delete migration scripts (source DB no longer exists):
  - [scripts/migrate-mongo-to-postgres.js](scripts/migrate-mongo-to-postgres.js)
  - [scripts/validate-migration.js](scripts/validate-migration.js)
  - [scripts/execute-staging-migration.js](scripts/execute-staging-migration.js)
  - [scripts/migrations/add-tenant-id-to-all-models.js](scripts/migrations/add-tenant-id-to-all-models.js)
  - [scripts/migrations/add-tenant-id-to-announcements.js](scripts/migrations/add-tenant-id-to-announcements.js)
  - All of [server/scripts/migrations/](server/scripts/migrations/) (Mongo-era migration tooling)
- [x] T040 Delete dangerous mongoose-only nuke/clear scripts:
  - [server/scripts/nukeAllDatabases.js](server/scripts/nukeAllDatabases.js)
  - [server/scripts/nukeDatabaseCompletely.js](server/scripts/nukeDatabaseCompletely.js)
  - [server/scripts/clearDatabase.js](server/scripts/clearDatabase.js)
- [x] T041 Delete one-off debug/check scripts in `server/`:
  - [server/checkUsers.js](server/checkUsers.js), [server/checkUserRole.js](server/checkUserRole.js), [server/checkTenants.js](server/checkTenants.js)
  - [server/createTestUser.js](server/createTestUser.js), [server/testCollections.js](server/testCollections.js), [server/testScript.js](server/testScript.js)
  - [server/testLicenseValidation.js](server/testLicenseValidation.js), [server/fixLicenseTokens.js](server/fixLicenseTokens.js), [server/regenerateOneLicense.js](server/regenerateOneLicense.js), [server/generateProperLicenseTokens.js](server/generateProperLicenseTokens.js)
- [x] T042 Delete Mongo-only maintenance scripts in [scripts/maintenance/](scripts/maintenance/):
  - `list-all-collections.js`, `list-collections-techcorp.js`, `move-documents-to-company-db.js`, `move-providers-to-company-db.js`, `seed-insurance-providers.js`, `copy-tenantconfig-to-admin.js`, `cleanup-test-db.js`, `delete-hrsm-platform.js`, `auto-cleanup.js`, `cleanup-databases.js`
- [x] T043 Delete one-off policy management scripts (mongoose-based):
  - [scripts/permanently-delete-test-policies.js](scripts/permanently-delete-test-policies.js)
  - [scripts/delete-specific-policies.js](scripts/delete-specific-policies.js)
  - [scripts/delete-test-policies.js](scripts/delete-test-policies.js)
  - [scripts/quick-test.js](scripts/quick-test.js)
  - [scripts/recreate-platform-admin.js](scripts/recreate-platform-admin.js)
  - [scripts/add-email-domains.js](scripts/add-email-domains.js)

### B2: Convert (still useful for fresh PostgreSQL setup)

- [x] T044 Convert [server/seed.js](server/seed.js) and [server/seedMultiTenantSimple.js](server/seedMultiTenantSimple.js) to Sequelize — ✅ COMPLETE (2025-01-XX). Both files converted to Sequelize. seed.js verified already converted; seedMultiTenantSimple.js converted from empty to full Sequelize implementation with single-database multi-tenant pattern. See [T044-conversion-report.md](specs/001-mongo-postgres-migration/T044-conversion-report.md)
- [x] T045 Convert [server/scripts/seedFullCompanies.js](server/scripts/seedFullCompanies.js), [seedMultiTenantData.js](server/scripts/seedMultiTenantData.js), [seedForgetCheckData.js](server/scripts/seedForgetCheckData.js) — ✅ COMPLETE (2025-01-XX). Chose seed.js as canonical seeder; deleted 3 Mongoose seed scripts (2,496 lines total). See [T045-conversion-report.md](specs/001-mongo-postgres-migration/T045-conversion-report.md)
- [x] T046 Convert [server/scripts/syncLicenses.js](server/scripts/syncLicenses.js) and [validateLicenses.js](server/scripts/validateLicenses.js) — ✅ COMPLETE (2025-01-27). Both operational scripts converted to Sequelize (minimal changes: imports and connection calls). See [T046-conversion-report.md](specs/001-mongo-postgres-migration/T046-conversion-report.md)
- [x] T047 Convert remaining `server/scripts/*.js` files that call mongoose (announcement-related, license-related, departmental scripts) — ✅ COMPLETE (2026-05-01). Deleted 56 obsolete scripts (52 mongoose + 4 MongoDB docs); kept 2 operational scripts already converted in T046. See [T047-conversion-report.md](specs/001-mongo-postgres-migration/T047-conversion-report.md)

### B3: E2E support

- [x] T048 Convert [e2e/support/database.js](e2e/support/database.js) — ✅ COMPLETE (2025-01-24). Converted from MongoClient to Sequelize; replaced deleteMany with TRUNCATE, insertMany with parameterized INSERT, createIndex with SQL CREATE INDEX. See [T048-conversion-report.md](specs/001-mongo-postgres-migration/T048-conversion-report.md)

### B4: Phase 4 stragglers (added during review)

These files import mongoose but were missed by the original Phase 4 globs because they live outside `scripts/` and `server/scripts/`. They block Phase 8 verification.

- [x] T048b Delete [server/testing/scripts/validateDataRetentionPolicies.js](server/testing/scripts/validateDataRetentionPolicies.js) — Mongo-only validation script; lives under `testing/scripts/` so missed by the `server/scripts/` Phase 4 sweep
- [x] T048c Delete [server/testing/scripts/validateComplianceReportGeneration.js](server/testing/scripts/validateComplianceReportGeneration.js) — Mongo-only validation script; same reason as T048b
- [x] T048d Delete [server/examples/multiTenantRouteExample.js](server/examples/multiTenantRouteExample.js) — example file with inline `new mongoose.Schema(...)`; T008a flagged it but Phase 4 deletion missed it
- [x] T048e **Run a fresh seed against the empty PostgreSQL DBs** using the canonical seeder from T044/T045. ✅ COMPLETE (2026-05-02). Ran `node server/seed.js` successfully. Verified with `scripts/damage-assessment.js`: Main DB now has 27 rows (9 departments, 9 positions, 8 users, 1 holiday record). License DB still empty (will be populated when license server is used).

**Checkpoint**: All non-test scripts either deleted or converted. `grep -r "import mongoose\|require('mongoose')" scripts/ server/scripts/ server/testing/scripts/ server/examples/ --include="*.js"` returns zero matches.

---

## Phase 5: Category C — Test Files (~150 files)

**Purpose**: Restore test suite. Tests are the largest category but lowest risk because failures don't crash production.

**Strategy**: Group by directory. Each directory has consistent patterns — convert the first file carefully, then bulk-apply the same edits.

### C1: Test setup & helpers (do first — others depend on these)

- [ ] T049 Convert [server/testing/setup.js](server/testing/setup.js) — global test setup that calls `mongoose.connection.collections`. Replace with Sequelize truncate-all-tables pattern.
- [ ] T050 Convert [server/testing/task.test.js](server/testing/task.test.js) — top-level test using mongoose

### C2: Repository tests (~14 files)

- [ ] T051 Convert all tests in [server/testing/repositories/](server/testing/repositories/) (BaseRepository, GenericRepository, QueryBuilder, AttendanceRepository, TaskRepository, VacationRepository, PayrollRepository, OvertimeRepository, MissionRepository, DocumentRepository, DepartmentRepository, PositionRepository, TenantConfigRepository, UserRepository)
- [ ] T052 Convert all tests in [server/testing/repositories/platform/](server/testing/repositories/platform/) (LicenseRepository, CompanyRepository, SubscriptionRepository, PlatformUserRepository)

### C3: Model tests (~25 files)

- [ ] T053 Convert all `*.model.test.js` files in [server/testing/models/](server/testing/models/) — replace `new mongoose.Schema()` validation tests with Sequelize model validation tests

### C4: Controller tests (~20 files)

- [ ] T054 Convert all `*.controller.test.js` files in [server/testing/controllers/](server/testing/controllers/)

### C5: Service tests (~25 files)

- [ ] T055 Convert all property tests in [server/testing/services/](server/testing/services/) — heavy use of `mongoose.Types.ObjectId()`; replace with UUID generator
- [ ] T056 Convert non-property service tests in [server/testing/services/](server/testing/services/)

### C6: Integration & verification tests (~20 files)

- [ ] T057 Convert all tests in [server/testing/integration/](server/testing/integration/)
- [ ] T058 Convert all tests in [server/testing/verification/](server/testing/verification/)
- [ ] T059 Convert all tests in [server/testing/checkpoint/](server/testing/checkpoint/)

### C7: Module-specific tests (~15 files)

- [ ] T060 Convert tests in [server/testing/modules/life-insurance/](server/testing/modules/life-insurance/)
- [ ] T061 Convert tests in [server/testing/modules/hr-core/](server/testing/modules/hr-core/)
- [ ] T062 Convert tests in [server/testing/modules/email-service/](server/testing/modules/email-service/)
- [ ] T063 Convert remaining tests in [server/testing/](server/testing/) and [server/tests/](server/tests/) and [server/modules/**/__tests__/](server/modules/)

### C8: License server tests (~10 files)

- [ ] T064 Convert tests in [hrsm-license-server/src/__tests__/](hrsm-license-server/src/__tests__/)

### C9: Other test infrastructure

- [ ] T065 Convert [server/testing/middleware/](server/testing/middleware/) tests
- [ ] T066 Convert [server/testing/migrations/](server/testing/migrations/) tests (or delete if Mongo-only)
- [ ] T067 Convert [server/testing/scripts/](server/testing/scripts/) tests
- [ ] T068 Convert [server/testing/performance/](server/testing/performance/) tests
- [ ] T069 Convert [server/testing/core/](server/testing/core/) tests
- [ ] T070 Convert [server/testing/platform/](server/testing/platform/) tests
- [ ] T071 Convert any remaining test file outside the above groups

**Checkpoint**: `grep "import mongoose\|require('mongoose')" server/testing/ server/tests/ hrsm-license-server/src/__tests__/` returns zero matches. Test suite runs against PostgreSQL (passes or fails on logic, not on missing mongoose).

---

## Phase 6: Documentation Cleanup

**Purpose**: Update or archive Mongo-era documentation so it doesn't mislead future developers.

- [ ] T072 [P] Update [README.md](README.md) — remove MongoDB setup instructions, replace with PostgreSQL-only
- [ ] T073 [P] Archive Mongo-era migration docs to a `docs/archive/mongo-migration/` directory: `MIGRATION_RUNBOOK.md`, `STAGING_MIGRATION_GUIDE.md`, `STAGING_MIGRATION_QUICK_START.md`, `ROLLBACK_*.md`, `POSTGRESQL_MIGRATION_*.md`, `MONGOOSE_FILES_ANALYSIS.md`, `LEGACY_MODELS_CONVERSION_SUMMARY.md`, `MIGRATION_*.md`, `CONFIGURATION_MIGRATION_SUMMARY.md`, `DATA_MIGRATION_IMPLEMENTATION.md`, `TASK_25_*.md`, `LICENSE_SERVER_MODELS_CONVERTED.md`, `MAIN_SERVER_MIGRATION_NEEDED.md`, `NO_MORE_MODELS_TO_CONVERT.md`, `FIFTH_BATCH_*.md`, `SIXTH_BATCH_*.md`, `CONVERSION_COMPLETE_SUMMARY.md`, `ALL_CRITICAL_SERVICES_CONVERTED.md`, `REMAINING_MODEL_CONVERSIONS.md`, `MIGRATION_PROGRESS_SUMMARY.md`, `MIGRATION_CHECKPOINT_PHASE_3.md`, `POSTGRESQL_READINESS_REPORT.md`, `PRODUCTION_READINESS_CHECKLIST.md`, `TEST_FILES_*.md`
- [ ] T074 Update [FINAL_MIGRATION_SUMMARY.md](FINAL_MIGRATION_SUMMARY.md) — replace with an honest post-incident retrospective documenting what was done, what was lost, and what was rebuilt
- [ ] T075 Update [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) and [POSTGRESQL_QUICK_REFERENCE.md](POSTGRESQL_QUICK_REFERENCE.md) — PostgreSQL-only setup instructions
- [ ] T076 [P] Delete obsolete `.kiro/specs/mongodb-to-postgresql-migration/` (legacy spec — superseded by this one)
- [ ] T077 [P] Update or delete `docs/modernization/*.md` files that reference MongoDB
- [ ] T078 [P] Delete mongoose backup files: `server/modules/hr-core/missions/models/mission.model.js.bak2`, `server/modules/hr-core/models/AuditLog.mongoose.bak`, and any other `*.bak` mongoose files

---

## Phase 7: Decommissioning

**Purpose**: Final removal of mongoose at the dependency and config level. Only safe after Phases 3-6 are complete.

- [ ] T079 [P] Rename all `*.sequelize.js` files to drop the `.sequelize` suffix — once mongoose is fully removed, the naming distinction is no longer needed. Files to rename: all model files in `server/modules/*/models/*.sequelize.js`, `server/platform/*/models/*.sequelize.js`, service files like `prescriptionService.sequelize.js`, `visitService.sequelize.js`, `DocumentService.sequelize.js`, `ModuleManagementService.sequelize.js`, `subscriptionService.sequelize.js`, `healthCheckService.sequelize.js`, `usageTrackingService.sequelize.js`, `tenantProvisioningService.sequelize.js`, `tenantService.sequelize.js`, `alternativeBackupService.sequelize.js`, `backupService.sequelize.js`, `moduleAwareBackupService.sequelize.js`. Update all imports accordingly.
- [ ] T080 [P] Run `npm uninstall mongoose` in repo root
- [ ] T081 [P] Run `npm uninstall mongoose` in [hrsm-license-server/](hrsm-license-server/)
- [ ] T082 [P] Update root [package-lock.json](package-lock.json) and license server [package-lock.json](hrsm-license-server/package-lock.json) by re-running `npm install` in each
- [ ] T083 Remove from [.env](.env): `MONGO_URI`, `MONGODB_URI`, `LICENSE_SERVER_MONGODB_URI`, and any other Mongo-related vars
- [ ] T084 Delete [.env.mongodb-rollback](.env.mongodb-rollback) — credentials should also be rotated since they sat in plaintext on disk
- [ ] T085 Delete [.env.test](.env.test) Mongo references; update for PostgreSQL test database
- [ ] T086 Update [.gitignore](.gitignore) — remove the `.env.mongodb-rollback` entry (no longer needed)
- [ ] T087 Update [hrsm-license-server/.env.example](hrsm-license-server/.env.example) — remove MongoDB-related vars

---

## Phase 8: Final Verification

- [ ] T088 Run `grep -r "mongoose\|MongoClient\|MONGO_URI\|MONGODB_URI" --exclude-dir=node_modules --exclude-dir=docs/archive --exclude-dir=.git .` and confirm zero matches in non-archived files
- [ ] T089 Run [scripts/damage-assessment.js](scripts/damage-assessment.js) — confirm both DBs have all expected tables (no longer 0 in License DB)
- [ ] T090 Start both servers (`npm run start` in root and in `hrsm-license-server/`) — confirm clean startup with no errors
- [ ] T091 Run `npm test` in both projects — confirm test suite executes (passes or honest failures, no mongoose import errors)
- [ ] T092 Run a fresh seed (T044/T045 output) and verify a sample of records appear in [scripts/damage-assessment.js](scripts/damage-assessment.js) output
- [ ] T093 Smoke-test 3 critical workflows end-to-end: login, create employee, create leave request — confirm data persists in PostgreSQL
- [ ] T094 Final commit and tag: `mongodb-fully-removed`

---

## Dependencies & Execution Order

```
Phase 1 (DONE) → Phase 2 (audit + pattern) → Phase 3 (production code)
                                                    ↓
                                              Phase 4 (scripts) → Phase 5 (tests)
                                                    ↓
                                              Phase 6 (docs)
                                                    ↓
                                              Phase 7 (decommission)
                                                    ↓
                                              Phase 8 (verification)
```

**Critical**: Phase 7 (uninstalling mongoose npm) MUST be last. If you uninstall mongoose before all imports are removed, the entire codebase will fail to load.

Within each phase, tasks marked `[P]` can run in parallel by different developers or in batched edits.

---

## Realistic Timeline

| Phase | Tasks | Estimate (single dev) |
|-------|-------|----------------------|
| Phase 2 (inventory + pattern) | T005-T008 | 1 day |
| Phase 3 (production code) | T009-T038a | 1 week |
| Phase 4 (scripts) | T039-T048e | 2-3 days |
| Phase 5 (tests) | T049-T071 | 1.5-2 weeks |
| Phase 6 (docs) | T072-T078 | 1 day |
| Phase 7 (decommission) | T079-T087 | 0.5 day |
| Phase 8 (verification) | T088-T094 | 1 day |
| **Total** | **99 tasks** | **3-4 weeks** |

Parallel team strategy can compress this to 1.5-2 weeks.

---

## Notes

- **No more "data migration" tasks** — the source data is gone. Empty PostgreSQL is the starting point.
- **No more "rollback" tasks** — irreversible by definition now.
- **No more "smoke tests against migrated data"** — those tasks become "smoke tests against fresh seed data" in T091-T092.
- **MongoDB credentials still need rotation** (T083) even though clusters are deleted — defense in depth.
- **Pre-existing exposure**: [scripts/maintenance/auto-cleanup.js](scripts/maintenance/auto-cleanup.js) and [scripts/maintenance/cleanup-databases.js](scripts/maintenance/cleanup-databases.js) had hardcoded credentials before this incident; they are deleted in T042.
- **Documentation in `docs/archive/`** (T073) is intentionally retained — useful for future incident reviews and to remember why this happened.
