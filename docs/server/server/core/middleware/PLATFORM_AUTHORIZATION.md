# Platform Authorization System

## Overview

The Platform Authorization system provides role-based access control (RBAC) and comprehensive audit logging for all platform administrator actions. It ensures that only authorized platform users can access sensitive platform operations and that all actions are logged for security and compliance.

## Components

### 1. Platform Authentication (`platformAuthentication.js`)

Verifies Platform JWT tokens and attaches user information to the request object.

**Usage:**
```javascript
import { authenticatePlatform } from '../core/middleware/platformAuthentication.js';

router.get('/protected', authenticatePlatform, controller.method);
```

**What it does:**
- Extracts JWT from Authorization header or cookie
- Verifies token using Platform JWT secret
- Attaches `req.platformUser` with `userId` and `role`
- Throws 401 error if token is invalid or missing

### 2. Platform Authorization (`platformAuthorization.js`)

Provides permission checking and action logging for platform routes.

## Platform Roles and Permissions

### Super Admin
**Full system access** - Can perform any operation

Permissions: `platform:*` (wildcard grants all permissions)

### Support
**Customer support operations** - Can view and update tenant settings

Permissions:
- `tenants:read` - View tenant information
- `tenants:update` - Update tenant settings
- `subscriptions:read` - View subscription information
- `modules:read` - View module information
- `users:read` - View user information
- `system:read` - View system information
- `system:health` - View system health
- `system:metrics` - View system metrics

### Operations
**System monitoring and maintenance** - Can monitor system health and metrics

Permissions:
- `system:read` - View system information
- `system:health` - View system health
- `system:metrics` - View system metrics
- `system:update` - Update system metrics
- `tenants:read` - View tenant information
- `modules:read` - View module information

## Permission Format

Permissions follow the format: `resource:action`

**Resources:**
- `platform` - Platform-wide operations
- `tenants` - Tenant management
- `subscriptions` - Subscription management
- `modules` - Module management
- `users` - User management
- `system` - System operations

**Actions:**
- `read` - View/list resources
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `*` - All actions (wildcard)

**Examples:**
- `tenants:read` - Can view tenants
- `tenants:*` - Can perform all tenant operations
- `platform:*` - Can perform all platform operations (super-admin only)

## Middleware Functions

### `requirePlatformPermission(permission)`

Checks if the authenticated platform user has the required permission.

**Parameters:**
- `permission` - String or array of permission strings

**Usage:**
```javascript
import { requirePlatformPermission } from '../core/middleware/platformAuthorization.js';

// Single permission
router.post('/tenants', 
  authenticatePlatform,
  requirePlatformPermission('tenants:create'),
  controller.createTenant
);

// Multiple permissions (user needs at least one)
router.get('/data', 
  authenticatePlatform,
  requirePlatformPermission(['tenants:read', 'system:read']),
  controller.getData
);
```

**Behavior:**
- Returns 401 if user is not authenticated
- Returns 403 if user lacks required permission
- Logs unauthorized access attempts
- Calls `next()` if permission check passes

### `logPlatformAction(actionType)`

Logs platform administrator actions for audit trail.

**Parameters:**
- `actionType` - String describing the action (e.g., 'CREATE_TENANT', 'UPDATE_SUBSCRIPTION')

**Usage:**
```javascript
import { logPlatformAction } from '../core/middleware/platformAuthorization.js';

router.post('/tenants', 
  authenticatePlatform,
  requirePlatformPermission('tenants:create'),
  logPlatformAction('CREATE_TENANT'),
  controller.createTenant
);
```

**What it logs:**
- Action type
- Platform user ID and role
- HTTP method and path
- Tenant ID (if applicable)
- Request body (sanitized - passwords removed)
- Response status code
- Timestamp
- IP address
- User agent

**Log format:**
```json
{
  "actionType": "CREATE_TENANT",
  "platformUserId": "507f1f77bcf86cd799439011",
  "platformUserRole": "super-admin",
  "method": "POST",
  "path": "/api/platform/tenants",
  "tenantId": null,
  "requestBody": { "name": "Acme Corp", "domain": "acme.com" },
  "statusCode": 201,
  "timestamp": "2025-12-09T10:00:00.000Z",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### `logCrossTenantOperation()`

Logs when platform administrators perform operations on specific tenants.

**Usage:**
```javascript
import { logCrossTenantOperation } from '../core/middleware/platformAuthorization.js';

