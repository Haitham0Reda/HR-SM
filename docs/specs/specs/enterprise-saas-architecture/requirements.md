# Requirements - Plain English

## What We're Building

Transforming the HRMS into an enterprise SaaS platform with:
- Multi-tenancy (multiple companies)
- Modules sold separately
- Platform admin dashboard
- SaaS and On-Premise support

Three layers:
- **Platform**: Manage tenants and subscriptions
- **Tenant**: Companies use HR system
- **Modules**: Features enabled per tenant

## Core Terms

- **Platform Layer**: System owner controls everything
- **Tenant**: A company using the system
- **Module**: A feature that can be enabled/disabled
- **HR-Core**: Required base module (always enabled)
- **Feature Flag**: On/off switch for modules per tenant
- **Platform JWT**: Login token for system admins
- **Tenant JWT**: Login token for company users

## Requirements

### 1. Three Layers Are Separate

**Why**: Platform, tenant, and modules need to be independent

**What it does**:
- Platform loads without tenant data
- Platform APIs use Platform JWT
- Tenant APIs use Tenant JWT (auto-filters by tenant)
- Modules check dependencies before loading
- Disabled modules return 403

### 2. HR-Core Stays Minimal

**Why**: HR-Core must work standalone

**What it includes**:
- Attendance, forget check, holidays, missions
- Vacations, mixed vacations, vacation balance, overtime
- Generic requests, backup

**What it does**:
- Never depends on optional modules
- Checks if email available (works without it)
- Doesn't expose platform data
- Backups only HR-Core data per tenant

### 3. Optional Modules Are Independent

**Why**: Sell features separately

**What it does**:
- Each module has own models/services/controllers/routes
- Disabled modules block all access
- Dependencies declared in module.config.js
- Modules enable without restart
- Enabled modules enforce tenant access control

### 4. Email Is Optional

**Why**: Not all tenants need email

**What it does**:
- Supports SMTP, SendGrid, AWS SES
- Modules check if enabled before sending
- Logs email requests when disabled
- Uses reusable templates
- HR-Core calls it when available

### 5. Platform Admin Dashboard

**Why**: Manage all tenants from one place

**What it does**:
- Separate login (Platform JWT)
- Shows tenant/module/subscription/health management
- Creates tenants (initializes data, creates admin)
- Enables modules instantly
- Displays usage metrics and logs

### 6. Tenants Are Isolated

**Why**: Security - no cross-tenant data access

**What it does**:
- All models have required tenantId field
- Middleware auto-filters queries by tenantId
- Platform APIs can query all tenants
- Module queries enforce tenant isolation
- Suspended tenants get 403 on all APIs

### 7. Module Registry

**Why**: Control modules at runtime

**What it does**:
- Loads all modules with metadata on startup
- Validates module structure and dependencies
- Checks feature flags on every request
- Updates apply without restart
- Enforces dependency requirements

### 8. APIs Are Namespaced

**Why**: Clear separation

**What it does**:
- Platform APIs: /api/platform/*
- Tenant APIs: /api/v1/*
- Platform JWT for platform APIs
- Tenant JWT for tenant APIs
- Tenant config only in platform namespace

### 9. Subscriptions Control Modules

**Why**: Monetization

**What it does**:
- Plans define included modules
- Assigning plan enables modules
- Expiration disables modules (keeps data)
- Upgrades enable new modules instantly
- Downgrades preserve data

### 10. Generic Request System

**Why**: Unified approval workflow

**What it does**:
- Supports: overtime, vacation, mission, forget-check, permission
- Status: pending → approved/rejected/cancelled
- Approval triggers business logic (update balances, etc.)
- Auto-filters by tenant
- Tracks approval chains

### 11. Tenant Backups

**Why**: Data protection per tenant

**What it does**:
- Backs up only that tenant's HR-Core data
- Supports manual and scheduled backups
- Restores only specified tenant
- Platform admins view all backups
- Failures logged, data not corrupted

### 12. Dependencies Are Enforced

**Why**: Prevent broken modules

**What it does**:
- Dependencies stored in registry
- Checks before enabling
- Lists missing dependencies in error
- Prevents disabling if others depend on it
- Email service can be optional dependency

### 13. Two Frontend Apps

**Why**: Separate concerns

**What it does**:
- hr-app: Tenant users
- platform-admin: System admins
- Separate authentication
- Separate routing
- Shared UI components allowed

### 14. Migration Preserves Data

**Why**: No downtime or data loss

**What it does**:
- All data preserved
- Legacy APIs work during transition
- v1 and v2 APIs run together
- All records get tenantId
- Admin users become platform users

### 15. Code Quality

**Why**: Maintainable codebase

**What it does**:
- Controllers thin (logic in services)
- JSDoc on all service methods
- ESLint and Prettier pass
- 80% test coverage minimum
- Consistent error responses

### 16. Platform Auth Is Separate

**Why**: Security isolation

**What it does**:
- Platform login uses platform_users collection
- Separate JWT secret
- Roles: super-admin, support, operations
- Checks platform permissions
- Logs cross-tenant operations

### 17. Modules Load Dynamically

**Why**: Efficient resource use

**What it does**:
- Only enabled modules load per tenant
- Loads without restart
- Unloads when disabled
- Failures don't crash system
- Minimal footprint for HR-Core only

### 18. Tenant Lifecycle

**Why**: Complete tenant management

**What it does**:
- Creates: unique ID, config, admin user
- Suspends: blocks access, keeps data
- Reactivates: restores access and config
- Deletes: archives data
- Logs all config changes

### 19. Monitoring

**Why**: Track health and usage

**What it does**:
- Real-time metrics dashboard
- Errors logged with context
- Tracks API calls, storage, users per tenant
- Alerts on performance issues
- Logs filterable by tenant/module/severity

### 20. Future: Module Marketplace

**Why**: Third-party modules

**What it does**:
- Stores module metadata (name, version, author, pricing)
- Validates on install
- Versioned APIs
- Rolling updates per tenant
- Sandboxed execution

### 21. Clinic Module (Optional)

**Why**: Medical management for companies with clinics

**What it includes**:
- Medical profiles (patient info, blood type, allergies)
- Visits and appointments
- Prescriptions

**What it does**:
- Depends on hr-core
- Optional email notifications (if email-service enabled)
- Creates medical leave REQUESTS via HR-Core (never directly modifies data)
- Can be enabled/disabled per tenant
- Removal doesn't affect HR-Core

**🚨 CRITICAL RULE**:
- Clinic can ONLY REQUEST changes through HR-Core
- Clinic NEVER directly modifies attendance or vacation balances
- HR-Core decides all employment rules
