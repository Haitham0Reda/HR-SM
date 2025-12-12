# Design Document

## Overview

This design document specifies the architecture, components, and implementation strategy for transforming the HR Management System (HR-SM) into an enterprise-ready, modular SaaS platform. The design implements a three-layer architecture separating platform administration, tenant operations, and feature modules, enabling multi-tenancy, independent module monetization, and support for both SaaS and On-Premise deployments.

The transformation involves significant restructuring of the codebase, introduction of platform-level capabilities, separation of frontend applications, and implementation of runtime module loading with feature flags. The design ensures backward compatibility during migration while establishing a foundation for future scalability and marketplace capabilities.

## Architecture

### Three-Layer Architecture

The system is organized into three distinct architectural layers:

**1. Platform Layer (System Owner)**
- Manages all tenants, subscriptions, and system-wide configuration
- Separate authentication using Platform JWT with dedicated secret
- Platform-specific database collections (platform_users, tenants, subscriptions, system_config)
- API namespace: `/api/platform/*`
- No tenant context required
- Roles: super-admin, support, operations

**2. Tenant Application Layer (Company Users)**
- HR application used by employees, managers, and HR staff
- Tenant-scoped authentication using Tenant JWT
- All data automatically filtered by tenantId
- API namespace: `/api/v1/*`
- Roles: Admin, HR, Manager, Employee
- Dynamically loads enabled modules per tenant

**3. Feature Module Layer (Independent Modules)**
- Self-contained modules with models, services, controllers, routes
- Can be enabled/disabled per tenant at runtime
- Declare dependencies explicitly in module metadata
- Isolated from other modules (no cross-module imports except declared dependencies)
- Each module has its own API sub-namespace

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     PLATFORM LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Tenant     │  │ Subscription │  │   System     │     │
│  │  Management  │  │  Management  │  │   Config     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         Platform JWT Auth (Separate Secret)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                TENANT APPLICATION LAYER                      │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Tenant Context Middleware                │       │
│  │    (Injects tenantId, enforces isolation)        │       │
│  └──────────────────────────────────────────────────┘       │
│         Tenant JWT Auth + RBAC                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 FEATURE MODULE LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ HR-Core  │  │  Tasks   │  │  Email   │  │ Payroll  │   │
│  │(Required)│  │(Optional)│  │(Optional)│  │(Optional)│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  Module Registry + Feature Flags + Dependency Resolution    │
└─────────────────────────────────────────────────────────────┘
```


## Components and Interfaces

### Backend Structure

```
server/
├── core/                           # Shared infrastructure (no business logic)
│   ├── auth/
│   │   ├── platformAuth.js        # Platform JWT generation/verification
│   │   ├── tenantAuth.js          # Tenant JWT generation/verification
│   │   └── authStrategies.js      # Passport strategies
│   ├── errors/
│   │   ├── AppError.js            # Base error class
│   │   ├── errorHandler.js        # Global error middleware
│   │   └── errorTypes.js          # Error type constants
│   ├── logging/
│   │   ├── logger.js              # Winston logger configuration
│   │   └── auditLogger.js         # Audit trail logging
│   ├── config/
│   │   ├── database.js            # MongoDB connection
│   │   ├── redis.js               # Redis connection (optional)
│   │   └── environment.js         # Environment variables
│   ├── middleware/
│   │   ├── tenantContext.js       # Injects tenantId into req
│   │   ├── moduleGuard.js         # Checks if module enabled for tenant
│   │   ├── rateLimiter.js         # Rate limiting
│   │   └── validation.js          # Request validation
│   └── registry/
│       ├── moduleRegistry.js      # Central module registry
│       ├── moduleLoader.js        # Dynamic module loading
│       └── dependencyResolver.js  # Module dependency resolution
│
├── platform/                       # Platform Layer (System Owner)
│   ├── auth/
│   │   ├── controllers/
│   │   │   └── platformAuthController.js
│   │   ├── services/
│   │   │   └── platformAuthService.js
│   │   └── routes/
│   │       └── platformAuthRoutes.js
│   ├── tenants/
│   │   ├── controllers/
│   │   │   └── tenantController.js
│   │   ├── services/
│   │   │   ├── tenantService.js
│   │   │   └── tenantProvisioningService.js
│   │   ├── models/
│   │   │   └── Tenant.js
│   │   └── routes/
│   │       └── tenantRoutes.js
│   ├── subscriptions/
│   │   ├── controllers/
│   │   │   └── subscriptionController.js
│   │   ├── services/
│   │   │   └── subscriptionService.js
│   │   ├── models/
│   │   │   ├── Subscription.js
│   │   │   └── Plan.js
│   │   └── routes/
│   │       └── subscriptionRoutes.js
│   ├── modules/
│   │   ├── controllers/
│   │   │   └── moduleController.js
│   │   ├── services/
│   │   │   └── moduleManagementService.js
│   │   └── routes/
│   │       └── moduleRoutes.js
│   ├── system/
│   │   ├── controllers/
│   │   │   ├── healthController.js
│   │   │   └── metricsController.js
│   │   ├── services/
│   │   │   ├── healthCheckService.js
│   │   │   └── usageTrackingService.js
│   │   └── routes/
│   │       └── systemRoutes.js
│   └── models/
│       ├── PlatformUser.js        # Platform administrators
│       └── SystemConfig.js        # System-wide configuration
│
├── modules/                        # Feature Module Layer
│   ├── hr-core/                   # REQUIRED - Standalone HR operations
│   │   ├── attendance/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── routes/
│   │   ├── requests/              # Generic request system
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── routes/
│   │   ├── holidays/
│   │   ├── missions/
│   │   ├── vacations/
│   │   ├── overtime/
│   │   ├── backup/                # Tenant-aware backup
│   │   ├── auth/                  # Tenant authentication
│   │   ├── users/                 # Tenant user management
│   │   └── module.config.js       # Module metadata
│   │
│   ├── email-service/             # OPTIONAL - Email provider module
│   │   ├── controllers/
│   │   │   └── emailController.js
│   │   ├── services/
│   │   │   ├── emailService.js
│   │   │   ├── smtpProvider.js
│   │   │   ├── sendgridProvider.js
│   │   │   └── sesProvider.js
│   │   ├── templates/
│   │   │   ├── overtimeRequest.hbs
│   │   │   ├── vacationApproval.hbs
│   │   │   └── taskAssignment.hbs
│   │   ├── models/
│   │   │   └── EmailLog.js
│   │   ├── routes/
│   │   │   └── emailRoutes.js
│   │   └── module.config.js
│   │
│   ├── tasks/                     # OPTIONAL - Task management
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   └── module.config.js
│   │
│   ├── payroll/                   # OPTIONAL - Payroll processing
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   └── module.config.js
│   │
│   ├── documents/                 # OPTIONAL - Document management
│   │   └── module.config.js
│   │
│   ├── reports/                   # OPTIONAL - Reporting & analytics
│   │   └── module.config.js
│   │
│   ├── notifications/             # OPTIONAL - In-app notifications
│   │   └── module.config.js
│   │
│   └── clinic/                    # OPTIONAL - Medical clinic management
│       ├── controllers/
│       ├── services/
│       ├── models/
│       └── module.config.js
│
├── app.js                         # Express app setup
├── platformApp.js                 # Platform-specific Express app
├── tenantApp.js                   # Tenant-specific Express app
└── server.js                      # Server entry point
```

### Frontend Structure

```
client/
├── hr-app/                        # Tenant Application (HR Users)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Shared UI components
│   │   │   ├── attendance/
│   │   │   ├── requests/
│   │   │   ├── tasks/
│   │   │   └── layout/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Attendance.jsx
│   │   │   ├── Requests.jsx
│   │   │   └── Tasks.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # Tenant auth
│   │   │   └── ModuleContext.jsx # Enabled modules
│   │   ├── services/
│   │   │   └── api.js            # Tenant API client
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── public/
│   └── package.json
│
├── platform-admin/                # Platform Administration
│   ├── src/
│   │   ├── components/
│   │   │   ├── tenants/
│   │   │   │   ├── TenantList.jsx
│   │   │   │   ├── TenantCreate.jsx
│   │   │   │   └── TenantDetails.jsx
│   │   │   ├── subscriptions/
│   │   │   │   ├── PlanList.jsx
│   │   │   │   └── SubscriptionManager.jsx
│   │   │   ├── modules/
│   │   │   │   ├── ModuleRegistry.jsx
│   │   │   │   └── ModuleConfig.jsx
│   │   │   └── system/
│   │   │       ├── SystemHealth.jsx
│   │   │       └── UsageMetrics.jsx
│   │   ├── pages/
│   │   │   ├── PlatformDashboard.jsx
│   │   │   ├── TenantsPage.jsx
│   │   │   ├── SubscriptionsPage.jsx
│   │   │   └── SystemPage.jsx
│   │   ├── context/
│   │   │   └── PlatformAuthContext.jsx
│   │   ├── services/
│   │   │   └── platformApi.js    # Platform API client
│   │   ├── routes/
│   │   │   └── PlatformRoutes.jsx
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── public/
│   └── package.json
│
└── shared/                        # Shared between both apps
    ├── ui-kit/                    # Reusable UI components
    │   ├── Button.jsx
    │   ├── Input.jsx
    │   ├── Modal.jsx
    │   └── Table.jsx
    ├── utils/
    │   ├── apiHelpers.js
    │   ├── dateUtils.js
    │   └── validators.js
    └── constants/
        └── index.js
