# Design Document

## Overview

The HR-SM Modernization Initiative implements a comprehensive architectural upgrade to the existing MERN stack HR management platform. The design focuses on four critical improvements: Redux Toolkit state management, Repository Pattern data access, comprehensive E2E testing, and License Server microservization. This modernization enhances scalability, maintainability, and long-term sustainability while preserving all existing functionality.

The design follows a phased approach with incremental improvements, ensuring zero downtime and backward compatibility throughout the migration process.

## Architecture

### Current Architecture

- **Frontend**: React applications (HR App + Platform Admin) with Context API state management
- **Backend**: Node.js/Express monolith with direct Mongoose model access
- **Database**: MongoDB with multi-tenant data isolation
- **License Management**: Integrated within main backend application

### Target Architecture

- **Frontend**: React applications with Redux Toolkit centralized state management
- **Backend**: Node.js/Express with Repository Pattern data access layer
- **Database**: MongoDB with abstracted access through repositories
- **License Management**: Independent microservice with JWT-based validation
- **Testing**: Comprehensive E2E test coverage with Cypress/Playwright

### Architectural Principles

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and data access
2. **Dependency Inversion**: Services depend on repository abstractions, not concrete implementations
3. **Single Responsibility**: Each component has a focused, well-defined purpose
4. **Testability**: All layers designed for comprehensive unit, integration, and E2E testing

## Components and Interfaces

### Frontend State Management Layer

#### Redux Store Structure

```
store/
├── index.js              # Store configuration and middleware
├── slices/
│   ├── authSlice.js      # Authentication state (login, user, permissions)
│   ├── tenantSlice.js    # Multi-tenant context (company, switching)
│   ├── moduleSlice.js    # Feature flags and enabled modules
│   └── notificationSlice.js # Toast messages and alerts
└── hooks/
    ├── useAppDispatch.js # Typed dispatch hook
    └── useAppSelector.js # Typed selector hook
```

#### Platform Admin Store Structure

```
platform-admin/src/store/
├── index.js                    # Store configuration
├── slices/
│   ├── platformAuthSlice.js    # Admin authentication
│   ├── tenantManagementSlice.js # Tenant CRUD operations
│   ├── subscriptionSlice.js    # Subscription lifecycle
│   ├── moduleManagementSlice.js # Module configuration
│   └── systemSettingsSlice.js  # Platform settings
```

#### State Management Interfaces

- **AuthState**: `{ user: User | null, isAuthenticated: boolean, permissions: string[], loading: boolean }`
- **TenantState**: `{ currentTenant: Tenant | null, availableTenants: Tenant[], switching: boolean }`
- **ModuleState**: `{ enabledModules: string[], featureFlags: Record<string, boolean> }`
- **NotificationState**: `{ messages: Notification[], queue: Notification[] }`

### Backend Repository Layer

#### Repository Pattern Structure

```
server/repositories/
├── BaseRepository.js           # Abstract base with CRUD operations
├── core/
│   ├── UserRepository.js       # User management operations
│   ├── DepartmentRepository.js # Department operations
│   ├── PositionRepository.js   # Position operations
│   └── TenantConfigRepository.js # Tenant configuration
├── modules/
│   ├── AttendanceRepository.js # Attendance tracking
│   ├── PayrollRepository.js    # Payroll calculations
│   ├── VacationRepository.js   # Leave management
│   ├── TaskRepository.js       # Task tracking
│   ├── DocumentRepository.js   # Document management
│   ├── MissionRepository.js    # Mission tracking
│   └── OvertimeRepository.js   # Overtime management
└── platform/
    ├── CompanyRepository.js    # Company management
    ├── PlatformUserRepository.js # Platform user operations
    ├── SubscriptionRepository.js # Subscription management
    └── LicenseRepository.js    # License operations
```

#### Repository Interface Contract

```javascript
interface IRepository<T> {
  create(data: Partial<T>): Promise<T>
  findById(id: string): Promise<T | null>
  findOne(filter: object): Promise<T | null>
  find(filter: object, options?: QueryOptions): Promise<T[]>
  update(id: string, data: Partial<T>): Promise<T | null>
  delete(id: string): Promise<boolean>
  count(filter: object): Promise<number>
}
```

### License Server Microservice

#### Service Architecture

```
hrsm-license-server/
├── src/
│   ├── controllers/
│   │   └── LicenseController.js    # REST API endpoints
│   ├── services/
│   │   ├── LicenseGenerator.js     # JWT license creation
│   │   ├── LicenseValidator.js     # JWT license validation
│   │   └── AuditService.js         # License operation logging
│   ├── models/
│   │   ├── License.js              # License data model
│   │   └── LicenseUsage.js         # Usage tracking model
│   └── middleware/
│       ├── authentication.js       # API key validation
│       └── validation.js           # Request validation
```

