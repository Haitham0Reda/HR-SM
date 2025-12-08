# Feature Productization Design Document

## Overview

This design document outlines the architecture and implementation strategy for transforming the existing Modular HRMS into a fully productized SaaS platform. The system will support granular module-level licensing, independent product modules, usage limits, and commercial controls for both multi-tenant SaaS and On-Premise deployments.

The core principle is: **If a module can be disabled, it has value alone, and it checks license before use → it is a product.**

### Key Design Goals

1. **Module Independence**: Each product module operates independently with no hard dependencies on other modules (except Core HR)
2. **Dual Deployment Support**: Seamless operation in both SaaS (subscription-based) and On-Premise (license file-based) modes
3. **Commercial Flexibility**: Support for multiple pricing tiers, usage limits, and bundle discounts
4. **User Experience**: Clear UI/UX for locked features with upgrade paths
5. **Auditability**: Complete tracking of license validation and usage for compliance

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Pricing Page │  │ License Page │  │ Error Pages  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Module UI Components (Conditional)           │   │
│  │  Attendance │ Leave │ Payroll │ Documents │ Tasks   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway / Router                        │
│              (License Validation Middleware)                 │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Core HR    │  │   Product    │  │   Product    │
│   (Always    │  │   Module 1   │  │   Module N   │
│   Enabled)   │  │  (Licensed)  │  │  (Licensed)  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              License Management System                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   License    │  │    Usage     │  │    Audit     │      │
│  │  Validator   │  │   Tracker    │  │    Logger    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌──────────────┐                      ┌──────────────┐
│  License DB  │                      │  License     │
│  (SaaS)      │                      │  File        │
│              │                      │  (On-Prem)   │
└──────────────┘                      └──────────────┘
```

### Module Architecture Pattern

Each product module follows a strict contract:

```
product-module/
├── config/
│   └── module.config.js      # Module metadata, limits, pricing
├── routes/
│   └── *.routes.js           # API routes with license middleware
├── controllers/
│   └── *.controller.js       # Business logic
├── models/
│   └── *.model.js            # Data models
├── services/
│   └── *.service.js          # Core services
├── middleware/
│   └── *.middleware.js       # Module-specific middleware
└── ui/
    ├── components/           # React components
    ├── pages/                # Page components
    └── hooks/                # Custom hooks
```

## Components and Interfaces

### 1. Module Configuration System

#### Module Config Schema

Each module must define a `module.config.js` file:

```javascript
export default {
  // Module identification
  key: "attendance",
  displayName: "Attendance & Time Tracking",
  version: "1.0.0",

  // Commercial information
  commercial: {
    description:
      "Track employee attendance, working hours, and time-off with automated reporting",
    targetSegment: "All businesses with hourly or shift-based employees",
    valueProposition:
      "Reduce time theft, automate timesheet processing, ensure labor compliance",

    // Pricing tiers
    pricing: {
      starter: {
        monthly: 5, // per employee/month
        onPremise: 500, // one-time
        limits: {
          employees: 50,
          devices: 2,
          storage: "1GB",
          apiCalls: 10000,
        },
      },
      business: {
        monthly: 8,
        onPremise: 1500,
        limits: {
          employees: 200,
          devices: 10,
          storage: "10GB",
          apiCalls: 50000,
        },
      },
      enterprise: {
        monthly: "custom",
        onPremise: "custom",
        limits: {
          employees: "unlimited",
          devices: "unlimited",
          storage: "unlimited",
          apiCalls: "unlimited",
        },
      },
    },
  },

  // Technical dependencies
  dependencies: {
    required: ["hr-core"],
    optional: ["payroll", "reporting"],
  },

  // Feature flags within module
  features: {
    biometricDevices: { tier: "business" },
    geoFencing: { tier: "business" },
    aiAnomalyDetection: { tier: "enterprise" },
  },

  // Integration points
  integrations: {
    provides: ["attendance-data", "timesheet-export"],
    consumes: ["employee-roster", "holiday-calendar"],
  },
};
```

### 2. License Management System

#### License Validator Service

```javascript
class LicenseValidator {
  /**
   * Validate module access for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {string} moduleKey - Module to validate
   * @returns {ValidationResult}
   */
  async validateModuleAccess(tenantId, moduleKey) {
    // 1. Check if module is enabled
    // 2. Validate license expiration
    // 3. Check usage limits
    // 4. Log validation attempt
    // 5. Return result with details
  }

