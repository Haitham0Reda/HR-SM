# HR-Core Module

## The Sacred Foundation

HR-Core is the **foundation** of the entire HRMS system. It is the only **required** module and must work **standalone** without any dependencies on optional modules.

## 🚨 CRITICAL RULES

### 1. HR-CORE CANNOT DEPEND ON ANYTHING

**HR-Core has ZERO dependencies on optional modules.**

This is enforced by:
- ESLint rules that block imports from optional modules
- Pre-commit hooks that prevent commits with violations
- CI checks that fail builds with boundary violations
- Automated boundary checking scripts

**Allowed imports in HR-Core:**
- ✅ `server/core/*` - Core infrastructure (auth, errors, logging, middleware, registry)
- ✅ `server/utils/*` - Shared utilities
- ✅ `server/middleware/*` - Shared middleware
- ✅ `server/shared/*` - Shared constants and models
- ✅ Internal HR-Core modules (e.g., `./models/`, `./services/`)

**Forbidden imports in HR-Core:**
- ❌ `server/modules/tasks/*` - Tasks module
- ❌ `server/modules/payroll/*` - Payroll module
- ❌ `server/modules/documents/*` - Documents module
- ❌ `server/modules/reports/*` - Reports module
- ❌ `server/modules/notifications/*` - Notifications module
- ❌ `server/modules/clinic/*` - Clinic module
- ❌ `server/modules/email-service/*` - Email Service module
- ❌ ANY other optional module

### 2. HR-CORE DECIDES EMPLOYMENT RULES

**Optional modules can ONLY REQUEST changes through HR-Core.**

Optional modules **NEVER** directly modify:
- Attendance records
- Vacation balances
- Overtime records
- Any employment data

**Example: Medical Leave Flow**
```
Clinic Module → Creates REQUEST via HR-Core API
                ↓
HR-Core → Approves/Rejects Request
                ↓
HR-Core → Updates Vacation Balance
                ↓
Clinic Module ← Reads Request Status
```

The Clinic module **never** touches vacation balances directly. It can only:
1. Create a medical leave REQUEST
2. Read the REQUEST status
3. React to approved/rejected requests

### 3. BACKUP = HR-CORE DATA ONLY

**Backups include ONLY HR-Core collections.**

**Whitelist (ONLY these collections):**
- `attendances`
- `requests`
- `holidays`
- `missions`
- `vacations`
- `mixedvacations`
- `vacationbalances`
- `overtimes`
- `users`
- `departments`
- `positions`
- `forgetchecks`

**Never backed up:**
- Optional module data (tasks, payroll, documents, etc.)
- Platform data
- Other tenant's data

This is enforced in `server/modules/hr-core/backup/services/backupService.js` with an explicit whitelist.

## What Belongs in HR-Core?

Based on **Requirements 2.1**, HR-Core includes:

### Core Features
1. **Attendance** - Check-in/check-out, working hours, late arrivals
2. **Forget Check** - Requests to fix missing check-in/check-out
3. **Holidays** - Official holidays, weekend work days
4. **Missions** - Business trips and missions
5. **Vacations** - Annual leave, sick leave, casual leave
6. **Mixed Vacations** - Partial day vacations
7. **Vacation Balance** - Leave balance tracking
8. **Overtime** - Overtime hours and approval
9. **Requests** - Generic request system (approval workflow)
10. **Backup** - Tenant-scoped backup and restore

### Supporting Features
- **Users** - Employee management
- **Departments** - Department structure
- **Positions** - Job positions

## What Does NOT Belong in HR-Core?

Everything else is an **optional, saleable module**:

- ❌ Tasks - Task management
- ❌ Payroll - Salary processing
- ❌ Documents - Document management
- ❌ Reports - Advanced reporting
- ❌ Notifications - In-app notifications
- ❌ Clinic - Medical clinic management
- ❌ Email Service - Email functionality
- ❌ Any future modules

## Module Structure

```
server/modules/hr-core/
├── attendance/
│   ├── models/
│   │   └── Attendance.js
│   ├── controllers/
│   │   └── attendanceController.js
│   └── routes/
│       └── attendanceRoutes.js
├── requests/
│   ├── models/
│   │   └── Request.js
│   ├── controllers/
│   │   └── requestController.js
│   └── routes/
│       └── requestRoutes.js
├── holidays/
│   ├── models/
│   │   └── Holiday.js
│   ├── controllers/
│   │   └── holidayController.js
│   └── routes/
│       └── holidayRoutes.js
├── missions/
│   ├── models/
│   │   └── Mission.js
│   ├── controllers/
│   │   └── missionController.js
│   └── routes/
│       └── missionRoutes.js
├── vacations/
│   ├── models/
│   │   └── Vacation.js
│   ├── controllers/
│   │   └── vacationController.js
│   └── routes/
│       └── vacationRoutes.js
├── overtime/
│   ├── models/
│   │   └── Overtime.js
│   ├── controllers/
│   │   └── overtimeController.js
│   └── routes/
│       └── overtimeRoutes.js
├── backup/
│   ├── services/
│   │   └── backupService.js
│   ├── controllers/
│   │   └── backupController.js
│   └── routes/
│       └── backupRoutes.js
├── models/
│   ├── User.js
│   ├── Department.js
│   └── Position.js
├── controllers/
│   ├── authController.js
│   └── userController.js
├── routes/
│   ├── authRoutes.js
│   └── userRoutes.js
├── module.config.js
└── README.md (this file)
```