#### License Server API Interface

- **POST /licenses/create**: Generate new license with features and limits
- **POST /licenses/validate**: Validate license token and return status
- **GET /licenses/:licenseNumber**: Retrieve license details and usage
- **PATCH /licenses/:licenseNumber/renew**: Extend license expiry
- **DELETE /licenses/:licenseNumber**: Revoke license
- **GET /licenses/tenant/:tenantId**: Get tenant's active license
- **GET /licenses/stats**: License statistics (admin only)

### E2E Testing Framework

#### Test Structure

```
e2e/
├── fixtures/
│   ├── users.json              # Test user data
│   ├── tenants.json            # Test tenant data
│   └── modules.json            # Test module configurations
├── support/
│   ├── commands.js             # Custom Cypress commands
│   ├── helpers.js              # Test utility functions
│   └── page-objects/           # Page object models
├── specs/
│   ├── auth/                   # Authentication flow tests
│   ├── hr-workflows/           # Core HR functionality tests
│   ├── platform-admin/         # Platform administration tests
│   ├── multi-tenant/           # Data isolation tests
│   └── error-handling/         # Edge case and error tests
```

## Data Models

### Redux State Models

#### AuthSlice State

```javascript
{
  user: {
    id: string,
    email: string,
    name: string,
    role: string,
    permissions: string[],
    tenantId: string
  },
  isAuthenticated: boolean,
  loading: boolean,
  error: string | null
}
```

#### TenantSlice State

```javascript
{
  currentTenant: {
    id: string,
    name: string,
    domain: string,
    subscription: {
      plan: string,
      enabledModules: string[],
      expiryDate: Date
    }
  },
  availableTenants: Tenant[],
  switching: boolean
}
```

### Repository Data Models

#### BaseRepository Operations

```javascript
class BaseRepository {
  async create(data) {
    /* Implementation */
  }
  async findById(id) {
    /* Implementation */
  }
  async findOne(filter) {
    /* Implementation */
  }
  async find(filter, options = {}) {
    /* Implementation */
  }
  async update(id, data) {
    /* Implementation */
  }
  async delete(id) {
    /* Implementation */
  }
  async count(filter) {
    /* Implementation */
  }

  // Transaction support
  async withTransaction(operations) {
    /* Implementation */
  }

  // Query builder
  query() {
    return new QueryBuilder(this.model);
  }
}
```

### License Server Models

#### License Model

```javascript
{
  licenseNumber: string,
  tenantId: string,
  features: string[],
  limits: {
    maxUsers: number,
    maxStorage: number,
    apiCallsPerMonth: number
  },
  machineBinding: {
    machineId: string,
    activatedAt: Date
  },
  status: 'active' | 'suspended' | 'expired' | 'revoked',
  issuedAt: Date,
  expiresAt: Date,
  renewedAt: Date | null
}
```

## Error Handling

### Frontend Error Handling

#### Redux Error Management

- **Async Thunk Error Handling**: All async operations use createAsyncThunk with proper error serialization
- **Global Error Boundary**: React Error Boundary components catch and display user-friendly error messages
- **Network Error Recovery**: Automatic retry logic for failed API calls with exponential backoff
- **State Consistency**: Error states properly reset when operations succeed

#### Error State Structure

```javascript
{
  loading: boolean,
  error: {
    message: string,
    code: string,
    timestamp: Date,
    retryable: boolean
  } | null,
  lastSuccessfulOperation: Date | null
}
```

### Backend Error Handling

#### Repository Layer Errors

- **Database Connection Errors**: Graceful handling with connection pooling and retry logic
- **Validation Errors**: Comprehensive input validation with detailed error messages
- **Transaction Rollback**: Automatic rollback on multi-document operation failures
- **Query Optimization**: Proper indexing and query performance monitoring

#### Service Layer Error Handling

```javascript
class ServiceError extends Error {
  constructor(message, code, statusCode = 500, isOperational = true) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}
```

### License Server Error Handling

#### Microservice Resilience

- **Circuit Breaker Pattern**: Prevent cascade failures when license server is unavailable
- **Graceful Degradation**: Main application continues with cached license validation
- **Health Check Monitoring**: Regular health checks with automatic service recovery
- **Audit Trail**: Complete logging of all license operations and failures

#### License Validation Fallback

```javascript
// Cached validation when license server unavailable
const validateLicenseWithFallback = async (licenseToken) => {
  try {
    return await licenseServerClient.validate(licenseToken);
  } catch (error) {
    if (error.code === "SERVICE_UNAVAILABLE") {
      return getCachedLicenseValidation(licenseToken);
    }
    throw error;
  }
};
```

