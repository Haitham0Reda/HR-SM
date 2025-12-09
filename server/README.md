# HR-SM Server - Enterprise SaaS Backend

## Overview

The HR-SM backend is a modern, enterprise-grade multi-tenant SaaS platform built with Node.js, Express.js, and MongoDB. It features a modular plugin architecture, comprehensive tenant isolation, and dual-namespace API design for both tenant operations and platform administration.

## Architecture

### Multi-Tenant SaaS Platform

The server implements a complete multi-tenant architecture with:

- **Tenant Isolation**: Automatic data separation at the database level
- **Dual Namespace**: Separate API namespaces for tenants and platform admin
- **Modular System**: Plugin-based architecture with dynamic module loading
- **Platform Administration**: Complete tenant, subscription, and system management

### API Namespaces

#### Tenant API (`/api/*`)
Used by tenant applications (HR users, employees, managers)
- Authentication: Tenant JWT tokens
- Scope: Single tenant data only
- Automatic tenant context injection

#### Platform API (`/platform/*`)
Used by platform administrators
- Authentication: Platform JWT tokens
- Scope: Cross-tenant operations
- System-wide management capabilities

## Project Structure

```
server/
├── core/                          # Core infrastructure
│   ├── auth/                      # Authentication systems
│   │   ├── platformAuth.js        # Platform admin authentication
│   │   └── tenantAuth.js          # Tenant authentication
│   ├── config/                    # Configuration management
│   ├── errors/                    # Error handling
│   │   ├── AppError.js            # Custom error class
│   │   ├── errorHandler.js        # Global error handler
│   │   └── errorTypes.js          # Error type definitions
│   ├── logging/                   # Centralized logging
│   │   └── logger.js              # Winston logger configuration
│   ├── middleware/                # Core middleware
│   │   ├── tenantContext.js       # Tenant context injection
│   │   ├── moduleGuard.js         # Module access control
│   │   ├── namespaceValidator.js  # API namespace validation
│   │   ├── platformAuth.js        # Platform authentication
│   │   ├── platformAuthorization.js # Platform RBAC
│   │   ├── requestLogger.js       # Request logging
│   │   ├── alerting.js            # System alerting
│   │   └── usageTracking.js       # Usage metrics
│   └── registry/                  # Module registry
│       ├── moduleRegistry.js      # Module registration
│       ├── moduleLoader.js        # Dynamic module loading
│       ├── dependencyResolver.js  # Module dependencies
│       ├── featureFlagService.js  # Feature flags
│       └── moduleInitializer.js   # Module initialization
│
├── modules/                       # Business modules
│   ├── hr-core/                   # Core HR functionality
│   │   ├── attendance/            # Attendance management
│   │   ├── backup/                # Backup operations
│   │   ├── holidays/              # Holiday management
│   │   ├── missions/              # Mission tracking
│   │   ├── overtime/              # Overtime management
│   │   ├── requests/              # Request management
│   │   ├── vacations/             # Vacation management
│   │   ├── services/              # Shared services
│   │   └── module.config.js       # Module configuration
│   ├── clinic/                    # Medical clinic module
│   │   ├── models/                # Medical data models
│   │   ├── services/              # Clinic services
│   │   ├── controllers/           # API controllers
│   │   ├── routes/                # API routes
│   │   └── module.config.js       # Module configuration
│   ├── email-service/             # Email service module
│   │   ├── providers/             # Email providers (SES, SMTP, SendGrid)
│   │   ├── templates/             # Email templates
│   │   ├── services/              # Email service
│   │   └── module.config.js       # Module configuration
│   └── tasks/                     # Task management module
│       └── module.config.js       # Module configuration
│
├── platform/                      # Platform administration
│   ├── auth/                      # Platform authentication
│   │   ├── controllers/           # Auth controllers
│   │   ├── routes/                # Auth routes
│   │   └── services/              # Auth services
│   ├── tenants/                   # Tenant management
│   │   ├── models/                # Tenant models
│   │   ├── controllers/           # Tenant controllers
│   │   ├── routes/                # Tenant routes
│   │   └── services/              # Tenant services
│   ├── subscriptions/             # Subscription management
│   │   ├── models/                # Subscription models
│   │   ├── controllers/           # Subscription controllers
│   │   ├── routes/                # Subscription routes
│   │   └── services/              # Subscription services
│   ├── modules/                   # Module management
│   │   ├── controllers/           # Module controllers
│   │   ├── routes/                # Module routes
│   │   └── services/              # Module services
│   └── system/                    # System management
│       ├── controllers/           # System controllers
│       ├── routes/                # System routes
│       └── services/              # System services
│
├── testing/                       # Test suites
│   ├── core/                      # Core tests
│   │   ├── auth.test.js           # Authentication tests
│   │   ├── moduleGuard.test.js    # Module guard tests
│   │   ├── dependencyResolver.test.js # Dependency tests
│   │   ├── tenantIsolation.property.test.js # Tenant isolation
│   │   └── errorHandler.test.js   # Error handling tests
│   └── middleware/                # Middleware tests
│       └── namespaceValidator.test.js # Namespace tests
│
├── scripts/                       # Utility scripts
│   └── migrations/                # Database migrations
│
├── app.js                         # Tenant application setup
├── platformApp.js                 # Platform application setup
├── tenantApp.js                   # Tenant routes configuration
├── server.js                      # Main server entry point
└── index.js                       # Application bootstrap
```

