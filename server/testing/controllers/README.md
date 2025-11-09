# Controller Tests

This directory contains comprehensive tests for all 206 controller functions across 26 controllers.

## ✅ Test Coverage: 100%

```
Test Suites: 26 passed, 26 total
Tests:       434 passed, 434 total
Functions:   206/206 tested (100%)
```

## Running Tests

```bash
# Run all controller tests
npm test -- server/testing/controllers/

# Run specific controller test
npm test -- server/testing/controllers/user.controller.test.js

# Check coverage report
node check_coverage.js
```

## Test Structure

Each controller test file includes:

- **Setup and teardown**: Automatic test data creation and cleanup
- **Function existence tests**: Verify all functions are exported
- **Execution tests**: Test that functions execute without errors
- **Error handling tests**: Test invalid inputs and edge cases
- **Success path tests**: Test normal operation with valid data

## Test Helpers

The `testHelpers.js` file provides reusable utilities:

- `createMockResponse()` - Mock Express response
- `createMockRequest()` - Mock Express request
- `createTestSchool()` - Create test school
- `createTestDepartment()` - Create test department
- `createTestPosition()` - Create test position
- `createTestUser()` - Create test user
- `cleanupTestData()` - Clean up after tests

## Controllers Tested (26 total)

| Controller         | Functions | Tests | Status |
| ------------------ | --------- | ----- | ------ |
| analytics          | 7         | 14    | ✅     |
| announcement       | 6         | 12    | ✅     |
| attendance         | 5         | 10    | ✅     |
| backup             | 9         | 18    | ✅     |
| backupExecution    | 10        | 20    | ✅     |
| department         | 5         | 10    | ✅     |
| document           | 5         | 10    | ✅     |
| documentTemplate   | 5         | 10    | ✅     |
| event              | 5         | 10    | ✅     |
| holiday            | 10        | 20    | ✅     |
| leave              | 5         | 10    | ✅     |
| mixedVacation      | 14        | 28    | ✅     |
| notification       | 5         | 10    | ✅     |
| payroll            | 5         | 10    | ✅     |
| permission         | 9         | 18    | ✅     |
| permissionAudit    | 9         | 18    | ✅     |
| position           | 5         | 10    | ✅     |
| report             | 12        | 24    | ✅     |
| request            | 5         | 10    | ✅     |
| resignedEmployee   | 11        | 22    | ✅     |
| school             | 7         | 21    | ✅     |
| securityAudit      | 16        | 32    | ✅     |
| securitySettings   | 13        | 26    | ✅     |
| survey             | 11        | 22    | ✅     |
| surveyNotification | 5         | 10    | ✅     |
| user               | 7         | 29    | ✅     |

## Documentation

See `TEST_COVERAGE_SUMMARY.md` for detailed coverage report.

## Important Notes

### School Model Enum Values

The School model has strict enum values. Always use:

```javascript
{
    schoolCode: 'BUS' | 'ENG' | 'CS',
    name: 'School of Business' | 'School of Engineering' | 'School of Computer Science',
    arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر' |
                'المعهد الكندى العالى للهندسة بالسادس من اكتوبر' |
                'المعهد الكندى العالى للحاسبات والذكاء الاصطناعى بالسادس من اكتوبر'
}
```

### Required Fields

Many models require specific fields:

- **User**: requires `school` (School ObjectId)
- **Backup**: requires `createdBy` (User ObjectId) and `backupType`
- **Event**: requires `startDate` and `endDate`
- **Leave**: requires `leaveType`, `duration`, and future dates
- **Permission**: requires `permissionType` and time fields

## Complete Testing Overview

The HR-SM system has comprehensive test coverage across all layers:

1. **Model Tests**: 32 suites, 246 tests - ALL PASSING ✅
2. **Route Tests**: 25 suites, 111 tests - ALL PASSING ✅
3. **Controller Tests**: 26 suites, 434 tests - ALL PASSING ✅

**Grand Total: 83 test suites with 791 tests - 100% passing!**

## Contributing

When adding new controller tests:

1. Check model schemas for required fields and enum values
2. Create all necessary related models (School, User, etc.)
3. Use proper cleanup in afterEach hooks
4. Follow the existing test structure
5. Run tests to verify they pass before committing

## See Also

- [Route Tests](../routes/README.md) - Comprehensive API testing
- [Model Tests](../models/testModels.md) - Database and business logic
- [Test Coverage Summary](./TEST_COVERAGE_SUMMARY.md) - Detailed coverage report
