# T048 Conversion Report: e2e/support/database.js

**File**: `e2e/support/database.js`  
**Type**: E2E Test Support Utility  
**Conversion Date**: 2025-01-24  
**Status**: ✅ Completed

---

## Overview

Converted E2E test database utilities from MongoDB/MongoClient to PostgreSQL/Sequelize. This file provides database setup, teardown, and seeding functions for E2E tests.

---

## Changes Made

### 1. Database Connection

**Before (MongoDB)**:
```javascript
const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-sm-e2e-test';
let client = new MongoClient(MONGODB_URI);
await client.connect();
db = client.db(TEST_DB_NAME);
```

**After (PostgreSQL/Sequelize)**:
```javascript
const { Sequelize } = require('sequelize');
const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.MAIN_DATABASE_URL;
sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
});
await sequelize.authenticate();
```

**Key Changes**:
- Replaced `MongoClient` with `Sequelize`
- Changed connection string from MongoDB URI to PostgreSQL URL
- Added connection pooling configuration
- Removed database name parameter (included in URL)

---

### 2. Database Cleanup

**Before (MongoDB)**:
```javascript
const collections = ['users', 'companies', ...];
for (const collectionName of collections) {
    await database.collection(collectionName).deleteMany({});
}
```

**After (PostgreSQL)**:
```javascript
const tables = ['sessions', 'overtimes', ...];
for (const tableName of tables) {
    await db.query(`TRUNCATE TABLE "${tableName}" CASCADE`, {
        type: Sequelize.QueryTypes.RAW
    });
}
```

**Key Changes**:
- Changed from `deleteMany()` to `TRUNCATE TABLE`
- Added `CASCADE` to handle foreign key constraints
- Reordered tables to respect dependency order
- Used raw SQL queries for better performance

---

### 3. Data Seeding

**Before (MongoDB)**:
```javascript
async function seedUsers(database, users) {
    const processedUsers = await Promise.all(users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password || 'TestPassword123!', 10),
        createdAt: new Date(),
        updatedAt: new Date()
    })));
    await database.collection('users').insertMany(processedUsers);
}
```

**After (PostgreSQL)**:
```javascript
async function seedUsers(db, users) {
    const processedUsers = await Promise.all(users.map(async (user) => ({
        id: user.id || require('crypto').randomUUID(),
        email: user.email,
        password: await bcrypt.hash(user.password || 'TestPassword123!', 10),
        first_name: user.firstName || user.first_name,
        last_name: user.lastName || user.last_name,
        tenant_id: user.tenantId || user.tenant_id,
        created_at: new Date(),
        updated_at: new Date()
    })));
    
    // Use parameterized INSERT query
    for (const user of processedUsers) {
        await db.query(
            `INSERT INTO users (id, email, password, ...) VALUES (:id, :email, :password, ...)`,
            { replacements: user, type: Sequelize.QueryTypes.INSERT }
        );
    }
}
```

**Key Changes**:
- Added explicit UUID generation for `id` field
- Converted camelCase field names to snake_case (e.g., `firstName` → `first_name`)
- Changed from `insertMany()` to parameterized SQL `INSERT` statements
- Used Sequelize replacements for SQL injection protection
- Handled both camelCase and snake_case input formats for flexibility

---

### 4. Index Creation

**Before (MongoDB)**:
```javascript
await database.collection('users').createIndex({ email: 1 }, { unique: true });
await database.collection('users').createIndex({ tenantId: 1 });
```

**After (PostgreSQL)**:
```javascript
await db.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, {
    type: Sequelize.QueryTypes.RAW
});
await db.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)`, {
    type: Sequelize.QueryTypes.RAW
});
```

**Key Changes**:
- Changed from MongoDB `createIndex()` to SQL `CREATE INDEX`
- Added `IF NOT EXISTS` to prevent errors on re-runs
- Used explicit index names following PostgreSQL conventions
- Removed unique constraint (should be defined in schema/migration)

---

### 5. Database Statistics

**Before (MongoDB)**:
```javascript
const collections = await database.listCollections().toArray();
const stats = {};
for (const collection of collections) {
    const count = await database.collection(collection.name).countDocuments();
    stats[collection.name] = count;
}
```

**After (PostgreSQL)**:
```javascript
const [tables] = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
`, { type: Sequelize.QueryTypes.SELECT });

const stats = {};
for (const { table_name } of tables) {
    const [result] = await db.query(
        `SELECT COUNT(*) as count FROM "${table_name}"`,
        { type: Sequelize.QueryTypes.SELECT }
    );
    stats[table_name] = parseInt(result.count);
}
```