## Key Features

### 1. Multi-Tenancy

Complete tenant isolation with automatic data scoping:

```javascript
// Automatic tenant filtering in all queries
const users = await User.find({ tenantId: req.tenant.id });

// Tenant context middleware
app.use('/api', tenantContext);

// All tenant data automatically scoped
```

### 2. Modular Architecture

Plugin-based system with dynamic loading:

```javascript
// Module configuration
export default {
  name: 'hr-core',
  version: '1.0.0',
  dependencies: ['email-service'],
  routes: './routes',
  models: './models',
  permissions: ['hr.read', 'hr.write']
};

// Dynamic module loading
await moduleRegistry.loadModule('hr-core');
```

### 3. Dual Namespace API

Separate namespaces for different user types:

```
Tenant API:
  /api/v1/hr-core/*        - HR operations
  /api/v1/tasks/*          - Task management
  /api/v1/clinic/*         - Medical services

Platform API:
  /platform/auth/*         - Platform authentication
  /platform/tenants/*      - Tenant management
  /platform/subscriptions/* - Subscription management
  /platform/modules/*      - Module management
  /platform/system/*       - System monitoring
```

### 4. Centralized Logging

Winston-based structured logging:

```javascript
logger.info('User logged in', {
  userId: user.id,
  tenantId: tenant.id,
  correlationId: req.correlationId
});

logger.error('Database error', {
  error: err.message,
  stack: err.stack,
  context: { operation: 'findUser' }
});
```

### 5. Module Guards

Runtime access control for modules:

```javascript
// Protect routes with module guard
router.get('/tasks', 
  authenticate,
  moduleGuard('tasks'),
  taskController.list
);

// Automatic module availability check
```

### 6. Feature Flags

Per-tenant feature control:

```javascript
// Check feature availability
const isEnabled = await featureFlagService.isEnabled(
  tenantId,
  'tasks.advanced-reporting'
);

// Enable/disable features dynamically
await featureFlagService.enable(tenantId, 'clinic');
```

## Installation

### Prerequisites

- Node.js 18+ 
- MongoDB 6.0+
- Redis (optional, for caching)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env with your settings
nano .env

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Start production server
npm start
```

### Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/hrms
MONGODB_TEST_URI=mongodb://localhost:27017/hrms-test

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRE=7d
PLATFORM_JWT_SECRET=your-platform-secret-key

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# AWS SES (optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

## API Documentation

### Authentication

#### Tenant Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "password123",
  "tenantId": "company1"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user123",
    "email": "user@company.com",
    "role": "employee",
    "tenantId": "company1"
  }
}
```

#### Platform Login
```http
POST /platform/auth/login
Content-Type: application/json

{
  "email": "admin@platform.com",
  "password": "admin123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "admin123",
    "email": "admin@platform.com",
    "role": "super_admin"
  }
}
```

### Tenant Management (Platform API)

#### Create Tenant
```http
POST /platform/tenants
Authorization: Bearer <platform_token>
Content-Type: application/json

{
  "name": "Acme Corporation",
  "subdomain": "acme",
  "plan": "enterprise",
  "adminEmail": "admin@acme.com",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD"
  }
}
```

#### List Tenants
```http
GET /platform/tenants?page=1&limit=20
Authorization: Bearer <platform_token>
```

#### Get Tenant Details
```http
GET /platform/tenants/:tenantId
Authorization: Bearer <platform_token>
```

#### Update Tenant
```http
PATCH /platform/tenants/:tenantId
Authorization: Bearer <platform_token>
Content-Type: application/json

{
  "plan": "enterprise",
  "status": "active"
}
```

### Module Management (Platform API)

#### List Available Modules
```http
GET /platform/modules
Authorization: Bearer <platform_token>
```

#### Enable Module for Tenant
```http
POST /platform/modules/:tenantId/enable
Authorization: Bearer <platform_token>
Content-Type: application/json

{
  "moduleId": "clinic",
  "config": {
    "maxAppointments": 100
  }
}
```

#### Disable Module
```http
POST /platform/modules/:tenantId/disable
Authorization: Bearer <platform_token>
Content-Type: application/json

{
  "moduleId": "clinic"
}
```

### System Monitoring (Platform API)

#### Health Check
```http
GET /platform/system/health
Authorization: Bearer <platform_token>

Response:
{
  "status": "healthy",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected",
  "memory": {
    "used": "256MB",
    "total": "512MB"
  }
}
```

#### Usage Metrics
```http
GET /platform/system/metrics
Authorization: Bearer <platform_token>

Response:
{
  "tenants": {
    "total": 150,
    "active": 142,
    "trial": 8
  },
  "requests": {
    "total": 1500000,
    "perMinute": 250
  },
  "storage": {
    "used": "50GB",
    "limit": "100GB"
  }
}
```

