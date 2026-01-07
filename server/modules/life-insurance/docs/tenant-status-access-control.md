# Tenant Status Access Control Implementation

## Overview

This document describes the implementation of tenant status access control for the life insurance module, fulfilling **Requirement 1.5**.

## Implementation Details

### Middleware Integration

The tenant status access control is implemented in the `protect` middleware (`server/middleware/authMiddleware.js`). This middleware is applied to all insurance routes via the route configuration in `server/modules/life-insurance/routes/insuranceRoutes.js`.

### Status Checks

The middleware checks for the following tenant statuses and denies access accordingly:

1. **Suspended Tenants** (`status: 'suspended'`)
   - Returns HTTP 403 Forbidden
   - Response: `{ success: false, message: 'Tenant account is suspended' }`
   - Logs event as `TENANT_SUSPENDED` for audit purposes

2. **Cancelled Tenants** (`status: 'cancelled'`)
   - Returns HTTP 403 Forbidden  
   - Response: `{ success: false, message: 'Tenant account is cancelled' }`
   - Logs event as `TENANT_CANCELLED` for audit purposes

### Allowed Statuses

The following tenant statuses allow access to insurance endpoints:

- `active` - Full access to all insurance functionality
- `trial` - Full access during trial period

### Error Response Format

The error responses follow the standardized format used throughout the insurance module:

```json
{
  "success": false,
  "message": "Tenant account is suspended"
}
```

This format is consistent with the `sendError` utility used in insurance controllers.

### Audit Logging

All tenant status access denials are logged with:
- Event type (`TENANT_SUSPENDED` or `TENANT_CANCELLED`)
- Tenant ID
- Request context
- Reason for denial

### Integration Points

1. **Route Level**: Applied via `router.use(protect)` in insurance routes
2. **Controller Level**: Controllers receive `req.tenant` with status information
3. **Audit Level**: All access attempts are logged for compliance

## Testing

A comprehensive test suite has been created at `server/testing/modules/life-insurance/tenantStatusAccess.test.js` that validates:

- Access granted for active tenants
- Access denied for suspended tenants  
- Access denied for cancelled tenants
- Access granted for trial tenants
- Correct error response format
- Proper HTTP status codes

## Requirements Validation

This implementation satisfies **Requirement 1.5**:
> "WHEN a tenant is suspended or cancelled, THE Insurance_Module SHALL deny access with appropriate error messages"

✅ **Suspended tenants**: Access denied with clear error message  
✅ **Cancelled tenants**: Access denied with clear error message  
✅ **Appropriate error messages**: Standardized format with descriptive messages  
✅ **Consistent enforcement**: Applied to all insurance endpoints via middleware  
✅ **Audit logging**: All access denials are logged for compliance