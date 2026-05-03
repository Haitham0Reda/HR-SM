# E2E Testing Quick Start Guide

## Setup (One-time)

1. **Install Cypress** (if not already installed):
   ```bash
   npm install
   ```

2. **Configure environment** (already done):
   - `cypress.env.json` contains all URLs
   - Test fixtures are in `e2e/fixtures/`

## Running Tests

### Start Server in Test Mode
```bash
NODE_ENV=test npm start
```
This enables the test-only API endpoints at `/api/v1/test/*`

### Run Tests
```bash
# Interactive mode (recommended for development)
npm run test:e2e:open

# Headless mode (for CI/CD)
npm run test:e2e

# Run specific suite
npm run test:e2e:auth
npm run test:e2e:hr
npm run test:e2e:isolation
```

## Writing Your First Test

### Basic Structure
```javascript
describe('My Feature', () => {
    beforeEach(() => {
        // 1. Seed test data
        cy.fixture('tenants').then((tenants) => {
            cy.seedTenant(tenants['tenant-1']._id);
        });

        // 2. Login as a role
        cy.loginAs('employee');

        // 3. Visit the page
        cy.visit(Cypress.env('HR_APP_URL') + '/my-feature');
    });

    afterEach(() => {
        // 4. Cleanup test data
        cy.fixture('tenants').then((tenants) => {
            cy.cleanupTenant(tenants['tenant-1']._id);
        });
    });

    it('should do something', () => {
        // Your test here
        cy.get('[data-cy="my-element"]').should('be.visible');
    });
});
```

## Available Roles

Use with `cy.loginAs(role)`:
- `'admin'` - Full system access
- `'hr_manager'` - HR management
- `'manager'` - Team management
- `'employee'` - Basic employee access

## Available Tenants

Use with `cy.seedTenant(tenantId)`:
```javascript
cy.fixture('tenants').then((tenants) => {
    const tenant1 = tenants['tenant-1']._id; // Test Company
    const tenant2 = tenants['tenant-2']._id; // Acme Corporation
    
    cy.seedTenant(tenant1);
});
```

## Common Patterns

### Test with Different Roles
```javascript
['admin', 'hr_manager', 'manager', 'employee'].forEach((role) => {
    it(`should work for ${role}`, () => {
        cy.loginAs(role);
        cy.visit(Cypress.env('HR_APP_URL') + '/dashboard');
        cy.get('[data-cy="dashboard"]').should('be.visible');
    });
});
```

### Multi-Tenant Isolation Test
```javascript
it('should isolate tenant data', () => {
    cy.fixture('tenants').then((tenants) => {
        // Seed both tenants
        cy.seedTenant(tenants['tenant-1']._id);
        cy.seedTenant(tenants['tenant-2']._id);

        // Login to tenant-1
        cy.loginAs('employee'); // tenant-1 employee

        // Verify isolation
        cy.visit(Cypress.env('HR_APP_URL') + '/employees');
        cy.get('[data-cy="employee-list"]')
            .should('not.contain', 'tenant-2');

        // Cleanup both
        cy.cleanupTenant(tenants['tenant-1']._id);
        cy.cleanupTenant(tenants['tenant-2']._id);
    });
});
```

### API Testing
```javascript
it('should call API endpoint', () => {
    cy.loginAs('admin');
    
    cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/api/v1/employees`,
        headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        }
    }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.be.an('array');
    });
});
```

## Environment Variables

Access in tests:
```javascript
Cypress.env('HR_APP_URL')        // http://localhost:3000
Cypress.env('PLATFORM_APP_URL')  // http://localhost:3001
Cypress.env('API_URL')           // http://localhost:5000
```

## Troubleshooting

### Test routes return 404
**Problem:** `cy.seedTenant()` or `cy.cleanupTenant()` fails with 404

**Solution:** Start server with test mode:
```bash
NODE_ENV=test npm start
```

### Authentication fails
**Problem:** `cy.loginAs()` returns 401

**Solution:** 
1. Check server is running
2. Verify API_URL in `cypress.env.json`
3. Check user exists in `e2e/fixtures/users.json`

### Data persists between tests
**Problem:** Test data from previous test affects current test

**Solution:** Always use `afterEach` to cleanup:
```javascript
afterEach(() => {
    cy.fixture('tenants').then((tenants) => {
        cy.cleanupTenant(tenants['tenant-1']._id);
    });
});
```

## Best Practices

1. ✅ **Always cleanup** - Use `afterEach` to call `cy.cleanupTenant()`
2. ✅ **Use fixtures** - Load data from `e2e/fixtures/` instead of hardcoding
3. ✅ **Use API login** - Use `cy.loginAs()` instead of UI login (faster)
4. ✅ **Use data-cy attributes** - Select elements with `[data-cy="..."]`
5. ✅ **Test isolation** - Each test should be independent
6. ✅ **Descriptive names** - Use clear test descriptions

## Need Help?

- Full documentation: `e2e/README.md`
- Example tests: `e2e/specs/test-setup/fixtures-and-commands.cy.js`
- Custom commands: `e2e/support/commands.js`
- Test routes: `server/routes/testRoutes.js`
