# Migration Guide: Modular HRMS - COMPLETE ✅

## Overview

The modular HRMS system has been **successfully implemented and integrated**. The physical file restructuring is complete, with all legacy files moved to their appropriate module locations.

## Status: MIGRATION COMPLETE ✅

All migration phases have been completed:
- ✅ Physical file restructuring finished
- ✅ All legacy directories cleaned up  
- ✅ Import paths updated
- ✅ Modular architecture fully implemented
- ✅ Documentation updated

## File Structure

## What Was Accomplished

### ✅ Complete File Restructuring

All legacy files have been successfully moved to their appropriate module locations:

```
MOVED FROM → TO:
server/controller/ → server/modules/*/controllers/
server/models/ → server/modules/*/models/  
server/routes/ → server/modules/*/routes/

LEGACY DIRECTORIES REMOVED:
❌ server/controller/ (cleaned up)
❌ server/models/ (cleaned up)
❌ server/routes/ (cleaned up)

NEW MODULAR STRUCTURE:
✅ server/core/ (core infrastructure)
✅ server/modules/ (business modules)
✅ server/platform/ (platform administration)
✅ server/shared/ (shared utilities)
```

### ✅ Module Organization

All business logic organized into modules:

- **HR-Core Module**: Users, attendance, vacations, holidays, missions, overtime, requests, backup
- **Tasks Module**: Task management and work reporting
- **Clinic Module**: Medical services
- **Email Service Module**: Email functionality
- **Payroll Module**: Payroll processing
- **Reports Module**: Reporting functionality
- **Documents Module**: Document management
- **Announcements Module**: Company announcements
- **Surveys Module**: Employee surveys
- **Notifications Module**: System notifications
- **Events Module**: Event management
- **Analytics Module**: Data analytics
- **Dashboard Module**: Dashboard functionality
- **Theme Module**: UI theming

````

## Migration Steps

### Step 1: Backup Your Current System

```bash
# Create a backup branch
git checkout -b backup-before-modular-migration
git add .
git commit -m "Backup before modular HRMS migration"

# Create working branch
git checkout -b feature/modular-hrms-integration
````

### Step 2: Update Environment Variables

Add these to your `.env` file:

```env
# Module System Configuration
DEPLOYMENT_MODE=saas
# Options: saas | on-premise

# JWT Configuration (if not already present)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Multi-tenant Configuration
DEFAULT_TENANT_ID=default
```

### Step 3: Choose Integration Approach

You have two options:

#### Option A: Side-by-Side (Recommended)

Run both systems simultaneously. New features use modular system, existing features continue working.

**Use**: `server/app.integrated.js`

#### Option B: Full Migration

Migrate all existing routes to the modular system immediately.

**Use**: `server/app.js` (requires more work upfront)

### Step 4: Implement Side-by-Side Integration

1. **Rename your current server files** (backup):

```bash
mv server/index.js server/index.old.js
mv server/app.js server/app.old.js
```

2. **Use the integrated versions**:

```bash
cp server/app.integrated.js server/app.js
# The new server/index.js is already in place
```

3. **Update your package.json** (if needed):

```json
{
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "concurrently \"nodemon server/index.js\" \"npm run client\""
  }
}
```

### Step 5: Database Migration

Create a migration script to add `tenantId` to existing data:

```javascript
// server/scripts/migrations/addTenantId.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "default";

async function migrateTenantId() {
  await mongoose.connect(process.env.MONGODB_URI);

  const collections = [
    "users",
    "departments",
    "positions",
    "attendances",
    "documents",
    "tasks",
    // Add all your collections
  ];

  for (const collectionName of collections) {
    const collection = mongoose.connection.collection(collectionName);

    // Add tenantId to documents that don't have it
    const result = await collection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );

    console.log(
      `✓ Updated ${result.modifiedCount} documents in ${collectionName}`
    );
  }

  console.log("✓ Migration complete");
  process.exit(0);
}

migrateTenantId().catch(console.error);
```

Run the migration:

```bash
node server/scripts/migrations/addTenantId.js
```

### Step 6: Create Initial Tenant Configuration

```javascript
// server/scripts/setup/createInitialTenant.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import TenantConfig from "../modules/hr-core/models/TenantConfig.js";
import { MODULES } from "../shared/constants/modules.js";

dotenv.config();

async function createInitialTenant() {
  await mongoose.connect(process.env.MONGODB_URI);

  const tenantId = process.env.DEFAULT_TENANT_ID || "default";

  // Check if tenant already exists
  let tenant = await TenantConfig.findOne({ tenantId });

  if (!tenant) {
    tenant = await TenantConfig.create({
      tenantId,
      companyName: "Your Company Name",
      deploymentMode: "saas",
      modules: new Map([
        [MODULES.HR_CORE, { enabled: true, enabledAt: new Date() }],
        [MODULES.ATTENDANCE, { enabled: true, enabledAt: new Date() }],
        [MODULES.LEAVE, { enabled: true, enabledAt: new Date() }],
        [MODULES.PAYROLL, { enabled: true, enabledAt: new Date() }],
        [MODULES.DOCUMENTS, { enabled: true, enabledAt: new Date() }],
        [MODULES.COMMUNICATION, { enabled: true, enabledAt: new Date() }],
        [MODULES.REPORTING, { enabled: true, enabledAt: new Date() }],
        [MODULES.TASKS, { enabled: true, enabledAt: new Date() }],
      ]),
      subscription: {
        plan: "enterprise",
        status: "active",
        maxEmployees: 1000,
      },
    });

    console.log("✓ Initial tenant created:", tenant.tenantId);
  } else {
    console.log("✓ Tenant already exists:", tenant.tenantId);
  }

  process.exit(0);
}

