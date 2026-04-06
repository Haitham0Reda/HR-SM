# Sequelize Models Reference

## Overview

This document provides comprehensive reference documentation for all Sequelize models in the HR-SM application. Each model represents a database table and defines the structure, relationships, and behavior of the data.

## Table of Contents

1. [Model Structure](#model-structure)
2. [License Server Models](#license-server-models)
3. [Main Application Models](#main-application-models)
4. [Model Associations](#model-associations)
5. [Scopes and Hooks](#scopes-and-hooks)
6. [Usage Examples](#usage-examples)

## Model Structure

### Standard Model Pattern

All Sequelize models follow this structure:

```javascript
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../config/database.js';

const ModelName = mainAppDb.define('ModelName', {
  // Primary Key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Multi-tenancy (for tenant-scoped models)
  tenant_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id'
  },
  
  // Model-specific fields
  // ...
  
  // Timestamps
  created_at: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'table_name',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    // Additional indexes
  ]
});

// Define associations
ModelName.associate = (models) => {
  // Relationships
};

export default ModelName;
```

### Common Model Options

- `tableName`: Explicit table name (snake_case)
- `timestamps`: Enable automatic createdAt/updatedAt
- `underscored`: Use snake_case for column names
- `paranoid`: Enable soft deletes with deletedAt
- `indexes`: Define database indexes
- `defaultScope`: Default query filters
- `scopes`: Named query scopes

## License Server Models

### Tenant Model

**Location**: `hrsm-license-server/src/models/tenant.model.js`

**Purpose**: Stores tenant (company) metadata and configuration.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Unique tenant identifier
  name: STRING(255),           // Company name
  domain: STRING(255),         // Company domain
  contact_email: STRING(255),  // Primary contact email
  contact_phone: STRING(50),   // Primary contact phone
  address: TEXT,               // Company address
  status: STRING(50),          // Tenant status (active, suspended, inactive)
  settings: JSONB,             // Configuration settings
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id` (unique)
- `status`
- `domain`

**Associations**:
- `hasOne` License
- `hasMany` Subscriptions
- `hasMany` EnabledModules

**Usage**:
```javascript
// Find tenant by tenant_id
const tenant = await Tenant.findOne({ where: { tenant_id: 'techcorp' } });

// Create new tenant
const newTenant = await Tenant.create({
  tenant_id: 'newcompany',
  name: 'New Company Inc.',
  domain: 'newcompany.com',
  contact_email: 'admin@newcompany.com',
  status: 'active'
});

// Update tenant status
await tenant.update({ status: 'suspended' });
```

### License Model

**Location**: `hrsm-license-server/src/models/license.model.js`

**Purpose**: Stores license information for each tenant.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Foreign key to tenants
  license_key: TEXT,           // Unique license key
  license_type: STRING(50),    // License type (trial, basic, professional, enterprise)
  expires_at: DATE,            // Expiration date
  status: STRING(50),          // License status (active, expired, suspended)
  max_users: INTEGER,          // Maximum allowed users
  max_storage_gb: INTEGER,     // Maximum storage in GB
  features: JSONB,             // Enabled features
  metadata: JSONB,             // Additional metadata
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id` (unique)
- `license_key` (unique)
- `status`
- `expires_at`

**Associations**:
- `belongsTo` Tenant

**Instance Methods**:
```javascript
// Check if license is valid
isValid() {
  return this.status === 'active' && new Date() < new Date(this.expires_at);
}

// Check if license is expired
isExpired() {
  return new Date() >= new Date(this.expires_at);
}
```

**Usage**:
```javascript
// Find license by tenant
const license = await License.findOne({
  where: { tenant_id: 'techcorp' },
  include: [{ model: Tenant }]
});

// Check if valid
if (license.isValid()) {
  console.log('License is active');
}

// Update license expiration
await license.update({
  expires_at: new Date('2027-12-31')
});
```

### Subscription Model

**Location**: `hrsm-license-server/src/models/subscription.model.js`

**Purpose**: Stores subscription and billing information.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Foreign key to tenants
  plan_id: UUID,               // Reference to subscription plan
  status: STRING(50),          // Subscription status (active, cancelled, past_due)
  billing_cycle: STRING(50),   // Billing frequency (monthly, yearly)
  amount: DECIMAL(10, 2),      // Subscription amount
  currency: STRING(10),        // Currency code (USD, EUR, etc.)
  next_billing_date: DATE,     // Next billing date
  payment_method: STRING(100), // Payment method identifier
  metadata: JSONB,             // Additional metadata
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `status`
- `next_billing_date`

**Associations**:
- `belongsTo` Tenant

**Usage**:
```javascript
// Find active subscription
const subscription = await Subscription.findOne({
  where: {
    tenant_id: 'techcorp',
    status: 'active'
  }
});

// Update billing date
await subscription.update({
  next_billing_date: new Date('2026-05-01')
});
```

### EnabledModule Model

**Location**: `hrsm-license-server/src/models/enabledModule.model.js`

**Purpose**: Tracks which modules are enabled for each tenant.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Foreign key to tenants
  module_name: STRING(100),    // Module identifier
  enabled: BOOLEAN,            // Whether module is enabled
  settings: JSONB,             // Module-specific settings
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `module_name`
- `(tenant_id, module_name)` (unique composite)

**Associations**:
- `belongsTo` Tenant

**Usage**:
```javascript
// Check if module is enabled
const payrollModule = await EnabledModule.findOne({
  where: {
    tenant_id: 'techcorp',
    module_name: 'payroll',
    enabled: true
  }
});

// Enable module
await EnabledModule.create({
  tenant_id: 'techcorp',
  module_name: 'surveys',
  enabled: true,
  settings: { max_surveys: 50 }
});
```

## Main Application Models

### User Model

**Location**: `server/modules/hr-core/users/models/user.model.js`

**Purpose**: Core user information for all tenants.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Tenant identifier
  email: STRING(255),          // User email (unique per tenant)
  username: STRING(100),       // Optional username
  password_hash: STRING(255),  // Hashed password
  first_name: STRING(100),     // User first name
  last_name: STRING(100),      // User last name
  role: STRING(50),            // User role (admin, manager, employee)
  department_id: UUID,         // Foreign key to departments
  position_id: UUID,           // Foreign key to positions
  is_active: BOOLEAN,          // Whether user is active
  hire_date: DATE,             // Date of hire
  phone: STRING(50),           // Contact phone
  address: TEXT,               // User address
  metadata: JSONB,             // Additional data
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `(tenant_id, email)` (unique composite)
- `(tenant_id, role)`
- `department_id`
- `position_id`
- `is_active`

**Associations**:
- `belongsTo` Department
- `belongsTo` Position
- `hasMany` Attendances
- `hasMany` Vacations
- `hasMany` Overtimes
- `hasMany` Payrolls

**Scopes**:
```javascript
// Default scope excludes password
defaultScope: {
  attributes: { exclude: ['password_hash'] }
}

// Include password when needed
scopes: {
  withPassword: {
    attributes: { include: ['password_hash'] }
  },
  active: {
    where: { is_active: true }
  }
}
```

**Instance Methods**:
```javascript
// Get full name
getFullName() {
  return `${this.first_name} ${this.last_name}`;
}

// Check password
async checkPassword(password) {
  return await bcrypt.compare(password, this.password_hash);
}
```

**Usage**:
```javascript
// Find user by email (tenant-scoped)
const user = await User.findOne({
  where: {
    tenant_id: 'techcorp',
    email: 'john@techcorp.com'
  },
  include: [
    { model: Department },
    { model: Position }
  ]
});

// Create new user
const newUser = await User.create({
  tenant_id: 'techcorp',
  email: 'jane@techcorp.com',
  first_name: 'Jane',
  last_name: 'Doe',
  role: 'employee',
  password_hash: await bcrypt.hash('password', 10)
});

// Get full name
console.log(user.getFullName()); // "John Doe"
```

### Department Model

**Location**: `server/modules/hr-core/users/models/department.model.js`

**Purpose**: Organizational departments.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Tenant identifier
  name: STRING(255),           // Department name
  description: TEXT,           // Department description
  manager_id: UUID,            // Foreign key to users (manager)
  parent_department_id: UUID,  // Foreign key to departments (parent)
  is_active: BOOLEAN,          // Whether department is active
  metadata: JSONB,             // Additional data
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `(tenant_id, name)` (unique composite)
- `manager_id`
- `parent_department_id`

**Associations**:
- `belongsTo` User (as manager)
- `belongsTo` Department (as parent)
- `hasMany` Users
- `hasMany` Departments (as children)

**Usage**:
```javascript
// Find department with hierarchy
const department = await Department.findOne({
  where: {
    tenant_id: 'techcorp',
    name: 'Engineering'
  },
  include: [
    { model: User, as: 'manager' },
    { model: Department, as: 'parent' },
    { model: Department, as: 'children' }
  ]
});
```

### Attendance Model

**Location**: `server/modules/hr-core/attendance/models/attendance.model.js`

**Purpose**: Employee attendance records.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Tenant identifier
  user_id: UUID,               // Foreign key to users
  department_id: UUID,         // Foreign key to departments
  date: DATEONLY,              // Attendance date
  check_in: DATE,              // Check-in timestamp
  check_out: DATE,             // Check-out timestamp
  status: STRING(50),          // Status (present, absent, late, etc.)
  hours_worked: DECIMAL(5, 2), // Hours worked
  overtime_hours: DECIMAL(5, 2), // Overtime hours
  notes: TEXT,                 // Additional notes
  device_id: UUID,             // Foreign key to attendance devices
  metadata: JSONB,             // Additional data
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `user_id`
- `(tenant_id, date)`
- `(tenant_id, user_id)`
- `(tenant_id, user_id, date)` (unique composite)
- `status`

**Associations**:
- `belongsTo` User
- `belongsTo` Department
- `belongsTo` AttendanceDevice

**Instance Methods**:
```javascript
// Calculate hours worked
calculateHours() {
  if (this.check_in && this.check_out) {
    const diff = new Date(this.check_out) - new Date(this.check_in);
    return (diff / (1000 * 60 * 60)).toFixed(2);
  }
  return 0;
}
```

**Usage**:
```javascript
// Find attendance for user on date
const attendance = await Attendance.findOne({
  where: {
    tenant_id: 'techcorp',
    user_id: userId,
    date: '2026-04-06'
  },
  include: [{ model: User }, { model: Department }]
});

// Create attendance record
const newAttendance = await Attendance.create({
  tenant_id: 'techcorp',
  user_id: userId,
  date: new Date(),
  check_in: new Date(),
  status: 'present'
});

// Update check-out
await attendance.update({
  check_out: new Date(),
  hours_worked: attendance.calculateHours()
});
```

### Vacation Model

**Location**: `server/modules/hr-core/vacations/models/vacation.model.js`

**Purpose**: Vacation/leave requests and records.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Tenant identifier
  user_id: UUID,               // Foreign key to users
  position_id: UUID,           // Foreign key to positions
  vacation_type: STRING(50),   // Type (annual, sick, unpaid, etc.)
  start_date: DATEONLY,        // Start date
  end_date: DATEONLY,          // End date
  days_count: INTEGER,         // Number of days
  status: STRING(50),          // Status (pending, approved, rejected)
  reason: TEXT,                // Reason for vacation
  approved_by: UUID,           // Foreign key to users (approver)
  approved_at: DATE,           // Approval timestamp
  rejection_reason: TEXT,      // Rejection reason
  metadata: JSONB,             // Additional data
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `user_id`
- `(tenant_id, user_id)`
- `status`
- `(start_date, end_date)`

**Associations**:
- `belongsTo` User
- `belongsTo` Position
- `belongsTo` User (as approver)

**Usage**:
```javascript
// Find pending vacations
const pendingVacations = await Vacation.findAll({
  where: {
    tenant_id: 'techcorp',
    status: 'pending'
  },
  include: [
    { model: User },
    { model: User, as: 'approver' }
  ]
});

// Approve vacation
await vacation.update({
  status: 'approved',
  approved_by: managerId,
  approved_at: new Date()
});
```

### Payroll Model

**Location**: `server/modules/payroll/models/payroll.model.js`

**Purpose**: Payroll records for employees.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Tenant identifier
  user_id: UUID,               // Foreign key to users
  period_start: DATEONLY,      // Pay period start
  period_end: DATEONLY,        // Pay period end
  base_salary: DECIMAL(10, 2), // Base salary
  bonuses: DECIMAL(10, 2),     // Bonuses
  deductions: DECIMAL(10, 2),  // Deductions
  overtime_pay: DECIMAL(10, 2), // Overtime pay
  net_salary: DECIMAL(10, 2),  // Net salary
  status: STRING(50),          // Status (draft, processed, paid)
  paid_at: DATE,               // Payment timestamp
  payment_method: STRING(50),  // Payment method
  metadata: JSONB,             // Additional data
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `user_id`
- `(tenant_id, user_id)`
- `(tenant_id, user_id, period_start, period_end)` (unique composite)
- `status`
- `(period_start, period_end)`

**Associations**:
- `belongsTo` User

**Instance Methods**:
```javascript
// Calculate net salary
calculateNetSalary() {
  return this.base_salary + this.bonuses + this.overtime_pay - this.deductions;
}
```

**Usage**:
```javascript
// Find payroll for period
const payroll = await Payroll.findOne({
  where: {
    tenant_id: 'techcorp',
    user_id: userId,
    period_start: '2026-04-01',
    period_end: '2026-04-30'
  },
  include: [{ model: User }]
});

// Create payroll
const newPayroll = await Payroll.create({
  tenant_id: 'techcorp',
  user_id: userId,
  period_start: '2026-04-01',
  period_end: '2026-04-30',
  base_salary: 5000,
  bonuses: 500,
  deductions: 200,
  overtime_pay: 300,
  net_salary: 5600,
  status: 'draft'
});
```

### Survey Model

**Location**: `server/modules/surveys/models/survey.model.js`

**Purpose**: Survey definitions and configurations.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Tenant identifier
  title: STRING(255),          // Survey title
  description: TEXT,           // Survey description
  questions: JSONB,            // Survey questions (array of objects)
  target_audience: JSONB,      // Target audience criteria
  start_date: DATE,            // Survey start date
  end_date: DATE,              // Survey end date
  status: STRING(50),          // Status (draft, active, closed)
  is_anonymous: BOOLEAN,       // Whether survey is anonymous
  created_by: UUID,            // Foreign key to users (creator)
  metadata: JSONB,             // Additional data
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `status`
- `(start_date, end_date)`

**Associations**:
- `belongsTo` User (as creator)

**Usage**:
```javascript
// Find active surveys
const activeSurveys = await Survey.findAll({
  where: {
    tenant_id: 'techcorp',
    status: 'active',
    start_date: { [Op.lte]: new Date() },
    end_date: { [Op.gte]: new Date() }
  }
});

// Create survey
const newSurvey = await Survey.create({
  tenant_id: 'techcorp',
  title: 'Employee Satisfaction Survey',
  description: 'Annual employee satisfaction survey',
  questions: [
    { id: 1, text: 'How satisfied are you?', type: 'rating' },
    { id: 2, text: 'Any suggestions?', type: 'text' }
  ],
  status: 'draft',
  is_anonymous: true,
  created_by: userId
});
```

### Event Model

**Location**: `server/modules/events/models/event.model.js`

**Purpose**: Company events and calendar entries.

**Fields**:
```javascript
{
  id: UUID,                    // Primary key
  tenant_id: STRING(100),      // Tenant identifier
  title: STRING(255),          // Event title
  description: TEXT,           // Event description
  event_type: STRING(50),      // Event type (meeting, training, etc.)
  start_time: DATE,            // Event start time
  end_time: DATE,              // Event end time
  location: STRING(255),       // Event location
  organizer_id: UUID,          // Foreign key to users (organizer)
  attendees: JSONB,            // Array of attendee IDs
  is_all_day: BOOLEAN,         // Whether event is all-day
  status: STRING(50),          // Status (scheduled, cancelled, completed)
  metadata: JSONB,             // Additional data
  created_at: DATE,            // Creation timestamp
  updated_at: DATE             // Last update timestamp
}
```

**Indexes**:
- `tenant_id`
- `organizer_id`
- `start_time`
- `status`

**Associations**:
- `belongsTo` User (as organizer)

**Usage**:
```javascript
// Find upcoming events
const upcomingEvents = await Event.findAll({
  where: {
    tenant_id: 'techcorp',
    start_time: { [Op.gte]: new Date() },
    status: 'scheduled'
  },
  order: [['start_time', 'ASC']],
  include: [{ model: User, as: 'organizer' }]
});
```

## Model Associations

### Association Types

#### belongsTo (Many-to-One)

```javascript
User.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});
```

#### hasMany (One-to-Many)

```javascript
Department.hasMany(User, {
  foreignKey: 'department_id',
  as: 'users'
});
```

#### hasOne (One-to-One)

```javascript
Tenant.hasOne(License, {
  foreignKey: 'tenant_id',
  as: 'license'
});
```

#### belongsToMany (Many-to-Many)

```javascript
User.belongsToMany(Role, {
  through: 'user_roles',
  foreignKey: 'user_id',
  otherKey: 'role_id'
});
```

### Association Setup

All associations are defined in a central location:

```javascript
// server/models/index.js
import User from './user.model.js';
import Department from './department.model.js';
import Attendance from './attendance.model.js';

// Define all associations
User.associate({ Department, Attendance });
Department.associate({ User });
Attendance.associate({ User, Department });

export { User, Department, Attendance };
```

## Scopes and Hooks

### Default Scopes

Automatically applied to all queries:

```javascript
defaultScope: {
  attributes: { exclude: ['password_hash'] }
}
```

### Named Scopes

Reusable query filters:

```javascript
scopes: {
  active: {
    where: { is_active: true }
  },
  withPassword: {
    attributes: { include: ['password_hash'] }
  }
}

// Usage
const activeUsers = await User.scope('active').findAll();
```

### Hooks (Lifecycle Events)

Execute code at specific points in model lifecycle:

```javascript
// Before create
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password_hash = await bcrypt.hash(user.password, 10);
  }
});

// After create
User.afterCreate(async (user) => {
  await AuditLog.create({
    action: 'user_created',
    user_id: user.id
  });
});

// Before update
User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password_hash = await bcrypt.hash(user.password, 10);
  }
});
```

## Usage Examples

### Basic CRUD Operations

```javascript
// Create
const user = await User.create({
  tenant_id: 'techcorp',
  email: 'john@techcorp.com',
  first_name: 'John',
  last_name: 'Doe'
});

// Read
const user = await User.findByPk(userId);
const users = await User.findAll({ where: { tenant_id: 'techcorp' } });

// Update
await user.update({ first_name: 'Jane' });

// Delete
await user.destroy();
```

### Complex Queries

```javascript
// With associations
const user = await User.findOne({
  where: { email: 'john@techcorp.com' },
  include: [
    { model: Department },
    { model: Position },
    {
      model: Attendance,
      where: { date: { [Op.gte]: '2026-04-01' } }
    }
  ]
});

// With pagination
const { rows, count } = await User.findAndCountAll({
  where: { tenant_id: 'techcorp' },
  limit: 10,
  offset: 0,
  order: [['created_at', 'DESC']]
});

// Aggregation
const stats = await Attendance.findAll({
  where: { tenant_id: 'techcorp' },
  attributes: [
    'user_id',
    [sequelize.fn('COUNT', sequelize.col('id')), 'attendance_count'],
    [sequelize.fn('AVG', sequelize.col('hours_worked')), 'avg_hours']
  ],
  group: ['user_id']
});
```

### Transactions

```javascript
const t = await sequelize.transaction();

try {
  const user = await User.create({
    tenant_id: 'techcorp',
    email: 'john@techcorp.com'
  }, { transaction: t });
  
  await Attendance.create({
    tenant_id: 'techcorp',
    user_id: user.id,
    date: new Date()
  }, { transaction: t });
  
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

## Best Practices

1. **Always include tenant_id** in queries for multi-tenant models
2. **Use associations** instead of manual joins
3. **Use scopes** for reusable query logic
4. **Use hooks** for automatic data processing
5. **Use transactions** for multi-step operations
6. **Exclude sensitive fields** in default scope
7. **Use indexes** on frequently queried columns
8. **Validate data** at model level
9. **Use JSONB** for flexible data structures
10. **Document custom methods** and scopes

## Migration from Mongoose

### Key Differences

| Mongoose | Sequelize |
|----------|-----------|
| Schema | Model Definition |
| Document | Instance |
| Collection | Table |
| populate() | include |
| save() | save() or update() |
| find() | findAll() |
| findById() | findByPk() |
| findOne() | findOne() |
| create() | create() |
| remove() | destroy() |

### Code Comparison

**Mongoose:**
```javascript
const user = await User.findById(id).populate('department');
await user.save();
```

**Sequelize:**
```javascript
const user = await User.findByPk(id, {
  include: [{ model: Department }]
});
await user.save();
```

---

**Last Updated**: April 6, 2026  
**Version**: 1.0  
**Status**: Production Ready
