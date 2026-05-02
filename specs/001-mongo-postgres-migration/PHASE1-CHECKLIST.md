# Phase 1: Setup - Team Checklist

**Quick Reference**: Use this checklist to track Phase 1 completion before moving to Phase 2.

---

## Automated Tasks ✅

- [x] **T001**: PostgreSQL database connectivity verified
  - [x] License database (`License`) reachable at localhost:5432
  - [x] Main database (`HR-SM`) reachable at localhost:5432
  - [x] Verification script created: `scripts/verify-phase1-setup.js`
  - [x] Verification report generated: `specs/001-mongo-postgres-migration/phase1-verification-report.md`

- [x] **T004**: Rollback documentation created
  - [x] `.env.mongodb-rollback` file created with MongoDB connection strings
  - [x] Rollback procedure documented (30-minute target)
  - [x] Retention period set (expires 2026-05-29)
  - [x] File added to `.gitignore` for security

---

## Manual Tasks ⚠️ ACTION REQUIRED

### T002: MongoDB Backup
**Owner**: _________________ (DevOps/Database Admin)  
**Due Date**: _________________ (Within 1 business day)

- [ ] Install MongoDB Database Tools
- [ ] Execute backup command:
  ```bash
  mongodump --uri="mongodb+srv://devhaithammoreda_db_user:****@cluster.uwhj601.mongodb.net/hrsm_admin?retryWrites=true&w=majority" --out=./backups/mongodb-backup-$(date +%Y%m%d-%H%M%S)
  # Replace **** with the actual password from .env.mongodb-rollback or your secrets vault
  ```
- [ ] Verify backup completed (check for `.bson` files)
- [ ] Store backup in secure, encrypted location
- [ ] Test restore capability:
  ```bash
  mongorestore --uri="<test-uri>" --dir=<backup-dir>
  ```
- [ ] Document backup location: _________________
- [ ] Document backup timestamp: _________________
- [ ] Confirm backup is restorable: ☐ YES ☐ NO

**Backup Location**: _________________________________________________

**Backup Size**: _________________ MB/GB

**Restore Test Result**: ☐ PASS ☐ FAIL

---

### T003: Staging Environment
**Owner**: _________________ (DevOps/Infrastructure)  
**Due Date**: _________________ (Within 2 business days)

#### Infrastructure Checklist
- [ ] PostgreSQL server provisioned (version: _________)
- [ ] Database `License` created
- [ ] Database `HR-SM` created
- [ ] Sufficient disk space allocated (estimate: _________)
- [ ] Network access configured (app server → PostgreSQL)
- [ ] MongoDB instance provisioned for staging
- [ ] Node.js installed (version: _________)
- [ ] Application dependencies installed (`npm install`)

#### Data Setup
- [ ] Production MongoDB snapshot loaded into staging MongoDB
- [ ] Staging `.env` file configured with correct database URLs
- [ ] Staging `.env` verified (no production credentials)

#### Verification
- [ ] Run verification script in staging:
  ```bash
  node scripts/verify-phase1-setup.js
  ```
- [ ] T001 passes in staging environment
- [ ] Document staging connection details below

**Staging PostgreSQL Host**: _________________________________________________

**Staging MongoDB Host**: _________________________________________________

**Staging Environment URL**: _________________________________________________

**Verification Result**: ☐ PASS ☐ FAIL

---

### T004 (Vault Storage): Store Rollback Credentials
**Owner**: _________________ (Security/DevOps)  
**Due Date**: _________________ (Within 1 business day)

- [ ] Copy `.env.mongodb-rollback` to secrets vault
- [ ] Vault location documented: _________________
- [ ] Access procedure documented (who can access, how to retrieve)
- [ ] Test retrieval from vault
- [ ] Confirm credentials work (test MongoDB connection)
- [ ] Set vault retention policy (expires 2026-05-29)
- [ ] Share access procedure with on-call team

**Secrets Vault Location**: _________________________________________________

**Access Procedure**: _________________________________________________

**Authorized Personnel**: _________________________________________________

---

## Team Review

### Review Meeting
**Date**: _________________  
**Attendees**: _________________________________________________

### Discussion Points
- [ ] Review Phase 1 verification report
- [ ] Confirm T002 (backup) completion and restore test results
- [ ] Confirm T003 (staging) environment is ready
- [ ] Confirm T004 (vault) credentials are accessible
- [ ] Review database name discrepancy (License vs hrsm-licenses, HR-SM vs hrsm_platform)
- [ ] Discuss Phase 2 timeline and resource allocation
- [ ] Address any questions or concerns

### Decisions
- [ ] Approve progression to Phase 2: ☐ YES ☐ NO ☐ CONDITIONAL
- [ ] Conditions (if any): _________________________________________________

---

## Sign-Off

### Technical Lead
**Name**: _________________  
**Date**: _________________  
**Signature**: _________________ ☐ APPROVED ☐ REJECTED

**Comments**: _________________________________________________

---

### DevOps Lead
**Name**: _________________  
**Date**: _________________  
**Signature**: _________________ ☐ APPROVED ☐ REJECTED

**Comments**: _________________________________________________

---

### Project Manager
**Name**: _________________  
**Date**: _________________  
**Signature**: _________________ ☐ APPROVED ☐ REJECTED

**Comments**: _________________________________________________

---

## Phase 2 Readiness

### Can Phase 2 Start?
☐ **YES** - All Phase 1 tasks complete, proceed to service conversions  
☐ **NO** - Blockers identified (list below)  
☐ **PARTIAL** - Phase 2 can start, but Phase 3 blocked until T002/T003 complete

### Blockers (if any)
_________________________________________________
_________________________________________________
_________________________________________________

### Phase 2 Start Date
**Planned**: _________________  
**Actual**: _________________

---

## Notes & Action Items

_________________________________________________
_________________________________________________
_________________________________________________
_________________________________________________
_________________________________________________

---

**Document Version**: 1.0  
**Created**: 2026-04-29  
**Last Updated**: _________________