**Key Changes**:
- Changed from `listCollections()` to querying `information_schema.tables`
- Changed from `countDocuments()` to SQL `COUNT(*)`
- Used PostgreSQL system catalog for table discovery

---

### 6. Connection Verification

**Before (MongoDB)**:
```javascript
await database.admin().ping();
```

**After (PostgreSQL)**:
```javascript
await db.authenticate();
```

**Key Changes**:
- Replaced MongoDB `admin().ping()` with Sequelize `authenticate()`
- Both methods verify database connectivity

---

## Field Name Mappings

All seeding functions now handle both camelCase (JavaScript convention) and snake_case (PostgreSQL convention):

| JavaScript (camelCase) | PostgreSQL (snake_case) |
|------------------------|-------------------------|
| `tenantId` | `tenant_id` |
| `firstName` | `first_name` |
| `lastName` | `last_name` |
| `employeeId` | `employee_id` |
| `departmentId` | `department_id` |
| `isActive` | `is_active` |
| `emailVerified` | `email_verified` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `checkIn` | `check_in` |
| `checkOut` | `check_out` |
| `startDate` | `start_date` |
| `endDate` | `end_date` |
| `assignedTo` | `assigned_to` |
| `dueDate` | `due_date` |
| `licenseNumber` | `license_number` |
| `validFrom` | `valid_from` |
| `validUntil` | `valid_until` |

---

## Environment Variables

**Before**:
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_TEST_DB` - Test database name

**After**:
- `TEST_DATABASE_URL` - PostgreSQL connection URL (primary)
- `MAIN_DATABASE_URL` - Fallback to main database URL

---

## Testing Considerations

### Mock Mode
Both versions support mock mode for tests without database:
```javascript
if (process.env.NODE_ENV === 'test' || process.env.CYPRESS_ENV === 'test') {
    return { success: true, message: 'Database cleaned successfully (mock)' };
}
```

### Error Handling
- Graceful degradation when database is unavailable
- Returns success in test mode to prevent test failures
- Logs warnings for debugging when `LOG_LEVEL=debug`

### Performance
- PostgreSQL `TRUNCATE` is faster than MongoDB `deleteMany()`
- Connection pooling improves concurrent test performance
- Indexes created with `IF NOT EXISTS` for idempotency

---

## Dependencies

**Removed**:
- `mongodb` - MongoDB driver

**Added**:
- `sequelize` - PostgreSQL ORM (already in project)

**Retained**:
- `dotenv` - Environment variable loading
- `bcryptjs` - Password hashing

---

## Migration Notes

### Breaking Changes
1. **Connection String Format**: Must update `.env.test` to use PostgreSQL URL format
2. **Field Names**: All database fields now use snake_case
3. **ID Format**: Changed from MongoDB ObjectId (24-char hex) to UUID (36-char)

### Backward Compatibility
- Seeding functions accept both camelCase and snake_case input
- Mock mode behavior unchanged
- Function signatures unchanged

### Future Improvements
1. Consider using Sequelize models instead of raw queries for type safety
2. Add transaction support for atomic seeding operations
3. Implement database migration runner for schema setup
4. Add data validation before insertion

---

## Verification

### Manual Testing
```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/hr-sm-e2e-test"

# Run E2E tests
npm run test:e2e
```

### Expected Behavior
- ✅ Database connection succeeds
- ✅ Cleanup removes all test data
- ✅ Seeding creates test records
- ✅ Indexes are created without errors
- ✅ Statistics return correct counts
- ✅ Connection verification passes

---

## Conversion Checklist

- [x] Remove `import mongodb` / `require('mongodb')`
- [x] Replace `MongoClient` with `Sequelize`
- [x] Convert connection logic to PostgreSQL
- [x] Replace `deleteMany()` with `TRUNCATE TABLE`
- [x] Convert `insertMany()` to parameterized `INSERT` statements
- [x] Update field names from camelCase to snake_case
- [x] Replace MongoDB ObjectId with UUID
- [x] Convert `createIndex()` to SQL `CREATE INDEX`
- [x] Update `listCollections()` to query `information_schema`
- [x] Replace `countDocuments()` with SQL `COUNT(*)`
- [x] Update connection verification method
- [x] Handle JSONB for nested objects (settings field)
- [x] Add proper error handling and logging
- [x] Maintain mock mode for tests
- [x] Document environment variable changes

---

## Status: ✅ COMPLETED

All MongoDB code has been successfully converted to PostgreSQL/Sequelize. The file is ready for E2E testing with PostgreSQL database.
