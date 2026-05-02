# Implementation Plan: MongoDB to PostgreSQL Hard Cutover

**Branch**: `001-mongo-postgres-migration` | **Date**: 2026-04-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-mongo-postgres-migration/spec.md`

## Summary

Migrate the HR-SM system fully from MongoDB/Mongoose to PostgreSQL/Sequelize by completing the remaining 57% of service conversions (~3,200 lines across 4 services), running the existing data migration script against all collections, removing all Mongoose/MongoDB dependencies, and decommissioning MongoDB. The migration executes as a scheduled maintenance-window hard cutover with automated validation and a 30-minute rollback capability.

## Technical Context

**Language/Version**: JavaScript (Node.js 18+)
**Primary Dependencies**: Express 4.19.2, Sequelize 6.37.8, pg 8.20.0, Redis 5.10.0
**Removing**: Mongoose 8.19.2 (full removal after cutover)
**Storage**: PostgreSQL — `HR-SM` (main server) + `License` (license server), both on pg 8.20.0. Note: `HR-SM` contains a hyphen and `License` is mixed-case, so any raw SQL must double-quote the identifiers (`"HR-SM"`, `"License"`); Sequelize handles this transparently. MongoDB (source — decommissioned post-cutover)
**Testing**: Integration tests against PostgreSQL; migration script dry-run mode for pre-flight validation
**Target Platform**: Linux/Windows server (multi-platform Node.js runtime)
**Project Type**: Multi-tenant REST API web service (main server + license server, same repo)
**Performance Goals**: Full migration completes within 4-hour maintenance window
**Constraints**: Zero data loss; rollback to MongoDB within 30 minutes if post-migration validation fails
**Scale/Scope**: 2 service groups (main server + license server), 8 primary entity types, 4 services pending conversion (~3,200 lines)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is an unfilled template — no project-specific architectural gates are defined. No violations apply. No complexity justification required.

**Post-design re-check**: No constitution gates to re-evaluate after Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/001-mongo-postgres-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
server/
├── config/
│   └── database.js                        # Sequelize + PostgreSQL config (keep, update)
├── middleware/                             # Already partially migrated — keep
└── services/
    ├── performanceMonitoring.service.js   # ~800 lines — convert Mongoose → Sequelize
    ├── licenseComplianceService.js        # ~841 lines — convert Mongoose → Sequelize
    ├── complianceReportingService.js      # ~847 lines — convert Mongoose → Sequelize
    └── dataRetentionService.js            # ~700 lines — convert Mongoose → Sequelize

hrsm-license-server/
└── src/
    ├── models/                            # Remove old Mongoose models; keep Sequelize
    ├── services/                          # auditService ✅ — others may need review
    └── server.js                          # Remove mongoose.connect(), keep Sequelize init

scripts/
└── migrate-mongo-to-postgres.js          # Complete and run (dry-run first, then live)

package.json                              # Remove mongoose after cutover
hrsm-license-server/package.json         # Remove mongoose after cutover
```

**Structure Decision**: Single repository with two service groups. No new top-level directories are needed. All work is conversion and removal within existing files.

## Complexity Tracking

> Not applicable — no constitution gates defined or violated.
