# HRMS Enterprise Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting procedures for common issues in the HRMS Enterprise system. It covers both backends (main HRMS and license server), frontend applications, and supporting infrastructure.

## Quick Reference

### Emergency Commands

```bash
# Check all service status
pm2 list && sudo systemctl status nginx mongod redis-server

# Restart all services
pm2 restart all && sudo systemctl restart nginx

# Check system resources
top && df -h && free -m

# View recent logs
pm2 logs --lines 50

# Test all endpoints
curl -f https://your-domain.com/health && curl -f https://admin.your-domain.com/license-api/health
```

## Common Issues and Solutions

### 1. License Server Issues

#### Issue: License Server Not Responding

**Symptoms:**
- License validation failures
- HTTP 500 errors from main backend
- "License server unavailable" messages

**Diagnosis:**
```bash
# Check license server status
pm2 show hrsm-license-server

# Test license server endpoint
curl -f http://localhost:4000/health

# Check license server logs
pm2 logs hrsm-license-server --lines 50
```

**Solutions:**

**Solution 1: Restart License Server**
```bash
pm2 restart hrsm-license-server
sleep 5
pm2 show hrsm-license-server
curl -f http://localhost:4000/health
```

**Solution 2: Check Database Connection**
```bash
# Test license database connection
mongo "mongodb://localhost:27017/hrsm-licenses" --eval "db.stats()"

# If connection fails, restart MongoDB
sudo systemctl restart mongod
sleep 10
pm2 restart hrsm-license-server
```

**Solution 3: Regenerate RSA Keys**
```bash
cd /var/www/hr-sm/hrsm-license-server
ls -la keys/  # Check if keys exist

# If keys are missing or corrupted
npm run generate-keys
pm2 restart hrsm-license-server
```

#### Issue: License Validation Failures

**Symptoms:**
- "Invalid license" errors
- Modules not accessible despite valid licenses
- JWT verification errors

**Diagnosis:**
```bash
# Check license in database
mongo "mongodb://localhost:27017/hrsm-licenses"
db.licenses.findOne({tenantId: "your-tenant-id"})

# Test license validation manually
curl -X POST http://localhost:4000/licenses/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"token": "your-jwt-token", "machineId": "test-machine"}'
```

**Solutions:**

**Solution 1: Check License Expiry**
```bash
mongo "mongodb://localhost:27017/hrsm-licenses"
db.licenses.find({
  tenantId: "your-tenant-id",
  expiresAt: {$lt: new Date()}
})

# If expired, renew license through Platform Admin
```

**Solution 2: Verify API Key**
```bash
# Check API key configuration
grep LICENSE_SERVER_API_KEY /var/www/hr-sm/.env
grep ADMIN_API_KEY /var/www/hr-sm/hrsm-license-server/.env

# Keys should match
```

**Solution 3: Check Machine Binding**
```bash
# Check if license is bound to specific machine
mongo "mongodb://localhost:27017/hrsm-licenses"
db.licenses.findOne({tenantId: "your-tenant-id"}, {binding: 1})

# If machine binding is strict, verify machine ID matches
```

### 2. Main Backend Issues

#### Issue: Main Backend Not Starting

**Symptoms:**
- PM2 shows "errored" or "stopped" status
- HTTP 500 errors on all endpoints
- Application logs show startup errors

**Diagnosis:**
```bash
# Check PM2 status
pm2 show hrms-main-backend

# Check startup logs
pm2 logs hrms-main-backend --lines 100

# Check environment configuration
ls -la /var/www/hr-sm/.env
```

**Solutions:**

**Solution 1: Fix Environment Configuration**
```bash
# Check for missing environment variables
grep -E "^[A-Z_]+=.*$" /var/www/hr-sm/.env | wc -l

# Compare with example
diff /var/www/hr-sm/.env /var/www/hr-sm/.env.production.example

# Fix missing or incorrect variables
nano /var/www/hr-sm/.env
```

**Solution 2: Database Connection Issues**
```bash
# Test MongoDB connection
mongo "mongodb://localhost:27017/hrms" --eval "db.stats()"

# If connection fails
sudo systemctl restart mongod
sleep 10

# Test Redis connection
redis-cli ping

# If Redis fails
sudo systemctl restart redis-server
```

