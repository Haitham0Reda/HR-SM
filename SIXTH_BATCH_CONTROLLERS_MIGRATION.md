# Sixth Batch - Controller Migration to Sequelize

## Summary

All Mongoose models have been converted to Sequelize! The remaining work is to update 6 controllers that still import mongoose for multi-tenant database operations.

## Controllers to Convert (6 files)

### 1. insuranceController.js ✅
**Location**: `server/modules/life-insurance/controllers/insuranceController.js`
**Mongoose Usage**:
- `mongoose.Types.ObjectId` for ID conversion
- Dynamic model registration on tenant connections
- `connection.model()` for registering models

**Conversion Needed**:
- Replace `mongoose.Types.ObjectId` with UUID validation
- Use Sequelize model imports directly
- Remove dynamic schema registration (models are already Sequelize)

### 2. permissionRequest.controller.js ✅
**Location**: `server/modules/hr-core/requests/controllers/permissionRequest.controller.js`
**Mongoose Usage**:
- Dynamic model registration with `connection.model()`
- `mongoose.Schema` for tenant-specific models

**Conversion Needed**:
- Use Sequelize models directly
- Remove schema registration logic
- Update query syntax to Sequelize

### 3. holiday.controller.js ✅
**Location**: `server/modules/hr-core/holidays/controllers/holiday.controller.js`
**Mongoose Usage**:
- Creates Holiday schema dynamically
- Uses `mongoose.Schema` and `connection.model()`

**Conversion Needed**:
- Import Holiday Sequelize model
- Remove dynamic schema creation
- Update to use Sequelize query syntax

### 4. forgetCheck.controller.js ✅
**Location**: `server/modules/hr-core/attendance/controllers/forgetCheck.controller.js`
**Mongoose Usage**:
- `mongoose.Types.ObjectId` for ID conversion
- `connection.model()` for tenant-specific models

**Conversion Needed**:
- Replace ObjectId with UUID
- Use Sequelize models directly
- Update query syntax

### 5. attendanceDevice.controller.js ✅
**Location**: `server/modules/hr-core/attendance/controllers/attendanceDevice.controller.js`
**Mongoose Usage**:
- Only imports mongoose but doesn't use it!

**Conversion Needed**:
- Simply remove the unused import

### 6. hardcopy.controller.js ✅
**Location**: `server/modules/documents/controllers/hardcopy.controller.js`
**Mongoose Usage**:
- Creates HardCopy schema dynamically
- Creates User schema for population
- Uses `mongoose.Schema` and `connection.model()`

**Conversion Needed**:
- Import HardCopy Sequelize model
- Remove dynamic schema creation
- Update to use Sequelize query syntax

## Migration Strategy

### Phase 1: Simple Removals
1. Remove unused mongoose import from `attendanceDevice.controller.js`

### Phase 2: Model Imports
2. Update controllers to import Sequelize models directly
3. Remove dynamic schema registration code

### Phase 3: Query Conversion
4. Replace Mongoose query syntax with Sequelize
5. Replace `mongoose.Types.ObjectId` with UUID validation
6. Update populate() calls to Sequelize includes

### Phase 4: Testing
7. Test each controller endpoint
8. Verify tenant isolation still works
9. Check that all queries return correct data

## Key Differences: Mongoose vs Sequelize in Multi-Tenant Context

### Mongoose Approach (Old)
```javascript
const connection = await multiTenantDB.getCompanyConnection(tenantId);
const schema = new mongoose.Schema({...});
const Model = connection.model('ModelName', schema);
const results = await Model.find({ tenantId });
```

### Sequelize Approach (New)
```javascript
// Models are already defined and imported
import Model from '../models/model.js';

// Sequelize handles tenant isolation through where clauses
const results = await Model.findAll({ 
  where: { tenantId } 
});
```

## Important Notes

1. **Tenant Isolation**: Sequelize models use `where: { tenantId }` for isolation instead of separate database connections
2. **UUID vs ObjectId**: Replace `mongoose.Types.ObjectId()` with UUID validation
3. **Populate vs Include**: Replace `.populate()` with Sequelize `include` option
4. **Schema Registration**: Not needed - models are already defined
5. **Connection Management**: Sequelize uses connection pooling automatically

## Models Already Converted

All models used by these controllers have been converted to Sequelize:
- ✅ InsurancePolicy.js
- ✅ FamilyMember.js
- ✅ Beneficiary.js
- ✅ InsuranceClaim.js
- ✅ User.js (user.model.js)
- ✅ Department.js (department.model.js)
- ✅ Position.js (position.model.js)
- ✅ Permission.js (permission.model.js)
- ✅ Notification.js (notification.model.js)
- ✅ Holiday.js
- ✅ ForgetCheck.js (forgetCheck.model.js)
- ✅ AttendanceDevice.js (attendanceDevice.model.js)
- ✅ HardCopy.js (hardcopy.model.js)

## Estimated Time

- Phase 1 (Simple Removals): 5 minutes
- Phase 2 (Model Imports): 30 minutes
- Phase 3 (Query Conversion): 2-3 hours
- Phase 4 (Testing): 1-2 hours

**Total**: 3-5 hours

## Next Steps After This Batch

After converting these 6 controllers:
1. Search for any remaining mongoose imports in services
2. Update repositories to use Sequelize
3. Update the main database connection (`server/core/config/database.js`)
4. Create data migration scripts
5. Update tests

## Progress Tracking

- [ ] attendanceDevice.controller.js - Remove unused import
- [ ] insuranceController.js - Convert to Sequelize
- [ ] permissionRequest.controller.js - Convert to Sequelize
- [ ] holiday.controller.js - Convert to Sequelize
- [ ] forgetCheck.controller.js - Convert to Sequelize
- [ ] hardcopy.controller.js - Convert to Sequelize

## Conclusion

This is the final batch of controller conversions! After this, the main remaining work is:
- Services and repositories
- Main database connection
- Data migration scripts
- Testing

The migration is nearly complete!