  /**
   * Check usage against limits
   * @param {string} tenantId
   * @param {string} moduleKey
   * @param {string} limitType - 'employees', 'storage', 'apiCalls'
   * @returns {LimitCheckResult}
   */
  async checkLimit(tenantId, moduleKey, limitType) {
    // 1. Get current usage
    // 2. Get limit from license
    // 3. Calculate percentage used
    // 4. Return result with warning if >80%
  }
}
```

#### License Data Models

**SaaS License (Database)**

```javascript
{
  tenantId: String,
  subscriptionId: String,
  modules: [{
    key: String,
    enabled: Boolean,
    tier: String,  // 'starter', 'business', 'enterprise'
    limits: {
      employees: Number,
      storage: Number,
      apiCalls: Number,
      // module-specific limits
    },
    activatedAt: Date,
    expiresAt: Date
  }],
  billingCycle: String,  // 'monthly', 'annual'
  status: String,  // 'active', 'trial', 'expired', 'suspended'
  trialEndsAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**On-Premise License (File)**

```json
{
  "licenseKey": "HRMS-XXXX-XXXX-XXXX",
  "companyId": "company-123",
  "companyName": "Acme Corporation",
  "issuedAt": "2025-01-01",
  "expiresAt": "2026-01-01",
  "modules": {
    "attendance": {
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200,
        "devices": 10,
        "storage": 10737418240
      }
    },
    "leave": {
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200
      }
    }
  },
  "signature": "digital-signature-hash"
}
```

### 3. License Validation Middleware

```javascript
/**
 * Middleware to validate module license before route access
 */
export const requireModuleLicense = (moduleKey) => {
  return async (req, res, next) => {
    // Core HR always passes
    if (moduleKey === "hr-core") {
      return next();
    }

    const tenantId = req.tenant?.id || req.headers["x-tenant-id"];

    try {
      const validation = await licenseValidator.validateModuleAccess(
        tenantId,
        moduleKey
      );

      if (!validation.valid) {
        return res.status(403).json({
          error: "MODULE_NOT_LICENSED",
          message: validation.message,
          moduleKey,
          upgradeUrl: `/pricing?module=${moduleKey}`,
        });
      }

      // Attach license info to request
      req.moduleLicense = validation.license;
      next();
    } catch (error) {
      logger.error("License validation error", { tenantId, moduleKey, error });
      return res.status(500).json({
        error: "LICENSE_VALIDATION_FAILED",
        message: "Unable to validate module license",
      });
    }
  };
};
```

### 4. Usage Tracking System

```javascript
class UsageTracker {
  /**
   * Track module usage event
   */
  async trackUsage(tenantId, moduleKey, usageType, amount = 1) {
    // 1. Increment usage counter
    // 2. Check against limits
    // 3. Emit warning events if approaching limit
    // 4. Block if limit exceeded
  }

  /**
   * Get current usage for a module
   */
  async getUsage(tenantId, moduleKey) {
    return {
      employees: { current: 45, limit: 50, percentage: 90 },
      storage: { current: 8589934592, limit: 10737418240, percentage: 80 },
      apiCalls: { current: 8500, limit: 10000, percentage: 85 },
    };
  }
}
```

### 5. Frontend License Context

```javascript
// React context for license management
const LicenseContext = createContext();

export const LicenseProvider = ({ children }) => {
  const [licenses, setLicenses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const isModuleEnabled = (moduleKey) => {
    return licenses[moduleKey]?.enabled || false;
  };

  const getModuleLicense = (moduleKey) => {
    return licenses[moduleKey];
  };

  const isApproachingLimit = (moduleKey, limitType) => {
    const license = licenses[moduleKey];
    if (!license?.usage) return false;
    return license.usage[limitType]?.percentage >= 80;
  };

  return (
    <LicenseContext.Provider
      value={{
        licenses,
        isModuleEnabled,
        getModuleLicense,
        isApproachingLimit,
        loading,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
};
```

### 6. UI Components for License Management

#### Locked Feature Component

```javascript
const LockedFeature = ({ moduleKey, featureName }) => {
  const moduleConfig = getModuleConfig(moduleKey);

  return (
    <div className="locked-feature-overlay">
      <LockIcon />
      <h3>{featureName} is not available</h3>
      <p>{moduleConfig.commercial.description}</p>
      <div className="pricing-preview">
        <span>
          Starting at ${moduleConfig.commercial.pricing.starter.monthly}
          /employee/month
        </span>
      </div>
      <Button href={`/pricing?module=${moduleKey}`}>
        View Pricing & Upgrade
      </Button>
    </div>
  );
};
```

#### Usage Warning Banner

```javascript
const UsageWarningBanner = ({ moduleKey, limitType, usage }) => {
  const severity = usage.percentage >= 95 ? "critical" : "warning";

  return (
    <Banner severity={severity}>
      <AlertIcon />
      <span>
        You're using {usage.percentage}% of your {limitType} limit (
        {usage.current} of {usage.limit})
      </span>
      <Button variant="link" href="/settings/license">
        Upgrade Plan
      </Button>
    </Banner>
  );
};
```

## Data Models

### License Model (SaaS - MongoDB)

```javascript
const LicenseSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    modules: [
      {
        key: {
          type: String,
          required: true,
          enum: Object.values(MODULES),
        },
        enabled: {
          type: Boolean,
          default: false,
        },
        tier: {
          type: String,
          enum: ["starter", "business", "enterprise"],
          required: true,
        },
        limits: {
          employees: Number,
          storage: Number,
          apiCalls: Number,
          customLimits: mongoose.Schema.Types.Mixed,
        },
        activatedAt: Date,
        expiresAt: Date,
      },
    ],
    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["active", "trial", "expired", "suspended", "cancelled"],
      default: "trial",
    },
    trialEndsAt: Date,
    paymentMethod: {
      type: String,
    },
    billingEmail: String,
  },
  {
    timestamps: true,
  }
);
```

### Usage Tracking Model

```javascript
const UsageTrackingSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    moduleKey: {
      type: String,
      required: true,
      index: true,
    },
    period: {
      type: String, // 'YYYY-MM' for monthly tracking
      required: true,
      index: true,
    },
    usage: {
      employees: { type: Number, default: 0 },
      storage: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
      customMetrics: mongoose.Schema.Types.Mixed,
    },
    limits: {
      employees: Number,
      storage: Number,
      apiCalls: Number,
      customLimits: mongoose.Schema.Types.Mixed,
    },
    warnings: [
      {
        limitType: String,
        percentage: Number,
        triggeredAt: Date,
      },
    ],
    violations: [
      {
        limitType: String,
        attemptedValue: Number,
        limit: Number,
        occurredAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
UsageTrackingSchema.index(
  { tenantId: 1, moduleKey: 1, period: 1 },
  { unique: true }
);
```

### License Audit Log Model

```javascript
const LicenseAuditSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    index: true,
  },
  moduleKey: {
    type: String,
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    enum: [
      "VALIDATION_SUCCESS",
      "VALIDATION_FAILURE",
      "LICENSE_EXPIRED",
      "LIMIT_WARNING",
      "LIMIT_EXCEEDED",
      "MODULE_ACTIVATED",
      "MODULE_DEACTIVATED",
      "LICENSE_UPDATED",
    ],
    required: true,
    index: true,
  },
  details: {
    reason: String,
    limitType: String,
    currentValue: Number,
    limitValue: Number,
    userId: mongoose.Schema.Types.ObjectId,
    ipAddress: String,
    userAgent: String,
  },
  severity: {
    type: String,
    enum: ["info", "warning", "error", "critical"],
    default: "info",
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Module License Status Independence

_For any_ set of Product Modules, after system initialization, querying each module's license status should return independent results without affecting other modules.
**Validates: Requirements 1.1**

### Property 2: Disabled Module API Blocking

_For any_ Product Module that is disabled, all API requests to that module's endpoints should be blocked with a 403 error.
**Validates: Requirements 1.2**

### Property 3: Disabled Module UI Hiding

_For any_ disabled Product Module, all UI components related to that module should either not render or display in a locked state.
**Validates: Requirements 1.3**

### Property 4: Dependency Enforcement

_For any_ Product Module with required dependencies, attempting to enable it without enabling its dependencies first should fail with a clear error message.
**Validates: Requirements 1.4**

### Property 5: Core HR Always Accessible

_For any_ license state (valid, expired, missing), Core HR functionality should always be accessible without license validation.
**Validates: Requirements 1.5, 3.5**

### Property 6: Module Registration Completeness

_For any_ Product Module registration, the system should store and allow retrieval of display name, business description, target customer segment, pricing tiers, feature limits, and dependencies.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 7: Marketing Metadata Quality

_For any_ registered Product Module, the returned metadata should contain non-empty, properly formatted marketing descriptions suitable for customer-facing pages.
**Validates: Requirements 2.5**

### Property 8: License Validation Before Processing

_For any_ API request to a non-Core Product Module, license validation should occur before any business logic is executed.
**Validates: Requirements 3.1**

### Property 9: Expired License Blocking

_For any_ expired license, all API requests to non-Core Product Modules should be blocked with appropriate error messages.
**Validates: Requirements 3.2**

### Property 10: Usage Limit Enforcement

_For any_ usage limit type (employees, storage, API calls), when the limit is exceeded, further usage should be prevented and a limit-exceeded error should be returned.
**Validates: Requirements 3.3**

### Property 11: Validation Failure Logging

_For any_ license validation failure, an audit log entry should be created containing tenant ID, module name, failure reason, and timestamp.
**Validates: Requirements 3.4**

### Property 12: Unlicensed Feature UI Feedback

_For any_ unlicensed Product Module or feature, user attempts to access it should trigger appropriate UI feedback (locked page, modal, or CTA).
**Validates: Requirements 4.1, 4.2**

### Property 13: Menu Filtering by License

_For any_ disabled Product Module, its navigation menu items should not be visible in the rendered menu.
**Validates: Requirements 4.3**

### Property 14: Usage Warning Display

_For any_ module usage metric that exceeds 80% of its limit, a warning banner should be displayed to administrators.
**Validates: Requirements 4.4**

### Property 15: Real-time License Expiration UI Update

_For any_ module license that expires, the UI should update to reflect the locked state without requiring a page refresh.
**Validates: Requirements 4.5**

### Property 16: Invalid License Handling

_For any_ invalid or malformed license file, the system should disable all Product Modules, enable only Core HR, and log a warning.
**Validates: Requirements 5.2**

### Property 17: Employee Limit Enforcement from File

_For any_ employee limit specified in an On-Premise license file, the system should enforce that limit across all modules.
**Validates: Requirements 5.4**

### Property 18: Subscription Module Activation

_For any_ tenant subscription creation, only the modules specified in the subscription should be activated.
**Validates: Requirements 6.1**

### Property 19: Subscription Expiration Handling

_For any_ expired tenant subscription, all Product Modules except Core HR should be disabled.
**Validates: Requirements 6.4**

### Property 20: Usage Metric Tracking

_For any_ Product Module usage event, the system should record the usage metric and compare it against the defined limit.
**Validates: Requirements 7.1**

### Property 21: Warning Threshold Triggering

_For any_ usage metric that reaches 80% of its limit, a warning notification should be sent to administrators.
**Validates: Requirements 7.2**

### Property 22: Usage Blocking on Limit Exceeded

_For any_ usage metric that exceeds its limit, further usage should be blocked and an audit event should be logged.
**Validates: Requirements 7.3**

### Property 23: Usage Report Completeness

_For any_ usage report request, the system should return detailed metrics for all modules and tenants with proper aggregation.
**Validates: Requirements 7.4**

### Property 24: Validation Audit Logging

_For any_ license validation attempt (success or failure), an audit log entry should be created with complete details.
**Validates: Requirements 7.5**

### Property 25: Module Isolation

_For any_ Product Module that is disabled, all other enabled modules should continue functioning normally without errors.
**Validates: Requirements 8.3**

### Property 26: Optional Integration Graceful Degradation

_For any_ Product Module with optional integrations, the module should function correctly even when those optional integrations are disabled.
**Validates: Requirements 8.5**

### Property 27: Pricing Tier Completeness

_For any_ Product Module configuration, all three pricing tiers (Starter, Business, Enterprise) should be defined with their respective limits.
**Validates: Requirements 9.1**

### Property 28: Tier Limits Mapping

_For any_ selected pricing tier, the system should return the complete set of limits associated with that tier.
**Validates: Requirements 9.2**

### Property 29: Quote Generation Accuracy

_For any_ combination of selected modules and pricing tiers, the system should generate a valid quote with correct pricing calculations.
**Validates: Requirements 9.3**

### Property 30: Bundle Discount Application

_For any_ set of modules purchased together that qualify for bundle discounts, the discount should be correctly applied to the total price.
**Validates: Requirements 9.4**

### Property 31: Add-on Feature Listing

_For any_ Product Module with add-on features, those features should be listed with their separate pricing information.
**Validates: Requirements 9.5**

### Property 32: Audit Log Entry Completeness

_For any_ license validation, the audit log entry should contain timestamp, tenant ID, module key, result, and relevant details.
**Validates: Requirements 10.1**

### Property 33: Usage Limit Check Logging

_For any_ usage limit check, the current usage value and limit value should be logged.
**Validates: Requirements 10.2**

### Property 34: Violation High-Priority Logging

_For any_ license violation detected, a high-priority audit event should be created with severity level "critical".
**Validates: Requirements 10.3**

### Property 35: Audit Log Query Filtering

_For any_ audit log query, the system should support filtering by tenant, module, date range, and event type.
**Validates: Requirements 10.4**

### Property 36: License Modification Change Tracking

_For any_ license modification, an audit log entry should record both the previous and new values.
**Validates: Requirements 10.5**

### Property 37: Pricing Display Completeness

_For any_ Product Module on the pricing page, both monthly SaaS pricing and one-time On-Premise pricing should be displayed.
**Validates: Requirements 11.2**

### Property 38: Dependency Indication in UI

_For any_ Product Module with dependencies, the pricing page should clearly indicate which other modules are required.
**Validates: Requirements 11.3**

### Property 39: Upsell CTA Presence

_For any_ unlicensed Product Module viewed by a user, an upsell CTA with a link to the pricing page should be displayed.
**Validates: Requirements 11.5**

### Property 40: License Expiration Date Display

_For any_ license with an expiration date, the license status page should display that date prominently.
**Validates: Requirements 12.2**

### Property 41: 30-Day Warning State

_For any_ license expiring within 30 days, the module should be highlighted with a warning state on the status page.
**Validates: Requirements 12.3**

### Property 42: 7-Day Critical State

_For any_ license expiring within 7 days, the module should be highlighted with a critical state on the status page.
**Validates: Requirements 12.4**

### Property 43: Renewal Action Availability

_For any_ license requiring renewal, the status page should provide clear contact and renewal action buttons.
**Validates: Requirements 12.5**

### Property 44: Error Page Role-Aware Navigation

_For any_ user role, error pages should provide navigation options appropriate to that role's permissions.
**Validates: Requirements 13.3**

### Property 45: Error Page Theme Support

_For any_ error page, it should render correctly in both light and dark mode themes.
**Validates: Requirements 13.4**

## Error Handling

### License Validation Errors

1. **MODULE_NOT_LICENSED**: Returned when a module is not included in the tenant's license

   - HTTP Status: 403
   - Response includes upgrade URL and module information

2. **LICENSE_EXPIRED**: Returned when the license has passed its expiration date

   - HTTP Status: 403
   - Response includes expiration date and renewal contact information

3. **LIMIT_EXCEEDED**: Returned when a usage limit has been reached

   - HTTP Status: 429 (Too Many Requests)
   - Response includes current usage, limit, and upgrade options

4. **LICENSE_VALIDATION_FAILED**: Returned when license validation encounters an error

   - HTTP Status: 500
   - Response includes error reference ID for support

5. **INVALID_LICENSE_FILE**: Returned when On-Premise license file is malformed
   - HTTP Status: 500
   - Logged with details for administrator review

### Module Dependency Errors

1. **MISSING_DEPENDENCY**: Returned when attempting to enable a module without its required dependencies

   - HTTP Status: 400
   - Response lists missing dependencies

2. **CIRCULAR_DEPENDENCY**: Returned when module dependencies form a circular reference
   - HTTP Status: 500
   - Logged for developer review

### Usage Tracking Errors

1. **USAGE_TRACKING_FAILED**: Returned when usage metrics cannot be recorded

   - HTTP Status: 500
   - Fallback: Allow operation but log error for review

2. **USAGE_QUERY_FAILED**: Returned when usage reports cannot be generated
   - HTTP Status: 500
   - Response includes error reference ID

### Error Recovery Strategies

- **Graceful Degradation**: If license validation fails due to system error, log the error but allow Core HR access
- **Retry Logic**: Implement exponential backoff for transient license validation failures
- **Fallback Licensing**: In On-Premise mode, if license file is temporarily unavailable, use cached license for up to 24 hours
- **Audit All Failures**: Every error should be logged to audit trail for compliance and debugging

## Testing Strategy

### Unit Testing

Unit tests will cover specific examples and edge cases:

1. **License Validation Logic**

   - Valid license with all modules enabled
   - Expired license
   - License with specific modules disabled
   - Missing license file
   - Malformed license JSON

2. **Usage Limit Checking**

   - Usage at 0%, 50%, 80%, 95%, 100%, 105% of limit
   - Different limit types (employees, storage, API calls)
   - Concurrent usage updates

3. **Module Dependency Resolution**

   - Simple dependencies (A requires B)
   - Transitive dependencies (A requires B requires C)
   - Circular dependency detection
   - Missing dependency handling

4. **Pricing Calculations**

   - Single module pricing
   - Bundle discounts
   - Tier-based pricing
   - Add-on features

5. **UI Component States**
   - Locked feature overlay rendering
   - Usage warning banners at different thresholds
   - License status page with various expiration states
   - Error pages (404, 500)

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript property testing library). Each test will run a minimum of 100 iterations.

1. **Module Independence Properties**

   - Generate random module configurations
   - Verify license status queries don't affect other modules
   - Verify disabling one module doesn't break others

2. **License Validation Properties**

   - Generate random license states
   - Verify Core HR always accessible
   - Verify expired licenses block non-Core modules
   - Verify validation always creates audit logs

3. **Usage Limit Properties**

   - Generate random usage values and limits
   - Verify limits are enforced consistently
   - Verify warnings trigger at 80% threshold
   - Verify blocking occurs when exceeded

4. **Dependency Resolution Properties**

   - Generate random module dependency graphs
   - Verify dependencies are enforced
   - Verify no circular dependencies allowed
   - Verify transitive dependencies resolved

5. **Pricing Calculation Properties**

   - Generate random module selections
   - Verify pricing is always non-negative
   - Verify bundle discounts never exceed base price
   - Verify tier upgrades always increase limits

6. **Audit Logging Properties**
   - Generate random validation events
   - Verify all events create audit entries
   - Verify audit entries contain required fields
   - Verify audit queries return correct results

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **SaaS Subscription Flow**

   - Create tenant → Create subscription → Activate modules → Verify access
   - Upgrade subscription → Verify new modules accessible
   - Expire subscription → Verify modules disabled

2. **On-Premise License Flow**

   - Start system → Load license file → Verify modules enabled
   - Update license file → Verify hot-reload works
   - Expire license → Verify modules disabled

3. **Usage Tracking Flow**

   - Use module → Verify usage recorded → Approach limit → Verify warning → Exceed limit → Verify blocked

4. **UI Integration**
   - Login → Navigate to unlicensed module → Verify locked state → Click upgrade → Verify pricing page

### Test Configuration

```javascript
// jest.config.js additions
module.exports = {
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/__tests__/**/*.property.test.js",
  ],
  testTimeout: 10000, // Property tests may take longer
  collectCoverageFrom: [
    "server/services/license*.js",
    "server/middleware/license*.js",
    "client/src/contexts/LicenseContext.js",
    "client/src/components/license/**/*.js",
  ],
};
```

### Property Test Example Structure

```javascript
// Example property test structure
import fc from "fast-check";

