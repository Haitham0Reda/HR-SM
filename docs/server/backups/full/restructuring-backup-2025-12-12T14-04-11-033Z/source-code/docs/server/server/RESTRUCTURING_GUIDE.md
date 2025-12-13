# Server Restructuring Guide

## Overview

The server codebase has been restructured to follow a modular architecture with clear separation of concerns. This guide explains the new structure and how to navigate it.

## New Directory Structure

```
server/
├── core/                           # Shared infrastructure (no business logic)
│   ├── auth/                      # Authentication utilities
│   ├── config/                    # Configuration management
│   ├── errors/                    # Error handling
│   ├── logging/                   # Logging infrastructure
│   ├── middleware/                # Core middleware
│   ├── registry/                  # Module registry and loading
│   ├── services/                  # Core services
│   └── utils/                     # Shared utilities
│
├── platform/                       # Platform Layer (System Owner)
│   ├── auth/                      # Platform authentication
│   ├── tenants/                   # Tenant management
│   ├── subscriptions/             # Subscription management
│   ├── modules/                   # Module management
│   └── system/                    # System health and metrics
│
└── modules/                        # Feature Module Layer
    ├── hr-core/                   # REQUIRED - Core HR functionality
    │   ├── attendance/
    │   │   ├── controllers/
    │   │   ├── models/
    │   │   ├── routes/
    │   │   ├── services/
    │   │   └── utils/
    │   ├── auth/
    │   ├── backup/
    │   ├── holidays/
    │   ├── missions/
    │   ├── overtime/
    │   ├── requests/
    │   ├── users/
    │   └── vacations/
    │
    ├── email-service/             # OPTIONAL - Email functionality
    ├── tasks/                     # OPTIONAL - Task management
    ├── documents/                 # OPTIONAL - Document management
    ├── reports/                   # OPTIONAL - Reporting
    ├── payroll/                   # OPTIONAL - Payroll
    ├── notifications/             # OPTIONAL - Notifications
    ├── surveys/                   # OPTIONAL - Surveys
    ├── announcements/             # OPTIONAL - Announcements
    ├── events/                    # OPTIONAL - Events
    ├── analytics/                 # OPTIONAL - Analytics
    ├── dashboard/                 # OPTIONAL - Dashboard
    ├── theme/                     # OPTIONAL - Theming
    └── clinic/                    # OPTIONAL - Medical clinic
```

## Module Structure

Each module follows a consistent structure:

```
module-name/
├── controllers/          # Request handlers
├── models/              # Database models
├── routes/              # Route definitions
├── services/            # Business logic
├── utils/               # Module-specific utilities
├── middleware/          # Module-specific middleware (optional)
└── module.config.js     # Module metadata and configuration
```

## Migration Mapping

### Controllers
| Old Location | New Location |
|-------------|--------------|
| `server/controller/attendance.controller.js` | `server/modules/hr-core/attendance/controllers/attendance.controller.js` |
| `server/controller/vacation.controller.js` | `server/modules/hr-core/vacations/controllers/vacation.controller.js` |
| `server/controller/task.controller.js` | `server/modules/tasks/controllers/task.controller.js` |
| `server/controller/license.controller.js` | `server/platform/system/controllers/license.controller.js` |

### Models
| Old Location | New Location |
|-------------|--------------|
| `server/models/attendance.model.js` | `server/modules/hr-core/attendance/models/attendance.model.js` |
| `server/models/vacation.model.js` | `server/modules/hr-core/vacations/models/vacation.model.js` |
| `server/models/task.model.js` | `server/modules/tasks/models/task.model.js` |
| `server/models/license.model.js` | `server/platform/system/models/license.model.js` |

### Services
| Old Location | New Location |
|-------------|--------------|
| `server/services/attendanceDevice.service.js` | `server/modules/hr-core/attendance/services/attendanceDevice.service.js` |
| `server/services/mongooseBackup.service.js` | `server/modules/hr-core/backup/services/mongooseBackup.service.js` |
| `server/services/email.service.js` | `server/modules/email-service/services/email.service.js` |
| `server/services/licenseValidator.service.js` | `server/platform/system/services/licenseValidator.service.js` |
| `server/services/dependencyResolver.service.js` | `server/core/services/dependencyResolver.service.js` |

### Routes
| Old Location | New Location |
|-------------|--------------|
| `server/routes/attendance.routes.js` | `server/modules/hr-core/attendance/routes/attendance.routes.js` |
| `server/routes/vacation.routes.js` | `server/modules/hr-core/vacations/routes/vacation.routes.js` |
| `server/routes/task.routes.js` | `server/modules/tasks/routes/task.routes.js` |
| `server/routes/license.routes.js` | `server/platform/system/routes/license.routes.js` |

### Utilities
| Old Location | New Location |
|-------------|--------------|
| `server/utils/responseHelper.js` | `server/core/utils/response.js` |
| `server/utils/asyncHandler.js` | `server/core/utils/asyncHandler.js` |
| `server/utils/generateToken.js` | `server/core/auth/generateToken.js` |
| `server/utils/attendanceCron.js` | `server/modules/hr-core/attendance/utils/attendanceCron.js` |
| `server/utils/holidayChecker.js` | `server/modules/hr-core/holidays/utils/holidayChecker.js` |

### Middleware
| Old Location | New Location |
|-------------|--------------|
| `server/middleware/authMiddleware.js` | `server/core/middleware/auth.middleware.js` |
| `server/middleware/errorMiddleware.js` | `server/core/errors/errorHandler.js` |
| Module-specific middleware | `server/modules/[module]/middleware/` |

## Import Path Updates

### Before
```javascript
import AttendanceController from '../controller/attendance.controller.js';
import Attendance from '../models/attendance.model.js';
import attendanceService from '../services/attendanceDevice.service.js';
import authMiddleware from '../middleware/authMiddleware.js';
```

### After
```javascript
import AttendanceController from '../modules/hr-core/attendance/controllers/attendance.controller.js';
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import attendanceService from '../modules/hr-core/attendance/services/attendanceDevice.service.js';
import authMiddleware from '../core/middleware/auth.middleware.js';
```

## Key Principles

### 1. HR-Core Independence
- HR-Core CANNOT depend on optional modules
- HR-Core must work standalone
- Enforced by ESLint rules and CI checks

### 2. Module Isolation
- Each module is self-contained
- Dependencies declared in module.config.js
- No cross-module imports except declared dependencies

### 3. Platform Separation
- Platform layer manages all tenants
- Separate authentication (Platform JWT vs Tenant JWT)
- Platform APIs: `/api/platform/*`
- Tenant APIs: `/api/v1/*`

### 4. Core Infrastructure
- Core provides shared utilities and middleware
- No business logic in core
- Used by all modules and platform

## Benefits

1. **Clear Ownership**: Each feature has a clear home
2. **Independent Development**: Modules can be developed independently
3. **Easy Testing**: Test modules in isolation
4. **Scalability**: Add new modules without affecting existing ones
5. **Maintainability**: Find code easily with logical organization

## Legacy Directories

The following directories are deprecated but maintained for backward compatibility:
- `server/controller/` → See README for new locations
- `server/models/` → See README for new locations
- `server/services/` → See README for new locations
- `server/routes/` → See README for new locations
- `server/middleware/` → See README for new locations
- `server/config/` → See README for new locations

These will be removed in a future release once all references are updated.

## Next Steps

1. Update import paths in your code
2. Test thoroughly after migration
3. Remove references to legacy directories
4. Update documentation and comments

## Questions?

See the main README.md or contact the development team.
