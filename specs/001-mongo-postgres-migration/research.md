# Research: MongoDB to PostgreSQL Migration

**Feature**: Database Hard Cutover
**Date**: 2026-04-29
**Branch**: `001-mongo-postgres-migration`

## Migration State (Current Baseline)

**Decision**: Complete the remaining 57% of service conversions before running the data migration script.
**Rationale**: PostgreSQL infrastructure is production-ready. Completing all service conversions first ensures no Mongoose code remains that could write to MongoDB after the data migration runs — preventing data divergence.
**Alternatives considered**: Running data migration before finishing service conversions — rejected because any service still using Mongoose could write to MongoDB post-migration and create a split-brain data state.

---

## Remaining Work Inventory

### Services Requiring Conversion (4 total, ~3,200 lines)

| Service | Lines | Depends On | Convert Order |
|---------|-------|-----------|---------------|
| `performanceMonitoring.service.js` | ~800 | systemMetrics ✅, performanceAlert ✅ | 1st |
| `dataRetentionService.js` | ~700 | AuditLog ✅ | 2nd |
| `licenseComplianceService.js` | ~841 | License ✅, Tenant ✅ | 3rd |
| `complianceReportingService.js` | ~847 | licenseComplianceService (above) | 4th |

Convert in dependency order: a service must be converted before any service that imports it.

### Old Mongoose Model Files to Remove

After services are converted, these files should be deleted (Sequelize equivalents already exist):

- `hrsm-license-server/src/models/License.js` → replaced by `license.model.js`
- `hrsm-license-server/src/models/Tenant.js` → replaced by `tenant.model.js`
- Any other `.js` model files in `hrsm-license-server/src/models/` not suffixed `.model.js` that use `mongoose.Schema`

---

## Established Conversion Pattern

**Decision**: Apply the same conversion pattern used in the 3 already-converted services (auditService, securityEventTracking, alertSystem).
**Rationale**: Patterns are proven, documented by prior work, and consistent across the codebase.

### Mongoose → Sequelize Query Mapping

| Mongoose | Sequelize |
|----------|-----------|
| `Model.find({})` | `Model.findAll({ where: {} })` |
| `Model.findById(id)` | `Model.findByPk(id)` |
| `Model.findOne({ field })` | `Model.findOne({ where: { field } })` |
| `new Model({}).save()` | `Model.create({})` |
| `Model.findByIdAndUpdate(id, data)` | `Model.update(data, { where: { id } })` |
| `Model.findByIdAndDelete(id)` | `Model.destroy({ where: { id } })` |
| `Model.countDocuments()` | `Model.count()` |
| `ObjectId` references | UUID or integer foreign keys |

### Import Pattern

```js
// Before (Mongoose)
import mongoose from 'mongoose';
const Model = mongoose.model('ModelName');

// After (Sequelize)
import { Model } from '../models/model.model.js';
```

---

## Data Migration Script

**Decision**: Use the existing `scripts/migrate-mongo-to-postgres.js` with a mandatory dry-run validation step before the live run.
**Rationale**: Script already handles ObjectId → UUID conversion, tenant_id injection, and batching. Dry-run ensures all collections transfer cleanly before committing.

### Pre-flight Steps

1. Run `node scripts/migrate-mongo-to-postgres.js --dry-run` in staging
2. Verify per-entity record counts match source
3. Run live migration only after dry-run shows 0 discrepancies
4. After live run, re-validate counts and spot-check 10 random records per entity

### Collections to Migrate

All MongoDB collections must be covered by the migration script. Confirm coverage includes:

- tenants, licenses, license_audits, audit_logs, enabled_modules, subscriptions
- security_events, system_metrics, system_alerts, performance_alerts
- employees, departments, leave_requests, payroll_records, attendance_records (verify in main server)

---

## MongoDB Dependency Removal

**Decision**: Remove Mongoose only after all services are converted AND data migration is validated.
**Rationale**: Removing Mongoose before conversion breaks imports. Removing before validation eliminates the rollback path.

### Removal Checklist

- [ ] Remove `mongoose` from `package.json`
- [ ] Remove `mongoose` from `hrsm-license-server/package.json`
- [ ] Delete old Mongoose model files (see list above)
- [ ] Remove all `mongoose.connect()` / `mongoose.connection` calls from server startup files
- [ ] Remove MongoDB URI environment variables from `.env` files (or move to `.env.decommissioned`)
- [ ] Run `npm install` to update lockfile

---

## Rollback Strategy

**Decision**: Keep MongoDB running and intact until validation sign-off; rollback = re-enable Mongoose connection config.
**Rationale**: Hard cutover but safe — MongoDB data is not deleted or shut down until after validation passes and the team signs off.

### Rollback Procedure (if validation fails, within 30-minute window)

1. Re-enable MongoDB URI environment variables
2. Restore `mongoose.connect()` in server startup (from git history)
3. Restart services pointing to MongoDB
4. Confirm system is operational on MongoDB
5. Investigate the failure before scheduling a retry

---

## Validation Approach

**Decision**: Automated record-count comparison + spot-check sampling per entity type.
**Rationale**: Full record-by-record comparison is impractical at scale; count + sampling gives sufficient confidence for a maintenance-window cutover.

### Validation Report Contents

- Per-entity: source count vs. destination count (must be equal)
- Sample check: 10 random records per entity compared field-by-field
- Relationship integrity: foreign key reference counts match source join counts
- Overall: pass (all counts match, no sample mismatches) or fail (any discrepancy)
