# HRMS - Complete Project Structure Diagram

## 📁 Full Project Directory Structure

```mermaid
graph TB
    subgraph "🏠 HR-SM Root Directory"
        ROOT[HR-SM/]
        
        subgraph "📁 Core Directories"
            SERVER[server/]
            CLIENT[client/]
            DOCS[docs/]
            CONFIG[config/]
            SCRIPTS[scripts/]
            LOGS[logs/]
            UPLOADS[uploads/]
            BACKUPS[backups/]
        end
        
        subgraph "📄 Root Files"
            README[README.md]
            PACKAGE[package.json]
            ENV[.env]
            GITIGNORE[.gitignore]
            LICENSE_FILE[LICENSE]
            JEST_CONFIG[jest.config.js]
            ESLINT_CONFIG[eslint.config.js]
        end
    end
    
    subgraph "⚙️ Server Architecture"
        SERVER --> SERVER_CORE[core/]
        SERVER --> SERVER_MODULES[modules/]
        SERVER --> SERVER_PLATFORM[platform/]
        SERVER --> SERVER_ROUTES[routes/]
        SERVER --> SERVER_MIDDLEWARE[middleware/]
        SERVER --> SERVER_SERVICES[services/]
        SERVER --> SERVER_UTILS[utils/]
        SERVER --> SERVER_CONFIG[config/]
        SERVER --> SERVER_TESTING[testing/]
        SERVER --> SERVER_SCRIPTS[scripts/]
        
        subgraph "🧩 Business Modules"
            SERVER_MODULES --> HR_CORE[hr-core/]
            SERVER_MODULES --> TASKS_MOD[tasks/]
            SERVER_MODULES --> PAYROLL_MOD[payroll/]
            SERVER_MODULES --> CLINIC_MOD[clinic/]
            SERVER_MODULES --> EMAIL_MOD[email-service/]
            SERVER_MODULES --> REPORTS_MOD[reports/]
            SERVER_MODULES --> DOCS_MOD[documents/]
            SERVER_MODULES --> SURVEYS_MOD[surveys/]
            SERVER_MODULES --> EVENTS_MOD[events/]
            SERVER_MODULES --> NOTIFICATIONS_MOD[notifications/]
            SERVER_MODULES --> ANNOUNCEMENTS_MOD[announcements/]
            SERVER_MODULES --> ANALYTICS_MOD[analytics/]
            SERVER_MODULES --> DASHBOARD_MOD[dashboard/]
            SERVER_MODULES --> THEME_MOD[theme/]
        end
        
        subgraph "🏢 Platform Management"
            SERVER_PLATFORM --> PLATFORM_AUTH[auth/]
            SERVER_PLATFORM --> PLATFORM_TENANTS[tenants/]
            SERVER_PLATFORM --> PLATFORM_COMPANIES[companies/]
            SERVER_PLATFORM --> PLATFORM_SUBSCRIPTIONS[subscriptions/]
            SERVER_PLATFORM --> PLATFORM_MODULES[modules/]
            SERVER_PLATFORM --> PLATFORM_SYSTEM[system/]
        end
    end
    
    subgraph "🎨 Client Architecture"
        CLIENT --> HR_APP[hr-app/]
        CLIENT --> PLATFORM_ADMIN[platform-admin/]
        CLIENT --> SHARED_CLIENT[shared/]
        CLIENT --> STORYBOOK[.storybook/]
        
        subgraph "📱 HR Application"
            HR_APP --> HR_SRC[src/]
            HR_APP --> HR_PUBLIC[public/]
            HR_SRC --> HR_COMPONENTS[components/]
            HR_SRC --> HR_PAGES[pages/]
            HR_SRC --> HR_SERVICES[services/]
            HR_SRC --> HR_CONTEXTS[contexts/]
            HR_SRC --> HR_HOOKS[hooks/]
            HR_SRC --> HR_UTILS[utils/]
        end
        
        subgraph "🔧 Platform Admin"
            PLATFORM_ADMIN --> ADMIN_SRC[src/]
            PLATFORM_ADMIN --> ADMIN_PUBLIC[public/]
            ADMIN_SRC --> ADMIN_PAGES[pages/]
            ADMIN_SRC --> ADMIN_COMPONENTS[components/]
            ADMIN_SRC --> ADMIN_SERVICES[services/]
        end
        
        subgraph "🔗 Shared Components"
            SHARED_CLIENT --> SHARED_UI[ui-kit/]
            SHARED_CLIENT --> SHARED_UTILS[utils/]
            SHARED_CLIENT --> SHARED_CONSTANTS[constants/]
        end
    end
    
    subgraph "📚 Documentation"
        DOCS --> DOCS_CLIENT[client/]
        DOCS --> DOCS_SERVER[server/]
        DOCS --> DOCS_PLATFORM[platform/]
        DOCS --> DOCS_ARCHITECTURE[ARCHITECTURE.md]
        DOCS --> DOCS_API[API_DOCUMENTATION.md]
        DOCS --> DOCS_DEPLOYMENT[DEPLOYMENT_GUIDE.md]
        DOCS --> DOCS_QUICK_START[QUICK_START.md]
        DOCS --> DOCS_SYSTEM_ARCH[SYSTEM_ARCHITECTURE_DIAGRAM.md]
    end
    
    ROOT --> SERVER
    ROOT --> CLIENT
    ROOT --> DOCS
    ROOT --> CONFIG
    ROOT --> SCRIPTS
    ROOT --> LOGS
    ROOT --> UPLOADS
    ROOT --> BACKUPS
    ROOT --> README
    ROOT --> PACKAGE
    ROOT --> ENV
    ROOT --> GITIGNORE
    ROOT --> LICENSE_FILE
    ROOT --> JEST_CONFIG
    ROOT --> ESLINT_CONFIG
    
    classDef rootClass fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef serverClass fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef clientClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef moduleClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef docsClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef configClass fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    
    class ROOT rootClass
    class SERVER,SERVER_CORE,SERVER_ROUTES,SERVER_MIDDLEWARE,SERVER_SERVICES,SERVER_UTILS,SERVER_CONFIG,SERVER_TESTING,SERVER_SCRIPTS serverClass
    class CLIENT,HR_APP,PLATFORM_ADMIN,SHARED_CLIENT,STORYBOOK,HR_SRC,HR_PUBLIC,HR_COMPONENTS,HR_PAGES,HR_SERVICES,HR_CONTEXTS,HR_HOOKS,HR_UTILS,ADMIN_SRC,ADMIN_PUBLIC,ADMIN_PAGES,ADMIN_COMPONENTS,ADMIN_SERVICES,SHARED_UI,SHARED_UTILS,SHARED_CONSTANTS clientClass
    class SERVER_MODULES,HR_CORE,TASKS_MOD,PAYROLL_MOD,CLINIC_MOD,EMAIL_MOD,REPORTS_MOD,DOCS_MOD,SURVEYS_MOD,EVENTS_MOD,NOTIFICATIONS_MOD,ANNOUNCEMENTS_MOD,ANALYTICS_MOD,DASHBOARD_MOD,THEME_MOD,SERVER_PLATFORM,PLATFORM_AUTH,PLATFORM_TENANTS,PLATFORM_COMPANIES,PLATFORM_SUBSCRIPTIONS,PLATFORM_MODULES,PLATFORM_SYSTEM moduleClass
    class DOCS,DOCS_CLIENT,DOCS_SERVER,DOCS_PLATFORM,DOCS_ARCHITECTURE,DOCS_API,DOCS_DEPLOYMENT,DOCS_QUICK_START,DOCS_SYSTEM_ARCH docsClass
    class CONFIG,SCRIPTS,LOGS,UPLOADS,BACKUPS,README,PACKAGE,ENV,GITIGNORE,LICENSE_FILE,JEST_CONFIG,ESLINT_CONFIG configClass
```

