# Architecture Decision Record: HR-Core Sacred Boundaries

## Status
**Accepted** - December 9, 2025

## Context

We are transforming the HRMS into a modular, multi-tenant SaaS platform where features can be enabled/disabled per tenant. This requires:

1. A stable foundation that always works
2. Optional modules that can be added/removed
3. Clear separation between required and optional functionality
4. Tenant isolation and data security
5. Monetization through module sales

The challenge is: **How do we ensure the foundation remains stable while allowing flexibility in optional modules?**

## Decision

We establish **HR-Core** as the sacred foundation with three inviolable rules:

### Rule 1: HR-CORE CANNOT DEPEND ON ANYTHING

HR-Core has **ZERO dependencies** on optional modules. It must work standalone.

**Rationale:**
- If HR-Core depends on optional modules, disabling those modules breaks HR-Core
- HR-Core is required for all tenants, so it must always work
- Dependencies create coupling and make the system fragile

**Enforcement:**
- ESLint rules block imports from optional modules
- Pre-commit hooks prevent commits with violations
- CI checks fail builds with boundary violations
- Automated scripts scan for forbidden imports

**Allowed imports:**
```javascript
// ✅ ALLOWED
import { tenantContext } from '../../../../core/middleware/tenantContext.js';
import logger from '../../../../utils/logger.js';
import { protect } from '../../../../middleware/index.js';

// ❌ FORBIDDEN
import { sendEmail } from '../../../email-service/services/emailService.js';
import { createTask } from '../../../tasks/services/taskService.js';
```

### Rule 2: HR-CORE DECIDES EMPLOYMENT RULES

Optional modules can **ONLY REQUEST** changes through HR-Core. They **NEVER** directly modify:
- Attendance records
- Vacation balances
- Overtime records
- Any employment data

**Rationale:**
- HR-Core owns employment data and business rules
- Optional modules should not have direct access to critical data
- Request-based communication provides audit trail
- Approval workflow ensures proper authorization

**Example: Medical Leave Flow**

```javascript
// ❌ WRONG: Clinic directly modifies vacation balance
// server/modules/clinic/services/medicalLeaveService.js
async function approveMedicalLeave(leaveId) {
    const leave = await MedicalLeave.findById(leaveId);
    
    // FORBIDDEN: Direct modification of HR-Core data
    await VacationBalance.updateOne(
        { employee: leave.employee },
        { $inc: { balance: -leave.days } }
    );
}

// ✅ CORRECT: Clinic creates a request
// server/modules/clinic/services/medicalLeaveService.js
async function requestMedicalLeave(employeeId, startDate, endDate, medicalDocumentId) {
    // Create request via HR-Core API
    const request = await Request.create({
        tenantId: req.tenant.id,
        requestType: 'sick-leave',
        requestedBy: employeeId,
        requestData: {
            startDate,
            endDate,
            days: calculateDays(startDate, endDate),
            medicalDocumentId,
            source: 'clinic'
        }
    });
    
    return request;
}

// HR-Core handles approval and updates balance
// server/modules/hr-core/requests/controllers/requestController.js
async function approveRequest(req, res) {
    const request = await Request.findById(req.params.id);
    await request.approve(req.user._id, req.body.comments);
    
    // Trigger business logic
    if (request.requestType === 'sick-leave') {
        await updateVacationBalance(request.requestedBy, -request.requestData.days);
    }
}
```

### Rule 3: BACKUP = HR-CORE DATA ONLY

Backups include **ONLY HR-Core collections**. Never optional module data.

**Rationale:**
- Backups should be portable across different module configurations
- Tenant might not have the same modules enabled when restoring
- Smaller, faster backups
- Clear ownership of data

**Whitelist:**
```javascript
const HR_CORE_COLLECTIONS = [
    'attendances',
    'requests',
    'holidays',
    'missions',
    'vacations',
    'mixedvacations',
    'vacationbalances',
    'overtimes',
    'users',
    'departments',
    'positions',
    'forgetchecks'
];
```

**Enforcement:**
```javascript
// server/modules/hr-core/backup/services/backupService.js
async createBackup(tenantId) {
    const backup = { collections: {} };
    
    for (const collectionName of HR_CORE_COLLECTIONS) {
        // Only backup whitelisted collections
        const documents = await collection.find({ tenantId }).toArray();
        backup.collections[collectionName] = documents;
    }
    
    return backup;
}
```

## Consequences

### Positive

1. **Stability**
   - HR-Core always works, regardless of optional modules
   - No cascading failures from optional module issues
   - Predictable behavior

