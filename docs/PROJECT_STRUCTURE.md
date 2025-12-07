# Project Structure - Aligned with Architecture

This document shows the complete project structure aligned with the ARCHITECTURE.md specifications.

## 📁 Complete Directory Structure

```
HR-SM/
│
├── 📁 server/                          # Backend Server
│   │
│   ├── 📁 config/                      # Configuration Files
│   │   ├── database.js                 # ✅ MongoDB connection
│   │   ├── db.js                       # Legacy DB config
│   │   ├── moduleRegistry.js           # ✅ Module registry
│   │   ├── moduleRegistry.integrated.js # ✅ Integrated registry
│   │   ├── multer.config.js            # File upload config
│   │   └── license.json                # License file (on-premise)
│   │
│   ├── 📁 shared/                      # ✅ Shared Utilities (NEW)
│   │   ├── 📁 constants/
│   │   │   └── modules.js              # ✅ Module definitions
│   │   ├── 📁 middleware/
│   │   │   ├── auth.js                 # ✅ Authentication
│   │   │   ├── moduleGuard.js          # ✅ Module access control
│   │   │   └── tenantContext.js        # ✅ Tenant isolation
│   │   ├── 📁 models/
│   │   │   └── BaseModel.js            # ✅ Base schema plugin
│   │   └── 📁 utils/
│   │       └── fileUtils.js            # ✅ File operations
│   │
│   ├── 📁 modules/                     # ✅ Modular Structure (NEW)
│   │   │
│   │   ├── 📁 hr-core/                 # ✅ Core HR Module (Always Enabled)
│   │   │   ├── 📁 models/
│   │   │   │   ├── User.js             # ✅ User model with multi-tenancy
│   │   │   │   ├── TenantConfig.js     # ✅ Tenant configuration
│   │   │   │   ├── Department.js       # ✅ Department model
│   │   │   │   ├── Position.js         # ✅ Position model
│   │   │   │   └── AuditLog.js         # ✅ Audit logging
│   │   │   ├── 📁 controllers/
│   │   │   │   ├── authController.js   # ✅ Authentication
│   │   │   │   └── userController.js   # ✅ User management
│   │   │   └── 📁 routes/
│   │   │       ├── authRoutes.js       # ✅ Auth endpoints
│   │   │       ├── userRoutes.js       # ✅ User endpoints
│   │   │       └── tenantRoutes.js     # ✅ Tenant management
│   │   │
│   │   ├── 📁 tasks/                   # ✅ Task & Work Reporting Module
│   │   │   ├── 📁 models/
│   │   │   │   ├── Task.js             # ✅ Task model
│   │   │   │   └── TaskReport.js       # ✅ Task report model
│   │   │   ├── 📁 controllers/
│   │   │   │   ├── taskController.js   # ✅ Task management
│   │   │   │   └── taskReportController.js # ✅ Report management
│   │   │   ├── 📁 routes/
│   │   │   │   ├── taskRoutes.js       # ✅ Task endpoints
│   │   │   │   └── taskReportRoutes.js # ✅ Report endpoints
│   │   │   ├── 📁 services/
│   │   │   │   └── notificationService.js # ✅ Notifications
│   │   │   └── 📁 __tests__/
│   │   │       └── task.test.js        # ✅ Test suite
│   │   │
│   │   ├── 📁 attendance/              # 🔄 Ready for migration
│   │   │   └── (To be created from existing routes)
│   │   │
│   │   ├── 📁 leave/                   # 🔄 Ready for migration
│   │   │   └── (To be created from existing routes)
│   │   │
│   │   ├── 📁 payroll/                 # 🔄 Ready for migration
│   │   │   └── (To be created from existing routes)
│   │   │
│   │   ├── 📁 documents/               # 🔄 Ready for migration
│   │   │   └── (To be created from existing routes)
│   │   │
│   │   ├── 📁 communication/           # 🔄 Ready for migration
│   │   │   └── (To be created from existing routes)
│   │   │
│   │   └── 📁 reporting/               # 🔄 Ready for migration
│   │       └── (To be created from existing routes)
│   │
│   ├── 📁 controller/                  # Legacy Controllers (Existing)
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── attendance.controller.js
│   │   ├── department.controller.js
│   │   └── ... (all existing controllers)
│   │
│   ├── 📁 models/                      # Legacy Models (Existing)
│   │   ├── user.model.js
│   │   ├── attendance.model.js
│   │   ├── department.model.js
│   │   └── ... (all existing models)
│   │
│   ├── 📁 routes/                      # Legacy Routes (Existing)
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── attendance.routes.js
│   │   └── ... (all existing routes)
│   │
│   ├── 📁 middleware/                  # Legacy Middleware (Existing)
│   │   ├── authMiddleware.js
│   │   ├── validation.middleware.js
│   │   └── ... (all existing middleware)
│   │
│   ├── 📁 services/                    # Services
│   │   ├── email.service.js
│   │   ├── featureFlag.service.js
│   │   └── ... (all existing services)
│   │
│   ├── 📁 utils/                       # Utilities
│   │   ├── logger.js
│   │   ├── constants.js
│   │   └── ... (all existing utils)
│   │
│   ├── 📁 scripts/                     # Scripts
│   │   ├── 📁 migrations/
│   │   │   ├── addTenantId.js          # ✅ Add tenantId migration
│   │   │   └── ... (existing migrations)
│   │   ├── 📁 setup/
│   │   │   └── createInitialTenant.js  # ✅ Tenant setup
│   │   └── ... (all existing scripts)
│   │
│   ├── 📁 testing/                     # Tests
│   │   ├── 📁 controllers/
│   │   ├── 📁 models/
│   │   └── 📁 routes/
│   │
│   ├── 📁 uploads/                     # File Uploads
│   │   ├── 📁 task-reports/            # ✅ Task report files
│   │   ├── 📁 documents/               # ✅ Document files
│   │   ├── 📁 profile-pictures/        # ✅ Profile pictures
│   │   └── ... (existing upload folders)
│   │
│   ├── app.js                          # ✅ Modular Express app
│   ├── app.integrated.js               # ✅ Integrated app (old + new)
│   ├── index.js                        # ✅ Server entry point
│   └── seed.js                         # Database seeding
│
├── 📁 client/                          # Frontend Client
│   └── 📁 src/
│       │
│       ├── 📁 config/                  # Configuration
│       │   └── modules.js              # ✅ Module configuration
│       │
│       ├── 📁 contexts/                # ✅ React Contexts (NEW)
│       │   ├── AuthContext.jsx         # ✅ Authentication state
│       │   └── ModuleContext.jsx       # ✅ Module state
│       │
│       ├── 📁 components/              # Shared Components
│       │   ├── ProtectedRoute.jsx      # ✅ Route protection
│       │   └── ... (existing components)
│       │
│       ├── 📁 modules/                 # ✅ Module Components (NEW)
│       │   │
│       │   ├── 📁 hr-core/             # 🔄 To be created
│       │   │   ├── 📁 pages/
│       │   │   └── 📁 components/
│       │   │
│       │   ├── 📁 tasks/               # ✅ Task Module
│       │   │   ├── 📁 pages/
│       │   │   │   ├── TaskList.jsx    # ✅ Task list page
│       │   │   │   └── TaskDetail.jsx  # ✅ Task detail page
│       │   │   └── 📁 components/
│       │   │       ├── TaskReportForm.jsx # ✅ Report form
│       │   │       └── TaskReportList.jsx # ✅ Report list
│       │   │
│       │   └── 📁 attendance/          # 🔄 To be created
│       │       └── ... (existing attendance components)
│       │
│       ├── 📁 layouts/                 # Layout Components
│       │   └── ... (existing layouts)
│       │
│       ├── 📁 pages/                   # Page Components
│       │   └── ... (existing pages)
│       │
│       ├── 📁 hooks/                   # Custom Hooks
│       │   └── ... (existing hooks)
│       │
│       ├── 📁 utils/                   # Utilities
│       │   └── ... (existing utils)
│       │
│       ├── App.js                      # Main App Component
│       └── index.js                    # Entry Point
│
├── 📁 uploads/                         # Upload Directory
│   ├── 📁 task-reports/                # ✅ Task report files
│   ├── 📁 documents/                   # Document files
│   ├── 📁 profile-pictures/            # Profile pictures
│   └── 📁 medical-documents/           # Medical documents
│
├── 📁 docs/                            # Documentation
│   ├── ATTENDANCE_*.md
│   ├── TASK_MODULE.md
│   └── ... (all existing docs)
│
├── 📁 logs/                            # Application Logs
│   └── ... (log files)
│
├── 📄 shared-constants.js              # ✅ Shared Constants (UPDATED)
│
├── 📄 Configuration Files
│   ├── .env                            # Environment variables
│   ├── .env.example                    # ✅ Environment template
│   ├── .gitignore                      # Git ignore rules
│   ├── package.json                    # Dependencies
│   ├── babel.config.js                 # Babel configuration
│   └── jest.config.js                  # Jest configuration
│
├── 📄 Integration Scripts              # ✅ NEW
│   ├── integrate-modular-system.sh     # Linux/Mac integration
│   └── integrate-modular-system.bat    # Windows integration
│
└── 📄 Documentation Files              # ✅ NEW
    ├── START_HERE.md                   # ✅ Quick start guide
    ├── ARCHITECTURE.md                 # ✅ Architecture documentation
    ├── API_DOCUMENTATION.md            # ✅ API reference
    ├── DEPLOYMENT_GUIDE.md             # ✅ Deployment guide
    ├── MIGRATION_GUIDE.md              # ✅ Migration guide
    ├── INTEGRATION_SUMMARY.md          # ✅ Integration summary
    ├── IMPLEMENTATION_CHECKLIST.md     # ✅ Implementation checklist
    ├── PROJECT_SUMMARY.md              # ✅ Project summary
    ├── PROJECT_STRUCTURE.md            # ✅ This file
    ├── QUICK_START.md                  # ✅ Quick start
    ├── README_MODULAR_HRMS.md          # ✅ Main README
    └── README.md                       # Original README
```

