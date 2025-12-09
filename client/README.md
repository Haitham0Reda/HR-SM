# HRMS Client Applications

## Overview

The HRMS frontend is a modern, multi-application architecture built with React 18+. It consists of two independent applications sharing a common component library, designed for enterprise-grade HR management and platform administration.

## Architecture

### Multi-App Structure

```
client/
├── hr-app/              # Tenant Application (HR Users)
│   ├── src/
│   │   ├── components/  # HR-specific components
│   │   ├── pages/       # Application pages
│   │   ├── services/    # API services
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   └── App.js       # Main app component
│   ├── public/          # Static assets
│   ├── package.json     # Dependencies
│   └── craco.config.js  # Build configuration
│
├── platform-admin/      # Platform Administration
│   ├── src/
│   │   ├── components/  # Admin components
│   │   ├── pages/       # Admin pages
│   │   ├── services/    # Platform API services
│   │   ├── contexts/    # Admin contexts
│   │   └── App.js       # Admin app component
│   ├── public/          # Static assets
│   ├── package.json     # Dependencies
│   └── craco.config.js  # Build configuration
│
├── shared/              # Shared Components & Utilities
│   ├── ui-kit/          # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   ├── DataTable.jsx
│   │   └── TextField.jsx
│   ├── utils/           # Utility functions
│   │   ├── formatters.js
│   │   └── helpers.js
│   ├── constants/       # Shared constants
│   └── package.json     # Shared dependencies
│
└── package.json         # Root package.json
```

## Applications

### 1. HR App (`hr-app/`)

**Purpose**: Main HR application for company employees, managers, and HR staff

**Features**:
- Employee management
- Attendance tracking
- Leave management
- Task management
- Performance reviews
- Document management
- Payroll access
- Self-service portal

**Authentication**: Tenant JWT tokens
**API Namespace**: `/api/v1/*`
**Users**: Employees, Managers, HR Staff, Company Admins
**Port**: 3000 (development)

**Key Components**:
```
hr-app/src/
├── components/
│   ├── common/          # Reusable components
│   ├── layout/          # Layout components
│   ├── license/         # License management
│   ├── roles/           # Role management
│   └── ModuleGuard.jsx  # Module access control
├── pages/
│   ├── auth/            # Login, forgot password
│   ├── dashboard/       # Main dashboard
│   ├── users/           # User management
│   ├── attendance/      # Attendance pages
│   ├── tasks/           # Task management
│   ├── vacations/       # Leave management
│   └── settings/        # Settings pages
├── contexts/
│   ├── AuthContext.jsx  # Authentication state
│   └── ModuleContext.jsx # Module availability
└── services/
    ├── api.js           # API client
    ├── auth.service.js  # Auth services
    └── user.service.js  # User services
```

### 2. Platform Admin (`platform-admin/`)

**Purpose**: Platform administration dashboard for system owners

**Features**:
- Tenant management (create, configure, monitor)
- Subscription management (plans, billing, upgrades)
- Module registry (enable/disable modules)
- System health monitoring
- Usage tracking and analytics
- Alert management
- Platform user management

**Authentication**: Platform JWT tokens
**API Namespace**: `/platform/*`
**Users**: Super Admins, Support Staff, Operations
**Port**: 3001 (development)

**Key Components**:
```
platform-admin/src/
├── components/
│   ├── layout/
│   │   └── PlatformLayout.jsx
│   ├── tenants/
│   │   ├── TenantList.jsx
│   │   ├── TenantCreate.jsx
│   │   └── TenantDetails.jsx
│   ├── subscriptions/
│   │   ├── SubscriptionManager.jsx
│   │   └── PlanList.jsx
│   ├── modules/
│   │   ├── ModuleRegistry.jsx
│   │   └── ModuleConfig.jsx
│   └── system/
│       ├── SystemHealth.jsx
│       └── UsageMetrics.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── PlatformDashboard.jsx
│   ├── TenantsPage.jsx
│   ├── SubscriptionsPage.jsx
│   ├── ModulesPage.jsx
│   └── SystemPage.jsx
├── contexts/
│   └── PlatformAuthContext.jsx
└── services/
    ├── platformApi.js
    ├── tenantService.js
    ├── subscriptionService.js
    ├── moduleService.js
    └── systemService.js
```

