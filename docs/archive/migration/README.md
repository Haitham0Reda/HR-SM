# Migration Documentation Archive

**Status:** ✅ Migration Complete — Archived for Historical Reference

## Overview

This directory contains historical migration documentation from the MongoDB → PostgreSQL migration and other platform modernization efforts. These documents record the migration journey, decisions, and implementation details for reference and audit purposes.

## Contents

### MongoDB → PostgreSQL Migration (2026)

Core migration documents tracking the database platform transition:

- `MIGRATION_RUNBOOK.md` - Step-by-step migration execution guide
- `PLATFORM_DATA_MIGRATION_RUNBOOK.md` - Platform data migration procedures
- `PLATFORM_DATA_MIGRATION_ARCHITECTURE.md` - Architecture decisions and patterns
- `PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md` - Migration issue resolution
- `MIGRATION_PROGRESS_SUMMARY.md` - Periodic progress reports
- `MIGRATION_CHECKPOINT_PHASE_3.md` - Phase checkpoint documentation
- Migration batch completion reports (FIVE_MODELS, SECOND_FIVE_MODELS, etc.)
- Service and model conversion summaries
- Configuration migration summaries
- Final migration summaries and verification reports

### Date Format Migration (2026)

- `DATE-FORMAT-MIGRATION.md` - Standardization to dd/mm/yyyy format

### Modular Architecture Migration (2026)

- `MIGRATION_GUIDE.md` - Modular HRMS system restructuring
- `MIGRATION_COMPLETE_SUMMARY.md` - Platform data migration completion
- `TENANT_MIGRATION_READY.md` - Tenant migration readiness

## Current Documentation

**Actively maintained documentation** for the current PostgreSQL-based platform is located in the main `docs/` directory:

- `docs/DOCUMENTATION_INDEX.md` - Primary documentation index (current)
- `docs/START_HERE.md` - Getting started guide
- `docs/ARCHITECTURE.md` - System architecture overview
- `docs/API_DOCUMENTATION.md` - API reference
- `docs/DATABASE_SCHEMA_POSTGRESQL.md` - Current database schema
- `docs/SEQUELIZE_MODELS_REFERENCE.md` - Sequelize models
- And 200+ additional guides in `docs/`

## Historical Context

These archived documents reflect the migration process from a legacy MongoDB-based architecture to the current PostgreSQL multi-tenant SaaS platform. The migration was completed in January 2026.

**Do not rely on these archived documents for current implementation guidance** — they describe historical processes that are no longer relevant to day-to-day development. For current development practices, refer to the main `docs/` directory.

## Questions?

For questions about the current platform, see `docs/START_HERE.md` or `docs/DOCUMENTATION_INDEX.md`.
