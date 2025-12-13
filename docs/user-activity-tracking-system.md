# User Activity Tracking System

## Overview
Comprehensive user activity tracking system that monitors and logs all user actions within each company. Provides real-time monitoring, detailed activity analytics, and an admin dashboard for tracking user behavior and system usage.

## Key Features

### 1. **Detailed User Activity Logging**
- **Real-time Activity Tracking**: Captures every user action with detailed context
- **Session Management**: Tracks login/logout events and session duration
- **Route-based Monitoring**: Monitors navigation patterns within company routes
- **Activity Type Detection**: Automatically categorizes user actions (view, create, update, delete)
- **Data Sanitization**: Removes sensitive information from logs

### 2. **Admin Dashboard**
- **Real-time User Sessions**: Live view of currently active users
- **Activity History**: Comprehensive history of all user activities
- **User Timeline**: Detailed chronological view of individual user actions
- **Advanced Filtering**: Filter by user, activity type, date range
- **Auto-refresh**: Real-time updates every 30 seconds

### 3. **Analytics & Reporting**
- **User Engagement Metrics**: Track user activity patterns and engagement
- **Feature Usage Analytics**: Identify most/least used features
- **Performance Monitoring**: Track response times and system performance
- **Security Monitoring**: Monitor suspicious activities and access patterns

## Technical Implementation

### Enhanced Middleware (`server/middleware/companyLogging.js`)

#### New Functions Added:
```javascript
// Track detailed user activities
trackUserActivity(req, res, next)

// Track session events (login/logout)
trackUserSession(eventType, req, additionalData)

// Determine activity type from request
determineActivityType(method, path, body)

// Sanitize sensitive data from logs
sanitizeRequestBody(body, activityType)
```

#### Activity Data Structure:
```javascript
{
  eventType: 'user_activity',
  activityType: 'dashboard_view', // Auto-detected
  userId: 'user-123',
  userEmail: 'user@company.com',
  userName: 'John Doe',
  userRole: 'employee',
  companySlug: 'techcorp-solutions',
  companyName: 'TechCorp Solutions',
  method: 'GET',
  internalPath: '/dashboard',
  fullUrl: '/company/techcorp-solutions/dashboard',
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.100',
  sessionId: 'sess-123-abc',
  timestamp: '2025-12-13T15:30:00.000Z',
  requestBody: { /* sanitized */ },
  queryParams: { /* query parameters */ }
}
```

### Enhanced Service (`server/services/companyLogService.js`)

#### New Analytics Methods:
```javascript
// Get detailed user activity tracking
getUserActivityTracking(tenantId, options)

// Get real-time active user sessions
getRealTimeUserSessions(tenantId)

// Get activity timeline for specific user
getUserActivityTimeline(tenantId, userId, days)
```

#### Analytics Data Points:
- **Total Activities**: Count of all user activities
- **Active Users**: Number of users with recent activity
- **Activity Types**: Breakdown by action type (view, create, update, delete)
- **Navigation Patterns**: Most common user journeys
- **Peak Usage Hours**: When users are most active
- **Session Duration**: Average time users spend in the system
- **Feature Engagement**: Which features are used most/least

### New API Endpoints (`server/routes/companyLogs.js`)

#### User Activity Endpoints:
```bash
# Get user activities with filtering
GET /api/company-logs/:tenantId/user-activities
  ?userId=user-123
  &days=7
  &activityType=dashboard_view
  &includeRealTime=true
  &limit=1000

# Get real-time active sessions
GET /api/company-logs/:tenantId/real-time-sessions

# Get user activity timeline
GET /api/company-logs/:tenantId/user-timeline/:userId?days=1
```

