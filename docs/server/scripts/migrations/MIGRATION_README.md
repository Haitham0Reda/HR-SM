# Data Migration Guide

## Overview

This directory contains migration scripts for transforming the HR-SM system into a multi-tenant architecture. The migrations add `tenantId` fields to all tenant-scoped collections, create a default tenant, and set up the platform administration layer.

## Migration Scripts

### 001_add_tenant_id.js
**Purpose**: Add tenantId field to all tenant-scoped collections

**What it does**:
- Adds `tenantId` field to all existing records
- Assigns default tenantId ('default_tenant') to existing data
- Creates compound indexes for performance and tenant isolation

**Usage**:
```bash
# Run migration
node server/scripts/migrations/001_add_tenant_id.js

# Rollback migration
node server/scripts/migrations/001_add_tenant_id.js rollback
```

**Environment Variables**:
- `DEFAULT_TENANT_ID`: Tenant ID to assign to existing records (default: 'default_tenant')
- `MONGODB_URI`: MongoDB connection string

### 002_create_default_tenant.js
**Purpose**: Create default tenant and platform admin user

**What it does**:
- Creates a default tenant in the platform layer
- Assigns all existing data to the default tenant
- Creates a platform admin user for system administration
- Enables HR-Core module for the default tenant

**Usage**:
```bash
# Run migration
node server/scripts/migrations/002_create_default_tenant.js

# Rollback migration
node server/scripts/migrations/002_create_default_tenant.js rollback
```

**Environment Variables**:
- `DEFAULT_TENANT_ID`: Tenant ID (default: 'default_tenant')
- `DEFAULT_COMPANY_NAME`: Company name (default: 'Default Company')
- `PLATFORM_ADMIN_EMAIL`: Admin email (default: 'admin@platform.local')
- `PLATFORM_ADMIN_PASSWORD`: Admin password (default: 'Admin@123456')
- `PLATFORM_ADMIN_FIRST_NAME`: Admin first name (default: 'Platform')
- `PLATFORM_ADMIN_LAST_NAME`: Admin last name (default: 'Administrator')

**⚠️ IMPORTANT**: Change the default admin password immediately after first login!

### 003_update_models_with_tenantId.js
**Purpose**: Update model files to include tenantId field definitions

**What it does**:
- Adds tenantId field to model schemas
- Updates unique constraints to be tenant-scoped
- Adds compound indexes for performance

**Usage**:
```bash
# Run migration (modifies model files)
node server/scripts/migrations/003_update_models_with_tenantId.js
```

**Note**: This is a CODE migration, not a DATA migration. It modifies the model files themselves.

### 004_test_migration_with_sample_data.js
**Purpose**: Test migrations with sample data for multiple tenants

**What it does**:
- Creates test dataset with multiple tenants
- Verifies data integrity
- Verifies tenant isolation
- Tests compound indexes

**Usage**:
```bash
# Run test (preserves test database)
node server/scripts/migrations/004_test_migration_with_sample_data.js

# Run test and cleanup
node server/scripts/migrations/004_test_migration_with_sample_data.js --cleanup
```

### test_001_migration.js
**Purpose**: Validate that migration 001 completed successfully

**What it does**:
- Checks that all documents have tenantId
- Verifies compound indexes exist
- Tests query performance
- Validates unique constraints

**Usage**:
```bash
node server/scripts/migrations/test_001_migration.js
```

## Migration Workflow

Follow these steps to migrate your existing HR-SM installation to multi-tenant architecture:

### Step 1: Backup Your Data
```bash
# Create a backup of your database
mongodump --uri="your_mongodb_uri" --out=./backup
```

### Step 2: Update Environment Variables
Add the following to your `.env` file:
```env
DEFAULT_TENANT_ID=default_tenant
DEFAULT_COMPANY_NAME=Your Company Name
PLATFORM_ADMIN_EMAIL=admin@yourcompany.com
PLATFORM_ADMIN_PASSWORD=YourSecurePassword123!
PLATFORM_ADMIN_FIRST_NAME=Admin
PLATFORM_ADMIN_LAST_NAME=User
```

### Step 3: Run Data Migrations
```bash
# Step 3a: Add tenantId to all existing records
node server/scripts/migrations/001_add_tenant_id.js

# Step 3b: Create default tenant and platform admin
node server/scripts/migrations/002_create_default_tenant.js
```

### Step 4: Update Model Files
```bash
# Update model files to include tenantId field definitions
node server/scripts/migrations/003_update_models_with_tenantId.js
```

Or manually update models following the guide in `MODEL_UPDATE_GUIDE.md`.

### Step 5: Verify Migration
```bash
# Test that migration completed successfully
node server/scripts/migrations/test_001_migration.js

# Test with sample multi-tenant data
node server/scripts/migrations/004_test_migration_with_sample_data.js --cleanup
```

### Step 6: Restart Application
```bash
# Restart your application to load updated models
npm restart
```

### Step 7: Change Admin Password
1. Log in to the platform admin dashboard at `/platform/login`
2. Use the credentials from your `.env` file
3. Change the password immediately

## Rollback Procedure

If you need to rollback the migrations:

```bash
# Rollback Step 2 (remove tenant and admin)
node server/scripts/migrations/002_create_default_tenant.js rollback

# Rollback Step 1 (remove tenantId from records)
node server/scripts/migrations/001_add_tenant_id.js rollback

# Restore from backup if needed
mongorestore --uri="your_mongodb_uri" ./backup
```

## Verification Checklist

After running migrations, verify:

- [ ] All collections have tenantId field
- [ ] All records have tenantId = 'default_tenant'
- [ ] Compound indexes exist on all collections
- [ ] Default tenant exists in tenants collection
- [ ] Platform admin user exists in platform_users collection
- [ ] Can log in to platform admin dashboard
- [ ] Can log in to tenant application
- [ ] All existing functionality works correctly
- [ ] No cross-tenant data leakage

## Troubleshooting

### Migration 001 fails with "duplicate key error"
**Cause**: Existing unique indexes conflict with compound indexes

**Solution**: 
1. Drop existing unique indexes manually
2. Run migration again
3. Or use the rollback and retry

### Migration 002 fails with "tenant already exists"
**Cause**: Default tenant was already created

**Solution**: This is safe to ignore. The migration will skip creating the tenant.

### Models not loading after migration
**Cause**: Syntax errors in updated model files

**Solution**: 
1. Check model files for syntax errors
2. Ensure all imports are correct
3. Restart the application

### Queries returning no results
**Cause**: Missing tenantId in queries

**Solution**: 
1. Ensure tenant context middleware is applied
2. Check that queries include tenantId filter
3. Verify tenantId is set correctly in request context

## Support

For issues or questions:
1. Check the `MODEL_UPDATE_GUIDE.md` for model-specific guidance
2. Review the migration script source code for details
3. Check application logs for error messages
4. Consult the design document at `.kiro/specs/enterprise-saas-architecture/design.md`

## Additional Resources

- **MODEL_UPDATE_GUIDE.md**: Detailed guide for updating models
- **QUICK_START_001.md**: Quick start guide for migration 001
- **IMPLEMENTATION_SUMMARY_001.md**: Implementation details for migration 001
- **Design Document**: `.kiro/specs/enterprise-saas-architecture/design.md`
- **Requirements**: `.kiro/specs/enterprise-saas-architecture/requirements.md`
