# Troubleshooting Attendance Device Routes

## Common Issues and Solutions

### 1. 404 Error: Route Not Found

**Error Message:**
```
GET http://localhost:5000/api/v1/attendance-devices 404 (Not Found)
```

**Cause:** The server hasn't been restarted after adding the attendance-devices route to the module registry.

**Solution:**
1. **Restart your server** - This is the most common fix
2. **Verify route loading** by running: `npm run test-attendance-routes`
3. **Check server logs** for any route loading errors during startup

### 2. Import Errors

**Error Message:**
```
Error loading module HR_CORE: Cannot resolve module
```

**Cause:** Missing or incorrect imports in the route files.

**Solution:**
1. Check that all imports in `attendanceDevice.routes.js` are correct
2. Verify the controller file exists and exports all required functions
3. Ensure middleware imports are using the correct paths

### 3. Middleware Errors

**Error Message:**
```
tenantContext is not a function
```

**Cause:** Incorrect import path for tenantContext middleware.

**Solution:**
```javascript
// Correct import
import { tenantContext } from '../../../core/middleware/tenantContext.js';

// Incorrect import (will cause errors)
import { tenantContext } from '../../../middleware/index.js';
```

### 4. Database Connection Issues

**Error Message:**
```
MongooseError: Operation `attendancedevices.find()` buffering timed out
```

**Cause:** Database connection issues or missing tenantId field.

**Solution:**
1. **Run migration** if upgrading from single-tenant: `npm run migrate-attendance-devices`
2. **Check database connection** in your environment variables
3. **Verify tenantId field** exists in your attendance devices collection

### 5. Authentication Issues

**Error Message:**
```
401 Unauthorized
```

**Cause:** Missing or invalid JWT token, or token doesn't contain tenant information.

**Solution:**
1. **Check JWT token** contains `tenantId` field
2. **Verify authentication** is working for other endpoints
3. **Check user permissions** - device management requires admin or HR role

## Verification Steps

### Step 1: Test Route Loading
```bash
npm run test-attendance-routes
```

Expected output:
```
✅ Attendance device routes loaded successfully
✅ Router has 13 routes defined
✅ attendance-devices route found in module registry
✅ Route loaded successfully through module registry
```

### Step 2: Check Server Startup Logs
Look for this line in your server logs:
```
✓ Loaded route: /api/v1/attendance-devices
```

### Step 3: Test Basic Endpoint
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/v1/attendance-devices
```

Expected response (empty array if no devices):
```json
{
  "success": true,
  "count": 0,
  "data": []
}
```

### Step 4: Verify Database Migration (if needed)
```bash
# Set your tenant ID first
export DEFAULT_TENANT_ID="your_tenant_objectid_here"

# Run migration
npm run migrate-attendance-devices
```

## Quick Fixes Checklist

- [ ] Server restarted after route changes
- [ ] Route appears in module registry (`attendance-devices`)
- [ ] All imports are correct in route files
- [ ] Database migration completed (if upgrading)
- [ ] JWT token contains tenant information
- [ ] User has appropriate permissions (admin/hr)
- [ ] Database connection is working

## Advanced Debugging

### Enable Debug Logging
Add this to your server startup to see detailed route loading:
```javascript
// In server/app.js or server/index.js
console.log('Loading routes...');
```

### Check Route Registration
Add logging to module registry:
```javascript
// In server/config/moduleRegistry.js
console.log(`✓ Loaded route: ${routePath}`);
```

### Verify Middleware Chain
Add logging to your routes:
```javascript
// In attendanceDevice.routes.js
router.use((req, res, next) => {
    console.log(`Attendance device route: ${req.method} ${req.path}`);
    next();
});
```

## Getting Help

If you're still experiencing issues:

1. **Check the main documentation**: `docs/ATTENDANCE_DEVICE_MULTI_TENANT.md`
2. **Review server logs** for specific error messages
3. **Run the test script**: `npm run test-attendance-routes`
4. **Verify your environment** matches the requirements
5. **Check database connectivity** and migration status

## Environment Requirements

- Node.js 16+ with ES modules support
- MongoDB connection with proper permissions
- Valid JWT tokens with tenant information
- Proper user roles (admin/hr for device management)

## Common Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/hrms

# JWT
JWT_SECRET=your_jwt_secret_here

# Migration (if needed)
DEFAULT_TENANT_ID=your_tenant_objectid_here
```