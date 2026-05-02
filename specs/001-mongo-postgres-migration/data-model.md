# Data Model: MongoDB to PostgreSQL Mapping

**Feature**: Database Hard Cutover
**Date**: 2026-04-29
**Branch**: `001-mongo-postgres-migration`

## Database Architecture

Two separate PostgreSQL databases (separate Sequelize instances, no cross-DB SQL foreign keys):

| Database | Sequelize Instance | Used By |
|----------|--------------------|---------|
| `License` | `licenseServerDb` | License server (hrsm-license-server/) |
| `HR-SM` | `mainAppDb` | Main HR server (server/) |

> **Identifier note**: Both database names use case-sensitive characters (`License` is mixed-case; `HR-SM` contains a hyphen). PostgreSQL folds unquoted identifiers to lowercase and rejects hyphens, so any raw SQL must double-quote the database name: `"License"`, `"HR-SM"`. Sequelize handles this transparently.

Cross-database relationships (e.g., a license referencing a tenant that lives in the other DB) are resolved at the application service layer.

---

## License Server Entities (`License`)

### Tenant

| Field | PostgreSQL Type | Notes |
|-------|----------------|-------|
| id | UUID (PK) | Converted from MongoDB ObjectId |
| name | VARCHAR(255) NOT NULL | Organization name |
| slug | VARCHAR(100) UNIQUE | URL-safe identifier |
| status | ENUM('active','suspended','trial') | |
| contact_email | VARCHAR(255) | |
| created_at | TIMESTAMPTZ | Auto-managed by Sequelize |
| updated_at | TIMESTAMPTZ | Auto-managed by Sequelize |

**Sequelize model**: `hrsm-license-server/src/models/tenant.model.js` ✅

### License

| Field | PostgreSQL Type | Notes |
|-------|----------------|-------|
| id | UUID (PK) | |
| tenant_id | UUID (FK → tenants.id) NOT NULL | |
| license_key | VARCHAR(255) UNIQUE NOT NULL | |
| modules | JSONB | Array of enabled module names |
| valid_from | TIMESTAMPTZ NOT NULL | |
| valid_until | TIMESTAMPTZ | NULL = perpetual |
| max_users | INTEGER | NULL = unlimited |
| status | ENUM('active','expired','suspended') | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Sequelize model**: `hrsm-license-server/src/models/license.model.js` ✅

### LicenseAudit

| Field | PostgreSQL Type | Notes |
|-------|----------------|-------|
| id | UUID (PK) | |
| license_id | UUID (FK → licenses.id) | |
| tenant_id | UUID (FK → tenants.id) | |
| action | VARCHAR(100) NOT NULL | e.g., 'activated', 'expired' |
| details | JSONB | Action metadata |
| performed_by | VARCHAR(255) | Admin or system identifier |
| performed_at | TIMESTAMPTZ NOT NULL | |

**Sequelize model**: `hrsm-license-server/src/models/LicenseAudit.js` ✅

### Subscription

| Field | PostgreSQL Type | Notes |
|-------|----------------|-------|
| id | UUID (PK) | |
| tenant_id | UUID (FK → tenants.id) | |
| plan | VARCHAR(100) | e.g., 'starter', 'professional', 'enterprise' |
| billing_cycle | ENUM('monthly','annual') | |
| status | ENUM('active','cancelled','past_due') | |
| started_at | TIMESTAMPTZ | |
| ends_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Sequelize model**: `hrsm-license-server/src/models/subscription.model.js` ✅

### EnabledModule

| Field | PostgreSQL Type | Notes |
|-------|----------------|-------|
| id | UUID (PK) | |
| license_id | UUID (FK → licenses.id) | |
| module_name | VARCHAR(100) NOT NULL | |
| enabled_at | TIMESTAMPTZ | |

**Sequelize model**: `hrsm-license-server/src/models/enabledModule.model.js` ✅

### AuditLog (License Server)

| Field | PostgreSQL Type | Notes |
|-------|----------------|-------|
| id | UUID (PK) | |
| tenant_id | UUID | |
| entity_type | VARCHAR(100) | 'license', 'tenant', etc. |
| entity_id | UUID | |
| action | VARCHAR(50) | create/update/delete |
| changes | JSONB | Before/after snapshot |
| performed_by | VARCHAR(255) | |
| performed_at | TIMESTAMPTZ NOT NULL | |

**Sequelize model**: `hrsm-license-server/src/models/AuditLog.js` ✅

---

## Main Server Entities (`HR-SM`)

### System Monitoring (all Sequelize ✅)

| Entity | Table | Model File |
|--------|-------|-----------|
| SecurityEvent | security_events | server/platform/system/models/securityEvent.model.js |
| SystemMetric | system_metrics | server/platform/system/models/systemMetrics.model.js |
| SystemAlert | system_alerts | server/platform/system/models/systemAlert.model.js |
| PerformanceAlert | performance_alerts | server/platform/system/models/performanceAlert.model.js |

### HR Entities (verify Sequelize models exist in server/models/ or server/modules/)

The following entities are referenced in the spec and must be confirmed to have Sequelize models before the data migration script runs. If a Sequelize model does not exist, it must be created following the license server model pattern.

| Entity | Expected Table | Verify Path |
|--------|---------------|-------------|
| Employee | employees | server/models/ or server/modules/employee/ |
| Department | departments | server/models/ or server/modules/department/ |
| Position | positions | server/models/ or server/modules/position/ |
| LeaveRequest | leave_requests | server/modules/leave/ |
| PayrollRecord | payroll_records | server/modules/payroll/ |
| AttendanceRecord | attendance_records | server/modules/attendance/ |

---

## ID Migration Convention

All MongoDB ObjectIds (24-character hex strings) are converted to PostgreSQL UUIDs (v4) by the migration script. This is already implemented in `scripts/migrate-mongo-to-postgres.js`.

**Impact on application code**: Any service that constructs or compares IDs as ObjectId strings must be updated to use UUID strings after conversion.

---

## Sequelize Association Summary (License Server)

```
Tenant  ──< License       (tenant_id)
Tenant  ──< Subscription  (tenant_id)
License ──< LicenseAudit  (license_id)
License ──< EnabledModule (license_id)
```

All associations are defined in the respective model files. Verify `associate()` methods are called during Sequelize initialization in `hrsm-license-server/src/server.js`.
