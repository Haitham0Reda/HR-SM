# Real-Time License Updates - Quick Start Guide

## Overview

This guide helps developers quickly understand and use the real-time license update system.

## For Backend Developers

### Emitting License Events

The WebSocket service is automatically integrated with the license validator. Events are emitted automatically when:

1. **License expires**:
```javascript
// Automatically emitted in licenseValidator.service.js
licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);
```

2. **License expiring soon** (within 30 days):
```javascript
licenseWebSocketService.notifyLicenseExpiring(
    tenantId,
    moduleKey,
    expiresAt,
    daysUntilExpiration
);
```

3. **Usage limit warning** (≥80%):
```javascript
licenseWebSocketService.notifyUsageLimitWarning(
    tenantId,
    moduleKey,
    limitType,
    currentUsage,
    limit,
    percentage
);
```

4. **Usage limit exceeded**:
```javascript
licenseWebSocketService.notifyUsageLimitExceeded(
    tenantId,
    moduleKey,
    limitType,
    currentUsage,
    limit
);
```

### Manual Event Emission

If you need to emit events manually (e.g., when activating/deactivating modules):

```javascript
import licenseWebSocketService from './services/licenseWebSocket.service.js';

// Module activated
licenseWebSocketService.notifyModuleActivated(tenantId, moduleKey);

// Module deactivated
licenseWebSocketService.notifyModuleDeactivated(tenantId, moduleKey);

// License updated
licenseWebSocketService.notifyLicenseUpdated(tenantId, {
    modules: ['attendance', 'payroll'],
    action: 'upgrade'
});
```

### Getting Connection Statistics

```javascript
const stats = licenseWebSocketService.getStats();
console.log(`Total connections: ${stats.totalConnections}`);
console.log(`Total tenants: ${stats.totalTenants}`);
```

## For Frontend Developers

### Using License Notifications

The `LicenseContext` automatically handles WebSocket connections. Just use the context:

```javascript
import { useLicense } from '../../context/LicenseContext';

function MyComponent() {
    const { notifications, removeNotification } = useLicense();

    // Notifications are automatically displayed by LicenseNotificationToast
    // But you can also access them directly:
    
    return (
        <div>
            {notifications.map(notification => (
                <div key={notification.id}>
                    {notification.message}
                    <button onClick={() => removeNotification(notification.id)}>
                        Dismiss
                    </button>
                </div>
            ))}
        </div>
    );
}
```

### Notification Object Structure

```javascript
{
    id: 'unique-id',
    type: 'license_expiring' | 'license_expired' | 'usage_limit_warning' | 'usage_limit_exceeded' | 'module_activated' | 'module_deactivated' | 'license_updated',
    severity: 'info' | 'warning' | 'critical',
    moduleKey: 'attendance',
    message: 'Human-readable message',
    timestamp: '2025-12-08T10:00:00.000Z',
    // Additional fields depending on type
}
```

### Checking WebSocket Connection Status

```javascript
import { useLicense } from '../../context/LicenseContext';

function ConnectionStatus() {
    const { loading, error } = useLicense();
    
    if (loading) return <div>Connecting...</div>;
    if (error) return <div>Connection error: {error}</div>;
    
    return <div>Connected</div>;
}
```

### Manually Refreshing License Data

```javascript
import { useLicense } from '../../context/LicenseContext';

function RefreshButton() {
    const { refreshLicenses } = useLicense();
    
    return (
        <button onClick={refreshLicenses}>
            Refresh License Data
        </button>
    );
}
```

## Testing

### Testing WebSocket Connection

```javascript
// In browser console
const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket(`ws://localhost:5000/ws/license?token=${token}`);

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
ws.onerror = (error) => console.error('Error:', error);
ws.onclose = () => console.log('Disconnected');

// Send ping
ws.send(JSON.stringify({ type: 'ping' }));
```

### Testing Event Emission

```javascript
// In your test file
import licenseWebSocketService from '../../services/licenseWebSocket.service.js';

test('should emit license expiration event', async () => {
    const tenantId = 'test-tenant';
    const moduleKey = 'attendance';
    
    // Emit event
    licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);
    
    // Verify event was sent (check logs or mock WebSocket)
});
```

## Common Patterns

### Pattern 1: Notify on License Change

```javascript
// In your license management controller
async function updateLicense(req, res) {
    const { tenantId } = req.params;
    const { modules } = req.body;
    
    // Update license in database
    await License.updateOne({ tenantId }, { modules });
    
    // Notify connected clients
    licenseWebSocketService.notifyLicenseUpdated(tenantId, {
        modules: modules.map(m => m.key),
        action: 'update'
    });
    
    res.json({ success: true });
}
```

### Pattern 2: Check Usage and Notify

```javascript
// In your usage tracking service
async function trackUsage(tenantId, moduleKey, limitType, amount) {
    const usage = await UsageTracking.increment(tenantId, moduleKey, limitType, amount);
    
    // Check if approaching limit
    if (usage.percentage >= 80 && usage.percentage < 100) {
        licenseWebSocketService.notifyUsageLimitWarning(
            tenantId,
            moduleKey,
            limitType,
            usage.current,
            usage.limit,
            usage.percentage
        );
    }
    
    // Check if exceeded
    if (usage.percentage >= 100) {
        licenseWebSocketService.notifyUsageLimitExceeded(
            tenantId,
            moduleKey,
            limitType,
            usage.current,
            usage.limit
        );
    }
}
```

### Pattern 3: Custom Notification Handler

```javascript
// In your component
import { useLicense } from '../../context/LicenseContext';
import { useEffect } from 'react';

