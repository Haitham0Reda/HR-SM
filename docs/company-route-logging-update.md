# Company Route Logging System Update

## Overview
Updated the company logging system to fully support the new company-based routing structure (`/company/{company-slug}/...`). The enhanced logging system now tracks user navigation, feature usage, and performance metrics within company-scoped routes.

## Key Enhancements

### 1. Enhanced Middleware (`server/middleware/companyLogging.js`)

#### New Route Detection
- **Company Slug Extraction**: Automatically extracts company slug from URL paths
- **Internal Path Tracking**: Tracks the internal path within company context
- **Route Validation**: Identifies company-scoped vs. global routes

#### Enhanced Logging Context
```javascript
// New routing context added to all log entries
{
  routing: {
    isCompanyRoute: true,
    companySlug: "techcorp-solutions",
    internalPath: "/dashboard",
    companyName: "TechCorp Solutions"
  }
}
```

#### New Middleware Functions
- `logCompanyNavigation()` - Tracks user navigation within company routes
- `logRouteAccess()` - Monitors feature/module access patterns
- `logCompanyEvent()` - Helper for logging custom company events

### 2. Enhanced Analytics (`server/services/companyLogService.js`)

#### New Analytics Methods
- `getCompanyRoutingAnalytics()` - Comprehensive routing usage analytics
- `getCompanyFeatureUsage()` - Feature usage reports and trends

#### Analytics Data Points
- **Total Company Route Access**: Count of company-scoped requests
- **Feature Usage**: Which HR modules are most/least used
- **Navigation Patterns**: Most common user journeys
- **Route Performance**: Response times by route
- **Peak Usage Hours**: When users are most active
- **User Activity**: Individual user engagement metrics
- **Error Tracking**: Errors by specific routes

### 3. New API Endpoints (`server/routes/companyLogs.js`)

#### Routing Analytics
```
GET /api/company-logs/:tenantId/routing-analytics?days=30
```
Returns comprehensive routing analytics including:
- Feature usage breakdown
- Navigation patterns
- Performance metrics
- User activity patterns

#### Feature Usage Report
```
GET /api/company-logs/:tenantId/feature-usage?days=7
```
Returns feature usage report with:
- Most/least used features
- Usage percentages
- Access counts

### 4. Enhanced Log Entries

#### Before (Old Format)
```json
{
  "level": "info",
  "message": "Request received",
  "method": "GET",
  "url": "/api/users",
  "userId": "123"
}
```

#### After (Enhanced Format)
```json
{
  "level": "info",
  "message": "Request received",
  "method": "GET",
  "url": "/company/techcorp-solutions/users",
  "userId": "123",
  "routing": {
    "isCompanyRoute": true,
    "companySlug": "techcorp-solutions",
    "internalPath": "/users",
    "companyName": "TechCorp Solutions"
  },
  "feature": "users"
}
```

## Implementation Details

### Route Pattern Recognition
The system recognizes company routes using the pattern:
```
/company/{company-slug}/{internal-path}
```

Examples:
- `/company/techcorp-solutions/dashboard` → Company: techcorp-solutions, Path: /dashboard
- `/company/acme-corp/users/create` → Company: acme-corp, Path: /users/create

### Feature Detection
Features are automatically detected from the internal path:
- `/dashboard` → Feature: dashboard
- `/users` → Feature: users
- `/users/create` → Feature: users, Sub-feature: create
- `/attendance` → Feature: attendance

### Performance Tracking
Response times are tracked for each route to identify:
- Slow-performing routes
- Most efficient features
- Performance trends over time

## Usage Examples

### 1. Track Company Navigation
```javascript
import { logCompanyEvent } from '../middleware/companyLogging.js';

// In a controller
export const getDashboard = (req, res) => {
  logCompanyEvent(req, 'dashboard_access', {
    dashboardType: 'main',
    widgets: ['stats', 'charts', 'notifications']
  });
  
  // ... controller logic
};
```

### 2. Get Analytics Data
```javascript
// Get routing analytics
const analytics = await companyLogService.getCompanyRoutingAnalytics('tenant-123', 30);
console.log('Top features:', analytics.featureUsage);
console.log('Peak hours:', analytics.peakUsageHours);

// Get feature usage report
const featureReport = await companyLogService.getCompanyFeatureUsage('tenant-123', 7);
console.log('Most used feature:', featureReport.features[0]);
```

### 3. API Usage
```bash
# Get routing analytics for last 30 days
curl -H "Authorization: Bearer token" \
  "http://localhost:5000/api/company-logs/tenant-123/routing-analytics?days=30"

# Get feature usage for last 7 days
curl -H "Authorization: Bearer token" \
  "http://localhost:5000/api/company-logs/tenant-123/feature-usage?days=7"
```

## Benefits

### 1. **Enhanced Visibility**
- Track which company features are actually being used
- Identify unused or underutilized modules
- Monitor user engagement patterns

### 2. **Performance Insights**
- Identify slow routes that need optimization
- Track performance improvements over time
- Monitor system load patterns

### 3. **Business Intelligence**
- Understand how different companies use the system
- Identify popular features for development prioritization
- Track user adoption of new features

### 4. **Security & Compliance**
- Detailed audit trails for company-specific actions
- Track access patterns for security monitoring
- Compliance reporting with company context

## Testing

### Test Script
Run the test script to verify the enhanced logging:
```bash
node server/scripts/testCompanyRouteLogging.js
```

### Manual Testing
1. **Login to HR System**: Navigate to `/company/techcorp-solutions/dashboard`
2. **Check Logs**: View logs in `logs/companies/techcorp_solutions/`
3. **Verify Context**: Ensure routing context is included in log entries
4. **Test Analytics**: Call analytics API endpoints

### Expected Log Output
```json
{
  "level": "info",
  "message": "Company navigation",
  "eventType": "navigation",
  "companySlug": "techcorp-solutions",
  "internalPath": "/dashboard",
  "companyName": "TechCorp Solutions",
  "method": "GET",
  "url": "/company/techcorp-solutions/dashboard",
  "userId": "user-123",
  "userEmail": "admin@techcorp.com",
  "timestamp": "2025-12-13T14:30:00.000Z"
}
```

## Files Modified

### Core Files
- `server/middleware/companyLogging.js` - Enhanced middleware with route detection
- `server/services/companyLogService.js` - Added analytics methods
- `server/routes/companyLogs.js` - Added analytics endpoints

### New Files
- `server/scripts/testCompanyRouteLogging.js` - Test script for verification
- `docs/company-route-logging-update.md` - This documentation

## Next Steps

1. **Deploy Updates** - Apply changes to production environment
2. **Monitor Logs** - Verify enhanced logging is working correctly
3. **Create Dashboards** - Build analytics dashboards using the new data
4. **Set Alerts** - Configure alerts for unusual patterns or errors
5. **Train Users** - Educate administrators on new analytics capabilities

---

**Status**: ✅ **COMPLETED** - Company route logging system successfully updated and enhanced