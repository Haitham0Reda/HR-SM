# Real-Time License Updates Implementation

## Overview

This document describes the implementation of real-time license updates using WebSocket technology. The system provides instant notifications to clients when license status changes, usage limits are approached or exceeded, and modules are activated or deactivated.

## Architecture

### Backend Components

#### 1. WebSocket Server (`licenseWebSocket.service.js`)

The WebSocket server manages real-time connections with clients and broadcasts license-related events.

**Key Features:**
- JWT-based authentication for WebSocket connections
- Tenant-based connection management
- Automatic reconnection handling
- Event broadcasting to specific tenants

**Connection URL:**
```
ws://localhost:5000/ws/license?token=<JWT_TOKEN>
```

**Supported Message Types:**

1. **license_expiring** - License expiring within 30 days
   ```json
   {
     "type": "license_expiring",
     "moduleKey": "attendance",
     "expiresAt": "2025-02-01T00:00:00.000Z",
     "daysUntilExpiration": 15,
     "severity": "warning",
     "timestamp": "2025-12-08T10:00:00.000Z"
   }
   ```

2. **license_expired** - License has expired
   ```json
   {
     "type": "license_expired",
     "moduleKey": "attendance",
     "severity": "critical",
     "timestamp": "2025-12-08T10:00:00.000Z"
   }
   ```

3. **usage_limit_warning** - Usage approaching limit (≥80%)
   ```json
   {
     "type": "usage_limit_warning",
     "moduleKey": "attendance",
     "limitType": "employees",
     "currentUsage": 45,
     "limit": 50,
     "percentage": 90,
     "severity": "warning",
     "timestamp": "2025-12-08T10:00:00.000Z"
   }
   ```

4. **usage_limit_exceeded** - Usage limit exceeded
   ```json
   {
     "type": "usage_limit_exceeded",
     "moduleKey": "attendance",
     "limitType": "employees",
     "currentUsage": 51,
     "limit": 50,
     "severity": "critical",
     "timestamp": "2025-12-08T10:00:00.000Z"
   }
   ```

5. **module_activated** - Module has been activated
   ```json
   {
     "type": "module_activated",
     "moduleKey": "payroll",
     "severity": "info",
     "timestamp": "2025-12-08T10:00:00.000Z"
   }
   ```

6. **module_deactivated** - Module has been deactivated
   ```json
   {
     "type": "module_deactivated",
     "moduleKey": "payroll",
     "severity": "warning",
     "timestamp": "2025-12-08T10:00:00.000Z"
   }
   ```

7. **license_updated** - License configuration changed
   ```json
   {
     "type": "license_updated",
     "changes": {
       "modules": ["attendance", "payroll"],
       "action": "upgrade"
     },
     "severity": "info",
     "timestamp": "2025-12-08T10:00:00.000Z"
   }
   ```

#### 2. License Validator Integration

The `licenseValidator.service.js` has been enhanced to emit real-time events:

**Event Triggers:**
- License expiration detected during validation
- License expiring within 30 days
- Usage limit warning (≥80%)
- Usage limit exceeded

**Example Integration:**
```javascript
// In licenseValidator.service.js
if (moduleLicense.expiresAt && new Date(moduleLicense.expiresAt) < new Date()) {
    // Emit real-time notification
    licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);
    
    return {
        valid: false,
        error: 'LICENSE_EXPIRED'
    };
}
```

### Frontend Components

#### 1. Enhanced LicenseContext (`LicenseContext.js`)

The LicenseContext now includes WebSocket client functionality:

**New Features:**
- Automatic WebSocket connection on authentication
- Exponential backoff reconnection strategy (max 5 attempts)
- Real-time notification queue management
- Automatic license data refresh on critical events

**New State:**
```javascript
const {
    notifications,        // Array of real-time notifications
    removeNotification,   // Function to dismiss a notification
    clearNotifications    // Function to clear all notifications
} = useLicense();
```

**WebSocket Connection:**
- Automatically connects when user is authenticated
- Uses JWT token for authentication
- Reconnects automatically on disconnect
- Handles connection errors gracefully

#### 2. LicenseNotificationToast Component

A Material-UI based toast notification system for displaying real-time license events.

**Features:**
- Queue-based notification display
- Severity-based styling (info, warning, error)
- Auto-dismiss with configurable duration
- Manual dismiss option
- Responsive positioning (top-right)

**Usage:**
```jsx
import LicenseNotificationToast from './components/license/LicenseNotificationToast';

// Add to App.js inside LicenseProvider
<LicenseProvider>
    <LicenseNotificationToast />
    {/* Rest of app */}
</LicenseProvider>
```

## Server Setup

### 1. Install Dependencies

```bash
npm install ws
```

### 2. Initialize WebSocket Server

