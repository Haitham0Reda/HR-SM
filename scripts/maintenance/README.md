# Maintenance Scripts

This directory contains utility scripts for database maintenance, debugging, and system checks.

## Database Check Scripts

- `check-databases.js` - Check database connections and collections
- `check-documents.js` - Verify document storage in correct database
- `check-hardcopy-users.js` - Check hardcopy user data
- `check-insurance-providers.js` - Verify insurance provider data
- `check-tenantconfig.js` - Check tenant configuration
- `check-users-data.js` - Verify user data structure
- `check-users-location.js` - Check which database users are stored in
- `list-all-collections.js` - List all collections in databases
- `list-collections-techcorp.js` - List collections for techcorp tenant

## Database Cleanup Scripts

- `cleanup-databases.js` - Clean up test and temporary data
- `cleanup-test-db.js` - Clean up test database
- `auto-cleanup.js` - Automated cleanup script
- `delete-hrsm-platform.js` - Remove platform database (use with caution)

## Data Migration Scripts

- `move-documents-to-company-db.js` - Migrate documents to company database
- `move-providers-to-company-db.js` - Migrate insurance providers to company database
- `seed-insurance-providers.js` - Seed insurance provider data

## Configuration Scripts

- `create-tenant-config-techcorp.js` - Create tenant config for techcorp
- `copy-tenantconfig-to-admin.js` - Copy tenant config to admin database
- `enable-all-modules-techcorp.js` - Enable all modules for techcorp tenant
- `fix-modules-map-techcorp.js` - Fix modules map for techcorp
- `fix-modules-map.js` - Fix modules map
- `fix-subscription-plan.js` - Fix subscription plan issues
- `debug-tenant-config.js` - Debug tenant configuration

## Verification Scripts

- `verify-family-members-feature.js` - Verify family members feature
- `verify-final-state.js` - Verify final system state
- `test-providers-api.js` - Test insurance providers API

## Usage

Run any script from the project root:

```bash
node scripts/maintenance/<script-name>.js
```

## Important Notes

⚠️ **Warning**: Some scripts modify database data. Always backup before running cleanup or migration scripts.

🔒 **Security**: These scripts require database credentials from `.env` file.

📝 **Logging**: Most scripts output detailed logs to help with debugging.
