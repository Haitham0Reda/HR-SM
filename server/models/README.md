# DEPRECATED - Legacy Models Directory

⚠️ **This directory is deprecated and maintained only for backward compatibility.**

## New Location

All models have been moved to their respective module directories:

### HR-Core Module Models
- **Attendance**: `server/modules/hr-core/attendance/models/`
- **Vacations**: `server/modules/hr-core/vacations/models/`
- **Missions**: `server/modules/hr-core/missions/models/`
- **Overtime**: `server/modules/hr-core/overtime/models/`
- **Holidays**: `server/modules/hr-core/holidays/models/`
- **Requests**: `server/modules/hr-core/requests/models/`
- **Users**: `server/modules/hr-core/users/models/`
- **Backup**: `server/modules/hr-core/backup/models/`

### Optional Module Models
- **Tasks**: `server/modules/tasks/models/`
- **Documents**: `server/modules/documents/models/`
- **Reports**: `server/modules/reports/models/`
- **Payroll**: `server/modules/payroll/models/`
- **Notifications**: `server/modules/notifications/models/`
- **Surveys**: `server/modules/surveys/models/`
- **Announcements**: `server/modules/announcements/models/`
- **Events**: `server/modules/events/models/`
- **Dashboard**: `server/modules/dashboard/models/`
- **Theme**: `server/modules/theme/models/`

### Platform Models
- **System**: `server/platform/system/models/`

## Migration Guide

When updating imports, change from:
```javascript
import Model from '../models/attendance.model.js';
```

To:
```javascript
import Model from '../modules/hr-core/attendance/models/attendance.model.js';
```

## Removal Timeline

This directory will be removed in a future release once all references have been updated.