function MyComponent() {
    const { notifications } = useLicense();
    
    useEffect(() => {
        // Handle specific notification types
        notifications.forEach(notification => {
            if (notification.type === 'license_expired') {
                // Redirect to upgrade page
                window.location.href = '/pricing';
            }
        });
    }, [notifications]);
    
    return <div>My Component</div>;
}
```

## Troubleshooting

### WebSocket Not Connecting

1. Check JWT token is valid:
```javascript
// In browser console
localStorage.getItem('token'); // Should return valid JWT
```

2. Check server is running:
```bash
curl http://localhost:5000/health
```

3. Check WebSocket endpoint:
```bash
# Should return 101 Switching Protocols
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:5000/ws/license
```

### Notifications Not Appearing

1. Check LicenseNotificationToast is rendered:
```javascript
// In App.js
<LicenseProvider>
    <LicenseNotificationToast />  {/* Must be here */}
    {/* Rest of app */}
</LicenseProvider>
```

2. Check notification queue:
```javascript
// In browser console (React DevTools)
// Find LicenseContext and check notifications array
```

3. Check WebSocket messages:
```javascript
// In browser console
// Network tab -> WS -> Messages
```

### Events Not Being Emitted

1. Check licenseWebSocketService is imported:
```javascript
import licenseWebSocketService from './services/licenseWebSocket.service.js';
```

2. Check WebSocket server is initialized:
```javascript
// In server/index.js
licenseWebSocketService.initialize(server);
```

3. Check event emission:
```javascript
// Add logging
console.log('Emitting event:', { tenantId, moduleKey });
licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);
```

## Best Practices

1. **Always emit events after database updates**:
```javascript
// ✅ Good
await License.update({ tenantId }, { status: 'expired' });
licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);

// ❌ Bad
licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey);
await License.update({ tenantId }, { status: 'expired' });
```

2. **Use appropriate severity levels**:
```javascript
// Critical: License expired, limit exceeded
// Warning: License expiring soon, approaching limit
// Info: Module activated, license updated
```

3. **Include relevant context in events**:
```javascript
// ✅ Good
licenseWebSocketService.notifyUsageLimitWarning(
    tenantId,
    moduleKey,
    limitType,
    currentUsage,
    limit,
    percentage
);

// ❌ Bad
licenseWebSocketService.notifyUsageLimitWarning(tenantId, moduleKey);
```

4. **Handle reconnection gracefully**:
```javascript
// The LicenseContext handles this automatically
// But if you need custom logic:
useEffect(() => {
    const handleReconnect = () => {
        // Refresh data after reconnection
        refreshLicenses();
    };
    
    // Listen for reconnection events
    // (Implementation depends on your needs)
}, []);
```

## API Reference

### Backend API

#### `licenseWebSocketService.initialize(server)`
Initialize WebSocket server on HTTP server.

#### `licenseWebSocketService.notifyLicenseExpiring(tenantId, moduleKey, expiresAt, daysUntilExpiration)`
Notify that license is expiring soon.

#### `licenseWebSocketService.notifyLicenseExpired(tenantId, moduleKey)`
Notify that license has expired.

#### `licenseWebSocketService.notifyUsageLimitWarning(tenantId, moduleKey, limitType, currentUsage, limit, percentage)`
Notify that usage is approaching limit.

#### `licenseWebSocketService.notifyUsageLimitExceeded(tenantId, moduleKey, limitType, currentUsage, limit)`
Notify that usage limit has been exceeded.

#### `licenseWebSocketService.notifyModuleActivated(tenantId, moduleKey)`
Notify that module has been activated.

#### `licenseWebSocketService.notifyModuleDeactivated(tenantId, moduleKey)`
Notify that module has been deactivated.

#### `licenseWebSocketService.notifyLicenseUpdated(tenantId, changes)`
Notify that license has been updated.

#### `licenseWebSocketService.getStats()`
Get connection statistics.

#### `licenseWebSocketService.shutdown()`
Shutdown WebSocket server.

### Frontend API

#### `useLicense()`
Hook to access license context.

**Returns**:
```javascript
{
    licenses,              // License data
    usage,                 // Usage data
    loading,               // Loading state
    error,                 // Error state
    notifications,         // Real-time notifications
    isModuleEnabled,       // Check if module is enabled
    getModuleLicense,      // Get module license
    getEnabledModules,     // Get all enabled modules
    isApproachingLimit,    // Check if approaching limit
    getModuleUsage,        // Get module usage
    hasUsageWarnings,      // Check if has warnings
    hasUsageViolations,    // Check if has violations
    isLicenseExpired,      // Check if license expired
    getDaysUntilExpiration,// Get days until expiration
    isExpiringSoon,        // Check if expiring soon
    refreshLicenses,       // Refresh license data
    removeNotification,    // Remove notification
    clearNotifications     // Clear all notifications
}
```

## Additional Resources

- [Full Technical Documentation](../server/services/REALTIME_LICENSE_UPDATES.md)
- [Implementation Summary](../REALTIME_LICENSE_IMPLEMENTATION_SUMMARY.md)
- [Test Suite](../server/testing/services/licenseWebSocket.service.test.js)
