# HR-SM Modernization Operational Runbooks

## Overview

This document provides operational runbooks for maintaining and troubleshooting the modernized HR-SM system. These runbooks are designed for system administrators, DevOps engineers, and on-call support staff.

## System Architecture Overview

### Component Map
```
┌─────────────────┐    ┌─────────────────┐
│   HR Frontend   │    │ Platform Admin  │
│   (React/Redux) │    │  (React/Redux)  │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
          ┌─────────────────┐
          │  Main Backend   │
          │ (Node.js/Express│
          │  + Repositories)│
          └─────────┬───────┘
                    │
          ┌─────────┴───────┐
          │                 │
┌─────────▼───────┐ ┌───────▼────────┐
│   MongoDB       │ │ License Server │
│   (Main DB)     │ │   (Port 4000)  │
└─────────────────┘ └────────┬───────┘
                             │
                   ┌─────────▼───────┐
                   │   MongoDB       │
                   │  (License DB)   │
                   └─────────────────┘
```

### Service Dependencies
- **HR Frontend**: Depends on Main Backend
- **Platform Admin**: Depends on Main Backend
- **Main Backend**: Depends on MongoDB, License Server (with fallback)
- **License Server**: Depends on License MongoDB

## Runbook 1: System Health Monitoring

### Health Check Endpoints

#### Main Backend Health Check
```bash
# Basic health check
curl -f http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "licenseServer": "connected",
    "redis": "connected"
  },
  "version": "2.1.0"
}
```

#### License Server Health Check
```bash
# License server health check
curl -f http://localhost:4000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Monitoring Commands

#### Check All Services Status
```bash
#!/bin/bash
# check-system-health.sh

echo "=== HR-SM System Health Check ==="
echo "Timestamp: $(date)"
echo

# Check main backend
echo "Main Backend:"
if curl -sf http://localhost:3000/health > /dev/null; then
    echo "  ✅ Main Backend: Healthy"
else
    echo "  ❌ Main Backend: Unhealthy"
fi

# Check license server
echo "License Server:"
if curl -sf http://localhost:4000/health > /dev/null; then
    echo "  ✅ License Server: Healthy"
else
    echo "  ❌ License Server: Unhealthy"
fi

# Check MongoDB main database
echo "MongoDB Main:"
if mongosh --eval "db.adminCommand('ping')" hrms > /dev/null 2>&1; then
    echo "  ✅ MongoDB Main: Connected"
else
    echo "  ❌ MongoDB Main: Disconnected"
fi

# Check MongoDB license database
echo "MongoDB License:"
if mongosh --eval "db.adminCommand('ping')" hrsm-licenses > /dev/null 2>&1; then
    echo "  ✅ MongoDB License: Connected"
else
    echo "  ❌ MongoDB License: Disconnected"
fi

# Check PM2 processes
echo "PM2 Processes:"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"'
```

#### Performance Monitoring
```bash
#!/bin/bash
# performance-check.sh

echo "=== Performance Metrics ==="

# API Response Times
echo "API Response Times:"
curl -w "Main Backend: %{time_total}s\n" -s -o /dev/null http://localhost:3000/health
curl -w "License Server: %{time_total}s\n" -s -o /dev/null http://localhost:4000/health

# Memory Usage
echo "Memory Usage:"
ps aux | grep -E "(node|mongod)" | awk '{print $11 ": " $4 "% (" $6 "KB)"}'

# Database Connections
echo "Database Connections:"
mongosh --quiet --eval "db.serverStatus().connections" hrms
mongosh --quiet --eval "db.serverStatus().connections" hrsm-licenses

# Disk Usage
echo "Disk Usage:"
df -h | grep -E "(mongodb|logs)"
```

### Alerting Thresholds

#### Critical Alerts (Immediate Response)
- Main Backend health check fails
- License Server health check fails (if not in bypass mode)
- MongoDB connection failures
- Memory usage > 90%
- Disk usage > 85%
- Response time > 5 seconds

#### Warning Alerts (Monitor Closely)
- License Server health check fails (in bypass mode)
- Memory usage > 75%
- Disk usage > 70%
- Response time > 2 seconds
- Error rate > 5%

## Runbook 2: License Server Operations

### License Server Management

#### Start/Stop License Server
```bash
# Start license server
pm2 start hrsm-license-server/ecosystem.config.js

