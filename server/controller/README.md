# DEPRECATED - Legacy Controllers Directory

⚠️ **This directory is deprecated and maintained only for backward compatibility.**

## New Location

All controllers have been moved to their respective module directories:

### HR-Core Module Controllers
- **Attendance**: `server/modules/hr-core/attendance/controllers/`
- **Vacations**: `server/modules/hr-core/vacations/controllers/`
- **Missions**: `server/modules/hr-core/missions/controllers/`
- **Overtime**: `server/modules/hr-core/overtime/controllers/`
- **Holidays**: `server/modules/hr-core/holidays/controllers/`
- **Requests**: `server/modules/hr-core/requests/controllers/`
- **Users**: `server/modules/hr-core/users/controllers/`
- **Auth**: `server/modules/hr-core/auth/controllers/`
- **Backup**: `server/modules/hr-core/backup/controllers/`

### Optional Module Controllers
- **Tasks**: `server/modules/tasks/controllers/`
- **Documents**: `server/modules/documents/controllers/`
- **Reports**: `server/modules/reports/controllers/`
- **Payroll**: `server/modules/payroll/controllers/`
- **Notifications**: `server/modules/notifications/controllers/`
- **Surveys**: `server/modules/surveys/controllers/`
- **Announcements**: `server/modules/announcements/controllers/`
- **Events**: `server/modules/events/controllers/`
- **Analytics**: `server/modules/analytics/controllers/`
- **Dashboard**: `server/modules/dashboard/controllers/`
- **Theme**: `server/modules/theme/controllers/`

### Platform Controllers
- **System**: `server/platform/system/controllers/`
- **Subscriptions**: `server/platform/subscriptions/controllers/`

## Migration Guide

When updating imports, change from:
```javascript
import controller from '../controller/attendance.controller.js';
```

To:
```javascript
import controller from '../modules/hr-core/attendance/controllers/attendance.controller.js';
```

## Removal Timeline

This directory will be removed in a future release once all references have been updated.