### Tenant API Examples

#### HR Core - Users
```http
GET /api/v1/hr-core/users
Authorization: Bearer <tenant_token>

POST /api/v1/hr-core/users
Authorization: Bearer <tenant_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "role": "employee",
  "department": "engineering"
}
```

#### Tasks Module
```http
GET /api/v1/tasks/tasks
Authorization: Bearer <tenant_token>

POST /api/v1/tasks/tasks
Authorization: Bearer <tenant_token>
Content-Type: application/json

{
  "title": "Complete project documentation",
  "description": "Write comprehensive docs",
  "assignedTo": "user123",
  "dueDate": "2025-12-31",
  "priority": "high"
}
```

#### Clinic Module
```http
GET /api/v1/clinic/appointments
Authorization: Bearer <tenant_token>

POST /api/v1/clinic/appointments
Authorization: Bearer <tenant_token>
Content-Type: application/json

{
  "patientId": "emp123",
  "doctorId": "doc456",
  "date": "2025-12-15T10:00:00Z",
  "type": "checkup"
}
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- server/testing/core/auth.test.js

# Run in watch mode
npm test -- --watch
```

### Test Structure

```javascript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';

describe('Tenant API', () => {
  let token;
  
  beforeAll(async () => {
    // Setup test database
    await setupTestDB();
    
    // Login and get token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'test123' });
    
    token = response.body.token;
  });
  
  test('should list users for tenant', async () => {
    const response = await request(app)
      .get('/api/v1/hr-core/users')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
});
```

## Deployment

### Production Setup

```bash
# Install production dependencies
npm install --production

# Build if needed
npm run build

# Start with PM2
pm2 start server/index.js --name hrms-api -i max

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server/ ./server/
COPY .env.production ./.env

EXPOSE 5000

CMD ["node", "server/index.js"]
```

```bash
# Build image
docker build -t hrms-server:latest .

# Run container
docker run -d \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://mongo:27017/hrms \
  --name hrms-api \
  hrms-server:latest
```

### Environment-Specific Configuration

**Development**
- Detailed error messages
- Debug logging
- Hot reload with nodemon
- CORS enabled for localhost

**Production**
- Error logging only
- Optimized performance
- Rate limiting enforced
- Security headers enabled
- HTTPS required

## Monitoring & Logging

### Application Logs

Logs are stored in `logs/` directory with daily rotation:

```bash
# View application logs
tail -f logs/application-2025-12-10.log

# View error logs
tail -f logs/error-2025-12-10.log

# Search logs
grep "ERROR" logs/*.log
```

### Metrics

Prometheus metrics available at `/metrics`:

```bash
# View metrics
curl http://localhost:9090/metrics
```

Available metrics:
- HTTP request duration
- Request count by endpoint
- Active connections
- Database query time
- Memory usage
- CPU usage

### Health Checks

```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check (platform)
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/platform/system/health
```

## Security

### Authentication & Authorization

- **JWT Tokens**: Secure token-based authentication
- **Dual Auth Systems**: Separate auth for tenants and platform
- **Role-Based Access Control**: Fine-grained permissions
- **Module Guards**: Runtime module access control

### Data Security

- **Tenant Isolation**: Automatic data separation
- **Encryption**: Passwords hashed with bcrypt
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Protection**: Mongoose parameterized queries
- **XSS Protection**: Input sanitization and output encoding

### Network Security

- **Rate Limiting**: 100 requests per 15 minutes
- **CORS**: Configurable cross-origin policies
- **Security Headers**: Helmet.js for HTTP security
- **HTTPS**: TLS/SSL in production

## Performance Optimization

### Database

- Indexes on frequently queried fields
- Connection pooling
- Query optimization
- Aggregation pipelines for complex queries

### Caching

- Redis for feature flags (90% query reduction)
- In-memory caching for static data
- HTTP caching headers

### API

- Response compression
- Pagination on list endpoints
- Lazy loading for modules
- Efficient serialization

## Troubleshooting

### Common Issues

**Server won't start**
```bash
# Check MongoDB connection
mongo --eval "db.version()"

# Verify environment variables
cat .env

# Check port availability
netstat -an | grep 5000
```

**Module not loading**
```bash
# Check module configuration
cat server/modules/[module-name]/module.config.js

# Verify module is registered
npm run cli -- list-modules
```

**Authentication errors**
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check token expiry
# Tokens expire after 7 days by default
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export NODE_ENV=development

# Start server
npm run dev
```

## Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### Adding New Modules

1. Create module structure in `server/modules/[module-name]/`
2. Add `module.config.js` with module metadata
3. Implement models, controllers, routes, services
4. Register module in module registry
5. Write tests
6. Update documentation

### Code Standards

- Use ES modules (import/export)
- Follow existing code structure
- Add JSDoc comments
- Write comprehensive tests
- Use async/await for async operations
- Handle errors properly

## Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@hrms.com

## License

MIT License - see [LICENSE](../LICENSE) file

---

**Built with ❤️ for enterprise HR management**
