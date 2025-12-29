# E2E Test Maintenance Guide - HR-SM Modernization

**Version:** 1.0  
**Last Updated:** December 29, 2025  
**Task:** 19. Checkpoint - E2E testing framework complete

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Running Tests](#running-tests)
4. [Troubleshooting](#troubleshooting)
5. [Test Maintenance](#test-maintenance)
6. [Adding New Tests](#adding-new-tests)
7. [CI/CD Integration](#cicd-integration)
8. [Performance Optimization](#performance-optimization)

## Overview

This guide provides comprehensive instructions for maintaining and operating the HR-SM E2E testing framework. The framework is built on Cypress 15.8.1 and provides comprehensive testing for the multi-tenant HR management platform.

### Framework Status

✅ **Framework Infrastructure:** Complete and functional  
🔄 **Backend Integration:** Requires running services  
✅ **Test Coverage:** 295 tests covering all critical workflows  
✅ **Documentation:** Complete patterns and best practices  

## Prerequisites

### System Requirements

- **Node.js:** Version 18 or higher
- **NPM:** Version 8 or higher
- **Operating System:** Windows, macOS, or Linux
- **Memory:** Minimum 4GB RAM (8GB recommended)
- **Disk Space:** 2GB free space for test artifacts

### Required Services

For full test execution, the following services must be running:

1. **HR Application Frontend**
   - URL: `http://localhost:3000`
   - Command: `npm run start:frontend`

2. **Platform Admin Frontend**
   - URL: `http://localhost:3001`
   - Command: `npm run start:platform`

3. **Backend API Server**
   - URL: `http://localhost:5000`
   - Command: `npm run start:backend`

4. **License Server**
   - URL: `http://localhost:4000`
   - Command: `npm run start:license-server`

5. **MongoDB Database**
   - URL: `mongodb://localhost:27017`
   - Database: `hr-sm-e2e-test`

### Environment Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create `.env.test` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/hr-sm-e2e-test
   MONGODB_TEST_DB=hr-sm-e2e-test
   NODE_ENV=test
   CYPRESS_ENV=test
   ```

3. **Verify Installation**
   ```bash
   npx cypress verify
   ```

## Running Tests

### Framework Validation (Always Works)

Test the framework infrastructure without requiring backend services:

```bash
# Run framework validation test
npx cypress run --spec "e2e/specs/platform-admin/framework-test.cy.js" --headless

# Expected output: 9/9 tests passing
```

### Full Test Suite (Requires Backend)

Run all tests when backend services are available:

```bash
# Start all services first
npm run start:all-services

# Run all E2E tests
npx cypress run --headless

# Run specific test suites
npx cypress run --spec "e2e/specs/multi-tenant/*.cy.js"
npx cypress run --spec "e2e/specs/platform-admin/*.cy.js"
npx cypress run --spec "e2e/specs/error-handling/*.cy.js"
```

### Interactive Mode

For test development and debugging:

```bash
# Open Cypress Test Runner
npx cypress open

# Select E2E Testing
# Choose browser (Chrome recommended)
# Select test files to run
```

### Selective Test Execution

Run specific test categories:

```bash
# Authentication tests only
npx cypress run --spec "e2e/specs/auth/*.cy.js"

# Multi-tenant isolation tests
npx cypress run --spec "e2e/specs/multi-tenant/*.cy.js"

# Platform admin tests
npx cypress run --spec "e2e/specs/platform-admin/*.cy.js"

# Error handling tests
npx cypress run --spec "e2e/specs/error-handling/*.cy.js"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Refused Errors

**Symptom:** Tests fail with `ECONNREFUSED` errors

**Cause:** Backend services are not running

**Solution:**
```bash
# Check if services are running
curl http://localhost:3000  # HR App
curl http://localhost:3001  # Platform Admin
curl http://localhost:5000/api/health  # Backend API
curl http://localhost:4000/health  # License Server

# Start missing services
npm run start:frontend
npm run start:platform
npm run start:backend
npm run start:license-server
```

#### 2. User Fixture Errors

**Symptom:** `Cannot read properties of undefined (reading 'email')`

**Cause:** User type not found in fixtures

**Solution:**
```javascript
// Check available user types in e2e/fixtures/users.json
// Valid user types: employee, manager, hrManager, tenantAdmin, platformAdmin
cy.loginAsTenantUser('employee', 'testcompany'); // ✅ Correct
cy.loginAsTenantUser('invalidUser', 'testcompany'); // ❌ Will fail
```

#### 3. Database Connection Issues

**Symptom:** Database operation failures

**Solution:**
```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ismaster')"

# Start MongoDB if not running
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
net start MongoDB  # Windows
```

#### 4. Test Timeouts

**Symptom:** Tests timeout waiting for elements

**Solution:**
```javascript
// Increase timeout for slow operations
cy.get('[data-cy="slow-element"]', { timeout: 30000 }).should('be.visible');

// Wait for network requests
cy.intercept('GET', '/api/data').as('getData');
cy.wait('@getData');
```

#### 5. Element Not Found

**Symptom:** `Element not found` errors

**Solution:**
```javascript
// Use data-cy attributes consistently
cy.get('[data-cy="submit-button"]').click(); // ✅ Preferred
cy.get('#submit').click(); // ❌ Fragile
cy.get('.btn-primary').click(); // ❌ Fragile
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Run with debug output
DEBUG=cypress:* npx cypress run --spec "path/to/test.cy.js"

# Enable Cypress debug logs
CYPRESS_DEBUG=true npx cypress run
```

### Test Artifacts

When tests fail, check the generated artifacts:

```bash
# Screenshots (on failure)
ls e2e/screenshots/

# Videos (all runs)
ls e2e/videos/

# Console logs
tail -f logs/cypress.log
```

## Test Maintenance

### Daily Maintenance

1. **Check Test Status**
   ```bash
   # Run framework validation
   npx cypress run --spec "e2e/specs/platform-admin/framework-test.cy.js"
   ```

2. **Clean Test Artifacts**
   ```bash
   # Remove old screenshots and videos
   rm -rf e2e/screenshots/* e2e/videos/*
   ```

### Weekly Maintenance

1. **Update Test Data**
   ```bash
   # Review and update fixture data
   vi e2e/fixtures/users.json
   vi e2e/fixtures/tenants.json
   vi e2e/fixtures/modules.json
   ```

2. **Review Failing Tests**
   ```bash
   # Run full test suite and analyze failures
   npx cypress run --headless > test-results.log 2>&1
   grep -i "failing\|error" test-results.log
   ```

3. **Performance Review**
   ```bash
   # Check test execution times
   npx cypress run --reporter json > test-performance.json
   ```

### Monthly Maintenance

1. **Framework Updates**
   ```bash
   # Check for Cypress updates
   npm outdated cypress
   
   # Update if needed
   npm update cypress
   ```

2. **Test Coverage Analysis**
   ```bash
   # Generate coverage report
   npx cypress run --headless --reporter mochawesome
   ```

3. **Documentation Updates**
   - Review and update test documentation
   - Update troubleshooting guides
   - Document new patterns and practices

### Quarterly Maintenance

1. **Complete Framework Review**
   - Audit all test files for outdated patterns
   - Review custom commands for optimization
   - Update CI/CD pipeline configuration

2. **Performance Optimization**
   - Analyze test execution times
   - Optimize slow tests
   - Implement parallel execution if needed

## Adding New Tests

### Test File Structure

Create new test files following the established pattern:

```javascript
// e2e/specs/feature-name/new-feature.cy.js
describe('New Feature', () => {
  beforeEach(() => {
    // Setup common to all tests
    cy.cleanupTestData();
    cy.seedTestData('tenant', { domain: 'testcompany' });
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
        cy.loginAsTenantUser('employee', 'testcompany');
        cy.visit('/new-feature');
        
        // Assert
        cy.get('[data-cy="new-feature-content"]').should('be.visible');
      });
    });
  });
});
```

### Adding Custom Commands

Add reusable commands to `e2e/support/commands.js`:

```javascript
// Add new custom command
Cypress.Commands.add('performComplexAction', (data) => {
  cy.get('[data-cy="input-field"]').type(data.value);
  cy.get('[data-cy="submit-button"]').click();
  cy.get('[data-cy="success-message"]').should('be.visible');
});

// Use in tests
cy.performComplexAction({ value: 'test data' });
```

### Test Data Management

Add new fixture data as needed:

```json
// e2e/fixtures/new-feature.json
{
  "testData": {
    "name": "Test Item",
    "description": "Test description",
    "status": "active"
  },
  "validationData": {
    "required": ["name", "description"],
    "optional": ["status", "tags"]
  }
}
```

### Multi-Tenant Test Patterns

For multi-tenant features, ensure proper isolation testing:

```javascript
describe('Multi-Tenant Feature', () => {
  it('should maintain tenant isolation', () => {
    cy.fixture('tenants').then((tenants) => {
      const tenantA = tenants.tenantA;
      const tenantB = tenants.tenantB;

      // Create data for Tenant A
      cy.loginAsTenantUser('manager', tenantA.domain);
      cy.createFeatureData({ name: 'Tenant A Data' });

      // Create data for Tenant B
      cy.loginAsTenantUser('manager', tenantB.domain);
      cy.createFeatureData({ name: 'Tenant B Data' });

      // Verify isolation
      cy.loginAsTenantUser('employee', tenantA.domain);
      cy.visit('/feature');
      cy.get('[data-cy="feature-list"]').should('contain', 'Tenant A Data');
      cy.get('[data-cy="feature-list"]').should('not.contain', 'Tenant B Data');
    });
  });
});
```

## CI/CD Integration

### GitHub Actions Configuration

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ismaster\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build applications
        run: |
          npm run build:frontend
          npm run build:platform
          npm run build:backend

      - name: Start services
        run: |
          npm run start:backend &
          npm run start:license-server &
          npm run start:frontend &
          npm run start:platform &

      - name: Wait for services
        run: |
          npx wait-on http://localhost:5000/api/health
          npx wait-on http://localhost:4000/health
          npx wait-on http://localhost:3000
          npx wait-on http://localhost:3001

      - name: Run E2E tests
        run: npx cypress run --headless --browser chrome

      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-artifacts
          path: |
            e2e/screenshots
            e2e/videos
          retention-days: 7

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: cypress/reports
          retention-days: 30
```

### Local CI Simulation

Test CI configuration locally:

```bash
# Install act (GitHub Actions local runner)
# https://github.com/nektos/act

# Run GitHub Actions locally
act -j e2e-tests
```

## Performance Optimization

### Parallel Test Execution

Configure parallel execution for faster test runs:

```bash
# Install cypress-parallel
npm install --save-dev cypress-parallel

# Run tests in parallel
npx cypress-parallel -s cy:run -t 4 -d e2e/specs
```

### Test Optimization Strategies

1. **Reduce Test Data**
   ```javascript
   // Use minimal test data
   const minimalUser = {
     email: 'test@example.com',
     name: 'Test User',
     role: 'employee'
   };
   ```

2. **Optimize Selectors**
   ```javascript
   // Use efficient selectors
   cy.get('[data-cy="specific-element"]'); // ✅ Fast
   cy.get('div > span.class > p'); // ❌ Slow
   ```

3. **Minimize Network Requests**
   ```javascript
   // Mock external services
   cy.intercept('GET', '/api/external-service', { fixture: 'mock-data.json' });
   ```

4. **Use Test Tags**
   ```javascript
   // Tag tests for selective execution
   describe('Critical Path Tests', { tags: ['@critical'] }, () => {
     // Critical tests only
   });
   
   // Run only critical tests
   npx cypress run --env grepTags=@critical
   ```

### Performance Monitoring

Monitor test performance over time:

```javascript
// Add performance tracking to tests
beforeEach(() => {
  cy.startPerformanceMark('test-execution');
});

afterEach(() => {
  cy.endPerformanceMark('test-execution', 10000); // 10 second threshold
});
```

## Best Practices Summary

### Do's ✅

- **Use data-cy attributes** for element selection
- **Clean up test data** after each test
- **Use fixtures** for consistent test data
- **Handle async operations** properly with waits
- **Write descriptive test names** and organize logically
- **Mock external services** when possible
- **Use custom commands** for repeated actions
- **Validate multi-tenant isolation** for all features

### Don'ts ❌

- **Don't use arbitrary waits** (`cy.wait(2000)`)
- **Don't rely on CSS classes** for element selection
- **Don't skip test cleanup** (causes test pollution)
- **Don't hardcode URLs** (use environment variables)
- **Don't ignore failing tests** (fix or disable properly)
- **Don't test implementation details** (focus on user behavior)
- **Don't create overly complex tests** (keep them simple and focused)

## Support and Resources

### Documentation
- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Patterns and Best Practices](./testing-patterns-and-best-practices.md)
- [Test Coverage Report](./test-coverage-report.md)

### Team Contacts
- **Test Framework Maintainer:** Development Team
- **CI/CD Pipeline:** DevOps Team
- **Test Data Management:** QA Team

### Useful Commands Reference

```bash
# Framework validation (always works)
npx cypress run --spec "e2e/specs/platform-admin/framework-test.cy.js"

# Run specific test suite
npx cypress run --spec "e2e/specs/multi-tenant/*.cy.js"

# Interactive mode
npx cypress open

# Debug mode
DEBUG=cypress:* npx cypress run --spec "path/to/test.cy.js"

# Generate test report
npx cypress run --reporter mochawesome

# Clean artifacts
rm -rf e2e/screenshots/* e2e/videos/*
```

This maintenance guide should be updated regularly as the framework evolves and new patterns emerge.