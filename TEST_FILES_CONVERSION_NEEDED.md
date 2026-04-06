# Test Files Requiring Sequelize Conversion

## Analysis

After reviewing the 5 test files mentioned in the MongoDB removal summary, I found that these files don't just have incorrect import paths - they are **still using Mongoose models directly**. These tests need to be converted to use Sequelize models instead.

## Files Requiring Conversion

### 1. `server/testing/models/survey.model.test.js`
**Status**: Uses Mongoose directly
**Issues**:
- Imports `mongoose` package
- Uses Mongoose models (Survey, User, Department)
- Uses Mongoose-specific syntax (`_id`, `mongoose.Types.ObjectId()`, `mongoose.Error.ValidationError`)
- Uses Mongoose methods (`.deleteMany()`, `.create()`, `.validate()`)

**Required Changes**:
- Replace Mongoose imports with Sequelize models
- Update test data creation to use Sequelize syntax
- Replace `_id` with `id` (UUID)
- Update validation error handling for Sequelize
- Replace Mongoose query methods with Sequelize equivalents

### 2. `server/testing/controllers/payroll.controller.test.js`
**Status**: Uses Mongoose directly
**Issues**:
- Imports `mongoose` package
- Uses Mongoose models (Payroll)
- Uses Mongoose methods (`.deleteMany()`)
- Test helpers may use Mongoose syntax

**Required Changes**:
- Replace Mongoose imports with Sequelize models
- Update cleanup methods to use Sequelize
- Update test helpers if they use Mongoose

### 3. `server/testing/controllers/user.controller.test.js`
**Status**: Uses Mongoose directly
**Issues**:
- Imports `mongoose` package
- Uses Mongoose models (User, Department, Position)
- Uses `mongoose.Types.ObjectId()` for ID generation
- Uses Mongoose methods (`.create()`, `.deleteMany()`, `.findById()`, `.findByIdAndDelete()`)

**Required Changes**:
- Replace Mongoose imports with Sequelize models
- Replace `mongoose.Types.ObjectId()` with UUID generation
- Update all CRUD operations to use Sequelize syntax
- Replace `_id` with `id` throughout

### 4. `server/testing/models/reportExecution.model.test.js`
**Status**: Uses Mongoose directly
**Issues**:
- Imports `mongoose` package
- Uses Mongoose models (ReportExecution, Report, User)
- Uses `mongoose.Types.ObjectId()` and `mongoose.Error.ValidationError`
- Uses Mongoose methods extensively

**Required Changes**:
- Replace Mongoose imports with Sequelize models
- Update all model operations to use Sequelize
- Replace ObjectId with UUID
- Update validation error handling

### 5. `server/testing/modules/life-insurance/policyNumberGeneration.property.test.js`
**Status**: Uses Mongoose directly
**Issues**:
- Imports `mongoose` package
- Uses Mongoose models (InsurancePolicy, User, Department, Position)
- Uses `mongoose.Types.ObjectId()`
- Property-based tests using fast-check with Mongoose syntax

**Required Changes**:
- Replace Mongoose imports with Sequelize models
- Update property-based test generators for Sequelize
- Replace ObjectId with UUID in test data generation
- Update all model operations to use Sequelize

## Conversion Strategy

### Option 1: Full Conversion (Recommended)
Convert all 5 test files to use Sequelize models and syntax. This ensures complete MongoDB removal and proper testing of the Sequelize implementation.

**Pros**:
- Complete MongoDB removal
- Tests verify Sequelize implementation
- Consistent with migration goals

**Cons**:
- More time-consuming
- Requires understanding of both test logic and Sequelize

### Option 2: Skip These Tests Temporarily
Mark these tests as `.skip` and document them for future conversion.

**Pros**:
- Faster to complete Task 25
- Can focus on other priorities

**Cons**:
- Reduced test coverage
- Tests don't verify Sequelize implementation
- Technical debt

### Option 3: Create New Sequelize Tests
Create new test files using Sequelize alongside the old Mongoose tests, then remove the Mongoose versions.

**Pros**:
- Can compare behavior between Mongoose and Sequelize
- Safer migration path

**Cons**:
- Duplicate effort
- More files to maintain temporarily

## Recommendation

I recommend **Option 1: Full Conversion** because:

1. **Task 25 Goal**: Complete MongoDB removal requires converting all Mongoose usage
2. **Test Coverage**: These tests verify critical functionality (models, controllers, property-based tests)
3. **Clean Migration**: Ensures the application works correctly with Sequelize
4. **No Technical Debt**: Avoids leaving Mongoose code in the codebase

## Conversion Checklist

For each test file:

- [ ] Replace `import mongoose from 'mongoose'` with Sequelize model imports
- [ ] Replace `mongoose.Types.ObjectId()` with UUID generation (`crypto.randomUUID()`)
- [ ] Replace `_id` with `id` throughout
- [ ] Update `.create()` calls to use Sequelize syntax
- [ ] Update `.deleteMany()` to `.destroy({ where: {} })`
- [ ] Update `.findById()` to `.findByPk()`
- [ ] Update `.findOne()` to use `where` clause
- [ ] Replace `mongoose.Error.ValidationError` with Sequelize validation errors
- [ ] Update enum validation tests for Sequelize
- [ ] Update relationship/association tests for Sequelize
- [ ] Test and verify all assertions still work

## Estimated Effort

- **survey.model.test.js**: 2-3 hours (complex model with many tests)
- **payroll.controller.test.js**: 1 hour (simpler controller tests)
- **user.controller.test.js**: 2 hours (many CRUD operations)
- **reportExecution.model.test.js**: 1-2 hours (model tests)
- **policyNumberGeneration.property.test.js**: 2-3 hours (property-based tests)

**Total**: 8-11 hours

## Next Steps

1. **Decide on conversion strategy** (Option 1, 2, or 3)
2. **If Option 1**: Convert tests one by one, starting with simpler ones
3. **If Option 2**: Mark tests as `.skip` and document in tasks.md
4. **If Option 3**: Create new Sequelize test files

## Related Files

- `test/examples/user.service.postgres.test.js` - Example of Sequelize test
- `test/setup/postgres-test-config.js` - Test configuration for Sequelize
- `test/setup/jest-setup-postgres.js` - Jest setup for Sequelize tests

## Conclusion

The "incorrect import paths" mentioned in the summary was a mischaracterization. These files actually need full conversion from Mongoose to Sequelize, which is a more significant undertaking than just fixing import paths.

The decision on how to proceed should be based on:
- Project timeline and priorities
- Importance of test coverage
- Resources available for test conversion

