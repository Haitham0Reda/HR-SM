# Jest Testing Setup

This document explains how to use the Jest testing framework for the HR-SM application.

## Configuration Files

- `jest.config.js` - Main Jest configuration
- `jest.setup.js` - Test environment setup

## Available Test Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test categories
npm run test:models
npm run test:controllers
npm run test:middleware
npm run test:routes

# Run comprehensive tests with detailed reporting
npm run test:comprehensive:report
```

## Test Configuration

The Jest configuration includes:

- Node.js test environment
- Support for ES modules
- Coverage collection with multiple reporters (text, HTML, JSON, LCOV)
- JUnit XML reporting for CI/CD integration
- Coverage thresholds (80% for branches, functions, lines, and statements)
- MongoDB Memory Server for isolated database testing
- Dotenv configuration support

## Coverage Reports

After running tests with coverage, reports are generated in the `coverage/` directory:

- `coverage/lcov-report/` - HTML coverage report
- `coverage/coverage-final.json` - JSON coverage data
- `coverage/lcov.info` - LCOV coverage data

## JUnit Reports

JUnit XML reports are generated in the `test-reports/` directory for integration with CI/CD systems.

## Writing Tests

To create new tests:

1. Create a `.test.js` file (e.g., `myModule.test.js`)
2. Write your test cases using Jest syntax
3. Run tests using the appropriate npm script

Example test structure:
```javascript
describe('Module Name', () => {
  it('should perform expected behavior', async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

## Environment Variables

The test environment automatically sets:
- `MONGO_URI` - MongoDB connection string for testing
- `JWT_SECRET` - Secret for JWT token generation
- `PORT` - Server port for testing

These can be overridden in the `jest.setup.js` file.