## Tenant Isolation

**Every HR-Core model MUST have a `tenantId` field.**

All queries are automatically filtered by `tenantId` through the `tenantContext` middleware.

Example:
```javascript
const attendanceSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: [true, 'Tenant ID is required'],
        index: true,
        trim: true
    },
    // ... other fields
});

// Compound indexes for tenant isolation
attendanceSchema.index({ tenantId: 1, employee: 1, date: 1 }, { unique: true });
```

## Request System

HR-Core provides a **generic request system** that supports multiple request types:

- `overtime` - Overtime requests
- `vacation` - Vacation requests
- `mission` - Mission requests
- `forget-check` - Forget check-in/check-out requests
- `permission` - Permission requests
- `sick-leave` - Sick leave requests
- `day-swap` - Day swap requests

### Request Workflow

```
pending → approved/rejected/cancelled
```

**Valid transitions:**
- `pending` → `approved` (by approver)
- `pending` → `rejected` (by approver)
- `pending` → `cancelled` (by requester)

**Invalid transitions:**
- `approved` → `rejected` ❌
- `rejected` → `approved` ❌
- `cancelled` → `approved` ❌

### Approval Business Logic

When a request is approved, HR-Core triggers type-specific business logic:

- **Vacation approval** → Updates vacation balance
- **Overtime approval** → Records overtime hours
- **Mission approval** → Updates attendance records
- **Forget-check approval** → Updates attendance record
- **Permission approval** → Updates attendance record

## Checking HR-Core Boundaries

### Manual Check
```bash
npm run check-hr-core
```

### ESLint Check
```bash
npm run lint:hr-core
```

### Pre-commit Hook
The pre-commit hook automatically runs boundary checks before every commit.

### CI Check
GitHub Actions automatically checks boundaries on every push to `main` or `develop`.

## Architecture Decision Record (ADR)

### ADR-001: HR-Core Independence

**Status:** Accepted

**Context:**
We need a modular architecture where features can be enabled/disabled per tenant. However, we need a stable foundation that always works.

**Decision:**
HR-Core is the foundation module that:
1. Has ZERO dependencies on optional modules
2. Decides all employment rules
3. Provides a request system for optional modules to request changes
4. Includes only essential HR features

**Consequences:**

**Positive:**
- HR-Core always works, regardless of which optional modules are enabled
- Clear separation of concerns
- Optional modules can be added/removed without breaking HR-Core
- Easier to test and maintain
- Supports multi-tenancy with different module configurations

**Negative:**
- Optional modules cannot directly modify HR-Core data
- Requires request-based communication pattern
- More complex integration for optional modules

**Enforcement:**
- ESLint rules
- Pre-commit hooks
- CI checks
- Automated boundary checking

### ADR-002: Request-Based Communication

**Status:** Accepted

**Context:**
Optional modules (like Clinic) need to affect employment data (like vacation balances), but HR-Core cannot depend on optional modules.

**Decision:**
Optional modules can ONLY REQUEST changes through HR-Core's request system. They cannot directly modify employment data.

**Example:**
```javascript
// ❌ WRONG: Clinic directly modifies vacation balance
await VacationBalance.updateOne(
    { employee: employeeId },
    { $inc: { balance: -days } }
);

// ✅ CORRECT: Clinic creates a request
await Request.create({
    tenantId,
    requestType: 'sick-leave',
    requestedBy: employeeId,
    requestData: {
        startDate,
        endDate,
        days,
        medicalDocumentId
    }
});

// HR-Core approves and updates balance
```

**Consequences:**

**Positive:**
- Clear ownership of employment data (HR-Core owns it)
- Audit trail of all changes (through requests)
- Approval workflow for all changes
- Optional modules remain independent

**Negative:**
- More steps for optional modules
- Requires polling or webhooks for status updates

### ADR-003: Backup Whitelist

**Status:** Accepted

**Context:**
Backups should include only HR-Core data, not optional module data. This ensures backups are portable and don't include data from modules that might not be enabled.

**Decision:**
Backup service has an explicit whitelist of HR-Core collections. Any collection not in the whitelist is rejected.

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

**Consequences:**

**Positive:**
- Backups are predictable and consistent
- Backups don't include optional module data
- Easier to restore (no module dependencies)
- Smaller backup sizes

**Negative:**
- Optional modules need their own backup mechanisms
- Cannot backup entire tenant in one operation

## Testing

### Unit Tests
Test individual functions and services in isolation.

### Integration Tests
Test complete API flows with database.

### Property-Based Tests
Test critical security properties:
- Tenant isolation
- Backup isolation
- Request workflow

## Support

For questions or issues with HR-Core, please contact the development team.

## License

Proprietary - All rights reserved
