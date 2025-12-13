# LicenseContext

The `LicenseContext` provides a centralized way to manage and access license information throughout the React application. It handles fetching license data, checking module access, monitoring usage limits, and tracking license expiration.

## Features

- ✅ Module access control (check if modules are enabled)
- ✅ License information retrieval (tier, limits, expiration)
- ✅ Usage tracking and limit monitoring
- ✅ Expiration warnings and checks
- ✅ Automatic data caching and refresh
- ✅ Error handling and loading states

## Setup

The `LicenseProvider` is already integrated into the application in `App.js`. It wraps the entire application and provides license context to all components.

```javascript
<AuthProvider>
  <LicenseProvider>
    <NotificationProvider>{/* Your app components */}</NotificationProvider>
  </LicenseProvider>
</AuthProvider>
```

**Note:** `LicenseProvider` must be nested inside `AuthProvider` because it depends on authentication state.

## Usage

### Import the hook

```javascript
import { useLicense } from "../context/LicenseContext";
```

### Basic Usage

```javascript
function MyComponent() {
  const { isModuleEnabled, loading } = useLicense();

  if (loading) {
    return <div>Loading...</div>;
  }

  const canAccessAttendance = isModuleEnabled("attendance");

  return (
    <div>
      {canAccessAttendance ? (
        <AttendanceFeature />
      ) : (
        <LockedFeature moduleName="Attendance" />
      )}
    </div>
  );
}
```

## API Reference

### State Properties

#### `licenses`

- **Type:** `Object`
- **Description:** Map of module keys to license information
- **Example:**
  ```javascript
  {
    'attendance': {
      enabled: true,
      tier: 'business',
      limits: { employees: 200, storage: 10737418240, apiCalls: 50000 },
      activatedAt: '2025-01-01T00:00:00.000Z',
      expiresAt: '2026-01-01T00:00:00.000Z',
      status: 'active',
      billingCycle: 'annual'
    }
  }
  ```

#### `usage`

- **Type:** `Object`
- **Description:** Map of module keys to usage information
- **Example:**
  ```javascript
  {
    'attendance': {
      employees: { current: 150, limit: 200, percentage: 75 },
      storage: { current: 8589934592, limit: 10737418240, percentage: 80 },
      apiCalls: { current: 35000, limit: 50000, percentage: 70 },
      warnings: [],
      violations: []
    }
  }
  ```

#### `loading`

- **Type:** `boolean`
- **Description:** Indicates if license data is being fetched

#### `error`

- **Type:** `string | null`
- **Description:** Error message if license fetch failed

### Module Access Methods

#### `isModuleEnabled(moduleKey)`

Check if a module is enabled.

**Parameters:**

- `moduleKey` (string): The module key (e.g., 'attendance', 'payroll')

**Returns:** `boolean`

**Example:**

```javascript
const { isModuleEnabled } = useLicense();
const canAccess = isModuleEnabled("attendance"); // true or false
```

**Note:** Core HR (`'hr-core'`) always returns `true`.

#### `getModuleLicense(moduleKey)`

Get detailed license information for a module.

**Parameters:**

- `moduleKey` (string): The module key

**Returns:** `Object | null`

**Example:**

```javascript
const { getModuleLicense } = useLicense();
const license = getModuleLicense("attendance");
// Returns: { enabled, tier, limits, activatedAt, expiresAt, status, billingCycle }
```

#### `getEnabledModules()`

Get an array of all enabled module keys.

**Returns:** `string[]`

**Example:**

```javascript
const { getEnabledModules } = useLicense();
const modules = getEnabledModules();
// Returns: ['attendance', 'payroll', 'documents']
```

### Usage Monitoring Methods

#### `isApproachingLimit(moduleKey, limitType)`

Check if a module is approaching its usage limit (>= 80%).

**Parameters:**

- `moduleKey` (string): The module key
- `limitType` (string): The limit type ('employees', 'storage', 'apiCalls')

**Returns:** `boolean`

**Example:**

```javascript
const { isApproachingLimit } = useLicense();
const warning = isApproachingLimit("attendance", "employees");
if (warning) {
  // Show warning banner
}
```

#### `getModuleUsage(moduleKey)`

Get detailed usage information for a module.

**Parameters:**

- `moduleKey` (string): The module key

**Returns:** `Object | null`

**Example:**

```javascript
const { getModuleUsage } = useLicense();
const usage = getModuleUsage("attendance");
// Returns: { employees: {...}, storage: {...}, apiCalls: {...}, warnings: [], violations: [] }
```

#### `hasUsageWarnings()`

Check if any module has usage warnings.

**Returns:** `boolean`

**Example:**

```javascript
const { hasUsageWarnings } = useLicense();
if (hasUsageWarnings()) {
  // Show global warning banner
}
```

#### `hasUsageViolations()`

Check if any module has exceeded usage limits.

**Returns:** `boolean`

**Example:**

```javascript
const { hasUsageViolations } = useLicense();
if (hasUsageViolations()) {
  // Show critical alert
}
```

### Expiration Methods

#### `isLicenseExpired(moduleKey)`

Check if a module's license is expired.