## 🔄 Module Internal Structure Pattern

```mermaid
graph TB
    subgraph "📦 Standard Module Structure"
        MODULE_ROOT[module-name/]
        
        subgraph "🎛️ Controllers Layer"
            CONTROLLERS[controllers/]
            CONTROLLER_FILES[*.controller.js]
        end
        
        subgraph "🔧 Services Layer"
            SERVICES[services/]
            SERVICE_FILES[*.service.js]
        end
        
        subgraph "📊 Models Layer"
            MODELS[models/]
            MODEL_FILES[*.model.js]
        end
        
        subgraph "🛣️ Routes Layer"
            ROUTES[routes/]
            ROUTE_FILES[*.routes.js]
        end
        
        subgraph "🔒 Middleware Layer"
            MIDDLEWARE[middleware/]
            MIDDLEWARE_FILES[*.middleware.js]
        end
        
        subgraph "🧪 Testing Layer"
            TESTS[__tests__/]
            TEST_FILES[*.test.js]
        end
        
        subgraph "📋 Configuration"
            CONFIG_MOD[config/]
            INDEX_FILE[index.js]
            PACKAGE_MOD[package.json]
        end
    end
    
    MODULE_ROOT --> CONTROLLERS
    MODULE_ROOT --> SERVICES
    MODULE_ROOT --> MODELS
    MODULE_ROOT --> ROUTES
    MODULE_ROOT --> MIDDLEWARE
    MODULE_ROOT --> TESTS
    MODULE_ROOT --> CONFIG_MOD
    MODULE_ROOT --> INDEX_FILE
    MODULE_ROOT --> PACKAGE_MOD
    
    CONTROLLERS --> CONTROLLER_FILES
    SERVICES --> SERVICE_FILES
    MODELS --> MODEL_FILES
    ROUTES --> ROUTE_FILES
    MIDDLEWARE --> MIDDLEWARE_FILES
    TESTS --> TEST_FILES
    
    classDef moduleClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef layerClass fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef fileClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    
    class MODULE_ROOT moduleClass
    class CONTROLLERS,SERVICES,MODELS,ROUTES,MIDDLEWARE,TESTS,CONFIG_MOD layerClass
    class CONTROLLER_FILES,SERVICE_FILES,MODEL_FILES,ROUTE_FILES,MIDDLEWARE_FILES,TEST_FILES,INDEX_FILE,PACKAGE_MOD fileClass
```