### 3. Shared Library (`shared/`)

**Purpose**: Common components, utilities, and constants used by both applications

**Contents**:
- **UI Kit**: Reusable UI components (Button, Modal, DataTable, TextField)
- **Utils**: Helper functions (formatters, validators, helpers)
- **Constants**: Shared constants and enums
- **Types**: TypeScript definitions (if using TypeScript)

**Benefits**:
- Code reuse across applications
- Consistent UI/UX
- Single source of truth for shared logic
- Easier maintenance

## Installation

### Prerequisites

- Node.js 18+
- npm 9+

### Setup All Applications

```bash
# From client directory
cd client

# Install all dependencies (root + apps)
npm run install:all

# Or install individually
npm install                    # Root dependencies
cd hr-app && npm install       # HR app
cd ../platform-admin && npm install  # Platform admin
cd ../shared && npm install    # Shared library
```

### Environment Configuration

#### HR App (`.env`)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_WS_URL=ws://localhost:5000

# Application
REACT_APP_NAME=HRMS
REACT_APP_VERSION=1.0.0

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true

# Build
GENERATE_SOURCEMAP=false
```

#### Platform Admin (`.env`)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/platform
REACT_APP_TENANT_API_URL=http://localhost:5000/api/v1

# Application
REACT_APP_NAME=HRMS Platform Admin
REACT_APP_VERSION=1.0.0

# Features
REACT_APP_ENABLE_METRICS=true
REACT_APP_ENABLE_ALERTS=true

# Build
GENERATE_SOURCEMAP=false
```

## Development

### Start Development Servers

```bash
# From client directory

# Start HR App (port 3000)
npm run start:hr

# Start Platform Admin (port 3001)
npm run start:platform

# Start both applications
npm run dev
```

### Build for Production

```bash
# Build all applications
npm run build:all

# Build individually
npm run build:hr          # HR app only
npm run build:platform    # Platform admin only
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests for specific app
cd hr-app && npm test
cd platform-admin && npm test

# Run with coverage
npm test -- --coverage
```

## Key Features

### 1. Module System

Dynamic module loading with access control:

```jsx
// ModuleGuard.jsx
import { useModule } from '../contexts/ModuleContext';

export const ModuleGuard = ({ module, children, fallback }) => {
  const { isModuleEnabled } = useModule();
  
  if (!isModuleEnabled(module)) {
    return fallback || <AccessDenied />;
  }
  
  return children;
};

// Usage
<ModuleGuard module="tasks">
  <TasksPage />
</ModuleGuard>
```

### 2. Authentication

Separate authentication for each application:

```jsx
// HR App - AuthContext.jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const login = async (email, password, tenantId) => {
    const response = await authService.login(email, password, tenantId);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('token', response.token);
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Platform Admin - PlatformAuthContext.jsx
export const PlatformAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('platformToken'));
  
  const login = async (email, password) => {
    const response = await platformAuthService.login(email, password);
    setToken(response.token);
    setAdmin(response.user);
    localStorage.setItem('platformToken', response.token);
  };
  
  return (
    <PlatformAuthContext.Provider value={{ admin, token, login, logout }}>
      {children}
    </PlatformAuthContext.Provider>
  );
};
```

### 3. API Services

Centralized API communication:

```javascript
// hr-app/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4. Shared Components

Reusable UI components from shared library:

```jsx
// shared/ui-kit/Button.jsx
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  onClick,
  disabled,
  ...props 
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Usage in HR App
import { Button } from '@shared/ui-kit';

<Button variant="primary" onClick={handleSubmit}>
  Save Changes
</Button>
```

### 5. Routing

React Router v6 for navigation:

```jsx
// hr-app/src/App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ModuleProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="tasks" element={
                <ModuleGuard module="tasks">
                  <TasksPage />
                </ModuleGuard>
              } />
            </Route>
          </Routes>
        </ModuleProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