2. **Flexibility**
   - Optional modules can be added/removed without breaking HR-Core
   - Different tenants can have different module configurations
   - Easy to test modules in isolation

3. **Security**
   - Clear ownership of employment data
   - Audit trail through request system
   - Tenant isolation enforced at foundation level

4. **Maintainability**
   - Clear boundaries reduce coupling
   - Easier to understand and modify
   - Automated enforcement prevents violations

5. **Monetization**
   - HR-Core is included in all plans
   - Optional modules can be sold separately
   - Clear value proposition for each module

### Negative

1. **Complexity for Optional Modules**
   - Cannot directly modify HR-Core data
   - Must use request-based communication
   - Requires polling or webhooks for status updates

2. **Development Overhead**
   - Need to maintain boundary checking tools
   - More steps to integrate optional modules
   - Requires discipline from developers

3. **Performance**
   - Request-based communication adds latency
   - Cannot optimize across module boundaries
   - May require caching strategies

### Mitigation Strategies

1. **Developer Education**
   - Clear documentation (this ADR, README)
   - Code examples and patterns
   - Onboarding for new developers

2. **Automated Enforcement**
   - ESLint rules catch violations early
   - Pre-commit hooks prevent bad commits
   - CI checks ensure compliance

3. **Helper Libraries**
   - Provide request creation helpers
   - Standardize request patterns
   - Abstract complexity

4. **Monitoring**
   - Track request approval times
   - Monitor for boundary violations
   - Alert on suspicious patterns

## Alternatives Considered

### Alternative 1: No Boundaries (Monolith)

**Description:** Allow any module to import from any other module.

**Rejected because:**
- Creates tight coupling
- Makes modules non-optional
- Difficult to test in isolation
- Cannot sell modules separately

### Alternative 2: Event-Based Communication

**Description:** Use events/message bus for all inter-module communication.

**Rejected because:**
- More complex infrastructure
- Harder to debug
- Eventual consistency issues
- Overkill for current scale

**Note:** May revisit for future scaling needs.

### Alternative 3: Shared Database with Views

**Description:** Optional modules access HR-Core data through database views.

**Rejected because:**
- Bypasses application-level authorization
- No audit trail
- Difficult to enforce business rules
- Tight coupling at database level

## Implementation Plan

### Phase 1: Structure (Completed)
- ✅ Create HR-Core directory structure
- ✅ Move attendance, requests, holidays, missions, vacations, overtime
- ✅ Implement backup service with whitelist
- ✅ Create module.config.js

### Phase 2: Enforcement (Completed)
- ✅ Create ESLint rules
- ✅ Create pre-commit hooks
- ✅ Create CI checks
- ✅ Create boundary checking script

### Phase 3: Documentation (Completed)
- ✅ Write README.md
- ✅ Write this ADR
- ✅ Add inline comments

### Phase 4: Testing (Next)
- ⏳ Write unit tests
- ⏳ Write integration tests
- ⏳ Write property-based tests for tenant isolation
- ⏳ Write property-based tests for backup isolation

### Phase 5: Migration (Future)
- ⏳ Update existing code to use HR-Core modules
- ⏳ Update routes to use new structure
- ⏳ Update frontend to use new API paths
- ⏳ Migrate data if needed

## Validation

### Success Criteria

1. **Boundary Enforcement**
   - ✅ ESLint rules block forbidden imports
   - ✅ Pre-commit hooks prevent violations
   - ✅ CI checks fail on violations
   - ✅ Boundary script detects violations

2. **Functionality**
   - ⏳ HR-Core works with all optional modules disabled
   - ⏳ Optional modules can request changes through HR-Core
   - ⏳ Backup includes only HR-Core data
   - ⏳ Restore works correctly

3. **Testing**
   - ⏳ Unit tests pass
   - ⏳ Integration tests pass
   - ⏳ Property-based tests pass
   - ⏳ Test coverage > 80%

### Monitoring

- Track boundary violations in CI
- Monitor request approval times
- Track backup sizes
- Alert on suspicious patterns

## References

- [Requirements Document](../../.kiro/specs/enterprise-saas-architecture/requirements.md)
- [Design Document](../../.kiro/specs/enterprise-saas-architecture/design.md)
- [Tasks Document](../../.kiro/specs/enterprise-saas-architecture/tasks.md)
- [HR-Core README](./README.md)

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-12-09 | 1.0 | System | Initial version |

## Approval

This ADR has been reviewed and approved by:
- Architecture Team
- Development Team
- Security Team

**Status:** Accepted and Implemented