describe("License Validation Properties", () => {
  test("Property 5: Core HR Always Accessible", () => {
    /**
     * Feature: feature-productization, Property 5: Core HR Always Accessible
     */
    fc.assert(
      fc.property(
        fc.record({
          licenseStatus: fc.constantFrom(
            "valid",
            "expired",
            "missing",
            "invalid"
          ),
          tenantId: fc.uuid(),
          moduleKey: fc.constant("hr-core"),
        }),
        async ({ licenseStatus, tenantId, moduleKey }) => {
          // Setup license state
          await setupLicenseState(tenantId, licenseStatus);

          // Attempt to access Core HR
          const result = await licenseValidator.validateModuleAccess(
            tenantId,
            moduleKey
          );

          // Core HR should always be accessible
          expect(result.valid).toBe(true);
          expect(result.bypassedValidation).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Implementation Phases

### Phase 1: Core License Infrastructure (Week 1-2)

- Implement License Validator Service
- Create License and Usage Tracking models
- Build license validation middleware
- Implement audit logging system
- Create On-Premise license file loader

### Phase 2: Module Configuration System (Week 2-3)

- Define module.config.js schema
- Create module registry with commercial metadata
- Implement dependency resolution engine
- Build module activation/deactivation logic
- Create pricing tier definitions

### Phase 3: Backend API Integration (Week 3-4)

- Add license middleware to all module routes
- Implement usage tracking hooks
- Create license management API endpoints
- Build usage reporting endpoints
- Implement limit enforcement logic

### Phase 4: Frontend License Context (Week 4-5)

- Create React License Context
- Build license status hooks
- Implement conditional rendering for modules
- Create locked feature components
- Build usage warning components

### Phase 5: Pricing & Status Pages (Week 5-6)

- Design and implement pricing page
- Create module comparison components
- Build license status dashboard
- Implement expiration warning UI
- Create renewal action flows

### Phase 6: Error Handling & Polish (Week 6-7)

- Create 404 and 500 error pages
- Implement role-aware navigation
- Add theme support to all components
- Ensure WCAG 2.1 AA compliance
- Polish UI/UX across all license-related features

### Phase 7: Testing & Documentation (Week 7-8)

- Write comprehensive unit tests
- Implement property-based tests
- Create integration test suites
- Write API documentation
- Create administrator guides
- Develop sales enablement materials

## Security Considerations

1. **License File Security**

   - Store license files with restricted permissions (600)
   - Validate digital signatures on license files
   - Encrypt sensitive license data at rest

2. **API Security**

   - Rate limit license validation endpoints
   - Prevent license enumeration attacks
   - Sanitize all error messages to avoid information disclosure

3. **Audit Trail Integrity**

   - Use append-only audit logs
   - Implement log tampering detection
   - Retain audit logs for compliance periods

4. **Usage Data Privacy**
   - Anonymize usage data in reports
   - Implement data retention policies
   - Provide tenant data export capabilities

## Performance Considerations

1. **License Validation Caching**

   - Cache license validation results for 5 minutes
   - Invalidate cache on license updates
   - Use Redis for distributed caching in SaaS mode

2. **Usage Tracking Optimization**

   - Batch usage updates every 60 seconds
   - Use background workers for non-critical tracking
   - Implement circuit breakers for tracking failures

3. **Database Indexing**

   - Index tenantId + moduleKey for fast lookups
   - Index timestamp fields for audit queries
   - Use compound indexes for common query patterns

4. **Frontend Performance**
   - Lazy load module UI components
   - Prefetch license data on login
   - Use React.memo for license-dependent components

## Backward Compatibility

1. **Existing Deployments**

   - Default all existing modules to "enabled" during migration
   - Provide migration script to generate initial licenses
   - Support legacy feature flag format during transition period

2. **API Compatibility**

   - Maintain existing API endpoints
   - Add license headers as optional initially
   - Provide deprecation warnings for old patterns

3. **Data Migration**
   - Preserve all existing module data
   - Create license records for existing tenants
   - Migrate usage history to new tracking system

## Monitoring & Observability

1. **Key Metrics**

   - License validation success/failure rates
   - Module activation/deactivation events
   - Usage limit warnings and violations
   - License expiration approaching counts

2. **Alerts**

   - Critical: License validation system down
   - Warning: High rate of license validation failures
   - Info: Tenant approaching usage limits
   - Info: Licenses expiring within 30 days

3. **Dashboards**
   - Real-time license validation metrics
   - Usage trends by module and tenant
   - Revenue metrics by module
   - Compliance audit trail summary
