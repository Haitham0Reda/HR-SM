# HR-SM API Testing Suite

## Overview

This directory contains all the automated testing scripts for the HR-SM API. The testing suite includes multiple approaches to evaluate API functionality, authentication, and performance.

## Test Scripts

### 1. Basic Route Testing
- **File**: [test-routes.js](file:///D:/work/HR-SM/server/testing/test-routes.js)
- **Command**: `npm run test:routes`
- **Purpose**: Tests all API endpoints without authentication
- **Focus**: Verifies route existence and basic functionality

### 2. Authenticated Route Testing
- **File**: [test-authenticated-routes.js](file:///D:/work/HR-SM/server/testing/test-authenticated-routes.js)
- **Command**: `npm run test:auth`
- **Purpose**: Tests all API endpoints with proper authentication
- **Focus**: Verifies functionality with different user roles

### 3. Comprehensive Route Testing
- **File**: [test-all-routes.js](file:///D:/work/HR-SM/server/testing/test-all-routes.js)
- **Command**: `npm run test:comprehensive`
- **Purpose**: Enhanced testing with detailed categorization and reporting
- **Focus**: Detailed analysis with markdown report generation

### 4. All Tests Runner
- **File**: [run-all-api-tests.js](file:///D:/work/HR-SM/server/testing/run-all-api-tests.js)
- **Command**: `npm run test:all`
- **Purpose**: Runs all test suites and generates organized reports
- **Focus**: Complete testing workflow automation

### 5. Route Conflict Fix Demonstrator
- **File**: [fix-route-conflicts.js](file:///D:/work/HR-SM/server/testing/fix-route-conflicts.js)
- **Command**: `node server/testing/fix-route-conflicts.js`
- **Purpose**: Demonstrates solutions for route conflicts
- **Focus**: Shows how to resolve named route vs ID-based route conflicts

### 6. Route Fixes Verification
- **File**: [verify-route-fixes.js](file:///D:/work/HR-SM/server/testing/verify-route-fixes.js)
- **Command**: `node server/testing/verify-route-fixes.js`
- **Purpose**: Verifies that route conflict fixes are working correctly
- **Focus**: Tests specific routes that had conflicts to ensure they're now working properly

### 7. Seed Data Verification
- **File**: [verify-seed-data.js](file:///D:/work/HR-SM/server/testing/verify-seed-data.js)
- **Command**: `node server/testing/verify-seed-data.js`
- **Purpose**: Verifies that seed data was created correctly
- **Focus**: Checks that all data for attendance, holiday, events, report, request, and mixed vacations exists in the database

## How to Run Tests

### Prerequisites
1. Server must be running (`npm run server`)
2. MongoDB must be connected
3. Database must be seeded (`npm run seed`)

### Running Individual Tests
```bash
# Run basic route tests (no authentication)
npm run test:routes

# Run authenticated route tests
npm run test:auth

# Run comprehensive tests with detailed reporting
npm run test:comprehensive

# Run all tests and generate organized reports
npm run test:all

# Run route conflict fix demonstrator
node server/testing/fix-route-conflicts.js

# Run route fixes verification
node server/testing/verify-route-fixes.js

# Run seed data verification
node server/testing/verify-seed-data.js
```

### Running Tests with Server
```bash
# Seed database
npm run seed

# Start server in background
npm run server &

# Run comprehensive tests
npm run test:comprehensive
```

## Common Route Issues and Fixes

### Route Parameter Conflicts
Several endpoints experience conflicts between named routes and ID-based routes. These have been fixed by reordering routes:

1. **User Routes**: `/api/users/profile` now correctly matches before `/:id`
2. **Announcement Routes**: `/api/announcements/active` now correctly matches before `/:id`

### Best Practices Implemented
1. Specific named routes are placed BEFORE parameterized routes
2. Route hierarchy is organized logically
3. Consistent naming conventions are maintained

## Test Results

Test results are automatically generated and saved in the following locations:
- Root directory: `API_TEST_RESULTS_FULL.md` (detailed results)
- Root directory: `API_TEST_COMPREHENSIVE_SUMMARY.md` (combined analysis)
- When using `run-all-api-tests.js`: `test-reports/` directory with individual test outputs

## Test Credentials

The tests use predefined user accounts with different roles:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cic.edu.eg | admin123 |
| HR | hr@cic.edu.eg | hr123 |
| Manager | manager@cic.edu.eg | manager123 |
| Employee | john.doe@cic.edu.eg | employee123 |

## Recent Fixes

### Announcement Routes Fix
A fix has been implemented for the announcement routes conflict:
- **Issue**: `/api/announcements/active` was conflicting with the `/:id` route
- **Solution**: Route reordering in `server/routes/announcement.routes.js` to place specific routes before parameterized routes
- **Status**: The fix is implemented in the code

### Route Organization Best Practices
1. Specific named routes are placed BEFORE parameterized routes
2. Route hierarchy is organized logically
3. Consistent naming conventions are maintained

## Contributing

To add new tests:
1. Add test functions in [test-all-routes.js](file:///D:/work/HR-SM/server/testing/test-all-routes.js)
2. Update the test categories documentation
3. Ensure new tests follow the existing pattern
4. Verify markdown report generation works correctly

## License

This testing suite is part of the HR-SM project and follows the same license terms.