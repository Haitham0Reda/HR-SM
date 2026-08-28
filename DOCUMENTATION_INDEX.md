# HR-SM Platform Documentation Index

## ✅ PostgreSQL-Based Multi-Tenant SaaS Platform

**The MongoDB to PostgreSQL migration has been successfully completed.** Historical migration documentation has been archived to `docs/archive/` for reference purposes.

## Overview

This document provides a comprehensive index of all current documentation for the HR-SM application running on PostgreSQL. Use this as your starting point to navigate the complete documentation set.

## Quick Start

**New to the application?** Start here:
1. [Migration Runbook](./MIGRATION_RUNBOOK.md) - Step-by-step migration guide (for reference)
2. [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md) - Understand the schema
3. [Sequelize Models Reference](./docs/SEQUELIZE_MODELS_REFERENCE.md) - Learn the models

**Experiencing issues?** Go here:
1. [Troubleshooting Guide](./docs/POSTGRESQL_TROUBLESHOOTING.md) - Common problems and solutions

## Archived Migration Documentation

Historical migration documentation (progress reports, conversion summaries, and migration checkpoints) has been moved to **`docs/archive/`** for reference purposes. These documents track the migration process from MongoDB to PostgreSQL and are retained for historical context.

**Archived files include:**
- Migration progress summaries and checkpoints
- Model conversion reports
- Service conversion status documents
- Staging migration guides
- Legacy configuration summaries

**Note:** These archived documents are no longer actively maintained but are available for reference if you need to understand the migration history or troubleshoot legacy issues.

## Core Documentation

### 1. Migration Planning & Execution

#### [Migration Runbook](./MIGRATION_RUNBOOK.md)
**Purpose**: Complete step-by-step guide for executing the migration  
**Audience**: Database administrators, DevOps engineers  
**Contents**:
- Pre-migration checklist
- Prerequisites and environment setup
- Step-by-step migration procedures
- Validation and verification steps
- Rollback procedures
- Post-migration tasks
- Common migration patterns
- Migration metrics and reporting

**When to use**: Before, during, and after migration execution

---

#### [Rollback Plan](./ROLLBACK_PLAN.md)
**Purpose**: Detailed procedures for reverting to MongoDB if needed  
**Audience**: DevOps engineers, System administrators  
**Contents**:
- Rollback triggers and decision criteria
- Step-by-step rollback procedures
- Data restoration from backups
- Application configuration reversion
- Verification steps
- Communication templates

**When to use**: If critical issues arise during or after migration

---

### 2. Database Architecture & Schema

#### [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md)
**Purpose**: Comprehensive PostgreSQL schema reference  
**Audience**: Developers, Database administrators  
**Contents**:
- Database architecture overview
- Complete table definitions with SQL
- Data type mappings (MongoDB → PostgreSQL)
- Index strategy and definitions
- Relationship diagrams
- Constraints and foreign keys
- Multi-tenancy implementation
- Performance considerations

**When to use**: Understanding database structure, writing queries, troubleshooting

---

#### [Sequelize Models Reference](./docs/SEQUELIZE_MODELS_REFERENCE.md)
**Purpose**: Complete reference for all Sequelize models  
**Audience**: Backend developers  
**Contents**:
- Model structure and patterns
- All model definitions (License Server + Main App)
- Field descriptions and data types
- Model associations and relationships
- Scopes and hooks
- Instance and static methods
- Usage examples and best practices
- Migration from Mongoose comparison

**When to use**: Writing application code, understanding models, implementing features

---

### 3. Configuration & Setup

#### [PostgreSQL Configuration Guide](./POSTGRESQL_CONFIGURATION_GUIDE.md)
**Purpose**: Database connection and configuration reference  
**Audience**: DevOps engineers, System administrators  
**Contents**:
- Environment variables setup
- Connection string formats
- Connection pooling configuration
- SSL/TLS setup
- Cloud provider examples (AWS, GCP, Azure, Heroku)
- Performance tuning
- Troubleshooting connection issues

