# HRMS - Complete System Architecture Diagram

## 🏗️ Enterprise Multi-Tenant SaaS Architecture

```mermaid
graph TB
    %% External Users
    subgraph "👥 Users"
        U1[Platform Admin]
        U2[HR Manager]
        U3[Employee]
        U4[Manager]
    end

    %% Load Balancer & CDN
    subgraph "🌐 Infrastructure Layer"
        LB[Load Balancer<br/>nginx/HAProxy]
        CDN[CDN<br/>Static Assets]
        SSL[SSL/TLS<br/>Certificate]
    end

    %% Frontend Applications
    subgraph "🎨 Frontend Layer - Multi-App Architecture"
        subgraph "Platform Admin App (Port 3001)"
            PA[Platform Admin<br/>React 18+<br/>Material-UI]
            PA_ROUTES["/platform-admin/*"]
        end
        
        subgraph "HR Application (Port 3000)"
            HR[HR App<br/>React 18+<br/>Material-UI]
            HR_ROUTES["/hr-app/*"]
        end
        
        subgraph "Shared Components"
            SHARED[Shared UI Kit<br/>Components & Utils<br/>Constants]
        end
        
        subgraph "Development Tools"
            SB[Storybook<br/>Component Library<br/>Documentation]
        end
    end

    %% API Gateway / Reverse Proxy
    subgraph "🚪 API Gateway Layer"
        GATEWAY[API Gateway<br/>Route Distribution<br/>Rate Limiting]
    end

    %% Backend Applications
    subgraph "⚙️ Backend Layer - Dual Namespace Architecture"
        subgraph "Platform API (/platform/*)"
            PLATFORM_APP[Platform App<br/>Express.js<br/>Port 5000]
            PLATFORM_ROUTES[Platform Routes<br/>Tenant Management<br/>System Admin]
        end
        
        subgraph "Tenant API (/api/v1/*)"
            TENANT_APP[Tenant App<br/>Express.js<br/>Port 5000]
            TENANT_ROUTES[Tenant Routes<br/>HR Modules<br/>Business Logic]
        end
    end

    %% Core Infrastructure
    subgraph "🔧 Core Infrastructure Layer"
        subgraph "Authentication & Security"
            AUTH[JWT Authentication<br/>Dual Token System<br/>RBAC]
            SECURITY[Security Middleware<br/>Helmet, CORS<br/>Rate Limiting]
        end
        
        subgraph "Middleware Stack"
            TENANT_MW[Tenant Context<br/>Middleware]
            MODULE_MW[Module Access<br/>Middleware]
            AUDIT_MW[Audit Logging<br/>Middleware]
        end
        
        subgraph "Core Services"
            REGISTRY[Module Registry<br/>Dynamic Loading]
            RESOLVER[Dependency Resolver<br/>Service Discovery]
            LOGGER[Winston Logger<br/>Structured Logging]
        end
    end

    %% Business Modules
    subgraph "🧩 Modular Business Layer - 14+ Modules"
        subgraph "Core HR Module (Always Enabled)"
            HR_CORE[HR Core Module<br/>Users, Auth, Attendance<br/>Vacations, Holidays]
        end
        
        subgraph "Optional Business Modules"
            TASKS[Tasks Module<br/>Work Reporting<br/>Task Management]
            PAYROLL[Payroll Module<br/>Salary Processing<br/>Tax Management]
            CLINIC[Clinic Module<br/>Medical Services<br/>Health Records]
            REPORTS[Reports Module<br/>Custom Reports<br/>Analytics]
            DOCS[Documents Module<br/>File Management<br/>Templates]
            EMAIL[Email Service<br/>Multi-Provider<br/>Templates]
            SURVEYS[Surveys Module<br/>Employee Feedback<br/>Analytics]
            EVENTS[Events Module<br/>Calendar Integration<br/>Scheduling]
            NOTIFICATIONS[Notifications<br/>Real-time Updates<br/>WebSocket]
            ANNOUNCEMENTS[Announcements<br/>Company News<br/>Targeted Messages]
            ANALYTICS[Analytics Module<br/>Performance Metrics<br/>Dashboards]
            DASHBOARD[Dashboard Module<br/>Customizable Widgets<br/>KPIs]
            THEME[Theme Module<br/>UI Customization<br/>Branding]
        end
    end

    %% Platform Management
    subgraph "🏢 Platform Management Layer"
        subgraph "Tenant Management"
            TENANT_MGR[Tenant Manager<br/>Provisioning<br/>Configuration]
            SUBSCRIPTION[Subscription Manager<br/>Plans & Billing<br/>Module Control]
        end
        
        subgraph "System Management"
            SYSTEM_MGR[System Manager<br/>Health Monitoring<br/>Metrics Collection]
            MODULE_MGR[Module Manager<br/>Enable/Disable<br/>Configuration]
        end
    end

    %% Data Layer
    subgraph "💾 Data Layer"
        subgraph "Primary Database"
            MONGO[MongoDB 6.0+<br/>Multi-Tenant Collections<br/>Automatic Scoping]
            INDEXES[Database Indexes<br/>Performance Optimization<br/>Query Optimization]
        end
        
        subgraph "Caching Layer"
            REDIS[Redis Cache<br/>Feature Flags<br/>Session Storage<br/>Rate Limiting]
        end
        
        subgraph "File Storage"
            FILES[File System<br/>Tenant-Scoped Storage<br/>Document Management]
            UPLOADS[Upload Handler<br/>Multer Integration<br/>File Validation]
        end
    end

    %% External Services
    subgraph "🔌 External Services"
        subgraph "Email Services"
            SES[AWS SES<br/>Transactional Email]
            SMTP[SMTP Server<br/>Email Delivery]
            SENDGRID[SendGrid<br/>Email Service]
        end
        
        subgraph "Monitoring & Analytics"
            PROMETHEUS[Prometheus<br/>Metrics Collection]
            GRAFANA[Grafana<br/>Visualization]
            ALERTS[Alert Manager<br/>Notifications]
        end
        
        subgraph "External APIs"
            GOOGLE_API[Google APIs<br/>Calendar, Drive]
            ATTENDANCE_DEVICE[Attendance Devices<br/>Biometric Integration]
        end
    end

    %% Backup & Recovery
    subgraph "💾 Backup & Recovery"
        BACKUP[Automated Backups<br/>Daily Snapshots<br/>Multi-Tenant Support]
        RECOVERY[Disaster Recovery<br/>Point-in-Time Restore<br/>Data Integrity]
    end

    %% Deployment & DevOps
    subgraph "🚀 Deployment Layer"
        subgraph "Process Management"
            PM2[PM2 Process Manager<br/>Auto-Restart<br/>Clustering]
        end
        
        subgraph "Environment Management"
            ENV_PROD[Production Environment<br/>Optimized Builds<br/>Security Hardened]
            ENV_DEV[Development Environment<br/>Hot Reload<br/>Debug Mode]
        end
        
        subgraph "Container Support (Optional)"
            DOCKER[Docker Containers<br/>Containerized Deployment<br/>Orchestration Ready]
        end
    end

    %% Connections - User Flow
    U1 --> LB
    U2 --> LB
    U3 --> LB
    U4 --> LB
    
    LB --> SSL
    SSL --> CDN
    CDN --> GATEWAY
    
    %% Frontend Routing
    GATEWAY --> PA
    GATEWAY --> HR
    
    PA --> SHARED
    HR --> SHARED
    
    %% API Routing
    PA --> PLATFORM_APP
    HR --> TENANT_APP
    
    %% Backend Architecture
    PLATFORM_APP --> PLATFORM_ROUTES
    TENANT_APP --> TENANT_ROUTES
    
    PLATFORM_ROUTES --> AUTH
    TENANT_ROUTES --> AUTH
    
    AUTH --> SECURITY
    SECURITY --> TENANT_MW
    TENANT_MW --> MODULE_MW
    MODULE_MW --> AUDIT_MW
    
    %% Core Services
    AUDIT_MW --> REGISTRY
    REGISTRY --> RESOLVER
    RESOLVER --> LOGGER
    
    %% Module Access
    TENANT_ROUTES --> HR_CORE
    TENANT_ROUTES --> TASKS
    TENANT_ROUTES --> PAYROLL
    TENANT_ROUTES --> CLINIC
    TENANT_ROUTES --> REPORTS
    TENANT_ROUTES --> DOCS
    TENANT_ROUTES --> EMAIL
    TENANT_ROUTES --> SURVEYS
    TENANT_ROUTES --> EVENTS
    TENANT_ROUTES --> NOTIFICATIONS
    TENANT_ROUTES --> ANNOUNCEMENTS
    TENANT_ROUTES --> ANALYTICS
    TENANT_ROUTES --> DASHBOARD
    TENANT_ROUTES --> THEME
    
    %% Platform Management
    PLATFORM_ROUTES --> TENANT_MGR
    PLATFORM_ROUTES --> SUBSCRIPTION
    PLATFORM_ROUTES --> SYSTEM_MGR
    PLATFORM_ROUTES --> MODULE_MGR
    
    %% Data Connections
    HR_CORE --> MONGO
    TASKS --> MONGO
    PAYROLL --> MONGO
    CLINIC --> MONGO
    REPORTS --> MONGO
    DOCS --> FILES
    EMAIL --> SES
    EMAIL --> SMTP
    EMAIL --> SENDGRID
    
    %% Caching
    AUTH --> REDIS
    MODULE_MW --> REDIS
    TENANT_MW --> REDIS
    
    %% File Handling
    DOCS --> UPLOADS
    HR_CORE --> UPLOADS
    TASKS --> UPLOADS
    
    %% Monitoring
    LOGGER --> PROMETHEUS
    PROMETHEUS --> GRAFANA
    GRAFANA --> ALERTS
    
    %% Backup
    MONGO --> BACKUP
    FILES --> BACKUP
    BACKUP --> RECOVERY
    
    %% External Integrations
    HR_CORE --> GOOGLE_API
    HR_CORE --> ATTENDANCE_DEVICE
    
    %% Deployment
    TENANT_APP --> PM2
    PLATFORM_APP --> PM2
    PM2 --> ENV_PROD
    PM2 --> ENV_DEV
    
    %% Styling
    classDef userClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontendClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef backendClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef moduleClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dataClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef externalClass fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef infraClass fill:#e0f2f1,stroke:#004d40,stroke-width:2px
    
    class U1,U2,U3,U4 userClass
    class PA,HR,SHARED,SB frontendClass
    class PLATFORM_APP,TENANT_APP,AUTH,SECURITY backendClass
    class HR_CORE,TASKS,PAYROLL,CLINIC,REPORTS,DOCS,EMAIL,SURVEYS,EVENTS,NOTIFICATIONS,ANNOUNCEMENTS,ANALYTICS,DASHBOARD,THEME moduleClass
    class MONGO,REDIS,FILES,BACKUP dataClass
    class SES,SMTP,SENDGRID,PROMETHEUS,GRAFANA,GOOGLE_API,ATTENDANCE_DEVICE externalClass
    class LB,CDN,SSL,GATEWAY,PM2,DOCKER infraClass
```