#### Response Examples:
```javascript
// User Activities Response
{
  "success": true,
  "data": {
    "tenantId": "techcorp-solutions-d8f0689c",
    "companyName": "TechCorp Solutions",
    "period": "7 days",
    "totalActivities": 1250,
    "users": {
      "user-123": {
        "userId": "user-123",
        "userEmail": "john@techcorp.com",
        "userName": "John Doe",
        "userRole": "employee",
        "totalActivities": 45,
        "lastActivity": "2025-12-13T15:30:00.000Z",
        "isOnline": true,
        "activityTypes": {
          "dashboard_view": 15,
          "users_list": 10,
          "reports_view": 20
        }
      }
    },
    "recentActivities": [/* recent activity entries */],
    "activitySummary": {
      "byType": { "dashboard_view": 300, "users_list": 200 },
      "byUser": { "user-123": 45, "user-456": 38 },
      "byHour": { "9": 120, "10": 150, "11": 180 },
      "byDay": { "2025-12-13": 450, "2025-12-12": 380 }
    }
  }
}

// Real-time Sessions Response
{
  "success": true,
  "data": {
    "tenantId": "techcorp-solutions-d8f0689c",
    "companyName": "TechCorp Solutions",
    "timestamp": "2025-12-13T15:30:00.000Z",
    "totalActiveUsers": 5,
    "activeUsers": [
      {
        "userId": "user-123",
        "userEmail": "john@techcorp.com",
        "userName": "John Doe",
        "lastActivity": "2025-12-13T15:29:30.000Z",
        "currentPath": "/dashboard",
        "currentActivity": "dashboard_view",
        "activitiesCount": 12,
        "ip": "192.168.1.100"
      }
    ],
    "sessionSummary": {
      "totalSessions": 5,
      "mostActiveUser": { /* user with most activities */ },
      "currentActivities": {
        "dashboard_view": 3,
        "users_list": 1,
        "reports_view": 1
      }
    }
  }
}
```

## Admin Dashboard (`client/hr-app/src/pages/admin/UserActivityTracker.jsx`)

### Features:
1. **Real-Time Sessions Tab**
   - Live view of currently active users
   - Current activity and location for each user
   - Session statistics and most active user
   - Auto-refresh every 30 seconds

2. **Activity History Tab**
   - Comprehensive activity log with filtering
   - Search by user name or email
   - Filter by activity type and date range
   - Detailed activity information with timestamps

3. **User Timeline Dialog**
   - Chronological view of individual user activities
   - Activity type visualization with color coding
   - Session summary and feature usage statistics

### Access Control:
- **Admin Only**: Restricted to users with 'admin' or 'platform_admin' roles
- **Company Scoped**: Each admin can only see their company's data
- **Permission Based**: Uses existing permission system for access control

### UI Components:
- **Real-time Indicators**: Green badges for online users
- **Activity Type Chips**: Color-coded activity categories
- **Timeline Visualization**: Chronological activity display
- **Statistics Cards**: Key metrics and summaries
- **Advanced Filters**: Multi-criteria filtering options

## Activity Type Detection

### Automatic Classification:
The system automatically determines activity types based on HTTP method and URL path:

```javascript
// GET Requests
'/dashboard' → 'dashboard_view'
'/users' → 'users_list'
'/users/create' → 'users_create_form'
'/users/123' → 'users_view'
'/users/123/edit' → 'users_edit_form'

// POST Requests
'/users' → 'users_create'
'/users/search' → 'users_search'
'/users/upload' → 'users_upload'

// PUT/PATCH Requests
'/users/123' → 'users_update'

// DELETE Requests
'/users/123' → 'users_delete'
```

### Custom Activity Types:
Controllers can log custom activities using the helper function:
```javascript
import { logCompanyEvent } from '../middleware/companyLogging.js';

// In a controller
export const processPayroll = (req, res) => {
  logCompanyEvent(req, 'payroll_processed', {
    payrollPeriod: '2025-12',
    employeeCount: 150,
    totalAmount: 450000
  });
  
  // ... controller logic
};
```

## Data Privacy & Security

### Sensitive Data Handling:
- **Automatic Sanitization**: Removes passwords, tokens, SSNs, credit cards
- **Size Limits**: Truncates large request bodies to prevent log bloat
- **IP Anonymization**: Option to anonymize IP addresses for privacy
- **Retention Policies**: Configurable data retention periods

### Security Features:
- **Access Control**: Role-based access to activity data
- **Audit Trails**: All admin access to activity data is logged
- **Data Encryption**: Log files can be encrypted at rest
- **Secure Transmission**: All API calls use HTTPS and authentication

## Performance Considerations

### Optimizations:
- **Asynchronous Logging**: Non-blocking activity logging
- **Log Rotation**: Automatic log file rotation and archival
- **Efficient Queries**: Optimized database queries for analytics
- **Caching**: Cached analytics for frequently accessed data

### Scalability:
- **Company Isolation**: Each company's data is isolated
- **Horizontal Scaling**: Can scale across multiple servers
- **Database Optimization**: Indexed queries for fast retrieval
- **Memory Management**: Efficient memory usage for large datasets

