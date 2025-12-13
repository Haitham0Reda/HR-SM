# Platform Layer Integration Guide

This guide explains how to integrate the Platform Layer into your Express application.

## Prerequisites

1. MongoDB connection configured
2. Express app set up
3. Environment variables configured

## Step 1: Environment Variables

Add the following to your `.env` file:

```env
# Platform JWT Secret (must be different from tenant JWT secret)
PLATFORM_JWT_SECRET=your-secure-platform-secret-here

# Tenant JWT Secret (for comparison)
TENANT_JWT_SECRET=your-secure-tenant-secret-here

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/hrms

# Node Environment
NODE_ENV=development
```

## Step 2: Import Routes

In your `server/app.js` or main application file, import the platform routes:

```javascript
// Platform Layer Routes
const platformAuthRoutes = require('./platform/auth/routes/platformAuthRoutes');
const tenantRoutes = require('./platform/tenants/routes/tenantRoutes');
const subscriptionRoutes = require('./platform/subscriptions/routes/subscriptionRoutes');
const moduleRoutes = require('./platform/modules/routes/moduleRoutes');
const systemRoutes = require('./platform/system/routes/systemRoutes');
```

## Step 3: Register Routes

Register the platform routes with the `/api/platform` namespace:

```javascript
// Platform API Routes (namespace: /api/platform/*)
app.use('/api/platform/auth', platformAuthRoutes);
app.use('/api/platform/tenants', tenantRoutes);
app.use('/api/platform/subscriptions', subscriptionRoutes);
app.use('/api/platform/modules', moduleRoutes);
app.use('/api/platform/system', systemRoutes);
```

**Important:** Register these routes BEFORE your error handling middleware.

## Step 4: Create Initial Platform Admin

Create a script to initialize the first platform administrator:

```javascript
// server/scripts/createPlatformAdmin.js
const mongoose = require('mongoose');
const platformAuthService = require('../platform/auth/services/platformAuthService');

async function createPlatformAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);

    // Create platform admin
    const admin = await platformAuthService.createUser({
      email: 'admin@platform.com',
      password: 'ChangeThisPassword123!',
      firstName: 'Platform',
      lastName: 'Administrator',
      role: 'super-admin',
      permissions: []
    });

    console.log('Platform admin created successfully:', admin);
    process.exit(0);
  } catch (error) {
    console.error('Error creating platform admin:', error);
    process.exit(1);
  }
}

createPlatformAdmin();
```

Run the script:

```bash
node server/scripts/createPlatformAdmin.js
```

## Step 5: Test the Integration

### Test Health Check (Public)

```bash
curl http://localhost:3000/api/platform/system/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-09T10:00:00Z",
    "checks": {
      "database": { "status": "healthy" },
      "memory": { "status": "healthy" },
      "disk": { "status": "healthy" }
    },
    "uptime": 123.45,
    "version": "1.0.0"
  }
}
```

### Test Platform Login

```bash
curl -X POST http://localhost:3000/api/platform/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@platform.com",
    "password": "ChangeThisPassword123!"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {
      "email": "admin@platform.com",
      "firstName": "Platform",
      "lastName": "Administrator",
      "role": "super-admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Test Authenticated Endpoint

Use the token from login:

```bash
curl http://localhost:3000/api/platform/tenants \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Step 6: Create Default Tenant (Optional)

Create a script to set up a default tenant for existing data:

```javascript
// server/scripts/createDefaultTenant.js
const mongoose = require('mongoose');
const tenantProvisioningService = require('../platform/tenants/services/tenantProvisioningService');

async function createDefaultTenant() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const result = await tenantProvisioningService.createTenant({
      name: 'Default Company',
      domain: 'default.example.com',
      deploymentMode: 'on-premise',
      contactInfo: {
        adminEmail: 'admin@default.com',
        adminName: 'Default Admin'
      },
      adminUser: {
        email: 'admin@default.com',
        password: 'DefaultPassword123!',
        firstName: 'Default',
        lastName: 'Admin'
      }
    });

    console.log('Default tenant created:', result.tenant.tenantId);
    console.log('Admin user created:', result.adminUser.email);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating default tenant:', error);
    process.exit(1);
  }
}

createDefaultTenant();
```

## Step 7: Middleware Order

Ensure your middleware is in the correct order:

