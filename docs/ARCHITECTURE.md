# HRMS Modular Architecture

## Overview

This HRMS uses a **modular monolith** architecture supporting both SaaS (multi-tenant) and On-Premise (single-tenant) deployments from a single codebase.

## Key Architectural Decisions

### 1. Modular Monolith Pattern

- Each module is self-contained with its own models, routes, controllers, and services
- Modules can be enabled/disabled via feature flags stored in database
- Shared utilities and middleware in `/server/shared`
- Module registry pattern for dynamic loading

### 2. Multi-Tenancy Strategy

- **SaaS Mode**: `tenantId` field in all documents, enforced at middleware level
- **On-Prem Mode**: Single tenant with license validation
- Tenant isolation via MongoDB queries with automatic `tenantId` injection
- Separate database collections per tenant (optional scaling strategy)

### 3. Feature Flag System

```javascript
{
  tenantId: "company-123",
  modules: {
    "hr-core": { enabled: true, locked: true },
    "attendance": { enabled: true },
    "leave": { enabled: false },
    "payroll": { enabled: true },
    "documents": { enabled: true },
    "communication": { enabled: true },
    "reporting": { enabled: true },
    "tasks": { enabled: true }
  }
}
```

### 4. RBAC Implementation

- Roles: Admin, HR, Manager, Employee
- Permission matrix stored in database
- Middleware checks: `requireAuth`, `requireRole`, `requireModule`
- Frontend route guards based on role + module access

### 5. License Management (On-Prem)

```javascript
{
  licenseKey: "encrypted-key",
  companyName: "Acme Corp",
  maxEmployees: 500,
  enabledModules: ["hr-core", "attendance", "tasks"],
  expiryDate: "2026-12-31",
  signature: "digital-signature"
}
```

### 6. Task & Work Reporting Flow

```
Manager assigns task → Employee receives notification
→ Employee works and submits report (text + files)
→ Manager reviews and approves/rejects
→ If rejected, employee can resubmit
→ Analytics track performance metrics
```

## Folder Structure

```
/server
  /config          # DB, env, license config
  /shared          # Middleware, utils, base models
  /modules
    /hr-core       # Always enabled
    /attendance
    /leave
    /payroll
    /documents
    /communication
    /reporting
    /tasks         # Task & Work Reporting
  /uploads         # File storage
  server.js

/client
  /src
    /shared        # Common components, hooks
    /modules
      /hr-core
      /attendance
      /tasks
    /layouts
    /routes
    App.js

/shared-constants.js  # Shared between client/server
```

## Data Model Patterns

### Base Schema (All Models)

```javascript
{
  tenantId: { type: String, required: true, index: true },
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,
  updatedBy: ObjectId
}
```

### Tenant Isolation Middleware

Automatically injects `tenantId` into all queries and creates.

## API Structure

```
/api/v1/:module/:resource
Example: /api/v1/tasks/tasks
         /api/v1/tasks/reports
```

## Security Layers

1. JWT authentication
2. Role-based authorization
3. Module access validation
4. Tenant isolation
5. File upload validation
6. Rate limiting
7. Input sanitization

## Performance Optimizations

- Database indexing on tenantId + frequently queried fields
- React code splitting per module
- Lazy loading of module routes
- Caching of feature flags
- Pagination for large datasets
- File upload streaming

## Testing Strategy

- Unit tests for models and services
- Integration tests for API endpoints
- E2E tests for critical flows
- Accessibility testing with jest-axe
- Load testing for multi-tenant scenarios
