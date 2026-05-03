# Task 14: E2E Test Fixtures, Custom Commands, and Base Configuration - COMPLETE

## Overview
Successfully set up the E2E testing infrastructure with fixtures, custom commands, and test-only API endpoints for Cypress testing.

## Completed Items

### 1. User Fixtures (`e2e/fixtures/users.json`)
✅ Created/updated with one test user per role:
- `admin` - Full system administrator
  - Email: admin@testcompany.com
  - Password: TestAdmin123!
  - TenantId: 507f1f77bcf86cd799439010
  - Expected Dashboard: /dashboard

- `hr_manager` - HR management role
  - Email: hr@testcompany.com
  - Password: HRManager123!
  - TenantId: 507f1f77bcf86cd799439010
  - Expected Dashboard: /hr/dashboard

- `manager` - Team manager role
  - Email: manager@testcompany.com
  - Password: Manager123!
  - TenantId: 507f1f77bcf86cd799439010
  - Expected Dashboard: /manager/dashboard

- `employee` - Regular employee role
  - Email: employee@testcompany.com
  - Password: Employee123!
  - TenantId: 507f1f77bcf86cd799439010
  - Expected Dashboard: /employee/dashboard

Each user includes:
- email
- password
- tenantId
- expectedDashboardPath

### 2. Tenant Fixtures (`e2e/fixtures/tenants.json`)
✅ Created/updated with two test tenants for isolation tests:

- `tenant-1` (Test Company)
  - ID: 507f1f77bcf86cd799439010
  - Domain: testcompany
  - Admin: admin@testcompany.com / TestAdmin123!

- `tenant-2` (Acme Corporation)
  - ID: 507f1f77bcf86cd799439011
  - Domain: acme
  - Admin: admin@acme.com / AcmeAdmin123!

Each tenant includes:
- _id
- name
- domain
- adminCredentials (email, password)
- subscription details
- settings

### 3. Custom Commands (`e2e/support/commands.js`)

#### ✅ `cy.loginAs(role)`
Authenticates via API (not through UI) and sets auth cookie/token in browser storage.

**Implementation:**
- Loads user credentials from fixtures
- Calls `POST /api/v1/auth/login`
- Stores auth token in localStorage
- Sets auth cookie
- Stores user info in localStorage

**Usage:**
```javascript
cy.loginAs('admin');
cy.loginAs('hr_manager');
cy.loginAs('manager');
cy.loginAs('employee');
```

#### ✅ `cy.seedTenant(tenantId)`
Seeds baseline test data for a tenant using test-only endpoint.

**Implementation:**
- Calls `POST /api/v1/test/seed` with tenantId
- Creates test departments (Engineering, HR, Sales)
- Creates test users for each role
- Returns success confirmation

**Usage:**
```javascript
cy.seedTenant('507f1f77bcf86cd799439010');
```

#### ✅ `cy.cleanupTenant(tenantId)`
Cleans up test data for a tenant.

**Implementation:**
- Calls `DELETE /api/v1/test/cleanup` with tenantId
- Removes test users (identified by email pattern)
- Removes test departments
- Returns success confirmation

**Usage:**
```javascript
cy.cleanupTenant('507f1f77bcf86cd799439010');
```

### 4. Test-Only Express Router (`server/routes/testRoutes.js`)

✅ Created test-only router that is registered only when `NODE_ENV=test`

**Endpoints:**

#### POST /api/v1/test/seed
Seeds baseline test data for a tenant.
- Body: `{ tenantId: string }`
- Creates: 3 departments, 4 users (admin, hr_manager, manager, employee)
- Returns: Success message with counts

#### DELETE /api/v1/test/cleanup
Cleans up test data for a tenant.
- Body: `{ tenantId: string }`
- Removes: Test users and departments
- Returns: Success message

#### GET /api/v1/test/health
Health check for test routes.
- Returns: `{ success: true, message: "Test routes are active" }`

#### POST /api/v1/test/reset-database
Resets entire test database (use with caution).
- Body: `{ confirm: "RESET_ALL_DATA" }`
- Drops and recreates all tables
- Returns: Success message

**Security:**
- Routes only available when `NODE_ENV=test`
- Registered in `server/app.js` with environment check
- Uses transactions for data integrity
- Proper error handling and rollback

### 5. Environment Configuration

#### ✅ `cypress.env.json`
Created with required environment variables:
```json
{
  "HR_APP_URL": "http://localhost:3000",
  "PLATFORM_APP_URL": "http://localhost:3001",
  "API_URL": "http://localhost:5000",
  "LICENSE_SERVER_URL": "http://localhost:4000",
  "TEST_DATABASE": "hr-sm-e2e-test",
  "IS_TEST_ENVIRONMENT": true,
  "CYPRESS_ENV": "test"
}
```

#### ✅ Updated `cypress.config.js`
- Added all environment variables with both camelCase and UPPER_CASE variants
- Configured for compatibility with existing tests
- Maintained existing database task handlers

