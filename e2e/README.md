# E2E Testing Setup

This directory contains the end-to-end (E2E) testing infrastructure for the HR-SM application using Cypress.

## Directory Structure

```
e2e/
├── fixtures/           # Test data files
│   ├── users.json     # User fixtures with roles: admin, hr_manager, manager, employee
│   └── tenants.json   # Tenant fixtures: tenant-1, tenant-2 for isolation tests
├── specs/             # Test specifications
│   ├── auth/          # Authentication tests
│   ├── hr-workflows/  # HR workflow tests
│   ├── multi-tenant/  # Multi-tenant isolation tests
│   ├── platform-admin/# Platform admin tests
│   └── test-setup/    # Setup verification tests
├── support/           # Support files and custom commands
│   ├── commands.js    # Custom Cypress commands
│   ├── e2e.js        # E2E configuration
│   └── database.js    # Database utilities
└── README.md          # This file
```

## Setup (Task 14)

### 1. Fixtures

#### User Fixtures (`e2e/fixtures/users.json`)
Contains test users for each role with the following structure:
- `admin` - Full system administrator
- `hr_manager` - HR management role
- `manager` - Team manager role
- `employee` - Regular employee role

Each user has:
- `email` - Login email
- `password` - Login password
- `tenantId` - Associated tenant ID
- `expectedDashboardPath` - Expected redirect path after login

#### Tenant Fixtures (`e2e/fixtures/tenants.json`)
Contains test tenants for isolation testing:
- `tenant-1` - Primary test tenant (Test Company)
- `tenant-2` - Secondary test tenant (Acme Corporation)

Each tenant has:
- `_id` - Tenant ID
- `name` - Company name
- `domain` - Tenant domain
- `adminCredentials` - Admin login credentials
- `subscription` - Subscription details
- `settings` - Tenant settings

### 2. Custom Commands

#### `cy.loginAs(role)`
Authenticates via API (not through UI) and sets auth cookie/token in browser storage.

**Usage:**
```javascript
cy.loginAs('admin');
cy.loginAs('hr_manager');
cy.loginAs('manager');
cy.loginAs('employee');
```

**What it does:**
1. Loads user credentials from fixtures
2. Calls `POST /api/v1/auth/login`
3. Stores auth token in localStorage and cookies
4. Stores user info in localStorage

#### `cy.seedTenant(tenantId)`
Seeds baseline test data for a tenant using the test-only endpoint.

**Usage:**
```javascript
cy.seedTenant('507f1f77bcf86cd799439010');
```

**What it does:**
1. Calls `POST /api/v1/test/seed` with tenantId
2. Creates test departments, users, and employees
3. Returns success confirmation

#### `cy.cleanupTenant(tenantId)`
Cleans up test data for a tenant.

**Usage:**
```javascript
cy.cleanupTenant('507f1f77bcf86cd799439010');
```

**What it does:**
1. Calls `DELETE /api/v1/test/cleanup` with tenantId
2. Removes all test data created by seedTenant
3. Returns success confirmation

### 3. Test-Only Routes

Located in `server/routes/testRoutes.js`, these routes are **only available when `NODE_ENV=test`**.

#### Available Endpoints:

**POST /api/v1/test/seed**
- Seeds baseline test data for a tenant
- Body: `{ tenantId: string }`
- Creates: departments, users, employees

**DELETE /api/v1/test/cleanup**
- Cleans up test data for a tenant
- Body: `{ tenantId: string }`
- Removes: documents, tasks, leaves, attendance, employees, users, departments

**GET /api/v1/test/health**
- Health check for test routes
- Returns: `{ success: true, message: "Test routes are active" }`

**POST /api/v1/test/reset-database**
- Resets entire test database (use with caution!)
- Body: `{ confirm: "RESET_ALL_DATA" }`
- Drops and recreates all tables

### 4. Environment Configuration

#### `cypress.env.json`
Contains environment-specific configuration:
```json
{
  "HR_APP_URL": "http://localhost:3000",
  "PLATFORM_APP_URL": "http://localhost:3001",
  "API_URL": "http://localhost:5000",
  "LICENSE_SERVER_URL": "http://localhost:4000",
  "TEST_DATABASE": "hr-sm-e2e-test",
  "IS_TEST_ENVIRONMENT": true
}
```