## 🎯 Architecture Alignment

### ✅ Implemented According to Architecture

1. **Modular Monolith Pattern**

   - ✅ Self-contained modules in `/server/modules/`
   - ✅ Shared utilities in `/server/shared/`
   - ✅ Module registry for dynamic loading
   - ✅ Feature flags in database

2. **Multi-Tenancy Strategy**

   - ✅ `tenantId` field in all models via BaseModel plugin
   - ✅ Tenant isolation middleware
   - ✅ Automatic `tenantId` injection
   - ✅ TenantConfig model for configuration

3. **Feature Flag System**

   - ✅ Module enable/disable in TenantConfig
   - ✅ Module guard middleware
   - ✅ Frontend module context
   - ✅ Dynamic route loading

4. **RBAC Implementation**

   - ✅ 4 roles: Admin, HR, Manager, Employee
   - ✅ Role hierarchy in shared constants
   - ✅ `requireAuth` and `requireRole` middleware
   - ✅ Frontend route guards

5. **API Structure**

   - ✅ `/api/v1/:module/:resource` pattern
   - ✅ Versioned API endpoints
   - ✅ Module-based routing

6. **Security Layers**
   - ✅ JWT authentication
   - ✅ Role-based authorization
   - ✅ Module access validation
   - ✅ Tenant isolation
   - ✅ File upload validation
   - ✅ Rate limiting
   - ✅ Input sanitization

