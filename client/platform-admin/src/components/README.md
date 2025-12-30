# QuickLoginHelper Component

A development-only component that provides one-click access to **actual database users**.

## Usage

```jsx
import QuickLoginHelper from "../components/QuickLoginHelper";

<QuickLoginHelper onCredentialSelect={handleQuickLogin} type="platform" />;
```

## Available Users (Platform Admin) - ACTUAL DATABASE USERS

### **Platform Administrator**

- **Platform Admin**: admin@platform.local / Admin@123456
  - Real Name: Platform Administrator
  - Platform Role: super-admin
  - Status: active
  - Permissions: All platform permissions (wildcard access)

⚠️ **Development only** - automatically hidden in production builds.
✅ **Real Database Users** - These are actual users seeded in the database.

## Notes

The platform admin user is created by the migration script `002_create_default_tenant.js` and has full system access to manage tenants, subscriptions, and platform configuration.
