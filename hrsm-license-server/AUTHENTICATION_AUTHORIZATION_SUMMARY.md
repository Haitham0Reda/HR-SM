# API Authentication and Authorization Implementation Summary

## Overview

This document summarizes the implementation of API authentication and authorization for the License Server, completing Task 10 from the platform data migration specification.

## Requirements Addressed

- **Requirement 3.9**: API authentication with API keys
- **Requirement 3.10**: Authorization with role-based access control
- **Requirement 8.1**: Validate X-API-Key header
- **Requirement 8.2**: Check permissions for operations
- **Requirement 8.3**: Support role-based access control
- **Requirement 8.4**: Return 401 for invalid keys
- **Requirement 8.5**: Use encrypted connections (HTTPS)

## Implementation Details

### Task 10.1: API Key Authentication Middleware ✅

**File**: `hrsm-license-server/src/middleware/apiKeyAuth.middleware.js`

**Features**:
- Validates X-API-Key header or Authorization Bearer token
- Returns 401 for missing or invalid API keys
- Returns 403 for insufficient permissions
- Supports permission-based access control
- Tracks API key usage (usage count, last used timestamp)
- Provides fixed development keys for testing
- Generates secure random keys for production

**Key Functions**:
- `authenticateApiKey(requiredPermissions)` - Main authentication middleware
- `validateApiKey(key)` - Validates and tracks API key usage
- `generateApiKey(name, permissions)` - Generates new API keys
- `initializeDefaultApiKeys()` - Sets up default keys for HRSM Backend and Platform Admin

**Error Responses**:
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED" | "INVALID_API_KEY",
    "message": "Descriptive error message",
    "statusCode": 401
  }
}
```

### Task 10.2: Authorization Middleware ✅

**File**: `hrsm-license-server/src/middleware/authorization.middleware.js`

**Features**:
- Role-based access control (RBAC)
- Permission-based authorization
- Returns 403 for insufficient permissions
- Supports multiple permission models (granular and legacy)
- Admin permissions grant access to all operations

**Key Functions**:
- `requirePermission(permissions)` - Checks if user has required permissions
- `requireRole(roles)` - Checks if user has required role
- `requireAdmin()` - Shorthand for admin-only access
- `requireWrite()` - Shorthand for write access
- `requireRead()` - Shorthand for read access
- `hasPermission(userPerms, requiredPerms)` - Utility to check permissions
- `isPlatformAdmin(req)` - Check if request is from platform admin
- `isHRSMBackend(req)` - Check if request is from HRSM backend

**Permission Constants**:
```javascript
PERMISSIONS = {
  TENANTS_READ: 'tenants:read',
  TENANTS_WRITE: 'tenants:write',
  TENANTS_DELETE: 'tenants:delete',
  MODULES_READ: 'modules:read',
  MODULES_WRITE: 'modules:write',
  LICENSES_READ: 'licenses:read',
  LICENSES_WRITE: 'licenses:write',
  LICENSES_VALIDATE: 'licenses:validate',
  ADMIN_ALL: 'admin:all',
  // Legacy permissions for backward compatibility
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin'
}
```

**Role Definitions**:
- `PLATFORM_ADMIN`: Full access to all operations
- `HRSM_BACKEND`: Read access + license validation
- `READ_ONLY`: Read-only access to tenants, modules, and licenses

**Error Responses**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to perform this operation",
    "requiredPermissions": ["write"],
    "grantedPermissions": ["read"],
    "statusCode": 403
  }
}
```

### Task 10.3: HTTPS Enforcement ✅

**File**: `hrsm-license-server/src/middleware/httpsEnforcement.middleware.js`

**Features**:
- Redirects HTTP requests to HTTPS in production
- Sets Strict-Transport-Security (HSTS) headers
- Supports X-Forwarded-Proto for load balancers/proxies
- Excludes health check endpoints from enforcement
- Optional client certificate validation
- Configurable via environment variables

**Key Functions**:
- `enforceHTTPS(options)` - Redirects HTTP to HTTPS
- `setSecurityHeaders(options)` - Sets HSTS and other security headers
- `validateSSLCertificate(options)` - Validates client certificates (optional)
- `isHTTPS(req, trustProxy)` - Utility to check if request is secure
- `logHTTPSStatus()` - Logs protocol for monitoring

**Configuration Options**:
```javascript
enforceHTTPS({
  enabled: true,              // Enable HTTPS enforcement
  trustProxy: true,           // Trust X-Forwarded-Proto header
  excludePaths: ['/health']   // Paths to exclude from enforcement
})

setSecurityHeaders({
  maxAge: 31536000,           // HSTS max age (1 year)
  includeSubDomains: true,    // Include subdomains in HSTS
  preload: true               // Enable HSTS preload
})
```