## Build Configuration

### CRACO Configuration

Both applications use CRACO for custom webpack configuration:

```javascript
// craco.config.js
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  devServer: {
    port: 3000, // or 3001 for platform-admin
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
};
```

### Package Scripts

```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test",
    "eject": "react-scripts eject"
  }
}
```

## Deployment

### Production Build

```bash
# Build all applications
npm run build:all

# Output:
# hr-app/build/          - HR app production build
# platform-admin/build/  - Platform admin production build
```

### Deployment Options

#### 1. Static Hosting (Netlify, Vercel, S3)

```bash
# Deploy HR App
cd hr-app/build
# Upload to hosting service

# Deploy Platform Admin
cd platform-admin/build
# Upload to hosting service
```

#### 2. Docker

```dockerfile
# HR App Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY hr-app/package*.json ./
RUN npm install
COPY hr-app/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run
docker build -t hrms-hr-app:latest -f hr-app/Dockerfile .
docker run -d -p 80:80 hrms-hr-app:latest
```

#### 3. Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name hr.example.com;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Environment-Specific Builds

```bash
# Development
REACT_APP_ENV=development npm run build

# Staging
REACT_APP_ENV=staging npm run build

# Production
REACT_APP_ENV=production npm run build
```

## Testing

### Unit Tests

```jsx
// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Integration Tests

```jsx
// LoginPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import * as authService from '../services/auth.service';

jest.mock('../services/auth.service');

describe('LoginPage', () => {
  test('successful login redirects to dashboard', async () => {
    authService.login.mockResolvedValue({
      token: 'fake-token',
      user: { id: '1', email: 'test@test.com' }
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@test.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith(
        'test@test.com',
        'password123'
      );
    });
  });
});
```

## Performance Optimization

### Code Splitting

```jsx
// Lazy load pages
import { lazy, Suspense } from 'react';

const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Memoization

```jsx
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
export const UserList = memo(({ users, onUserClick }) => {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} onClick={onUserClick} />
      ))}
    </div>
  );
});

// Memoize expensive calculations
function Dashboard({ data }) {
  const statistics = useMemo(() => {
    return calculateStatistics(data);
  }, [data]);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, []);

  return <div>{/* ... */}</div>;
}
```

### Bundle Size Optimization

```bash
# Analyze bundle size
npm run build
npx source-map-explorer 'build/static/js/*.js'

# Optimize imports
# Bad: import { Button } from '@mui/material';
# Good: import Button from '@mui/material/Button';
```

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3002 npm start
```

**Module not found errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm cache clean --force
```

**Build fails**
```bash
# Increase Node memory
NODE_OPTIONS=--max_old_space_size=4096 npm run build

# Check for TypeScript errors
npm run type-check
```

**API connection issues**
```bash
# Verify API URL in .env
echo $REACT_APP_API_URL

# Check CORS configuration on backend
# Ensure backend allows your frontend origin
```

## Best Practices

### Component Structure

```jsx
// Good component structure
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './UserCard.css';

/**
 * UserCard component displays user information
 * @param {Object} user - User object
 * @param {Function} onEdit - Edit callback
 */
export const UserCard = ({ user, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Side effects here
  }, [user]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="user-card">
      {/* Component JSX */}
    </div>
  );
};

UserCard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onEdit: PropTypes.func,
};

UserCard.defaultProps = {
  onEdit: () => {},
};
```

### State Management

```jsx
// Use Context for global state
// Use local state for component-specific state
// Use custom hooks for reusable logic

// Custom hook example
function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, loading, error, refetch: fetchUsers };
}
```

### Error Handling

```jsx
// Error boundary component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Documentation

- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Build Configuration**: [BUILD_CONFIGURATION.md](./BUILD_CONFIGURATION.md)
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Verification Checklist**: [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md)

## Support

- **Issues**: GitHub Issues
- **Documentation**: See `/docs` folder
- **Email**: frontend-support@hrms.com

## License

MIT License - see [LICENSE](../LICENSE) file

---

**Built with ❤️ using React 18+**