createInitialTenant().catch(console.error);
```

Run the setup:

```bash
node server/scripts/setup/createInitialTenant.js
```

### Step 7: Update Existing Middleware

Your existing middleware needs to be aware of the tenant context. Wrap your existing auth middleware:

```javascript
// server/middleware/authMiddleware.js (update existing)
import { requireAuth as newRequireAuth } from "../shared/middleware/auth.js";

// Keep your existing auth logic
export const authenticate = async (req, res, next) => {
  // Your existing authentication logic
  // ...

  // Add tenantId to req.user if not present
  if (req.user && !req.user.tenantId) {
    req.user.tenantId = process.env.DEFAULT_TENANT_ID || "default";
  }

  next();
};

// Export both old and new
export const requireAuth = newRequireAuth;
```

### Step 8: Test the Integration

1. **Start the server**:

```bash
npm run dev
```

2. **Test health check**:

```bash
curl http://localhost:5000/health
```

3. **Test existing routes** (should still work):

```bash
curl http://localhost:5000/api/users
curl http://localhost:5000/api/departments
```

4. **Test new modular routes**:

```bash
# Login with new auth
curl -X POST http://localhost:5000/api/v1/hr-core/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password",
    "tenantId": "default"
  }'

# Get tenant modules
curl http://localhost:5000/api/v1/hr-core/tenant/modules \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ✅ Migration Results

All modules have been successfully migrated:

### HR-Core Module Structure
```
server/modules/hr-core/
├── attendance/
│   ├── controllers/
│   ├── models/
│   └── routes.js
├── auth/
│   ├── controllers/
│   └── routes.js
├── users/
│   ├── controllers/  # user, department, position
│   ├── models/       # user, department, position
│   └── routes.js     # merged routes
├── vacations/
│   ├── controllers/  # vacation, mixedVacation
│   ├── models/       # vacation, mixedVacation, vacationBalance
│   └── routes.js     # merged routes
├── holidays/
├── missions/
├── overtime/
├── requests/
└── backup/
```

### Other Modules
```
server/modules/
├── tasks/           # Complete task management
├── clinic/          # Medical services
├── email-service/   # Email functionality
├── payroll/         # Payroll processing
├── reports/         # Reporting
├── documents/       # Document management
├── announcements/   # Company announcements
├── surveys/         # Employee surveys
├── notifications/   # System notifications
├── events/          # Event management
├── analytics/       # Data analytics
├── dashboard/       # Dashboard functionality
└── theme/           # UI theming
```

### Updated Import Paths
All imports now use the new modular structure:

```javascript
// OLD (no longer exists)
import userController from "../controller/user.controller.js";

// NEW (current structure)
import userController from "../modules/hr-core/users/controllers/user.controller.js";
```

### Step 10: Update Frontend

1. **Add context providers** to `client/src/App.js`:

```jsx
import { AuthProvider } from "./contexts/AuthContext";
import { ModuleProvider } from "./contexts/ModuleContext";

function App() {
  return (
    <AuthProvider>
      <ModuleProvider>{/* Your existing app */}</ModuleProvider>
    </AuthProvider>
  );
}
```

2. **Update routes** to use ProtectedRoute:

```jsx
import ProtectedRoute from "./components/ProtectedRoute";

<Route
  path="/tasks"
  element={
    <ProtectedRoute requiredModule="tasks">
      <TaskList />
    </ProtectedRoute>
  }
/>;
```

3. **Update navigation** to check module access:

```jsx
import { useModules } from "./contexts/ModuleContext";

function Navigation() {
  const { isModuleEnabled } = useModules();

  return (
    <nav>
      {isModuleEnabled("tasks") && <Link to="/tasks">Tasks</Link>}
      {/* Other nav items */}
    </nav>
  );
}
```

## Rollback Plan

If you encounter issues:

1. **Restore old server files**:

```bash
mv server/index.old.js server/index.js
mv server/app.old.js server/app.js
```

2. **Restart server**:

```bash
npm restart
```

3. **Revert database changes** (if needed):

```javascript
// Remove tenantId field
db.users.updateMany({}, { $unset: { tenantId: "" } });
```

## Verification Checklist

- [ ] Server starts without errors
- [ ] Health check endpoint responds
- [ ] Existing routes still work
- [ ] New modular routes work
- [ ] Database has tenantId field
- [ ] Tenant configuration exists
- [ ] All modules are enabled
- [ ] Frontend loads correctly
- [ ] Authentication works
- [ ] Module access control works
- [ ] File uploads work
- [ ] Tests pass

## Common Issues

### Issue 1: Module Not Found

**Error**: `Module 'xxx' not found in registry`

**Solution**: Add the module to `moduleRegistry.integrated.js`

### Issue 2: Tenant Context Missing

**Error**: `Tenant context required`

**Solution**: Ensure `tenantContext` middleware is applied before routes

### Issue 3: Routes Conflict

**Error**: Routes responding incorrectly

**Solution**: Check route order in app.js. New modular routes should be loaded first.

### Issue 4: Database Connection

**Error**: `MongoServerError: connect ECONNREFUSED`

**Solution**: Ensure MongoDB is running and MONGODB_URI is correct

## Support

For issues during migration:

1. Check the logs: `tail -f logs/combined.log`
2. Review the error stack trace
3. Consult the documentation files
4. Create an issue with details

## Next Steps After Migration

1. **Enable module-based access control** for different tenants
2. **Implement remaining modules** (if needed)
3. **Add multi-tenant support** for new clients
4. **Set up monitoring** and alerts
5. **Configure backups** for the new structure
6. **Update documentation** for your team
7. **Train users** on new features

---

**Migration Status**: Ready for integration
**Estimated Time**: 2-4 hours for basic integration
**Risk Level**: Low (side-by-side approach)
