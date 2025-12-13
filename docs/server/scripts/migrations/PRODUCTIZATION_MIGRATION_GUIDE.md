# Productization Migration Guide

## Quick Start

This guide helps you migrate an existing HRMS deployment to the new license-based productization system.

## Prerequisites

- Node.js 14+ installed
- MongoDB running and accessible
- Backup of your database
- Admin access to the system

## Migration Steps

### 1. Quick Test (5 minutes)

Test all migrations without making changes:

```bash
node server/scripts/migrations/testMigrations.js
```

This runs all migration scripts in dry-run mode to verify they work correctly.

### 2. Backup Your Data (10 minutes)

Create a complete backup:

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/hrms" --out=./backup-$(date +%Y%m%d)

# Verify backup
ls -lh backup-$(date +%Y%m%d)
```

### 3. Run Migrations (15 minutes)

#### For SaaS Deployments:

```bash
# Step 1: Generate initial licenses (enables all modules)
node server/scripts/migrations/generateInitialLicenses.js --mode saas --tier business

# Step 2: Migrate feature flags (if you have any)
node server/scripts/migrations/migrateFeatureFlags.js --source env

# Step 3: Backfill usage data
node server/scripts/migrations/backfillUsageData.js --months 1
```

#### For On-Premise Deployments:

```bash
# Generate license file
node server/scripts/generateOnPremiseLicense.js \
  --type enterprise \
  --company "Your Company Name" \
  --days 365 \
  --output ./config/license.json
```

### 4. Update Configuration (5 minutes)

Add to your `.env` file:

```bash
# For SaaS
DEPLOYMENT_MODE=saas

# For On-Premise
DEPLOYMENT_MODE=on-premise
LICENSE_FILE_PATH=./config/license.json
LICENSE_SECRET_KEY=your-secret-key-change-this

# Optional but recommended
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

### 5. Restart Application (2 minutes)

```bash
pm2 restart hrms
# or
npm run start
```

### 6. Verify (5 minutes)

1. Access the application
2. Check all modules are accessible
3. Visit the license status page
4. Verify usage metrics are being tracked

## What Gets Migrated?

### SaaS Mode
- ✅ License records created in MongoDB
- ✅ All modules enabled by default
- ✅ Appropriate limits set based on employee count
- ✅ Trial period configured (30 days default)
- ✅ Usage tracking initialized
- ✅ Feature flags converted to license settings

### On-Premise Mode
- ✅ License file generated with all modules
- ✅ Enterprise tier with unlimited limits
- ✅ 1-year validity (configurable)
- ✅ Digital signature for security

## Default Configuration

After migration, your system will have:

- **All modules enabled** (backward compatibility)
- **Business tier** limits (or tier based on employee count)
- **30-day trial period** (SaaS only)
- **1-year expiration** (configurable)
- **Usage tracking** for all modules

## Tier Selection Guide

The migration automatically selects a tier based on your employee count:

- **Starter**: ≤ 50 employees
- **Business**: 51-200 employees
- **Enterprise**: > 200 employees

You can override this with the `--tier` option.

## Common Scenarios

### Scenario 1: Small Business (< 50 employees)

```bash
node server/scripts/migrations/generateInitialLicenses.js \
  --mode saas \
  --tier starter \
  --trial-days 30
```

### Scenario 2: Medium Business (50-200 employees)

```bash
node server/scripts/migrations/generateInitialLicenses.js \
  --mode saas \
  --tier business \
  --trial-days 30
```

### Scenario 3: Enterprise (> 200 employees)

```bash
node server/scripts/migrations/generateInitialLicenses.js \
  --mode saas \
  --tier enterprise \
  --trial-days 90
```

### Scenario 4: On-Premise with Specific Modules

```bash
node server/scripts/generateOnPremiseLicense.js \
  --type custom \
  --company "Your Company" \
  --modules "attendance,leave,payroll,documents" \
  --tier business \
  --days 365
```

## Rollback Instructions

If something goes wrong:

### SaaS Rollback

```bash
# 1. Stop application
pm2 stop hrms

# 2. Drop license collections
mongo hrms --eval "db.licenses.drop(); db.usagetrackings.drop(); db.licenseaudits.drop();"

# 3. Restore backup
mongorestore --uri="mongodb://localhost:27017/hrms" ./backup-YYYYMMDD

# 4. Remove license config from .env
# (edit .env and remove DEPLOYMENT_MODE and license-related vars)

# 5. Restart application
pm2 start hrms
```

### On-Premise Rollback

```bash
# 1. Stop application
pm2 stop hrms

# 2. Remove license file
rm config/license.json

# 3. Remove license config from .env
# (edit .env and remove DEPLOYMENT_MODE and license-related vars)

# 4. Restart application
pm2 start hrms
```

## Verification Checklist

After migration, verify:

- [ ] Application starts without errors
- [ ] All modules are accessible
- [ ] Users can log in
- [ ] License status page displays correctly
- [ ] Usage metrics are being tracked
- [ ] No "module not licensed" errors in logs
- [ ] API endpoints respond correctly
- [ ] Navigation menu shows all modules

## Troubleshooting

### "No licenses found"
**Solution:** Run `generateInitialLicenses.js`

### "Module not licensed"
**Solution:** Check license status, ensure module is enabled

### "License file not found"
**Solution:** Verify `LICENSE_FILE_PATH` in `.env` and file exists

### "Invalid license signature"
**Solution:** Regenerate license with correct secret key

### "Usage limit exceeded"
**Solution:** This shouldn't happen immediately after migration. Check limits in license.

## Getting Help

1. Check the detailed README: `server/scripts/migrations/README.md`
2. Review design document: `.kiro/specs/feature-productization/design.md`
3. Check application logs for errors
4. Verify environment variables are set correctly

## Next Steps

After successful migration:

1. **Configure Monitoring**: Set up alerts for license expiration and usage limits
2. **Train Administrators**: Educate admins on license management
3. **Update Documentation**: Update user documentation with license information
4. **Plan Renewals**: Set up reminders for license renewal
5. **Monitor Usage**: Regularly check usage metrics and adjust limits as needed

## Migration Timeline

- **Preparation**: 30 minutes (backup, review)
- **Execution**: 20 minutes (run migrations)
- **Verification**: 15 minutes (test system)
- **Total**: ~1 hour

## Support

For issues or questions:
- Check migration logs for error details
- Review the comprehensive README
- Consult the design document
- Check MongoDB collections: `licenses`, `usagetrackings`, `licenseaudits`
