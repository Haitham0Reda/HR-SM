# HRMS Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HRMS System                                 │
│                    (Single Codebase)                                │
│                                                                     │
│  ┌──────────────────────┐         ┌──────────────────────┐        │
│  │   SaaS Deployment    │         │  On-Premise Deploy   │        │
│  │   (Multi-Tenant)     │         │   (Single-Tenant)    │        │
│  │                      │         │                      │        │
│  │  • Tenant A          │         │  • License Key       │        │
│  │  • Tenant B          │         │  • Max Employees     │        │
│  │  • Tenant C          │         │  • Module Control    │        │
│  └──────────────────────┘         └──────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

## Application Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  HR Core UI  │  │  Tasks UI    │  │  Module UIs  │            │
│  │              │  │              │  │              │            │
│  │  • Users     │  │  • Task List │  │  • Attendance│            │
│  │  • Depts     │  │  • Reports   │  │  • Leave     │            │
│  │  • Positions │  │  • Analytics │  │  • Payroll   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              React Context Layer                            │  │
│  │  • AuthContext (Authentication State)                       │  │
│  │  • ModuleContext (Module Availability)                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Protected Routes                               │  │
│  │  • Role-based access control                                │  │
│  │  • Module-based visibility                                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API (JSON)
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Security Middleware                            │  │
│  │  • Helmet (Security Headers)                                │  │
│  │  • CORS (Cross-Origin)                                      │  │
│  │  • Rate Limiting                                            │  │
│  │  • Input Sanitization                                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Authentication Layer                           │  │
│  │  • JWT Verification                                         │  │
│  │  • User Context Injection                                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Tenant Context Layer                           │  │
│  │  • Extract tenantId from user                               │  │
│  │  • Inject into all queries                                  │  │
│  │  • Ensure data isolation                                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Module Guard Layer                             │  │
│  │  • Check module enabled for tenant                          │  │
│  │  • Cache feature flags (1 min TTL)                          │  │
│  │  • Return 403 if disabled                                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Role-Based Access Control                      │  │
│  │  • Check user role hierarchy                                │  │
│  │  • Validate permissions                                     │  │
│  │  • Return 403 if unauthorized                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Module Registry                                 │ │
│  │  • Dynamic route loading                                     │ │
│  │  • Module metadata                                           │ │
│  │  • Dependency management                                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐   │
│  │              │              │              │              │   │
│  │  HR Core     │  Tasks       │  Attendance  │  Other       │   │
│  │  Module      │  Module      │  Module      │  Modules     │   │
│  │              │              │              │              │   │
│  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │   │
│  │  │Routes  │  │  │Routes  │  │  │Routes  │  │  │Routes  │  │   │
│  │  └────────┘  │  └────────┘  │  └────────┘  │  └────────┘  │   │
│  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │   │
│  │  │Control │  │  │Control │  │  │Control │  │  │Control │  │   │
│  │  └────────┘  │  └────────┘  │  └────────┘  │  └────────┘  │   │
│  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │   │
│  │  │Service │  │  │Service │  │  │Service │  │  │Service │  │   │
│  │  └────────┘  │  └────────┘  │  └────────┘  │  └────────┘  │   │
│  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │   │
│  │  │Models  │  │  │Models  │  │  │Models  │  │  │Models  │  │   │
│  │  └────────┘  │  └────────┘  │  └────────┘  │  └────────┘  │   │
│  │              │              │              │              │   │
│  └──────────────┴──────────────┴──────────────┴──────────────┘   │
│                              │                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Base Model Plugin                               │ │
│  │  • Auto-inject tenantId                                      │ │
│  │  • Add audit fields (createdBy, updatedBy)                  │ │
│  │  • Add timestamps                                            │ │
│  │  • Filter queries by tenantId                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              MongoDB Database                                │ │
│  │                                                              │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │ │
│  │  │ tenantconfigs  │  │     users      │  │ departments  │  │ │
│  │  │                │  │                │  │              │  │ │
│  │  │ • tenantId     │  │ • tenantId     │  │ • tenantId   │  │ │
│  │  │ • modules      │  │ • email        │  │ • name       │  │ │
│  │  │ • subscription │  │ • role         │  │ • code       │  │ │
│  │  │ • license      │  │ • department   │  │              │  │ │
│  │  └────────────────┘  └────────────────┘  └──────────────┘  │ │
│  │                                                              │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │ │
│  │  │     tasks      │  │  taskreports   │  │  auditlogs   │  │ │
│  │  │                │  │                │  │              │  │ │
│  │  │ • tenantId     │  │ • tenantId     │  │ • tenantId   │  │ │
│  │  │ • title        │  │ • task         │  │ • action     │  │ │
│  │  │ • assignedTo   │  │ • reportText   │  │ • resource   │  │ │
│  │  │ • status       │  │ • files        │  │ • userId     │  │ │
│  │  └────────────────┘  └────────────────┘  └──────────────┘  │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │              Indexes                                   │ │ │
│  │  │  • tenantId (all collections)                          │ │ │
│  │  │  • tenantId + email (users)                            │ │ │
│  │  │  • tenantId + status (tasks)                           │ │ │
│  │  │  • tenantId + createdAt (auditlogs)                    │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Request Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. HTTP Request
     │    POST /api/v1/tasks/tasks
     │    Authorization: Bearer <JWT>
     │
     ▼
┌─────────────────────────────────────┐
│  Security Middleware                │
│  • Helmet, CORS, Rate Limit         │
└────┬────────────────────────────────┘
     │
     │ 2. Verify JWT
     │
     ▼