## 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant LB as 🌐 Load Balancer
    participant Frontend as 🎨 Frontend App
    participant Gateway as 🚪 API Gateway
    participant Auth as 🔐 Auth Service
    participant TenantMW as 🏢 Tenant Middleware
    participant Module as 🧩 Business Module
    participant DB as 💾 Database
    participant Cache as ⚡ Redis Cache
    participant Logger as 📝 Audit Logger

    User->>LB: HTTP Request
    LB->>Frontend: Route to App
    Frontend->>Gateway: API Call with JWT
    Gateway->>Auth: Validate Token
    Auth->>Cache: Check Token Cache
    Cache-->>Auth: Token Status
    Auth->>TenantMW: Authenticated Request
    TenantMW->>Cache: Get Tenant Context
    Cache-->>TenantMW: Tenant Info
    TenantMW->>Module: Scoped Request
    Module->>DB: Query with Tenant Filter
    DB-->>Module: Filtered Results
    Module->>Logger: Log Activity
    Logger->>DB: Store Audit Log
    Module-->>TenantMW: Response Data
    TenantMW-->>Gateway: Formatted Response
    Gateway-->>Frontend: JSON Response
    Frontend-->>User: UI Update
```

## 🏗️ Module Architecture Pattern

```mermaid
graph TB
    subgraph "📦 Module Structure Pattern"
        subgraph "Module Boundary"
            CONTROLLER[Controllers<br/>HTTP Handlers<br/>Request Validation]
            SERVICE[Services<br/>Business Logic<br/>Data Processing]
            MODEL[Models<br/>Data Schema<br/>Validation Rules]
            ROUTES[Routes<br/>Endpoint Definition<br/>Middleware Chain]
            MIDDLEWARE[Module Middleware<br/>Access Control<br/>Data Transformation]
        end
        
        subgraph "Shared Infrastructure"
            SHARED_DB[Shared Database<br/>Connection Pool<br/>Transaction Support]
            SHARED_CACHE[Shared Cache<br/>Feature Flags<br/>Session Data]
            SHARED_LOGGER[Shared Logger<br/>Structured Logging<br/>Correlation IDs]
        end
        
        subgraph "Module Registry"
            REGISTRY_CORE[Module Registry<br/>Dynamic Loading<br/>Dependency Resolution]
            FEATURE_FLAGS[Feature Flags<br/>Runtime Control<br/>A/B Testing]
        end
    end
    
    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> CONTROLLER
    CONTROLLER --> SERVICE
    SERVICE --> MODEL
    MODEL --> SHARED_DB
    SERVICE --> SHARED_CACHE
    CONTROLLER --> SHARED_LOGGER
    ROUTES --> REGISTRY_CORE
    MIDDLEWARE --> FEATURE_FLAGS
    
    classDef moduleClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef sharedClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef registryClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class CONTROLLER,SERVICE,MODEL,ROUTES,MIDDLEWARE moduleClass
    class SHARED_DB,SHARED_CACHE,SHARED_LOGGER sharedClass
    class REGISTRY_CORE,FEATURE_FLAGS registryClass