```


### Key Interfaces

#### Module Configuration Interface

```javascript
// module.config.js
export default {
  name: 'email-service',
  displayName: 'Email Service',
  version: '1.0.0',
  description: 'Provides email functionality to other modules',
  author: 'System',
  category: 'communication',
  
  // Module dependencies
  dependencies: [],
  
  // Optional dependencies (module works with degraded functionality if missing)
  optionalDependencies: [],
  
  // Modules that can use this module
  providesTo: ['hr-core', 'tasks', 'payroll', 'notifications'],
  
  // Pricing information
  pricing: {
    tier: 'premium',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99
  },
  
  // Feature flags
  features: {
    smtp: true,
    sendgrid: true,
    ses: true,
    templates: true
  },
  
  // API routes
  routes: {
    base: '/api/v1/email-service',
    endpoints: [
      { path: '/send', method: 'POST', auth: true },
      { path: '/templates', method: 'GET', auth: true },
      { path: '/logs', method: 'GET', auth: true, roles: ['Admin', 'HR'] }
    ]
  },
  
  // Database models
  models: ['EmailLog', 'EmailTemplate'],
  
  // Initialization function
  async initialize(app, tenantId) {
    // Module-specific initialization
  },
  
  // Cleanup function
  async cleanup(tenantId) {
    // Module-specific cleanup
  }
};
```

#### Tenant Context Interface

```javascript
// Injected by tenantContext middleware
req.tenant = {
  id: 'tenant_123',
  name: 'Acme Corporation',
  status: 'active',
  subscription: {
    planId: 'plan_premium',
    status: 'active',
    expiresAt: '2025-12-31'
  },
  enabledModules: ['hr-core', 'tasks', 'email-service'],
  config: {
    timezone: 'America/New_York',
    locale: 'en-US',
    features: {}
  }
};
```

#### Platform API Response Interface

```javascript
// Standard platform API response
{
  success: true,
  data: {
    // Response data
  },
  meta: {
    timestamp: '2025-12-09T10:00:00Z',
    requestId: 'req_abc123'
  }
}

