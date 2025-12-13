# License Validation Middleware Integration Guide

This document provides examples of how to integrate the license validation middleware with existing module routes.

## Basic Usage

### 1. Import the Middleware

```javascript
import {
  requireModuleLicense,
  checkUsageLimit,
} from "../middleware/licenseValidation.middleware.js";
import { MODULES } from "../models/license.model.js";
```

### 2. Apply to Routes

#### Simple Module License Check

```javascript
// Attendance routes example
router.get(
  "/attendance",
  protect, // Authentication first
  requireModuleLicense(MODULES.ATTENDANCE), // Then license check
  getAttendanceRecords
);

router.post(
  "/attendance/checkin",
  protect,
  requireModuleLicense(MODULES.ATTENDANCE),
  checkIn
);
```

#### With Usage Limit Check

```javascript
// Check employee limit before adding new employee
router.post(
  "/employees",
  protect,
  requireModuleLicense(MODULES.CORE_HR),
  checkUsageLimit(MODULES.CORE_HR, "employees", (req) => 1), // Adding 1 employee
  createEmployee
);

// Check storage limit before uploading document
router.post(
  "/documents/upload",
  protect,
  requireModuleLicense(MODULES.DOCUMENTS),
  checkUsageLimit(MODULES.DOCUMENTS, "storage", (req) => req.file?.size || 0),
  uploadDocument
);
```

#### Multiple Module Requirements

```javascript
// Feature that requires both Attendance and Reporting modules
router.get(
  "/reports/attendance-summary",
  protect,
  requireMultipleModuleLicenses([MODULES.ATTENDANCE, MODULES.REPORTING]),
  getAttendanceSummaryReport
);
```

#### Optional License Info (Non-blocking)

```javascript
// Attach license info for optional features
router.get(
  "/dashboard",
  protect,
  attachLicenseInfo(MODULES.REPORTING), // Doesn't block if not licensed
  getDashboard // Controller can check req.moduleLicense.valid
);
```

## Integration Examples by Module

### Attendance Module

```javascript
// routes/attendance.routes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  requireModuleLicense,
  checkUsageLimit,
} from "../middleware/licenseValidation.middleware.js";
import { MODULES } from "../models/license.model.js";
import * as attendanceController from "../modules/hr-core/attendance/controllers/attendance.controller.js";

const router = express.Router();

// All attendance routes require the attendance module license
router.use(requireModuleLicense(MODULES.ATTENDANCE));

// Check-in endpoint
router.post("/checkin", protect, attendanceController.checkIn);

// Check-out endpoint
router.post("/checkout", protect, attendanceController.checkOut);

// Get attendance records
router.get("/", protect, attendanceController.getAttendanceRecords);

export default router;
```

### Leave Module

```javascript
// routes/leave.routes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModuleLicense } from "../middleware/licenseValidation.middleware.js";
import { MODULES } from "../models/license.model.js";
import * as leaveController from "../modules/hr-core/vacations/controllers/leave.controller.js";

const router = express.Router();

// All leave routes require the leave module license
router.use(requireModuleLicense(MODULES.LEAVE));

// Create leave request
router.post("/", protect, leaveController.createLeaveRequest);

// Get leave requests
router.get("/", protect, leaveController.getLeaveRequests);

export default router;
```

### Payroll Module

```javascript
// routes/payroll.routes.js
import express from "express";
import { protect, hrOrAdmin } from "../middleware/authMiddleware.js";
import {
  requireModuleLicense,
  checkUsageLimit,
} from "../middleware/licenseValidation.middleware.js";
import { MODULES } from "../models/license.model.js";
import * as payrollController from "../modules/payroll/controllers/payroll.controller.js";

const router = express.Router();

// All payroll routes require the payroll module license
router.use(requireModuleLicense(MODULES.PAYROLL));

// Create payroll (check employee limit)
router.post(
  "/",
  protect,
  hrOrAdmin,
  checkUsageLimit(MODULES.PAYROLL, "employees"),
  payrollController.createPayroll
);

// Get payroll records
router.get("/", protect, hrOrAdmin, payrollController.getPayrollRecords);

export default router;
```

### Documents Module

```javascript
// routes/document.routes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  requireModuleLicense,
  checkUsageLimit,
} from "../middleware/licenseValidation.middleware.js";
import { MODULES } from "../models/license.model.js";
import * as documentController from "../modules/documents/controllers/document.controller.js";

const router = express.Router();

// All document routes require the documents module license
router.use(requireModuleLicense(MODULES.DOCUMENTS));

// Upload document (check storage limit)
router.post(
  "/upload",
  protect,
  checkUsageLimit(MODULES.DOCUMENTS, "storage", (req) => req.file?.size || 0),
  documentController.uploadDocument
);

// Get documents
router.get("/", protect, documentController.getDocuments);

export default router;
```