**Solution 3: Port Conflicts**
```bash
# Check if port 5000 is in use
sudo netstat -tlnp | grep :5000

# If port is occupied, kill the process or change port
sudo kill -9 <PID>
# Or update PORT in .env file
```

#### Issue: High Memory Usage

**Symptoms:**
- PM2 shows high memory usage
- System becomes slow or unresponsive
- Out of memory errors in logs

**Diagnosis:**
```bash
# Check memory usage
pm2 monit
free -m
top -o %MEM

# Check for memory leaks
pm2 logs hrms-main-backend | grep -i "memory\|heap"
```

**Solutions:**

**Solution 1: Restart Application**
```bash
# Graceful restart
pm2 reload hrms-main-backend

# Monitor memory usage
watch -n 5 'pm2 show hrms-main-backend | grep memory'
```

**Solution 2: Adjust Memory Limits**
```bash
# Edit PM2 configuration
nano /var/www/hr-sm/ecosystem.config.js

# Add or modify:
# max_memory_restart: '1G'

# Reload configuration
pm2 reload ecosystem.config.js
```

**Solution 3: Clear Caches**
```bash
# Clear Redis cache
redis-cli FLUSHALL

# Clear system cache
sudo sync
sudo echo 3 > /proc/sys/vm/drop_caches

# Restart application
pm2 restart hrms-main-backend
```

### 3. Database Issues

#### Issue: MongoDB Connection Failures

**Symptoms:**
- "MongoNetworkError" in application logs
- Database connection timeouts
- Applications fail to start

**Diagnosis:**
```bash
# Check MongoDB service status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -50 /var/log/mongodb/mongod.log

# Test connection
mongo --eval "db.stats()"
```

**Solutions:**

**Solution 1: Restart MongoDB**
```bash
sudo systemctl restart mongod
sleep 10
sudo systemctl status mongod

# Test connection
mongo --eval "db.stats()"
```

**Solution 2: Check Disk Space**
```bash
# Check available disk space
df -h

# MongoDB requires free space to operate
# If disk is full, clean up old logs or backups
sudo find /var/log -name "*.log" -mtime +7 -delete
sudo apt autoremove
sudo apt autoclean
```

**Solution 3: Fix Configuration Issues**
```bash
# Check MongoDB configuration
sudo nano /etc/mongod.conf

# Verify bind IP and port settings
# bindIp: 127.0.0.1
# port: 27017

# Restart after changes
sudo systemctl restart mongod
```

#### Issue: Database Performance Problems

**Symptoms:**
- Slow query responses
- High CPU usage from MongoDB
- Application timeouts

**Diagnosis:**
```bash
# Check slow queries
mongo hrms --eval "db.setProfilingLevel(2, {slowms: 100})"
mongo hrms --eval "db.system.profile.find().sort({ts: -1}).limit(5)"

# Check database stats
mongo hrms --eval "db.stats()"

# Check index usage
mongo hrms --eval "db.users.aggregate([{\$indexStats: {}}])"
```

**Solutions:**

**Solution 1: Optimize Indexes**
```bash
mongo hrms
# Create missing indexes
db.users.createIndex({tenantId: 1, email: 1})
db.tenants.createIndex({status: 1, createdAt: -1})
db.licenses.createIndex({tenantId: 1, status: 1, expiresAt: 1})

# Remove unused indexes
db.users.dropIndex("old_unused_index")
```

**Solution 2: Compact Database**
```bash
# During maintenance window only
mongo hrms
db.runCommand({compact: "users"})
db.runCommand({compact: "tenants"})

# Rebuild indexes
db.users.reIndex()
db.tenants.reIndex()
```

### 4. Redis Issues

#### Issue: Redis Connection Failures

**Symptoms:**
- Session management failures
- Cache misses
- "Redis connection failed" errors

**Diagnosis:**
```bash
# Check Redis service
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Check Redis logs
sudo tail -50 /var/log/redis/redis-server.log
```

**Solutions:**

**Solution 1: Restart Redis**
```bash
sudo systemctl restart redis-server
sleep 5
redis-cli ping
```

**Solution 2: Check Configuration**
```bash
# Check Redis configuration
sudo nano /etc/redis/redis.conf

# Verify settings:
# bind 127.0.0.1
# port 6379
# maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

**Solution 3: Clear Redis Data**
```bash
# If Redis is corrupted
redis-cli FLUSHALL