## 📁 File Count and Size Overview

| Directory | Files | Subdirectories | Primary Purpose |
|-----------|-------|----------------|-----------------|
| **server/** | 15 | 17 | Backend application and APIs |
| **server/modules/** | 0 | 14 | Business logic modules |
| **server/platform/** | 0 | 11 | Platform management |
| **server/scripts/** | 150+ | 3 | Utility and migration scripts |
| **client/** | 8 | 4 | Frontend applications |
| **client/hr-app/** | 4 | 3 | Main HR application |
| **client/platform-admin/** | 4 | 3 | Platform administration app |
| **client/shared/** | 2 | 3 | Shared UI components |
| **docs/** | 23 | 3 | Documentation and guides |
| **logs/** | 10+ | 2 | Application and audit logs |
| **uploads/** | 0 | 8+ | Tenant file storage |
| **backups/** | 0 | 7+ | Database and file backups |

## 🔗 Inter-Module Dependencies

```mermaid
graph TB
    subgraph "📦 Module Dependency Graph"
        HR_CORE_DEP[HR Core<br/>Always Required]
        
        subgraph "🔧 Core Dependencies"
            TASKS_DEP[Tasks Module]
            PAYROLL_DEP[Payroll Module]
            CLINIC_DEP[Clinic Module]
            REPORTS_DEP[Reports Module]
        end
        
        subgraph "📧 Communication Modules"
            EMAIL_DEP[Email Service]
            NOTIFICATIONS_DEP[Notifications]
            ANNOUNCEMENTS_DEP[Announcements]
        end
        
        subgraph "📊 Analytics & UI"
            ANALYTICS_DEP[Analytics Module]
            DASHBOARD_DEP[Dashboard Module]
            THEME_DEP[Theme Module]
        end
        
        subgraph "📄 Content Modules"
            DOCS_DEP[Documents Module]
            SURVEYS_DEP[Surveys Module]
            EVENTS_DEP[Events Module]
        end
    end
    
    HR_CORE_DEP --> TASKS_DEP
    HR_CORE_DEP --> PAYROLL_DEP
    HR_CORE_DEP --> CLINIC_DEP
    HR_CORE_DEP --> REPORTS_DEP
    HR_CORE_DEP --> DOCS_DEP
    HR_CORE_DEP --> SURVEYS_DEP
    HR_CORE_DEP --> EVENTS_DEP
    
    EMAIL_DEP --> TASKS_DEP
    EMAIL_DEP --> PAYROLL_DEP
    EMAIL_DEP --> SURVEYS_DEP
    EMAIL_DEP --> EVENTS_DEP
    EMAIL_DEP --> ANNOUNCEMENTS_DEP
    
    NOTIFICATIONS_DEP --> TASKS_DEP
    NOTIFICATIONS_DEP --> EVENTS_DEP
    NOTIFICATIONS_DEP --> ANNOUNCEMENTS_DEP
    
    ANALYTICS_DEP --> TASKS_DEP
    ANALYTICS_DEP --> PAYROLL_DEP
    ANALYTICS_DEP --> CLINIC_DEP
    ANALYTICS_DEP --> SURVEYS_DEP
    
    DASHBOARD_DEP --> ANALYTICS_DEP
    DASHBOARD_DEP --> HR_CORE_DEP
    
    classDef coreClass fill:#e8f5e8,stroke:#388e3c,stroke-width:3px
    classDef businessClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef commClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef analyticsClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef contentClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class HR_CORE_DEP coreClass
    class TASKS_DEP,PAYROLL_DEP,CLINIC_DEP,REPORTS_DEP businessClass
    class EMAIL_DEP,NOTIFICATIONS_DEP,ANNOUNCEMENTS_DEP commClass
    class ANALYTICS_DEP,DASHBOARD_DEP,THEME_DEP analyticsClass
    class DOCS_DEP,SURVEYS_DEP,EVENTS_DEP contentClass
```