### 6. Test Verification

✅ Created verification test suite: `e2e/specs/test-setup/fixtures-and-commands.cy.js`

Tests include:
- Environment variable configuration
- Test routes health check
- User fixtures structure validation
- Tenant fixtures structure validation
- Custom command availability
- Integration workflow demonstration

### 7. Documentation

✅ Created comprehensive documentation: `e2e/README.md`

Includes:
- Directory structure overview
- Setup instructions
- Custom command usage examples
- Test-only routes documentation
- Environment configuration
- Running tests guide
- Writing tests examples
- Best practices
- Troubleshooting guide

## Files Created/Modified

### Created:
1. `server/routes/testRoutes.js` - Test-only API endpoints
2. `cypress.env.json` - Environment configuration
3. `e2e/specs/test-setup/fixtures-and-commands.cy.js` - Verification tests
4. `e2e/README.md` - Comprehensive documentation
5. `docs/T014-e2e-test-setup-complete.md` - This file

### Modified:
1. `e2e/fixtures/users.json` - Added role-based users with expectedDashboardPath
2. `e2e/fixtures/tenants.json` - Added tenant-1 and tenant-2 with adminCredentials
3. `e2e/support/commands.js` - Added cy.loginAs(), cy.seedTenant(), cy.cleanupTenant()
4. `server/app.js` - Registered test routes with NODE_ENV check
5. `cypress.config.js` - Added environment variables

## Usage Examples

### Basic Test with Seed/Cleanup
```javascript
describe('Employee Dashboard', () => {
    beforeEach(() => {
        cy.fixture('tenants').then((tenants) => {
            cy.seedTenant(tenants['tenant-1']._id);
        });
        cy.loginAs('employee');
        cy.visit(Cypress.env('HR_APP_URL') + '/employee/dashboard');
    });

    afterEach(() => {
        cy.fixture('tenants').then((tenants) => {
            cy.cleanupTenant(tenants['tenant-1']._id);
        });
    });

    it('should display employee dashboard', () => {
        cy.get('[data-cy="dashboard-title"]').should('be.visible');
    });
});
```

### Multi-Tenant Isolation Test
```javascript
describe('Multi-Tenant Isolation', () => {
    it('should not access data from other tenants', () => {
        cy.fixture('tenants').then((tenants) => {
            cy.seedTenant(tenants['tenant-1']._id);
            cy.seedTenant(tenants['tenant-2']._id);

            cy.loginAs('employee'); // tenant-1 employee
            cy.visit(Cypress.env('HR_APP_URL') + '/employees');
            cy.get('[data-cy="employee-list"]').should('not.contain', 'tenant-2');

            cy.cleanupTenant(tenants['tenant-1']._id);
            cy.cleanupTenant(tenants['tenant-2']._id);
        });
    });
});
```

## Running Tests

### Start server in test mode:
```bash
NODE_ENV=test npm start
```

### Run verification tests:
```bash
npx cypress run --spec 'e2e/specs/test-setup/**/*.cy.js'
```

### Run all E2E tests:
```bash
npm run test:e2e
```

## Technical Implementation Details

### Database Models Used:
- `User` - from `server/modules/hr-core/users/models/user.model.js`
- `Department` - from `server/modules/hr-core/users/models/department.model.js`
- `Company` - from `server/platform/models/Company.js`
- `mainAppDb` - from `server/config/database.js`

### Transaction Handling:
- All seed/cleanup operations use database transactions
- Automatic rollback on errors
- Ensures data integrity

### Security Considerations:
- Test routes only available when `NODE_ENV=test`
- Environment check in app.js prevents production exposure
- Confirmation required for database reset
- Test data identified by email pattern for safe cleanup

## Requirements Fulfillment

✅ **Requirement 3-1:** All items completed
- User fixtures with 4 roles (admin, hr_manager, manager, employee)
- Tenant fixtures with 2 tenants (tenant-1, tenant-2)
- cy.loginAs(role) custom command
- cy.seedTenant(tenantId) custom command
- cy.cleanupTenant(tenantId) custom command
- Test-only Express router (server/routes/testRoutes.js)
- Routes only active when NODE_ENV=test
- /seed and /cleanup endpoints implemented
- cypress.env.json with HR_APP_URL, PLATFORM_APP_URL, API_URL

## Next Steps

1. Start server with `NODE_ENV=test` to enable test routes
2. Run verification tests to confirm setup
3. Begin writing E2E tests using the new infrastructure
4. Use cy.loginAs() for fast authentication
5. Use cy.seedTenant() and cy.cleanupTenant() for test data management

## Notes

- Test routes are intentionally simple and focused on E2E testing needs
- Seed operation creates minimal baseline data (departments and users)
- Cleanup operation safely removes only test-created data
- All operations use transactions for data integrity
- Comprehensive error handling and logging included
- Documentation includes troubleshooting guide

## Status: ✅ COMPLETE

All requirements for Task 14 have been successfully implemented and documented.