// Error response
{
  success: false,
  error: {
    code: 'TENANT_NOT_FOUND',
    message: 'Tenant with ID tenant_123 not found',
    details: {}
  },
  meta: {
    timestamp: '2025-12-09T10:00:00Z',
    requestId: 'req_abc123'
  }
}
```

#### Module Service Interface

```javascript
// Email Service Module - Public API
class EmailService {
  /**
   * Send email using configured provider
   * @param {string} tenantId - Tenant identifier
   * @param {Object} emailData - Email data
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.template - Template name
   * @param {Object} emailData.variables - Template variables
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(tenantId, emailData) {
    // Implementation
  }
  
  /**
   * Check if email service is enabled for tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<boolean>} Enabled status
   */
  async isEnabled(tenantId) {
    // Implementation
  }
}
```


## Data Models

### Platform Layer Models

#### Tenant Model

```javascript
const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    unique: true,
    sparse: true  // Allow null for on-premise
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'cancelled'],
    default: 'active'
  },
  deploymentMode: {
    type: String,
    enum: ['saas', 'on-premise'],
    default: 'saas'
  },
  subscription: {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan'
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'trial']
    },
    startDate: Date,
    expiresAt: Date,
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  enabledModules: [{
    moduleId: String,
    enabledAt: Date,
    enabledBy: String
  }],
  config: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    locale: {
      type: String,
      default: 'en-US'
    },
    features: mongoose.Schema.Types.Mixed
  },
  limits: {
    maxUsers: {
      type: Number,
      default: 100
    },
    maxStorage: {
      type: Number,
      default: 10737418240  // 10GB in bytes
    }
  },
  usage: {
    userCount: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0
    },
    apiCallsThisMonth: {
      type: Number,
      default: 0
    }
  },
  contactInfo: {
    adminEmail: String,
    adminName: String,
    phone: String,
    address: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
```

#### Platform User Model

```javascript
const platformUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super-admin', 'support', 'operations'],
    required: true
  },
  permissions: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'locked'],
    default: 'active'
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

#### Subscription Plan Model

