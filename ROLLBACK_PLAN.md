# PostgreSQL to MongoDB Rollback Plan

## Overview

This document provides comprehensive procedures for rolling back from PostgreSQL to MongoDB if critical issues arise during or after the migration. The rollback plan is designed to restore full MongoDB functionality within the 2-hour requirement specified in Requirement 17.5.

**CRITICAL**: This rollback plan should only be executed if:
- Critical data integrity issues are discovered
- Performance degradation makes the system unusable
- Unrecoverable application errors occur
- Business operations are severely impacted

## Prerequisites

### Before You Begin

1. **Verify MongoDB Backups Exist**
   ```bash
   ls -lh /backup/mongodb/
   # Ensure recent backup exists (< 24 hours old)
   ```

2. **Confirm MongoDB Service is Available**
   ```bash
   sudo systemctl status mongod
   # If stopped, start it: sudo systemctl start mongod
   ```

3. **Notify Stakeholders**
   - Inform management of rollback decision
   - Notify users of temporary downtime
   - Alert technical team members

4. **Document the Issue**
   - Record the reason for rollback
   - Capture error logs and screenshots
   - Document timeline of events

## Rollback Procedure

### Phase 1: Stop Application (5 minutes)

#### Step 1.1: Stop Application Services

```bash
# If using PM2
pm2 stop hr-sm
pm2 stop hrsm-license-server

# If using systemd
sudo systemctl stop hr-sm
sudo systemctl stop hrsm-license-server

# If using Docker
docker-compose down

# Verify services are stopped
ps aux | grep node
# Should show no hr-sm or license server processes
```

#### Step 1.2: Prevent New Connections

```bash
# Block incoming traffic (optional, for safety)
sudo iptables -A INPUT -p tcp --dport 5000 -j DROP  # Main app
sudo iptables -A INPUT -p tcp --dport 4000 -j DROP  # License server

# Or use nginx to show maintenance page
sudo cp /etc/nginx/sites-available/maintenance.conf /etc/nginx/sites-enabled/default
sudo nginx -s reload
```

### Phase 2: Restore MongoDB Configuration (10 minutes)

#### Step 2.1: Update Environment Variables

**Option A: Using .env file**

```bash
# Backup current .env
cp .env .env.postgres.backup

# Restore MongoDB .env
cp .env.mongodb.backup .env

# Or manually edit .env
nano .env
```

Update the following variables:
```bash
# Database Configuration
DATABASE_TYPE=mongodb
USE_MONGODB=true
USE_POSTGRESQL=false

# MongoDB Connection Strings
MONGODB_URI=mongodb://localhost:27017/
LICENSE_SERVER_MONGODB_URI=mongodb://localhost:27017/hrsm-license-server

# Comment out or remove PostgreSQL variables
# LICENSE_DATABASE_URL=postgresql://...
# MAIN_DATABASE_URL=postgresql://...
```

**Option B: Using environment-specific files**

```bash
# Switch to MongoDB configuration
export NODE_ENV=production-mongodb

# Or copy MongoDB config
cp config/database.mongodb.js config/database.js
```

#### Step 2.2: Restore MongoDB Connection Code

**If you kept MongoDB code (recommended during transition period):**

```bash
# No code changes needed - just environment variables
echo "MongoDB code already present, skipping code restoration"
```

**If MongoDB code was removed:**

```bash
# Restore from Git
git checkout mongodb-backup-branch -- server/config/database.js
git checkout mongodb-backup-branch -- server/config/multiTenant.js
git checkout mongodb-backup-branch -- server/middleware/tenantMiddleware.js

# Or restore from backup
cp backup/code/database.js server/config/database.js
cp backup/code/multiTenant.js server/config/multiTenant.js
cp backup/code/tenantMiddleware.js server/middleware/tenantMiddleware.js
```

#### Step 2.3: Restore MongoDB Models

**If Mongoose models were removed:**

```bash
# Restore all Mongoose models from Git
git checkout mongodb-backup-branch -- server/modules/

# Or restore from backup
cp -r backup/code/models/* server/modules/

# Verify models are restored
ls -la server/modules/hr-core/users/models/
# Should see user.model.js with Mongoose schema
```

#### Step 2.4: Restore MongoDB Dependencies

```bash
# Check if mongoose is installed
npm list mongoose

# If not installed, restore from package.json backup
cp package.json.mongodb.backup package.json
npm install

# Or install directly
npm install mongoose@^6.0.0 mongodb@^4.0.0
```

### Phase 3: Restore MongoDB Data (30-60 minutes)

#### Step 3.1: Verify MongoDB Service

