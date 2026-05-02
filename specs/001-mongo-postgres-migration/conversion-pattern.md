# Mongoose → Sequelize Conversion Pattern Guide

**Purpose**: Playbook for converting code from Mongoose to Sequelize.
**Audience**: Developers working on the HR-SM migration.
**Scope**: Covers models, repositories, services, controllers, and tests.

---

## Table of Contents

1. [General Strategy](#1-general-strategy)
2. [Schema Definitions](#2-schema-definitions)
3. [Query Operators](#3-query-operators)
4. [Association Loading](#4-association-loading)
5. [ID Handling](#5-id-handling)
6. [Multi-Tenant Pattern](#6-multi-tenant-pattern)
7. [Aggregation Pipeline](#7-aggregation-pipeline)
8. [Common Methods](#8-common-methods)
9. [Repository Pattern](#9-repository-pattern)
10. [Controller Pattern](#10-controller-pattern)
11. [Service Pattern](#12-service-pattern)
12. [Test Pattern](#13-test-pattern)
13. [Pitfalls & Gotchas](#14-pitfalls--gotchas)

---

## 1. General Strategy

**Mongoose** uses a document-based API with schema definitions and model registration per connection.

**Sequelize** uses an active-record/query-builder pattern with a single model definition per table.

**Conversion Steps**:
1. Remove `import mongoose from 'mongoose'` or `const mongoose = require('mongoose')`
2. Replace `mongoose.Types.ObjectId()` → use UUID string directly or `crypto.randomUUID()`
3. Replace `new mongoose.Schema({...})` → Sequelize `define()` call (if dynamic schema)
4. Replace `Model.find(filter)` → `Model.findAll({ where: filter })`
5. Replace `populate: [...]` → `include: [{ model: ..., as: ... }]`
6. Replace `$gte/$lte/$regex/$in` → `Op.gte/Op.lte/Op.regex/Op.in`
7. Replace `sort: { field: 1/-1 }` → `order: [['field', 'ASC'/'DESC']]`
8. Replace `limit/skip` → `limit/offset`
9. Replace `new Model(doc).save()` → `Model.create(doc)` or `record.save()`
10. Replace `Model.findByIdAndUpdate(id, doc, { new: true })` → `Model.update(doc, { where: { id } })` then `findByPk(id)` or use `returning: true`
11. Replace `Model.findByIdAndDelete(id)` → `Model.destroy({ where: { id } })`

---

## 2. Schema Definitions

### Mongoose Schema

```javascript
const UserSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  profile: {
    firstName: String,
    lastName: String
  },
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'users',
  timestamps: true
});

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
```

### Sequelize Equivalent

```javascript
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../config/database.js';

const User = mainAppDb.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    indexes: [{ unique: false }]
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user'
  },
  profile: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'users',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  indexes: [
    {
      name: 'idx_users_tenant_id_email',
      fields: ['tenant_id', 'email'],
      unique: true
    }
  ]
});

// Virtual fields via getters/setters if needed
User.prototype.getFullName = function() {
  return `${this.profile?.firstName || ''} ${this.profile?.lastName || ''}`.trim();
};
```

**Key Changes**:
- Schema type → DataTypes
- `String` → `DataTypes.STRING`
- `Number` → `DataTypes.INTEGER` or `DataTypes.FLOAT`
- `Boolean` → `DataTypes.BOOLEAN`
- `Date` → `DataTypes.DATE`
- `[String]` array → `DataTypes.ARRAY(DataTypes.STRING)`
- `Object` nested → `DataTypes.JSONB`
- `default: Date.now` → `defaultValue: DataTypes.NOW`
- `index: true` → `indexes: [{ fields: ['field_name'] }]`
- Unique compound index → `indexes: [{ unique: true, fields: ['field1', 'field2'] }]`

---

## 3. Query Operators

### Mapping Table

| Mongoose | Sequelize | Notes |
|----------|-----------|-------|
| `{ field: value }` | `{ where: { field: value } }` | Direct equality |
| `{ field: { $eq: val } }` | `{ where: { field: val } }` or `{ where: { [Op.eq]: val } }` | Equals |
| `{ field: { $ne: val } }` | `{ where: { field: { [Op.ne]: val } } }` | Not equal |
| `{ field: { $gt: val } }` | `{ where: { field: { [Op.gt]: val } } }` | Greater than |
| `{ field: { $gte: val } }` | `{ where: { field: { [Op.gte]: val } } }` | Greater/equal |
| `{ field: { $lt: val } }` | `{ where: { field: { [Op.lt]: val } } }` | Less than |
| `{ field: { $lte: val } }` | `{ where: { field: { [Op.lte]: val } } }` | Less/equal |
| `{ field: { $in: [vals] } }` | `{ where: { field: { [Op.in]: vals } } }` | In array |
| `{ field: { $nin: [vals] } }` | `{ where: { field: { [Op.notIn]: vals } } }` | Not in array |
| `{ $or: [cond1, cond2] }` | `{ where: { [Op.or]: [cond1, cond2] } }` | OR condition |
| `{ $and: [cond1, cond2] }` | `{ where: { [Op.and]: [cond1, cond2] } }` | AND condition |
| `{ field: { $regex: 'pattern', $options: 'i' } }` | `{ where: { field: { [Op.regex]: 'pattern', modifiers: 'i' } } }` | Regex |
| `{ field: null }` | `{ where: { field: null } }` | Is null |

**Important**: All query conditions must be wrapped in `where` property for Sequelize.

### Example Conversion

**Mongoose**:
```javascript
const filter = {
  status: 'active',
  $or: [
    { startDate: { $lte: end } },
    { endDate: { $gte: start } }
  ]
};
Model.find(filter).sort({ name: 1 }).limit(10);
```

**Sequelize**:
```javascript
const where = {
  status: 'active',
  [Op.or]: [
    { startDate: { [Op.lte]: end } },
    { endDate: { [Op.gte]: start } }
  ]
};
Model.findAll({
  where,
  order: [['name', 'ASC']],
  limit: 10
});
```

---

## 4. Association Loading

### Populate → Include

| Mongoose | Sequelize | Notes |
|----------|-----------|-------|
| `populate('field')` | `include: [{ model: AssociatedModel }]` | Must specify model class |
| `populate({ path: 'field', select: 'a b' })` | `include: [{ model: AssociatedModel, attributes: ['a', 'b'] }]` | Field selection |
| `populate({ path: 'field', populate: 'subfield' })` | `include: [{ model: A, include: [{ model: B }] }]` | Nested populate |
| `populate('field', null, { conditions })` | `include: { model: M, where: cond, required: false }` | Conditional include |

**Critical**: Sequelize `include` requires explicit model references, not strings.

### Example Conversion

**Mongoose**:
```javascript
Model.find(filter)
  .populate('employee')
  .populate({ path: 'department', select: 'name code' })
  .populate({ path: 'approvedBy', select: 'firstName lastName' })
  .sort({ startDate: -1 });
```

**Sequelize**:
```javascript
Model.findAll({
  where: filter,
  include: [
    { model: User, as: 'employee' },
    { model: Department, as: 'department', attributes: ['name', 'code'] },
    { model: User, as: 'approvedBy', attributes: ['firstName', 'lastName'] }
  ],
  order: [['startDate', 'DESC']]
});
```

**Important**: The `as` value must match the association alias defined in the model's `associate` function.

---

## 5. ID Handling

### The ObjectId Problem

Mongoose uses `ObjectId` (12-byte binary, 24-char hex representation). Sequelize uses UUID strings.

**Conversion Rules**:

| Mongongoose | Sequelize | Action |
|-------------|-----------|--------|
| `new mongoose.Types.ObjectId(id)` | `id` (string) | Remove wrapper - ID is already string/UUID |
| `doc._id` | `doc.id` | Access `id` directly |
| `doc._id.toString()` | `doc.id` | Direct access |
| `ObjectId.isValid(id)` | `typeof id === 'string' && id.length === 36` | Basic UUID v4 validation |
| `ObjectId.createFromHexString(hex)` | Not needed | UUIDs are strings |

**Test ID Generation**:
```javascript
// Old (Mongoose): ObjectId generation for tests
const fakeId = new mongoose.Types.ObjectId();

// New (Sequelize/PostgreSQL):
import { v4 as uuidv4 } from 'uuid'; // npm install uuid
const fakeId = uuidv4();

// OR use built-in crypto (Node 14.17+):
import { randomUUID } from 'crypto';
const fakeId = randomUUID();
```

All model IDs now use `DataTypes.UUID` with `defaultValue: DataTypes.UUIDV4`.

---

## 6. Multi-Tenant Pattern

### Old Mongoose Pattern (per-tenant database)

```javascript
const getTenantModel = async (tenantId) => {
  const connection = await multiTenantDB.getCompanyConnection(tenantId);
  if (connection.models.ModelName) {
    return connection.models.ModelName;
  }
  const schema = new mongoose.Schema({ ... });
  return connection.model('ModelName', schema);
};
```

**Issues**: Each tenant had a separate database. Complex model registration. Dynamic schema compilation.

### New Sequelize Pattern (single database, tenant_id column)

```javascript
// All queries filter by tenantId in WHERE clause
Model.findAll({
  where: { tenantId, ...otherFilters },
  ...
});

// Or use repository base class which auto-injects tenantId
class MyRepository extends BaseRepository {
  // BaseRepository already enforces tenant filtering
}
```

**Key Change**: Remove all `getTenantModel()` and `connection.model()` calls. Use the shared model instance with tenant_id filter.

**If you see**:
- ❌ `multiTenantDB.getCompanyConnection(tenantId)` → delete, pass tenantId to repository methods
- ❌ `connection.model('Name', schema)` → remove
- ❌ `connection.models.Name` → remove
- ✅ `Model.findAll({ where: { tenantId, ... } })` → keep and ensure tenantId is always included

---

## 7. Aggregation Pipeline

MongoDB aggregations don't have direct Sequelize equivalents. Options:

### Option A: Use Sequelize `findAll` with grouping (simple cases)

```javascript
// Mongoose aggregation
const result = await Model.aggregate([
  { $match: { tenantId, status: 'active' } },
  { $group: { _id: '$department', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// Sequelize using query interface
const result = await Model.findAll({
  where: { tenantId, status: 'active' },
  attributes: [
    'departmentId',
    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
  ],
  group: ['departmentId'],
  order: [['count', 'DESC']]
});
```

### Option B: Use raw query for complex aggregations

```javascript
const result = await sequelize.query(`
  SELECT department_id, COUNT(*) as count
  FROM missions
  WHERE tenant_id = :tenantId AND status = 'active'
  GROUP BY department_id
  ORDER BY count DESC
`, {
  replacements: { tenantId },
  type: sequelize.QueryTypes.SELECT
});
```

### Option C: Convert to multiple queries + processing (if logic allows)

---

## 8. Common Methods

### Create

```javascript
// Mongoose
const doc = new Model({ ... });
await doc.save();

// Sequelize
const record = await Model.create({ ... });
// OR
const record = Model.build({ ... });
await record.save();
```

### Find One

```javascript
// Mongoose
const doc = await Model.findOne(filter).populate('field');

// Sequelize
const record = await Model.findOne({
  where: filter,
  include: [{ model: AssocModel, as: 'field' }]
});
```

### Find Many

```javascript
// Mongoose
const docs = await Model.find(filter)
  .populate('field')
  .sort({ date: -1 })
  .limit(10)
  .skip(20);

// Sequelize
const records = await Model.findAll({
  where: filter,
  include: [{ model: AssocModel, as: 'field' }],
  order: [['date', 'DESC']],
  limit: 10,
  offset: 20
});
```

### Update

```javascript
// Mongoose
const updated = await Model.findByIdAndUpdate(id, doc, { new: true });

// Sequelize
const updated = await Model.update(doc, {
  where: { id },
  returning: true
}).then(() => Model.findByPk(id));
// OR if you want single query:
const [affected, rows] = await Model.update(doc, {
  where: { id },
  returning: true
});
const updated = rows[0];
```

### Delete

```javascript
// Mongoose
await Model.findByIdAndDelete(id);

// Sequelize
await Model.destroy({ where: { id } });
```

### Count

```javascript
// Mongoose
const count = await Model.countDocuments(filter);

// Sequelize
const count = await Model.count({ where: filter });
```

### Exists

```javascript
// Mongoose
const exists = await Model.exists(filter);

// Sequelize
const exists = await Model.count({ where: filter, limit: 1 }).then(c => c > 0);
```

---

## 9. Repository Pattern

The codebase uses a `BaseRepository` class providing common CRUD operations. Individual repositories extend it with custom methods.

### Current State

Some repositories still use old mongoose-style `find()` method with `populate`, `sort`, `limit`, `skip`. Others have been converted to use `findAll` through BaseRepository.

### Migration Checklist

1. **Remove `import mongoose`** from repository file
2. **Remove custom `find()` method** that builds mongoose queries
   - If `find()` exists, replace it with `findAll()` calls through BaseRepository
   - Or rename to something more specific like `findWithFilters()` that calls `this.findAll()`
3. **Replace `populate`** options with `include` in every method
4. **Replace `new mongoose.Types.ObjectId()`** with direct UUID string usage
5. **Replace query operators** (`$gte`, `$lte`, `$or`, etc.) with `Op` equivalents
6. **Replace `sort: { field: 1 }`** with `order: [['field', 'ASC']]`
7. **Replace `skip`** with `offset`
8. **Convert `aggregate()` calls** to raw queries or `findAll` grouping

### Example Full Conversion

**Before (MissionRepository method)**:
```javascript
async findByEmployee(employeeId, options = {}) {
  const filter = { employee: employeeId };
  if (options.tenantId) filter.tenantId = options.tenantId;
  if (options.status) filter.status = options.status;
  
  return await this.find(filter, {
    populate: [
      { path: 'employee', select: 'firstName lastName employeeId' },
      { path: 'department', select: 'name code' }
    ],
    sort: { startDate: -1 }
  });
}
```

**After**:
```javascript
async findByEmployee(employeeId, options = {}) {
  const where = { 
    employeeId,  // Changed from employee to employeeId (FK field name)
    ...(options.tenantId && { tenantId: options.tenantId }),
    ...(options.status && { status: options.status })
  };
  
  return await this.findAll({
    where,
    include: [
      { model: User, as: 'employee', attributes: ['firstName', 'lastName', 'employeeId'] },
      { model: Department, as: 'department', attributes: ['name', 'code'] }
    ],
    order: [['startDate', 'DESC']]
  });
}
```

**Note**: Field names changed from `employee` to `employeeId` because the actual column is `employee_id` (foreign key). The association defines the relationship.

---

## 10. Controller Pattern

Controllers typically:
- Extract tenant ID from `req.tenantId` or `req.user.tenantId`
- Call service/repository methods
- Return JSON responses

### Key Changes

1. **Remove mongoose model loading**: No more `getHolidayModel()` or dynamic schema creation
2. **Import Sequelize models directly** at top of file
3. **Pass tenantId** to service/repository methods
4. **Don't use `populate`** — associations are handled in the repository

**Before**:
```javascript
import mongoose from 'mongoose';
import multiTenantDB from '../../../config/multiTenant.js';

const getHolidayModel = async (tenantId) => {
  const connection = await multiTenantDB.getCompanyConnection(tenantId);
  return connection.model('Holiday', holidaySchema);
};

export const getHolidaySettings = async (req, res) => {
  const tenantId = req.tenantId;
  const Holiday = await getHolidayModel(tenantId);
  const settings = await Holiday.findOne({ tenantId });
  res.json(settings);
};
```

**After**:
```javascript
import Holiday from '../../modules/hr-core/holidays/models/holiday.model.js';

export const getHolidaySettings = async (req, res) => {
  const tenantId = req.tenantId;
  const settings = await Holiday.findOne({ 
    where: { tenantId } 
  });
  res.json(settings);
};
```

### Removing Dynamic Schema Definition

Controllers sometimes define mongoose schemas inline. **These must be removed**. The model definition already exists in `models/*.model.js` or `models/*.js`. Simply import and use it.

If the controller creates a schema with methods (e.g., `holidaySchema.methods.isHoliday`), those methods must be:
1. Moved to the model file's prototype (already done if model is converted)
2. Or converted to static utility functions

---

## 11. Service Pattern

Services contain business logic and orchestrate multiple repositories/models.

### Multi-Tenant Connection Removal

**Remove**:
```javascript
import multiTenantDB from '../../../config/multiTenant.js';

async getUserModel(tenantId) {
  const connection = await multiTenantDB.getCompanyConnection(tenantId);
  const { default: User } = await import('../../hr-core/users/models/user.model.js');
  return connection.model('User', User.schema); // ❌ Mongoose pattern
}
```

**Replace with**:
```javascript
import User from '../../hr-core/users/models/user.model.js';

// Just use the imported User model directly - it's already a Sequelize model
// All queries filter by tenantId passed as parameter
async findUserForTenant(tenantId, userId) {
  return await User.findOne({ 
    where: { id: userId, tenantId } 
  });
}
```

**Service method signature change**:
```javascript
// Old: relied on tenant-specific model
async processForTenant(tenantId, data) {
  const Model = await this.getTenantModel(tenantId);
  return await Model.create(data);
}

// New: use shared model with tenantId in data
async processForTenant(tenantId, data) {
  return await Model.create({ ...data, tenantId });
}
```

---

## 12. Test Pattern

### Test Setup

**Old**:
```javascript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

**New**:
```javascript
import { Sequelize } from 'sequelize';
import { mainAppDb } from '../config/database.js';

beforeAll(async () => {
  // Database already connected via config/database.js
  // Optionally sync test schema
  // await mainAppDb.sync({ force: true });
});

afterAll(async () => {
  // Don't close main DB connection - shared across tests
  // Just clean data
});
```

**Test Data Cleanup**:
```javascript
afterEach(async () => {
  // Truncate all tables between tests
  const models = Object.values(require('../models/index.js'));
  for (const model of models) {
    await model.destroy({ where: {}, truncate: true, force: true });
  }
});
```

### Model Instantiation

**Old**:
```javascript
const doc = new Model({ field: 'value' });
await doc.save();
expect(doc._id).toBeDefined();
```

**New**:
```javascript
const record = await Model.create({ 
  id: uuidv4(), // if not auto-generated
  field: 'value' 
});
expect(record.id).toBeDefined();
expect(record.id).toBeTypeOf('string');
```

### ObjectId Handling in Tests

**Old**:
```javascript
const id = new mongoose.Types.ObjectId();
const refId = otherDoc._id; // ObjectId
```

**New**:
```javascript
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
const refId = otherDoc.id; // string UUID
```

### Query Assertions

**Old**:
```javascript
const doc = await Model.findOne({ field: 'value' });
expect(doc).not.toBeNull();
expect(doc.field).toBe('value');
```

**New**:
```javascript
const record = await Model.findOne({ where: { field: 'value' } });
expect(record).not.toBeNull();
expect(record.field).toBe('value');
```

### Population Assertions

**Old**:
```javascript
const doc = await Model.findOne().populate('user');
expect(doc.user.name).toBe('John');
```

**New**:
```javascript
const record = await Model.findOne({
  include: [{ model: User, as: 'user' }]
});
expect(record.user.name).toBe('John');
// OR access via record.get('user') depending on setup
```

---

## 13. Pitfalls & Gotchas

### 1. Tenant ID Field Name

**Mongoose**: Typically stored as `tenantId` or `tenant_id`.
**Sequelize**: Field is `tenant_id` in DB (underscored: true), but in queries use camelCase `tenantId` or `tenant_id` based on model definition.

Check your model's `field` mapping:
```javascript
tenantId: {
  type: DataTypes.STRING,
  field: 'tenant_id'  // ← DB column name
}
```
When querying, Sequelize automatically maps camelCase to underscored. Use `tenantId` in `where` clause.

### 2. Foreign Key Field Names

Mongoose stored references as `employee: ObjectId`. Sequelize stores as `employeeId: UUID`.

**Check your model definition**:
```javascript
employeeId: {
  type: DataTypes.UUID,
  field: 'employee_id'
}
```

In queries, use `employeeId: value` (the property name, not the association name).

### 3. Association Aliases (`as`)

The `as` value in `include` must exactly match the alias used in model's `associate`:
```javascript
// In Mission model associate:
Mission.belongsTo(User, { foreignKey: 'employeeId', as: 'employee' });

// In query:
include: [{ model: User, as: 'employee' }]
```

### 4. Aggregation Not Fully Compatible

MongoDB aggregation operators (`$group`, `$project`, `$lookup`) have no direct Sequelize equivalents. Use:
- Sequelize's `fn`, `col`, `literal` for simple aggregations
- Raw SQL queries for complex ones

### 5. JSONB Fields

MongoDB stored nested objects as subdocuments. In Sequelize, use `DataTypes.JSONB`.

**Access**:
```javascript
// Same access pattern
const profile = record.profile;
const firstName = record.profile?.firstName;
```

**Querying JSONB**:
```javascript
// Old: { 'profile.firstName': 'John' }
// New: where: { profile: { firstName: 'John' } } // Nested object match
// Or use Op.contains for JSON containment:
where: { profile: { [Op.contains]: { firstName: 'John' } } }
```

### 6. Date Operations

Mongoose stored dates as `Date` objects. Sequelize also uses `Date`.

**Date-only queries** (ignore time):
```javascript
// Old: new Date('2025-01-01') with time at 00:00:00
// New: Ensure you strip time or use BETWEEN for full day:
where: {
  date: {
    [Op.gte]: new Date('2025-01-01T00:00:00'),
    [Op.lte]: new Date('2025-01-01T23:59:59')
  }
}
```

### 7. Case-Sensitive Search

PostgreSQL is case-sensitive by default for `TEXT` comparisons. Use `Op.iLike` for case-insensitive:
```javascript
where: { 
  name: { [Op.iLike]: '%search%' }  // case-insensitive LIKE
}
```

Requires PostgreSQL support (available). Or use `sequelize.fn('LOWER', ...)`.

### 8. Upserts

**Mongoose**:
```javascript
await Model.findOneAndUpdate(filter, doc, { upsert: true, new: true });
```

**Sequelize**:
```javascript
const [record, created] = await Model.upsert(doc);
// OR with conflict handling:
await Model.merge(doc, { where: filter });
```

`merge()` performs an upsert based on primary key or unique constraints.

### 9. Transactions

**Mongoose**:
```javascript
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  await doc1.save({ session });
  await doc2.save({ session });
});
```

**Sequelize**:
```javascript
const transaction = await sequelize.transaction();
try {
  await Model1.create(data1, { transaction });
  await Model2.create(data2, { transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

Or use repository's `withTransaction()` helper.

### 10. Soft Deletes

If model uses `deletedAt` timestamp (paranoid mode):

```javascript
// Sequelize model must enable paranoid: true
{ paranoid: true } // in model options

// Then:
await Model.destroy({ where: { id } }); // Sets deletedAt
await Model.restore(id); // Undeletes
await Model.findAll({ paranoid: false }); // Includes deleted
```

### 11. Date.now Default

- Mongoose: `default: Date.now` (function call, not value)
- Sequelize: `defaultValue: DataTypes.NOW` (no parentheses)

### 12. Array Defaults

- Mongoose: `default: []`
- Sequelize: `defaultValue: []` or `defaultValue: DataTypes.ARRAY(DataTypes.STRING)`

### 13. Enum Types

- Mongoose: `enum: ['a', 'b']` in schema
- Sequelize: `type: DataTypes.ENUM('a', 'b')`

**Important**: Enums are validated at DB level. Migration of existing enum values must be coordinated with DBA.

### 14. Unique Indexes

- Mongoose: `{ field: { type: String, unique: true } }` or `schema.index({field:1}, {unique:true})`
- Sequelize: `unique: true` at field level OR `indexes: [{ unique: true, fields: ['field'] }]`

### 15. Indexes

Mongoose `schema.index({ field: 1 })` becomes:
```javascript
indexes: [
  { fields: ['field'], name: 'idx_table_field' }  // name optional
]
```

---

## 14. Conversion Checklist per File Type

### Repository
- [ ] Remove `import mongoose`
- [ ] Replace custom `find()` with `findAll()` or adapter method
- [ ] Replace `populate` with `include` with explicit model imports
- [ ] Replace `$gte`, `$lte`, `$or`, etc. with `Op` equivalents
- [ ] Replace `new mongoose.Types.ObjectId()` with direct UUID usage
- [ ] Replace `sort` with `order`
- [ ] Replace `skip` with `offset`
- [ ] Replace `aggregate()` with raw query or `findAll` grouping
- [ ] Remove `connection.model()` and `getTenantModel()` patterns
- [ ] Ensure all queries include `tenantId` in WHERE clause

### Service
- [ ] Remove `import mongoose`
- [ ] Remove `multiTenantDB.getCompanyConnection()` calls
- [ ] Remove `connection.model()` and `connection.models[]` usage
- [ ] Replace dynamic model imports with static imports from model files
- [ ] Pass `tenantId` explicitly to repository methods
- [ ] Replace any `ObjectId` conversions with UUID string handling

### Controller
- [ ] Remove `import mongoose`
- [ ] Remove `getTenantModel()` helper functions
- [ ] Remove dynamic schema definitions (`new mongoose.Schema({...})`
- [ ] Import Sequelize models directly at file top
- [ ] Replace `.find()`, `.findOne()`, `.save()` with Sequelize equivalents
- [ ] Simplify controller logic - let model/repository handle queries

### Test
- [ ] Remove `import mongoose`
- [ ] Remove `MongoMemoryServer` setup/teardown
- [ ] Replace `new Model()` with `Model.create()`
- [ ] Replace `doc._id` with `doc.id`
- [ ] Replace `doc.save()` with `doc.save()` (Sequelize instances also have save) OR `Model.update()`
- [ ] Replace `ObjectId()` with `uuidv4()` or `randomUUID()`
- [ ] Replace `deleteMany()` with `Model.destroy({ where: {} })`
- [ ] Replace `findOne(filter)` with `Model.findOne({ where: filter })`
- [ ] Replace `populate()` in assertions with `include` in query
- [ ] Adjust assertions for Sequelize instance properties (may include `dataValues`)

### Model Definition (if dynamic, like in controller)
- [ ] Remove `new mongoose.Schema()`
- [ ] Convert to `Model.define()` with DataTypes
- [ ] Move schema definition to dedicated `.model.js` file
- [ ] Convert validators and defaults
- [ ] Convert indexes and constraints

---

## Appendix A: Operator Quick Reference

```javascript
import { Op } from 'sequelize';

// Equals
{ field: value }
{ field: { [Op.eq]: value } }

// Not equal
{ field: { [Op.ne]: value } }

// Greater than
{ field: { [Op.gt]: value } }

// Greater or equal
{ field: { [Op.gte]: value } }

// Less than
{ field: { [Op.lt]: value } }

// Less or equal
{ field: { [Op.lte]: value } }

// In array
{ field: { [Op.in]: [1, 2, 3] } }

// Not in array
{ field: { [Op.notIn]: [1, 2, 3] } }

// Between
{ field: { [Op.between]: [start, end] } }

// Not between
{ field: { [Op.notBetween]: [start, end] } }

// Is null
{ field: { [Op.is]: null } }

// Logical AND
{ [Op.and]: [{ a: 1 }, { b: 2 }] }

// Logical OR
{ [Op.or]: [{ a: 1 }, { b: 2 }] }

// Like (case-sensitive)
{ field: { [Op.like]: '%pattern%' } }

// ILike (case-insensitive) - PostgreSQL only
{ field: { [Op.iLike]: '%pattern%' } }

// Contains (for JSONB)
{ field: { [Op.contains]: { nested: 'value' } } }

// Regex
{ field: { [Op.regex]: 'pattern', modifiers: 'i' } }
```

---

## Appendix B: Example Full Repository Conversion

### MissionRepository (Before → After)

**Key changes**:
- Remove `import mongoose`
- Rename custom `find()` method → removed entirely, use BaseRepository `findAll()`
- Replace `populate` with `include`
- Replace `mongoose.Types.ObjectId(id)` with direct `id`
- Replace `$or` with `[Op.or]`
- Replace `sort` with `order`
- Convert aggregation to raw SQL

---

## 15. Real-World Conversion Examples

### Example 1: MissionRepository (Repository Pattern)

**Before** (`server/repositories/modules/MissionRepository.js`):
```javascript
import BaseRepository from '../BaseRepository.js';
import Mission from '../../modules/hr-core/missions/models/Mission.js';
import mongoose from 'mongoose';

class MissionRepository extends BaseRepository {
    async findByEmployee(employeeId, options = {}) {
        try {
            const filter = { employee: employeeId };
            if (options.tenantId) filter.tenantId = options.tenantId;
            if (options.dateRange) {
                filter.$or = [
                    { startDate: { $gte: options.dateRange.startDate, $lte: options.dateRange.endDate } },
                    { endDate: { $gte: options.dateRange.startDate, $lte: options.dateRange.endDate } },
                    { startDate: { $lte: options.dateRange.startDate }, endDate: { $gte: options.dateRange.endDate } }
                ];
            }
            return await this.find(filter, {
                populate: [{ path: 'employee', select: 'firstName lastName employeeId' }],
                sort: { startDate: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }
}
```

**Key Issues**:
- Custom `find()` method uses mongoose query patterns
- `employee` field should be `employeeId` (FK column)
- `populate` needs explicit model imports
- `$or` operator using MongoDB syntax

**After**:
```javascript
import BaseRepository from '../BaseRepository.js';
import Mission from '../../modules/hr-core/missions/models/Mission.js';
import { Op } from 'sequelize';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';

class MissionRepository extends BaseRepository {
    async findByEmployee(employeeId, options = {}) {
        try {
            const where = { employeeId };
            if (options.dateRange) {
                where[Op.or] = [
                    { startDate: { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate } },
                    { endDate: { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate } },
                    { startDate: { [Op.lte]: options.dateRange.startDate }, endDate: { [Op.gte]: options.dateRange.endDate } }
                ];
            }
            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' },
                    { model: User, as: 'approvedBy' }
                ],
                order: [['startDate', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }
}
```

**Changes Made**:
- Removed `import mongoose`
- Replaced `filter` → `where`
- Replaced `employee: employeeId` → `employeeId` (actual FK column name)
- Replaced `$or` with `[Op.or]`
- Replaced `populate` with `include` and explicit model imports
- Replaced `sort: { startDate: -1 }` → `order: [['startDate', 'DESC']]`
- BaseRepository's `find()` removed; use `findAll()` now

**Aggregation Conversion**:
```javascript
// Before: this.model.aggregate(pipeline) with $match, $group
// After: Raw SQL via sequelize.query()
const result = await this.model.sequelize.query(`
    SELECT status, EXTRACT(MONTH FROM "startDate") as month, COUNT(*) as count
    FROM "missions"
    WHERE "departmentId" = :departmentId AND "startDate" >= :yearStart
    GROUP BY status, EXTRACT(MONTH FROM "startDate")
    ORDER BY month ASC, status ASC
`, {
    replacements: { departmentId, yearStart, yearEnd, ... },
    type: this.model.sequelize.QueryTypes.SELECT
});
```

---

### Example 2: HolidayController (Controller Pattern with Dynamic Schema Removal)

**Before** (`server/modules/hr-core/holidays/controllers/holiday.controller.js`):
```javascript
import mongoose from 'mongoose';
import multiTenantDB from '../../../../config/multiTenant.js';

const getHolidayModel = async (tenantId) => {
    const connection = await multiTenantDB.getCompanyConnection(tenantId);
    if (connection.models.Holiday) {
        return connection.models.Holiday;
    }
    const holidaySchema = new mongoose.Schema({
        tenantId: { type: String, required: true },
        officialHolidays: [{ date: Date, name: String }],
        weekendDays: { type: [Number], default: [5, 6] }
    });
    return connection.model('Holiday', holidaySchema);
};

export const getHolidaySettings = async (req, res) => {
    const tenantId = req.tenantId;
    const Holiday = await getHolidayModel(tenantId);
    const settings = await Holiday.findOne({ tenantId: tenantId });
    res.json(settings);
};
```

**Issues**: Dynamic schema creation, per-tenant DB connections, mongoose imports.

**After**:
```javascript
import Holiday from '../../modules/hr-core/holidays/models/holiday.model.js';

export const getHolidaySettings = async (req, res) => {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
    }

    let settings = await Holiday.findOne({ where: { tenantId } });
    if (!settings) {
        settings = await Holiday.create({
            tenantId,
            officialHolidays: [],
            weekendWorkDays: [],
            earlyLeaveDates: [],
            weekendDays: [5, 6]
        });
    }
    res.json(settings);
};
```

**Changes Made**:
- Removed `import mongoose` and `multiTenantDB`
- Removed `getHolidayModel()` dynamic model loading
- Direct import of `Holiday` model (already defined in `models/`)
- Query uses `findOne({ where: { tenantId } })`
- Single shared database, filter by `tenantId` column

---

### Example 3: EmployeeService (Service Pattern with Multi-Tenant Removal)

**Before** (`server/modules/life-insurance/services/employeeService.js`):
```javascript
import mongoose from 'mongoose';
import multiTenantDB from '../../../config/multiTenant.js';

class EmployeeService {
    async getUserModel(tenantId) {
        const connection = await multiTenantDB.getCompanyConnection(tenantId);
        const { default: User } = await import('../../hr-core/users/models/user.model.js');
        return connection.model('User', User.schema);
    }

    async findEmployeeForPolicy(employeeIdentifier, tenantId, requestingUser) {
        const User = await this.getUserModel(tenantId);
        const query = {};
        if (mongoose.Types.ObjectId.isValid(employeeIdentifier)) {
            query._id = employeeIdentifier;
        } else {
            query.employeeId = employeeIdentifier;
        }
        const employee = await User.findOne(query)
            .populate('department', 'name code')
            .populate('position', 'title level')
            .select('employeeId personalInfo firstName lastName email')
            .lean();
        return employee;
    }
}
```

**Issues**: Dynamic model registration, ObjectId handling, `.lean()` calls (Mongoose-only), per-tenant connections.

**After**:
```javascript
import { Op } from 'sequelize';
import User from '../../hr-core/users/models/user.model.js';
import Department from '../../hr-core/users/models/department.model.js';
import Position from '../../hr-core/users/models/position.model.js';

class EmployeeService {
    async findEmployeeForPolicy(employeeIdentifier, tenantId, requestingUser) {
        const baseQuery = { tenantId };
        baseQuery.id = employeeIdentifier; // UUID string, no ObjectId conversion needed

        if (requestingUser?.role === 'admin') {
            const employee = await User.findOne({
                where: baseQuery,
                include: [
                    { model: Department, as: 'department', attributes: ['name', 'code'] },
                    { model: Position, as: 'position', attributes: ['title', 'level'] }
                ],
                attributes: ['id', 'employeeId', 'personalInfo', 'email', 'departmentId', 'positionId']
            });
            return employee?.get({ plain: true });
        }

        // Role-based filtering logic...
        const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(baseQuery, requestingUser);
        const employee = await User.findOne({
            where: roleFilteredQuery,
            include: [/* associations */],
            attributes: [/* fields */]
        });
        return employee?.get({ plain: true });
    }

    validateEmployeeIdentifier(employeeIdentifier) {
        if (!employeeIdentifier) return { isValid: false, message: 'Required' };
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (typeof employeeIdentifier === 'string' && uuidPattern.test(employeeIdentifier)) {
            return { isValid: true, type: 'uuid' };
        }
        if (typeof employeeIdentifier === 'string' && employeeIdentifier.trim().length > 0) {
            return { isValid: true, type: 'employeeId' };
        }
        return { isValid: false, message: 'Invalid format' };
    }
}
```

**Changes Made**:
- Removed `multiTenantDB` entirely
- Direct static imports of models
- Simple UUID string validation via regex
- No `lean()` — Sequelize returns instances; use `.get({ plain: true })` for plain object
- Removed `.populate()` → replaced with `include` in query

---

### Example 4: Model Test Conversion

**Before** (`server/testing/models/user.model.test.js`):
```javascript
import mongoose from 'mongoose';
import User from '../../modules/hr-core/users/models/user.model.js';

describe('User Model', () => {
  it('should create a user', async () => {
    const user = new User({
      tenantId: 'test_tenant_123',
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!'
    });
    const savedUser = await user.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe('testuser');
  });
});
```

**After**:
```javascript
import { randomUUID } from 'crypto';
import User from '../../modules/hr-core/users/models/user.model.js';

describe('User Model', () => {
  it('should create a user', async () => {
    const user = User.build({
      tenantId: 'test_tenant_123',
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!'
    });
    const savedUser = await user.save();
    expect(savedUser.id).toBeDefined();
    expect(typeof savedUser.id).toBe('string');
    expect(savedUser.username).toBe('testuser');
  });
});
```

**Changes Made**:
- Removed `import mongoose`
- Replaced `new User()` with `User.build()` (both work; `build` is more Sequelize-idiomatic)
- Replaced `_id` with `id`
- No `ObjectId` generation needed — UUID auto-generated by `DataTypes.UUIDV4`

**For tests needing explicit IDs**:
```javascript
// Old: const id = new mongoose.Types.ObjectId();
// New:
import { randomUUID } from 'crypto';
const id = randomUUID();
// OR
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

---

### Example 5: Controller Test Conversion

**Before** (`server/testing/controllers/department.controller.test.js`):
```javascript
import mongoose from 'mongoose';
import * as departmentController from '../../modules/hr-core/users/controllers/department.controller.js';

beforeEach(async () => {
    testOrganization = await createTestDepartment();
    testUser = await createTestUser(testorganization._id, null, null);
    mockReq = createMockRequest({ user: { id: testUser._id } });
});
```

**After**:
```javascript
import * as departmentController from '../../modules/hr-core/users/controllers/department.controller.js';

beforeEach(async () => {
    testOrganization = await createTestDepartment();
    testUser = await createTestUser(testOrganization.id, null, null);
    mockReq = createMockRequest({ user: { id: testUser.id } });
});
```

**Changes Made**:
- Removed `import mongoose` (only needed if test uses ObjectId generation)
- Replaced `_id` with `id` throughout

---

## 16. ID Generation Standard (T007)

### For Application Code

**Never generate IDs manually in application code**. Always let the database auto-generate via `DataTypes.UUIDV4`:

```javascript
// Model definition
const Model = db.define('Model', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  }
});
// Creating a record without specifying ID
const record = await Model.create({ name: 'test' });
// record.id is automatically a UUID v4
```

### For Test Code

When tests need explicit UUIDs (e.g., referencing related records before they're saved), use the built-in Node.js `crypto.randomUUID()`:

```javascript
import { randomUUID } from 'crypto';

const userId = randomUUID();
const departmentId = randomUUID();

const user = await User.create({
  id: userId, // optional if auto-generated
  departmentId: departmentId,
  // ...
});
```

**Why `crypto.randomUUID()`?**
- Built into Node.js 14.17+ — no extra dependency
- RFC 4122 compliant UUID v4
- Cryptographically secure

**Alternative** (if crypto not available in your Node version):
```bash
npm install uuid
```
```javascript
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

### Never Use This Pattern

```javascript
// ❌ WRONG — brings back mongoose dependency
import mongoose from 'mongoose';
const id = new mongoose.Types.ObjectId(); // ObjectId, not UUID
```

```javascript
// ❌ WRONG — incompatible type
const id = Date.now().toString(); // Not a UUID
```

### UUID Validation

For functions that accept either UUID or employeeId string:
```javascript
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}
```

---

## 17. Common Conversion Pitfalls Summary

| Pitfall | What to Do |
|---------|-------------|
| Forgetting `Op` prefix | Always `import { Op } from 'sequelize'` and use `[Op.gte]`, not `$gte` |
| Wrong field names | Use actual column names (`employeeId`), not association names (`employee`) |
| Missing `as` in include | `include: [{ model: User, as: 'employee' }]` — alias must match `belongsTo` definition |
| Using `_id` instead of `id` | Sequelize instances expose `.id` not `._id` |
| Calling `.lean()` | Remove — `.get({ plain: true })` gives plain object |
| Forgetting `tenantId` | Always pass `tenantId` in `where` or as separate param to repository methods |
| Using `findOneAndUpdate` | Sequelize doesn't have this; use `update(..., { returning: true })` |
| Not awaiting `save()` | Always `await instance.save()` after mutation |
| Assuming JSONB nested query works | Use `Op.contains` for JSONB containment: `{ profile: { [Op.contains]: { age: 25 } } }` |
| Date-only fields with time | `DATEONLY` type strips time; ensure input doesn't have time component if not needed |

---

## 18. Checklist for File Conversion

Before committing a converted file, verify:

- [ ] No `import mongoose` or `require('mongoose')` anywhere
- [ ] No `new mongoose.Schema()` definitions
- [ ] No `mongoose.Types.ObjectId` calls
- [ ] No `connection.model()` calls
- [ ] No `multiTenantDB.getCompanyConnection()` calls
- [ ] All `$` query operators replaced with `Op` equivalents
- [ ] All `populate` replaced with `include` + explicit model imports
- [ ] All `sort` replaced with `order`
- [ ] All `skip` replaced with `offset`
- [ ] All `_id` property accesses replaced with `id`
- [ ] All aggregation pipelines converted to raw SQL or Sequelize grouping
- [ ] `tenantId` is present in every query's `where` clause
- [ ] Model associations (`belongsTo`, `hasMany`) are set up correctly with `as`
- [ ] Test ID generation uses `crypto.randomUUID()` or `uuidv4()`

---

**Document version**: 1.1  
**Last updated**: 2026-05-01  
**Includes**: Representative file diffs for T006 completion
