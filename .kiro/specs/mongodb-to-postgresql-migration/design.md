# Design Document: MongoDB to PostgreSQL Migration

## Overview

This design describes the complete migration of the HR-SM (Human Resources Management System) from MongoDB with Mongoose ODM to PostgreSQL with Sequelize ORM. The migration preserves the critical two-database architecture where the License Server database validates licenses for the Main Application database, while transitioning from a "database-per-tenant" model to a shared schema model using `tenant_id` columns for tenant isolation.

The design follows a phased approach to minimize risk: environment setup, model conversion, repository refactoring, service updates, data migration, and operational changes. The system will maintain its existing API contracts and business logic while fundamentally changing the underlying data persistence layer.

## Architecture

### Current Architecture (MongoDB)

```
┌─────────────────────────────────────────────────────────────┐
│ License Server (Port 4000)                                  │
├─────────────────────────────────────────────────────────────┤
│ MongoDB Database: hrsm-licenses                             │
│ - licenses collection                                       │
│ - license_validations collection                            │
│ - tenants collection                                        │
│ - subscriptions collection                                  │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ REST API / License Validation
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Main Application (Port 5000)                                │
├─────────────────────────────────────────────────────────────┤
│ MongoDB: Separate database per tenant                       │
│ - techcorp_solutions (tenant DB)                            │
│   - users, attendances, surveys, payroll, etc.             │
│ - healthcare_plus (tenant DB)                               │
│   - users, attendances, surveys, payroll, etc.             │
│ - finance_first (tenant DB)                                 │
│   - users, attendances, surveys, payroll, etc.             │
│                                                             │
│ MongoDB: hrsm_platform (shared metadata)                    │
│ - company_license (cached license data)                     │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (PostgreSQL)

```
┌─────────────────────────────────────────────────────────────┐
│ License Server (Port 4000)                                  │
├─────────────────────────────────────────────────────────────┤
│ PostgreSQL Database: hrsm-licenses                          │
│ Tables:                                                     │
│ - licenses (license records)                                │
│ - license_validations (audit logs)                          │
│ - tenants (tenant metadata)                                 │
│ - subscriptions (billing info)                              │
│ - enabled_modules (feature flags)                           │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ REST API / License Validation
                    │ (Same endpoints, now PostgreSQL-backed)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Main Application (Port 5000)                                │
├─────────────────────────────────────────────────────────────┤
│ PostgreSQL Database: hrsm_platform (SINGLE DATABASE)        │
│ All tables include tenant_id column:                        │
│ - users (tenant_id, ...)                                    │
│ - attendances (tenant_id, ...)                              │
│ - surveys (tenant_id, ...)                                  │
│ - payroll (tenant_id, ...)                                  │
│ - events (tenant_id, ...)                                   │
│ - company_license (tenant_id, cached license data)          │
│                                                             │
│ Indexes: All tenant-scoped tables have index on tenant_id   │
└─────────────────────────────────────────────────────────────┘
```


### Multi-Tenancy Model Transition

**Before (MongoDB):**
- Each tenant has a separate MongoDB database
- Database name derived from tenant identifier (e.g., `techcorp_solutions`)
- Connection switching based on tenant context
- Complete data isolation at database level

**After (PostgreSQL):**
- Single PostgreSQL database for all tenants
- `tenant_id` column in every tenant-scoped table
- Row-level tenant isolation through WHERE clauses
- Indexes on `tenant_id` for query performance
- Shared schema, isolated data

### Data Flow Comparison

**MongoDB Query Flow:**
```javascript
// 1. Get tenant-specific connection
const connection = await getCompanyConnection(tenantId);

// 2. Query using tenant's database
const User = connection.model('User');
const users = await User.find({ role: 'manager' });
```

**PostgreSQL Query Flow:**
```javascript
// 1. Use single connection with tenant context
const users = await User.findAll({
  where: {
    tenant_id: tenantId,  // Automatic tenant filtering
    role: 'manager'
  }
});
```


## Components and Interfaces

### 1. Database Connection Component

**Purpose:** Establish and manage connections to both PostgreSQL databases

**Location:** `server/config/database.js`

**Current Implementation (MongoDB):**
```javascript
const mongoose = require('mongoose');

async function connectDatabase() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
}
```

**New Implementation (PostgreSQL):**
```javascript
const { Sequelize } = require('sequelize');

// License Server Database Connection
const licenseServerDb = new Sequelize(process.env.LICENSE_DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  },
  timezone: '+00:00'  // UTC
});

// Main Application Database Connection
const mainAppDb = new Sequelize(process.env.MAIN_DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  timezone: '+00:00'  // UTC
});