```

## 🔒 Security Architecture

```mermaid
graph TB
    subgraph "🛡️ Security Layers"
        subgraph "Network Security"
            FIREWALL[Firewall Rules<br/>Port Restrictions<br/>IP Whitelisting]
            DDoS[DDoS Protection<br/>Rate Limiting<br/>Traffic Analysis]
        end
        
        subgraph "Application Security"
            HELMET[Helmet.js<br/>Security Headers<br/>XSS Protection]
            CORS[CORS Policy<br/>Origin Control<br/>Preflight Handling]
            SANITIZE[Input Sanitization<br/>SQL Injection Prevention<br/>XSS Filtering]
        end
        
        subgraph "Authentication & Authorization"
            JWT_DUAL[Dual JWT System<br/>Tenant + Platform Tokens<br/>Refresh Mechanism]
            RBAC[Role-Based Access Control<br/>4 Roles: Admin, HR, Manager, Employee<br/>Module Permissions]
            MFA[Multi-Factor Authentication<br/>TOTP Support<br/>Backup Codes]
        end
        
        subgraph "Data Security"
            ENCRYPTION[Data Encryption<br/>bcrypt Password Hashing<br/>AES File Encryption]
            TENANT_ISOLATION[Tenant Data Isolation<br/>Automatic Scoping<br/>Query Filtering]
            AUDIT[Comprehensive Audit Logging<br/>Action Tracking<br/>Compliance Reports]
        end
    end
    
    FIREWALL --> DDoS
    DDoS --> HELMET
    HELMET --> CORS
    CORS --> SANITIZE
    SANITIZE --> JWT_DUAL
    JWT_DUAL --> RBAC
    RBAC --> MFA
    MFA --> ENCRYPTION
    ENCRYPTION --> TENANT_ISOLATION
    TENANT_ISOLATION --> AUDIT
    
    classDef securityClass fill:#ffebee,stroke:#c62828,stroke-width:2px
    class FIREWALL,DDoS,HELMET,CORS,SANITIZE,JWT_DUAL,RBAC,MFA,ENCRYPTION,TENANT_ISOLATION,AUDIT securityClass
