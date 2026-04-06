# PostgreSQL Database Schema Documentation

## Overview

This document provides comprehensive documentation of the PostgreSQL database schema for the HR-SM application after migration from MongoDB. The system uses two separate PostgreSQL databases with a multi-tenant architecture using `tenant_id` columns for data isolation.

## Database Architecture

### Two-Database System

```
┌─────────────────────────────────────────────────────────────┐
│ License Server Database (hrsm-licenses)                     │
├─────────────────────────────────────────────────────────────┤
│ • Tenants                                                   │
│ • Licenses                                                  │
│ • Subscriptions                                             │
│ • Plans                                                     │
│ • Enabled Modules                                           │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ License Validation API
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Main Application Database (hrsm_platform)                   │
├─────────────────────────────────────────────────────────────┤
│ • Users & Authentication                                    │
│ • HR Core (Attendance, Vacations, Overtime, Missions)      │
│ • Payroll & Surveys                                         │
│ • Events & Announcements                                    │
│ • Documents & Reports                                       │
│ • System & Monitoring                                       │
│ • Company License Cache                                     │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Tenancy Model

**Before (MongoDB):** Separate database per tenant
**After (PostgreSQL):** Single database with `tenant_id` column

All tenant-scoped tables include:
- `tenant_id VARCHAR(100) NOT NULL` - Tenant identifier
- Index on `tenant_id` for query performance
- Composite unique constraints including `tenant_id`

## License Server Database (hrsm-licenses)

### Tenants Table

Stores tenant (company) metadata and configuration.

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_tenant_id ON tenants(tenant_id);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_domain ON tenants(domain);
```

**Columns:**
- `id` - UUID primary key
- `tenant_id` - Unique tenant identifier (used across all tables)
- `name` - Company/organization name
- `domain` - Company domain (e.g., techcorp.com)
- `contact_email` - Primary contact email
- `contact_phone` - Primary contact phone
- `address` - Company address
- `status` - Tenant status (active, suspended, inactive)
- `settings` - JSONB configuration settings
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

### Licenses Table

Stores license information for each tenant.

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL UNIQUE,
  license_key TEXT NOT NULL UNIQUE,
  license_type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  max_users INTEGER,
  max_storage_gb INTEGER,
  features JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_licenses_tenant_id ON licenses(tenant_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
```

**Columns:**
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants table
- `license_key` - Unique license key
- `license_type` - Type of license (trial, basic, professional, enterprise)
- `expires_at` - License expiration date
- `status` - License status (active, expired, suspended)
- `max_users` - Maximum allowed users
- `max_storage_gb` - Maximum storage in GB
- `features` - JSONB enabled features
- `metadata` - JSONB additional metadata
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

### Subscriptions Table

Stores subscription and billing information.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  plan_id UUID,
  status VARCHAR(50) DEFAULT 'active',
  billing_cycle VARCHAR(50),
  amount DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  next_billing_date TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
```

**Columns:**
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants table
- `plan_id` - Reference to subscription plan
- `status` - Subscription status (active, cancelled, past_due)
- `billing_cycle` - Billing frequency (monthly, yearly)
- `amount` - Subscription amount
- `currency` - Currency code
- `next_billing_date` - Next billing date
- `payment_method` - Payment method identifier
- `metadata` - JSONB additional metadata
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

### Enabled Modules Table

Tracks which modules are enabled for each tenant.

```sql
CREATE TABLE enabled_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  UNIQUE (tenant_id, module_name)
);

CREATE INDEX idx_enabled_modules_tenant_id ON enabled_modules(tenant_id);
CREATE INDEX idx_enabled_modules_module_name ON enabled_modules(module_name);
CREATE INDEX idx_enabled_modules_tenant_module ON enabled_modules(tenant_id, module_name);
```

**Columns:**
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants table
- `module_name` - Module identifier (attendance, payroll, surveys, etc.)
- `enabled` - Whether module is enabled
- `settings` - JSONB module-specific settings
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

## Main Application Database (hrsm_platform)

### Users & Authentication

#### Users Table

Core user information for all tenants.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  department_id UUID,
  position_id UUID,
  is_active BOOLEAN DEFAULT true,
  hire_date TIMESTAMP WITH TIME ZONE,
  phone VARCHAR(50),
  address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  CONSTRAINT users_tenant_email_unique UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_position_id ON users(position_id);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Columns:**
- `id` - UUID primary key
- `tenant_id` - Tenant identifier for multi-tenancy
- `email` - User email (unique per tenant)
- `username` - Optional username
- `password_hash` - Hashed password
- `first_name` - User first name
- `last_name` - User last name
- `role` - User role (admin, manager, employee)
- `department_id` - Foreign key to departments
- `position_id` - Foreign key to positions
- `is_active` - Whether user is active
- `hire_date` - Date of hire
- `phone` - Contact phone
- `address` - User address
- `metadata` - JSONB additional data
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

#### Departments Table

Organizational departments.

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manager_id UUID,
  parent_department_id UUID,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT departments_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX idx_departments_manager_id ON departments(manager_id);
CREATE INDEX idx_departments_parent_id ON departments(parent_department_id);
```

#### Positions Table

Job positions/titles.

```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  department_id UUID,
  level VARCHAR(50),
  salary_range_min DECIMAL(10, 2),
  salary_range_max DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT positions_tenant_title_unique UNIQUE (tenant_id, title)
);