**Security Headers Set**:
- `Strict-Transport-Security`: Forces HTTPS for future requests
- `X-Content-Type-Options`: Prevents MIME type sniffing
- `X-Frame-Options`: Prevents clickjacking
- `X-XSS-Protection`: Enables XSS filter
- `Referrer-Policy`: Controls referrer information

## Integration

### Updated Files

1. **`hrsm-license-server/src/routes/tenantRoutes.js`**
   - Added authorization middleware to all routes
   - Read operations require `read` permission
   - Write operations require `write` permission
   - Delete operations require `admin` permission

2. **`hrsm-license-server/src/server.js`**
   - Added HTTPS enforcement middleware
   - Added security headers middleware
   - Configured to run after CORS but before routes

3. **`hrsm-license-server/.env.example`**
   - Added `ENFORCE_HTTPS` configuration option

## Testing

### Test Files Created

1. **`authentication.middleware.unit.test.js`** - 19 tests ✅
   - API key validation
   - Authentication with X-API-Key header
   - Authentication with Authorization header
   - Permission checking
   - Error response formats

2. **`authorization.middleware.unit.test.js`** - 42 tests ✅
   - Permission-based authorization
   - Role-based authorization
   - Admin access shortcuts
   - Utility functions
   - Error response formats

3. **`httpsEnforcement.middleware.unit.test.js`** - 32 tests ✅
   - HTTP to HTTPS redirection
   - Security header setting
   - Client certificate validation
   - Utility functions

**Total**: 93 tests, all passing ✅

### Test Results

```
✅ authentication.middleware.unit.test.js
   19 passed, 0 failed

✅ authorization.middleware.unit.test.js
   42 passed, 0 failed

✅ httpsEnforcement.middleware.unit.test.js
   32 passed, 0 failed
```

## Usage Examples

### Protecting Routes with Authentication

```javascript
import { authenticateApiKey } from '../middleware/apiKeyAuth.middleware.js';
import { requirePermission, PERMISSIONS } from '../middleware/authorization.middleware.js';

// Require authentication only
router.get('/api/tenants', 
  authenticateApiKey(), 
  tenantController.getAllTenants
);

// Require authentication + specific permission
router.post('/api/tenants', 
  authenticateApiKey(),
  requirePermission([PERMISSIONS.TENANTS_WRITE]),
  tenantController.createTenant
);

// Require authentication + admin permission
router.delete('/api/tenants/:id', 
  authenticateApiKey(),
  requireAdmin(),
  tenantController.deleteTenant
);
```

### Making Authenticated Requests

```javascript
// Using X-API-Key header
const response = await fetch('https://license-server.com/api/tenants', {
  headers: {
    'X-API-Key': 'hrsm_your_api_key_here'
  }
});

// Using Authorization header
const response = await fetch('https://license-server.com/api/tenants', {
  headers: {
    'Authorization': 'Bearer hrsm_your_api_key_here'
  }
});
```

### Development API Keys

For development/testing, fixed API keys are used:

```bash
# HRSM Backend Key (validate, usage permissions)
hrsm_dev_backend_key_1234567890123456789012345678901234567890123

# Platform Admin Key (admin, read, write permissions)
hrsm_dev_admin_key_1234567890123456789012345678901234567890123
```

## Security Considerations

1. **API Key Storage**: API keys are hashed using SHA-256 before storage
2. **Key Expiration**: API keys expire after 1 year by default
3. **Usage Tracking**: All API key usage is logged with timestamps
4. **HTTPS Enforcement**: All sensitive data transmitted over HTTPS
5. **Permission Model**: Least privilege principle - users only get necessary permissions
6. **Admin Override**: Admin permission grants access to all operations
7. **Rate Limiting**: Can be combined with rate limiting middleware

## Configuration

### Environment Variables

```bash
# Enable/disable HTTPS enforcement
ENFORCE_HTTPS=true

# Allowed origins for CORS
ALLOWED_ORIGINS=http://localhost:5000,https://your-domain.com

# Admin API key (for production)
ADMIN_API_KEY=generate-secure-key-here
```

### Production Deployment

1. Set `NODE_ENV=production` to generate random API keys
2. Set `ENFORCE_HTTPS=true` to enforce HTTPS
3. Configure SSL certificates on web server/load balancer
4. Store generated API keys securely
5. Rotate API keys periodically
6. Monitor API key usage logs

## Next Steps

The following tasks from the specification can now proceed:

- **Task 11**: Checkpoint - Test License Server API
- **Task 12**: Create License Server client for main backend
- **Task 13**: Implement license cache functionality

## References

- Design Document: `.kiro/specs/platform-data-migration/design.md`
- Requirements Document: `.kiro/specs/platform-data-migration/requirements.md`
- Tasks Document: `.kiro/specs/platform-data-migration/tasks.md`
