# Platform Layer

The Platform Layer provides system-wide administration capabilities for managing tenants, subscriptions, modules, and system health.

## Overview

The Platform Layer is separate from the Tenant Application Layer and uses its own authentication system (Platform JWT) with a dedicated secret. Platform administrators can manage all tenants, configure subscriptions, enable/disable modules, and monitor system health.

## Directory Structure

```
server/platform/
├── auth/                      # Platform authentication
│   ├── controllers/
│   │   └── platformAuthController.js
│   ├── services/
│   │   └── platformAuthService.js
│   └── routes/
│       └── platformAuthRoutes.js
├── tenants/                   # Tenant management
│   ├── controllers/
│   │   └── tenantController.js
│   ├── services/
│   │   ├── tenantService.js
│   │   └── tenantProvisioningService.js
│   ├── models/
│   │   └── Tenant.js
│   └── routes/
│       └── tenantRoutes.js
├── subscriptions/             # Subscription management
│   ├── controllers/
│   │   └── subscriptionController.js
│   ├── services/
│   │   └── subscriptionService.js
│   ├── models/
│   │   ├── Plan.js
│   │   └── README.md (Subscription embedded in Tenant)
│   └── routes/
│       └── subscriptionRoutes.js
├── modules/                   # Module management
│   ├── controllers/
│   │   └── moduleController.js
│   ├── services/
│   │   └── moduleManagementService.js
│   └── routes/
│       └── moduleRoutes.js
├── system/                    # System health and metrics
│   ├── controllers/
│   │   ├── healthController.js
│   │   └── metricsController.js
│   ├── services/
│   │   ├── healthCheckService.js
│   │   └── usageTrackingService.js
│   └── routes/
│       └── systemRoutes.js
└── models/
    └── PlatformUser.js        # Platform administrators
```

## Components

### 1. Authentication (`auth/`)

Platform authentication is separate from tenant authentication and uses Platform JWT tokens.

**Key Features:**
- Platform JWT with separate secret (`PLATFORM_JWT_SECRET`)
- Token expiration: 4 hours (shorter for security)
- Roles: super-admin, support, operations
- HTTP-only cookie support

**Endpoints:**
- `POST /api/platform/auth/login` - Login platform user
- `POST /api/platform/auth/logout` - Logout platform user
- `GET /api/platform/auth/me` - Get current platform user
- `POST /api/platform/auth/change-password` - Change password

### 2. Tenant Management (`tenants/`)

Manage all tenants in the system, including creation, suspension, and deletion.

**Key Features:**
- Tenant provisioning with unique ID generation
- Automatic admin user creation
- Tenant suspension/reactivation
- Soft delete (archival)
- Usage tracking

**Endpoints:**
- `GET /api/platform/tenants` - List all tenants
- `POST /api/platform/tenants` - Create new tenant
- `GET /api/platform/tenants/:id` - Get tenant details
- `PATCH /api/platform/tenants/:id` - Update tenant
- `DELETE /api/platform/tenants/:id` - Archive tenant
- `POST /api/platform/tenants/:id/suspend` - Suspend tenant
- `POST /api/platform/tenants/:id/reactivate` - Reactivate tenant
- `GET /api/platform/tenants/stats` - Get tenant statistics
- `GET /api/platform/tenants/:id/limits` - Check tenant limits
- `PATCH /api/platform/tenants/:id/usage` - Update tenant usage

### 3. Subscription Management (`subscriptions/`)

Manage subscription plans and tenant subscriptions.

**Key Features:**
- Plan creation and management
- Plan assignment to tenants
- Subscription upgrades/downgrades
- Automatic module enablement based on plan
- Subscription expiration handling
- Auto-renewal support

**Endpoints:**
- `GET /api/platform/subscriptions/plans` - List all plans
- `POST /api/platform/subscriptions/plans` - Create new plan
- `GET /api/platform/subscriptions/plans/:id` - Get plan details
- `PATCH /api/platform/subscriptions/plans/:id` - Update plan
- `DELETE /api/platform/subscriptions/plans/:id` - Deactivate plan
- `GET /api/platform/subscriptions/tenants/:id/subscription` - Get tenant subscription
- `PATCH /api/platform/subscriptions/tenants/:id/subscription` - Assign plan to tenant
- `POST /api/platform/subscriptions/tenants/:id/upgrade` - Upgrade tenant plan
- `POST /api/platform/subscriptions/tenants/:id/downgrade` - Downgrade tenant plan
- `POST /api/platform/subscriptions/tenants/:id/cancel` - Cancel subscription
- `POST /api/platform/subscriptions/tenants/:id/renew` - Renew subscription

### 4. Module Management (`modules/`)

Enable/disable modules for tenants at runtime without server restart.

**Key Features:**
- Runtime module enablement/disablement
- Dependency validation
- Batch module enablement
- Module registry integration
- Dependency checking before enablement

**Endpoints:**
- `GET /api/platform/modules` - List all available modules
- `GET /api/platform/modules/:moduleId` - Get module details
- `GET /api/platform/modules/:moduleId/dependencies` - Get module dependencies
- `GET /api/platform/modules/stats` - Get module registry statistics
- `GET /api/platform/modules/tenants/:tenantId/modules` - Get enabled modules for tenant
- `POST /api/platform/modules/tenants/:tenantId/modules/:moduleId/enable` - Enable module
- `DELETE /api/platform/modules/tenants/:tenantId/modules/:moduleId/disable` - Disable module
- `POST /api/platform/modules/tenants/:tenantId/modules/enable-batch` - Enable multiple modules
- `GET /api/platform/modules/tenants/:tenantId/modules/:moduleId/can-enable` - Check if module can be enabled