**When to use**: Setting up environments, configuring connections, optimizing performance

---

#### [Transaction Usage Guide](./TRANSACTION_USAGE_GUIDE.md)
**Purpose**: Guide for implementing transactions in Sequelize  
**Audience**: Backend developers  
**Contents**:
- Transaction basics
- Managed vs unmanaged transactions
- Isolation levels
- Error handling and rollback
- Best practices
- Common patterns
- Testing transactions

**When to use**: Implementing multi-step operations, ensuring data consistency

---

### 4. Operations & Maintenance

#### [Backup and Restore Guide](./POSTGRES_BACKUP_RESTORE_GUIDE.md)
**Purpose**: Complete backup and restore procedures  
**Audience**: System administrators, DevOps engineers  
**Contents**:
- Backup service overview
- Manual and automated backup procedures
- Backup formats (custom, SQL, tar, directory)
- Compression and encryption
- Restore procedures
- Backup scheduling (cron, PM2, Task Scheduler)
- Retention policies
- Verification and testing
- Monitoring and alerts
- Migration from MongoDB backups

**When to use**: Setting up backups, restoring data, disaster recovery

---

#### [PostgreSQL Verification Guide](./POSTGRESQL_VERIFICATION_GUIDE.md)
**Purpose**: Comprehensive verification of PostgreSQL functionality before production  
**Audience**: QA engineers, Database administrators, DevOps engineers  
**Contents**:
- 10 verification areas (CRUD, tenant isolation, relationships, transactions, etc.)
- Verification script usage and options
- Success criteria and failure scenarios
- Pre-migration checklist
- Troubleshooting verification issues
- CI/CD integration examples
- Report interpretation

**When to use**: Before production migration, after major changes, quality gates

---

#### [Verification Quick Start](./VERIFICATION_QUICK_START.md)
**Purpose**: Quick reference for running PostgreSQL verification  
**Audience**: All technical roles  
**Contents**:
- Quick commands for verification
- Test area summary table
- Prerequisites checklist
- Common issues and solutions
- Go/No-Go decision criteria
- Related commands

**When to use**: Quick verification runs, daily checks, pre-deployment validation

---

#### [Troubleshooting Guide](./docs/POSTGRESQL_TROUBLESHOOTING.md)
**Purpose**: Solutions to common PostgreSQL issues  
**Audience**: Developers, System administrators  
**Contents**:
- Connection issues (refused, authentication, timeouts)
- Performance problems (slow queries, memory, disk space)
- Data integrity issues (foreign keys, unique constraints)
- Query errors (syntax, column not found)
- Migration issues (failures, transformations)
- Backup/restore issues
- Multi-tenancy issues (data leakage, isolation)
- License validation issues
- Monitoring and diagnostics queries
- Health check queries

**When to use**: When encountering errors, performance issues, or unexpected behavior

---

### 5. Implementation Summaries

**Note:** Detailed migration implementation summaries have been archived to `docs/archive/`. The following documents remain for operational reference:

#### [Rollback Implementation Summary](./ROLLBACK_IMPLEMENTATION_SUMMARY.md)
**Purpose**: Summary of rollback implementation  
**Audience**: DevOps engineers  
**Contents**:
- Rollback script details
- Testing procedures
- Quick reference guide

---

### 6. Quick References

#### [PostgreSQL Quick Reference](./POSTGRESQL_QUICK_REFERENCE.md)
**Purpose**: Quick command reference for PostgreSQL  
**Audience**: Developers, Database administrators  
**Contents**:
- Common psql commands
- Useful SQL queries
- Performance queries
- Maintenance commands

---

#### [Rollback Quick Reference](./ROLLBACK_QUICK_REFERENCE.md)
**Purpose**: Quick reference for rollback procedures  
**Audience**: DevOps engineers  
**Contents**:
- Emergency rollback steps
- Key commands
- Verification checklist

---

