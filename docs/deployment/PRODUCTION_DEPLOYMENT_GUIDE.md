# HRMS Enterprise Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the HRMS Enterprise system to production environments. The system consists of two main backends (main HRMS and license server), two frontend applications (HR App and Platform Admin), and supporting infrastructure (MongoDB, Redis, Nginx).

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   HR App        │    │ Platform Admin  │
│   (Port 3000)   │    │   (Port 3001)   │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌─────────────────┐
         │     Nginx       │
         │  Load Balancer  │
         │  (Ports 80/443) │
         └─────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
┌─────────────┐ ┌─────────────┐ │
│ Main HRMS   │ │ License     │ │
│ Backend     │ │ Server      │ │
│ (Port 5000) │ │ (Port 4000) │ │
└─────────────┘ └─────────────┘ │
         │           │           │
         └───────────┼───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌─────────┐    ┌─────────┐    ┌─────────┐
│MongoDB  │    │ Redis   │    │Prometheus│
│(27017)  │    │ (6379)  │    │ (9091)  │
└─────────┘    └─────────┘    └─────────┘
```

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 4 cores (8 recommended)
- RAM: 8GB (16GB recommended)
- Storage: 100GB SSD (500GB recommended)
- Network: 1Gbps connection

**Operating System:**
- Ubuntu 20.04 LTS or later
- CentOS 8 or later
- Windows Server 2019 or later

### Software Dependencies

**Required Software:**
- Node.js 18.x or later
- MongoDB 6.0 or later
- Redis 7.0 or later
- Nginx 1.20 or later
- PM2 (latest version)
- Git

**Optional but Recommended:**
- Docker and Docker Compose
- Prometheus and Grafana
- SSL certificates (Let's Encrypt or commercial)

## Pre-Deployment Checklist

### 1. Infrastructure Setup

- [ ] Server provisioned with adequate resources
- [ ] Operating system updated and secured
- [ ] Firewall configured (ports 80, 443, 22 open)
- [ ] SSL certificates obtained and configured
- [ ] Domain names configured (main domain and admin subdomain)
- [ ] Database server accessible (MongoDB)
- [ ] Cache server accessible (Redis)

### 2. Security Configuration

- [ ] SSH key-based authentication configured
- [ ] Non-root user created for deployment
- [ ] Fail2ban or similar intrusion prevention installed
- [ ] Regular security updates scheduled
- [ ] Backup encryption keys generated
- [ ] API keys and secrets generated

### 3. Monitoring Setup

- [ ] Prometheus server configured
- [ ] Grafana dashboards imported
- [ ] Alertmanager notification channels configured
- [ ] Log aggregation system configured
- [ ] Health check endpoints verified

## Deployment Steps

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git nginx mongodb redis-server

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create deployment user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# Create application directories
sudo mkdir -p /var/www/hr-sm
sudo chown deploy:deploy /var/www/hr-sm
```

### Step 2: Database Configuration

```bash
# Configure MongoDB
sudo systemctl enable mongod
sudo systemctl start mongod

# Create MongoDB admin user
mongo admin --eval "
db.createUser({
  user: 'admin',
  pwd: 'your-secure-password',
  roles: ['root']
})
"

# Configure Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Secure Redis (optional)
sudo nano /etc/redis/redis.conf
# Add: requirepass your-redis-password
sudo systemctl restart redis-server
```

### Step 3: Application Deployment

```bash
# Switch to deployment user
sudo su - deploy

# Clone repository
cd /var/www
git clone https://github.com/your-org/hr-sm.git
cd hr-sm

# Run deployment script
sudo ./scripts/deploy-production.sh

# Or manual deployment:
# Install main backend dependencies
npm ci --production

# Install license server dependencies
cd hrsm-license-server
npm ci --production
npm run generate-keys

# Install and build frontend applications
cd ../client
npm ci
npm run build:hr-app
npm run build:platform-admin
```

### Step 4: Environment Configuration