**Parameters:**

- `moduleKey` (string): The module key

**Returns:** `boolean`

**Example:**

```javascript
const { isLicenseExpired } = useLicense();
if (isLicenseExpired("attendance")) {
  // Show renewal prompt
}
```

#### `getDaysUntilExpiration(moduleKey)`

Get the number of days until a license expires.

**Parameters:**

- `moduleKey` (string): The module key

**Returns:** `number | null`

**Example:**

```javascript
const { getDaysUntilExpiration } = useLicense();
const days = getDaysUntilExpiration("attendance");
// Returns: 45 (or null if no expiration date)
```

#### `isExpiringSoon(moduleKey, daysThreshold)`

Check if a license is expiring within a threshold.

**Parameters:**

- `moduleKey` (string): The module key
- `daysThreshold` (number): Days threshold (default: 30)

**Returns:** `boolean`

**Example:**

```javascript
const { isExpiringSoon } = useLicense();
if (isExpiringSoon("attendance", 30)) {
  // Show 30-day warning
}
if (isExpiringSoon("attendance", 7)) {
  // Show critical 7-day warning
}
```

### Actions

#### `refreshLicenses()`

Manually refresh license data from the server.

**Returns:** `Promise<void>`

**Example:**

```javascript
const { refreshLicenses } = useLicense();

const handleRefresh = async () => {
  await refreshLicenses();
  console.log("License data refreshed");
};
```

## Module Keys

The following module keys are available:

- `'hr-core'` - Core HR (always enabled)
- `'attendance'` - Attendance & Time Tracking
- `'leave'` - Leave Management
- `'payroll'` - Payroll Processing
- `'documents'` - Document Management
- `'communication'` - Communication Tools
- `'reporting'` - Reporting & Analytics
- `'tasks'` - Task Management

## Common Patterns

### Conditional Rendering

```javascript
function FeatureComponent() {
  const { isModuleEnabled } = useLicense();

  if (!isModuleEnabled("attendance")) {
    return <LockedFeature />;
  }

  return <AttendanceFeature />;
}
```

### Usage Warning Banner

```javascript
function UsageWarningBanner() {
  const { isApproachingLimit, getModuleUsage } = useLicense();
  const moduleKey = "attendance";

  if (!isApproachingLimit(moduleKey, "employees")) {
    return null;
  }

  const usage = getModuleUsage(moduleKey);

  return (
    <Alert severity="warning">
      You're using {usage.employees.percentage}% of your employee limit.
      Consider upgrading your plan.
    </Alert>
  );
}
```

### Expiration Warning

```javascript
function ExpirationWarning({ moduleKey }) {
  const { isExpiringSoon, getDaysUntilExpiration } = useLicense();

  if (!isExpiringSoon(moduleKey, 30)) {
    return null;
  }

  const days = getDaysUntilExpiration(moduleKey);
  const severity = days <= 7 ? "error" : "warning";

  return (
    <Alert severity={severity}>
      Your license expires in {days} days. Renew now to avoid service
      interruption.
    </Alert>
  );
}
```

### Navigation Menu Filtering

```javascript
function NavigationMenu() {
  const { isModuleEnabled } = useLicense();

  const menuItems = [
    { key: "attendance", label: "Attendance", path: "/app/attendance" },
    { key: "payroll", label: "Payroll", path: "/app/payroll" },
    { key: "documents", label: "Documents", path: "/app/documents" },
  ];

  return (
    <nav>
      {menuItems
        .filter((item) => isModuleEnabled(item.key))
        .map((item) => (
          <NavLink key={item.key} to={item.path}>
            {item.label}
          </NavLink>
        ))}
    </nav>
  );
}
```

## Error Handling

```javascript
function LicenseAwareComponent() {
  const { loading, error, refreshLicenses } = useLicense();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorMessage>
        <p>Failed to load license information: {error}</p>
        <button onClick={refreshLicenses}>Retry</button>
      </ErrorMessage>
    );
  }

  return <YourComponent />;
}
```

## Best Practices

1. **Always check loading state** before accessing license data
2. **Handle errors gracefully** with retry mechanisms
3. **Use Core HR bypass** - Remember that 'hr-core' is always enabled
4. **Cache-friendly** - The context automatically caches data, no need to implement your own caching
5. **Refresh on critical actions** - Call `refreshLicenses()` after subscription changes
6. **Show clear upgrade paths** - When features are locked, provide clear CTAs to upgrade

## Performance Considerations

- License data is fetched once on mount and cached
- The context uses `useCallback` to memoize functions
- Data is only refetched when authentication state changes or when manually refreshed
- Backend implements 5-minute caching for license validation

## Backend API Endpoints

The context expects the following API endpoints:

- `GET /api/v1/licenses/:tenantId` - Get license information
- `GET /api/v1/licenses/:tenantId/usage` - Get usage metrics

## See Also

- [LicenseContext.example.js](./LicenseContext.example.js) - Comprehensive usage examples
- [Design Document](.kiro/specs/feature-productization/design.md) - Full feature design
- [Requirements](.kiro/specs/feature-productization/requirements.md) - Feature requirements
