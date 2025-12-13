# API Namespace Architecture

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         HRMS API Server                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─── /health (Public)
                              │
                              ├─── /api/platform/* (Platform Layer)
                              │    │
                              │    ├─── /auth
                              │    │    ├─── POST /login
                              │    │    ├─── POST /logout
                              │    │    └─── GET  /me
                              │    │
                              │    ├─── /tenants
                              │    │    ├─── GET    /
                              │    │    ├─── POST   /
                              │    │    ├─── GET    /:id
                              │    │    ├─── PATCH  /:id
                              │    │    ├─── DELETE /:id
                              │    │    ├─── POST   /:id/suspend
                              │    │    └─── POST   /:id/reactivate
                              │    │
                              │    ├─── /subscriptions
                              │    │    ├─── GET   /plans
                              │    │    ├─── POST  /plans
                              │    │    └─── PATCH /tenants/:id/subscription
                              │    │
                              │    ├─── /modules
                              │    │    ├─── GET    /
                              │    │    ├─── GET    /:moduleId
                              │    │    ├─── POST   /tenants/:tenantId/modules/:moduleId/enable
                              │    │    └─── DELETE /tenants/:tenantId/modules/:moduleId/disable
                              │    │
                              │    └─── /system
                              │         ├─── GET /health
                              │         ├─── GET /metrics/response-time
                              │         └─── GET /metrics/tenants/:tenantId
                              │
                              └─── /api/v1/* (Tenant Layer)
                                   │
                                   ├─── /auth
                                   │    ├─── POST /login
                                   │    ├─── POST /logout
                                   │    └─── GET  /me
                                   │
                                   ├─── /users
                                   │    ├─── GET    /
                                   │    ├─── POST   /
                                   │    ├─── GET    /:id
                                   │    └─── PATCH  /:id
                                   │
                                   ├─── /attendance
                                   │    ├─── GET  /
                                   │    ├─── POST /
                                   │    └─── GET  /report
                                   │
                                   ├─── /requests
                                   │    ├─── GET    /
                                   │    ├─── POST   /
                                   │    ├─── PATCH  /:id/approve
                                   │    └─── PATCH  /:id/reject
                                   │
                                   ├─── /departments
                                   ├─── /positions
                                   ├─── /vacations
                                   ├─── /missions
                                   ├─── /overtime
                                   ├─── /documents
                                   ├─── /reports
                                   └─── ... (20+ more tenant routes)
```

## Authentication Flow

### Platform Routes
```
┌──────────────┐     Platform JWT      ┌──────────────────┐
│   Platform   │ ──────────────────────>│  /api/platform/* │
│    Admin     │  (PLATFORM_JWT_SECRET) │                  │
└──────────────┘                        └──────────────────┘
                                               │
                                               ├─ No tenant filtering
                                               ├─ Cross-tenant access
                                               └─ Platform permissions check
```

### Tenant Routes
```
┌──────────────┐      Tenant JWT       ┌──────────────────┐
│    Tenant    │ ──────────────────────>│    /api/v1/*     │
│     User     │  (TENANT_JWT_SECRET)   │                  │
└──────────────┘                        └──────────────────┘
                                               │
                                               ├─ Automatic tenant filtering
                                               ├─ Single tenant access only
                                               └─ Tenant permissions check
```

## Middleware Stack

### Platform Routes
```
Request → namespaceValidator → platformAuth → platformPermissions → Controller
```

### Tenant Routes
```
Request → namespaceValidator → tenantContext → tenantAuth → tenantPermissions → Controller
```

## Data Access Patterns

### Platform Layer
```javascript
// Platform admin can access any tenant's data
GET /api/platform/tenants/tenant_123/users
→ Returns all users for tenant_123

GET /api/platform/system/metrics/tenants/tenant_456
→ Returns metrics for tenant_456

// No automatic tenant filtering
const allTenants = await Tenant.find({});
```

### Tenant Layer
```javascript
// Tenant user can only access their own tenant's data
GET /api/v1/users
→ Returns users for authenticated user's tenant only

GET /api/v1/attendance
→ Returns attendance for authenticated user's tenant only

// Automatic tenant filtering via tenantContext middleware
const users = await req.withTenant(User).find({});
// Automatically adds: { tenantId: req.tenantId }
```

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                      Platform Layer                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Platform JWT (Secret: PLATFORM_JWT_SECRET)           │  │
│  │  - super-admin, support, operations roles             │  │
│  │  - Cross-tenant access allowed                        │  │
│  │  - All operations logged                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Tenant Isolation │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       Tenant Layer                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tenant JWT (Secret: TENANT_JWT_SECRET)               │  │
│  │  - Admin, HR, Manager, Employee roles                 │  │
│  │  - Single tenant access only                          │  │
│  │  - Automatic tenant filtering                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Example Use Cases

### Platform Admin: Create New Tenant
```
POST /api/platform/tenants
Authorization: Bearer <PLATFORM_JWT>

{
  "name": "Acme Corporation",
  "domain": "acme.hrms.com",
  "contactEmail": "admin@acme.com"
}

→ Creates tenant with unique tenantId
→ Initializes default configuration
→ Creates default admin user
→ Enables HR-Core module
```

### Platform Admin: Enable Module for Tenant
```
POST /api/platform/modules/tenants/tenant_123/modules/tasks/enable
Authorization: Bearer <PLATFORM_JWT>

→ Enables Tasks module for tenant_123
→ Module becomes immediately accessible
→ No server restart required
```

### Tenant User: View Attendance
```
GET /api/v1/attendance
Authorization: Bearer <TENANT_JWT>

→ Returns attendance records for user's tenant only
→ Automatic filtering by tenantId
→ No cross-tenant data leakage
```

### Tenant User: Create Leave Request
```
POST /api/v1/requests
Authorization: Bearer <TENANT_JWT>

{
  "requestType": "vacation",
  "startDate": "2025-12-15",
  "endDate": "2025-12-20"
}

→ Creates request with automatic tenantId
→ Only visible to users in same tenant
→ Approval workflow within tenant
```

## Validation Examples

### ✅ Valid Routes
```
/api/platform/auth/login          → Platform authentication
/api/platform/tenants             → Tenant management
/api/v1/users                     → Tenant user management
/api/v1/attendance                → Tenant attendance
/health                           → Health check (no namespace)
```

### ❌ Invalid Routes
```
/api/users                        → Missing namespace (should be /api/v1/users)
/api/attendance                   → Missing namespace (should be /api/v1/attendance)
/api/admin/tenants                → Wrong namespace (should be /api/platform/tenants)
```

## Benefits Summary

1. **Security**: Separate authentication prevents unauthorized access
2. **Clarity**: URL structure clearly indicates route purpose
3. **Isolation**: Tenant data automatically filtered
4. **Scalability**: Easy to version APIs independently
5. **Maintainability**: Self-documenting API structure
