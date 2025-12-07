# Migration Guide: Integrating Modular HRMS

This guide will help you integrate the new modular HRMS system with your existing codebase.

## Overview

The new modular system has been designed to work alongside your existing routes and gradually replace them. This allows for a smooth transition without breaking existing functionality.

## File Structure

### New Files Created

```
server/
├── shared/                          # NEW - Shared utilities
│   ├── constants/modules.js         # Module definitions
│   ├── middleware/
│   │   ├── auth.js                  # New auth middleware
│   │   ├── moduleGuard.js           # Module access control
│   │   └── tenantContext.js         # Tenant isolation
│   ├── models/BaseModel.js          # Base schema plugin
│   └── utils/fileUtils.js           # File utilities
│
├── modules/                         # NEW - Modular structure
│   ├── hr-core/                     # Core HR module
│   │   ├── models/
│   │   │   ├── User.js              # New user model
│   │   │   ├── TenantConfig.js      # Tenant configuration
│   │   │   ├── Department.js        # Department model
│   │   │   ├── Position.js          # Position model
│   │   │   └── AuditLog.js          # Audit logging
│   │   ├── controllers/
│   │   │   ├── authController.js    # New auth controller
│   │   │   └── userController.js    # New user controller
│   │   └── routes/
│   │       ├── authRoutes.js        # New auth routes
│   │       ├── userRoutes.js        # New user routes
│   │       └── tenantRoutes.js      # Tenant management
│   │
│   └── tasks/                       # Task module
│       ├── models/
│       │   ├── Task.js
│       │   └── TaskReport.js
│       ├── controllers/
│       │   ├── taskController.js
│       │   └── taskReportController.js
│       ├── routes/
│       │   ├── taskRoutes.js
│       │   └── taskReportRoutes.js
│       ├── services/
│       │   └── notificationService.js
│       └── __tests__/
│           └── task.test.js
│
├── config/
│   ├── database.js                  # NEW - DB connection
│   ├── moduleRegistry.js            # NEW - Module registry
│   └── moduleRegistry.integrated.js # NEW - Integrated registry
│
├── app.js                           # NEW - Modular app setup
├── app.integrated.js                # NEW - Integrated app
└── index.js                         # NEW - Server entry

### Existing Files (Unchanged)
```

server/
├── controller/ # Your existing controllers
├── models/ # Your existing models
├── routes/ # Your existing routes
├── middleware/ # Your existing middleware
└── utils/ # Your existing utilities

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

### Step 9: Gradual Migration of Existing Routes

Migrate one module at a time:

1. **Choose a module** (e.g., Attendance)

2. **Create new modular structure**:

```
server/modules/attendance/
├── models/
│   └── Attendance.js (copy from server/models/)
├── controllers/
│   └── attendanceController.js (copy from server/controller/)
└── routes/
    └── attendanceRoutes.js (copy from server/routes/)
```

3. **Update the model** to use BaseModel:

```javascript
import { baseSchemaPlugin } from "../../shared/models/BaseModel.js";

const attendanceSchema = new mongoose.Schema({
  // Your existing schema
});

// Add multi-tenancy support
attendanceSchema.plugin(baseSchemaPlugin);
```

4. **Update the controller** to use tenant context:

```javascript
export const getAttendance = async (req, res) => {
  // Automatically filtered by tenantId via middleware
  const attendance = await Attendance.find({
    tenantId: req.tenantId,
  });

  res.json({ success: true, data: attendance });
};
```

5. **Update module registry**:

```javascript
[MODULES.ATTENDANCE]: {
    routes: {
        attendance: () => import('../modules/attendance/routes/attendanceRoutes.js')
    },
    basePath: '/api/v1/attendance',
    modular: true // Changed from legacy: true
}
```

6. **Test the migrated module**

7. **Repeat for other modules**

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