## Testing Strategy

### Dual Testing Approach

The testing strategy implements both unit testing and property-based testing to provide comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions using Jest
- **Property-Based Tests**: Verify universal properties across all inputs using fast-check library
- **Integration Tests**: Test component interactions and API endpoints
- **E2E Tests**: Validate complete user workflows using Cypress

### Unit Testing Requirements

#### Frontend Unit Tests

- Redux slice reducers and action creators
- React component rendering and user interactions
- Custom hooks behavior and state management
- Utility functions and helper methods
- Error boundary components

#### Backend Unit Tests

- Repository CRUD operations and query methods
- Service business logic and data transformations
- Controller request/response handling
- Middleware authentication and validation
- License server JWT operations

### Property-Based Testing Requirements

Property-based tests will be implemented using the fast-check library with a minimum of 100 iterations per test. Each property-based test must be tagged with a comment referencing the correctness property from this design document using the format: **Feature: hr-sm-modernization, Property {number}: {property_text}**

### E2E Testing Requirements

#### Test Coverage Goals

- **Authentication Flows**: 100% coverage of login, logout, password reset, and session management
- **Core HR Workflows**: 90% coverage of employee management, leave requests, attendance, and task workflows
- **Platform Admin Workflows**: 90% coverage of tenant management, subscription, and license operations
- **Multi-tenant Isolation**: 100% coverage of data isolation and access control
- **Error Handling**: 80% coverage of network failures, service unavailability, and edge cases

#### Test Data Management

- **Fixtures**: Standardized test data for users, tenants, and configurations
- **Factories**: Dynamic test data generation for property-based testing
- **Cleanup**: Automatic test data cleanup after each test run
- **Isolation**: Each test runs with fresh data to prevent interference

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Properties 2.2, 2.3, and 2.4 (repository implementations) can be combined into a single comprehensive repository functionality property
- Properties 2.5 and 2.6 (service and controller refactoring) can be combined into a single behavior preservation property
- Properties 4.2 and 4.3 (license services and API) can be combined into a comprehensive license functionality property

### Redux State Management Properties

**Property 1: Redux store state consistency**
_For any_ Redux store configuration and any sequence of valid actions, dispatching actions should result in predictable state changes that follow the reducer logic
**Validates: Requirements 1.1, 1.2**

**Property 2: Component behavior preservation during Redux migration**
_For any_ component and any valid props/state combination, the component should produce the same output after Redux migration as it did with the original Context API implementation
**Validates: Requirements 1.3**

**Property 3: Redux persistence round trip**
_For any_ valid Redux state, persisting to localStorage and then rehydrating should produce an equivalent state
**Validates: Requirements 1.4**

### Repository Pattern Properties

**Property 4: Repository CRUD operations consistency**
_For any_ repository implementation and any valid data object, all CRUD operations should work consistently and maintain data integrity across create, read, update, and delete operations
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

**Property 5: Service behavior preservation with repositories**
_For any_ service method and any valid input parameters, the service should produce the same business logic results after repository refactoring as it did with direct model access
**Validates: Requirements 2.5, 2.6**

### Multi-tenant Data Isolation Properties

**Property 6: Tenant data isolation**
_For any_ two different tenants and any data operation, users from one tenant should never be able to access, modify, or view data belonging to another tenant
**Validates: Requirements 3.5**

**Property 7: Error handling resilience**
_For any_ system component and any error condition (network failure, service unavailability, invalid input), the system should handle the error gracefully without data corruption or system crash
**Validates: Requirements 3.6**

### License Server Properties

**Property 8: License JWT round trip**
_For any_ valid license data, generating a JWT license token and then validating it should return the original license information with correct expiry and feature validation
**Validates: Requirements 4.1, 4.2**

**Property 9: License API consistency**
_For any_ license operation (create, validate, renew, revoke) performed through the REST API, the operation should produce consistent results and maintain proper audit trails
**Validates: Requirements 4.3**

**Property 10: License integration resilience**
_For any_ license validation request from the main backend, the system should handle license server availability issues gracefully with proper retry logic and cached fallback validation
**Validates: Requirements 4.4**

**Property 11: License UI synchronization**
_For any_ license management operation performed through the Platform Admin UI, the interface should accurately reflect the current license state and usage analytics
**Validates: Requirements 4.5**

### System Migration Properties

**Property 12: Migration behavior preservation**
_For any_ system functionality and any valid user workflow, the system should maintain identical behavior and performance characteristics after the complete modernization migration
**Validates: Requirements 5.5**
