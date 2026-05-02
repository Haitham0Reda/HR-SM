# Quickstart: MongoDB to PostgreSQL Hard Cutover

**Feature**: Database Hard Cutover
**Date**: 2026-04-29
**Branch**: `001-mongo-postgres-migration`

This guide walks through the complete migration process from start to finish. Execute steps in order. Do not skip ahead.

---

## Prerequisites

Before starting the maintenance window, verify:

- [ ] PostgreSQL running and accessible at `localhost:5432`
- [ ] Both databases exist: `HR-SM` (main server) and `License` (license server) — note hyphen and mixed-case; quote in raw SQL as `"HR-SM"` / `"License"`
- [ ] MongoDB is running and accessible (source — needed for data migration script)
- [ ] Full MongoDB backup completed (`mongodump` or cloud snapshot)
- [ ] All 4 remaining services have been converted (see Phase 1 of tasks.md)
- [ ] Migration tested successfully in staging environment (dry-run passed)
- [ ] Rollback procedure understood by on-call engineer

---

## Step 1: Take the System Offline

Put the HR system into maintenance mode. No users should be able to write data during migration.

```bash
# Stop application processes (adjust for your process manager)
pm2 stop all
# OR
systemctl stop hrsm-server hrsm-license-server
```

Verify no active connections are writing to MongoDB before proceeding.

---

## Step 2: Run the Migration Script (Dry Run)

```bash
node scripts/migrate-mongo-to-postgres.js --dry-run
```

Review the output:
- Every collection must show source count > 0
- Destination count must show expected table structure
- Zero errors in the log

Do not proceed if the dry run reports any errors.

---

## Step 3: Run the Live Migration

```bash
node scripts/migrate-mongo-to-postgres.js
```

The script will:
1. Connect to MongoDB and read each collection in batches
2. Convert ObjectIds to UUIDs
3. Insert records into the corresponding PostgreSQL tables
4. Log progress and any conversion issues

Estimated duration: 30–90 minutes depending on data volume (within the 4-hour window).

---

## Step 4: Validate the Migration

Run the validation check to confirm all records transferred:

```bash
node scripts/migrate-mongo-to-postgres.js --validate
```

The validation report must show:
- ✅ 100% record count match for every entity type
- ✅ Spot-check samples pass for every entity type
- ✅ Relationship integrity checks pass

If validation fails → **go to Rollback Procedure** below.

---

## Step 5: Restart Services (PostgreSQL Only)

With MongoDB connection variables removed or disabled, restart the application:

```bash
# Verify MONGO_URI is not set in environment
unset MONGO_URI
unset MONGO_LICENSE_URI

# Start services
pm2 start all
# OR
systemctl start hrsm-server hrsm-license-server
```

---

## Step 6: Smoke Test

With the system running on PostgreSQL only, verify core workflows:

- [ ] Login works
- [ ] Employee list loads with correct data
- [ ] Submit a test leave request — confirm it saves and retrieves correctly
- [ ] License validation returns correct modules for a tenant
- [ ] Audit log records the smoke test actions

If any check fails → **go to Rollback Procedure** below.

---

## Step 7: Sign Off and Decommission MongoDB

After smoke tests pass and the team signs off:

1. Remove Mongoose from dependencies:
   ```bash
   npm uninstall mongoose
   cd hrsm-license-server && npm uninstall mongoose && cd ..
   ```

2. Delete old Mongoose model files:
   - `hrsm-license-server/src/models/License.js` (old Mongoose version)
   - `hrsm-license-server/src/models/Tenant.js` (old Mongoose version)

3. Archive MongoDB connection strings to a secure vault (do not delete immediately — keep for 30 days as a reference).

4. Schedule MongoDB server shutdown after 30-day retention period.

---

## Rollback Procedure

Execute only if validation (Step 4) or smoke tests (Step 6) fail:

1. Stop application services immediately
2. Re-enable MongoDB environment variables:
   ```bash
   export MONGO_URI="<original connection string>"
   export MONGO_LICENSE_URI="<original license server connection string>"
   ```
3. Restore previous server startup code from git:
   ```bash
   git stash   # or git checkout <previous-commit> -- server/server.js
   ```
4. Restart services — confirm they connect to MongoDB
5. Verify all features operational on MongoDB
6. Document the failure and schedule a root cause analysis before retrying

**Target**: Full rollback completed within 30 minutes of initiating.

---

## Monitoring After Cutover

For the first 48 hours after cutover, monitor:

- Application error logs for any Mongoose-related import errors
- PostgreSQL query performance (slow query log)
- Database connection pool metrics
- All HR workflow logs (leave, payroll, attendance) for unexpected errors
