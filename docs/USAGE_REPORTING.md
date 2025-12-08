# Usage Reporting Guide

## Overview

This guide explains how to monitor, track, and report on license usage in the Modular HRMS system. Usage reporting is essential for capacity planning, compliance, and cost optimization.

## Table of Contents

1. [Understanding Usage Metrics](#understanding-usage-metrics)
2. [Real-Time Monitoring](#real-time-monitoring)
3. [Historical Reports](#historical-reports)
4. [Usage Alerts](#usage-alerts)
5. [Compliance Reporting](#compliance-reporting)
6. [Cost Analysis](#cost-analysis)
7. [Capacity Planning](#capacity-planning)
8. [API Integration](#api-integration)

## Understanding Usage Metrics

### Metric Types

The system tracks several types of usage metrics:

#### 1. Employee Count
- **Description**: Number of active employees in the system
- **Scope**: System-wide and per-module
- **Update Frequency**: Real-time
- **Limit Type**: Hard limit (blocks at 100%)

**Example:**
```json
{
  "employees": {
    "current": 180,
    "limit": 200,
    "percentage": 90,
    "trend": "+5 this month"
  }
}
```

#### 2. Storage Usage
- **Description**: Total storage consumed by documents, files, and data
- **Scope**: Per-module
- **Update Frequency**: Hourly
- **Limit Type**: Hard limit (blocks uploads at 100%)
- **Units**: Bytes

**Example:**
```json
{
  "storage": {
    "current": 8589934592,      // 8 GB
    "limit": 10737418240,        // 10 GB
    "percentage": 80,
    "breakdown": {
      "documents": 5368709120,   // 5 GB
      "profilePictures": 1073741824,  // 1 GB
      "attachments": 2147483648  // 2 GB
    }
  }
}
```

#### 3. API Calls
- **Description**: Number of API requests made
- **Scope**: Per-module
- **Update Frequency**: Real-time (batched every 60 seconds)
- **Limit Type**: Soft limit (warning only)
- **Reset**: Monthly

**Example:**
```json
{
  "apiCalls": {
    "current": 42000,
    "limit": 50000,
    "percentage": 84,
    "period": "2025-12",
    "topEndpoints": [
      { "endpoint": "/api/v1/attendance/records", "calls": 15000 },
      { "endpoint": "/api/v1/users", "calls": 8000 }
    ]
  }
}
```

#### 4. Module-Specific Metrics

**Attendance Module:**
- Connected devices
- Clock-in/out events per day
- Timesheet submissions

**Leave Module:**
- Leave requests per month
- Active workflows
- Approval chains

**Payroll Module:**
- Payroll runs per month
- Payslips generated
- Tax calculations

**Documents Module:**
- Document templates
- Workflow instances
- E-signatures

**Reporting Module:**
- Custom reports created
- Scheduled reports
- Report executions per month

### Metric Calculation

#### Employee Count
```javascript
// Active employees only
SELECT COUNT(*) FROM users 
WHERE status = 'active' 
AND deletedAt IS NULL
```

#### Storage Usage
```javascript
// Sum of all file sizes
SELECT SUM(fileSize) FROM documents
UNION ALL
SELECT SUM(fileSize) FROM attachments
UNION ALL
SELECT SUM(fileSize) FROM profilePictures
```

#### API Calls
```javascript
// Tracked via middleware
app.use((req, res, next) => {
  usageTracker.trackUsage(
    req.tenant.id,
    req.module,
    'apiCalls',
    1
  );
  next();
});
```

## Real-Time Monitoring

### Dashboard View

Access real-time usage metrics:

**Location:** Settings → License Status → Usage Tab

**Features:**
- Live usage percentages
- Color-coded status (green, yellow, red)
- Trend indicators
- Quick actions (upgrade, optimize)

### Usage Widget

Embed usage widget in admin dashboard:

```javascript
import { UsageWidget } from '@/components/license/UsageWidget';

<UsageWidget 
  tenantId={tenantId}
  modules={['attendance', 'leave', 'payroll']}
  refreshInterval={60000}  // 1 minute
/>
```

### API Endpoint

**Get Current Usage:**
```bash
GET /api/v1/licenses/:tenantId/usage
```

**Response:**
```json
{
  "success": true,
  "tenantId": "507f1f77bcf86cd799439011",
  "period": "2025-12",
  "timestamp": "2025-12-09T10:00:00Z",
  "modules": {
    "attendance": {
      "usage": {
        "employees": { "current": 180, "limit": 200, "percentage": 90 },
        "devices": { "current": 8, "limit": 10, "percentage": 80 },
        "storage": { "current": 8589934592, "limit": 10737418240, "percentage": 80 }
      },
      "status": "warning",
      "warnings": [
        {
          "limitType": "employees",
          "percentage": 90,
          "triggeredAt": "2025-12-08T14:30:00Z",
          "message": "Approaching employee limit"
        }
      ]
    }
  }
}
```

### Real-Time Updates

**WebSocket Connection:**
```javascript
const ws = new WebSocket('ws://localhost:5000/usage-updates');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Usage update:', update);
  // Update UI
};
```

**Server-Sent Events:**
```javascript
const eventSource = new EventSource('/api/v1/licenses/:tenantId/usage/stream');

eventSource.addEventListener('usage-update', (event) => {
  const data = JSON.parse(event.data);
  updateUsageDisplay(data);
});
```

## Historical Reports

### Monthly Usage Report

**Generate Report:**
```bash
GET /api/v1/licenses/:tenantId/usage/history?startDate=2025-01-01&endDate=2025-12-31
```

**Response:**
```json
{
  "success": true,
  "tenantId": "507f1f77bcf86cd799439011",
  "reportPeriod": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "summary": {
    "totalEmployees": 200,
    "averageEmployees": 175,
    "peakEmployees": 200,
    "totalStorage": 10737418240,
    "totalApiCalls": 580000
  },
  "monthlyData": [
    {
      "period": "2025-01",
      "modules": {
        "attendance": {
          "employees": { "average": 150, "peak": 155 },
          "storage": { "average": 7516192768, "peak": 8053063680 },
          "apiCalls": { "total": 45000 }
        }
      }
    }
  ]
}
```

### Trend Analysis

**Endpoint:**
```bash
GET /api/v1/licenses/:tenantId/usage/trends?metric=employees&period=12months
```

**Response:**
```json
{
  "success": true,
  "metric": "employees",
  "period": "12months",
  "data": [
    { "month": "2025-01", "value": 150, "change": "+5" },
    { "month": "2025-02", "value": 155, "change": "+5" },
    { "month": "2025-03", "value": 160, "change": "+5" }
  ],
  "trend": "increasing",
  "averageGrowth": 5,
  "projection": {
    "nextMonth": 205,
    "threeMonths": 215,
    "sixMonths": 230
  }
}
```

### Export Reports

**Export Formats:**
- JSON
- CSV
- Excel (XLSX)
- PDF

**Example:**
```bash
# Export as CSV
curl -X GET "http://localhost:5000/api/v1/licenses/:tenantId/usage/export?format=csv&startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer TOKEN" \
  -o usage-report-2025.csv

# Export as PDF
curl -X GET "http://localhost:5000/api/v1/licenses/:tenantId/usage/export?format=pdf&startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer TOKEN" \
  -o usage-report-2025.pdf
```

### Scheduled Reports

**Configure Scheduled Report:**
```bash
POST /api/v1/licenses/:tenantId/usage/schedule
Content-Type: application/json

{
  "name": "Monthly Usage Report",
  "frequency": "monthly",
  "dayOfMonth": 1,
  "format": "pdf",
  "recipients": ["admin@company.com", "finance@company.com"],
  "modules": ["attendance", "leave", "payroll"],
  "includeCharts": true
}
```

**Response:**
```json
{
  "success": true,
  "schedule": {
    "id": "schedule_123",
    "name": "Monthly Usage Report",
    "frequency": "monthly",
    "nextRun": "2026-01-01T00:00:00Z",
    "status": "active"
  }
}
```

## Usage Alerts

### Alert Thresholds

The system automatically triggers alerts at these thresholds:

| Threshold | Severity | Action |
|-----------|----------|--------|
| 80% | Warning | Email notification |
| 90% | High | Email + Dashboard banner |
| 95% | Critical | Email + Dashboard banner + SMS (if configured) |
| 100% | Blocked | All notifications + Usage blocked |

### Configuring Alerts

**Update Alert Settings:**
```bash
PUT /api/v1/licenses/:tenantId/alerts
Content-Type: application/json

{
  "email": {
    "enabled": true,
    "recipients": ["admin@company.com"],
    "thresholds": [80, 90, 95]
  },
  "sms": {
    "enabled": true,
    "recipients": ["+1-555-0123"],
    "thresholds": [95]
  },
  "webhook": {
    "enabled": true,
    "url": "https://your-domain.com/webhooks/usage",
    "thresholds": [80, 90, 95, 100]
  }
}
```

### Alert Notifications

**Email Template:**
```
Subject: [Warning] Usage Alert - Attendance Module

Dear Administrator,

Your usage for the Attendance module has reached 90% of the limit.

Current Usage:
- Employees: 180 / 200 (90%)
- Devices: 8 / 10 (80%)

Recommendations:
1. Review and remove inactive employees
2. Upgrade to a higher tier
3. Contact support for assistance

View Details: https://hrms.company.com/settings/license

Best regards,
HRMS System
```

**Webhook Payload:**
```json
{
  "event": "usage.warning",
  "timestamp": "2025-12-09T10:00:00Z",
  "severity": "warning",
  "data": {
    "tenantId": "507f1f77bcf86cd799439011",
    "moduleKey": "attendance",
    "limitType": "employees",
    "usage": {
      "current": 180,
      "limit": 200,
      "percentage": 90
    },
    "recommendations": [
      "Review inactive employees",
      "Consider upgrading tier"
    ]
  }
}
```

### Alert History

**View Alert History:**
```bash
GET /api/v1/licenses/:tenantId/alerts/history?startDate=2025-01-01&endDate=2025-12-31
```

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert_123",
      "timestamp": "2025-12-08T14:30:00Z",
      "severity": "warning",
      "moduleKey": "attendance",
      "limitType": "employees",
      "percentage": 90,
      "notificationsSent": ["email", "webhook"],
      "acknowledged": true,
      "acknowledgedBy": "admin@company.com",
      "acknowledgedAt": "2025-12-08T15:00:00Z"
    }
  ]
}
```

## Compliance Reporting

### Audit Trail

All usage tracking is logged for compliance:

**Query Audit Logs:**
```bash
GET /api/v1/licenses/audit?eventType=USAGE_TRACKED&startDate=2025-01-01&endDate=2025-12-31
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-12-09T10:00:00Z",
      "eventType": "USAGE_TRACKED",
      "tenantId": "507f1f77bcf86cd799439011",
      "moduleKey": "attendance",
      "details": {
        "limitType": "apiCalls",
        "amount": 1,
        "newTotal": 42001
      }
    }
  ]
}
```

### License Compliance Report

**Generate Compliance Report:**
```bash
GET /api/v1/licenses/:tenantId/compliance/report?year=2025
```

**Response:**
```json
{
  "success": true,
  "tenantId": "507f1f77bcf86cd799439011",
  "reportYear": 2025,
  "compliance": {
    "status": "compliant",
    "violations": [],
    "warnings": [
      {
        "date": "2025-12-08",
        "module": "attendance",
        "limitType": "employees",
        "percentage": 90,
        "resolved": false
      }
    ]
  },
  "usage": {
    "totalEmployees": 200,
    "licensedEmployees": 200,
    "utilizationRate": 100
  },
  "modules": [
    {
      "key": "attendance",
      "licensed": true,
      "tier": "business",
      "usageCompliant": true,
      "averageUtilization": 85
    }
  ]
}
```

### Violation Tracking

**Track License Violations:**
```bash
GET /api/v1/licenses/:tenantId/violations?startDate=2025-01-01&endDate=2025-12-31
```

**Response:**
```json
{
  "success": true,
  "violations": [
    {
      "timestamp": "2025-06-15T10:30:00Z",
      "moduleKey": "attendance",
      "limitType": "employees",
      "attemptedValue": 201,
      "limit": 200,
      "action": "blocked",
      "userId": "507f1f77bcf86cd799439014",
      "resolved": true,
      "resolvedAt": "2025-06-15T11:00:00Z",
      "resolution": "User removed inactive employees"
    }
  ],
  "summary": {
    "totalViolations": 1,
    "resolvedViolations": 1,
    "unresolvedViolations": 0
  }
}
```

## Cost Analysis

### Usage-Based Cost Calculation

**Calculate Monthly Cost:**
```bash
POST /api/v1/pricing/calculate
Content-Type: application/json

{
  "tenantId": "507f1f77bcf86cd799439011",
  "modules": [
    {
      "key": "attendance",
      "tier": "business",
      "employees": 180
    },
    {
      "key": "leave",
      "tier": "business",
      "employees": 180
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "calculation": {
    "period": "monthly",
    "breakdown": [
      {
        "module": "attendance",
        "tier": "business",
        "pricePerEmployee": 8,
        "employees": 180,
        "subtotal": 1440
      },
      {
        "module": "leave",
        "tier": "business",
        "pricePerEmployee": 5,
        "employees": 180,
        "subtotal": 900
      }
    ],
    "subtotal": 2340,
    "discount": {
      "type": "bundle",
      "percentage": 10,
      "amount": 234
    },
    "total": 2106,
    "currency": "USD"
  }
}
```

### Cost Optimization Recommendations

**Get Recommendations:**
```bash
GET /api/v1/licenses/:tenantId/cost-optimization
```

**Response:**
```json
{
  "success": true,
  "currentCost": 2106,
  "recommendations": [
    {
      "type": "remove_inactive_users",
      "description": "Remove 20 inactive employees",
      "potentialSavings": 160,
      "impact": "low",
      "effort": "low"
    },
    {
      "type": "downgrade_tier",
      "description": "Downgrade Documents module from Business to Starter",
      "potentialSavings": 300,
      "impact": "medium",
      "effort": "medium",
      "considerations": [
        "Reduced storage limit",
        "Fewer templates"
      ]
    },
    {
      "type": "bundle_discount",
      "description": "Add one more module to increase bundle discount to 15%",
      "potentialSavings": 105,
      "impact": "none",
      "effort": "low"
    }
  ],
  "totalPotentialSavings": 565
}
```

### Cost Forecasting

**Forecast Future Costs:**
```bash
GET /api/v1/licenses/:tenantId/cost-forecast?months=12
```

**Response:**
```json
{
  "success": true,
  "forecast": [
    { "month": "2026-01", "estimatedCost": 2106, "employees": 180 },
    { "month": "2026-02", "estimatedCost": 2162, "employees": 185 },
    { "month": "2026-03", "estimatedCost": 2218, "employees": 190 }
  ],
  "assumptions": {
    "growthRate": 2.5,
    "tierChanges": [],
    "moduleAdditions": []
  },
  "totalAnnualCost": 26000
}
```

## Capacity Planning

### Growth Projections

**Project Future Usage:**
```bash
GET /api/v1/licenses/:tenantId/capacity/projection?months=12
```

**Response:**
```json
{
  "success": true,
  "projections": {
    "employees": {
      "current": 180,
      "projected": [
        { "month": "2026-01", "value": 185 },
        { "month": "2026-02", "value": 190 },
        { "month": "2026-03", "value": 195 }
      ],
      "limitReached": "2026-04",
      "recommendation": "Upgrade before 2026-04"
    },
    "storage": {
      "current": 8589934592,
      "projected": [
        { "month": "2026-01", "value": 9126805504 },
        { "month": "2026-02", "value": 9663676416 }
      ],
      "limitReached": "2026-03",
      "recommendation": "Upgrade before 2026-03"
    }
  }
}
```

### Capacity Recommendations

**Get Capacity Recommendations:**
```bash
GET /api/v1/licenses/:tenantId/capacity/recommendations
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "type": "upgrade_tier",
      "urgency": "high",
      "module": "attendance",
      "currentTier": "business",
      "recommendedTier": "enterprise",
      "reason": "Employee limit will be reached in 2 months",
      "timeline": "Within 30 days",
      "cost": "+$500/month"
    },
    {
      "type": "add_storage",
      "urgency": "medium",
      "module": "documents",
      "currentLimit": "10GB",
      "recommendedLimit": "25GB",
      "reason": "Storage usage growing 15% monthly",
      "timeline": "Within 60 days",
      "cost": "+$50/month"
    }
  ]
}
```

## API Integration

### Usage Tracking SDK

**JavaScript/Node.js:**
```javascript
const { UsageTracker } = require('@hrms/usage-sdk');

const tracker = new UsageTracker({
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id'
});

// Track usage event
await tracker.track('attendance', 'apiCalls', 1);

// Get current usage
const usage = await tracker.getUsage();
console.log(usage);

// Check if approaching limit
const warnings = await tracker.checkWarnings();
if (warnings.length > 0) {
  console.warn('Usage warnings:', warnings);
}
```

**Python:**
```python
from hrms_usage import UsageTracker

tracker = UsageTracker(
    api_key='your-api-key',
    tenant_id='your-tenant-id'
)

# Track usage event
tracker.track('attendance', 'apiCalls', 1)

# Get current usage
usage = tracker.get_usage()
print(usage)

# Check if approaching limit
warnings = tracker.check_warnings()
if warnings:
    print(f'Usage warnings: {warnings}')
```

### Webhook Integration

**Receive Usage Webhooks:**
```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/webhooks/usage', express.json(), (req, res) => {
  // Verify signature
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifySignature(req.body, signature, WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Handle event
  const { event, data } = req.body;
  
  switch (event) {
    case 'usage.warning':
      handleUsageWarning(data);
      break;
    case 'usage.critical':
      handleUsageCritical(data);
      break;
    case 'usage.exceeded':
      handleUsageExceeded(data);
      break;
  }
  
  res.status(200).send('OK');
});

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

