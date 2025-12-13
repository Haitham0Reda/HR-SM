# Platform Admin Application

This is the platform administration dashboard for the HRMS system. It provides system administrators with tools to manage tenants, subscriptions, modules, and monitor system health.

## Features

### 1. Authentication
- Separate platform authentication using Platform JWT
- Secure token storage using SecureLS
- Platform-specific API client configured for `/api/platform` namespace
- Role-based access control for platform administrators

### 2. Tenant Management
- View all tenants in a comprehensive list
- Create new tenants with provisioning
- Edit tenant details and configuration
- Suspend/reactivate tenants
- View tenant usage statistics
- Manage tenant modules

### 3. Subscription Management
- View all subscription plans
- Display plan details including pricing and included modules
- Assign plans to tenants
- Support for upgrades and downgrades
- Track subscription status and expiration

### 4. Module Management
- View module registry with all available modules
- Display module dependencies and optional dependencies
- Configure modules per tenant
- Enable/disable modules at runtime
- View module pricing and categories

### 5. System Health & Metrics
- Real-time system health monitoring
- Database, Redis, and API status checks
- System resource monitoring (CPU, memory)
- Usage statistics across all tenants
- Per-tenant usage breakdown

## Technology Stack

- React 19.2.0
- Material-UI (MUI) 7.3.4
- React Router DOM 7.9.5
- Axios for API calls
- SecureLS for secure token storage
- Recharts for data visualization

## Getting Started

### Prerequisites
- Node.js 16+ installed
- Backend API running on port 5000

### Installation

```bash
cd client/platform-admin
npm install
```

### Development

```bash
npm start
```

The application will run on port 3001 (configured in .env).

### Build

```bash
npm build
```

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── PlatformLayout.jsx       # Main layout with sidebar
│   ├── tenants/
│   │   ├── TenantList.jsx           # Tenant list table
│   │   ├── TenantCreate.jsx         # Create tenant dialog
│   │   └── TenantDetails.jsx        # View/edit tenant details
│   ├── subscriptions/
│   │   ├── PlanList.jsx             # Subscription plans grid
│   │   └── SubscriptionManager.jsx  # Assign plans to tenants
│   ├── modules/
│   │   ├── ModuleRegistry.jsx       # All available modules
│   │   └── ModuleConfig.jsx         # Configure tenant modules
│   └── system/
│       ├── SystemHealth.jsx         # System health dashboard
│       └── UsageMetrics.jsx         # Usage statistics
├── contexts/
│   └── PlatformAuthContext.jsx      # Platform authentication context
├── pages/
│   ├── LoginPage.jsx                # Platform admin login
│   ├── PlatformDashboard.jsx        # Main dashboard
│   ├── TenantsPage.jsx              # Tenant management page
│   ├── SubscriptionsPage.jsx        # Subscription management page
│   ├── ModulesPage.jsx              # Module management page
│   └── SystemPage.jsx               # System health page
├── routes/
│   └── PlatformRoutes.jsx           # Application routing
├── services/
│   ├── platformApi.js               # Axios instance for platform API
│   ├── tenantService.js             # Tenant API calls
│   ├── subscriptionService.js       # Subscription API calls
│   ├── moduleService.js             # Module API calls
│   └── systemService.js             # System health API calls
├── App.js                           # Main app component
└── index.js                         # Entry point
```

## API Integration

The application integrates with the platform API at `/api/platform`:

- `/api/platform/auth/*` - Platform authentication
- `/api/platform/tenants/*` - Tenant management
- `/api/platform/subscriptions/*` - Subscription management
- `/api/platform/modules/*` - Module management
- `/api/platform/system/*` - System health and metrics

## Environment Variables

Create a `.env` file with:

```
REACT_APP_API_URL=http://localhost:5000/api/platform
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
PORT=3001
```

## Security

- Platform JWT tokens are stored securely using AES encryption
- Separate authentication from tenant application
- Role-based access control
- Automatic token refresh and validation
- Secure API communication

## Development Notes

- The application runs on port 3001 to avoid conflicts with the tenant HR app (port 3000)
- Uses CRACO for custom webpack configuration
- Supports hot module replacement for development
- Material-UI theme customization available in App.js

## Future Enhancements

- Plan creation and editing UI
- Advanced filtering and search
- Real-time notifications
- Audit log viewer
- Bulk operations
- Export functionality
- Advanced analytics and reporting