async function connectDatabases() {
  try {
    await licenseServerDb.authenticate();
    console.log('License Server PostgreSQL connected');
    
    await mainAppDb.authenticate();
    console.log('Main Application PostgreSQL connected');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

module.exports = {
  licenseServerDb,
  mainAppDb,
  connectDatabases
};
```


### 2. Multi-Tenant Configuration Component

**Purpose:** Manage tenant context and database access

**Location:** `server/config/multiTenant.js`

**Current Implementation (MongoDB):**
```javascript
class MultiTenantManager {
  constructor() {
    this.connections = new Map();
  }

  async getCompanyConnection(tenantId) {
    const dbName = this.sanitizeCompanyName(tenantId);
    
    if (!this.connections.has(dbName)) {
      const connection = await mongoose.createConnection(
        `mongodb://localhost:27017/${dbName}`
      );
      this.connections.set(dbName, connection);
    }
    
    return this.connections.get(dbName);
  }
}
```

**New Implementation (PostgreSQL):**
```javascript
const { mainAppDb } = require('./database');

class MultiTenantManager {
  constructor() {
    this.db = mainAppDb;  // Single database connection
  }

  // No longer creates separate connections
  // Returns the shared database instance
  getConnection() {
    return this.db;
  }

  // Tenant context is now managed through middleware
  // and passed to queries as tenant_id parameter
  validateTenantId(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Invalid tenant ID');
    }
    return tenantId;
  }
}

module.exports = new MultiTenantManager();
```

**Tenant Middleware Update:**
```javascript
// server/middleware/tenantMiddleware.js
async function tenantMiddleware(req, res, next) {
  try {
    const tenantId = extractTenantId(req);  // From token, header, or subdomain
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    // Inject tenant context into request
    req.tenantId = tenantId;
    req.tenantContext = { tenant_id: tenantId };
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Tenant validation failed' });
  }
}
```


### 3. Model Conversion Component

**Purpose:** Convert Mongoose schemas to Sequelize models

**Example: User Model Conversion**

**Current (Mongoose):**
```javascript
// server/modules/hr-core/users/models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee'],
    default: 'employee'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  hireDate: Date,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Compound index for tenant isolation
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
```

**New (Sequelize):**
```javascript
// server/modules/hr-core/users/models/user.model.js
const { DataTypes } = require('sequelize');
const { mainAppDb } = require('../../../../config/database');

const User = mainAppDb.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenant_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Tenant identifier for multi-tenancy'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase());
    }
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'employee'),
    defaultValue: 'employee',
    allowNull: false
  },
  departmentId: {
    type: DataTypes.UUID,
    field: 'department_id',
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  hireDate: {
    type: DataTypes.DATE,
    field: 'hire_date'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['tenant_id', 'email']
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'role']
    }
  ]
});

// Define relationships
User.associate = (models) => {
  User.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'department'
  });
};

module.exports = User;
```


### 4. Data Type Mapping Reference

| MongoDB Type | PostgreSQL Type | Sequelize DataType | Notes |
|--------------|-----------------|-------------------|-------|
| ObjectId | UUID | DataTypes.UUID | Use UUIDV4 for new records |
| ObjectId (numeric) | BIGINT | DataTypes.BIGINT | For sequential IDs |
| String | VARCHAR(n) | DataTypes.STRING(n) | Specify length |
| String (long) | TEXT | DataTypes.TEXT | For unlimited length |
| Number (int) | INTEGER | DataTypes.INTEGER | 32-bit integer |
| Number (long) | BIGINT | DataTypes.BIGINT | 64-bit integer |
| Number (decimal) | DECIMAL(p,s) | DataTypes.DECIMAL(p,s) | For currency/precision |
| Boolean | BOOLEAN | DataTypes.BOOLEAN | True/false values |
| Date | TIMESTAMP WITH TIME ZONE | DataTypes.DATE | Always use UTC |
| Array | ARRAY or JSONB | DataTypes.ARRAY or JSONB | JSONB for complex arrays |
| Object/Mixed | JSONB | DataTypes.JSONB | For flexible schemas |
| Buffer | BYTEA | DataTypes.BLOB | For binary data |
| Enum | ENUM or CHECK | DataTypes.ENUM | PostgreSQL native enum |


### 5. BaseRepository Refactoring Component

**Purpose:** Update repository pattern for Sequelize

**Location:** `server/repositories/BaseRepository.js`

**Current (Mongoose):**
```javascript
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async findById(id) {
    return await this.model.findById(id);
  }

  async find(query = {}) {
    return await this.model.find(query);
  }

  async update(id, data) {
    return await this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await this.model.findByIdAndDelete(id);
  }
}
```

**New (Sequelize):**
```javascript
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  // CRITICAL: All methods must include tenant_id filtering
  async create(data, tenantId) {
    return await this.model.create({
      ...data,
      tenant_id: tenantId
    });
  }

  async findById(id, tenantId) {
    return await this.model.findOne({
      where: {
        id,
        tenant_id: tenantId
      }
    });
  }

  async findOne(conditions, tenantId) {
    return await this.model.findOne({
      where: {
        ...conditions,
        tenant_id: tenantId
      }
    });
  }

  async findAll(conditions = {}, tenantId, options = {}) {
    return await this.model.findAll({
      where: {
        ...conditions,
        tenant_id: tenantId
      },
      ...options  // include, order, limit, offset
    });
  }

  async update(id, data, tenantId) {
    const [affectedCount] = await this.model.update(data, {
      where: {
        id,
        tenant_id: tenantId
      }
    });
    
    if (affectedCount === 0) {
      return null;
    }
    
    return await this.findById(id, tenantId);
  }

  async delete(id, tenantId) {
    return await this.model.destroy({
      where: {
        id,
        tenant_id: tenantId
      }
    });
  }

  async count(conditions = {}, tenantId) {
    return await this.model.count({
      where: {
        ...conditions,
        tenant_id: tenantId
      }
    });
  }

  async exists(conditions, tenantId) {
    const count = await this.count(conditions, tenantId);
    return count > 0;
  }

  async paginate(conditions = {}, tenantId, page = 1, limit = 10, options = {}) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await this.model.findAndCountAll({
      where: {
        ...conditions,
        tenant_id: tenantId
      },
      limit,
      offset,
      ...options
    });
    
    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }
}