```javascript
// 1. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Cookie parser (for JWT cookies)
app.use(cookieParser());

// 3. CORS (if needed)
app.use(cors());

// 4. Request ID (optional but recommended)
app.use((req, res, next) => {
  req.id = require('crypto').randomBytes(16).toString('hex');
  next();
});

// 5. Platform routes
app.use('/api/platform/auth', platformAuthRoutes);
app.use('/api/platform/tenants', tenantRoutes);
app.use('/api/platform/subscriptions', subscriptionRoutes);
app.use('/api/platform/modules', moduleRoutes);
app.use('/api/platform/system', systemRoutes);

// 6. Tenant routes (existing routes)
app.use('/api/v1', tenantRoutes);

// 7. Error handling (must be last)
app.use(errorHandler);
```

## Step 8: Create Sample Plans

Create subscription plans:

```javascript
// server/scripts/createSamplePlans.js
const mongoose = require('mongoose');
const Plan = require('../platform/subscriptions/models/Plan');

async function createSamplePlans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const plans = [
      {
        name: 'free',
        displayName: 'Free Plan',
        description: 'Basic HR features for small teams',
        tier: 'free',
        pricing: {
          monthly: 0,
          yearly: 0,
          currency: 'USD',
          trialDays: 0
        },
        includedModules: [
          { moduleId: 'hr-core', included: true }
        ],
        limits: {
          maxUsers: 10,
          maxStorage: 1073741824, // 1GB
          apiCallsPerMonth: 10000
        },
        features: ['Basic attendance', 'Leave management', 'User management'],
        isActive: true,
        isPublic: true,
        sortOrder: 1
      },
      {
        name: 'professional',
        displayName: 'Professional Plan',
        description: 'Advanced features for growing companies',
        tier: 'professional',
        pricing: {
          monthly: 49.99,
          yearly: 499.99,
          currency: 'USD',
          trialDays: 14
        },
        includedModules: [
          { moduleId: 'hr-core', included: true },
          { moduleId: 'tasks', included: true },
          { moduleId: 'email-service', included: true }
        ],
        limits: {
          maxUsers: 100,
          maxStorage: 10737418240, // 10GB
          apiCallsPerMonth: 100000
        },
        features: [
          'All Free features',
          'Task management',
          'Email notifications',
          'Advanced reporting'
        ],
        isActive: true,
        isPublic: true,
        sortOrder: 2
      }
    ];

    for (const planData of plans) {
      const plan = new Plan(planData);
      await plan.save();
      console.log(`Created plan: ${plan.displayName}`);
    }

    console.log('Sample plans created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample plans:', error);
    process.exit(1);
  }
}

createSamplePlans();
```

## Common Issues

### Issue: "PLATFORM_JWT_SECRET is not configured"

**Solution:** Ensure `PLATFORM_JWT_SECRET` is set in your `.env` file and the file is being loaded.

### Issue: "Cannot find module '../../../core/errors/AppError'"

**Solution:** Ensure the core layer is properly set up. The platform layer depends on:
- `server/core/errors/AppError.js`
- `server/core/errors/errorTypes.js`
- `server/core/auth/platformAuth.js`

### Issue: Routes return 404

**Solution:** Check that:
1. Routes are registered in the correct order
2. The base path is `/api/platform/*`
3. The server is restarted after adding routes

### Issue: Authentication fails

**Solution:** Verify:
1. `PLATFORM_JWT_SECRET` is set and different from `TENANT_JWT_SECRET`
2. Platform user exists in `platform_users` collection
3. Token is being sent in Authorization header: `Bearer <token>`

## Next Steps

1. **Frontend Integration:** Create a platform admin dashboard
2. **Monitoring:** Set up monitoring for health endpoints
3. **Logging:** Implement audit logging for platform operations
4. **Security:** Add rate limiting and IP whitelisting
5. **Documentation:** Generate API documentation (Swagger/OpenAPI)

## API Documentation

For detailed API documentation, see:
- [Platform README](./README.md) - Complete API reference
- [Authentication](./auth/README.md) - Authentication details (to be created)
- [Tenant Management](./tenants/README.md) - Tenant operations (to be created)
- [Subscriptions](./subscriptions/README.md) - Subscription management (to be created)

## Support

For issues or questions:
1. Check the [Platform README](./README.md)
2. Review error logs in `logs/` directory
3. Check database connectivity
4. Verify environment variables