### 5. System Health and Metrics (`system/`)

Monitor system health and track usage metrics across all tenants.

**Key Features:**
- Database connectivity checks
- Memory usage monitoring
- System information
- Per-tenant usage tracking
- Aggregated statistics
- Limit violation detection

**Health Endpoints:**
- `GET /api/platform/system/health` - Overall system health (public)
- `GET /api/platform/system/health/database` - Database health (public)
- `GET /api/platform/system/health/memory` - Memory health (public)
- `GET /api/platform/system/info` - System information

**Metrics Endpoints:**
- `GET /api/platform/system/metrics/aggregated` - Aggregated statistics
- `GET /api/platform/system/metrics/exceeding-limits` - Tenants exceeding limits
- `GET /api/platform/system/metrics/top-tenants` - Top tenants by usage
- `GET /api/platform/system/metrics/tenants` - All tenants usage
- `GET /api/platform/system/metrics/tenants/:tenantId` - Specific tenant usage
- `GET /api/platform/system/metrics/tenants/:tenantId/trends` - Usage trends
- `POST /api/platform/system/metrics/reset-monthly` - Reset monthly counters
- `PATCH /api/platform/system/metrics/tenants/:tenantId/storage` - Update storage usage
- `POST /api/platform/system/metrics/tenants/:tenantId/update-user-count` - Update user count

## Models

### PlatformUser
Platform administrators who manage the system.

**Fields:**
- email, password, firstName, lastName
- role: super-admin, support, operations
- permissions: Array of permission strings
- status: active, inactive, locked
- lastLogin: Date

### Tenant
Companies/organizations using the HR system.

**Fields:**
- tenantId: Unique identifier
- name, domain, status, deploymentMode
- subscription: Embedded subscription data
- enabledModules: Array of enabled modules
- config: Tenant configuration
- limits: Usage limits
- usage: Current usage statistics
- contactInfo: Contact information

### Plan
Subscription plans with pricing and included modules.

**Fields:**
- name, displayName, description, tier
- pricing: Monthly/yearly pricing
- includedModules: Modules included in plan
- limits: User, storage, API call limits
- features: Array of feature descriptions
- isActive, isPublic

## Authentication

All Platform API routes require Platform JWT authentication except:
- Health check endpoints (public for monitoring)
- Login endpoint

Platform JWT is verified using the `authenticatePlatform` middleware which:
1. Extracts token from Authorization header or cookie
2. Verifies token using `PLATFORM_JWT_SECRET`
3. Attaches `req.platformUser` with userId and role

## API Response Format

All Platform API responses follow this format:

```javascript
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
```

Error responses:

```javascript
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Error message',
    details: {}
  },
  meta: {
    timestamp: '2025-12-09T10:00:00Z',
    requestId: 'req_abc123'
  }
}
```

## Integration

To integrate the Platform Layer into your application:

1. **Add routes to app.js:**
```javascript
const platformAuthRoutes = require('./platform/auth/routes/platformAuthRoutes');
const tenantRoutes = require('./platform/tenants/routes/tenantRoutes');
const subscriptionRoutes = require('./platform/subscriptions/routes/subscriptionRoutes');
const moduleRoutes = require('./platform/modules/routes/moduleRoutes');
const systemRoutes = require('./platform/system/routes/systemRoutes');

app.use('/api/platform/auth', platformAuthRoutes);
app.use('/api/platform/tenants', tenantRoutes);
app.use('/api/platform/subscriptions', subscriptionRoutes);
app.use('/api/platform/modules', moduleRoutes);
app.use('/api/platform/system', systemRoutes);
```

2. **Set environment variables:**
```
PLATFORM_JWT_SECRET=your-platform-secret-here
```

3. **Create initial platform admin:**
```javascript
const platformAuthService = require('./platform/auth/services/platformAuthService');

await platformAuthService.createUser({
  email: 'admin@platform.com',
  password: 'secure-password',
  firstName: 'Platform',
  lastName: 'Admin',
  role: 'super-admin',
  permissions: []
});
```

## Security Considerations

1. **Separate Authentication:** Platform JWT uses a different secret than Tenant JWT
2. **Role-Based Access:** Platform users have specific roles with different permissions
3. **Audit Logging:** All platform operations should be logged
4. **Rate Limiting:** Consider adding rate limiting to platform endpoints
5. **IP Whitelisting:** Consider restricting platform access to specific IPs

## Next Steps

1. Implement audit logging for all platform operations
2. Add role-based permission checking
3. Implement rate limiting
4. Add email notifications for critical events
5. Create platform admin dashboard (frontend)
6. Add historical usage data tracking
7. Implement automated subscription renewal
8. Add webhook support for subscription events

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **1.1, 8.1:** Platform layer structure and API namespace
- **5.1, 16.1, 16.2:** Platform authentication
- **5.2, 5.3:** Tenant management UI capabilities (backend)
- **5.4:** Module management capabilities
- **5.5, 19.1:** System health and metrics
- **6.1, 18.1:** Tenant model and provisioning
- **8.1, 8.5:** API namespacing and tenant config endpoints
- **9.1, 9.2, 9.3, 9.4, 9.5:** Subscription management
- **16.1, 16.3:** Platform user model
- **18.1, 18.2, 18.3, 18.4:** Tenant lifecycle management
- **19.3:** Usage tracking
