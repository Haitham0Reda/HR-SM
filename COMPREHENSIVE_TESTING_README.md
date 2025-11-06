# Comprehensive Jest Testing Setup

This document explains how to use the comprehensive Jest testing framework for all models, controllers, middleware, and routes with detailed reporting.

## Test Structure

The tests are organized in the `__tests__` directory with the following structure:

```
__tests__/
├── models/          # Model tests (data validation, business logic)
├── controllers/     # Controller tests (request handling, business logic)
├── middleware/      # Middleware tests (authentication, authorization)
└── routes/          # Route tests (API endpoints integration)
```

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
npm run test:comprehensive:full
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

1. Create a `.test.js` file in the appropriate directory under `__tests__/`
2. Write your test cases using Jest syntax
3. Run tests using the appropriate npm script

Example test structure:
```javascript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MyModel from '../../server/models/myModel.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('My Model', () => {
  afterEach(async () => {
    await MyModel.deleteMany({});
  });

  it('should perform expected behavior', async () => {
    // Test implementation
    const testData = { /* test data */ };
    const model = new MyModel(testData);
    const savedModel = await model.save();
    
    expect(savedModel.field).toBe(expectedValue);
  });
});
```

## Environment Variables

The test environment automatically sets:
- `MONGO_URI` - MongoDB connection string for testing
- `JWT_SECRET` - Secret for JWT token generation
- `PORT` - Server port for testing

These can be overridden in the `jest.setup.js` file.

## Test Categories

### Models
Test data models, validation, and business logic.

### Controllers
Test request handling, business logic, and response formatting.

### Middleware
Test authentication, authorization, and request processing functions.

### Routes
Test API endpoints and their integration with controllers and middleware.

## Reporting

The comprehensive test report includes:
- Test execution results for each category
- Code coverage statistics
- Detailed failure analysis
- Performance metrics