```

## 📊 Monitoring & Observability

```mermaid
graph TB
    subgraph "📈 Monitoring Stack"
        subgraph "Metrics Collection"
            PROMETHEUS[Prometheus<br/>Metrics Scraping<br/>Time Series DB]
            CUSTOM_METRICS[Custom Metrics<br/>Business KPIs<br/>Performance Counters]
        end
        
        subgraph "Visualization"
            GRAFANA[Grafana Dashboards<br/>Real-time Charts<br/>Alert Visualization]
            KIBANA[Kibana (Optional)<br/>Log Analysis<br/>Search Interface]
        end
        
        subgraph "Logging"
            WINSTON[Winston Logger<br/>Structured Logging<br/>Multiple Transports]
            LOG_ROTATION[Log Rotation<br/>Daily Archives<br/>Retention Policy]
        end
        
        subgraph "Alerting"
            ALERT_MANAGER[Alert Manager<br/>Rule Engine<br/>Notification Routing]
            NOTIFICATIONS[Multi-Channel Alerts<br/>Email, Slack, SMS<br/>Escalation Policies]
        end
        
        subgraph "Health Checks"
            HEALTH_ENDPOINTS[Health Endpoints<br/>/health, /metrics<br/>Readiness Probes]
            UPTIME[Uptime Monitoring<br/>Service Availability<br/>Response Time Tracking]
        end
    end
    
    CUSTOM_METRICS --> PROMETHEUS
    PROMETHEUS --> GRAFANA
    WINSTON --> LOG_ROTATION
    LOG_ROTATION --> KIBANA
    PROMETHEUS --> ALERT_MANAGER
    ALERT_MANAGER --> NOTIFICATIONS
    HEALTH_ENDPOINTS --> UPTIME
    UPTIME --> PROMETHEUS
    
    classDef monitoringClass fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    class PROMETHEUS,CUSTOM_METRICS,GRAFANA,KIBANA,WINSTON,LOG_ROTATION,ALERT_MANAGER,NOTIFICATIONS,HEALTH_ENDPOINTS,UPTIME monitoringClass