#### `cypress.config.js`
Main Cypress configuration with:
- Test isolation enabled
- Video recording enabled
- Screenshot on failure
- Custom timeouts
- Database task handlers

## Running Tests

### Start the server in test mode:
```bash
NODE_ENV=test npm start
```

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run tests in interactive mode:
```bash
npm run test:e2e:open
```

### Run specific test suites:
```bash
npm run test:e2e:auth          # Authentication tests
npm run test:e2e:hr            # HR workflow tests
npm run test:e2e:isolation     # Multi-tenant isolation tests
npm run test:e2e:platform      # Platform admin tests
```

### Run setup verification tests:
```bash
npx cypress run --spec 'e2e/specs/test-setup/**/*.cy.js'
```

## Writing Tests

### Example: Using Custom Commands

```javascript
describe('Employee Dashboard', () => {
    beforeEach(() => {
        // Seed test data
        cy.fixture('tenants').then((tenants) => {
            cy.seedTenant(tenants['tenant-1']._id);
        });

        // Login as employee
        cy.loginAs('employee');

        // Visit dashboard
        cy.visit(Cypress.env('HR_APP_URL') + '/employee/dashboard');
    });

    afterEach(() => {
        // Cleanup test data
        cy.fixture('tenants').then((tenants) => {
            cy.cleanupTenant(tenants['tenant-1']._id);
        });
    });

    it('should display employee dashboard', () => {
        cy.get('[data-cy="dashboard-title"]').should('be.visible');
    });
});
```

### Example: Multi-Tenant Isolation Test

```javascript
describe('Multi-Tenant Isolation', () => {
    it('should not access data from other tenants', () => {
        cy.fixture('tenants').then((tenants) => {
            // Seed both tenants
            cy.seedTenant(tenants['tenant-1']._id);
            cy.seedTenant(tenants['tenant-2']._id);

            // Login to tenant-1
            cy.loginAs('employee'); // tenant-1 employee

            // Verify can only see tenant-1 data
            cy.visit(Cypress.env('HR_APP_URL') + '/employees');
            cy.get('[data-cy="employee-list"]').should('not.contain', 'tenant-2');

            // Cleanup
            cy.cleanupTenant(tenants['tenant-1']._id);
            cy.cleanupTenant(tenants['tenant-2']._id);
        });
    });
});
```

## Best Practices

1. **Always cleanup after tests** - Use `afterEach` or `after` hooks to call `cy.cleanupTenant()`
2. **Use fixtures** - Load test data from fixtures instead of hardcoding
3. **Use API login** - Use `cy.loginAs()` instead of UI login for faster tests
4. **Test isolation** - Each test should be independent and not rely on other tests
5. **Use data-cy attributes** - Select elements using `data-cy` attributes for stability
6. **Check test routes** - Verify test routes are available before running seed/cleanup commands

## Troubleshooting

### Test routes not available
**Problem:** `cy.seedTenant()` or `cy.cleanupTenant()` returns 404

**Solution:** Start the server with `NODE_ENV=test`:
```bash
NODE_ENV=test npm start
```

### Authentication fails
**Problem:** `cy.loginAs()` returns 401 or 403

**Solution:** 
1. Verify user exists in fixtures
2. Check API_URL is correct in cypress.env.json
3. Ensure server is running

### Database connection errors
**Problem:** Seed/cleanup operations fail with database errors

**Solution:**
1. Verify PostgreSQL is running
2. Check database connection in server/.env
3. Ensure test database exists

## Requirements Reference

This setup fulfills **Task 14** requirements:
- ✅ User fixtures with 4 roles (admin, hr_manager, manager, employee)
- ✅ Tenant fixtures with 2 tenants (tenant-1, tenant-2)
- ✅ `cy.loginAs(role)` custom command
- ✅ `cy.seedTenant(tenantId)` custom command
- ✅ `cy.cleanupTenant(tenantId)` custom command
- ✅ Test-only Express router (`server/routes/testRoutes.js`)
- ✅ Test routes only active when `NODE_ENV=test`
- ✅ `/seed` and `/cleanup` endpoints
- ✅ `cypress.env.json` with HR_APP_URL, PLATFORM_APP_URL, API_URL