# Restart applications to rebuild cache
pm2 restart all
```

### 5. Nginx Issues

#### Issue: Nginx Not Starting

**Symptoms:**
- Cannot access website
- "Connection refused" errors
- Nginx service fails to start

**Diagnosis:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check Nginx logs
sudo tail -50 /var/log/nginx/error.log
```

**Solutions:**

**Solution 1: Fix Configuration Errors**
```bash
# Test configuration
sudo nginx -t

# If errors found, check configuration file
sudo nano /etc/nginx/sites-available/hrms

# Common issues:
# - Missing semicolons
# - Invalid SSL certificate paths
# - Incorrect upstream server addresses

# Reload after fixes
sudo nginx -t && sudo systemctl reload nginx
```

**Solution 2: Check Port Conflicts**
```bash
# Check if ports 80/443 are in use
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Kill conflicting processes if necessary
sudo kill -9 <PID>
```

**Solution 3: SSL Certificate Issues**
```bash
# Check certificate files
sudo ls -la /etc/ssl/certs/your-domain.com.crt
sudo ls -la /etc/ssl/private/your-domain.com.key

# Renew Let's Encrypt certificates
sudo certbot renew

# Update Nginx configuration with correct paths
sudo nano /etc/nginx/sites-available/hrms
```

#### Issue: 502 Bad Gateway Errors

**Symptoms:**
- Nginx returns 502 errors
- Backend services appear to be running
- Intermittent connectivity issues

**Diagnosis:**
```bash
# Check upstream servers
curl -f http://localhost:5000/health
curl -f http://localhost:4000/health

# Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log

# Check backend logs
pm2 logs --lines 50
```

**Solutions:**

**Solution 1: Restart Backend Services**
```bash
# Restart backends in order
pm2 restart hrsm-license-server
sleep 5
pm2 restart hrms-main-backend
sleep 5

# Reload Nginx
sudo systemctl reload nginx
```

**Solution 2: Check Nginx Configuration**
```bash
# Verify upstream configuration
sudo nano /etc/nginx/sites-available/hrms

# Check upstream server addresses:
# upstream hrms_backend {
#     server 127.0.0.1:5000;
# }
# upstream license_server {
#     server 127.0.0.1:4000;
# }

sudo nginx -t && sudo systemctl reload nginx
```

### 6. SSL/TLS Issues

#### Issue: SSL Certificate Errors

**Symptoms:**
- Browser shows "Not Secure" warning
- SSL certificate expired warnings
- HTTPS not working

**Diagnosis:**
```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiry
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Solutions:**

**Solution 1: Renew Certificates**
```bash
# Renew Let's Encrypt certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# Reload Nginx
sudo systemctl reload nginx
```

**Solution 2: Fix Certificate Paths**
```bash
# Check certificate files exist
sudo ls -la /etc/letsencrypt/live/your-domain.com/

# Update Nginx configuration
sudo nano /etc/nginx/sites-available/hrms

# Correct paths:
# ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

sudo nginx -t && sudo systemctl reload nginx
```

### 7. Performance Issues

#### Issue: Slow Response Times

**Symptoms:**
- API responses take > 2 seconds
- Frontend applications load slowly
- Timeout errors

**Diagnosis:**
```bash
# Test response times
time curl -f https://your-domain.com/health

# Check system load
uptime
top

# Check database performance
mongo hrms --eval "db.system.profile.find({millis: {\$gt: 100}}).sort({ts: -1}).limit(5)"

# Check network latency
ping -c 5 your-domain.com
```

**Solutions:**

**Solution 1: Optimize Database Queries**
```bash
# Enable query profiling
mongo hrms --eval "db.setProfilingLevel(2, {slowms: 100})"

# Analyze slow queries
mongo hrms --eval "db.system.profile.find().sort({ts: -1}).limit(10)"

# Add missing indexes
mongo hrms
db.users.createIndex({tenantId: 1, status: 1})
db.tenants.createIndex({createdAt: -1})
```

**Solution 2: Scale Resources**
```bash
# Check resource usage
htop
iostat -x 1 5

# If CPU/memory is high, consider:
# - Increasing server resources
# - Adding more PM2 instances
# - Implementing caching

