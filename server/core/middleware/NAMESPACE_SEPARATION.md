# API Namespace Separation

## Overview

The HRMS platform enforces strict API namespace separation to clearly distinguish between platform administration and tenant application routes. This separation ensures security, maintainability, and clear architectural boundaries.

## Namespace Rules

### Platform Routes: `/api/platform/*`

**Purpose**: System administration and cross-tenant operations

**Authentication**: Platform JWT (separate secret)

**Access**: Platform administrators only (super-admin, support, operations)

**Tenant Context**: No tenant filtering - can access all tenant data

**Examples**:
- `/api/platform/auth/login` - Platform admin login
- `/api/platform/tenants` - Manage all tenants
- `/api/platform/subscriptions` - Manage subscriptions
- `/api/platform/modules` - Enable/disable modules per tenant
- `/api/platform/system/health` - System health metrics

### Tenant Routes: `/api/v1/*`

**Purpose**: Tenant application features and data

**Authentication**: Tenant JWT (separate secret)

**Access**: Tenant users (Admin, HR, Manager, Employee)

**Tenant Context**: Automatic tenant filtering - only see own tenant's data

**Examples**:
- `/api/v1/auth/login` - Tenant user login
- `/api/v1/users` - Manage users within tenant
- `/api/v1/attendance` - Attendance records for tenant
- `/api/v1/requests` - Leave requests for tenant
- `/api/v1/tasks/tasks` - Tasks for tenant

## Implementation

### Route Registration

All routes must be registered with the correct namespace prefix:

```javascript
// ✅ CORRECT - Platform routes
app.use('/api/platform/auth', platformAuthRoutes);
app.use('/api/platform/tenants', tenantRoutes);

// ✅ CORRECT - Tenant routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/attendance', attendanceRoutes);

// ❌ INCORRECT - No namespace
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
```

### Middleware Application

**Tenant Context Middleware**: Applied to tenant routes only, skips platform routes

```javascript
// Automatically skips /api/platform/* routes
app.use(tenantContext);
```

**Platform Authentication**: Applied to platform routes only

```javascript
router.get('/tenants', authenticatePlatform, tenantController.listTenants);
```

**Tenant Authentication**: Applied to tenant routes only

```javascript
router.get('/users', authenticateTenant, userController.listUsers);
```

### Namespace Validation

The `namespaceValidator` middleware enforces namespace rules:

```javascript
// Development mode - logs warnings for invalid namespaces
app.use(namespaceValidator({ strict: false }));

// Production mode - throws errors for invalid namespaces
app.use(namespaceValidator({ strict: true }));
```

## Migration Guide

### Updating Existing Routes

When migrating legacy routes to the new namespace structure:

1. **Identify route type**: Is it platform or tenant?
2. **Update registration**: Add `/api/v1` prefix for tenant routes
3. **Update frontend**: Update API client to use new paths
4. **Test thoroughly**: Ensure authentication and authorization work

Example migration:

```javascript
// Before
app.use('/api/users', userRoutes);

// After
app.use('/api/v1/users', userRoutes);
```

### Frontend Updates

Update API client base URLs:

```javascript
// Before
const API_BASE = '/api';

// After - Tenant API
const TENANT_API_BASE = '/api/v1';

// After - Platform API
const PLATFORM_API_BASE = '/api/platform';
```

## Validation

### Startup Validation

On server startup (development mode), all routes are validated:

```
📋 Route Namespace Validation Results:
✓ Valid routes: 45
⚠️  Invalid routes: 3
   - /api/users (get, post)
     Should start with /api/platform or /api/v1
```

### Runtime Validation

In development mode, requests to invalid namespaces log warnings:

```
⚠️  Invalid API namespace: /api/users. Routes must start with /api/platform or /api/v1
```

## Benefits

1. **Clear Separation**: Platform and tenant concerns are clearly separated
2. **Security**: Different authentication mechanisms prevent unauthorized access
3. **Maintainability**: Easy to identify route purpose from URL
4. **Scalability**: Enables future API versioning (v2, v3, etc.)
5. **Documentation**: Self-documenting API structure

## Best Practices

1. **Always use namespace prefixes** - Never register routes directly under `/api`
2. **Keep platform routes minimal** - Only cross-tenant operations belong here
3. **Default to tenant routes** - Most features are tenant-scoped
4. **Document route purpose** - Add comments explaining why a route is platform vs tenant
5. **Test both namespaces** - Ensure authentication works correctly for each

## Troubleshooting

### Route Not Found (404)

Check that the route is registered with the correct namespace:

```javascript
// If calling /api/v1/users but route is registered as:
app.use('/api/users', userRoutes); // ❌ Wrong namespace

// Fix:
app.use('/api/v1/users', userRoutes); // ✅ Correct
```

### Authentication Fails

Ensure you're using the correct JWT for the namespace:

- Platform routes require Platform JWT
- Tenant routes require Tenant JWT

### Tenant Data Not Filtered

Verify the route is under `/api/v1` so tenant context middleware applies:

```javascript
// ❌ Won't have tenant filtering
app.use('/api/users', userRoutes);

// ✅ Will have tenant filtering
app.use('/api/v1/users', userRoutes);
```

## Related Files

- `server/app.js` - Route registration
- `server/core/middleware/namespaceValidator.js` - Validation middleware
- `server/shared/middleware/tenantContext.js` - Tenant context injection
- `server/core/auth/platformAuth.js` - Platform JWT handling
- `server/core/auth/tenantAuth.js` - Tenant JWT handling