The WebSocket server is automatically initialized in `server/index.js`:

```javascript
import licenseWebSocketService from './services/licenseWebSocket.service.js';

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
licenseWebSocketService.initialize(server);

// Start listening
server.listen(PORT);
```

### 3. Graceful Shutdown

The WebSocket server is properly shut down on process termination:

```javascript
const gracefulShutdown = (signal) => {
    licenseWebSocketService.shutdown();
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## Client Setup

### 1. WebSocket Connection

The WebSocket connection is automatically established when the user logs in:

```javascript
// In LicenseContext.js
useEffect(() => {
    if (isAuthenticated && user?.token) {
        connectWebSocket();
    }
    
    return () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
    };
}, [isAuthenticated, user]);
```

### 2. Environment Configuration

Set the API port in your `.env` file:

```env
REACT_APP_API_PORT=5000
```

## Testing

### Manual Testing

1. **Test License Expiration Notification:**
   - Set a module license to expire soon
   - Trigger license validation
   - Verify notification appears in UI

2. **Test Usage Limit Warning:**
   - Increase usage to 80% of limit
   - Verify warning notification appears

3. **Test Usage Limit Exceeded:**
   - Attempt to exceed usage limit
   - Verify critical notification appears

4. **Test Module Activation:**
   - Activate a module via API
   - Verify notification appears and license data refreshes

### WebSocket Connection Test

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:5000/ws/license?token=YOUR_JWT_TOKEN');

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
ws.onerror = (error) => console.error('Error:', error);
```

## Security Considerations

1. **Authentication:**
   - All WebSocket connections require valid JWT token
   - Tokens are verified on connection
   - Invalid tokens result in immediate connection closure

2. **Tenant Isolation:**
   - Notifications are only sent to connections belonging to the affected tenant
   - No cross-tenant information leakage

3. **Rate Limiting:**
   - WebSocket connections are limited per tenant
   - Prevents resource exhaustion attacks

## Performance Considerations

1. **Connection Management:**
   - Connections are tracked per tenant
   - Automatic cleanup on disconnect
   - Memory-efficient Set-based storage

2. **Message Broadcasting:**
   - Only active connections receive messages
   - Failed sends are logged but don't block other sends
   - Efficient JSON serialization

3. **Reconnection Strategy:**
   - Exponential backoff prevents server overload
   - Maximum 5 reconnection attempts
   - Configurable delay between attempts

## Monitoring

### Connection Statistics

Get real-time connection statistics:

```javascript
const stats = licenseWebSocketService.getStats();
// Returns:
// {
//   totalTenants: 5,
//   totalConnections: 12,
//   tenantConnections: {
//     'tenant-1': 3,
//     'tenant-2': 2,
//     ...
//   }
// }
```

### Logging

All WebSocket events are logged:
- Connection/disconnection events
- Authentication failures
- Message broadcasts
- Error conditions

## Troubleshooting

### Connection Issues

**Problem:** WebSocket connection fails
**Solutions:**
1. Verify JWT token is valid
2. Check server is running on correct port
3. Verify firewall allows WebSocket connections
4. Check browser console for errors

**Problem:** Notifications not appearing
**Solutions:**
1. Verify LicenseNotificationToast is rendered
2. Check browser console for WebSocket messages
3. Verify notification queue is not empty
4. Check notification auto-dismiss duration

### Performance Issues

**Problem:** High memory usage
**Solutions:**
1. Check number of active connections
2. Verify connections are properly cleaned up
3. Monitor notification queue size
4. Check for memory leaks in client code

## Future Enhancements

1. **Message Persistence:**
   - Store notifications in database
   - Allow users to view notification history
   - Mark notifications as read/unread

2. **Notification Preferences:**
   - Allow users to configure notification types
   - Set custom thresholds for warnings
   - Email/SMS integration for critical events

3. **Advanced Filtering:**
   - Subscribe to specific module updates
   - Filter by severity level
   - Custom notification rules

4. **Analytics:**
   - Track notification delivery rates
   - Monitor user engagement with notifications
   - Identify common notification patterns

## Related Files

- `server/services/licenseWebSocket.service.js` - WebSocket server
- `server/services/licenseValidator.service.js` - License validator with event emission
- `server/index.js` - Server initialization
- `client/src/context/LicenseContext.js` - WebSocket client
- `client/src/components/license/LicenseNotificationToast.jsx` - Toast notifications
- `client/src/App.js` - Application setup

## Requirements Validation

This implementation satisfies **Requirement 4.5**:
> WHEN a module license expires THEN the System SHALL immediately update the UI to reflect the locked state

The real-time WebSocket system ensures that:
- License expiration is immediately communicated to all connected clients
- UI updates happen without page refresh
- Users receive instant feedback on license status changes
- Usage limit warnings are delivered in real-time