## Error Handling in Controllers

Controllers can access license information from the request object:

```javascript
export const getDashboard = async (req, res) => {
  try {
    const dashboardData = {
      basicInfo: await getBasicInfo(req.user),
    };

    // Check if reporting module is licensed
    if (req.moduleLicense?.valid) {
      dashboardData.reports = await getReports(req.user);
    } else {
      dashboardData.reports = {
        available: false,
        upgradeUrl: "/pricing?module=reporting",
      };
    }

    // Check if approaching usage limits
    if (req.usageLimit?.isApproachingLimit) {
      dashboardData.warnings = [
        {
          type: "usage_limit",
          message: `You're using ${req.usageLimit.percentage}% of your ${req.usageLimit.limitType} limit`,
          upgradeUrl: "/settings/license?action=upgrade",
        },
      ];
    }

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## Response Format

### Success Response

When license validation passes, the middleware attaches license info to the request:

```javascript
req.moduleLicense = {
  moduleKey: "attendance",
  tier: "business",
  limits: {
    employees: 200,
    storage: 10737418240,
    apiCalls: 50000,
  },
  expiresAt: "2026-12-31T00:00:00.000Z",
  activatedAt: "2025-01-01T00:00:00.000Z",
};
```

### Error Responses

#### MODULE_NOT_LICENSED (403)

```json
{
  "error": "MODULE_NOT_LICENSED",
  "message": "Module not included in license",
  "moduleKey": "attendance",
  "upgradeUrl": "/pricing?module=attendance"
}
```

#### LICENSE_EXPIRED (403)

```json
{
  "error": "LICENSE_EXPIRED",
  "message": "License has expired",
  "moduleKey": "attendance",
  "expiresAt": "2024-12-31T00:00:00.000Z",
  "upgradeUrl": "/settings/license?action=renew&module=attendance"
}
```

#### LIMIT_EXCEEDED (429)

```json
{
  "error": "LIMIT_EXCEEDED",
  "message": "Usage limit exceeded",
  "moduleKey": "attendance",
  "limitType": "employees",
  "currentUsage": 200,
  "limit": 200,
  "upgradeUrl": "/settings/license?action=upgrade&module=attendance"
}
```

#### RATE_LIMIT_EXCEEDED (429)

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many license validation requests. Please try again later.",
  "retryAfter": 45
}
```

## Best Practices

1. **Apply license middleware early in the route chain** - After authentication but before business logic
2. **Use router.use() for module-wide protection** - Apply to all routes in a module at once
3. **Check usage limits for resource-intensive operations** - Before creating records, uploading files, etc.
4. **Provide clear upgrade URLs** - Help users understand how to get access to locked features
5. **Handle license info in controllers** - Use req.moduleLicense to provide conditional features
6. **Monitor rate limits** - Use getRateLimitStats() to track validation performance

## Testing

When testing routes with license middleware, ensure you:

1. Create test licenses with appropriate modules enabled
2. Test both licensed and unlicensed scenarios
3. Test expired licenses
4. Test usage limit enforcement
5. Test rate limiting behavior

Example test setup:

```javascript
beforeEach(async () => {
  // Create test license
  await License.create({
    tenantId: testTenantId,
    subscriptionId: "test-sub",
    status: "active",
    modules: [
      {
        key: MODULES.ATTENDANCE,
        enabled: true,
        tier: "business",
        limits: { employees: 200 },
        expiresAt: new Date("2026-12-31"),
      },
    ],
  });
});
```

## Performance Considerations

- License validation results are cached for 5 minutes
- Rate limiting prevents excessive validation requests (100 per minute per tenant/IP)
- Use `attachLicenseInfo` for non-critical features to avoid blocking
- Monitor cache hit rates using `licenseValidator.getCacheStats()`

## Troubleshooting

### License validation always fails

- Check that tenant ID is properly set in request (req.tenant.id, req.user.tenant, or x-tenant-id header)
- Verify license exists in database for the tenant
- Check that module is enabled in the license

### Rate limit errors

- Reduce validation frequency
- Check for infinite loops or excessive API calls
- Use cache to reduce validation calls

### Performance issues

- Monitor cache hit rates
- Check database indexes on License collection
- Consider increasing cache TTL for stable licenses