router.patch('/tenants/:tenantId', 
  authenticatePlatform,
  requirePlatformPermission('tenants:update'),
  logCrossTenantOperation(),
  controller.updateTenant
);
```

**What it logs:**
- Platform user ID and role
- Target tenant ID
- HTTP method and path
- Timestamp
- IP address

### `platformGuard(permission, actionType)`

**Recommended** - Combines permission checking and action logging in one call.

**Parameters:**
- `permission` - Required permission(s)
- `actionType` - Action type for logging

**Usage:**
```javascript
import { platformGuard } from '../core/middleware/platformAuthorization.js';

router.post('/tenants', 
  authenticatePlatform,
  ...platformGuard('tenants:create', 'CREATE_TENANT'),
  controller.createTenant
);
```

**Equivalent to:**
```javascript
router.post('/tenants', 
  authenticatePlatform,
  requirePlatformPermission('tenants:create'),
  logPlatformAction('CREATE_TENANT'),
  logCrossTenantOperation(),
  controller.createTenant
);
```

## Complete Route Example

```javascript
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticatePlatform } = require('../../../core/middleware/platformAuthentication');
const { platformGuard } = require('../../../core/middleware/platformAuthorization');

/**
 * Tenant Management Routes
 * Base path: /api/platform/tenants
 */

// List all tenants (read permission)
router.get('/', 
  authenticatePlatform,
  ...platformGuard('tenants:read', 'LIST_TENANTS'),
  tenantController.listTenants
);

// Create new tenant (create permission)
router.post('/', 
  authenticatePlatform,
  ...platformGuard('tenants:create', 'CREATE_TENANT'),
  tenantController.createTenant
);

// Update tenant (update permission)
router.patch('/:id', 
  authenticatePlatform,
  ...platformGuard('tenants:update', 'UPDATE_TENANT'),
  tenantController.updateTenant
);

// Delete tenant (delete permission)
router.delete('/:id', 
  authenticatePlatform,
  ...platformGuard('tenants:delete', 'DELETE_TENANT'),
  tenantController.deleteTenant
);

module.exports = router;
```

## Security Features

### 1. Role-Based Access Control
- Three distinct roles with different permission levels
- Wildcard support for flexible permission management
- Principle of least privilege enforced

### 2. Comprehensive Audit Logging
- All platform actions are logged
- Cross-tenant operations are specifically tracked
- Sensitive data (passwords) is automatically redacted
- Logs include full context (user, action, timestamp, IP)

### 3. Unauthorized Access Prevention
- 401 errors for unauthenticated requests
- 403 errors for insufficient permissions
- Failed access attempts are logged for security monitoring

### 4. Separation of Concerns
- Platform authentication separate from tenant authentication
- Platform JWT uses separate secret
- Platform users stored in separate collection

## Action Types

Standard action types for consistent logging:

**Tenant Management:**
- `LIST_TENANTS`
- `VIEW_TENANT`
- `CREATE_TENANT`
- `UPDATE_TENANT`
- `DELETE_TENANT`
- `SUSPEND_TENANT`
- `REACTIVATE_TENANT`
- `CHECK_TENANT_LIMITS`
- `UPDATE_TENANT_USAGE`
- `VIEW_TENANT_STATS`

**Subscription Management:**
- `LIST_PLANS`
- `VIEW_PLAN`
- `CREATE_PLAN`
- `UPDATE_PLAN`
- `DELETE_PLAN`
- `VIEW_TENANT_SUBSCRIPTION`
- `ASSIGN_PLAN_TO_TENANT`
- `UPGRADE_TENANT_PLAN`
- `DOWNGRADE_TENANT_PLAN`
- `CANCEL_TENANT_SUBSCRIPTION`
- `RENEW_TENANT_SUBSCRIPTION`

**Module Management:**
- `LIST_MODULES`
- `VIEW_MODULE`
- `VIEW_MODULE_DEPENDENCIES`
- `VIEW_MODULE_STATS`
- `LIST_TENANT_MODULES`
- `ENABLE_MODULE`
- `DISABLE_MODULE`
- `ENABLE_MODULES_BATCH`
- `CHECK_MODULE_ENABLE`

**System Operations:**
- `VIEW_SYSTEM_INFO`
- `VIEW_RESPONSE_TIME_STATS`
- `VIEW_ERROR_RATE_STATS`
- `VIEW_AGGREGATED_STATS`
- `VIEW_TENANTS_EXCEEDING_LIMITS`
- `VIEW_TOP_TENANTS`
- `RESET_MONTHLY_USAGE`
- `VIEW_ALL_TENANTS_USAGE`
- `VIEW_TENANT_USAGE`
- `VIEW_USAGE_TRENDS`
- `UPDATE_STORAGE_USAGE`
- `UPDATE_USER_COUNT`

## Testing

### Unit Tests

Test permission checking:
```javascript
import { hasPermission } from '../platformAuthorization.js';

