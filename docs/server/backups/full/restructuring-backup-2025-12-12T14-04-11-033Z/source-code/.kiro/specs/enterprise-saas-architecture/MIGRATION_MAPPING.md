# File Migration Mapping Reference

This document provides a detailed mapping of where files should be moved from the current structure to the clean modular architecture. Use this as a reference when executing Phase 8 restructuring tasks.

## Migration Philosophy

❌ No rewrites yet  
✅ Move files to correct ownership  
✅ Fix imports only when broken  
✅ Merge duplicates into core  
✅ Leave TODO comments where logic is mixed  

We're creating hard boundaries through physical file organization.

---

## 1. Core Infrastructure (Shared, No Business Logic)

### Auth & RBAC

**From:**
```
server/controller/auth.controller.js
server/middleware/authMiddleware.js
server/routes/ (auth routes)
```

**To:**
```
server/core/auth/
├── auth.controller.js
├── auth.service.js
├── auth.routes.js
├── permissions.js
└── rbac.js
```

**Why core?** Auth & permissions are infrastructure, not a feature you sell.

---

### Tenant / Multi-Tenancy

**From:**
```
server/middleware/ (tenant-related)
server/utils/ (tenant-related)
```

**To:**
```
server/core/tenant/
├── tenant.middleware.js
├── tenant.model.js
└── tenant.service.js
```

**Why core?** This is the single source of truth for tenant filtering.

---

### Config / Constants

**From:**
```
server/config/*
.env handling scattered across files
```

**To:**
```
server/core/config/
├── env.js
├── database.js
└── constants.js
```

**Rule:** ❌ No module should read `process.env` directly.

---

### Generic Utils (De-duplication Target)

**From:**
```
server/utils/*
server/helpers/*
```

**To:**
```
server/core/utils/
├── date.js
├── pagination.js
├── validation.js
└── response.js
```

**Rule:** ✅ If used by more than one module → goes here.

---

### Global Middleware

**From:**
```
server/middlewares/*
```

**To:**
```
server/core/middleware/
├── auth.middleware.js
├── error.middleware.js
├── rate-limit.middleware.js
└── logging.middleware.js
```

**Why core?** Required by every module.

---

## 2. HR-Core Module (Pure HR Metadata ONLY)

### What Belongs in HR-Core

✅ **SHOULD CONTAIN:**
- Employees (users)
- Departments
- Positions
- Contracts
- Roles
- Audit logs
- **Attendance** (clock in/out, shifts, devices, forget check)
- **Leave** (vacation, missions, sick leave, policies, balances)
- **Overtime** (tracking hours, NOT payout calculation)
- **Requests** (generic approval workflow)
- **Holidays**
- **Backup** (tenant-scoped, HR-Core data only)

❌ **REMOVE FROM HR-CORE:**
- Payroll calculations
- Task management
- Document management
- Reporting/analytics
- Email sending
- Notifications

### File Mapping

**From:**
```
server/controller/user.controller.js
server/controller/department.controller.js
server/controller/position.controller.js
server/controller/attendance.controller.js
server/controller/vacation.controller.js
server/controller/mission.controller.js
server/controller/overtime.controller.js
server/controller/holiday.controller.js
server/controller/request.controller.js
server/controller/forgetCheck.controller.js

server/models/user.model.js
server/models/department.model.js
server/models/position.model.js
server/models/attendance.model.js
server/models/vacation.model.js
server/models/vacationBalance.model.js
server/models/mixedVacation.model.js
server/models/mission.model.js
server/models/overtime.model.js
server/models/holiday.model.js
server/models/request.model.js
server/models/forgetCheck.model.js

server/services/ (corresponding services)
server/routes/ (corresponding routes)
```

**To:**
```
server/modules/hr-core/
├── users/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── routes.js
├── attendance/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── routes.js
├── vacations/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── routes.js
├── missions/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── routes.js
├── overtime/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── routes.js
├── holidays/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── routes.js
├── requests/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── routes.js
├── backup/
│   ├── services/
│   └── routes.js
└── module.config.js
```

---

## 3. Attendance Module Details

**Important Clarification:**

Attendance is PART OF HR-CORE, not a separate optional module.

**What belongs in hr-core/attendance/:**
- Clock in/out
- Shifts
- Devices
- Forget check
- Raw overtime tracking (hours worked)

**What does NOT belong:**
- Overtime payout calculation → goes to Payroll module

---

## 4. Leave Module Details

**Important Clarification:**

Leave is PART OF HR-CORE, not a separate optional module.

**What belongs in hr-core/vacations/:**
- Vacation requests
- Mixed vacation
- Mission requests
- Sick leave
- Leave policies
- Vacation balances

**This is where confusion gets fixed:**
- Leave ≠ separate module
- Vacation balance ≠ shared state — it's domain logic in HR-Core

---

## 5. Optional Modules

### Email Service Module

**From:**
```
server/services/email.service.js
server/controller/ (if email controller exists)
```

**To:**
```
server/modules/email-service/
├── controllers/
│   └── emailController.js
├── services/
│   ├── emailService.js
│   ├── smtpProvider.js
│   ├── sendgridProvider.js
│   └── sesProvider.js
├── templates/
│   ├── overtimeRequest.hbs
│   ├── vacationApproval.hbs
│   └── taskAssignment.hbs
├── models/
│   └── EmailLog.js
├── routes/
│   └── emailRoutes.js
└── module.config.js
```

---

### Tasks Module

**From:**
```
server/controller/task.controller.js
server/models/task.model.js
server/services/ (task services)
server/routes/ (task routes)
```

**To:**
```
server/modules/tasks/
├── controllers/
├── services/
├── models/
├── routes/
└── module.config.js
```

---

### Payroll Module