## Documentation by Role

### For Database Administrators

**Essential Reading**:
1. [Migration Runbook](./MIGRATION_RUNBOOK.md)
2. [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md)
3. [PostgreSQL Configuration Guide](./POSTGRESQL_CONFIGURATION_GUIDE.md)
4. [Backup and Restore Guide](./POSTGRES_BACKUP_RESTORE_GUIDE.md)
5. [Troubleshooting Guide](./docs/POSTGRESQL_TROUBLESHOOTING.md)

**Quick References**:
- [PostgreSQL Quick Reference](./POSTGRESQL_QUICK_REFERENCE.md)

---

### For Backend Developers

**Essential Reading**:
1. [Sequelize Models Reference](./docs/SEQUELIZE_MODELS_REFERENCE.md)
2. [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md)
3. [Transaction Usage Guide](./TRANSACTION_USAGE_GUIDE.md)
4. [Troubleshooting Guide](./docs/POSTGRESQL_TROUBLESHOOTING.md)

**Configuration**:
- [PostgreSQL Configuration Guide](./POSTGRESQL_CONFIGURATION_GUIDE.md)

---

### For DevOps Engineers

**Essential Reading**:
1. [Migration Runbook](./MIGRATION_RUNBOOK.md)
2. [PostgreSQL Configuration Guide](./POSTGRESQL_CONFIGURATION_GUIDE.md)
3. [Backup and Restore Guide](./POSTGRES_BACKUP_RESTORE_GUIDE.md)
4. [Rollback Plan](./ROLLBACK_PLAN.md)
5. [Troubleshooting Guide](./docs/POSTGRESQL_TROUBLESHOOTING.md)

**Quick References**:
- [Rollback Quick Reference](./ROLLBACK_QUICK_REFERENCE.md)
- [PostgreSQL Quick Reference](./POSTGRESQL_QUICK_REFERENCE.md)

---

### For System Administrators

**Essential Reading**:
1. [PostgreSQL Configuration Guide](./POSTGRESQL_CONFIGURATION_GUIDE.md)
2. [Backup and Restore Guide](./POSTGRES_BACKUP_RESTORE_GUIDE.md)
3. [Troubleshooting Guide](./docs/POSTGRESQL_TROUBLESHOOTING.md)

**Operations**:
- [Migration Runbook](./MIGRATION_RUNBOOK.md)
- [Rollback Plan](./ROLLBACK_PLAN.md)

---

## Documentation by Task

### Understanding the Database
1. [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md) - Complete schema reference
2. [Sequelize Models Reference](./docs/SEQUELIZE_MODELS_REFERENCE.md) - Model API and usage

### Planning Migration (Historical Reference)
1. [Migration Runbook](./MIGRATION_RUNBOOK.md) - Migration procedures (completed)
2. [Rollback Plan](./ROLLBACK_PLAN.md) - Rollback procedures
3. **Archived**: See `docs/archive/` for historical migration planning documents

### Executing Migration (Historical Reference)
**Note:** Migration has been completed. See `docs/archive/` for historical execution documentation.

### Verifying PostgreSQL Functionality
1. [PostgreSQL Verification Guide](./POSTGRESQL_VERIFICATION_GUIDE.md) - Complete verification procedures
2. [Verification Quick Start](./VERIFICATION_QUICK_START.md) - Quick commands
3. [Troubleshooting Guide](./docs/POSTGRESQL_TROUBLESHOOTING.md) - Fix verification issues

### Configuring Application
1. [PostgreSQL Configuration Guide](./POSTGRESQL_CONFIGURATION_GUIDE.md) - Connection setup
2. [Configuration Migration Summary](./CONFIGURATION_MIGRATION_SUMMARY.md) - Changes needed
3. [Sequelize Models Reference](./docs/SEQUELIZE_MODELS_REFERENCE.md) - Model usage