CREATE INDEX idx_positions_tenant_id ON positions(tenant_id);
CREATE INDEX idx_positions_department_id ON positions(department_id);
```

#### Roles Table

Role definitions and permissions.

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT roles_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
```

### HR Core Module

#### Attendances Table

Employee attendance records.

```sql
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL,
  department_id UUID,
  date DATE NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'present',
  hours_worked DECIMAL(5, 2),
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  notes TEXT,
  device_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (device_id) REFERENCES attendance_devices(id) ON DELETE SET NULL,
  CONSTRAINT attendances_tenant_user_date_unique UNIQUE (tenant_id, user_id, date)
);

CREATE INDEX idx_attendances_tenant_id ON attendances(tenant_id);
CREATE INDEX idx_attendances_user_id ON attendances(user_id);
CREATE INDEX idx_attendances_tenant_date ON attendances(tenant_id, date);
CREATE INDEX idx_attendances_tenant_user ON attendances(tenant_id, user_id);
CREATE INDEX idx_attendances_status ON attendances(status);
```

#### Attendance Devices Table

Physical attendance tracking devices.

```sql
CREATE TABLE attendance_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50),
  location VARCHAR(255),
  department_id UUID,
  ip_address VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT devices_tenant_name_unique UNIQUE (tenant_id, device_name)
);

CREATE INDEX idx_attendance_devices_tenant_id ON attendance_devices(tenant_id);
CREATE INDEX idx_attendance_devices_department_id ON attendance_devices(department_id);
```

#### Vacations Table

Vacation/leave requests and records.

```sql
CREATE TABLE vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL,
  position_id UUID,
  vacation_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_vacations_tenant_id ON vacations(tenant_id);
CREATE INDEX idx_vacations_user_id ON vacations(user_id);
CREATE INDEX idx_vacations_tenant_user ON vacations(tenant_id, user_id);
CREATE INDEX idx_vacations_status ON vacations(status);
CREATE INDEX idx_vacations_dates ON vacations(start_date, end_date);
```

#### Overtime Table

Overtime work records.

```sql
CREATE TABLE overtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL,
  position_id UUID,
  date DATE NOT NULL,
  hours DECIMAL(5, 2) NOT NULL,
  rate_multiplier DECIMAL(3, 2) DEFAULT 1.5,
  status VARCHAR(50) DEFAULT 'pending',
  reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_overtimes_tenant_id ON overtimes(tenant_id);
CREATE INDEX idx_overtimes_user_id ON overtimes(user_id);
CREATE INDEX idx_overtimes_tenant_user ON overtimes(tenant_id, user_id);
CREATE INDEX idx_overtimes_status ON overtimes(status);
CREATE INDEX idx_overtimes_date ON overtimes(date);
```

#### Missions Table

Business trips and missions.

```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL,
  position_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  destination VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  budget DECIMAL(10, 2),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_missions_tenant_id ON missions(tenant_id);
CREATE INDEX idx_missions_user_id ON missions(user_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_dates ON missions(start_date, end_date);
```

### Payroll Module

#### Payrolls Table

Payroll records for employees.

```sql
CREATE TABLE payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_salary DECIMAL(10, 2) NOT NULL,
  bonuses DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,
  overtime_pay DECIMAL(10, 2) DEFAULT 0,
  net_salary DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT payrolls_tenant_user_period_unique UNIQUE (tenant_id, user_id, period_start, period_end)
);

CREATE INDEX idx_payrolls_tenant_id ON payrolls(tenant_id);
CREATE INDEX idx_payrolls_user_id ON payrolls(user_id);
CREATE INDEX idx_payrolls_tenant_user ON payrolls(tenant_id, user_id);
CREATE INDEX idx_payrolls_status ON payrolls(status);
CREATE INDEX idx_payrolls_period ON payrolls(period_start, period_end);
```

### Surveys Module

#### Surveys Table

Survey definitions and configurations.

```sql
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  target_audience JSONB DEFAULT '{}',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'draft',
  is_anonymous BOOLEAN DEFAULT false,
  created_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_surveys_tenant_id ON surveys(tenant_id);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_dates ON surveys(start_date, end_date);
```

### Events & Communication

#### Events Table

Company events and calendar entries.

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  organizer_id UUID,
  attendees JSONB DEFAULT '[]',
  is_all_day BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'scheduled',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_status ON events(status);
```

#### Announcements Table

Company-wide announcements.

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal',
  target_departments JSONB DEFAULT '[]',
  target_roles JSONB DEFAULT '[]',
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_announcements_tenant_id ON announcements(tenant_id);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_published_at ON announcements(published_at);
```

### System & Monitoring

#### Company License Table

Cached license information from license server.

