# DEPRECATED - Legacy Services Directory

⚠️ **This directory is deprecated and maintained only for backward compatibility.**

## New Location

All services have been moved to their respective module or core directories:

### HR-Core Module Services
- **Attendance**: `server/modules/hr-core/attendance/services/`
- **Backup**: `server/modules/hr-core/backup/services/`

### Email Service Module
- **Email**: `server/modules/email-service/services/`

### Platform Services
- **License**: `server/platform/system/services/`
- **Subscription**: `server/platform/subscriptions/services/`
- **Metrics**: `server/platform/system/services/`
- **Usage Tracking**: `server/platform/system/services/`
- **Audit Logger**: `server/platform/system/services/`
- **Alert Manager**: `server/platform/system/services/`

### Core Services
- **Dependency Resolver**: `server/core/services/`
- **Feature Flags**: `server/core/services/`
- **Redis**: `server/core/services/`

## Migration Guide

When updating imports, change from:
```javascript
import service from '../services/attendanceDevice.service.js';
```

To:
```javascript
import service from '../modules/hr-core/attendance/services/attendanceDevice.service.js';
```

## Removal Timeline

This directory will be removed in a future release once all references have been updated.