### Setting Up Backups
1. [Backup and Restore Guide](./POSTGRES_BACKUP_RESTORE_GUIDE.md) - Complete procedures
2. [PostgreSQL Configuration Guide](./POSTGRESQL_CONFIGURATION_GUIDE.md) - Configuration

### Troubleshooting Issues
1. [Troubleshooting Guide](./docs/POSTGRESQL_TROUBLESHOOTING.md) - Problem solutions
2. [PostgreSQL Quick Reference](./POSTGRESQL_QUICK_REFERENCE.md) - Quick commands
3. [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md) - Schema reference

### Writing Application Code
1. [Sequelize Models Reference](./docs/SEQUELIZE_MODELS_REFERENCE.md) - Model API
2. [Transaction Usage Guide](./TRANSACTION_USAGE_GUIDE.md) - Transaction patterns
3. [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md) - Schema understanding

### Performing Rollback
1. [Rollback Plan](./ROLLBACK_PLAN.md) - Detailed procedures
2. [Rollback Quick Reference](./ROLLBACK_QUICK_REFERENCE.md) - Quick steps
3. [Rollback Implementation Summary](./ROLLBACK_IMPLEMENTATION_SUMMARY.md) - Technical details

---

## Key Concepts

### Multi-Tenancy
- **Current Architecture**: Single PostgreSQL database with `tenant_id` column for data isolation
- **Documentation**: [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md#multi-tenancy-model)

### Two-Database Architecture
- **License Server Database**: `hrsm-licenses` (tenant metadata, licenses, subscriptions)
- **Main Application Database**: `hrsm_platform` (HR business data)
- **Documentation**: [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md#database-architecture)

### Data Types
- UUID for primary keys
- JSONB for flexible data structures
- Foreign Keys for relationships
- **Documentation**: [Database Schema Documentation](./docs/DATABASE_SCHEMA_POSTGRESQL.md#data-types-reference)

### Connection Pooling
- Separate pools for each database
- Configurable pool sizes
- **Documentation**: [PostgreSQL Configuration Guide](./POSTGRESQL_CONFIGURATION_GUIDE.md#connection-pooling)

---

## Additional Resources

### External Documentation
- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [Sequelize Official Documentation](https://sequelize.org/docs/)
- [Node.js PostgreSQL Best Practices](https://node-postgres.com/)

### Tools
- **psql**: PostgreSQL command-line client
- **pg_dump**: Backup utility
- **pg_restore**: Restore utility
- **pgAdmin**: GUI administration tool
- **DBeaver**: Universal database tool

### Support
- **Database Team**: database-team@company.com
- **DevOps Team**: devops@company.com
- **Documentation Issues**: Create issue in project repository

---

## Document Status

| Document | Version | Last Updated | Status |
|----------|---------|--------------|--------|
| Migration Runbook | 1.1 | 2026-04-06 | ✅ Complete |
| Database Schema Documentation | 1.0 | 2026-04-06 | ✅ Complete |
| Sequelize Models Reference | 1.0 | 2026-04-06 | ✅ Complete |
| PostgreSQL Configuration Guide | 1.0 | 2026-04-06 | ✅ Complete |
| Backup and Restore Guide | 1.0 | 2026-04-06 | ✅ Complete |
| PostgreSQL Verification Guide | 1.0 | 2026-04-06 | ✅ Complete |
| Verification Quick Start | 1.0 | 2026-04-06 | ✅ Complete |
| Troubleshooting Guide | 1.0 | 2026-04-06 | ✅ Complete |
| Transaction Usage Guide | 1.0 | 2026-04-06 | ✅ Complete |
| Rollback Plan | 1.0 | 2026-04-06 | ✅ Complete |

---

## Feedback

Found an issue or have suggestions for improving the documentation?

1. **For urgent issues**: Contact the database team
2. **For documentation improvements**: Create an issue in the project repository
3. **For questions**: Reach out to your team lead

---

**Last Updated**: April 6, 2026  
**Version**: 1.0  
**Maintained by**: Database Team & DevOps Team
