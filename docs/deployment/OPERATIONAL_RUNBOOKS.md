# HRMS Enterprise Operational Runbooks

## Overview

This document provides step-by-step procedures for common operational tasks and incident response for the HRMS Enterprise system. These runbooks are designed for system administrators, DevOps engineers, and support staff.

## Table of Contents

1. [System Health Checks](#system-health-checks)
2. [Service Management](#service-management)
3. [Database Operations](#database-operations)
4. [Backup and Recovery](#backup-and-recovery)
5. [License Server Operations](#license-server-operations)
6. [Incident Response](#incident-response)
7. [Performance Troubleshooting](#performance-troubleshooting)
8. [Security Incidents](#security-incidents)

---

## System Health Checks

### Daily Health Check Procedure

**Frequency:** Daily (automated + manual verification)  
**Duration:** 10-15 minutes  
**Prerequisites:** Access to monitoring dashboards

#### Steps:

1. **Check Monitoring Dashboards**
   ```bash
   # Access Grafana dashboard
   # URL: https://your-domain.com:3002
   # Verify all services are green
   ```

2. **Verify Service Status**
   ```bash
   # Check PM2 processes
   pm2 list
   
   # Expected output: All processes should be "online"
   # - hrms-main-backend
   # - hrsm-license-server
   ```

3. **Test API Endpoints**
   ```bash
   # Main backend health
   curl -f https://your-domain.com/health
   
   # License server health
   curl -f https://admin.your-domain.com/license-api/health
   
   # Expected: HTTP 200 with status: "healthy"
   ```

4. **Check Database Connectivity**
   ```bash
   # MongoDB main database
   mongo "mongodb://localhost:27017/hrms" --eval "db.stats()"
   
   # MongoDB license database
   mongo "mongodb://localhost:27017/hrsm-licenses" --eval "db.stats()"
   
   # Redis connectivity
   redis-cli ping
   # Expected: PONG
   ```

5. **Verify Backup Status**
   ```bash
   # Check last backup
   npm run backup:list | head -5
   
   # Verify backup age (should be < 24 hours)
   npm run backup:stats
   ```

6. **Review Error Logs**
   ```bash
   # Check for critical errors in last 24 hours
   pm2 logs --lines 100 | grep -i "error\|critical\|fatal"
   
   # Check Nginx error logs
   sudo tail -100 /var/log/nginx/error.log
   ```

#### Success Criteria:
- [ ] All services showing "online" status
- [ ] All health endpoints returning HTTP 200
- [ ] Database connections successful
- [ ] Backup completed within last 24 hours
- [ ] No critical errors in logs

#### Escalation:
If any check fails, proceed to relevant incident response procedure.

---

## Service Management

### Restart Main Backend

**When to use:** High memory usage, unresponsive API, configuration changes

#### Steps:

1. **Check Current Status**
   ```bash
   pm2 show hrms-main-backend
   pm2 monit  # Check memory/CPU usage
   ```

2. **Graceful Restart**
   ```bash
   # Graceful restart (zero downtime)
   pm2 reload hrms-main-backend
   
   # Wait for restart completion
   sleep 10
   
   # Verify restart
   pm2 show hrms-main-backend
   ```

3. **Verify Service Health**
   ```bash
   # Test health endpoint
   curl -f https://your-domain.com/health
   
   # Check logs for startup messages
   pm2 logs hrms-main-backend --lines 20
   ```

4. **Force Restart (if graceful fails)**
   ```bash
   # Only if graceful restart fails
   pm2 restart hrms-main-backend
   ```

#### Rollback Procedure:
If restart causes issues:
```bash
# Revert to previous deployment
git checkout HEAD~1
npm ci --production
pm2 reload hrms-main-backend
```

### Restart License Server

**When to use:** License validation failures, memory issues, configuration changes

#### Steps:

1. **Check License Server Status**
   ```bash
   pm2 show hrsm-license-server
   curl -f http://localhost:4000/health
   ```

2. **Restart License Server**
   ```bash
   pm2 reload hrsm-license-server
   sleep 5
   pm2 show hrsm-license-server
   ```

3. **Verify License Functionality**
   ```bash
   # Test license validation
   curl -X POST http://localhost:4000/licenses/validate \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{"token": "test-token", "machineId": "test"}'
   ```

### Restart All Services

**When to use:** System-wide issues, major configuration changes

#### Steps:

1. **Restart in Correct Order**
   ```bash
   # 1. Stop all application services
   pm2 stop all
   
   # 2. Restart infrastructure services
   sudo systemctl restart redis-server
   sudo systemctl restart mongod
   
   # 3. Wait for infrastructure
   sleep 10
   
   # 4. Start license server first
   pm2 start hrsm-license-server
   sleep 5
   
   # 5. Start main backend
   pm2 start hrms-main-backend
   sleep 5
   
   # 6. Restart Nginx
   sudo systemctl reload nginx
   ```

2. **Verify All Services**
   ```bash
   pm2 list
   curl -f https://your-domain.com/health
   curl -f https://admin.your-domain.com/license-api/health
   ```

---

## Database Operations

### MongoDB Maintenance

#### Check Database Health

```bash
# Connect to MongoDB
mongo "mongodb://localhost:27017/hrms"

# Check database stats
db.stats()

# Check collection sizes
db.runCommand("collStats", "users")
db.runCommand("collStats", "tenants")

# Check index usage
db.users.getIndexes()
db.users.aggregate([{$indexStats: {}}])
```

#### Optimize Database Performance

```bash
# Compact collections (during maintenance window)
db.runCommand({compact: "users"})
db.runCommand({compact: "tenants"})

# Rebuild indexes
db.users.reIndex()
db.tenants.reIndex()

# Update statistics
db.runCommand({planCacheClear: "users"})
```

#### Monitor Database Performance

```bash
# Check slow queries
db.setProfilingLevel(2, {slowms: 100})
db.system.profile.find().sort({ts: -1}).limit(5)

# Check current operations
db.currentOp()

# Check replica set status (if using replica sets)
rs.status()
```

### Redis Maintenance

#### Check Redis Health

```bash
# Connect to Redis
redis-cli

# Check memory usage
INFO memory

# Check connected clients
INFO clients

# Check keyspace
INFO keyspace

# Check slow log
SLOWLOG GET 10
```

#### Clear Redis Cache

```bash
# Clear all cache (use with caution)
redis-cli FLUSHALL

# Clear specific database
redis-cli -n 0 FLUSHDB

# Clear specific pattern
redis-cli --scan --pattern "session:*" | xargs redis-cli DEL
```

---

## Backup and Recovery

### Manual Backup Creation

**When to use:** Before major deployments, configuration changes

#### Steps:

1. **Create Full Backup**
   ```bash
   # Create comprehensive backup
   npm run backup:create
   
   # Verify backup creation
   npm run backup:list | head -1
   ```

2. **Verify Backup Integrity**
   ```bash
   # Run backup verification
   npm run verify:auto
   
   # Check backup contents
   npm run backup:stats
   ```

### Database Recovery

**When to use:** Database corruption, data loss incidents

#### MongoDB Recovery:

1. **Stop Application Services**
   ```bash
   pm2 stop all
   ```

2. **Backup Current State**
   ```bash
   mongodump --db hrms --out /tmp/current-backup
   mongodump --db hrsm-licenses --out /tmp/current-backup
   ```

3. **Restore from Backup**
   ```bash
   # List available backups
   npm run recovery:list-backups
   
   # Restore specific backup
   npm run recovery:restore -- --backup-id=backup-20231201-120000
   ```

4. **Verify Recovery**
   ```bash
   # Start services
   pm2 start all
   
   # Test functionality
   curl -f https://your-domain.com/health
   ```

### File Recovery

**When to use:** Corrupted uploads, missing configuration files

#### Steps:

1. **Identify Missing Files**
   ```bash
   # Check upload directory
   ls -la /var/www/hr-sm/uploads/
   
   # Check configuration files
   ls -la /var/www/hr-sm/.env*
   ```

2. **Restore from Backup**
   ```bash
   # Extract files from backup
   npm run recovery:restore -- --files-only --backup-id=backup-20231201-120000
   ```

---

## License Server Operations

### License Server Health Check

#### Steps:

1. **Check Service Status**
   ```bash
   pm2 show hrsm-license-server
   curl -f http://localhost:4000/health
   ```

2. **Verify Database Connectivity**
   ```bash
   mongo "mongodb://localhost:27017/hrsm-licenses" --eval "db.licenses.count()"
   ```

3. **Test License Operations**
   ```bash
   # Test license validation
   curl -X POST http://localhost:4000/licenses/validate \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{"token": "test-token", "machineId": "test-machine"}'
   ```

### License Server Recovery

**When to use:** License server completely down, database corruption

#### Steps:

1. **Stop License Server**
   ```bash
   pm2 stop hrsm-license-server
   ```

2. **Check RSA Keys**
   ```bash
   ls -la /var/www/hr-sm/hrsm-license-server/keys/
   # Should contain: private.pem, public.pem
   ```

3. **Regenerate Keys (if missing)**
   ```bash
   cd /var/www/hr-sm/hrsm-license-server
   npm run generate-keys
   ```

4. **Restore License Database**
   ```bash
   # Restore from backup
   npm run recovery:restore -- --database=hrsm-licenses
   ```

5. **Restart License Server**
   ```bash
   pm2 start hrsm-license-server
   pm2 logs hrsm-license-server --lines 20
   ```

### License Expiration Management

#### Check Expiring Licenses:

```bash
# Connect to license database
mongo "mongodb://localhost:27017/hrsm-licenses"

# Find licenses expiring in 30 days
db.licenses.find({
  expiresAt: {
    $gte: new Date(),
    $lte: new Date(Date.now() + 30*24*60*60*1000)
  },
  status: "active"
}).count()

# List expiring licenses
db.licenses.find({
  expiresAt: {
    $gte: new Date(),
    $lte: new Date(Date.now() + 30*24*60*60*1000)
  },
  status: "active"
}, {tenantName: 1, expiresAt: 1, type: 1})
```

---

## Incident Response

### Service Down Incident

**Severity:** Critical  
**Response Time:** Immediate

#### Steps:

1. **Initial Assessment (0-5 minutes)**
   ```bash
   # Check all services
   pm2 list
   
   # Check system resources
   top
   df -h
   free -m
   
   # Check network connectivity
   ping google.com
   ```

2. **Identify Root Cause (5-15 minutes)**
   ```bash
   # Check recent logs
   pm2 logs --lines 50
   
   # Check system logs
   sudo journalctl -u nginx -n 50
   sudo journalctl -u mongod -n 50
   
   # Check disk space
   df -h
   ```

3. **Immediate Recovery (15-30 minutes)**
   ```bash
   # Restart failed services
   pm2 restart all
   
   # Clear disk space if needed
   sudo apt autoremove
   sudo apt autoclean
   
   # Restart system services if needed
   sudo systemctl restart nginx
   sudo systemctl restart mongod
   ```

4. **Verification (30-35 minutes)**
   ```bash
   # Test all endpoints
   curl -f https://your-domain.com/health
   curl -f https://admin.your-domain.com/health
   
   # Monitor for 5 minutes
   watch -n 10 'pm2 list'
   ```

### High Memory Usage

**Severity:** Warning  
**Response Time:** 30 minutes

#### Steps:

1. **Identify Memory Consumer**
   ```bash
   # Check PM2 processes
   pm2 monit
   
   # Check system processes
   top -o %MEM
   
   # Check memory details
   free -m
   cat /proc/meminfo
   ```

2. **Immediate Actions**
   ```bash
   # Restart high-memory process
   pm2 restart hrms-main-backend
   
   # Clear system cache
   sudo sync
   sudo echo 3 > /proc/sys/vm/drop_caches
   
   # Clear Redis cache if needed
   redis-cli FLUSHALL
   ```

3. **Monitor and Adjust**
   ```bash
   # Monitor memory usage
   watch -n 5 'free -m'
   
   # Adjust PM2 memory limits if needed
   # Edit ecosystem.config.js
   # max_memory_restart: '1G'
   pm2 reload ecosystem.config.js
   ```

### Database Connection Issues

**Severity:** Critical  
**Response Time:** Immediate

#### Steps:

1. **Check Database Status**
   ```bash
   # Check MongoDB service
   sudo systemctl status mongod
   
   # Check MongoDB logs
   sudo tail -50 /var/log/mongodb/mongod.log
   
   # Test connection
   mongo --eval "db.stats()"
   ```

2. **Restart Database Services**
   ```bash
   # Restart MongoDB
   sudo systemctl restart mongod
   
   # Wait for startup
   sleep 10
   
   # Restart Redis
   sudo systemctl restart redis-server
   ```

3. **Restart Application Services**
   ```bash
   # Restart in order
   pm2 restart hrsm-license-server
   sleep 5
   pm2 restart hrms-main-backend
   ```

---

## Performance Troubleshooting

### High CPU Usage

#### Investigation Steps:

1. **Identify CPU Consumer**
   ```bash
   # Check processes
   top -o %CPU
   
   # Check PM2 processes
   pm2 monit
   
   # Check system load
   uptime
   ```

2. **Application-Level Investigation**
   ```bash
   # Check slow queries
   mongo hrms --eval "db.setProfilingLevel(2, {slowms: 100})"
   mongo hrms --eval "db.system.profile.find().sort({ts: -1}).limit(5)"
   
   # Check Redis slow log
   redis-cli SLOWLOG GET 10
   ```

3. **Optimization Actions**
   ```bash
   # Restart high-CPU process
   pm2 restart hrms-main-backend
   
   # Optimize database
   mongo hrms --eval "db.runCommand({planCacheClear: 'users'})"
   
   # Clear Redis cache
   redis-cli FLUSHALL
   ```

### Slow Response Times

#### Investigation Steps:

1. **Check Response Times**
   ```bash
   # Test API response times
   time curl -f https://your-domain.com/health
   
   # Check Nginx access logs
   sudo tail -100 /var/log/nginx/access.log | grep -E "HTTP/[0-9.]+ [45][0-9][0-9]"
   ```

2. **Database Performance**
   ```bash
   # Check slow queries
   mongo hrms --eval "db.system.profile.find({millis: {\$gt: 100}}).sort({ts: -1}).limit(5)"
   
   # Check index usage
   mongo hrms --eval "db.users.aggregate([{\$indexStats: {}}])"
   ```

3. **Network and Infrastructure**
   ```bash
   # Check network latency
   ping -c 5 localhost
   
   # Check disk I/O
   iostat -x 1 5
   
   # Check memory pressure
   free -m
   ```

---

## Security Incidents

### Suspicious Activity Detection

#### Investigation Steps:

1. **Check Access Logs**
   ```bash
   # Check Nginx access logs for suspicious patterns
   sudo grep -E "40[1-4]|50[0-5]" /var/log/nginx/access.log | tail -20
   
   # Check for brute force attempts
   sudo grep -E "POST.*auth.*40[1-3]" /var/log/nginx/access.log | tail -20
   
   # Check application logs for security events
   pm2 logs | grep -i "security\|auth\|login" | tail -20
   ```

2. **Check System Security**
   ```bash
   # Check failed login attempts
   sudo grep "Failed password" /var/log/auth.log | tail -10
   
   # Check active connections
   netstat -an | grep :443
   netstat -an | grep :5000
   
   # Check running processes
   ps aux | grep -v "^\[" | sort -k3 -nr | head -10
   ```

3. **Immediate Response**
   ```bash
   # Block suspicious IPs (if identified)
   sudo ufw deny from suspicious.ip.address
   
   # Restart services to clear any compromised sessions
   pm2 restart all
   
   # Force password reset for affected accounts (if any)
   # This would be done through the application interface
   ```

### Data Breach Response

#### Immediate Actions:

1. **Isolate System**
   ```bash
   # Block external access (emergency only)
   sudo ufw deny 80
   sudo ufw deny 443
   
   # Stop application services
   pm2 stop all
   ```

2. **Preserve Evidence**
   ```bash
   # Create forensic backup
   sudo dd if=/dev/sda of=/external/forensic-backup.img
   
   # Copy logs
   sudo cp -r /var/log /external/logs-backup/
   sudo cp -r ~/.pm2/logs /external/pm2-logs-backup/
   ```

3. **Assess Damage**
   ```bash
   # Check database for unauthorized changes
   mongo hrms --eval "db.users.find({modifiedAt: {\$gte: new Date('2023-12-01')}}).count()"
   
   # Check file modifications
   find /var/www/hr-sm -type f -mtime -1 -ls
   ```

---

## Emergency Contacts

### Escalation Matrix

| Severity | Contact | Response Time |
|----------|---------|---------------|
| Critical | System Admin + On-call | 15 minutes |
| High | System Admin | 1 hour |
| Medium | Support Team | 4 hours |
| Low | Support Team | Next business day |

### Contact Information

- **System Administrator:** admin@your-domain.com, +1-555-0101
- **Database Administrator:** dba@your-domain.com, +1-555-0102
- **Security Team:** security@your-domain.com, +1-555-0103
- **Development Team:** dev@your-domain.com, +1-555-0104

### Communication Channels

- **Slack:** #hrms-alerts (critical alerts)
- **Email:** alerts@your-domain.com (all alerts)
- **Phone:** Emergency hotline +1-555-0100

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Next Review:** March 2025