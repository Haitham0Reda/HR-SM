# DEPRECATED - Legacy Routes Directory

⚠️ **This directory is deprecated and maintained only for backward compatibility.**

## New Location

All routes have been moved to their respective module directories:

### HR-Core Module Routes
- **Attendance**: `server/modules/hr-core/attendance/routes/`
- **Vacations**: `server/modules/hr-core/vacations/routes/`
- **Missions**: `server/modules/hr-core/missions/routes/`
- **Overtime**: `server/modules/hr-core/overtime/routes/`
- **Holidays**: `server/modules/hr-core/holidays/routes/`
- **Requests**: `server/modules/hr-core/requests/routes/`
- **Users**: `server/modules/hr-core/users/routes/`
- **Auth**: `server/modules/hr-core/auth/routes/`
- **Backup**: `server/modules/hr-core/backup/routes/`

### Optional Module Routes
- **Tasks**: `server/modules/tasks/routes/`
- **Documents**: `server/modules/documents/routes/`
- **Reports**: `server/modules/reports/routes/`
- **Payroll**: `server/modules/payroll/routes/`
- **Notifications**: `server/modules/notifications/routes/`
- **Surveys**: `server/modules/surveys/routes/`
- **Announcements**: `server/modules/announcements/routes/`
- **Events**: `server/modules/events/routes/`
- **Analytics**: `server/modules/analytics/routes/`
- **Dashboard**: `server/modules/dashboard/routes/`
- **Theme**: `server/modules/theme/routes/`

### Platform Routes
- **System**: `server/platform/system/routes/`
- **Subscriptions**: `server/platform/subscriptions/routes/`

### Core Routes
- **Feature Flags**: `server/core/registry/`

## Migration Guide

When updating imports, change from:
```javascript
import routes from '../routes/attendance.routes.js';
```

To:
```javascript
import routes from '../modules/hr-core/attendance/routes/attendance.routes.js';
```

## Removal Timeline

This directory will be removed in a future release once all references have been updated.