┌─────────────────────────────────────┐
│  Authentication Middleware          │
│  • Decode JWT                       │
│  • Extract user info                │
│  • req.user = { id, role, tenantId }│
└────┬────────────────────────────────┘
     │
     │ 3. Inject Tenant Context
     │
     ▼
┌─────────────────────────────────────┐
│  Tenant Context Middleware          │
│  • req.tenantId = user.tenantId     │
│  • Prepare tenant-scoped queries    │
└────┬────────────────────────────────┘
     │
     │ 4. Check Module Access
     │
     ▼
┌─────────────────────────────────────┐
│  Module Guard Middleware            │
│  • Check if 'tasks' enabled         │
│  • Query TenantConfig (cached)      │
│  • Return 403 if disabled           │
└────┬────────────────────────────────┘
     │
     │ 5. Check Role Permission
     │
     ▼
┌─────────────────────────────────────┐
│  RBAC Middleware                    │
│  • Check user.role hierarchy        │
│  • Validate against required role   │
│  • Return 403 if unauthorized       │
└────┬────────────────────────────────┘
     │
     │ 6. Route to Controller
     │
     ▼
┌─────────────────────────────────────┐
│  Task Controller                    │
│  • Validate input                   │
│  • Business logic                   │
│  • Call Task.create()               │
└────┬────────────────────────────────┘
     │
     │ 7. Database Operation
     │
     ▼
┌─────────────────────────────────────┐
│  Task Model (with BaseModel)        │
│  • Auto-inject tenantId             │
│  • Add createdBy, timestamps        │
│  • Save to MongoDB                  │
└────┬────────────────────────────────┘
     │
     │ 8. Audit Logging
     │
     ▼
┌─────────────────────────────────────┐
│  Audit Log                          │
│  • Log action: 'create'             │
│  • Log resource: 'Task'             │
│  • Log userId, tenantId             │
└────┬────────────────────────────────┘
     │
     │ 9. Send Notification
     │
     ▼
┌─────────────────────────────────────┐
│  Notification Service               │
│  • Create in-app notification       │
│  • Send email (optional)            │
└────┬────────────────────────────────┘
     │
     │ 10. Return Response
     │
     ▼
┌──────────┐
│  Client  │
│  200 OK  │
│  { task }│
└──────────┘
```

## Module Dependency Graph

```
                    ┌─────────────┐
                    │   HR Core   │
                    │  (Always)   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┬──────────────┐
           │               │               │              │
           ▼               ▼               ▼              ▼
    ┌──────────┐    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │Attendance│    │  Leave   │   │Documents │   │  Tasks   │
    └────┬─────┘    └──────────┘   └──────────┘   └──────────┘
         │
         ▼
    ┌──────────┐
    │ Payroll  │
    └──────────┘

Legend:
  → Dependency (requires)

Dependencies:
  • Payroll requires: HR Core + Attendance
  • All others require: HR Core only
```

## Data Isolation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Collection: users                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ { _id: 1, tenantId: "company-a", name: "Alice" }   │   │
│  │ { _id: 2, tenantId: "company-a", name: "Bob" }     │   │
│  │ { _id: 3, tenantId: "company-b", name: "Charlie" } │   │
│  │ { _id: 4, tenantId: "company-b", name: "Diana" }   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Query from Company A:                                      │
│  User.find({ tenantId: "company-a" })                       │
│  ↓                                                           │
│  Returns: Alice, Bob only                                   │
│                                                             │
│  Query from Company B:                                      │
│  User.find({ tenantId: "company-b" })                       │
│  ↓                                                           │
│  Returns: Charlie, Diana only                               │
│                                                             │
│  ✓ Complete data isolation                                  │
│  ✓ Automatic via middleware                                 │
│  ✓ No cross-tenant data leakage                             │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Modes

```
┌─────────────────────────────────────────────────────────────┐
│                    SaaS Mode                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Tenant A │  │ Tenant B │  │ Tenant C │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
│       │             │             │                         │
│       └─────────────┼─────────────┘                         │
│                     │                                       │
│              ┌──────▼──────┐                                │
│              │   Server    │                                │
│              │  (Shared)   │                                │
│              └──────┬──────┘                                │
│                     │                                       │
│              ┌──────▼──────┐                                │
│              │  Database   │                                │
│              │ (Multi-Tenant)                               │
│              └─────────────┘                                │
│                                                             │
│  Features:                                                  │
│  • Subscription-based                                       │
│  • Shared infrastructure                                    │
│  • Automatic updates                                        │
│  • Scalable to 1000+ tenants                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 On-Premise Mode                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Client Infrastructure                   │  │
│  │                                                      │  │
│  │  ┌──────────┐                                        │  │
│  │  │ License  │                                        │  │
│  │  │   File   │                                        │  │
│  │  └────┬─────┘                                        │  │
│  │       │                                              │  │
│  │  ┌────▼─────┐                                        │  │
│  │  │  Server  │                                        │  │
│  │  │ (Single) │                                        │  │
│  │  └────┬─────┘                                        │  │
│  │       │                                              │  │
│  │  ┌────▼─────┐                                        │  │
│  │  │ Database │                                        │  │
│  │  │(Single-T)│                                        │  │
│  │  └──────────┘                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Features:                                                  │
│  • License-based                                            │
│  • Full data control                                        │
│  • No external dependencies                                 │
│  • Custom deployment                                        │
└─────────────────────────────────────────────────────────────┘
```

---

**This diagram represents the complete architecture as specified in ARCHITECTURE.md**