## Configuration Options

### Environment Variables:
```bash
# Enable/disable activity tracking
TRACK_USER_ACTIVITIES=true

# Log retention period (days)
ACTIVITY_LOG_RETENTION_DAYS=90

# Real-time session timeout (minutes)
SESSION_TIMEOUT_MINUTES=30

# Maximum activities per API call
MAX_ACTIVITIES_PER_REQUEST=1000

# Enable IP anonymization
ANONYMIZE_IP_ADDRESSES=false
```

### Company-specific Settings:
```javascript
// Per-company configuration
{
  "activityTracking": {
    "enabled": true,
    "trackSensitiveActions": true,
    "retentionDays": 90,
    "realTimeUpdates": true,
    "anonymizeIPs": false
  }
}
```

## Usage Examples

### 1. Monitor Real-time User Activity
```javascript
// Get currently active users
const sessions = await userActivityService.getRealTimeSessions(tenantId);
console.log(`${sessions.totalActiveUsers} users currently online`);

// Get specific user's current activity
const userActivity = sessions.activeUsers.find(u => u.userId === 'user-123');
console.log(`User is currently: ${userActivity.currentActivity}`);
```

### 2. Analyze User Behavior
```javascript
// Get user activity patterns
const activities = await userActivityService.getUserActivities(tenantId, {
  days: 30,
  userId: 'user-123'
});

// Analyze most used features
const topFeatures = Object.entries(activities.users['user-123'].activityTypes)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5);

console.log('Top 5 features used:', topFeatures);
```

### 3. Security Monitoring
```javascript
// Monitor suspicious activities
const activities = await userActivityService.getUserActivities(tenantId, {
  days: 1,
  activityType: 'user_delete'
});

// Check for unusual deletion patterns
const deletions = activities.recentActivities.filter(a => 
  a.activityType === 'user_delete'
);

if (deletions.length > 10) {
  console.log('⚠️ Unusual deletion activity detected');
}
```

### 4. Performance Analysis
```javascript
// Get routing analytics
const analytics = await userActivityService.getRoutingAnalytics(tenantId, 30);

// Find slowest routes
const slowRoutes = Object.entries(analytics.routePerformance)
  .filter(([route, perf]) => perf.avgTime > 1000) // > 1 second
  .sort(([,a], [,b]) => b.avgTime - a.avgTime);

console.log('Slowest routes:', slowRoutes);
```

## Testing

### Test Script:
```bash
# Run comprehensive test suite
node server/scripts/testUserActivityTracking.js
```

### Manual Testing:
1. **Login to HR System**: Navigate through different pages
2. **Check Admin Dashboard**: Go to User Activity Tracker page
3. **Verify Real-time Updates**: Watch live user sessions
4. **Test Filtering**: Use various filters and search options
5. **Check Timeline**: View individual user timelines

### Expected Results:
- All user actions are logged with proper context
- Real-time dashboard shows current user activities
- Activity history displays comprehensive user actions
- Timeline shows chronological user behavior
- Analytics provide meaningful insights

## Deployment Checklist

### Pre-deployment:
- [ ] Configure environment variables
- [ ] Set up log rotation policies
- [ ] Configure data retention settings
- [ ] Test API endpoints with authentication
- [ ] Verify admin dashboard access controls

### Post-deployment:
- [ ] Monitor log file sizes and rotation
- [ ] Verify real-time updates are working
- [ ] Check analytics data accuracy
- [ ] Test performance under load
- [ ] Validate security and privacy controls

## Troubleshooting

### Common Issues:

1. **Activities Not Logging**
   - Check if `trackUserActivity` middleware is properly configured
   - Verify user authentication is working
   - Check log file permissions and disk space

2. **Real-time Updates Not Working**
   - Verify auto-refresh is enabled
   - Check API endpoint authentication
   - Ensure WebSocket connections (if used) are working

3. **Performance Issues**
   - Check log file sizes and implement rotation
   - Optimize database queries for large datasets
   - Consider caching frequently accessed analytics

4. **Access Denied Errors**
   - Verify user has admin role
   - Check tenant ID matches user's company
   - Ensure proper authentication tokens

---

**Status**: ✅ **COMPLETED** - Comprehensive user activity tracking system implemented and ready for production use