```bash
# Configure main backend environment
cp .env.production.example .env
nano .env

# Configure license server environment
cd hrsm-license-server
cp .env.example .env
nano .env

# Key environment variables to configure:
# - MONGODB_URI
# - REDIS_URL
# - LICENSE_SERVER_API_KEY
# - SESSION_SECRET
# - SMTP_* (email settings)
# - AWS_* (backup settings)
# - SSL certificate paths
```

### Step 5: SSL and Nginx Configuration

```bash
# Install SSL certificates (Let's Encrypt example)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d admin.your-domain.com

# Copy Nginx configuration
sudo cp config/nginx/hrms.conf /etc/nginx/sites-available/hrms
sudo ln -s /etc/nginx/sites-available/hrms /etc/nginx/sites-enabled/

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Start Services

```bash
# Start main backend with PM2
pm2 start ecosystem.config.js --env production

# Start license server with PM2
cd hrsm-license-server
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup

# Start frontend applications (if not using static files)
# pm2 start client/ecosystem.config.js --env production
```

### Step 7: Monitoring Setup

```bash
# Install monitoring stack
sudo ./scripts/setup-monitoring.sh

# Import Grafana dashboards
# Access Grafana at http://your-domain:3002
# Default credentials: admin/admin
# Import dashboards from config/grafana/dashboards/
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check main backend health
curl -f http://localhost:5000/health

# Check license server health
curl -f http://localhost:4000/health

# Check frontend applications
curl -f http://localhost:3000
curl -f http://localhost:3001

# Check SSL certificates
curl -f https://your-domain.com/health
curl -f https://admin.your-domain.com/health
```

### 2. Service Status

```bash
# Check PM2 processes
pm2 list

# Check system services
sudo systemctl status nginx
sudo systemctl status mongod
sudo systemctl status redis-server

# Check monitoring services
sudo systemctl status prometheus
sudo systemctl status grafana-server
```

### 3. Database Connectivity

```bash
# Test MongoDB connection
mongo "mongodb://username:password@localhost:27017/hrms" --eval "db.stats()"

# Test Redis connection
redis-cli ping

# Test license database
mongo "mongodb://username:password@localhost:27017/hrsm-licenses" --eval "db.stats()"
```

### 4. License System Verification

```bash
# Test license creation (from Platform Admin)
# 1. Access https://admin.your-domain.com
# 2. Create a test company
# 3. Generate a license
# 4. Verify license validation works

# Test license validation API
curl -X POST http://localhost:4000/licenses/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"token": "test-jwt-token", "machineId": "test-machine"}'
```

## Configuration Files

### Main Backend (.env)

```bash
# Database
MONGODB_URI=mongodb://username:password@localhost:27017/hrms
REDIS_URL=redis://localhost:6379

# License Server Integration
LICENSE_SERVER_URL=http://localhost:4000
LICENSE_SERVER_API_KEY=your-secure-api-key

# Security
SESSION_SECRET=your-super-secure-session-secret
CORS_ORIGIN=https://your-domain.com,https://admin.your-domain.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info

# Backup
BACKUP_ENABLED=true
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=hrms-backups-production
```

### License Server (.env)

```bash
# Database
MONGODB_URI=mongodb://username:password@localhost:27017/hrsm-licenses

# JWT Configuration
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# API Security
ADMIN_API_KEY=your-secure-admin-api-key
ALLOWED_ORIGINS=https://admin.your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Backup and Recovery

### Automated Backups

The system includes automated daily backups that cover:

- **MongoDB databases** (both main and license databases)
- **Uploaded files** (documents, profile pictures)
- **Configuration files** (.env, nginx configs)
- **RSA keys** (encrypted)
- **Application code** (current deployment)

```bash
# Manual backup creation
npm run backup:create

# List available backups
npm run backup:list

# Restore from backup
npm run recovery:restore -- --backup-id=backup-20231201-120000
```

### Backup Verification

