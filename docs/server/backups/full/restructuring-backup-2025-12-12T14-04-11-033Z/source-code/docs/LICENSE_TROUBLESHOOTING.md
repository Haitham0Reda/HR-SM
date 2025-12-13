# License Troubleshooting Guide

## Overview

This guide provides solutions to common license-related issues in the Modular HRMS system. Use this guide to diagnose and resolve problems with license validation, module access, usage limits, and more.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [License Validation Issues](#license-validation-issues)
3. [Module Access Problems](#module-access-problems)
4. [Usage Limit Issues](#usage-limit-issues)
5. [On-Premise Specific Issues](#on-premise-specific-issues)
6. [SaaS Specific Issues](#saas-specific-issues)
7. [Performance Issues](#performance-issues)
8. [Audit and Logging](#audit-and-logging)
9. [Emergency Procedures](#emergency-procedures)

## Quick Diagnostics

### Health Check Script

Run this script to quickly diagnose license issues:

```bash
#!/bin/bash
# license-health-check.sh

echo "=== License Health Check ==="
echo ""

# Check license mode
echo "1. License Mode:"
grep LICENSE_MODE .env || echo "Not configured"
echo ""

# Check license file (On-Premise)
if [ -f "server/config/license.json" ]; then
    echo "2. License File:"
    echo "   ✓ File exists"
    ls -lh server/config/license.json
    echo ""
    
    echo "3. License Expiration:"
    grep expiresAt server/config/license.json
    echo ""
else
    echo "2. License File:"
    echo "   ✗ File not found"
    echo ""
fi

# Check recent logs
echo "4. Recent License Events:"
grep -i "license" logs/application.log | tail -5
echo ""

# Check enabled modules
echo "5. Enabled Modules:"
grep "module.*enabled" logs/application.log | tail -10
echo ""

# Check for errors
echo "6. Recent Errors:"
grep -i "error.*license" logs/error.log | tail -5
echo ""

echo "=== Health Check Complete ==="
```

**Usage:**
```bash
chmod +x license-health-check.sh
./license-health-check.sh
```

### Common Error Codes

| Error Code | Meaning | Quick Fix |
|------------|---------|-----------|
| `MODULE_NOT_LICENSED` | Module not in license | Add module to license |
| `LICENSE_EXPIRED` | License past expiration | Renew license |
| `LIMIT_EXCEEDED` | Usage limit reached | Upgrade tier or reduce usage |
| `LICENSE_VALIDATION_FAILED` | System error | Check logs, restart service |
| `INVALID_LICENSE_FILE` | Malformed license | Verify file integrity |
| `MISSING_DEPENDENCY` | Required module disabled | Enable dependency |
| `SIGNATURE_INVALID` | Tampered license | Reinstall original license |

## License Validation Issues

### Issue: "License Validation Failed"

**Symptoms:**
- All modules show as disabled
- Error message: "Unable to validate module license"
- HTTP 500 errors on API requests

**Possible Causes:**
1. Database connection failure (SaaS)
2. License file read error (On-Premise)
3. Corrupted license data
4. System configuration error

**Diagnostic Steps:**

```bash
# 1. Check system logs
tail -100 logs/application.log | grep -i "license.*validat"

# 2. Check error logs
tail -50 logs/error.log | grep -i license

# 3. Test database connection (SaaS)
node server/scripts/testDbConnection.js

# 4. Verify license file (On-Premise)
cat server/config/license.json | jq .
```

**Solutions:**

**For SaaS:**
```bash
# Restart database connection
systemctl restart mongodb

# Clear license cache
redis-cli FLUSHDB

# Restart application
systemctl restart hrms
```

**For On-Premise:**
```bash
# Verify file permissions
chmod 600 server/config/license.json

# Verify file integrity
md5sum server/config/license.json
# Compare with vendor checksum

# Reinstall license if corrupted
cp license.json.backup server/config/license.json
```

### Issue: "Invalid License Signature"

**Symptoms:**
- License rejected on startup
- Log message: "License signature validation failed"
- All modules disabled

**Diagnostic Steps:**

```bash
# 1. Check if public key exists
ls -la server/config/license-public-key.pem

# 2. Verify license file not modified
md5sum server/config/license.json

# 3. Check signature in license
cat server/config/license.json | jq .signature
```

**Solutions:**

```bash
# 1. Install/reinstall public key
cp vendor-public-key.pem server/config/license-public-key.pem
chmod 644 server/config/license-public-key.pem

# 2. Reinstall original license file
cp original-license.json server/config/license.json

# 3. Restart application
systemctl restart hrms

# 4. Verify validation successful
tail -f logs/application.log | grep "license.*valid"
```

### Issue: "License Expired"

**Symptoms:**
- Modules suddenly disabled
- UI shows expiration message
- API returns 403 errors

**Diagnostic Steps:**

```bash
# Check expiration date
# SaaS:
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId | jq .modules[].expiresAt

# On-Premise:
grep expiresAt server/config/license.json
```

**Solutions:**

**Immediate (Grace Period):**
```bash
# On-Premise only: System uses cached license for 24 hours
# No action needed if renewal imminent
```

**Permanent:**
```bash
# 1. Obtain renewed license from vendor

# 2. Install renewed license
# SaaS:
curl -X PUT http://localhost:5000/api/v1/licenses/:tenantId \
  -H "Content-Type: application/json" \
  -d '{"modules": [{"key": "attendance", "expiresAt": "2027-01-01T00:00:00Z"}]}'

# On-Premise:
cp renewed-license.json server/config/license.json

# 3. Verify modules re-enabled
# Check UI or logs
```

## Module Access Problems

### Issue: "Module Not Licensed"

**Symptoms:**
- Specific module shows as locked
- API returns 403 with `MODULE_NOT_LICENSED`
- UI displays upgrade prompt

**Diagnostic Steps:**

```bash
# 1. Check if module in license
# SaaS:
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId | jq .modules

# On-Premise:
cat server/config/license.json | jq .modules

# 2. Verify module key spelling
grep -i "moduleKey" logs/application.log | grep -i "attendance"

# 3. Check module enabled flag
# Should show: "enabled": true
```

**Solutions:**

```bash
# Option 1: Add module to license
# Contact vendor to purchase module

# Option 2: Enable existing module
# SaaS:
curl -X POST http://localhost:5000/api/v1/licenses/:tenantId/modules/attendance/activate \
  -H "Content-Type: application/json" \
  -d '{"tier": "business", "limits": {"employees": 200}}'

# On-Premise:
# Edit license.json, set "enabled": true for module
# System auto-reloads within 60 seconds
```

### Issue: "Missing Dependency"

**Symptoms:**
- Module activation fails
- Error: "Required module X must be enabled"
- Dependency chain not satisfied

**Diagnostic Steps:**

```bash
# 1. Check module dependencies
cat server/config/moduleRegistry.js | grep -A 10 "dependencies"

# 2. Check which modules are enabled
grep "module.*enabled" logs/application.log | tail -20

# 3. Identify missing dependency
# Example: Payroll requires Attendance
```

**Solutions:**

```bash
# Enable required dependencies first
# Example: To enable Payroll, first enable Attendance

# SaaS:
# 1. Enable Attendance
curl -X POST http://localhost:5000/api/v1/licenses/:tenantId/modules/attendance/activate \
  -d '{"tier": "business", "limits": {"employees": 200}}'

# 2. Then enable Payroll
curl -X POST http://localhost:5000/api/v1/licenses/:tenantId/modules/payroll/activate \
  -d '{"tier": "business", "limits": {"employees": 200}}'

# On-Premise:
# Edit license.json, enable both modules
{
  "modules": {
    "attendance": { "enabled": true, ... },
    "payroll": { "enabled": true, ... }
  }
}
```

### Issue: Core HR Not Accessible

**Symptoms:**
- Cannot log in
- User management unavailable
- System completely locked

**This should NEVER happen** - Core HR is always accessible.

**Diagnostic Steps:**

```bash
# 1. Check if Core HR bypass is working
grep "core.*bypass" logs/application.log

# 2. Check for system-wide errors
tail -100 logs/error.log

# 3. Verify authentication service
systemctl status hrms-auth
```

**Solutions:**

```bash
# 1. Restart authentication service
systemctl restart hrms-auth

# 2. Check database connectivity
node server/scripts/testDbConnection.js

# 3. Verify Core HR routes not blocked
grep "hr-core" server/routes/index.js

# 4. Emergency: Bypass all license checks temporarily
# Edit .env:
LICENSE_STRICT_MODE=false
# Restart system
systemctl restart hrms
```

## Usage Limit Issues

### Issue: "Limit Exceeded"

**Symptoms:**
- Cannot add new employees
- Cannot upload documents
- API returns 429 (Too Many Requests)
- Error: "Usage limit exceeded"

**Diagnostic Steps:**

```bash
# 1. Check current usage
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId/usage

# 2. Identify which limit exceeded
# Look for percentage: 100 or higher

# 3. Check limit in license
# SaaS:
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId | jq .modules[].limits

# On-Premise:
cat server/config/license.json | jq .modules[].limits
```

**Solutions:**

**Option 1: Upgrade License**
```bash
# Increase limits by upgrading tier
# SaaS:
curl -X PUT http://localhost:5000/api/v1/licenses/:tenantId \
  -d '{"modules": [{"key": "attendance", "tier": "enterprise", "limits": {"employees": "unlimited"}}]}'

# On-Premise:
# Request updated license from vendor with higher limits
```

**Option 2: Reduce Usage**
```bash
# Example: Remove inactive employees
# 1. Identify inactive users
curl -X GET http://localhost:5000/api/v1/users?status=inactive

# 2. Archive or delete inactive users
curl -X DELETE http://localhost:5000/api/v1/users/:userId

# 3. Verify usage reduced
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId/usage
```

**Option 3: Temporary Override (Emergency)**
```bash
# WARNING: Only for emergencies, may violate license terms
# Edit .env:
LICENSE_ENFORCE_LIMITS=false

# Restart system
systemctl restart hrms

# Contact vendor immediately to resolve properly
```

### Issue: Usage Not Tracking

**Symptoms:**
- Usage metrics show 0
- No warnings despite high usage
- Usage reports empty

**Diagnostic Steps:**

```bash
# 1. Check usage tracking service
grep "usage.*track" logs/application.log | tail -20

# 2. Check database for usage records
# MongoDB:
mongo hrms --eval "db.usagetracking.find().limit(5)"

# 3. Verify tracking middleware active
grep "trackUsage" server/middleware/*.js
```

**Solutions:**

```bash
# 1. Restart usage tracking service
systemctl restart hrms-usage-tracker

# 2. Manually trigger usage calculation
node server/scripts/recalculateUsage.js

# 3. Check for database issues
# Verify indexes exist
mongo hrms --eval "db.usagetracking.getIndexes()"

# 4. Clear and rebuild usage data
node server/scripts/migrations/backfillUsageData.js
```

### Issue: False Limit Warnings

**Symptoms:**
- Warning banners show incorrect percentages
- Limits show as exceeded but usage is low
- Inconsistent usage metrics

**Diagnostic Steps:**

```bash
# 1. Compare usage in database vs cache
# Database:
mongo hrms --eval "db.usagetracking.findOne({tenantId: 'XXX', moduleKey: 'attendance'})"

# Cache (Redis):
redis-cli GET "usage:XXX:attendance"

# 2. Check for stale cache
redis-cli TTL "usage:XXX:attendance"

# 3. Verify limit values
cat server/config/license.json | jq .modules.attendance.limits
```

**Solutions:**

```bash
# 1. Clear usage cache
redis-cli FLUSHDB

# 2. Recalculate usage
node server/scripts/recalculateUsage.js

# 3. Verify correct limits loaded
grep "limits.*loaded" logs/application.log

# 4. Restart application
systemctl restart hrms
```

## On-Premise Specific Issues

### Issue: License File Not Found

**Symptoms:**
- All modules disabled
- Log: "License file not found at path"
- System falls back to Core HR only

**Solutions:**

```bash
# 1. Verify file path
ls -la server/config/license.json

# 2. Check environment variable
grep LICENSE_FILE_PATH .env

# 3. Install license file
cp /path/to/license.json server/config/license.json
chmod 600 server/config/license.json
chown hrms:hrms server/config/license.json

# 4. Verify system detects file
tail -f logs/application.log | grep "license.*loaded"
```

### Issue: Hot-Reload Not Working

**Symptoms:**
- Updated license not taking effect
- Must restart system for changes
- File watcher not detecting changes

**Diagnostic Steps:**

```bash
# 1. Check if hot-reload enabled
grep HOT_RELOAD .env

# 2. Check file watcher logs
grep "file.*watch" logs/application.log

# 3. Verify file system events
inotifywait -m server/config/license.json
# Make a change and see if event fires
```

**Solutions:**

```bash
# 1. Enable hot-reload
echo "LICENSE_HOT_RELOAD=true" >> .env

# 2. Restart application
systemctl restart hrms

# 3. Manual reload (if hot-reload fails)
kill -HUP $(cat server/hrms.pid)

# 4. Check for file system issues
# Some network file systems don't support inotify
# Solution: Use polling instead
echo "LICENSE_WATCH_POLL=true" >> .env
systemctl restart hrms
```

### Issue: Grace Period Not Working

**Symptoms:**
- Modules disabled immediately on expiration
- No 24-hour grace period
- System doesn't use cached license

**Diagnostic Steps:**

```bash
# 1. Check grace period configuration
grep GRACE_PERIOD .env

# 2. Check if license cached
ls -la /tmp/hrms-license-cache.json

# 3. Verify expiration handling
grep "grace.*period" logs/application.log
```

**Solutions:**

```bash
# 1. Enable grace period
echo "LICENSE_GRACE_PERIOD=86400000" >> .env  # 24 hours

# 2. Verify cache directory writable
chmod 755 /tmp
chown hrms:hrms /tmp

# 3. Restart application
systemctl restart hrms

# 4. Test grace period
# Temporarily set expired date in license
# Verify modules still work for 24 hours
```

## SaaS Specific Issues

### Issue: Database Connection Failures

**Symptoms:**
- License validation fails intermittently
- Error: "Unable to connect to database"
- Modules randomly disabled

**Diagnostic Steps:**

```bash
# 1. Test database connection
node server/scripts/testDbConnection.js

# 2. Check connection pool
mongo hrms --eval "db.serverStatus().connections"

# 3. Check for connection leaks
grep "connection.*pool" logs/application.log | tail -50
```

**Solutions:**

```bash
# 1. Increase connection pool size
# Edit config/database.js:
poolSize: 50  # Increase from default

# 2. Restart database
systemctl restart mongodb

# 3. Restart application
systemctl restart hrms

# 4. Monitor connections
watch -n 5 'mongo hrms --eval "db.serverStatus().connections"'
```

### Issue: Subscription Sync Problems

**Symptoms:**
- License doesn't match subscription
- Modules enabled in subscription but disabled in system
- Billing and license out of sync

**Diagnostic Steps:**

```bash
# 1. Compare subscription to license
# Get subscription from billing system
curl -X GET https://billing.example.com/api/subscriptions/:id

# Get license from HRMS
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId

# 2. Check sync logs
grep "subscription.*sync" logs/application.log | tail -20

# 3. Check webhook delivery
grep "webhook.*received" logs/application.log | tail -20
```

**Solutions:**

```bash
# 1. Manual sync
node server/scripts/syncSubscriptionToLicense.js --tenant-id XXX

# 2. Verify webhook configuration
# Check billing system webhook URL
# Should point to: https://your-domain.com/api/v1/webhooks/subscription

# 3. Resend webhook from billing system
# Use billing system admin panel

# 4. Update license manually if needed
curl -X PUT http://localhost:5000/api/v1/licenses/:tenantId \
  -d '{"modules": [...]}'  # Match subscription
```

### Issue: Multi-Tenant Isolation Problems

**Symptoms:**
- Tenant A sees Tenant B's license info
- License validation uses wrong tenant
- Cross-tenant data leakage

**This is a CRITICAL security issue.**

**Diagnostic Steps:**

```bash
# 1. Check tenant ID in requests
grep "tenantId" logs/application.log | tail -50

# 2. Verify tenant middleware
grep "tenant.*middleware" server/middleware/*.js

# 3. Check database queries
# Should always include tenantId filter
grep "findOne.*tenantId" server/services/*.js
```

**Solutions:**

```bash
# 1. IMMEDIATE: Restart system
systemctl restart hrms

# 2. Verify tenant middleware order
# In server/app.js, tenant middleware must come before license middleware

# 3. Audit all license queries
# Ensure all include tenantId filter
# Example:
License.findOne({ tenantId: req.tenant.id, ... })

# 4. Add tenant validation
# In license middleware:
if (req.tenant.id !== license.tenantId) {
  throw new Error('Tenant mismatch');
}

# 5. Report to security team
# This may indicate a serious bug
```

## Performance Issues

### Issue: Slow License Validation

**Symptoms:**
- API requests slow (>1 second)
- High database load
- Timeout errors

**Diagnostic Steps:**

```bash
# 1. Check validation timing
grep "validation.*took" logs/application.log | tail -20

# 2. Check cache hit rate
redis-cli INFO stats | grep keyspace_hits

# 3. Check database query performance
mongo hrms --eval "db.licenses.find({tenantId: 'XXX'}).explain('executionStats')"
```

**Solutions:**

```bash
# 1. Enable caching
echo "LICENSE_CACHE_ENABLED=true" >> .env
echo "LICENSE_CACHE_TTL=300000" >> .env  # 5 minutes

# 2. Add database indexes
mongo hrms --eval "db.licenses.createIndex({tenantId: 1, 'modules.key': 1})"

# 3. Increase cache memory
# Edit redis.conf:
maxmemory 512mb

# 4. Restart services
systemctl restart redis
systemctl restart hrms
```

### Issue: High Memory Usage

**Symptoms:**
- System memory usage increasing
- Out of memory errors
- License cache growing unbounded

**Diagnostic Steps:**

```bash
# 1. Check memory usage
free -h
ps aux | grep node | awk '{print $6}'

# 2. Check cache size
redis-cli INFO memory

# 3. Check for memory leaks
node --inspect server/index.js
# Use Chrome DevTools to profile
```

**Solutions:**

```bash
# 1. Set cache size limits
# Edit redis.conf:
maxmemory 256mb
maxmemory-policy allkeys-lru

# 2. Reduce cache TTL
echo "LICENSE_CACHE_TTL=60000" >> .env  # 1 minute

# 3. Restart services
systemctl restart redis
systemctl restart hrms

# 4. Monitor memory
watch -n 5 'free -h'
```

## Audit and Logging

### Issue: Missing Audit Logs

**Symptoms:**
- Audit logs incomplete
- License events not recorded
- Compliance reporting fails

**Diagnostic Steps:**

```bash
# 1. Check audit log collection
mongo hrms --eval "db.licenseaudits.count()"

# 2. Check logging configuration
grep AUDIT .env

# 3. Verify audit middleware
grep "audit.*log" server/middleware/*.js
```

**Solutions:**

```bash
# 1. Enable audit logging
echo "LICENSE_AUDIT_ENABLED=true" >> .env

# 2. Verify database permissions
# Audit service needs write access to licenseaudits collection

# 3. Backfill missing audits
node server/scripts/backfillAuditLogs.js --start-date 2025-01-01

# 4. Restart application
systemctl restart hrms
```

### Issue: Log Rotation Not Working

**Symptoms:**
- Log files growing too large
- Disk space issues
- Old logs not archived

**Solutions:**

```bash
# 1. Configure logrotate
cat > /etc/logrotate.d/hrms << EOF
/opt/hrms/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 hrms hrms
    sharedscripts
    postrotate
        systemctl reload hrms
    endscript
}
EOF

# 2. Test logrotate
logrotate -f /etc/logrotate.d/hrms

# 3. Verify rotation
ls -lh /opt/hrms/logs/
```

## Emergency Procedures

### Emergency: All Modules Disabled

**Immediate Actions:**

```bash
# 1. Check if Core HR accessible
curl -X GET http://localhost:5000/api/v1/users/me

# 2. If Core HR works, check license
# SaaS:
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId

# On-Premise:
cat server/config/license.json

# 3. Check expiration
grep expiresAt server/config/license.json

# 4. Check logs for errors
tail -100 logs/error.log | grep -i license
```

**Recovery Steps:**

```bash
# Option 1: Restore from backup
cp license.json.backup server/config/license.json
systemctl restart hrms

# Option 2: Disable strict mode temporarily
echo "LICENSE_STRICT_MODE=false" >> .env
systemctl restart hrms

# Option 3: Use grace period (On-Premise)
# System automatically uses cached license for 24 hours

# Option 4: Contact vendor for emergency license
# Provide: Company ID, License Key, Error logs
```

### Emergency: License Validation System Down

**Symptoms:**
- All license checks failing
- HTTP 500 errors
- System unusable

**Immediate Actions:**

```bash
# 1. Bypass license validation temporarily
echo "LICENSE_BYPASS=true" >> .env
systemctl restart hrms

# WARNING: This disables all license enforcement
# Use only in emergencies
# Remove immediately after resolving issue

# 2. Diagnose root cause
tail -200 logs/error.log

# 3. Check dependencies
systemctl status mongodb
systemctl status redis

# 4. Restart all services
systemctl restart mongodb redis hrms
```

### Emergency: Data Loss Risk

**If license issues threaten data loss:**

```bash
# 1. IMMEDIATE: Backup all data
mongodump --out /backup/emergency-$(date +%Y%m%d-%H%M%S)

# 2. Enable all modules temporarily
echo "LICENSE_BYPASS=true" >> .env
systemctl restart hrms

# 3. Export critical data
node server/scripts/exportAllData.js

# 4. Contact support immediately
# Do not make further changes
```

## Getting Help

### Before Contacting Support

Collect this information:

```bash
# 1. System information
uname -a
node --version
npm --version

# 2. License information (redact sensitive data)
# SaaS:
curl -X GET http://localhost:5000/api/v1/licenses/:tenantId | jq 'del(.signature)'

# On-Premise:
cat server/config/license.json | jq 'del(.signature)'

# 3. Recent logs
tail -200 logs/application.log > support-logs.txt
tail -100 logs/error.log >> support-logs.txt

# 4. Configuration (redact secrets)
cat .env | grep -v PASSWORD | grep -v SECRET > support-config.txt

# 5. Health check
./license-health-check.sh > support-health.txt
```

### Contact Information

- **Email**: support@vendor.com
- **Phone**: +1-555-0123 (Business hours)
- **Emergency**: +1-555-0199 (24/7)
- **Portal**: https://support.vendor.com

### Support Ticket Template

```
Subject: License Issue - [Brief Description]

Environment:
- Deployment Type: [SaaS / On-Premise]
- System Version: [Version]
- License Key: [First 10 characters only]

Issue Description:
[Detailed description of the problem]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happens]

Impact:
- Severity: [Critical / High / Medium / Low]
- Users Affected: [Number]
- Modules Affected: [List]

Attachments:
- support-logs.txt
- support-config.txt
- support-health.txt
```

## Related Documentation

- [LICENSE_MANAGEMENT.md](LICENSE_MANAGEMENT.md) - License management guide
- [ON_PREMISE_LICENSE.md](ON_PREMISE_LICENSE.md) - On-Premise specific guide
- [LICENSE_API.md](LICENSE_API.md) - API reference
- [USAGE_REPORTING.md](USAGE_REPORTING.md) - Usage reporting guide
