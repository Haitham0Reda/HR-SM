# DEPRECATED - Legacy Middleware Directory

⚠️ **This directory is deprecated and maintained only for backward compatibility.**

## New Location

Core middleware has been moved to:
- **Core Middleware**: `server/core/middleware/`

This includes:
- Authentication middleware
- Authorization middleware
- Error handling middleware
- Tenant context middleware
- Module guard middleware
- Rate limiting middleware
- Request logging middleware
- Validation middleware

## Migration Guide

When updating imports, change from:
```javascript
import middleware from '../middleware/authMiddleware.js';
```

To:
```javascript
import middleware from '../core/middleware/auth.middleware.js';
```

## Module-Specific Middleware

Module-specific middleware should be placed within the respective module directories:
- `server/modules/hr-core/[feature]/middleware/`
- `server/modules/[module-name]/middleware/`

## Removal Timeline

This directory will be removed in a future release once all references have been updated.