module.exports = BaseRepository;
```


### 6. QueryBuilder Replacement Component

**Purpose:** Replace MongoDB query builder with Sequelize-compatible version

**Location:** `server/repositories/QueryBuilder.js`

**Current (MongoDB):**
```javascript
class QueryBuilder {
  constructor(model) {
    this.model = model;
    this.query = {};
    this.options = {};
  }

  where(field, value) {
    this.query[field] = value;
    return this;
  }

  in(field, values) {
    this.query[field] = { $in: values };
    return this;
  }

  regex(field, pattern) {
    this.query[field] = { $regex: pattern, $options: 'i' };
    return this;
  }

  or(conditions) {
    this.query.$or = conditions;
    return this;
  }

  async execute() {
    return await this.model.find(this.query, null, this.options);
  }
}
```

**New (Sequelize):**
```javascript
const { Op } = require('sequelize');

class QueryBuilder {
  constructor(model) {
    this.model = model;
    this.whereConditions = {};
    this.options = {};
    this.tenantId = null;
  }

  // Set tenant context (REQUIRED)
  tenant(tenantId) {
    this.tenantId = tenantId;
    return this;
  }

  where(field, value) {
    this.whereConditions[field] = value;
    return this;
  }

  equals(field, value) {
    this.whereConditions[field] = value;
    return this;
  }

  in(field, values) {
    this.whereConditions[field] = { [Op.in]: values };
    return this;
  }

  notIn(field, values) {
    this.whereConditions[field] = { [Op.notIn]: values };
    return this;
  }

  greaterThan(field, value) {
    this.whereConditions[field] = { [Op.gt]: value };
    return this;
  }

  lessThan(field, value) {
    this.whereConditions[field] = { [Op.lt]: value };
    return this;
  }

  greaterThanOrEqual(field, value) {
    this.whereConditions[field] = { [Op.gte]: value };
    return this;
  }

  lessThanOrEqual(field, value) {
    this.whereConditions[field] = { [Op.lte]: value };
    return this;
  }

  like(field, pattern) {
    this.whereConditions[field] = { [Op.iLike]: `%${pattern}%` };
    return this;
  }

  startsWith(field, prefix) {
    this.whereConditions[field] = { [Op.iLike]: `${prefix}%` };
    return this;
  }

  endsWith(field, suffix) {
    this.whereConditions[field] = { [Op.iLike]: `%${suffix}` };
    return this;
  }

  isNull(field) {
    this.whereConditions[field] = { [Op.is]: null };
    return this;
  }

  isNotNull(field) {
    this.whereConditions[field] = { [Op.not]: null };
    return this;
  }

  or(conditions) {
    this.whereConditions[Op.or] = conditions;
    return this;
  }

  and(conditions) {
    this.whereConditions[Op.and] = conditions;
    return this;
  }

  sort(field, direction = 'ASC') {
    if (!this.options.order) {
      this.options.order = [];
    }
    this.options.order.push([field, direction]);
    return this;
  }

  limit(count) {
    this.options.limit = count;
    return this;
  }

  skip(count) {
    this.options.offset = count;
    return this;
  }

  select(fields) {
    this.options.attributes = fields;
    return this;
  }

  include(associations) {
    this.options.include = associations;
    return this;
  }

  excludeDeleted() {
    this.whereConditions.deletedAt = { [Op.is]: null };
    return this;
  }

