# License Management Guide

## Overview

This guide provides comprehensive instructions for administrators to manage licenses in the Modular HRMS system. The system supports both SaaS (subscription-based) and On-Premise (license file-based) deployment models with granular module-level licensing.

## Table of Contents

1. [Understanding Licenses](#understanding-licenses)
2. [SaaS License Management](#saas-license-management)
3. [On-Premise License Management](#on-premise-license-management)
4. [Module Management](#module-management)
5. [Usage Monitoring](#usage-monitoring)
6. [License Renewal](#license-renewal)
7. [Best Practices](#best-practices)

## Understanding Licenses

### License Types

**SaaS Licenses**
- Stored in the database
- Managed through subscription system
- Automatically renewed based on billing cycle
- Support trial periods
- Real-time activation/deactivation

**On-Premise Licenses**
- Stored as JSON files in the config directory
- Manually installed and updated
- Support offline validation
- Include digital signatures for security
- Hot-reload capability without system restart

### License Components

Every license includes:

1. **Tenant/Company Identification**: Unique identifier for the customer
2. **Module Definitions**: List of enabled modules with their configurations
3. **Pricing Tiers**: Starter, Business, or Enterprise for each module
4. **Usage Limits**: Quantitative restrictions (employees, storage, API calls)
5. **Expiration Dates**: When the license or individual modules expire
6. **Status**: Active, trial, expired, suspended, or cancelled

### Core HR Module

The Core HR module is **always enabled** and includes:
- User authentication and management
- Role and permission management
- Department and position management
- Tenant management
- Audit logging

Core HR cannot be disabled and does not require license validation.

## SaaS License Management

### Creating a New License

**Via API:**

```bash
POST /api/v1/licenses
Content-Type: application/json

{
  "tenantId": "507f1f77bcf86cd799439011",
  "subscriptionId": "sub_1234567890",
  "modules": [
    {
      "key": "attendance",
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200,
        "devices": 10,
        "storage": 10737418240,
        "apiCalls": 50000
      },
      "expiresAt": "2026-01-01T00:00:00Z"
    },
    {
      "key": "leave",
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200
      },
      "expiresAt": "2026-01-01T00:00:00Z"
    }
  ],
  "billingCycle": "monthly",
  "status": "active"
}
```

**Response:**

```json
{
  "success": true,
  "license": {
    "_id": "507f1f77bcf86cd799439012",
    "tenantId": "507f1f77bcf86cd799439011",
    "subscriptionId": "sub_1234567890",
    "modules": [...],
    "status": "active",
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

### Viewing License Details

```bash
GET /api/v1/licenses/:tenantId
```

**Response includes:**
- All enabled modules
- Current usage metrics
- Expiration dates
- Billing information
- Status

### Activating a Module

```bash
POST /api/v1/licenses/:tenantId/modules/:moduleKey/activate
Content-Type: application/json

{
  "tier": "business",
  "limits": {
    "employees": 200,
    "storage": 10737418240
  },
  "expiresAt": "2026-01-01T00:00:00Z"
}
```

### Deactivating a Module

```bash
POST /api/v1/licenses/:tenantId/modules/:moduleKey/deactivate
```

**Important:** Deactivating a module does NOT delete data. All module data is preserved and will be accessible again if the module is reactivated.

### Upgrading a Subscription

To upgrade a tenant's subscription:

1. Update the license with new tier and limits
2. System automatically enables new features
3. Users gain immediate access to upgraded capabilities

```bash
PUT /api/v1/licenses/:tenantId
Content-Type: application/json

{
  "modules": [
    {
      "key": "attendance",
      "enabled": true,
      "tier": "enterprise",  // Upgraded from business
      "limits": {
        "employees": "unlimited",
        "devices": "unlimited",
        "storage": "unlimited",
        "apiCalls": "unlimited"
      }
    }
  ]
}
```

### Downgrading a Subscription

When downgrading:

1. Update license with lower tier
2. System enforces new limits immediately
3. Existing data is preserved
4. Users may lose access to premium features

**Warning:** If current usage exceeds new limits, users will be blocked from creating new records until usage is reduced.

### Trial Period Management

**Creating a Trial License:**

```json
{
  "status": "trial",
  "trialEndsAt": "2025-12-31T23:59:59Z",
  "modules": [
    {
      "key": "attendance",
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 50,
        "devices": 5
      }
    }
  ]
}
```

**Trial Expiration:**
- System automatically changes status to "expired" when trial ends
- All non-Core modules are disabled
- Users see upgrade prompts
- Data is preserved for 30 days

### Handling Expired Licenses

When a license expires:

1. **Automatic Actions:**
   - All non-Core modules are disabled
   - API requests to disabled modules return 403 errors
   - UI shows locked state with renewal prompts
   - Audit log records the expiration event

2. **Grace Period:**
   - No automatic grace period in SaaS mode
   - Administrators must manually extend licenses if needed

3. **Renewal Process:**
   - Update license with new expiration date
   - Modules are immediately re-enabled
   - Users regain access without data loss

## On-Premise License Management

### License File Location

On-Premise licenses are stored at:
```
server/config/license.json
```

### License File Format

```json
{
  "licenseKey": "HRMS-XXXX-XXXX-XXXX-XXXX",
  "companyId": "company-123",
  "companyName": "Acme Corporation",
  "issuedAt": "2025-01-01T00:00:00Z",
  "expiresAt": "2026-01-01T00:00:00Z",
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
    },
    "payroll": {
      "enabled": true,
      "tier": "enterprise",
      "limits": {
        "employees": 200
      }
    }
  },
  "signature": "SHA256:abcdef1234567890..."
}
```

### Installing a License File

1. **Receive License File:**
   - Obtain license.json from vendor
   - Verify file integrity

2. **Install License:**
   ```bash
   # Copy license file to config directory
   cp license.json server/config/license.json
   
   # Set appropriate permissions
   chmod 600 server/config/license.json
   ```

3. **Verify Installation:**
   - System automatically detects and loads the new license
   - Check logs for successful validation
   - Verify modules are enabled in UI

### Updating a License File

The system supports hot-reload:

1. Replace the license file
2. System detects the change within 60 seconds
3. New license is validated and applied
4. No system restart required

**Manual Reload (if needed):**
```bash
# Send SIGHUP to reload configuration
kill -HUP $(cat server/hrms.pid)
```

### License File Validation

The system validates:

1. **JSON Structure:** Proper format and required fields
2. **Digital Signature:** Cryptographic verification
3. **Expiration Date:** Not expired
4. **Module Definitions:** Valid module keys and configurations

**Validation Failures:**
- Invalid files are rejected
- System logs detailed error messages
- All modules except Core HR are disabled
- Previous valid license is cached for 24 hours as fallback

### Generating License Files

**For Vendors/Administrators:**

Use the license generator utility:

```bash
node server/scripts/generateOnPremiseLicense.js \
  --company-id "company-123" \
  --company-name "Acme Corporation" \
  --expires "2026-01-01" \
  --modules "attendance:business,leave:business,payroll:enterprise" \
  --employees 200 \
  --output license.json
```

**Parameters:**
- `--company-id`: Unique company identifier
- `--company-name`: Company display name
- `--expires`: Expiration date (YYYY-MM-DD)
- `--modules`: Comma-separated list of module:tier pairs
- `--employees`: Global employee limit
- `--output`: Output file path

## Module Management

### Available Modules

| Module Key | Display Name | Description |
|------------|--------------|-------------|
| `hr-core` | Core HR | Always enabled - User, role, department management |
| `attendance` | Attendance & Time Tracking | Clock in/out, timesheet management, device integration |
| `leave` | Leave Management | Vacation, sick leave, mission requests |
| `payroll` | Payroll Management | Salary processing, deductions, payslips |
| `documents` | Document Management | Employee documents, templates, workflows |
| `communication` | Communication | Announcements, notifications, messaging |
| `reporting` | Reporting & Analytics | Custom reports, dashboards, data export |
| `tasks` | Task Management | Task assignment, tracking, collaboration |

### Module Dependencies

Some modules require others to function:

- **Leave Management** requires Core HR
- **Payroll** requires Core HR and Attendance (optional)
- **Reporting** can integrate with all modules

**Dependency Enforcement:**
- System prevents enabling modules without required dependencies
- Disabling a module with dependents shows warning
- Optional dependencies gracefully degrade if unavailable

### Checking Module Status

**Via API:**
```bash
GET /api/v1/licenses/:tenantId
```

**Via UI:**
- Navigate to Settings → License Status
- View all modules with their status
- See usage metrics and limits

**Via Logs:**
```bash
grep "module.*enabled" logs/application.log
```

## Usage Monitoring

### Viewing Usage Metrics

**API Endpoint:**
```bash
GET /api/v1/licenses/:tenantId/usage
```

**Response:**
```json
{
  "tenantId": "507f1f77bcf86cd799439011",
  "period": "2025-12",
  "modules": {
    "attendance": {
      "usage": {
        "employees": { "current": 180, "limit": 200, "percentage": 90 },
        "devices": { "current": 8, "limit": 10, "percentage": 80 },
        "storage": { "current": 8589934592, "limit": 10737418240, "percentage": 80 },
        "apiCalls": { "current": 42000, "limit": 50000, "percentage": 84 }
      },
      "warnings": [
        {
          "limitType": "employees",
          "percentage": 90,
          "triggeredAt": "2025-12-08T14:30:00Z"
        }
      ]
    }
  }
}
```

### Usage Thresholds

**Warning Threshold: 80%**
- System sends notifications to administrators
- UI displays warning banners
- Audit log records the warning

**Critical Threshold: 95%**
- Escalated notifications
- UI displays critical alerts
- Recommend immediate action

**Limit Exceeded: 100%**
- Further usage is blocked
- Users see limit exceeded errors
- Must upgrade or reduce usage to continue

### Usage Reports

Generate usage reports for compliance and planning:

```bash
GET /api/v1/licenses/:tenantId/usage?startDate=2025-01-01&endDate=2025-12-31
```

**Report Includes:**
- Historical usage trends
- Peak usage periods
- Limit violations
- Cost projections

## License Renewal

### SaaS Renewal

**Automatic Renewal:**
- Configured in subscription settings
- Billing system handles renewal
- License automatically extended

**Manual Renewal:**
1. Update license expiration date
2. Process payment through billing system
3. System immediately reflects new expiration

### On-Premise Renewal

**Process:**
1. Contact vendor 30 days before expiration
2. Receive new license file
3. Install new license file (hot-reload supported)
4. Verify new expiration date

**Renewal Reminders:**
- 30 days before expiration: Warning notification
- 7 days before expiration: Critical notification
- On expiration: All modules except Core HR disabled

### Grace Period

**On-Premise Only:**
- 24-hour grace period using cached license
- Allows time to install renewed license
- System logs grace period usage

**SaaS:**
- No automatic grace period
- Administrators must manually extend if needed

## Best Practices

### 1. Proactive Monitoring

- Check usage metrics weekly
- Set up alerts for 80% threshold
- Review audit logs monthly
- Plan upgrades before hitting limits

### 2. License Documentation

- Maintain inventory of all licenses
- Document renewal dates
- Track module assignments per tenant
- Keep vendor contact information current

### 3. Security

- Restrict access to license files (chmod 600)
- Rotate license keys annually
- Monitor audit logs for violations
- Implement least-privilege access

### 4. Capacity Planning

- Review usage trends quarterly
- Forecast growth and plan upgrades
- Budget for license renewals
- Consider bundle discounts for multiple modules

### 5. User Communication

- Notify users before license changes
- Provide upgrade paths for locked features
- Communicate expiration dates clearly
- Offer training on new modules

### 6. Backup and Recovery

- Backup license files regularly
- Store licenses in secure location
- Document recovery procedures
- Test license restoration process

### 7. Compliance

- Maintain audit trail for all license changes
- Document usage for compliance reporting
- Review license terms regularly
- Ensure usage stays within limits

## Common Administrative Tasks

### Task: Add a New Module to Existing License

**SaaS:**
```bash
POST /api/v1/licenses/:tenantId/modules/payroll/activate
{
  "tier": "business",
  "limits": { "employees": 200 },
  "expiresAt": "2026-01-01T00:00:00Z"
}
```

**On-Premise:**
1. Request updated license file from vendor
2. Install new license file
3. Verify module is enabled

### Task: Increase Employee Limit

**SaaS:**
```bash
PUT /api/v1/licenses/:tenantId
{
  "modules": [{
    "key": "attendance",
    "limits": { "employees": 300 }  // Increased from 200
  }]
}
```

**On-Premise:**
1. Request license update from vendor
2. Install updated license file

### Task: Extend Expiration Date

**SaaS:**
```bash
PUT /api/v1/licenses/:tenantId
{
  "modules": [{
    "key": "attendance",
    "expiresAt": "2027-01-01T00:00:00Z"  // Extended by 1 year
  }]
}
```

**On-Premise:**
1. Obtain renewed license file
2. Install new license file

### Task: Temporarily Disable a Module

**SaaS:**
```bash
POST /api/v1/licenses/:tenantId/modules/tasks/deactivate
```

**On-Premise:**
1. Edit license file, set `"enabled": false`
2. System reloads automatically

**Note:** Data is preserved and module can be re-enabled later.

## Support and Troubleshooting

For troubleshooting guidance, see [LICENSE_TROUBLESHOOTING.md](LICENSE_TROUBLESHOOTING.md).

For API reference, see [LICENSE_API.md](LICENSE_API.md).

For usage reporting details, see [USAGE_REPORTING.md](USAGE_REPORTING.md).

For On-Premise specific guidance, see [ON_PREMISE_LICENSE.md](ON_PREMISE_LICENSE.md).