### Custom Dashboards

**Embed Usage Charts:**
```javascript
import { UsageChart } from '@hrms/usage-components';

function UsageDashboard() {
  return (
    <div>
      <UsageChart
        tenantId="your-tenant-id"
        moduleKey="attendance"
        metric="employees"
        period="12months"
        chartType="line"
      />
      
      <UsageChart
        tenantId="your-tenant-id"
        moduleKey="documents"
        metric="storage"
        period="6months"
        chartType="area"
      />
    </div>
  );
}
```

## Best Practices

### 1. Regular Monitoring

- Check usage metrics weekly
- Review trends monthly
- Plan capacity quarterly
- Audit compliance annually

### 2. Proactive Alerts

- Set alerts at 80% threshold
- Configure multiple notification channels
- Test alert delivery regularly
- Document escalation procedures

### 3. Cost Optimization

- Review inactive users monthly
- Analyze feature utilization
- Consider tier downgrades for underused modules
- Leverage bundle discounts

### 4. Capacity Planning

- Project growth based on historical data
- Plan upgrades 2-3 months in advance
- Budget for seasonal variations
- Maintain 20% buffer capacity

### 5. Compliance

- Maintain complete audit trails
- Generate compliance reports quarterly
- Document all violations and resolutions
- Review license terms regularly

### 6. Data Retention

- Retain usage data for 2 years minimum
- Archive old reports securely
- Implement data backup procedures
- Document retention policies

## Related Documentation

- [LICENSE_MANAGEMENT.md](LICENSE_MANAGEMENT.md) - License management guide
- [ON_PREMISE_LICENSE.md](ON_PREMISE_LICENSE.md) - On-Premise specific guide
- [LICENSE_TROUBLESHOOTING.md](LICENSE_TROUBLESHOOTING.md) - Troubleshooting guide
- [LICENSE_API.md](LICENSE_API.md) - API reference