**From:**
```
server/controller/payroll.controller.js
server/models/payroll.model.js
server/services/ (payroll services)
```

**To:**
```
server/modules/payroll/
├── controllers/
├── services/
├── models/
├── routes/
└── module.config.js
```

**What belongs here:**
- Salary calculations
- Payslips
- Benefits
- Deductions
- **Overtime money calculation** (NOT hours tracking)

---

### Documents Module

**From:**
```
server/controller/document.controller.js
server/controller/documentTemplate.controller.js
server/models/document.model.js
server/models/documentTemplate.model.js
```

**To:**
```
server/modules/documents/
├── controllers/
├── services/
├── models/
├── routes/
└── module.config.js
```

---

### Reports Module

**From:**
```
server/controller/report.controller.js
server/models/report.model.js
server/models/reportConfig.model.js
```

**To:**
```
server/modules/reports/
├── controllers/
├── services/
├── models/
├── routes/
└── module.config.js
```

---

### Notifications Module

**From:**
```
server/controller/notification.controller.js
server/models/notification.model.js
```

**To:**
```
server/modules/notifications/
├── controllers/
├── services/
├── models/
├── routes/
└── module.config.js
```

---

### Clinic Module

**Already structured correctly:**
```
server/modules/clinic/
├── controllers/
├── services/
├── models/
├── routes/
└── module.config.js
```

**Critical Rule:** Clinic can ONLY REQUEST changes through HR-Core, never directly modify attendance or balances.

---

## 6. Platform Layer

**Already structured correctly:**
```
server/platform/
├── auth/
├── tenants/
├── subscriptions/
├── modules/
└── system/
```

---

## 7. Routes Registration

### Central Route Loader

**Update:**
```javascript
// server/routes/index.js
module.exports = (app) => {
  // Platform routes
  require('../platform/auth/routes/platformAuthRoutes')(app);
  require('../platform/tenants/routes/tenantRoutes')(app);
  require('../platform/subscriptions/routes/subscriptionRoutes')(app);
  
  // HR-Core (always loaded)
  require('../modules/hr-core')(app);
  
  // Optional modules (loaded based on tenant config)
  require('../modules/attendance')(app);
  require('../modules/leave')(app);
  require('../modules/tasks')(app);
  require('../modules/email-service')(app);
  require('../modules/payroll')(app);
  require('../modules/documents')(app);
  require('../modules/reports')(app);
  require('../modules/notifications')(app);
  require('../modules/clinic')(app);
};
```

Later → tenant-based enabling.

---

## 8. De-duplication Checklist

After moving files, remove:

❌ Multiple auth middlewares  
❌ Date utils across modules  
❌ Tenant logic in services  
❌ Business logic in controllers  

✅ Replace with imports from core.

### Common Duplicates to Look For

1. **Date Utilities**
   - Date formatting
   - Date parsing
   - Timezone conversion
   - Date range calculations

2. **Pagination**
   - Page/limit parsing
   - Offset calculation
   - Pagination metadata

3. **Validation**
   - Email validation
   - Phone validation
   - Required field checks

4. **Response Formatting**
   - Success response wrapper
   - Error response wrapper
   - Pagination response

5. **Tenant Filtering**
   - TenantId injection
   - Query filtering
   - Access control

---

## 9. Import Path Updates

After moving files, update imports:

**Old:**
```javascript
const User = require('../models/user.model');
const userService = require('../services/user.service');
```

**New:**
```javascript
const User = require('../modules/hr-core/users/models/User');
const userService = require('../modules/hr-core/users/services/userService');
```

**For core utilities:**
```javascript
const { formatDate } = require('../core/utils/date');
const { paginate } = require('../core/utils/pagination');
```

---

## 10. Verification Checklist

After restructuring:

✅ All tests still pass  
✅ No broken imports  
✅ Application starts successfully  
✅ All API endpoints respond correctly  
✅ No duplicate code remains  
✅ ESLint passes  
✅ HR-Core has no dependencies on optional modules  

---

## 11. Migration Order

**Recommended order to minimize breakage:**

1. **Create new directory structure** (empty folders)
2. **Move models first** (least dependencies)
3. **Move services** (depend on models)
4. **Move controllers** (depend on services)
5. **Move routes** (depend on controllers)
6. **Update route registration**
7. **Test after each major move**
8. **Remove empty old directories**

---

## Notes

- This is a **surgical refactor**, not a rewrite
- Move files, fix imports, test
- Don't change logic during the move
- Mark TODOs where logic needs refactoring later
- Keep the system working at all times
- Test frequently

---

## Quick Reference: What Goes Where

| Feature | Location |
|---------|----------|
| Authentication | `server/core/auth/` |
| Tenant filtering | `server/core/tenant/` |
| Error handling | `server/core/errors/` |
| Logging | `server/core/logging/` |
| Config | `server/core/config/` |
| Generic utils | `server/core/utils/` |
| Global middleware | `server/core/middleware/` |
| Module registry | `server/core/registry/` |
| Platform admin | `server/platform/` |
| Employees/Departments | `server/modules/hr-core/users/` |
| Attendance | `server/modules/hr-core/attendance/` |
| Leave/Vacation | `server/modules/hr-core/vacations/` |
| Missions | `server/modules/hr-core/missions/` |
| Overtime tracking | `server/modules/hr-core/overtime/` |
| Holidays | `server/modules/hr-core/holidays/` |
| Requests | `server/modules/hr-core/requests/` |
| Backup | `server/modules/hr-core/backup/` |
| Email | `server/modules/email-service/` |
| Tasks | `server/modules/tasks/` |
| Payroll | `server/modules/payroll/` |
| Documents | `server/modules/documents/` |
| Reports | `server/modules/reports/` |
| Notifications | `server/modules/notifications/` |
| Clinic | `server/modules/clinic/` |