test('super-admin has all permissions', () => {
  expect(hasPermission('super-admin', 'tenants:create')).toBe(true);
  expect(hasPermission('super-admin', 'anything:anything')).toBe(true);
});

test('support has limited permissions', () => {
  expect(hasPermission('support', 'tenants:read')).toBe(true);
  expect(hasPermission('support', 'tenants:delete')).toBe(false);
});

test('operations has system permissions', () => {
  expect(hasPermission('operations', 'system:metrics')).toBe(true);
  expect(hasPermission('operations', 'tenants:create')).toBe(false);
});
```

### Integration Tests

Test authorization on routes:
```javascript
import request from 'supertest';
import app from '../../../app.js';

test('unauthorized user cannot access platform routes', async () => {
  const response = await request(app)
    .get('/api/platform/tenants')
    .expect(401);
});

test('support user can read but not delete tenants', async () => {
  const supportToken = generatePlatformToken('user123', 'support');
  
  // Can read
  await request(app)
    .get('/api/platform/tenants')
    .set('Authorization', `Bearer ${supportToken}`)
    .expect(200);
  
  // Cannot delete
  await request(app)
    .delete('/api/platform/tenants/tenant123')
    .set('Authorization', `Bearer ${supportToken}`)
    .expect(403);
});

test('platform actions are logged', async () => {
  const adminToken = generatePlatformToken('admin123', 'super-admin');
  
  await request(app)
    .post('/api/platform/tenants')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Test Tenant' })
    .expect(201);
  
  // Verify log was created
  const logs = await getRecentLogs();
  expect(logs[0].actionType).toBe('CREATE_TENANT');
  expect(logs[0].platformUserId).toBe('admin123');
});
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **16.4**: Platform permissions are checked on all platform routes
- **16.5**: All platform administrator actions are logged with full context
- **1.2**: Platform JWT is verified on all protected routes
- **8.3**: Platform authentication is separate from tenant authentication
- **16.1**: Platform users have distinct roles (super-admin, support, operations)
- **16.2**: Platform JWT uses separate secret with 4-hour expiration
- **18.5**: Cross-tenant operations are specifically logged

## Migration Notes

When adding authorization to existing routes:

1. Import the middleware:
```javascript
const { authenticatePlatform } = require('../../../core/middleware/platformAuthentication');
const { platformGuard } = require('../../../core/middleware/platformAuthorization');
```

2. Update route definitions:
```javascript
// Before
router.get('/', authenticatePlatform, controller.list);

// After
router.get('/', 
  authenticatePlatform,
  ...platformGuard('resource:read', 'LIST_RESOURCE'),
  controller.list
);
```

3. Choose appropriate permission and action type
4. Test with different roles to verify access control

## Future Enhancements

- Custom permissions per platform user (beyond role-based)
- Permission inheritance and delegation
- Time-based permissions (temporary access)
- IP-based access restrictions
- Two-factor authentication for platform users
- Audit log export and analysis tools
