# Core Infrastructure

This directory contains the foundational infrastructure for the enterprise SaaS architecture. It provides shared utilities and services used across platform, tenant, and module layers.

## Directory Structure

```
core/
├── auth/              # Authentication utilities
│   ├── platformAuth.js    # Platform JWT (4-hour expiration)
│   ├── tenantAuth.js      # Tenant JWT (7-day expiration)
│   └── index.js
├── errors/            # Error handling
│   ├── AppError.js        # Custom error class
│   ├── errorTypes.js      # Error code constants
│   ├── errorHandler.js    # Centralized error middleware
│   └── index.js
├── logging/           # Logging utilities
│   └── index.js           # Logger exports
├── config/            # Configuration
│   └── index.js           # Config exports
├── middleware/        # Core middleware
│   ├── tenantContext.js   # Tenant isolation middleware
│   ├── moduleGuard.js     # Module access control
│   └── index.js
├── registry/          # Module registry system
│   ├── moduleRegistry.js      # Module registration
│   ├── moduleLoader.js        # Dynamic module loading
│   ├── dependencyResolver.js  # Dependency resolution
│   └── index.js
└── index.js           # Main entry point
```

## Key Components

### Authentication (`auth/`)

Dual JWT system with separate secrets for platform and tenant authentication:

- **Platform JWT**: 4-hour expiration, used by system administrators
- **Tenant JWT**: 7-day expiration, used by company users

```javascript
import { generateTenantToken, verifyTenantToken } from './core/auth/index.js';

const token = generateTenantToken(userId, tenantId, role);
const decoded = verifyTenantToken(token);
```

### Error Handling (`errors/`)

Centralized error handling with consistent error codes and responses:

```javascript
import { AppError, ERROR_TYPES } from './core/errors/index.js';

throw new AppError(
    'Tenant not found',
    404,
    ERROR_TYPES.TENANT_NOT_FOUND,
    { tenantId }
);
```

### Middleware (`middleware/`)

Core middleware for tenant isolation and module access control:

```javascript
import { tenantContext, moduleGuard } from './core/middleware/index.js';

router.use(tenantContext);
router.use(moduleGuard('tasks'));
```

### Module Registry (`registry/`)

Dynamic module loading with dependency resolution:

```javascript
import { moduleRegistry, moduleLoader } from './core/registry/index.js';

// Register module
moduleRegistry.register(moduleConfig);

// Load module
await moduleLoader.loadModule('tasks', app, tenantId);
```

## Design Principles

1. **No Business Logic**: Core contains only infrastructure, no business logic
2. **Layer Agnostic**: Used by platform, tenant, and module layers
3. **Minimal Dependencies**: Depends only on standard libraries and utilities
4. **Well Tested**: High test coverage for critical infrastructure

## Usage

Import from the main entry point:

```javascript
import { 
    AppError, 
    ERROR_TYPES, 
    tenantContext, 
    moduleGuard,
    moduleRegistry 
} from './core/index.js';
```

Or import from specific modules:

```javascript
import { generateTenantToken } from './core/auth/tenantAuth.js';
import AppError from './core/errors/AppError.js';
```

## Requirements Mapping

- **1.1, 1.2**: Core infrastructure directory structure
- **15.5**: Centralized error handling
- **1.2, 8.3, 16.2**: Dual JWT authentication system
- **1.3, 6.2**: Tenant context middleware
- **7.1, 7.2, 12.1**: Module registry system
- **1.5, 3.2, 7.3**: Module guard middleware