  async execute() {
    if (!this.tenantId) {
      throw new Error('Tenant ID is required for query execution');
    }

    // Always add tenant_id to where conditions
    const finalWhere = {
      ...this.whereConditions,
      tenant_id: this.tenantId
    };

    return await this.model.findAll({
      where: finalWhere,
      ...this.options
    });
  }

  async executeOne() {
    if (!this.tenantId) {
      throw new Error('Tenant ID is required for query execution');
    }

    const finalWhere = {
      ...this.whereConditions,
      tenant_id: this.tenantId
    };

    return await this.model.findOne({
      where: finalWhere,
      ...this.options
    });
  }

  async count() {
    if (!this.tenantId) {
      throw new Error('Tenant ID is required for query execution');
    }

    const finalWhere = {
      ...this.whereConditions,
      tenant_id: this.tenantId
    };

    return await this.model.count({
      where: finalWhere
    });
  }

  async paginate(page = 1, pageSize = 10) {
    this.limit(pageSize);
    this.skip((page - 1) * pageSize);

    const [results, total] = await Promise.all([
      this.execute(),
      this.count()
    ]);

    return {
      data: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
}

module.exports = QueryBuilder;
```


### 7. Data Migration Script Component

**Purpose:** Migrate existing data from MongoDB to PostgreSQL

**Location:** `scripts/migrate-mongo-to-postgres.js`

**Key Functions:**

```javascript
const mongoose = require('mongoose');
const { mainAppDb, licenseServerDb } = require('../server/config/database');
const { v4: uuidv4 } = require('uuid');

class MongoToPostgresMigrator {
  constructor() {
    this.stats = {
      collections: {},
      totalRecords: 0,
      migratedRecords: 0,
      errors: []
    };
  }

  // Connect to both databases
  async connect() {
    await mongoose.connect(process.env.MONGODB_URI);
    await mainAppDb.authenticate();
    await licenseServerDb.authenticate();
  }

  // Get list of tenant databases from MongoDB
  async getTenantDatabases() {
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();
    
    return databases
      .map(db => db.name)
      .filter(name => !['admin', 'local', 'config', 'hrsm_platform', 'hrsm-licenses'].includes(name));
  }

  // Migrate license server database
  async migrateLicenseServer() {
    console.log('Migrating license server database...');
    
    const licenseConn = await mongoose.createConnection(
      process.env.MONGODB_LICENSE_URI || 'mongodb://localhost:27017/hrsm-licenses'
    );

    // Migrate licenses collection
    await this.migrateCollection(
      licenseConn,
      'licenses',
      licenseServerDb,
      'licenses',
      this.transformLicense.bind(this)
    );

    // Migrate tenants collection
    await this.migrateCollection(
      licenseConn,
      'tenants',
      licenseServerDb,
      'tenants',
      this.transformTenant.bind(this)
    );

    await licenseConn.close();
  }

  // Migrate main application database (all tenants)
  async migrateMainApplication() {
    console.log('Migrating main application database...');
    
    const tenantDatabases = await this.getTenantDatabases();
    
    for (const dbName of tenantDatabases) {
      const tenantId = dbName;  // Database name is the tenant ID
      console.log(`Migrating tenant: ${tenantId}`);
      
      const tenantConn = await mongoose.createConnection(
        `mongodb://localhost:27017/${dbName}`
      );

      // Get all collections in this tenant database
      const collections = await tenantConn.db.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        
        await this.migrateCollection(
          tenantConn,
          collectionName,
          mainAppDb,
          collectionName,
          (doc) => this.transformTenantDocument(doc, tenantId)
        );
      }

      await tenantConn.close();
    }
  }

  // Generic collection migration
  async migrateCollection(sourceConn, sourceCollection, destDb, destTable, transformFn) {
    try {
      const collection = sourceConn.collection(sourceCollection);
      const count = await collection.countDocuments();
      
      console.log(`  Migrating ${sourceCollection}: ${count} documents`);
      
      this.stats.collections[sourceCollection] = {
        total: count,
        migrated: 0,
        errors: 0
      };

      const batchSize = 1000;
      let skip = 0;

      while (skip < count) {
        const documents = await collection.find({})
          .skip(skip)
          .limit(batchSize)
          .toArray();

        const transformedDocs = documents.map(transformFn);
        
        try {
          await destDb.models[destTable].bulkCreate(transformedDocs, {
            ignoreDuplicates: true
          });
          
          this.stats.collections[sourceCollection].migrated += documents.length;
          this.stats.migratedRecords += documents.length;
        } catch (error) {
          console.error(`  Error migrating batch: ${error.message}`);
          this.stats.collections[sourceCollection].errors += documents.length;
          this.stats.errors.push({
            collection: sourceCollection,
            error: error.message,
            batch: { skip, limit: batchSize }
          });
        }

        skip += batchSize;
        
        // Progress indicator
        const progress = ((skip / count) * 100).toFixed(2);
        process.stdout.write(`\r  Progress: ${progress}%`);
      }
      
      console.log(`\n  ✓ Completed ${sourceCollection}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate ${sourceCollection}: ${error.message}`);
      this.stats.errors.push({
        collection: sourceCollection,
        error: error.message
      });
    }
  }

  // Transform MongoDB document to PostgreSQL row
  transformTenantDocument(doc, tenantId) {
    return {
      id: this.convertObjectId(doc._id),
      tenant_id: tenantId,  // Add tenant_id to every record
      ...this.transformFields(doc),
      created_at: doc.createdAt || new Date(),
      updated_at: doc.updatedAt || new Date()
    };
  }

  // Transform license document
  transformLicense(doc) {
    return {
      id: this.convertObjectId(doc._id),
      tenant_id: doc.tenantId || doc.companyId,
      license_key: doc.licenseKey,
      expires_at: doc.expiresAt,
      ...this.transformFields(doc),
      created_at: doc.createdAt || new Date(),
      updated_at: doc.updatedAt || new Date()
    };
  }

  // Transform tenant document
  transformTenant(doc) {
    return {
      id: this.convertObjectId(doc._id),
      tenant_id: doc.tenantId,
      name: doc.name,
      domain: doc.domain,
      ...this.transformFields(doc),
      created_at: doc.createdAt || new Date(),
      updated_at: doc.updatedAt || new Date()
    };
  }

  // Convert MongoDB ObjectId to UUID
  convertObjectId(objectId) {
    if (!objectId) return uuidv4();
    
    // Option 1: Generate deterministic UUID from ObjectId
    const hex = objectId.toString();
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 24)}`;
    
    // Option 2: Use sequential integer (if using BIGINT)
    // return parseInt(objectId.toString().slice(-12), 16);
  }

  // Transform field names and values
  transformFields(doc) {
    const transformed = {};
    
    for (const [key, value] of Object.entries(doc)) {
      // Skip MongoDB internal fields
      if (key === '_id' || key === '__v') continue;
      
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      // Handle special types
      if (value instanceof mongoose.Types.ObjectId) {
        transformed[snakeKey] = this.convertObjectId(value);
      } else if (Array.isArray(value) || typeof value === 'object') {
        // Store complex types as JSONB
        transformed[snakeKey] = value;
      } else {
        transformed[snakeKey] = value;
      }
    }
    
    return transformed;
  }

  // Generate migration report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total Records: ${this.stats.totalRecords}`);
    console.log(`Migrated: ${this.stats.migratedRecords}`);
    console.log(`Errors: ${this.stats.errors.length}`);
    console.log('\nCollection Details:');
    
    for (const [collection, stats] of Object.entries(this.stats.collections)) {
      console.log(`  ${collection}:`);
      console.log(`    Total: ${stats.total}`);
      console.log(`    Migrated: ${stats.migrated}`);
      console.log(`    Errors: ${stats.errors}`);
    }
    
    if (this.stats.errors.length > 0) {
      console.log('\nErrors:');
      this.stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.collection}: ${error.error}`);
      });
    }
    
    console.log('='.repeat(60));
  }

  // Main migration execution
  async migrate() {
    try {
      console.log('Starting MongoDB to PostgreSQL migration...\n');
      
      await this.connect();
      
      // Migrate license server first
      await this.migrateLicenseServer();
      
      // Then migrate all tenant data
      await this.migrateMainApplication();
      
      this.generateReport();
      
      console.log('\n✓ Migration completed successfully');
    } catch (error) {
      console.error('\n✗ Migration failed:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const migrator = new MongoToPostgresMigrator();
  migrator.migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = MongoToPostgresMigrator;
```


