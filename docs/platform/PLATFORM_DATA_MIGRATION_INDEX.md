# Platform Data Migration Documentation Index

## Overview

This index provides quick access to all documentation related to the platform data migration project. The migration separates platform control data (tenant metadata, subscriptions, modules) from business operations data.

---

## Documentation Structure

### 1. Migration Runbook
**File:** [PLATFORM_DATA_MIGRATION_RUNBOOK.md](./PLATFORM_DATA_MIGRATION_RUNBOOK.md)

**Purpose:** Step-by-step guide for executing the migration

**Contents:**
- Pre-migration checklist
- Migration execution steps (5 phases)
- Post-migration verification
- Rollback procedures
- Success criteria
- Post-migration tasks

**Use when:**
- Planning the migration
- Executing the migration
- Verifying migration success
- Rolling back if needed

---

### 2. API Documentation
**File:** [LICENSE_SERVER_API_DOCUMENTATION.md](./LICENSE_SERVER_API_DOCUMENTATION.md)

**Purpose:** Complete reference for License Server REST API

**Contents:**
- Authentication and authorization
- Tenant management endpoints
- Module management endpoints
- Subscription management endpoints
- License validation endpoints
- Error responses and codes
- SDK examples (JavaScript, Python)

**Use when:**
- Integrating with License Server
- Developing API clients
- Troubleshooting API issues
- Understanding authentication

---

### 3. Architecture Documentation
**File:** [PLATFORM_DATA_MIGRATION_ARCHITECTURE.md](./PLATFORM_DATA_MIGRATION_ARCHITECTURE.md)

**Purpose:** Detailed system architecture and design

**Contents:**
- Architectural principles
- System architecture diagrams
- Data flow diagrams
- Component details
- Database schemas
- Security architecture
- Performance optimization
- Scalability considerations

**Use when:**
- Understanding system design
- Planning infrastructure
- Onboarding new developers
- Making architectural decisions

---

### 4. Troubleshooting Guide
**File:** [PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md](./PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md)

**Purpose:** Solutions to common issues and problems

**Contents:**
- Migration issues
- API connection issues
- Authentication/authorization issues
- Cache issues
- Performance issues
- Data integrity issues
- Error message reference
- Recovery procedures
- Diagnostic tools

**Use when:**
- Encountering errors
- Debugging issues
- Recovering from failures
- Investigating performance problems

---

## Quick Reference

### Common Tasks

#### Execute Migration
```bash
# See: PLATFORM_DATA_MIGRATION_RUNBOOK.md
node server/scripts/migrations/cli/migrationCli.js --execute
```

#### Query License Server API
```bash
# See: LICENSE_SERVER_API_DOCUMENTATION.md
curl -H "X-API-Key: YOUR_KEY" http://localhost:4000/api/tenants/TENANT_ID
```

#### Troubleshoot Cache Issues
```bash
# See: PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md
node server/scripts/migrations/cli/migrationCli.js --refresh-cache
```

#### Rollback Migration
```bash
# See: PLATFORM_DATA_MIGRATION_RUNBOOK.md
node server/scripts/migrations/cli/migrationCli.js --rollback
```

---

## Related Documentation

### Specification Documents
- **Requirements:** `.kiro/specs/platform-data-migration/requirements.md`
- **Design:** `.kiro/specs/platform-data-migration/design.md`
- **Tasks:** `.kiro/specs/platform-data-migration/tasks.md`

### Implementation Documentation
- **Migration CLI:** `server/scripts/migrations/cli/README.md`
- **Task 19 Summary:** `server/scripts/migrations/TASK_19_IMPLEMENTATION_SUMMARY.md`

### Existing Documentation
- **License Management:** `docs/LICENSE_MANAGEMENT.md`
- **Multi-Tenant Architecture:** `docs/MULTI_TENANT_README.md`
- **Database Architecture:** `DATABASE_ARCHITECTURE_EXPLANATION.md`

---

## Document Maintenance

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-27 | Initial documentation | Platform Team |

### Review Schedule

- **Quarterly Review:** Update for any architectural changes
- **Post-Migration Review:** Update based on lessons learned
- **Annual Review:** Comprehensive documentation audit

### Feedback

To provide feedback or suggest improvements:
- Create issue in project repository
- Email: platform-team@company.com
- Slack: #platform-migration

---

## Getting Started

### For Developers

1. Read [Architecture Documentation](./PLATFORM_DATA_MIGRATION_ARCHITECTURE.md) to understand the system
2. Review [API Documentation](./LICENSE_SERVER_API_DOCUMENTATION.md) for integration details
3. Keep [Troubleshooting Guide](./PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md) handy for issues

### For Operations

1. Study [Migration Runbook](./PLATFORM_DATA_MIGRATION_RUNBOOK.md) thoroughly
2. Familiarize yourself with [Troubleshooting Guide](./PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md)
3. Review [Architecture Documentation](./PLATFORM_DATA_MIGRATION_ARCHITECTURE.md) for system understanding

### For Support

1. Keep [Troubleshooting Guide](./PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md) accessible
2. Reference [API Documentation](./LICENSE_SERVER_API_DOCUMENTATION.md) for API issues
3. Escalate using procedures in Troubleshooting Guide

---

## Support

**Documentation Issues:**
- Report missing or incorrect information
- Suggest improvements
- Request clarifications

**Technical Support:**
- Slack: #platform-migration
- Email: platform-team@company.com
- Emergency: [On-call contact]

---

**Last Updated:** 2026-01-27  
**Maintained By:** Platform Architecture Team