```javascript
const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  tier: {
    type: String,
    enum: ['free', 'basic', 'professional', 'enterprise'],
    required: true
  },
  pricing: {
    monthly: {
      type: Number,
      required: true
    },
    yearly: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  includedModules: [{
    moduleId: String,
    included: {
      type: Boolean,
      default: true
    }
  }],
  limits: {
    maxUsers: Number,
    maxStorage: Number,
    apiCallsPerMonth: Number
  },
  features: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

### Tenant Layer Models

#### User Model (Tenant-Scoped)

```javascript
const userSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Admin', 'HR', 'Manager', 'Employee'],
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  position: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  permissions: [{
    module: String,
    actions: [String]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for tenant isolation
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
```

### Module Layer Models

#### Request Model (HR-Core)

```javascript
const requestSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  requestType: {
    type: String,
    enum: ['overtime', 'vacation', 'mission', 'forget-check', 'permission'],
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  requestData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  approvalChain: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    comments: String,
    timestamp: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

requestSchema.index({ tenantId: 1, requestType: 1, status: 1 });
```

#### Email Log Model (Email Service Module)

```javascript
const emailLogSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  to: {
    type: String,
    required: true
  },
  from: String,
  subject: {
    type: String,
    required: true
  },
  template: String,
  provider: {
    type: String,
    enum: ['smtp', 'sendgrid', 'ses']
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'queued'],
    required: true
  },
  error: String,
  metadata: mongoose.Schema.Types.Mixed,
  sentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

emailLogSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
```


## What The System Must Do

This section describes the key behaviors the system must have. These are used as a reference when writing tests.

### Layer Separation

**Platform layer works independently**
- Platform Layer loads without needing tenant data
- Platform APIs don't require tenant context

**Authentication is separate**
- Platform APIs use Platform JWT (separate secret)
- Tenant APIs use Tenant JWT (separate secret)
- Tenant JWT automatically adds tenant filtering to all queries

**Module dependencies are checked**
- System checks dependencies before loading modules
- Missing dependencies prevent module from loading

**Disabled modules are blocked**
- Disabled modules return HTTP 403
- Works regardless of user role

### HR-Core Boundaries

**🚨 CRITICAL RULE: HR-CORE CANNOT DEPEND ON ANYTHING**

HR-Core is the foundation. It must work standalone. Enforced by:

**🚨 CRITICAL RULE: HR-CORE DECIDES EMPLOYMENT RULES**

Optional modules can ONLY REQUEST changes through HR-Core's Request system. They can NEVER directly modify:
- Attendance records
- Vacation balances
- Overtime records
- Any employment data

Example: Clinic module creates medical leave REQUEST → HR-Core approves → HR-Core updates vacation balance

Enforced by:
- ESLint rules block imports from optional modules
- CI fails if HR-Core imports optional modules
- Pre-commit hooks prevent accidental dependencies
- Tests verify HR-Core works with all optional modules disabled

**HR-Core works independently**
- All HR-Core features work with optional modules disabled
- No hard dependencies on optional modules

**Email is optional**
- HR-Core checks if Email Service is enabled before sending
- Operations complete successfully even if email fails
- Email requests are logged when service is unavailable

**HR-Core doesn't expose other data**
- API responses don't include platform data (billing, subscriptions)
- API responses don't include optional module data

**🚨 HARD RULE: BACKUP = HR-CORE DATA ONLY**

Backup whitelist (ONLY these collections):
- attendance, requests, holidays, missions, vacations, mixed_vacations, vacation_balance, overtime
- users, departments, positions

Never backed up:
- Optional module data (tasks, payroll, documents, reports, etc.)
- Platform data
- Other tenant's data

Enforced by:
- Explicit whitelist in backup config
- Backup service rejects unlisted collections
- Tests verify optional module data is never backed up

### Module System

**Module structure**
- Each module has: models/, services/, controllers/, routes/
- Each module has valid module.config.js

**Dependencies are explicit**
- Dependencies declared in module.config.js
- System validates dependencies before loading

**Modules enable instantly**
- No server restart needed
- Module becomes accessible immediately

**Module routes work per-tenant**
- Enabled modules expose routes
- Tenant-scoped access control enforced

### Email Service

**Templates work correctly**
- Variables are substituted in emails
- Missing variables handled gracefully

**Integration is optional**
- Modules check if email service is enabled
- Email requests logged when service disabled

### Multi-Tenancy

**Every tenant model has tenantId**
- Required field with index
- Compound indexes for performance

**Queries are automatically filtered**
- All tenant queries include tenantId filter
- Matches authenticated tenant

**Platform APIs are cross-tenant**
- No tenant filtering on platform APIs
- Platform admins can query all tenants

**Suspended tenants are blocked**
- All API requests return HTTP 403
- No business logic executes

### Module Registry

**Registry is complete**
- Contains all modules with metadata
- Includes name, version, dependencies, routes

**Dependencies are validated**
- All declared dependencies must exist
- System checks before registration

**Dependencies are enforced**
- Can't enable module without dependencies
- Error lists missing dependencies
- Can't disable module if others depend on it

### API Namespaces

**Clear separation**
- Platform APIs: /api/platform/*
- Tenant APIs: /api/v1/*
- Tenant config endpoints only in platform namespace

### Subscriptions

**Plans control modules**
- Assigning plan enables included modules
- Expiration disables modules (data preserved)
- Upgrades enable new modules immediately
- Downgrades preserve data for re-enablement

### Request System

**Request types supported**
- overtime, vacation, mission, forget-check, permission

**Status workflow enforced**
- Valid: pending → approved/rejected/cancelled
- Invalid transitions rejected

**Approvals trigger actions**
- Vacation approval updates balance
- Overtime approval records hours
- Type-specific business logic executes

**Tenant filtering automatic**
- Queries filtered by tenantId

**Approval chains tracked**
- Each approval/rejection recorded
- Includes approver, status, comments, timestamp

### Platform Administration

**Tenant provisioning**
- Generates unique tenantId
- Initializes config with defaults
- Creates default admin user
- Enables HR-Core module

**Authentication separated**
- Platform login uses platform_users collection
- Never checks tenant users collection

**Permissions enforced**
- Platform APIs check platform permissions

**Operations logged**
- Cross-tenant operations logged
- Includes platform user ID, tenant ID, action, timestamp

### Runtime Module Loading

**Tenant-specific loading**
- Only enabled modules load per tenant

**Error resilient**
- Module failures don't crash system
- Errors logged, other modules continue

**Minimal footprint**
- Tenants with only HR-Core load minimal resources

### Migration

**Data integrity**
- No data loss or corruption
- All records preserved

**Backward compatible**
- Legacy APIs work during transition
- v1 and v2 APIs run simultaneously

**TenantId added**
- All records get tenantId after migration

### Code Quality

**Controllers are thin**
- Business logic in services
- Controllers handle request/response only

**Services documented**
- JSDoc on all exported methods
- Parameters, returns, exceptions documented

**Errors consistent**
- Standard format: success, error, meta

### Monitoring

**Errors logged completely**
- Tenant context, stack trace, request details, timestamp

**Usage tracked**
- API calls counted per tenant
- Metrics updated

**Logs filterable**
- By tenant, module, severity, time range

### Future: Module Marketplace

**Metadata stored**
- Name, version, description, author, pricing

**Installation validated**
- Structure, compatibility, security checked

**APIs versioned**
- Version in path
- Backward compatibility maintained


## Error Handling

### Error Classification

The system implements a hierarchical error classification system:

**1. Platform Errors (5xx)**
- `PLATFORM_INITIALIZATION_ERROR`: Platform layer failed to initialize
- `PLATFORM_DATABASE_ERROR`: Platform database connection or query failed
- `SYSTEM_CONFIGURATION_ERROR`: Invalid system configuration

**2. Tenant Errors (4xx)**
- `TENANT_NOT_FOUND`: Specified tenant does not exist
- `TENANT_SUSPENDED`: Tenant account is suspended
- `TENANT_QUOTA_EXCEEDED`: Tenant exceeded usage limits

**3. Module Errors (4xx)**
- `MODULE_NOT_FOUND`: Requested module does not exist
- `MODULE_DISABLED`: Module is disabled for this tenant
- `MODULE_DEPENDENCY_MISSING`: Required module dependencies not met
- `MODULE_LOAD_FAILED`: Module failed to load

**4. Authentication Errors (401)**
- `INVALID_PLATFORM_TOKEN`: Platform JWT is invalid or expired
- `INVALID_TENANT_TOKEN`: Tenant JWT is invalid or expired
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

**5. Validation Errors (400)**
- `INVALID_INPUT`: Request validation failed
- `MISSING_REQUIRED_FIELD`: Required field is missing
- `INVALID_TENANT_ID`: TenantId format is invalid

### Error Response Format

All errors follow a consistent format:

```javascript
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human-readable error message',
    details: {
      // Additional context-specific information
    }
  },
  meta: {
    timestamp: '2025-12-09T10:00:00Z',
    requestId: 'req_abc123',
    path: '/api/v1/tasks/tasks',
    method: 'POST'
  }
}
```

### Error Handling Strategy

**Centralized Error Middleware**
```javascript
// server/core/errors/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error({
    error: err.message,
    stack: err.stack,
    tenantId: req.tenant?.id,
    userId: req.user?.id,
    path: req.path,
    method: req.method
  });
  
  // Determine error type and status code
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  
  // Send consistent error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message,
      details: err.details || {}
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      path: req.path,
      method: req.method
    }
  });
};
```

**Module Loading Error Handling**
- Module loading failures should not prevent system startup
- Failed modules should be logged with detailed error information
- System should continue with successfully loaded modules
- Platform administrators should be notified of module loading failures

**Tenant Isolation Error Handling**
- Errors should never leak data from other tenants
- Error messages should not expose internal system details
- Stack traces should only be included in development mode

**Graceful Degradation**
- Optional module unavailability should not break core functionality
- Email service unavailability should log email requests but not fail operations
- Cache unavailability should fall back to database queries


## Testing Strategy

We use three types of tests:
- **Unit tests**: Test individual functions and services
- **Integration tests**: Test complete API flows
- **Property-based tests**: Only for critical security (tenant isolation, suspension, backups)

### Unit Testing

**Scope**: Individual functions, services, and controllers

**Framework**: Jest 30.x with ES Modules support

**Coverage Target**: Minimum 80% code coverage per module

**Unit Test Structure**:
```javascript
// server/modules/hr-core/services/__tests__/requestService.test.js
import { describe, test, expect, beforeEach } from '@jest/globals';
import RequestService from '../requestService.js';