```sql
CREATE TABLE company_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL UNIQUE,
  license_key TEXT,
  license_valid BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  quick_access JSONB DEFAULT '{}',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_company_licenses_tenant_id ON company_licenses(tenant_id);
CREATE INDEX idx_company_licenses_last_synced ON company_licenses(last_synced_at);
```

## Data Types Reference

### PostgreSQL to Sequelize Mapping

| PostgreSQL Type | Sequelize DataType | Use Case |
|----------------|-------------------|----------|
| UUID | DataTypes.UUID | Primary keys, foreign keys |
| VARCHAR(n) | DataTypes.STRING(n) | Short text fields |
| TEXT | DataTypes.TEXT | Long text fields |
| INTEGER | DataTypes.INTEGER | Whole numbers |
| BIGINT | DataTypes.BIGINT | Large numbers |
| DECIMAL(p,s) | DataTypes.DECIMAL(p,s) | Currency, precise numbers |
| BOOLEAN | DataTypes.BOOLEAN | True/false values |
| DATE | DataTypes.DATEONLY | Date without time |
| TIMESTAMP WITH TIME ZONE | DataTypes.DATE | Date with time (UTC) |
| JSONB | DataTypes.JSONB | Flexible JSON data |
| ARRAY | DataTypes.ARRAY | Arrays of values |

### JSONB Usage

JSONB is used for flexible, schema-less data:
- **User metadata**: Custom fields per tenant
- **Survey questions**: Dynamic question structures
- **Settings**: Configuration objects
- **Permissions**: Role permission arrays
- **Features**: License feature flags

## Indexes Strategy

### Index Types

1. **Single Column Indexes**: Fast lookups on individual columns
2. **Composite Indexes**: Optimized for multi-column queries
3. **Unique Indexes**: Enforce uniqueness constraints
4. **Partial Indexes**: Conditional indexes for specific cases

### Indexing Rules

- All tables have index on `tenant_id`
- Foreign keys are indexed
- Frequently queried columns are indexed
- Composite indexes include `tenant_id` first
- Unique constraints include `tenant_id` for multi-tenancy

## Relationships

### One-to-Many Relationships

- Department → Users (one department has many users)
- User → Attendances (one user has many attendance records)
- User → Vacations (one user has many vacation requests)
- User → Payrolls (one user has many payroll records)

### Many-to-One Relationships

- User → Department (many users belong to one department)
- Attendance → User (many attendances belong to one user)
- Vacation → User (many vacations belong to one user)

### Self-Referencing Relationships

- Department → Parent Department (hierarchical structure)

## Constraints

### Primary Keys

All tables use UUID primary keys:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### Foreign Keys

Foreign keys enforce referential integrity:
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
```

### Unique Constraints

Multi-tenant unique constraints:
```sql
CONSTRAINT users_tenant_email_unique UNIQUE (tenant_id, email)
CONSTRAINT departments_tenant_name_unique UNIQUE (tenant_id, name)
```

### Check Constraints

Data validation constraints:
```sql
CHECK (end_date >= start_date)
CHECK (hours_worked >= 0)
CHECK (status IN ('active', 'inactive', 'suspended'))
```

## Migration from MongoDB

### Key Changes

1. **ObjectId → UUID**: All IDs converted to UUID format
2. **Embedded Documents → JSONB**: Complex nested data stored as JSONB
3. **References → Foreign Keys**: Relationships enforced with foreign keys
4. **Database per Tenant → tenant_id Column**: Single database with row-level isolation
5. **Flexible Schema → Strict Schema**: Defined columns with data types

### Data Transformation

- MongoDB `_id` → PostgreSQL `id` (UUID)
- MongoDB `createdAt` → PostgreSQL `created_at`
- MongoDB `updatedAt` → PostgreSQL `updated_at`
- Nested objects → JSONB columns
- Arrays → JSONB or separate tables

## Performance Considerations

### Query Optimization

- Use indexes on frequently queried columns
- Include `tenant_id` in all WHERE clauses
- Use EXPLAIN ANALYZE to analyze query plans
- Avoid SELECT * queries
- Use pagination for large result sets

### Connection Pooling

- License Server DB: 10-20 connections
- Main App DB: 20-50 connections
- Adjust based on load and server capacity

### Maintenance

- Regular VACUUM ANALYZE
- Monitor table bloat
- Update statistics regularly
- Archive old data periodically

## Security

### Row-Level Security

All queries automatically filter by `tenant_id` to ensure data isolation.

### Encryption

- Passwords: Hashed with bcrypt
- Sensitive data: Encrypted at application level
- Connections: SSL/TLS in production

### Access Control

- Principle of least privilege
- Separate database users for different services
- Read-only users for reporting

## Backup Strategy

- Daily automated backups using pg_dump
- 30-day retention for daily backups
- Weekly backups retained for 3 months
- Monthly backups retained for 1 year
- Backup both databases separately

## Monitoring

### Key Metrics

- Query execution time
- Connection pool utilization
- Table sizes and growth
- Index usage statistics
- Slow query log

### Health Checks

- Database connectivity
- Replication lag (if applicable)
- Disk space usage
- Connection count

---

**Last Updated**: April 6, 2026  
**Version**: 1.0  
**Status**: Production Ready