```bash
# Start MongoDB if not running
sudo systemctl start mongod

# Verify MongoDB is running
sudo systemctl status mongod

# Test connection
mongosh --eval "db.adminCommand('ping')"
# Should return: { ok: 1 }
```

#### Step 3.2: Restore License Server Database

```bash
# Find latest backup
ls -lht /backup/mongodb/ | head -5

# Restore license server database
mongorestore \
  --uri="mongodb://localhost:27017" \
  --nsInclude="hrsm-license-server.*" \
  /backup/mongodb/20260406/hrsm-license-server

# Verify restoration
mongosh hrsm-license-server --eval "db.licenses.countDocuments()"
mongosh hrsm-license-server --eval "db.tenants.countDocuments()"
```

#### Step 3.3: Restore Tenant Databases

```bash
# List tenant databases in backup
ls /backup/mongodb/20260406/

# Restore all tenant databases
for tenant_db in /backup/mongodb/20260406/*/; do
  db_name=$(basename "$tenant_db")
  
  # Skip system databases
  if [[ "$db_name" != "admin" && "$db_name" != "local" && "$db_name" != "config" ]]; then
    echo "Restoring $db_name..."
    mongorestore \
      --uri="mongodb://localhost:27017" \
      --nsInclude="${db_name}.*" \
      "$tenant_db"
  fi
done

# Verify tenant databases
mongosh --eval "db.adminCommand('listDatabases')" | grep -E "techcorp|healthcare|finance"
```

#### Step 3.4: Verify Data Restoration

```bash
# Create verification script
cat > verify-mongodb-restore.js << 'EOF'
const mongoose = require('mongoose');

async function verifyRestore() {
  // Connect to license server
  const licenseConn = await mongoose.createConnection(
    'mongodb://localhost:27017/hrsm-license-server'
  );
  
  const licenseCount = await licenseConn.db.collection('licenses').countDocuments();
  const tenantCount = await licenseConn.db.collection('tenants').countDocuments();
  
  console.log(`License Server:`);
  console.log(`  Licenses: ${licenseCount}`);
  console.log(`  Tenants: ${tenantCount}`);
  
  // Get list of tenant databases
  const admin = mongoose.connection.db.admin();
  const { databases } = await admin.listDatabases();
  
  const tenantDbs = databases
    .map(db => db.name)
    .filter(name => !['admin', 'local', 'config', 'hrsm-license-server'].includes(name));
  
  console.log(`\nTenant Databases: ${tenantDbs.length}`);
  
  for (const dbName of tenantDbs) {
    const conn = await mongoose.createConnection(`mongodb://localhost:27017/${dbName}`);
    const userCount = await conn.db.collection('users').countDocuments();
    console.log(`  ${dbName}: ${userCount} users`);
    await conn.close();
  }
  
  await licenseConn.close();
  process.exit(0);
}

mongoose.connect('mongodb://localhost:27017/admin')
  .then(verifyRestore)
  .catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
EOF

# Run verification
node verify-mongodb-restore.js
```

### Phase 4: Restore Application Code (15-20 minutes)

#### Step 4.1: Restore Repository Layer

**If BaseRepository was modified:**

```bash
# Restore MongoDB version
git checkout mongodb-backup-branch -- server/repositories/BaseRepository.js

# Or from backup
cp backup/code/BaseRepository.js server/repositories/BaseRepository.js
```

Verify the restored code has MongoDB methods:
```javascript
// Should see Mongoose methods like:
async findById(id) {
  return await this.model.findById(id);
}
```

#### Step 4.2: Restore QueryBuilder

```bash
# Restore MongoDB QueryBuilder
git checkout mongodb-backup-branch -- server/repositories/QueryBuilder.js