## 📊 Module Status

| Module            | Status      | Location                                | Notes               |
| ----------------- | ----------- | --------------------------------------- | ------------------- |
| **HR Core**       | ✅ Complete | `/server/modules/hr-core/`              | Always enabled      |
| **Tasks**         | ✅ Complete | `/server/modules/tasks/`                | Fully implemented   |
| **Attendance**    | 🔄 Legacy   | `/server/routes/attendance.routes.js`   | Ready for migration |
| **Leave**         | 🔄 Legacy   | `/server/routes/mission.routes.js`      | Ready for migration |
| **Payroll**       | 🔄 Legacy   | `/server/routes/payroll.routes.js`      | Ready for migration |
| **Documents**     | 🔄 Legacy   | `/server/routes/document.routes.js`     | Ready for migration |
| **Communication** | 🔄 Legacy   | `/server/routes/announcement.routes.js` | Ready for migration |
| **Reporting**     | 🔄 Legacy   | `/server/routes/report.routes.js`       | Ready for migration |

## 🔄 Migration Path

### Phase 1: Core Setup (✅ Complete)

- [x] Create modular structure
- [x] Implement multi-tenancy
- [x] Set up module system
- [x] Create HR Core module
- [x] Create Tasks module

### Phase 2: Integration (Current)

- [x] Side-by-side integration
- [x] Database migration scripts
- [x] Tenant configuration setup
- [ ] Run integration script
- [ ] Test both systems

### Phase 3: Module Migration (Future)

- [ ] Migrate Attendance module
- [ ] Migrate Leave module
- [ ] Migrate Payroll module
- [ ] Migrate Documents module
- [ ] Migrate Communication module
- [ ] Migrate Reporting module

### Phase 4: Cleanup (Future)

- [ ] Remove legacy routes
- [ ] Update all references
- [ ] Final testing
- [ ] Documentation update

## 🚀 Quick Commands

### Start Server

```bash
npm start
```

### Run Integration

```bash
# Windows
integrate-modular-system.bat

# Linux/Mac
./integrate-modular-system.sh
```

### Run Migrations

```bash
node server/scripts/migrations/addTenantId.js
node server/scripts/setup/createInitialTenant.js
```

### Run Tests

```bash
npm test
```

## 📝 Key Files

### Configuration

- `server/config/database.js` - Database connection
- `server/config/moduleRegistry.js` - Module registry
- `shared-constants.js` - Shared constants

### Core Models

- `server/shared/models/BaseModel.js` - Base schema
- `server/modules/hr-core/models/TenantConfig.js` - Tenant config
- `server/modules/hr-core/models/User.js` - User model

### Middleware

- `server/shared/middleware/auth.js` - Authentication
- `server/shared/middleware/moduleGuard.js` - Module access
- `server/shared/middleware/tenantContext.js` - Tenant isolation

### Entry Points

- `server/index.js` - Server entry
- `server/app.js` - Express app
- `client/src/App.js` - React app

## 🎯 Next Steps

1. **Read**: `START_HERE.md`
2. **Run**: Integration script
3. **Test**: Both old and new systems
4. **Migrate**: One module at a time
5. **Deploy**: Follow deployment guide

---

**This structure is fully aligned with ARCHITECTURE.md and ready for use!**
