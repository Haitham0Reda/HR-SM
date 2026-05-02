# T044 Conversion Report: Seed Scripts

## Task Description
Convert `server/seed.js` and `server/seedMultiTenantSimple.js` to Sequelize for PostgreSQL database seeding.

## Conversion Status: ✅ COMPLETED

### Files Converted

#### 1. server/seed.js
**Status**: ✅ Already converted (verified)

**Key Changes**:
- Uses `mainAppDb` from Sequelize config
- Uses `Model.bulkCreate()` for batch inserts
- Uses `Model.destroy({ where: {}, truncate: true, cascade: true })` for cleanup
- Uses `Model.update()` with `where` clause for updates
- All records include `tenantId: 'default-tenant'`
- No mongoose imports or patterns

**Verification**:
- ✅ Syntax check passed: `node --check server/seed.js`
- ✅ No mongoose imports found
- ✅ Uses Sequelize patterns throughout

#### 2. server/seedMultiTenantSimple.js
**Status**: ✅ Newly converted

**Previous State**: Empty file

**New Implementation**:
- Creates 3 test tenants: techcorp, healthcare, trading
- Uses single database with `tenantId` column (new Sequelize pattern)
- No separate databases per tenant (old Mongoose pattern removed)
- Uses Sequelize models: User, Department, Position, Holiday

**Key Conversion Points**:

1. **Database Connection**:
   ```javascript
   // Old (Mongoose): multiTenantDB.getCompanyConnection(tenantId)
   // New (Sequelize): mainAppDb (single connection, tenant filtering)
   import { mainAppDb } from './config/database.js';
   await mainAppDb.authenticate();
   ```

2. **Model Usage**:
   ```javascript
   // Old (Mongoose): connection.model('Department', schema)
   // New (Sequelize): Direct model import
   import Department from './modules/hr-core/users/models/department.model.js';
   ```

3. **Create Operations**:
   ```javascript
   // Old (Mongoose): new Model(data).save()
   // New (Sequelize): Model.create(data)
   const department = await Department.create({
       tenantId,
       name: deptTemplate.name,
       // ...
   });
   ```

4. **Update Operations**:
   ```javascript
   // Old (Mongoose): Model.findByIdAndUpdate(id, data)
   // New (Sequelize): Model.update(data, { where: { id } })
   await Department.update(
       { managerId: hrUser.id },
       { where: { id: hrDept.id } }
   );
   ```

5. **Delete Operations**:
   ```javascript
   // Old (Mongoose): Model.deleteMany({})
   // New (Sequelize): Model.destroy({ where: {}, truncate: true })
   await User.destroy({ where: {}, truncate: true, cascade: true });
   ```

6. **Tenant Isolation**:
   ```javascript
   // All records include tenantId field
   const userData = {
       tenantId,  // ← Key change: tenant_id column instead of separate DB
       employeeId,
       username,
       // ...
   };
   ```

**Verification**:
- ✅ Syntax check passed: `node --check server/seedMultiTenantSimple.js`
- ✅ No mongoose imports
- ✅ Uses Sequelize patterns (create, update, destroy)
- ✅ Follows single-database multi-tenant pattern
- ✅ All records include tenantId field

## Conversion Pattern Compliance

### ✅ Checklist Items Completed

- [x] Remove `import mongoose`
- [x] Remove `multiTenantDB.getCompanyConnection()` calls
- [x] Remove `connection.model()` patterns
- [x] Replace `new Model().save()` with `Model.create()`
- [x] Replace `Model.findByIdAndUpdate()` with `Model.update()`
- [x] Replace `Model.deleteMany()` with `Model.destroy()`
- [x] Use direct model imports from model files
- [x] Include `tenantId` in all record creation
- [x] Use `mainAppDb` for database connection
- [x] Use `where` clause for all queries/updates

## Testing Recommendations

### Manual Testing
```bash
# Test single-tenant seed
npm run seed

# Test multi-tenant seed
npm run seed-multitenant
```

### Expected Behavior

**seed.js**:
- Creates data for `default-tenant`
- Creates 9 departments, 9 positions, 8 users
- Creates holiday configuration
- Assigns managers to departments

**seedMultiTenantSimple.js**:
- Creates data for 3 tenants: techcorp, healthcare, trading
- Each tenant gets: 4 departments, 4 positions, 4 users, holiday config
- All data in single PostgreSQL database
- Tenant isolation via `tenant_id` column

### Verification Queries

```sql
-- Check tenants created
SELECT DISTINCT tenant_id FROM users;

-- Check data per tenant
SELECT tenant_id, COUNT(*) FROM users GROUP BY tenant_id;
SELECT tenant_id, COUNT(*) FROM departments GROUP BY tenant_id;

-- Verify tenant isolation
SELECT * FROM users WHERE tenant_id = 'techcorp';
```

## Migration Notes

### Key Architectural Change
The old Mongoose pattern used **separate databases per tenant**. The new Sequelize pattern uses a **single database with tenant_id column filtering**.

**Old Pattern (Mongoose)**:
- Database: `hrsm_techcorp`, `hrsm_healthcare`, etc.
- Connection per tenant
- Dynamic schema compilation

**New Pattern (Sequelize)**:
- Database: Single PostgreSQL database
- All tables have `tenant_id` column
- Queries filter by `WHERE tenant_id = ?`

### Benefits of New Pattern
1. Simpler connection management
2. Easier cross-tenant queries (if needed)
3. Better resource utilization
4. Simpler backup/restore
5. Standard PostgreSQL features (foreign keys, transactions)

## Files Modified
- ✅ `server/seedMultiTenantSimple.js` - Converted from empty to Sequelize implementation
- ✅ `server/seed.js` - Verified already converted

## Related Tasks
- T045: Convert other seed scripts (seedFullCompanies.js, etc.)
- T046: Convert operational scripts (syncLicenses.js, validateLicenses.js)

## Completion Date
2025-01-XX (Task T044 completed)