# Or from backup
cp backup/code/QueryBuilder.js server/repositories/QueryBuilder.js
```

Verify MongoDB query operators:
```javascript
// Should see MongoDB operators like:
in(field, values) {
  this.query[field] = { $in: values };
  return this;
}
```

#### Step 4.3: Restore Service Layer

```bash
# Restore all services
git checkout mongodb-backup-branch -- server/modules/hr-core/*/services/

# Or from backup
cp -r backup/code/services/* server/modules/hr-core/
```

Verify services use Mongoose:
```javascript
// Should see Mongoose patterns like:
const users = await User.find({ role: 'manager' }).populate('department');
```

#### Step 4.4: Restore Backup Service

```bash
# Restore MongoDB backup service
git checkout mongodb-backup-branch -- server/modules/hr-core/backup/services/mongooseBackup.service.js

# Remove PostgreSQL backup service references
rm server/modules/hr-core/backup/services/postgresBackup.service.js
```

### Phase 5: Verify Application Functionality (10-15 minutes)

#### Step 5.1: Start Application in Test Mode

```bash
# Start application
NODE_ENV=production npm start

# Or with PM2
pm2 start ecosystem.config.js --env production

# Watch logs
tail -f logs/application.log
```

#### Step 5.2: Test Database Connectivity

```bash
# Test MongoDB connection
curl http://localhost:5000/api/health/database
# Should return: { "status": "ok", "database": "mongodb" }

# Test license server connection
curl http://localhost:4000/api/health
# Should return: { "status": "ok" }
```

#### Step 5.3: Test Critical Functionality

**Test 1: User Authentication**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
# Should return JWT token
```

**Test 2: User List**
```bash
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: techcorp"
# Should return list of users
```

**Test 3: Attendance Records**
```bash
curl http://localhost:5000/api/attendances?date=2026-04-06 \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: techcorp"
# Should return attendance records
```

**Test 4: License Validation**
```bash
curl http://localhost:4000/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "techcorp",
    "licenseKey": "test-key-123"
  }'
# Should return license validation result
```

#### Step 5.4: Run Automated Tests

```bash
# Run integration tests
npm run test:integration

# Run smoke tests
npm run test:smoke

# Verify all tests pass
echo "Exit code: $?"  # Should be 0
```

### Phase 6: Enable Production Traffic (5 minutes)

#### Step 6.1: Remove Traffic Blocks

```bash
# Remove iptables rules (if applied)
sudo iptables -D INPUT -p tcp --dport 5000 -j DROP
sudo iptables -D INPUT -p tcp --dport 4000 -j DROP

# Or restore nginx configuration
sudo cp /etc/nginx/sites-available/production.conf /etc/nginx/sites-enabled/default
sudo nginx -s reload
```

#### Step 6.2: Monitor Application

```bash
# Monitor application logs
pm2 logs hr-sm --lines 100

# Monitor MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Monitor system resources
htop
```

#### Step 6.3: Verify User Access

- Test login from web interface
- Verify data loads correctly
- Check for any error messages
- Monitor user reports

### Phase 7: Post-Rollback Verification (10 minutes)

#### Step 7.1: Data Integrity Check

```bash
# Run data integrity script
node scripts/verify-data-integrity.js

# Check for any anomalies
mongosh --eval "
  db.getSiblingDB('hrsm-license-server').licenses.find({ status: 'active' }).count()
"
```

#### Step 7.2: Performance Check

```bash
# Test query performance
node scripts/test-query-performance.js

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/users
```

#### Step 7.3: Update Monitoring

```bash
# Update monitoring dashboards to MongoDB metrics
# Update alert thresholds
# Verify monitoring is working
```

## Rollback Verification Checklist

Use this checklist to verify successful rollback:

- [ ] Application services stopped
- [ ] Environment variables updated to MongoDB
- [ ] MongoDB service running
- [ ] License server database restored
- [ ] All tenant databases restored
- [ ] Data counts match backup
- [ ] MongoDB connection code restored
- [ ] Mongoose models restored
- [ ] Repository layer restored
- [ ] Service layer restored
- [ ] Application starts without errors
- [ ] Database connectivity verified
- [ ] User authentication works
- [ ] CRUD operations work
- [ ] License validation works
- [ ] Automated tests pass
- [ ] Production traffic enabled
- [ ] No errors in logs
- [ ] Performance acceptable
- [ ] Users can access system

## Rollback Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 1. Stop Application | 5 min | 5 min |
| 2. Restore Configuration | 10 min | 15 min |
| 3. Restore MongoDB Data | 30-60 min | 45-75 min |
| 4. Restore Application Code | 15-20 min | 60-95 min |
| 5. Verify Functionality | 10-15 min | 70-110 min |
| 6. Enable Traffic | 5 min | 75-115 min |
| 7. Post-Rollback Verification | 10 min | 85-125 min |

**Total Time**: 85-125 minutes (1.4-2.1 hours)

**Note**: Timeline meets the 2-hour requirement (Requirement 17.5)

## Troubleshooting Rollback Issues

### Issue: MongoDB Service Won't Start

**Symptoms**: `sudo systemctl start mongod` fails

**Solution**:
```bash
# Check MongoDB logs
sudo tail -100 /var/log/mongodb/mongod.log

# Check disk space
df -h

# Check MongoDB configuration
sudo nano /etc/mongod.conf

# Try starting manually
sudo mongod --config /etc/mongod.conf

# Check port availability
sudo netstat -tulpn | grep 27017
```

### Issue: mongorestore Fails

**Symptoms**: mongorestore command returns errors

**Solution**:
```bash
# Check backup integrity
ls -lh /backup/mongodb/20260406/

# Try restoring with --drop flag
mongorestore --drop --uri="mongodb://localhost:27017" /backup/mongodb/20260406/

# Try restoring without indexes first
mongorestore --noIndexRestore --uri="mongodb://localhost:27017" /backup/mongodb/20260406/

# Then rebuild indexes
mongosh --eval "db.getSiblingDB('hrsm-license-server').licenses.createIndexes([...])"
```

### Issue: Application Won't Start

**Symptoms**: Application crashes on startup

**Solution**:
```bash
# Check logs
tail -100 logs/application.log

# Verify environment variables
node -e "console.log(process.env.DATABASE_TYPE)"

# Test MongoDB connection
node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected'))
    .catch(err => console.error('Failed:', err));
"

# Check for missing dependencies
npm install

# Try starting in debug mode
DEBUG=* npm start
```

### Issue: Data Missing After Restore

**Symptoms**: Some collections are empty

**Solution**:
```bash
# Check backup contents
mongodump --uri="mongodb://localhost:27017/hrsm-license-server" --archive | tar -tzf - | head -20

# Restore specific collection
mongorestore \
  --uri="mongodb://localhost:27017" \
  --nsInclude="hrsm-license-server.licenses" \
  /backup/mongodb/20260406/

# Verify collection exists
mongosh hrsm-license-server --eval "db.getCollectionNames()"
```

### Issue: Performance Degradation

**Symptoms**: Application is slow after rollback

**Solution**:
```bash
# Rebuild indexes
mongosh hrsm-license-server --eval "db.licenses.reIndex()"

# Check index status
mongosh hrsm-license-server --eval "db.licenses.getIndexes()"

# Analyze query performance
mongosh hrsm-license-server --eval "db.setProfilingLevel(2)"

# Check slow queries
mongosh hrsm-license-server --eval "db.system.profile.find().sort({ts:-1}).limit(10)"
```

## Prevention Strategies

### 1. Maintain MongoDB Code During Transition

Keep MongoDB code in a separate branch:
```bash
# Before removing MongoDB code
git checkout -b mongodb-backup-branch
git push origin mongodb-backup-branch

# Tag the last MongoDB version
git tag -a v1.0-mongodb -m "Last MongoDB version before PostgreSQL migration"
git push origin v1.0-mongodb
```

### 2. Keep MongoDB Backups Current

```bash
# Schedule daily MongoDB backups during transition
0 2 * * * mongodump --uri="mongodb://localhost:27017" --out=/backup/mongodb/$(date +\%Y\%m\%d)

# Keep backups for 30 days
find /backup/mongodb -type d -mtime +30 -exec rm -rf {} \;
```

### 3. Test Rollback Procedure

```bash
# Test rollback in staging environment
# Document any issues encountered
# Update rollback plan accordingly
```

### 4. Maintain Rollback Documentation

- Keep this document updated
- Document any environment-specific steps
- Record lessons learned from testing
- Update timeline estimates based on actual experience

## Post-Rollback Actions

### 1. Incident Report

Document the rollback:
- Reason for rollback
- Issues encountered
- Data loss (if any)
- Lessons learned
- Recommendations for future migration attempt

### 2. Stakeholder Communication

- Notify management of rollback completion
- Inform users system is restored
- Provide timeline for next migration attempt
- Address any concerns

### 3. Root Cause Analysis

- Investigate why PostgreSQL migration failed
- Identify specific issues
- Develop mitigation strategies
- Plan corrective actions

### 4. Plan Next Steps

- Determine if/when to retry migration
- Address identified issues
- Update migration plan
- Schedule next attempt

## Contacts and Escalation

### Primary Contacts

- **Database Team Lead**: database-lead@company.com
- **DevOps Lead**: devops-lead@company.com
- **Application Team Lead**: app-lead@company.com

### Escalation Path

1. **Level 1**: On-call engineer
2. **Level 2**: Team lead
3. **Level 3**: Engineering manager
4. **Level 4**: CTO

### Emergency Contacts

- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Database Team**: +1-XXX-XXX-XXXX
- **DevOps Team**: +1-XXX-XXX-XXXX

## Summary

This rollback plan provides:
- ✅ Step-by-step rollback procedures
- ✅ Detailed MongoDB restoration steps
- ✅ Code reversion procedures
- ✅ Verification checklist
- ✅ Timeline meeting 2-hour requirement
- ✅ Troubleshooting guidance
- ✅ Prevention strategies

**Status**: Ready for use if rollback is needed

---

**Last Updated**: April 6, 2026  
**Version**: 1.0  
**Reviewed By**: Database Team, DevOps Team  
**Next Review**: Before production migration