# Stop license server
pm2 stop hrsm-license-server

# Restart license server
pm2 restart hrsm-license-server

# View license server logs
pm2 logs hrsm-license-server --lines 100
```

#### License Server Configuration
```bash
# Check license server configuration
cat hrsm-license-server/.env

# Required environment variables:
# PORT=4000
# MONGODB_URI=mongodb://localhost:27017/hrsm-licenses
# JWT_PRIVATE_KEY_PATH=/path/to/private.pem
# JWT_PUBLIC_KEY_PATH=/path/to/public.pem
# LOG_LEVEL=info
```

#### License Operations

##### Generate New License
```bash
# Generate license via API
curl -X POST http://localhost:4000/licenses/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "tenantId": "tenant123",
    "features": ["hr-core", "attendance", "payroll"],
    "limits": {
      "maxUsers": 100,
      "maxStorage": "10GB",
      "apiCallsPerMonth": 100000
    },
    "expiresAt": "2024-12-31T23:59:59Z"
  }'
```

##### Validate License
```bash
# Validate license
curl -X POST http://localhost:4000/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

##### Renew License
```bash
# Renew license
curl -X PATCH http://localhost:4000/licenses/LIC-123456/renew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

### License Server Troubleshooting

#### Issue: License Server Not Starting
```bash
# Check port availability
netstat -tulpn | grep :4000

# Check MongoDB connection
mongosh hrsm-licenses --eval "db.adminCommand('ping')"

# Check RSA keys
ls -la hrsm-license-server/keys/
openssl rsa -in hrsm-license-server/keys/private.pem -check

# Check logs
pm2 logs hrsm-license-server --err --lines 50
```

#### Issue: License Validation Failing
```bash
# Check JWT token format
echo "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." | base64 -d

# Verify RSA key pair
openssl rsa -in private.pem -pubout | diff - public.pem

# Check license in database
mongosh hrsm-licenses --eval "db.licenses.findOne({licenseNumber: 'LIC-123456'})"

# Test license server directly
curl -v http://localhost:4000/licenses/validate -d '{"token":"..."}'
```

#### Issue: License Server Performance Issues
```bash
# Check database performance
mongosh hrsm-licenses --eval "db.licenses.explain('executionStats').find({status: 'active'})"

# Monitor license server metrics
curl http://localhost:4000/metrics

# Check for memory leaks
ps aux | grep "hrsm-license-server"
top -p $(pgrep -f "hrsm-license-server")
```

## Runbook 3: Database Operations

### MongoDB Maintenance

#### Database Health Checks
```bash
# Check database status
mongosh hrms --eval "db.adminCommand('serverStatus')"
mongosh hrsm-licenses --eval "db.adminCommand('serverStatus')"

# Check collection statistics
mongosh hrms --eval "db.stats()"
mongosh hrms --eval "db.users.stats()"
mongosh hrms --eval "db.companies.stats()"

# Check index usage
mongosh hrms --eval "db.users.getIndexes()"
mongosh hrms --eval "db.users.aggregate([{$indexStats: {}}])"
```

#### Performance Optimization
```bash
# Analyze slow queries
mongosh hrms --eval "db.setProfilingLevel(2, {slowms: 100})"
mongosh hrms --eval "db.system.profile.find().sort({ts: -1}).limit(5)"

# Check for missing indexes
mongosh hrms --eval "
  db.users.find({tenantId: 'tenant123'}).explain('executionStats')
"

# Create recommended indexes
mongosh hrms --eval "
  db.users.createIndex({tenantId: 1, email: 1});
  db.attendance.createIndex({tenantId: 1, date: -1});
  db.tasks.createIndex({tenantId: 1, assigneeId: 1, status: 1});
"
```

#### Backup Operations
```bash
# Create backup
mongodump --host localhost:27017 --db hrms --out /backups/$(date +%Y%m%d-%H%M%S)
mongodump --host localhost:27017 --db hrsm-licenses --out /backups/$(date +%Y%m%d-%H%M%S)

# Restore from backup
mongorestore --host localhost:27017 --db hrms --drop /backups/20240115-103000/hrms/
mongorestore --host localhost:27017 --db hrsm-licenses --drop /backups/20240115-103000/hrsm-licenses/