# Increase PM2 instances
nano /var/www/hr-sm/ecosystem.config.js
# instances: 'max' or specific number
pm2 reload ecosystem.config.js
```

**Solution 3: Enable Caching**
```bash
# Clear and optimize Redis cache
redis-cli FLUSHALL
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Restart applications to rebuild cache
pm2 restart all
```

## Diagnostic Commands

### System Health Check

```bash
#!/bin/bash
echo "=== HRMS System Health Check ==="
echo "Date: $(date)"
echo ""

echo "=== Service Status ==="
pm2 list
echo ""

echo "=== System Resources ==="
echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
echo ""

echo "=== Database Status ==="
echo "MongoDB: $(sudo systemctl is-active mongod)"
echo "Redis: $(sudo systemctl is-active redis-server)"
echo ""

echo "=== Network Tests ==="
echo "Main Backend: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)"
echo "License Server: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health)"
echo ""

echo "=== Recent Errors ==="
pm2 logs --lines 10 | grep -i error | tail -5
```

### Performance Analysis

```bash
#!/bin/bash
echo "=== Performance Analysis ==="
echo "Date: $(date)"
echo ""

echo "=== Response Times ==="
echo "Main Backend: $(time curl -s http://localhost:5000/health 2>&1 | grep real)"
echo "License Server: $(time curl -s http://localhost:4000/health 2>&1 | grep real)"
echo ""

echo "=== Database Performance ==="
mongo hrms --quiet --eval "
  db.setProfilingLevel(0);
  var stats = db.stats();
  print('Collections: ' + stats.collections);
  print('Data Size: ' + (stats.dataSize/1024/1024).toFixed(2) + ' MB');
  print('Index Size: ' + (stats.indexSize/1024/1024).toFixed(2) + ' MB');
"

echo ""
echo "=== Redis Performance ==="
redis-cli --latency-history -i 1 | head -5
```

## Log Analysis

### Common Log Patterns

**Error Patterns to Watch:**
```bash
# Database connection errors
grep -i "mongonetworkerror\|connection.*failed" ~/.pm2/logs/*.log

# License validation errors
grep -i "license.*error\|validation.*failed" ~/.pm2/logs/*.log

# Memory issues
grep -i "out of memory\|heap.*exceeded" ~/.pm2/logs/*.log

# Authentication failures
grep -i "authentication.*failed\|unauthorized" ~/.pm2/logs/*.log
```

**Performance Patterns:**
```bash
# Slow queries
grep -i "slow.*query\|timeout" ~/.pm2/logs/*.log

# High response times
grep -E "response.*time.*[0-9]{4,}" ~/.pm2/logs/*.log

# Rate limiting
grep -i "rate.*limit\|too many requests" ~/.pm2/logs/*.log
```

## Recovery Procedures

### Complete System Recovery

**When to use:** Total system failure, corruption, disaster recovery

```bash
#!/bin/bash
echo "Starting complete system recovery..."

# 1. Stop all services
pm2 stop all
sudo systemctl stop nginx

# 2. Backup current state
mkdir -p /tmp/recovery-backup
cp -r /var/www/hr-sm /tmp/recovery-backup/
mongodump --out /tmp/recovery-backup/mongodb

# 3. Restore from backup
npm run recovery:restore -- --backup-id=latest

# 4. Regenerate keys if needed
cd /var/www/hr-sm/hrsm-license-server
npm run generate-keys

# 5. Start services in order
sudo systemctl start mongod
sleep 10
sudo systemctl start redis-server
sleep 5
pm2 start hrsm-license-server
sleep 5
pm2 start hrms-main-backend
sleep 5
sudo systemctl start nginx

# 6. Verify recovery
curl -f https://your-domain.com/health
curl -f https://admin.your-domain.com/license-api/health

echo "Recovery completed. Please verify all functionality."
```

## Contact Information

### Support Escalation

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Critical System Down | admin@your-domain.com | 15 minutes |
| License Server Issues | admin@your-domain.com | 30 minutes |
| Database Problems | dba@your-domain.com | 1 hour |
| Performance Issues | dev@your-domain.com | 2 hours |
| General Support | support@your-domain.com | 4 hours |

### Emergency Procedures

**Critical Issues (System Down):**
1. Call emergency hotline: +1-555-0100
2. Send email to: critical@your-domain.com
3. Post in Slack: #hrms-critical

**Non-Critical Issues:**
1. Create support ticket
2. Email: support@your-domain.com
3. Post in Slack: #hrms-support

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Next Review:** March 2025