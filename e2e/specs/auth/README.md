# Authentication E2E Tests - Task 14

This directory contains comprehensive End-to-End tests for authentication flows as specified in Task 14 of the HR-SM Modernization Initiative.

## Test Coverage

### 1. Tenant User Authentication - Valid Credentials

- ✅ Employee login with valid credentials
- ✅ Tenant admin login with valid credentials
- ✅ HR manager login with valid credentials
- ✅ Manager login with valid credentials
- ✅ User information display after login
- ✅ Session persistence with "remember me" option

### 2. Tenant User Authentication - Invalid Credentials

- ✅ Invalid email format rejection
- ✅ Empty credentials rejection
- ✅ Non-existent email rejection
- ✅ Correct email with wrong password rejection
- ✅ Empty password rejection
- ✅ Loading state during failed login attempts
- ✅ Rate limiting after multiple failed attempts

### 3. Platform Admin Authentication

- ✅ Successful platform admin login with valid credentials
- ✅ Invalid platform admin credentials rejection
- ✅ Empty credentials rejection
- ✅ Access control and permissions verification
- ✅ Platform admin dashboard validation
- ✅ Prevention of tenant users accessing platform admin

### 4. Logout Functionality

- ✅ Tenant user logout with session data cleanup
- ✅ Platform admin logout with session data cleanup
- ✅ Protected route access prevention after logout
- ✅ Logout handling with expired sessions
- ✅ Single sign-out across multiple tabs/windows

### 5. Password Reset Flow with Email Verification

- ✅ Password reset initiation for valid tenant user email
- ✅ Invalid email handling in password reset
- ✅ Email format validation in password reset form
- ✅ Platform admin password reset handling
- ✅ Complete password reset flow with valid token
- ✅ Invalid token rejection
- ✅ Expired token rejection
- ✅ Password strength validation in reset form
- ✅ Rate limiting for password reset requests

### 6. Session Persistence Across Page Refreshes

- ✅ Tenant user session maintenance after page refresh
- ✅ Platform admin session maintenance after page refresh
- ✅ Session maintenance during page navigation
- ✅ Session state restoration including user preferences
- ✅ Graceful handling of expired token during session restoration
- ✅ Session maintenance across browser tabs

### 7. Session Timeout and Re-authentication

- ✅ Session timeout handling and login redirect
- ✅ API request handling with expired token
- ✅ Automatic token refresh before expiration
- ✅ Failed token refresh handling requiring re-login
- ✅ Intended destination preservation after re-authentication
- ✅ Session timeout warning before expiration
- ✅ Session extension when user chooses to continue

### 8. Multi-tenant Isolation

- ✅ Authentication isolation between different tenants
- ✅ Cross-tenant data access prevention via API
- ✅ Cross-tenant URL manipulation prevention
- ✅ Invalid tenant domain handling
- ✅ User session isolation between tenants
- ✅ Tenant data leakage prevention in search results
- ✅ File upload isolation between tenants
- ✅ Cross-tenant notification access prevention
- ✅ Tenant-specific module access enforcement

### 9. Role-based Login Restrictions

- ✅ Employee role restrictions enforcement
- ✅ HR manager role restrictions enforcement
- ✅ Manager role restrictions enforcement
- ✅ Tenant admin role permissions enforcement
- ✅ Role escalation attempt prevention
- ✅ Role permission validation on page navigation
- ✅ Role changes during active session handling
- ✅ Time-based access restrictions enforcement
- ✅ IP-based access restrictions for admin roles

### 10. Security and Edge Cases

- ✅ JWT token integrity validation
- ✅ Protected route access prevention when not logged in
- ✅ Intended page redirect after login
- ✅ Concurrent login attempts handling
- ✅ Network error handling during authentication
- ✅ Server error handling during authentication
- ✅ CSRF protection implementation
- ✅ Secure password requirements implementation
- ✅ Security event logging for audit purposes

## Test Files

### `login-flow.cy.js`

The main authentication test file containing all the comprehensive test scenarios listed above. This file covers:

- All authentication flows for both tenant users and platform admin
- Complete logout functionality testing
- Password reset flow with email verification
- Session persistence and timeout handling
- Multi-tenant isolation verification
- Role-based access control testing
- Security and edge case validation

### `auth-validation.cy.js`

A validation test file that verifies the test infrastructure is properly set up:

- Test fixture validation
- Page object structure verification
- Custom command availability
- Environment configuration validation
- Test data structure validation

## Test Data

### Fixtures Used

- `users.json` - Contains test users for different roles (employee, admin, HR manager, manager, platform admin)
- `tenants.json` - Contains test tenant configurations for multi-tenant testing
- `modules.json` - Contains module configuration data

### Test Users

- **Employee**: Limited access to basic HR modules
- **Tenant Admin**: Full access to all tenant modules and settings
- **HR Manager**: Access to HR-related modules and user management
- **Manager**: Access to team management and approval workflows
- **Platform Admin**: Access to platform administration features

### Test Tenants

- **testcompany**: Full-featured tenant with all modules enabled
- **secondtest**: Limited tenant for isolation testing
- **expiredcompany**: Expired tenant for license testing

## Page Objects

### `LoginPage.js`

Handles all login-related interactions:

- Login form interactions
- Error message validation
- Loading state verification
- Password reset flow

### `DashboardPage.js`

Handles dashboard and navigation:

- Module access verification
- User menu interactions
- Tenant switching
- Logout functionality

### `PlatformAdminPage.js`

Handles platform admin specific interactions:

- Platform admin navigation
- Access control verification
- Admin-specific functionality

## Custom Commands

The tests utilize numerous custom Cypress commands for:

- Authentication workflows (`loginAsTenantUser`, `loginAsPlatformAdmin`)
- API interactions (`apiRequest`, `apiLogin`)
- Data management (`cleanupTestData`, `seedTestData`)
- UI interactions (`expectSuccessMessage`, `expectErrorMessage`)
- Multi-tenant operations (`switchTenant`, `verifyTenantIsolation`)

## Running the Tests

### Prerequisites

1. Ensure the HR-SM application servers are running:

   - Main application: `http://localhost:3000`
   - Platform admin: `http://localhost:3001`
   - Backend API: `http://localhost:5000`
   - License server: `http://localhost:4000`

2. Test database should be configured and accessible

### Commands

```bash
# Run all authentication tests
npx cypress run --spec "e2e/specs/auth/**/*.cy.js"

# Run specific test file
npx cypress run --spec "e2e/specs/auth/login-flow.cy.js"

# Run tests in interactive mode
npx cypress open
```

### Environment Variables

The tests use the following environment variables (configured in `cypress.config.js`):

- `apiUrl`: Backend API URL (default: http://localhost:5000)
- `platformUrl`: Platform Admin URL (default: http://localhost:3001)
- `licenseServerUrl`: License Server URL (default: http://localhost:4000)
- `testDatabase`: Test database name (default: hr-sm-e2e-test)
- `isTestEnvironment`: Test environment flag (default: true)

## Test Results

All authentication flow tests have been implemented and validated:

- **Total Test Scenarios**: 60+ comprehensive test cases
- **Coverage Areas**: 10 major authentication and security areas
- **Test Infrastructure**: Fully validated and working
- **Documentation**: Complete with usage instructions

The tests provide comprehensive coverage of all authentication flows, security measures, and edge cases as required by Task 14 of the HR-SM Modernization Initiative.