# Verify backup integrity
mongosh hrms --eval "db.users.count()"
mongosh hrms --eval "db.companies.count()"
```

### Repository Pattern Troubleshooting

#### Issue: Slow Repository Queries
```bash
# Enable Mongoose debugging
export DEBUG=mongoose:*
pm2 restart hr-sm-backend

# Check query execution plans
mongosh hrms --eval "
  db.users.find({tenantId: 'tenant123'}).explain('executionStats')
"

# Optimize queries with proper indexes
mongosh hrms --eval "
  db.users.createIndex({tenantId: 1, status: 1});
  db.users.createIndex({tenantId: 1, role: 1});
"
```

#### Issue: Repository Transaction Failures
```bash
# Check MongoDB replica set status (required for transactions)
mongosh --eval "rs.status()"

# If not a replica set, convert to single-node replica set
mongosh --eval "rs.initiate()"

# Check transaction logs
grep "Transaction" /var/log/mongodb/mongod.log | tail -20

# Monitor active transactions
mongosh --eval "db.adminCommand('currentOp')"
```

## Runbook 4: Frontend Application Issues

### Redux State Issues

#### Issue: State Not Persisting
```bash
# Check localStorage in browser console
localStorage.getItem('persist:root')

# Clear corrupted state
localStorage.removeItem('persist:root')
localStorage.removeItem('persist:auth')

# Check Redux persist configuration
grep -r "persistConfig" client/src/store/
```

#### Issue: Redux DevTools Not Working
```bash
# Check if Redux DevTools extension is installed
# In browser console:
window.__REDUX_DEVTOOLS_EXTENSION__

# Check store configuration
grep -r "composeWithDevTools" client/src/store/

# Enable Redux debugging
export NODE_ENV=development
npm run start
```

### Build and Deployment Issues

#### Issue: Frontend Build Failures
```bash
# Clear node modules and reinstall
cd client/
rm -rf node_modules package-lock.json
npm install

# Check for dependency conflicts
npm ls --depth=0

# Build with verbose output
npm run build -- --verbose

# Check for memory issues during build
node --max-old-space-size=4096 node_modules/.bin/react-scripts build
```

#### Issue: Frontend Not Loading After Deployment
```bash
# Check static file serving
curl -I https://yourdomain.com/static/js/main.js

# Check CDN cache
curl -H "Cache-Control: no-cache" https://yourdomain.com/

# Verify build artifacts
ls -la client/build/static/js/
ls -la client/build/static/css/

# Check for CORS issues
curl -H "Origin: https://yourdomain.com" -I https://api.yourdomain.com/health
```

## Runbook 5: Performance Troubleshooting

### Backend Performance Issues

#### High Memory Usage
```bash
# Check Node.js memory usage
ps aux | grep node
top -p $(pgrep node)

# Generate heap dump
kill -USR2 $(pgrep -f "hr-sm-backend")
ls -la heapdump-*.heapsnapshot

# Analyze with clinic.js
npm install -g clinic
clinic doctor -- node server/index.js
```

#### Slow API Responses
```bash
# Enable API response time logging
export LOG_LEVEL=debug
pm2 restart hr-sm-backend

# Check slow queries
grep "slow query" logs/application.log | tail -20

# Monitor API endpoints
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3000/api/users

# curl-format.txt content:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

#### Database Performance Issues
```bash
# Check database connections
mongosh --eval "db.serverStatus().connections"

# Monitor database operations
mongotop 5
mongostat --host localhost:27017 5

# Check for lock contention
mongosh --eval "db.currentOp({'$or': [{'op': 'query'}, {'op': 'getmore'}, {'op': 'remove'}, {'op': 'update'}]})"

# Optimize collections
mongosh hrms --eval "db.users.reIndex()"
mongosh hrms --eval "db.runCommand({compact: 'users'})"
```

## Runbook 6: Security Incident Response

### License Server Security

#### Suspected License Token Compromise
```bash
# Revoke compromised license
curl -X DELETE http://localhost:4000/licenses/LIC-123456 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Generate new RSA key pair
openssl genrsa -out new-private.pem 4096
openssl rsa -in new-private.pem -pubout -out new-public.pem

# Update license server configuration
cp new-private.pem hrsm-license-server/keys/private.pem
cp new-public.pem hrsm-license-server/keys/public.pem
pm2 restart hrsm-license-server

# Regenerate all active licenses
node hrsm-license-server/scripts/regenerate-all-licenses.js
```