## Data Models

### PostgreSQL Schema Examples

**Users Table (Main Application Database):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN DEFAULT true,
  hire_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT users_tenant_email_unique UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_users_email ON users(email);
```

**Licenses Table (License Server Database):**
```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL UNIQUE,
  license_key TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_licenses_tenant_id ON licenses(tenant_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Database Connection Properties

Property 1: Dual database connectivity
*For any* application startup, both the license server and main application PostgreSQL databases should be successfully connected before the application accepts requests
**Validates: Requirements 1.7**

Property 2: Connection pool management
*For any* database operation, the system should use the appropriate connection pool (license server or main application) based on the data being accessed
**Validates: Requirements 1.5**

### Multi-Tenancy Properties

Property 3: Tenant isolation through tenant_id
*For any* query on a tenant-scoped table, the WHERE clause should include tenant_id filtering
**Validates: Requirements 3.2, 6.10**

Property 4: Automatic tenant_id injection
*For any* insert operation on a tenant-scoped table, the tenant_id should be automatically included in the record
**Validates: Requirements 3.3**

Property 5: Single database for all tenants
*For any* tenant data access, the system should use the single main application database connection, not create separate database connections
**Validates: Requirements 3.5**

### Model Conversion Properties

Property 6: Schema equivalence
*For any* Mongoose schema, there should exist an equivalent Sequelize model with matching fields and constraints
**Validates: Requirements 4.1**

Property 7: Data type mapping correctness
*For any* MongoDB field type, the corresponding PostgreSQL column should use the appropriate data type according to the mapping rules
**Validates: Requirements 4.2, 5.1-5.8**

Property 8: Relationship preservation
*For any* Mongoose ref relationship, there should exist an equivalent Sequelize foreign key constraint
**Validates: Requirements 4.7**

Property 9: Index preservation
*For any* MongoDB compound index, there should exist an equivalent PostgreSQL composite index
**Validates: Requirements 4.10**

### Repository Operations Properties

Property 10: Tenant filtering in all operations
*For any* repository method call (create, find, update, delete), the operation should include tenant_id in the query conditions
**Validates: Requirements 6.1-6.10**

Property 11: CRUD operation equivalence
*For any* CRUD operation that worked in MongoDB, the equivalent Sequelize operation should produce the same business result
**Validates: Requirements 6.1-6.9**

### Query Builder Properties

Property 12: Query operator translation
*For any* MongoDB query operator ($in, $regex, $or), the QueryBuilder should generate the equivalent Sequelize operator (Op.in, Op.iLike, Op.or)
**Validates: Requirements 7.2-7.11**

Property 13: Mandatory tenant context
*For any* QueryBuilder execution, if tenant_id is not set, the system should throw an error
**Validates: Requirements 7.12**

### Data Migration Properties

Property 14: Record count preservation
*For any* MongoDB collection, the number of records migrated to PostgreSQL should equal the number of documents in the source collection
**Validates: Requirements 9.10, 10.1**

Property 15: Field value preservation
*For any* migrated document, all field values should be preserved in the corresponding PostgreSQL row with appropriate type conversions
**Validates: Requirements 9.7**

Property 16: Tenant_id injection during migration
*For any* record migrated from a tenant-specific MongoDB database, the tenant_id should be correctly embedded based on the source database name
**Validates: Requirements 9.5**

Property 17: ObjectId to UUID conversion consistency
*For any* MongoDB ObjectId, the conversion to PostgreSQL UUID should be deterministic and reversible
**Validates: Requirements 9.4**

### Data Validation Properties

Property 18: Migration completeness verification
*For any* completed migration, all MongoDB documents should have corresponding PostgreSQL rows
**Validates: Requirements 10.2**

Property 19: Critical field matching
*For any* migrated record, critical business fields should match between MongoDB source and PostgreSQL destination
**Validates: Requirements 10.3**

Property 20: Relationship integrity preservation
*For any* relationship in MongoDB (via ObjectId references), the equivalent foreign key relationship should exist in PostgreSQL
**Validates: Requirements 10.4**

### Transaction Properties

Property 21: Transaction atomicity
*For any* multi-step operation within a transaction, either all operations should succeed and commit, or all should fail and rollback
**Validates: Requirements 12.1, 12.2, 12.3**

### License Validation Properties

Property 22: License validation between databases
*For any* license validation request from the main application, the system should query the license server PostgreSQL database
**Validates: Requirements 21.1, 21.2**

Property 23: License cache fallback
*For any* license validation when the license server database is unavailable, the system should fall back to cached license data in the main application database
**Validates: Requirements 21.5**

Property 24: License validation API contract preservation
*For any* license validation API endpoint, the request and response format should remain unchanged after migration to PostgreSQL
**Validates: Requirements 21.6**

### Error Handling Properties

Property 25: Sequelize error handling
*For any* database constraint violation (unique, foreign key, validation), the system should catch the appropriate Sequelize error and handle it gracefully
**Validates: Requirements 14.1, 14.2, 14.3**

Property 26: Error logging with context
*For any* database error, the system should log the SQL query, parameters, and stack trace for debugging
**Validates: Requirements 14.5**


## Error Handling

### Database Connection Errors

**PostgreSQL Connection Failure:**
```javascript
class DatabaseConnectionError extends Error {
  constructor(database, originalError) {
    super(`Failed to connect to PostgreSQL database: ${database}`);
    this.name = 'DatabaseConnectionError';
    this.database = database;
    this.originalError = originalError;
    this.recoverable = true;
  }
}

// Handling
async function connectWithRetry(db, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.authenticate();
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new DatabaseConnectionError(db.config.database, error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

### Constraint Violation Errors

**Unique Constraint Violation:**
```javascript
const { UniqueConstraintError } = require('sequelize');

try {
  await User.create({ tenant_id: 'techcorp', email: 'john@example.com' });
} catch (error) {
  if (error instanceof UniqueConstraintError) {
    throw new Error(`User with email ${email} already exists for this tenant`);
  }
  throw error;
}
```

**Foreign Key Violation:**
```javascript
const { ForeignKeyConstraintError } = require('sequelize');

try {
  await User.create({ tenant_id: 'techcorp', departmentId: 'invalid-uuid' });
} catch (error) {
  if (error instanceof ForeignKeyConstraintError) {
    throw new Error(`Referenced department does not exist`);
  }
  throw error;
}
```

### Migration Errors

**Data Type Conversion Error:**
```javascript
class DataConversionError extends Error {
  constructor(field, value, targetType, originalError) {
    super(`Failed to convert field ${field} to ${targetType}`);
    this.name = 'DataConversionError';
    this.field = field;
    this.value = value;
    this.targetType = targetType;
    this.originalError = originalError;
  }
}

// Handling
function convertValue(field, value, targetType) {
  try {
    switch (targetType) {
      case 'UUID':
        return convertObjectIdToUUID(value);
      case 'TIMESTAMP':
        return new Date(value);
      case 'JSONB':
        return JSON.stringify(value);
      default:
        return value;
    }
  } catch (error) {
    throw new DataConversionError(field, value, targetType, error);
  }
}
```

### Transaction Errors

**Transaction Rollback:**
```javascript
const { Transaction } = require('sequelize');

async function performMultiStepOperation(tenantId, data) {
  const transaction = await mainAppDb.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    // Step 1: Create user
    const user = await User.create(
      { ...data.user, tenant_id: tenantId },
      { transaction }
    );

    // Step 2: Create profile
    const profile = await Profile.create(
      { ...data.profile, userId: user.id, tenant_id: tenantId },
      { transaction }
    );

    // Step 3: Assign role
    await UserRole.create(
      { userId: user.id, roleId: data.roleId, tenant_id: tenantId },
      { transaction }
    );

    await transaction.commit();
    return { user, profile };
  } catch (error) {
    await transaction.rollback();
    logger.error('Multi-step operation failed, rolled back', {
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
```


## Testing Strategy

### Dual Testing Approach

This migration requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific model conversions with known data
- Repository method behavior with sample records
- Query builder operations with concrete examples
- Migration script functionality with test datasets
- Error handling for specific failure scenarios
- License validation between databases

**Property-Based Tests** focus on:
- Data type conversions across all possible values
- Tenant isolation across random tenant IDs
- Query correctness with randomly generated conditions
- Migration integrity with generated document sets
- Transaction behavior under various operation sequences
- Concurrent access patterns

### Property-Based Testing Configuration

We will use **fast-check** (for JavaScript/Node.js) as the property-based testing library.

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: mongodb-to-postgresql-migration, Property {N}: {property description}`

**Example Property Tests:**

```javascript
const fc = require('fast-check');
const { User } = require('../server/modules/hr-core/users/models/user.model');

describe('Feature: mongodb-to-postgresql-migration, Property 3: Tenant isolation', () => {
  it('should always include tenant_id in WHERE clause for queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),  // tenant_id
        fc.emailAddress(),  // email
        async (tenantId, email) => {
          // Create test user
          await User.create({
            tenant_id: tenantId,
            email,
            firstName: 'Test',
            lastName: 'User',
            role: 'employee'
          });

          // Query should only return users for this tenant
          const users = await User.findAll({
            where: { tenant_id: tenantId }
          });

          // Verify all returned users belong to the tenant
          expect(users.every(u => u.tenant_id === tenantId)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: mongodb-to-postgresql-migration, Property 14: Record count preservation', () => {
  it('should migrate all documents from MongoDB to PostgreSQL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userDocumentArbitrary(), { minLength: 10, maxLength: 100 }),
        async (documents) => {
          // Setup: Insert documents into MongoDB
          await mongoCollection.insertMany(documents);
          const mongoCount = await mongoCollection.countDocuments();

          // Execute: Run migration
          await migrator.migrateCollection(
            mongoCollection,
            'users',
            mainAppDb,
            'users',
            transformUser
          );

          // Verify: Count matches in PostgreSQL
          const pgCount = await User.count();
          expect(pgCount).toBe(mongoCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: mongodb-to-postgresql-migration, Property 21: Transaction atomicity', () => {
  it('should rollback all operations if any step fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),  // tenant_id
        fc.record({
          user: userDataArbitrary(),
          profile: profileDataArbitrary(),
          shouldFail: fc.boolean()
        }),
        async (tenantId, data) => {
          const initialUserCount = await User.count({ where: { tenant_id: tenantId } });
          const initialProfileCount = await Profile.count({ where: { tenant_id: tenantId } });

          try {
            await performMultiStepOperation(tenantId, data, data.shouldFail);
          } catch (error) {
            // If operation failed, counts should be unchanged
            const finalUserCount = await User.count({ where: { tenant_id: tenantId } });
            const finalProfileCount = await Profile.count({ where: { tenant_id: tenantId } });

            expect(finalUserCount).toBe(initialUserCount);
            expect(finalProfileCount).toBe(initialProfileCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Arbitrary generators
function userDocumentArbitrary() {
  return fc.record({
    _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    email: fc.emailAddress(),
    firstName: fc.string({ minLength: 2, maxLength: 50 }),
    lastName: fc.string({ minLength: 2, maxLength: 50 }),
    role: fc.constantFrom('admin', 'manager', 'employee'),
    isActive: fc.boolean(),
    createdAt: fc.date(),
    updatedAt: fc.date()
  });
}

function userDataArbitrary() {
  return fc.record({
    email: fc.emailAddress(),
    firstName: fc.string({ minLength: 2, maxLength: 50 }),
    lastName: fc.string({ minLength: 2, maxLength: 50 }),
    role: fc.constantFrom('admin', 'manager', 'employee')
  });
}

function profileDataArbitrary() {
  return fc.record({
    bio: fc.string({ maxLength: 500 }),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    address: fc.string({ maxLength: 200 })
  });
}
```

### Unit Testing Examples

```javascript
describe('User Model', () => {
  it('should create a user with tenant_id', async () => {
    const user = await User.create({
      tenant_id: 'techcorp',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'employee'
    });

    expect(user.tenant_id).toBe('techcorp');
    expect(user.email).toBe('john@example.com');
  });

  it('should enforce unique email per tenant', async () => {
    await User.create({
      tenant_id: 'techcorp',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe'
    });

    await expect(
      User.create({
        tenant_id: 'techcorp',
        email: 'john@example.com',
        firstName: 'Jane',
        lastName: 'Smith'
      })
    ).rejects.toThrow();
  });

  it('should allow same email for different tenants', async () => {
    await User.create({
      tenant_id: 'techcorp',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe'
    });

    const user2 = await User.create({
      tenant_id: 'healthcare',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Smith'
    });

    expect(user2.tenant_id).toBe('healthcare');
  });
});

describe('BaseRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new BaseRepository(User);
  });

  it('should filter by tenant_id in findAll', async () => {
    await User.bulkCreate([
      { tenant_id: 'techcorp', email: 'user1@tech.com', firstName: 'User', lastName: 'One' },
      { tenant_id: 'healthcare', email: 'user2@health.com', firstName: 'User', lastName: 'Two' }
    ]);

    const users = await repository.findAll({}, 'techcorp');

    expect(users).toHaveLength(1);
    expect(users[0].tenant_id).toBe('techcorp');
  });

  it('should include tenant_id in create', async () => {
    const user = await repository.create({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User'
    }, 'techcorp');

    expect(user.tenant_id).toBe('techcorp');
  });
});

describe('QueryBuilder', () => {
  it('should throw error if tenant_id not set', async () => {
    const query = new QueryBuilder(User)
      .where('role', 'manager');

    await expect(query.execute()).rejects.toThrow('Tenant ID is required');
  });

  it('should build correct WHERE clause with tenant_id', async () => {
    const query = new QueryBuilder(User)
      .tenant('techcorp')
      .where('role', 'manager')
      .greaterThan('hireDate', new Date('2020-01-01'));

    const users = await query.execute();

    users.forEach(user => {
      expect(user.tenant_id).toBe('techcorp');
      expect(user.role).toBe('manager');
    });
  });
});
```

### Integration Testing

```javascript
describe('License Validation Integration', () => {
  it('should validate license from license server database', async () => {
    // Setup: Create license in license server DB
    await License.create({
      tenant_id: 'techcorp',
      license_key: 'test-key-123',
      expires_at: new Date('2030-12-31'),
      status: 'active'
    });

    // Execute: Validate from main application
    const isValid = await licenseService.validateLicense('techcorp', 'test-key-123');

    expect(isValid).toBe(true);
  });

  it('should fall back to cache when license server unavailable', async () => {
    // Setup: Create cached license in main app DB
    await CompanyLicense.create({
      tenant_id: 'techcorp',
      license_key: 'test-key-123',
      quickAccess: {
        licenseValid: true,
        lastSyncedAt: new Date()
      }
    });

    // Simulate license server unavailable
    jest.spyOn(licenseServerDb, 'query').mockRejectedValue(new Error('Connection failed'));

    // Execute: Should use cache
    const isValid = await licenseService.validateLicense('techcorp', 'test-key-123');

    expect(isValid).toBe(true);
  });
});
```