```

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "🌍 Deployment Options"
        subgraph "SaaS Deployment"
            CLOUD[Cloud Infrastructure<br/>AWS, Azure, GCP<br/>Auto-Scaling]
            LOAD_BALANCER[Load Balancer<br/>High Availability<br/>SSL Termination]
            CDN_DEPLOY[CDN Distribution<br/>Global Edge Locations<br/>Static Asset Caching]
        end
        
        subgraph "On-Premise Deployment"
            ON_PREM[On-Premise Servers<br/>Private Infrastructure<br/>Air-Gapped Support]
            LICENSE_SERVER[License Server<br/>Offline Validation<br/>Feature Control]
        end
        
        subgraph "Container Deployment"
            DOCKER_DEPLOY[Docker Containers<br/>Microservice Ready<br/>Orchestration Support]
            KUBERNETES[Kubernetes (Optional)<br/>Container Orchestration<br/>Auto-Scaling]
        end
        
        subgraph "Process Management"
            PM2_DEPLOY[PM2 Cluster Mode<br/>Multi-Core Utilization<br/>Zero-Downtime Restart]
            SYSTEMD[Systemd Services<br/>Auto-Start on Boot<br/>Service Management]
        end
    end
    
    CLOUD --> LOAD_BALANCER
    LOAD_BALANCER --> CDN_DEPLOY
    ON_PREM --> LICENSE_SERVER
    DOCKER_DEPLOY --> KUBERNETES
    PM2_DEPLOY --> SYSTEMD
    
    classDef deployClass fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    class CLOUD,LOAD_BALANCER,CDN_DEPLOY,ON_PREM,LICENSE_SERVER,DOCKER_DEPLOY,KUBERNETES,PM2_DEPLOY,SYSTEMD deployClass
```

---

## 📋 Architecture Summary

### 🎯 Core Principles
- **Multi-Tenancy**: Complete tenant isolation with automatic data scoping
- **Modularity**: Self-contained business modules with clean boundaries
- **Scalability**: Horizontal and vertical scaling capabilities
- **Security**: Defense-in-depth security architecture
- **Observability**: Comprehensive monitoring and logging
- **Flexibility**: Support for SaaS and On-Premise deployments

### 🔧 Technology Stack
- **Backend**: Node.js 18+, Express.js, MongoDB 6.0+
- **Frontend**: React 18+, Material-UI, Multi-App Architecture
- **Caching**: Redis for performance and feature flags
- **Monitoring**: Prometheus, Grafana, Winston
- **Security**: JWT, RBAC, Helmet.js, bcrypt
- **Deployment**: PM2, Docker (optional), Kubernetes (optional)

### 📊 Performance Characteristics
- **API Response Time**: < 100ms average
- **Concurrent Users**: 1000+ supported
- **Database Queries**: < 50ms average
- **Throughput**: 10,000+ requests/minute
- **Uptime**: 99.9% availability target

### 🔒 Security Features
- **Authentication**: Dual JWT system (tenant + platform)
- **Authorization**: Role-based access control (4 roles)
- **Data Protection**: Tenant isolation, encryption at rest
- **Audit Logging**: Comprehensive action tracking
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: XSS and injection protection

This architecture supports enterprise-scale deployments while maintaining the flexibility to adapt to changing business requirements and technological advances.