#### Unauthorized Access Attempt
```bash
# Check license server access logs
grep "401\|403" hrsm-license-server/logs/access.log | tail -20

# Check for brute force attempts
grep "POST /licenses" hrsm-license-server/logs/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -nr

# Block suspicious IPs (if using nginx)
echo "deny 192.168.1.100;" >> /etc/nginx/conf.d/license-server.conf
nginx -s reload
```

### Data Security

#### Multi-tenant Data Breach Investigation
```bash
# Check for cross-tenant data access
grep "tenantId" logs/application.log | grep -E "ERROR|WARN" | tail -50

# Audit database for data integrity
mongosh hrms --eval "
  db.users.aggregate([
    {$group: {_id: '$tenantId', count: {$sum: 1}}},
    {$sort: {count: -1}}
  ])
"

# Check for unauthorized API calls
grep "403\|401" logs/audit.log | tail -20

# Verify tenant isolation in repositories
node scripts/verify-tenant-isolation.js
```

## Runbook 7: Disaster Recovery

### System Recovery Procedures

#### Complete System Failure
```bash
# 1. Assess damage
./scripts/check-system-health.sh

# 2. Restore databases from backup
mongorestore --drop /backups/latest/hrms/
mongorestore --drop /backups/latest/hrsm-licenses/

# 3. Restart all services
pm2 restart all

# 4. Verify system functionality
./scripts/smoke-test.sh

# 5. Check data integrity
node scripts/verify-data-integrity.js
```

#### License Server Recovery
```bash
# 1. Stop license server
pm2 stop hrsm-license-server

# 2. Restore license database
mongorestore --drop /backups/latest/hrsm-licenses/

# 3. Verify RSA keys
openssl rsa -in hrsm-license-server/keys/private.pem -check

# 4. Start license server
pm2 start hrsm-license-server

# 5. Test license validation
curl -X POST http://localhost:4000/licenses/validate \
  -d '{"token":"test-token"}'
```

### Data Recovery

#### Repository Data Corruption
```bash
# 1. Stop application
pm2 stop hr-sm-backend

# 2. Create emergency backup
mongodump --db hrms --out /backups/emergency-$(date +%Y%m%d-%H%M%S)

# 3. Restore from last known good backup
mongorestore --drop /backups/last-known-good/hrms/

# 4. Run data integrity checks
node scripts/check-data-integrity.js

# 5. Restart application
pm2 start hr-sm-backend

# 6. Verify functionality
./scripts/smoke-test.sh
```

## Emergency Contacts

### Technical Escalation
- **Primary On-Call**: [Phone] [Email]
- **Secondary On-Call**: [Phone] [Email]
- **Database Administrator**: [Phone] [Email]
- **Security Team**: [Phone] [Email]

### Business Escalation
- **Product Manager**: [Phone] [Email]
- **Customer Success**: [Phone] [Email]
- **Executive Sponsor**: [Phone] [Email]

## Maintenance Windows

### Regular Maintenance Tasks

#### Weekly (Sunday 2:00 AM - 4:00 AM UTC)
- Database index optimization
- Log rotation and cleanup
- Security updates
- Performance monitoring review

#### Monthly (First Sunday 1:00 AM - 5:00 AM UTC)
- Full system backup verification
- License server key rotation
- Dependency updates
- Capacity planning review

#### Quarterly
- Disaster recovery testing
- Security audit
- Performance benchmarking
- Documentation updates

### Emergency Maintenance Procedures
1. **Immediate Assessment** (0-15 minutes)
   - Identify scope and impact
   - Notify stakeholders
   - Activate incident response team

2. **Containment** (15-30 minutes)
   - Isolate affected components
   - Implement temporary fixes
   - Prevent further damage

3. **Resolution** (30 minutes - 2 hours)
   - Apply permanent fixes
   - Verify system functionality
   - Monitor for stability

4. **Recovery** (2-4 hours)
   - Full system validation
   - Performance verification
   - Documentation update

5. **Post-Incident** (24-48 hours)
   - Root cause analysis
   - Process improvements
   - Team retrospective

This runbook should be regularly updated based on operational experience and system changes.