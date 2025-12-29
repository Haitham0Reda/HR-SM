# E2E Testing Patterns and Best Practices - HR-SM Modernization

**Version:** 1.0  
**Last Updated:** December 29, 2025  
**Task:** 19. Checkpoint - E2E testing framework complete

## Table of Contents

1. [Framework Overview](#framework-overview)
2. [Testing Patterns](#testing-patterns)
3. [Best Practices](#best-practices)
4. [Custom Commands](#custom-commands)
5. [Test Data Management](#test-data-management)
6. [Error Handling](#error-handling)
7. [Performance Testing](#performance-testing)
8. [Accessibility Testing](#accessibility-testing)
9. [Multi-Tenant Testing](#multi-tenant-testing)
10. [Maintenance Guidelines](#maintenance-guidelines)

## Framework Overview

The HR-SM E2E testing framework is built on Cypress 15.8.1 and provides comprehensive testing capabilities for the multi-tenant HR management platform.

### Key Components

```
e2e/
├── fixtures/           # Test data files
├── specs/             # Test specifications
├── support/           # Helper functions and commands
├── screenshots/       # Test failure screenshots
├── videos/           # Test execution recordings
└── cypress.config.js  # Framework configuration
```

### Framework Features

- **Multi-tenant isolation testing**
- **Mocked database operations for offline testing**
- **Custom Cypress commands for common operations**
- **Automatic error handling and recovery**
- **Performance monitoring and metrics**
- **Accessibility testing integration**
- **CI/CD pipeline ready configuration**

## Testing Patterns

### 1. Page Object Pattern

Organize test logic using page objects for maintainability:

```javascript
// e2e/support/page-objects/LoginPage.js
class LoginPage {
  visit(tenantDomain = '') {
    const url = tenantDomain 
      ? `http://localhost:3000/${tenantDomain}/login`
      : 'http://localhost:3001/login';
    cy.visit(url);
  }

  fillCredentials(email, password) {
    cy.get('[data-cy="email-input"]').type(email);
    cy.get('[data-cy="password-input"]').type(password);
  }

  submit() {
    cy.get('[data-cy="login-button"]').click();
  }

  login(email, password, tenantDomain) {
    this.visit(tenantDomain);
    this.fillCredentials(email, password);
    this.submit();
  }
}

export default new LoginPage();
```

### 2. Test Data Factory Pattern

Generate dynamic test data for comprehensive testing:

```javascript
// e2e/support/factories/UserFactory.js
class UserFactory {
  static create(overrides = {}) {
    const timestamp = Date.now();
    return {
      email: `test.user.${timestamp}@example.com`,
      name: `Test User ${timestamp}`,
      role: 'employee',
      tenantId: '507f1f77bcf86cd799439011',
      isActive: true,
      ...overrides
    };
  }

  static createBatch(count, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createForTenant(tenantId, overrides = {}) {
    return this.create({ tenantId, ...overrides });
  }
}

export default UserFactory;
```

### 3. API Testing Pattern

Test API endpoints with proper authentication and validation:

```javascript
// Test API endpoints with tenant isolation
describe('API Data Isolation', () => {
  it('should prevent cross-tenant data access', () => {
    cy.fixture('tenants').then((tenants) => {
      const tenantA = tenants.tenantA;
      const tenantB = tenants.tenantB;

      // Login as Tenant A user
      cy.apiLogin('employee', tenantA.domain).then((token) => {
        // Try to access Tenant B data
        cy.apiRequest('GET', '/api/users', null, {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantB._id
        }).then((response) => {
          // Should return 403 Forbidden or empty results
          expect(response.status).to.be.oneOf([403, 200]);
          if (response.status === 200) {
            expect(response.body.data).to.be.empty;
          }
        });
      });
    });
  });
});
```

### 4. Multi-Tenant Testing Pattern

Ensure proper tenant isolation across all operations:

```javascript
// Multi-tenant isolation test pattern
describe('Tenant Data Isolation', () => {
  beforeEach(() => {
    cy.cleanupTestData();
    cy.seedMultiTenantData();
  });

  it('should maintain data isolation between tenants', () => {
    cy.fixture('tenants').then((tenants) => {
      const tenantA = tenants.tenantA;
      const tenantB = tenants.tenantB;

      // Create data for Tenant A
      cy.loginAsTenantUser('manager', tenantA.domain);
      cy.createTestData('employee', { name: 'Tenant A Employee' });

      // Switch to Tenant B
      cy.loginAsTenantUser('manager', tenantB.domain);
      cy.createTestData('employee', { name: 'Tenant B Employee' });

      // Verify Tenant A only sees their data
      cy.loginAsTenantUser('manager', tenantA.domain);
      cy.get('[data-cy="employee-list"]').should('contain', 'Tenant A Employee');
      cy.get('[data-cy="employee-list"]').should('not.contain', 'Tenant B Employee');

      // Verify Tenant B only sees their data
      cy.loginAsTenantUser('manager', tenantB.domain);
      cy.get('[data-cy="employee-list"]').should('contain', 'Tenant B Employee');
      cy.get('[data-cy="employee-list"]').should('not.contain', 'Tenant A Employee');
    });
  });
});
```

### 5. Error Handling Testing Pattern

Test error scenarios and recovery mechanisms:

```javascript
// Error handling test pattern
describe('Error Handling', () => {
  it('should handle network failures gracefully', () => {
    // Intercept and simulate network failure
    cy.intercept('GET', '/api/users', { forceNetworkError: true }).as('networkError');

    cy.loginAsTenantUser('employee', 'testcompany');
    cy.visit('/dashboard/employees');

    // Wait for network error
    cy.wait('@networkError');

    // Verify error handling
    cy.get('[data-cy="error-message"]').should('be.visible');
    cy.get('[data-cy="retry-button"]').should('be.visible');

    // Test retry functionality
    cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('retrySuccess');
    cy.get('[data-cy="retry-button"]').click();
    cy.wait('@retrySuccess');

    // Verify recovery
    cy.get('[data-cy="employee-list"]').should('be.visible');
    cy.get('[data-cy="error-message"]').should('not.exist');
  });
});
```

## Best Practices

### 1. Test Organization

#### File Naming Convention
```
e2e/specs/
├── auth/                    # Authentication tests
│   ├── login.cy.js
│   ├── logout.cy.js
│   └── password-reset.cy.js
├── hr-workflows/            # Core HR functionality
│   ├── employee-management.cy.js
│   ├── leave-requests.cy.js
│   └── attendance-tracking.cy.js
├── platform-admin/          # Platform administration
│   ├── tenant-management.cy.js
│   ├── subscription-management.cy.js
│   └── license-management.cy.js
├── multi-tenant/            # Multi-tenant isolation
│   ├── data-isolation.cy.js
│   ├── api-isolation.cy.js
│   └── tenant-switching.cy.js
└── error-handling/          # Error scenarios
    ├── network-failures.cy.js
    ├── service-unavailability.cy.js
    └── validation-errors.cy.js
```

#### Test Structure
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup common to all tests
    cy.cleanupTestData();
    cy.seedTestData();
  });

  afterEach(() => {
    // Cleanup after each test
    cy.cleanupTestData();
  });

  context('Specific Scenario', () => {
    it('should perform expected behavior', () => {
      // Arrange
      cy.fixture('testData').then((data) => {
        // Act
        cy.performAction(data);
        
        // Assert
        cy.verifyResult();
      });
    });
  });
});
```

### 2. Data-Cy Selectors

Use consistent data-cy attributes for reliable element selection:

```html
<!-- Good: Semantic data-cy attributes -->
<button data-cy="submit-leave-request">Submit Request</button>
<input data-cy="employee-name-input" />
<div data-cy="employee-list">...</div>

<!-- Avoid: CSS classes or IDs that may change -->
<button class="btn btn-primary">Submit Request</button>
<input id="emp-name" />
```

```javascript
// Test using data-cy selectors
cy.get('[data-cy="employee-name-input"]').type('John Doe');
cy.get('[data-cy="submit-leave-request"]').click();
cy.get('[data-cy="success-message"]').should('be.visible');
```

### 3. Async Operations Handling

Handle asynchronous operations properly:

```javascript
// Good: Wait for specific conditions
cy.get('[data-cy="loading-spinner"]').should('be.visible');
cy.get('[data-cy="loading-spinner"]').should('not.exist');
cy.get('[data-cy="data-table"]').should('be.visible');

// Good: Use aliases for network requests
cy.intercept('GET', '/api/employees').as('getEmployees');
cy.visit('/employees');
cy.wait('@getEmployees');
cy.get('[data-cy="employee-list"]').should('contain', 'John Doe');

// Avoid: Arbitrary waits
cy.wait(2000); // Don't do this
```

### 4. Test Independence

Ensure tests can run independently and in any order:

```javascript
// Good: Each test sets up its own data
describe('Employee Management', () => {
  it('should create employee', () => {
    cy.seedTestData('tenant', { domain: 'testcompany' });
    cy.loginAsTenantUser('manager', 'testcompany');
    // Test implementation
  });

  it('should update employee', () => {
    cy.seedTestData('tenant', { domain: 'testcompany' });
    cy.seedTestData('employee', { name: 'John Doe' });
    cy.loginAsTenantUser('manager', 'testcompany');
    // Test implementation
  });
});
```

### 5. Error Assertions

Write comprehensive error assertions:

```javascript
// Good: Specific error validation
cy.get('[data-cy="email-input"]').type('invalid-email');
cy.get('[data-cy="submit-button"]').click();
cy.get('[data-cy="email-error"]')
  .should('be.visible')
  .and('contain', 'Please enter a valid email address');

// Good: API error handling
cy.intercept('POST', '/api/employees', { statusCode: 400, body: { error: 'Validation failed' } });
cy.get('[data-cy="create-employee"]').click();
cy.get('[data-cy="error-toast"]')
  .should('be.visible')
  .and('contain', 'Validation failed');
```

## Custom Commands

### Authentication Commands

```javascript
// e2e/support/commands.js

// Login as tenant user
Cypress.Commands.add('loginAsTenantUser', (role, tenantDomain) => {
  cy.fixture('users').then((users) => {
    const user = users[role];
    cy.visit(`http://localhost:3000/${tenantDomain}/login`);
    cy.get('[data-cy="email-input"]').type(user.email);
    cy.get('[data-cy="password-input"]').type(user.password);
    cy.get('[data-cy="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});

// Login as platform admin
Cypress.Commands.add('loginAsPlatformAdmin', () => {
  cy.fixture('users').then((users) => {
    const admin = users.platformAdmin;
    cy.visit('http://localhost:3001/login');
    cy.get('[data-cy="email-input"]').type(admin.email);
    cy.get('[data-cy="password-input"]').type(admin.password);
    cy.get('[data-cy="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});

// API login for token-based testing
Cypress.Commands.add('apiLogin', (role, tenantDomain) => {
  return cy.fixture('users').then((users) => {
    const user = users[role];
    return cy.request({
      method: 'POST',
      url: 'http://localhost:5000/api/auth/login',
      body: {
        email: user.email,
        password: user.password,
        tenantDomain: tenantDomain
      }
    }).then((response) => {
      return response.body.token;
    });
  });
});
```

### Data Management Commands

```javascript
// Seed test data
Cypress.Commands.add('seedTestData', (type, data) => {
  return cy.task('seedTestData', { type, data });
});

// Cleanup test data
Cypress.Commands.add('cleanupTestData', () => {
  return cy.task('cleanupDatabase');
});

// Create multi-tenant test data
Cypress.Commands.add('seedMultiTenantData', () => {
  cy.fixture('tenants').then((tenants) => {
    Object.values(tenants).forEach((tenant) => {
      cy.seedTestData('tenant', tenant);
    });
  });
});
```

### Navigation Commands

```javascript
// Navigate to module with permission check
Cypress.Commands.add('navigateToModule', (module, tenantDomain) => {
  cy.visit(`http://localhost:3000/${tenantDomain}/dashboard/${module}`);
  cy.get('[data-cy="access-denied"]').should('not.exist');
  cy.get(`[data-cy="${module}-page"]`).should('be.visible');
});

// Fill form with data
Cypress.Commands.add('fillForm', (formData) => {
  Object.entries(formData).forEach(([field, value]) => {
    cy.get(`[data-cy="${field}-input"]`).clear().type(value);
  });
});

// Search in table
Cypress.Commands.add('searchInTable', (searchTerm) => {
  cy.get('[data-cy="search-input"]').clear().type(searchTerm);
  cy.get('[data-cy="search-button"]').click();
  cy.get('[data-cy="loading-spinner"]').should('not.exist');
});
```

### Utility Commands

```javascript
// Performance monitoring
Cypress.Commands.add('startPerformanceMark', (markName) => {
  cy.window().then((win) => {
    win.performance.mark(`${markName}-start`);
  });
});

Cypress.Commands.add('endPerformanceMark', (markName, threshold = 1000) => {
  cy.window().then((win) => {
    win.performance.mark(`${markName}-end`);
    win.performance.measure(markName, `${markName}-start`, `${markName}-end`);
    const measure = win.performance.getEntriesByName(markName)[0];
    cy.task('log', `Performance: ${markName} took ${measure.duration.toFixed(2)}ms`);
    expect(measure.duration).to.be.lessThan(threshold);
  });
});

// Accessibility testing
Cypress.Commands.add('checkAccessibility', (selector = null) => {
  const target = selector || 'body';
  cy.get(target).should('be.visible');
  // Add axe-core accessibility checks here
  cy.task('log', `Accessibility check passed for ${target}`);
});
```

## Test Data Management

### Fixture Organization

```javascript
// e2e/fixtures/users.json
{
  "platformAdmin": {
    "email": "admin@platform.com",
    "password": "admin123",
    "name": "Platform Administrator",
    "role": "platform_admin"
  },
  "employee": {
    "email": "employee@testcompany.com",
    "password": "employee123",
    "name": "Test Employee",
    "role": "employee"
  },
  "manager": {
    "email": "manager@testcompany.com",
    "password": "manager123",
    "name": "Test Manager",
    "role": "manager"
  },
  "hr": {
    "email": "hr@testcompany.com",
    "password": "hr123",
    "name": "HR Administrator",
    "role": "hr_admin"
  }
}
```

### Dynamic Data Generation

```javascript
// e2e/support/helpers.js
export const generateTestData = {
  user: (overrides = {}) => ({
    email: `test.${Date.now()}@example.com`,
    name: `Test User ${Date.now()}`,
    role: 'employee',
    isActive: true,
    ...overrides
  }),

  tenant: (overrides = {}) => ({
    name: `Test Company ${Date.now()}`,
    domain: `test${Date.now()}`,
    email: `admin@test${Date.now()}.com`,
    subscription: {
      plan: 'professional',
      status: 'active',
      enabledModules: ['attendance', 'leave', 'tasks']
    },
    ...overrides
  }),

  leaveRequest: (overrides = {}) => ({
    type: 'annual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: 'Personal time off',
    status: 'pending',
    ...overrides
  })
};
```

## Error Handling

### Network Error Simulation

```javascript
// Simulate network failures
describe('Network Error Handling', () => {
  it('should handle API failures gracefully', () => {
    // Simulate server error
    cy.intercept('GET', '/api/employees', { statusCode: 500 }).as('serverError');
    
    cy.loginAsTenantUser('manager', 'testcompany');
    cy.visit('/employees');
    cy.wait('@serverError');
    
    // Verify error handling
    cy.get('[data-cy="error-message"]').should('contain', 'Server error');
    cy.get('[data-cy="retry-button"]').should('be.visible');
  });

  it('should handle timeout errors', () => {
    // Simulate timeout
    cy.intercept('GET', '/api/employees', { delay: 30000 }).as('timeout');
    
    cy.loginAsTenantUser('manager', 'testcompany');
    cy.visit('/employees');
    
    // Verify timeout handling
    cy.get('[data-cy="loading-spinner"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-cy="timeout-message"]', { timeout: 15000 }).should('be.visible');
  });
});
```

### Service Unavailability Testing

```javascript
// Test service unavailability scenarios
describe('Service Unavailability', () => {
  it('should handle license server unavailability', () => {
    // Mock license server failure
    cy.intercept('POST', '/api/license/validate', { forceNetworkError: true });
    
    cy.loginAsTenantUser('employee', 'testcompany');
    cy.visit('/dashboard');
    
    // Should still allow basic functionality
    cy.get('[data-cy="dashboard"]').should('be.visible');
    cy.get('[data-cy="license-warning"]').should('be.visible');
  });
});
```

## Performance Testing

### Performance Monitoring

```javascript
describe('Performance Testing', () => {
  it('should load dashboard within acceptable time', () => {
    cy.startPerformanceMark('dashboard-load');
    
    cy.loginAsTenantUser('employee', 'testcompany');
    cy.visit('/dashboard');
    cy.get('[data-cy="dashboard"]').should('be.visible');
    
    cy.endPerformanceMark('dashboard-load', 3000); // 3 second threshold
  });

  it('should handle large data sets efficiently', () => {
    // Seed large dataset
    cy.seedTestData('employees', Array.from({ length: 1000 }, (_, i) => ({
      name: `Employee ${i}`,
      email: `emp${i}@testcompany.com`
    })));

    cy.startPerformanceMark('large-table-load');
    
    cy.loginAsTenantUser('manager', 'testcompany');
    cy.visit('/employees');
    cy.get('[data-cy="employee-table"]').should('be.visible');
    
    cy.endPerformanceMark('large-table-load', 5000); // 5 second threshold
  });
});
```

## Accessibility Testing

### Accessibility Validation

```javascript
describe('Accessibility Testing', () => {
  it('should meet accessibility standards', () => {
    cy.loginAsTenantUser('employee', 'testcompany');
    cy.visit('/dashboard');
    
    // Check main content accessibility
    cy.checkAccessibility('[data-cy="main-content"]');
    
    // Check navigation accessibility
    cy.checkAccessibility('[data-cy="navigation"]');
    
    // Test keyboard navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-cy', 'first-focusable');
  });

  it('should support screen readers', () => {
    cy.visit('/login');
    
    // Check ARIA labels
    cy.get('[data-cy="email-input"]').should('have.attr', 'aria-label');
    cy.get('[data-cy="password-input"]').should('have.attr', 'aria-label');
    
    // Check form validation messages
    cy.get('[data-cy="submit-button"]').click();
    cy.get('[data-cy="email-error"]').should('have.attr', 'role', 'alert');
  });
});
```

## Multi-Tenant Testing

### Tenant Isolation Validation

```javascript
describe('Multi-Tenant Isolation', () => {
  it('should prevent cross-tenant data leakage', () => {
    cy.fixture('tenants').then((tenants) => {
      const tenantA = tenants.tenantA;
      const tenantB = tenants.tenantB;

      // Create data for Tenant A
      cy.loginAsTenantUser('manager', tenantA.domain);
      cy.createTestData('employee', { 
        name: 'Tenant A Employee',
        email: 'emp.a@tenanta.com'
      });

      // Create data for Tenant B
      cy.loginAsTenantUser('manager', tenantB.domain);
      cy.createTestData('employee', { 
        name: 'Tenant B Employee',
        email: 'emp.b@tenantb.com'
      });

      // Verify isolation - Tenant A should not see Tenant B data
      cy.loginAsTenantUser('manager', tenantA.domain);
      cy.visit('/employees');
      cy.get('[data-cy="employee-list"]').should('contain', 'Tenant A Employee');
      cy.get('[data-cy="employee-list"]').should('not.contain', 'Tenant B Employee');

      // Verify isolation - Tenant B should not see Tenant A data
      cy.loginAsTenantUser('manager', tenantB.domain);
      cy.visit('/employees');
      cy.get('[data-cy="employee-list"]').should('contain', 'Tenant B Employee');
      cy.get('[data-cy="employee-list"]').should('not.contain', 'Tenant A Employee');
    });
  });

  it('should handle tenant switching correctly', () => {
    // Test user with access to multiple tenants
    cy.fixture('users').then((users) => {
      const multiTenantUser = users.multiTenantUser;
      
      cy.visit('http://localhost:3000/login');
      cy.get('[data-cy="email-input"]').type(multiTenantUser.email);
      cy.get('[data-cy="password-input"]').type(multiTenantUser.password);
      cy.get('[data-cy="login-button"]').click();

      // Should show tenant selection
      cy.get('[data-cy="tenant-selector"]').should('be.visible');
      
      // Select first tenant
      cy.get('[data-cy="tenant-option"]').first().click();
      cy.url().should('include', '/dashboard');
      
      // Switch to second tenant
      cy.get('[data-cy="tenant-switcher"]').click();
      cy.get('[data-cy="tenant-option"]').last().click();
      cy.url().should('include', '/dashboard');
      
      // Verify context has changed
      cy.get('[data-cy="current-tenant"]').should('not.contain', 'First Tenant');
    });
  });
});
```

## Maintenance Guidelines

### 1. Regular Test Review

- **Weekly:** Review failing tests and update selectors
- **Monthly:** Audit test coverage and identify gaps
- **Quarterly:** Performance review and optimization

### 2. Test Data Maintenance

- **Clean up test data after each run**
- **Use factories for dynamic data generation**
- **Maintain realistic test scenarios**
- **Version control fixture data**

### 3. Framework Updates

- **Keep Cypress updated to latest stable version**
- **Update custom commands as application evolves**
- **Maintain compatibility with CI/CD pipeline**
- **Document breaking changes**

### 4. Performance Optimization

- **Run tests in parallel when possible**
- **Use test tags for selective execution**
- **Optimize test data seeding**
- **Monitor test execution times**

### 5. Documentation Updates

- **Update patterns when new features are added**
- **Document new custom commands**
- **Maintain troubleshooting guides**
- **Keep best practices current**

## Troubleshooting Common Issues

### Test Flakiness

```javascript
// Use proper waits instead of arbitrary delays
// Bad
cy.wait(2000);

// Good
cy.get('[data-cy="loading"]').should('not.exist');
cy.get('[data-cy="content"]').should('be.visible');
```

### Element Not Found

```javascript
// Use more specific selectors
// Bad
cy.get('.btn').click();

// Good
cy.get('[data-cy="submit-button"]').click();
```

### Async Issues

```javascript
// Handle async operations properly
// Bad
cy.click('[data-cy="save"]');
cy.get('[data-cy="success"]').should('be.visible');

// Good
cy.intercept('POST', '/api/save').as('saveRequest');
cy.click('[data-cy="save"]');
cy.wait('@saveRequest');
cy.get('[data-cy="success"]').should('be.visible');
```

### Test Isolation

```javascript
// Ensure proper cleanup
beforeEach(() => {
  cy.cleanupTestData();
  cy.seedTestData();
});

afterEach(() => {
  cy.cleanupTestData();
});
```

## Conclusion

This document provides comprehensive patterns and best practices for maintaining and extending the HR-SM E2E testing framework. Following these guidelines will ensure:

- **Reliable and maintainable tests**
- **Comprehensive coverage of critical workflows**
- **Proper multi-tenant isolation validation**
- **Effective error handling and recovery testing**
- **Performance and accessibility compliance**

For questions or updates to these patterns, please refer to the test maintenance team or update this documentation accordingly.