```bash
# Verify backup integrity
npm run verify:auto

# Test backup restoration (dry run)
npm run recovery:detect
```

## Troubleshooting

### Common Issues

#### 1. License Server Connection Failed

**Symptoms:**
- Main backend cannot connect to license server
- License validation errors in logs

**Solutions:**
```bash
# Check license server status
curl -f http://localhost:4000/health

# Check license server logs
pm2 logs hrsm-license-server

# Restart license server
pm2 restart hrsm-license-server

# Verify API key configuration
grep LICENSE_SERVER_API_KEY .env
grep ADMIN_API_KEY hrsm-license-server/.env
```

#### 2. Database Connection Issues

**Symptoms:**
- Application fails to start
- Database connection errors in logs

**Solutions:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Test MongoDB connection
mongo "mongodb://localhost:27017/hrms" --eval "db.stats()"

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

#### 3. High Memory Usage

**Symptoms:**
- PM2 processes consuming excessive memory
- System becomes unresponsive

**Solutions:**
```bash
# Check memory usage
pm2 monit

# Restart processes with memory issues
pm2 restart hrms-main-backend

# Adjust PM2 memory limits
# Edit ecosystem.config.js: max_memory_restart: '1G'
pm2 reload ecosystem.config.js
```

#### 4. SSL Certificate Issues

**Symptoms:**
- HTTPS not working
- Certificate warnings in browser

**Solutions:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Log Locations

```bash
# Application logs
/var/www/hr-sm/logs/
/var/www/hr-sm/hrsm-license-server/logs/

# PM2 logs
~/.pm2/logs/

# System logs
/var/log/nginx/
/var/log/mongodb/
/var/log/redis/

# Monitoring logs
/var/log/prometheus/
/var/log/grafana/
```

## Maintenance Procedures

### Daily Tasks

- [ ] Check system health dashboards
- [ ] Verify backup completion
- [ ] Review error logs
- [ ] Monitor resource usage

### Weekly Tasks

- [ ] Update system packages
- [ ] Review security logs
- [ ] Test backup restoration
- [ ] Check SSL certificate expiry

### Monthly Tasks

- [ ] Update application dependencies
- [ ] Review and rotate logs
- [ ] Performance optimization review
- [ ] Security audit

## Security Considerations

### Network Security

- Use firewall to restrict access to necessary ports only
- Implement VPN for administrative access
- Use SSL/TLS for all communications
- Regular security updates

### Application Security

- Strong passwords and API keys
- Regular key rotation
- Input validation and sanitization
- Rate limiting and DDoS protection

### Data Security

- Database encryption at rest
- Backup encryption
- Secure key management
- Regular security audits

## Performance Optimization

### Database Optimization

```bash
# MongoDB indexing
mongo hrms --eval "db.users.createIndex({tenantId: 1, email: 1})"
mongo hrms --eval "db.tenants.createIndex({status: 1, createdAt: -1})"

# Redis memory optimization
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Application Optimization

```bash
# Enable Node.js clustering (already configured in PM2)
# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable compression in Nginx (already configured)
# Use CDN for static assets
```

## Scaling Considerations

### Horizontal Scaling

- Add more backend instances behind load balancer
- Use MongoDB replica sets
- Implement Redis clustering
- Use container orchestration (Kubernetes)

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement caching strategies
- Use SSD storage

## Support and Maintenance

### Monitoring Alerts

Configure alerts for:
- Service downtime
- High resource usage
- Database connectivity issues
- License server failures
- Backup failures

### Emergency Contacts

- **System Administrator:** admin@your-domain.com
- **Database Administrator:** dba@your-domain.com
- **Development Team:** dev@your-domain.com
- **Business Owner:** business@your-domain.com

### Escalation Procedures

1. **Level 1:** Automated monitoring alerts
2. **Level 2:** System administrator notification
3. **Level 3:** Development team escalation
4. **Level 4:** Business owner notification

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Next Review:** March 2025