describe('RequestService', () => {
  let requestService;
  
  beforeEach(() => {
    requestService = new RequestService();
  });
  
  test('should create overtime request with correct type', async () => {
    const requestData = {
      tenantId: 'tenant_123',
      requestType: 'overtime',
      requestedBy: 'user_456',
      requestData: { hours: 5, date: '2025-12-09' }
    };
    
    const result = await requestService.createRequest(requestData);
    
    expect(result.requestType).toBe('overtime');
    expect(result.status).toBe('pending');
  });
});
```

**Unit Test Coverage**:
- All service methods
- Controller request/response handling
- Middleware logic
- Utility functions
- Model validation
- Error handling paths

### Integration Testing

**Scope**: API endpoints, database interactions, module integration

**Framework**: Jest + Supertest + MongoDB Memory Server

**Integration Test Structure**:
```javascript
// server/modules/hr-core/__tests__/requestApi.test.js
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../app.js';
import { setupTestDB, teardownTestDB, createTestTenant, createTestUser } from '../../../testing/setup.js';

describe('Request API Integration', () => {
  let tenantToken;
  let tenantId;
  
  beforeAll(async () => {
    await setupTestDB();
    const tenant = await createTestTenant();
    tenantId = tenant.tenantId;
    const user = await createTestUser(tenantId, 'Employee');
    tenantToken = user.token;
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  test('should create request and enforce tenant isolation', async () => {
    const response = await request(app)
      .post('/api/v1/hr-core/requests')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        requestType: 'overtime',
        requestData: { hours: 5, date: '2025-12-09' }
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.tenantId).toBe(tenantId);
  });
});
```

**Integration Test Coverage**:
- Complete API request/response cycles
- Authentication and authorization flows
- Tenant isolation enforcement
- Module enablement/disablement
- Database query filtering
- Cross-module interactions

### Property-Based Testing (Security-Critical Only)

**Framework**: fast-check 4.x

**Only 3 critical tests** (not 55):

1. **Tenant data isolation** - No cross-tenant data leakage
2. **Suspended tenant blocking** - All endpoints return 403
3. **Backup isolation** - Backups never contain other tenant's data

Example:
```javascript
test('tenant data isolation', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 5 }), // tenantId
      fc.record({ /* query params */ }),
      async (tenantId, params) => {
        const results = await query(tenantId, params);
        return results.every(r => r.tenantId === tenantId);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Organization

```
server/
├── testing/
│   ├── setup.js                    # Test database setup/teardown
│   ├── fixtures/
│   │   ├── tenants.js             # Test tenant data
│   │   ├── users.js               # Test user data
│   │   └── modules.js             # Test module configurations
│   └── helpers/
│       ├── authHelpers.js         # JWT generation for tests
│       └── apiHelpers.js          # Common API test utilities
│
├── modules/
│   ├── hr-core/
│   │   ├── __tests__/
│   │   │   ├── unit/
│   │   │   │   ├── requestService.test.js
│   │   │   │   └── backupService.test.js
│   │   │   ├── integration/
│   │   │   │   ├── requestApi.test.js
│   │   │   │   └── authApi.test.js
│   │   │   └── properties/
│   │   │       ├── tenantIsolation.property.test.js
│   │   │       └── requestWorkflow.property.test.js
│   │   └── services/
│   │       └── __tests__/
│   │           └── requestService.test.js
│   │
│   └── email-service/
│       └── __tests__/
│           ├── unit/
│           ├── integration/
│           └── properties/
│
└── platform/
    └── tenants/
        └── __tests__/
            ├── unit/
            ├── integration/
            └── properties/
```

### Test Execution

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- --testPathPattern=unit

# Run integration tests only
npm test -- --testPathPattern=integration

# Run property-based tests only
npm test -- --testPathPattern=properties

# Run tests for specific module
npm test -- server/modules/hr-core

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

### Continuous Integration

**Pre-commit Checks**:
- ESLint validation
- Prettier formatting
- Unit tests execution
- Property-based tests execution

**CI Pipeline**:
1. Install dependencies
2. Run linters (ESLint, Prettier)
3. Run unit tests with coverage
4. Run integration tests
5. Run property-based tests
6. Generate coverage report
7. Fail if coverage < 80%

### Test Data Management

**Test Database**:
- Use MongoDB Memory Server for isolated test database
- Each test suite gets a fresh database instance
- Automatic cleanup after test completion

**Test Fixtures**:
- Reusable test data generators
- Consistent tenant/user creation
- Module configuration templates

**Test Isolation**:
- Each test should be independent
- No shared state between tests
- Clean database state before each test


## Migration Strategy

### Phase 1: Foundation (Weeks 1-2)

**Objective**: Establish core infrastructure without breaking existing functionality

**Tasks**:
1. Create new directory structure (core/, platform/, modules/)
2. Implement centralized module registry
3. Create tenant context middleware
4. Implement platform authentication (separate from tenant auth)
5. Create Platform User model and authentication endpoints
6. Set up dual JWT system (Platform JWT + Tenant JWT)

**Validation**:
- Existing APIs continue to work
- New platform auth endpoints are functional
- Module registry loads successfully

### Phase 2: Data Migration (Weeks 3-4)

**Objective**: Add tenantId to all existing data and establish tenant isolation

**Tasks**:
1. Create migration scripts to add tenantId field to all collections
2. Assign default tenantId to existing records (e.g., 'default_tenant')
3. Create Tenant model and seed initial tenant
4. Update all models to include tenantId field
5. Add compound indexes (tenantId + other fields)
6. Test tenant isolation with multiple test tenants

**Migration Script Example**:
```javascript
// server/scripts/migrations/001_add_tenant_id.js
import mongoose from 'mongoose';

export async function up() {
  const collections = [
    'users', 'departments', 'positions', 'requests',
    'attendance', 'vacations', 'tasks', 'documents'
  ];
  
  const defaultTenantId = 'default_tenant';
  
  for (const collectionName of collections) {
    await mongoose.connection.collection(collectionName).updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: defaultTenantId } }
    );
    
    console.log(`✓ Added tenantId to ${collectionName}`);
  }
  
  // Create compound indexes
  await mongoose.connection.collection('users').createIndex(
    { tenantId: 1, email: 1 },
    { unique: true }
  );
  
  console.log('✓ Migration complete');
}

export async function down() {
  // Rollback logic
}
```

**Validation**:
- All records have tenantId field
- Compound indexes are created
- Queries are automatically filtered by tenantId

### Phase 3: Module Restructuring (Weeks 5-7)

**Objective**: Reorganize code into modular structure

**Tasks**:
1. Move HR-Core features into modules/hr-core/
   - attendance/, requests/, holidays/, missions/, vacations/, overtime/, backup/
2. Move existing tasks module to modules/tasks/
3. Create module.config.js for each module
4. Implement module loader with dependency resolution
5. Create Email Service Module (extract email logic from existing code)
6. Update route registration to use module registry
7. Implement module guard middleware

**Module Migration Example**:
```javascript
// Before: server/routes/requestRoutes.js
import express from 'express';
const router = express.Router();
// ... routes

// After: server/modules/hr-core/requests/routes/requestRoutes.js
import express from 'express';
import { tenantContext } from '../../../../core/middleware/tenantContext.js';
import { moduleGuard } from '../../../../core/middleware/moduleGuard.js';

const router = express.Router();
router.use(tenantContext);
router.use(moduleGuard('hr-core'));
// ... routes
```

**Validation**:
- All modules load successfully
- Module dependencies are resolved correctly
- Module guard blocks access to disabled modules

### Phase 4: Platform Layer Implementation (Weeks 8-10)

**Objective**: Build platform administration capabilities

**Tasks**:
1. Implement platform API endpoints:
   - /api/platform/auth/* (login, logout)
   - /api/platform/tenants/* (CRUD operations)
   - /api/platform/subscriptions/* (plan management)
   - /api/platform/modules/* (module management)
   - /api/platform/system/* (health, metrics)
2. Create Tenant, Subscription, and Plan models
3. Implement tenant provisioning service
4. Implement subscription management service
5. Create platform admin dashboard backend APIs
6. Implement usage tracking and metrics collection

**Validation**:
- Platform APIs are accessible with Platform JWT
- Tenant CRUD operations work correctly
- Module enablement/disablement works at runtime

### Phase 5: Frontend Separation (Weeks 11-13)

**Objective**: Create separate frontend applications

**Tasks**:
1. Create client/hr-app/ directory structure
2. Move existing React app to hr-app/
3. Create client/platform-admin/ directory structure
4. Build platform admin dashboard:
   - Tenant management UI
   - Subscription management UI
   - Module management UI
   - System health dashboard
5. Create shared UI kit in client/shared/
6. Implement separate authentication flows
7. Configure separate build processes

**Validation**:
- Both applications build successfully
- Authentication works independently for each app
- Shared components are accessible from both apps

### Phase 6: Feature Flags and Runtime Loading (Weeks 14-15)

**Objective**: Implement dynamic module loading based on tenant configuration

**Tasks**:
1. Implement feature flag system
2. Create module loader that respects feature flags
3. Update tenant context to include enabled modules
4. Implement module route registration/unregistration
5. Add module status checking to all module endpoints
6. Implement graceful degradation for optional dependencies

**Validation**:
- Modules load only for tenants with them enabled
- Disabling a module immediately blocks access
- Optional dependencies work correctly

### Phase 7: Testing and Validation (Weeks 16-17)

**Objective**: Comprehensive testing of new architecture

**Tasks**:
1. Write property-based tests for all 55 correctness properties
2. Write integration tests for platform APIs
3. Write integration tests for tenant isolation
4. Write integration tests for module system
5. Perform load testing with multiple tenants
6. Test migration scripts on production-like data
7. Security audit of authentication and authorization

**Validation**:
- All property-based tests pass (100 iterations each)
- Test coverage > 80%
- No tenant data leakage
- Performance meets benchmarks

### Phase 8: Documentation and Deployment (Weeks 18-19)

**Objective**: Prepare for production deployment

**Tasks**:
1. Update all documentation
2. Create deployment guides for SaaS and On-Premise
3. Create platform admin user guide
4. Create tenant admin user guide
5. Set up monitoring and alerting
6. Create rollback procedures
7. Perform staged rollout (dev → staging → production)

**Validation**:
- Documentation is complete and accurate
- Deployment procedures are tested
- Monitoring is operational
- Rollback procedures are validated

### Backward Compatibility Strategy

**API Versioning**:
- Maintain v1 APIs during transition period (6 months)
- New architecture uses v2 APIs
- Both versions run simultaneously
- Gradual migration of clients to v2

**Data Compatibility**:
- All existing data remains accessible
- TenantId migration is reversible
- No data loss during migration

**Feature Parity**:
- All existing features remain available
- New features are additive
- No functionality is removed during migration

### Rollback Plan

**If Critical Issues Arise**:
1. Revert to previous deployment
2. Restore database from backup
3. Remove tenantId fields if necessary
4. Re-enable legacy routes
5. Investigate and fix issues
6. Re-attempt migration

**Rollback Triggers**:
- Data corruption detected
- Critical functionality broken
- Performance degradation > 50%
- Security vulnerability discovered


## Implementation Decisions and Rationale

### 1. Three-Layer Architecture

**Decision**: Separate Platform, Tenant, and Module layers

**Rationale**:
- Clear separation of concerns enables independent development and scaling
- Platform layer can evolve without affecting tenant operations
- Modules can be developed, tested, and deployed independently
- Easier to reason about security boundaries
- Supports future marketplace where third-party developers can create modules

**Alternatives Considered**:
- Single monolithic application: Rejected due to lack of modularity and scalability
- Microservices: Rejected as too complex for current scale, but architecture allows future migration

### 2. Dual JWT System

**Decision**: Separate JWT secrets and token formats for Platform and Tenant authentication

**Rationale**:
- Complete authentication isolation between platform and tenant layers
- Platform administrators cannot accidentally access tenant data without explicit tenant selection
- Different token expiration policies (platform tokens expire faster for security)
- Easier to audit and track platform administrator actions
- Prevents privilege escalation attacks

**Alternatives Considered**:
- Single JWT with role-based access: Rejected due to security concerns and complexity
- Session-based authentication: Rejected due to scalability concerns with multiple servers

### 3. TenantId in Every Model

**Decision**: Add tenantId field to all tenant-scoped models with compound indexes

**Rationale**:
- Guarantees tenant isolation at the database level
- Prevents accidental cross-tenant data access
- Enables efficient querying with compound indexes
- Simplifies backup and restore operations (filter by tenantId)
- Supports future database sharding by tenantId

**Alternatives Considered**:
- Separate database per tenant: Rejected due to operational complexity and cost
- Schema-based multi-tenancy: Rejected due to PostgreSQL-specific feature

### 4. Module Registry Pattern

**Decision**: Centralized module registry with metadata and dependency resolution

**Rationale**:
- Single source of truth for all available modules
- Enables runtime module discovery and loading
- Supports dependency validation before module enablement
- Facilitates future module marketplace
- Allows modules to declare capabilities and requirements

**Alternatives Considered**:
- File system scanning: Rejected due to lack of metadata and dependency information
- Hard-coded module list: Rejected due to lack of flexibility

### 5. Feature Flags for Module Control

**Decision**: Runtime feature flags stored in tenant configuration

**Rationale**:
- Enables/disables modules without code deployment
- Supports A/B testing and gradual rollouts
- Allows per-tenant module configuration
- Facilitates subscription-based module access
- No server restart required for changes

**Alternatives Considered**:
- Environment variables: Rejected due to lack of per-tenant control
- Database-driven with caching: Chosen approach with Redis caching for performance

### 6. Email Service as Optional Module

**Decision**: Extract email functionality into separate optional module

**Rationale**:
- Email is not essential for core HR operations
- Allows tenants to choose email provider (SMTP, SendGrid, SES)
- Enables monetization of email service separately
- Reduces dependencies for tenants who don't need email
- Supports graceful degradation when email is unavailable

**Alternatives Considered**:
- Email in HR-Core: Rejected as it violates HR-Core minimalism principle
- Email as platform service: Rejected as tenants may want different providers

### 7. Generic Request System in HR-Core

**Decision**: Unified request system supporting multiple request types

**Rationale**:
- Reduces code duplication across request types
- Consistent approval workflow for all request types
- Easier to add new request types in the future
- Simplified reporting and analytics across request types
- Single API for all request operations

**Alternatives Considered**:
- Separate models per request type: Rejected due to code duplication
- Polymorphic associations: Rejected due to complexity and query performance

### 8. Separate Frontend Applications

**Decision**: Two separate SPAs (hr-app and platform-admin) with shared UI kit

**Rationale**:
- Complete isolation of platform and tenant concerns
- Different authentication flows and state management
- Easier to secure platform admin (can be deployed separately)
- Allows different update cycles for each application
- Shared UI kit ensures consistent design language

**Alternatives Considered**:
- Single SPA with role-based routing: Rejected due to security and complexity concerns
- Separate repositories: Rejected due to code duplication and maintenance overhead

### 9. MongoDB with Mongoose

**Decision**: Continue using MongoDB with enhanced schema validation

**Rationale**:
- Existing system uses MongoDB (migration cost)
- Flexible schema supports module-specific data
- Good performance for document-oriented HR data
- Compound indexes support efficient tenant isolation
- Aggregation pipeline supports complex reporting

**Alternatives Considered**:
- PostgreSQL: Rejected due to migration cost and existing MongoDB expertise
- Multi-database approach: Rejected due to operational complexity

### 10. Module Dependency Resolution

**Decision**: Explicit dependency declaration with validation

**Rationale**:
- Prevents runtime errors from missing dependencies
- Clear documentation of module relationships
- Supports optional dependencies with graceful degradation
- Enables dependency graph visualization
- Facilitates module marketplace with dependency management

**Alternatives Considered**:
- Implicit dependencies: Rejected due to runtime errors and unclear relationships
- No dependency support: Rejected as modules need to integrate

### 11. Tenant-Aware Backup System

**Decision**: Backup system scoped to tenant with HR-Core data only

**Rationale**:
- Tenants can backup/restore independently
- Smaller backup sizes (only relevant data)
- Faster restore operations
- Supports compliance requirements (data portability)
- Enables tenant-specific backup schedules

**Alternatives Considered**:
- System-wide backups: Rejected due to size and restore complexity
- Module-specific backups: Rejected due to data relationship complexity

### 12. Platform Admin Roles

**Decision**: Three platform roles (super-admin, support, operations)

**Rationale**:
- Principle of least privilege
- Support staff don't need full system access
- Operations staff focus on system health, not tenant management
- Easier to audit and track actions by role
- Supports future role expansion

**Alternatives Considered**:
- Single admin role: Rejected due to security concerns
- Fine-grained permissions: Deferred to future enhancement

### 13. Subscription Plan Model

**Decision**: Plans define included modules and limits

**Rationale**:
- Flexible pricing tiers (free, basic, professional, enterprise)
- Easy to create promotional plans
- Supports module bundling
- Enables usage-based limits (users, storage, API calls)
- Facilitates upselling and cross-selling

**Alternatives Considered**:
- Per-module pricing only: Rejected due to complexity for customers
- Fixed plans only: Rejected due to lack of flexibility

### 14. Migration Strategy

**Decision**: Phased migration over 19 weeks with backward compatibility

**Rationale**:
- Minimizes risk of breaking existing functionality
- Allows testing at each phase
- Supports rollback at any point
- Maintains service availability during migration
- Enables gradual client migration to new APIs

**Alternatives Considered**:
- Big bang migration: Rejected due to high risk
- Parallel system: Rejected due to data synchronization complexity

### 15. Property-Based Testing

**Decision**: Use fast-check for testing universal properties

**Rationale**:
- Tests properties across wide range of inputs (100+ iterations)
- Catches edge cases that example-based tests miss
- Validates correctness properties from design document
- Provides high confidence in tenant isolation and security
- Complements unit and integration tests

**Alternatives Considered**:
- Example-based tests only: Rejected as insufficient for security-critical properties
- Manual testing: Rejected due to time and coverage limitations

## Security Considerations

### Authentication Security

- Platform JWT uses separate secret with shorter expiration (4 hours)
- Tenant JWT uses separate secret with longer expiration (7 days)
- Refresh token rotation for long-lived sessions
- Password hashing with bcrypt (12 salt rounds)
- Rate limiting on authentication endpoints (5 attempts per 15 minutes)

### Authorization Security

- Role-based access control (RBAC) at both platform and tenant levels
- Module-level permissions enforced by middleware
- Tenant isolation enforced at database query level
- Platform administrators require explicit tenant selection for tenant operations
- All cross-tenant operations are logged for audit

### Data Security

- TenantId validation on all tenant-scoped operations
- Compound indexes prevent accidental cross-tenant queries
- Sensitive data encrypted at rest (passwords, tokens)
- API responses never include data from other tenants
- Error messages don't leak sensitive information

### Network Security

- HTTPS required in production
- CORS configured per deployment mode
- Helmet.js for security headers
- Rate limiting on all API endpoints
- Input validation and sanitization on all requests

### Module Security

- Module code isolation (no direct imports between modules except declared dependencies)
- Module loading validation (structure, dependencies, security requirements)
- Future: Module sandboxing for third-party modules
- Future: Module code signing and verification

## Performance Considerations

### Database Performance

- Compound indexes on (tenantId, frequently_queried_field)
- Connection pooling (default: 10 connections)
- Query result caching with Redis (optional)
- Aggregation pipeline optimization for reports
- Index monitoring and optimization

### API Performance

- Response compression (gzip)
- Pagination on all list endpoints (default: 50 items)
- Field selection to reduce payload size
- Caching of feature flags in Redis (90% query reduction)
- Module loading caching (modules loaded once per tenant)

### Frontend Performance

- Code splitting by module
- Lazy loading of module components
- Shared UI kit reduces bundle duplication
- API response caching
- Optimistic UI updates

### Scalability

- Horizontal scaling supported (stateless application servers)
- Redis for session storage and caching
- MongoDB replica set for read scaling
- Future: Database sharding by tenantId
- Future: CDN for static assets

## Monitoring and Observability

### Metrics Collection

- API response times per endpoint
- Error rates per module and tenant
- Active users per tenant
- Module usage statistics
- Database query performance
- Memory and CPU usage

### Logging

- Structured logging with Winston
- Log levels: error, warn, info, debug
- Tenant context in all logs
- Request ID tracking across services
- Daily log rotation with 30-day retention

### Alerting

- Platform administrator notifications for:
  - Module loading failures
  - Tenant quota exceeded
  - System errors (5xx responses)
  - Performance degradation
  - Security events (failed authentication attempts)

### Health Checks

- `/health` - Basic health check
- `/health/detailed` - Detailed system health (platform only)
- Database connectivity check
- Redis connectivity check (if enabled)
- Module loading status

## Deployment Considerations

### SaaS Deployment

- Multi-tenant database
- Centralized platform administration
- Subscription-based module access
- Usage tracking and billing integration
- Automatic backups for all tenants

### On-Premise Deployment

- Single tenant mode
- License file validation
- Local platform administration
- All modules available (based on license)
- Customer-managed backups

### Environment Configuration

- Environment-specific configuration files
- Secrets management (environment variables)
- Feature flags per environment
- Database connection strings per environment
- Email provider configuration per environment

