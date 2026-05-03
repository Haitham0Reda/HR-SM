# HR-SM Docker Production Deployment Guide

This guide covers deploying the HR-SM system using Docker Compose in production.

## Architecture Overview

The production deployment consists of 7 services:

1. **postgres** - PostgreSQL 16 database (port 5432 internal)
2. **redis** - Redis 7 cache with password authentication (port 6379 internal)
3. **license-server** - License validation microservice (port 4000 internal)
4. **api-server** - Main HRMS API backend (port 5000 internal)
5. **hr-app** - Employee portal frontend (nginx serving static files)
6. **platform-admin** - Platform admin frontend (nginx serving static files)
7. **nginx-proxy** - Reverse proxy with SSL termination (ports 80, 443 exposed)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 20GB disk space
- SSL certificates for your domain

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd HR-SM

# Copy environment file
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

### 2. Required Environment Variables

Edit `.env.production` and set these critical values:

```bash
# PostgreSQL
POSTGRES_PASSWORD=<strong-password>

# Redis
REDIS_PASSWORD=<strong-password>

# License Server
LICENSE_SERVER_API_KEY=<random-64-char-string>

# Session
SESSION_SECRET=<random-64-char-string>

# CORS
CORS_ORIGIN=https://your-domain.com,https://admin.your-domain.com

# SMTP (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=HR System <noreply@your-domain.com>
```

### 3. SSL Certificates

Place your SSL certificates in `config/nginx/ssl/`:

```bash
mkdir -p config/nginx/ssl
cp /path/to/your/cert.pem config/nginx/ssl/
cp /path/to/your/key.pem config/nginx/ssl/
```

For testing, generate self-signed certificates:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout config/nginx/ssl/key.pem \
  -out config/nginx/ssl/cert.pem \
  -subj "/CN=your-domain.com"
```

### 4. Build Frontend Applications

```bash
# Build HR App
cd client/hr-app
npm install
npm run build

# Build Platform Admin
cd ../platform-admin
npm install
npm run build

cd ../..
```

### 5. Update Nginx Configuration

Edit `config/nginx/proxy.conf` and replace:
- `your-domain.com` with your actual domain
- `admin.your-domain.com` with your admin subdomain

### 6. Start Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Check service status
docker-compose -f docker-compose.production.yml ps
```

### 7. Verify Health Checks

Wait for all health checks to pass (up to 2 minutes):

```bash
# Check all services are healthy
docker-compose -f docker-compose.production.yml ps

# All services should show "healthy" status
```

### 8. Initialize Database

```bash
# Run migrations
docker-compose -f docker-compose.production.yml exec api-server npm run migrate

# Seed initial data (optional)
docker-compose -f docker-compose.production.yml exec api-server npm run seed
```

## Service Details

### PostgreSQL (postgres)
- **Image**: postgres:16-alpine
- **Volume**: pgdata (persistent)
- **Health Check**: pg_isready command
- **Environment**: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD

### Redis (redis)
- **Image**: redis:7-alpine
- **Volume**: redisdata (persistent)
- **Health Check**: redis-cli ping
- **Authentication**: Password required via --requirepass

### License Server (license-server)
- **Build**: hrsm-license-server/Dockerfile
- **Port**: 4000 (internal only)
- **Dependencies**: postgres
- **Health Check**: /health endpoint
- **Volumes**: license_keys, license_logs

### API Server (api-server)
- **Build**: ./Dockerfile
- **Port**: 5000 (internal only)
- **Dependencies**: postgres, redis, license-server
- **Health Check**: /health endpoint
- **Volumes**: hrms_uploads, hrms_logs, hrms_backups

### HR App (hr-app)
- **Image**: nginx:alpine
- **Serves**: client/hr-app/dist
- **Config**: config/nginx/hr-app.conf
- **Health Check**: HTTP GET /

### Platform Admin (platform-admin)
- **Image**: nginx:alpine
- **Serves**: client/platform-admin/dist
- **Config**: config/nginx/platform-admin.conf
- **Health Check**: HTTP GET /

### Nginx Proxy (nginx-proxy)
- **Image**: nginx:alpine
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Config**: config/nginx/proxy.conf
- **SSL**: Terminates SSL/TLS
- **Features**: Rate limiting, gzip compression, security headers

## Health Checks

All services include health checks with these parameters:
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3 attempts
- **Start Period**: 40 seconds

Health check commands:
- **postgres**: `pg_isready -U hrms_user -d hrms`
- **redis**: `redis-cli --raw incr ping`
- **license-server**: `wget http://localhost:4000/health`
- **api-server**: `wget http://localhost:5000/health`
- **hr-app**: `wget http://localhost:80/`
- **platform-admin**: `wget http://localhost:80/`
- **nginx-proxy**: `wget http://localhost:80/health`

## Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f api-server

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100
```

### Check Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

### Service Status

```bash
# List all services with health status
docker-compose -f docker-compose.production.yml ps

# Inspect specific service
docker inspect hrms-api-server
```

## Maintenance

### Backup Database

```bash
# PostgreSQL backup
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U hrms_user hrms > backup-$(date +%Y%m%d).sql

# Redis backup
docker-compose -f docker-compose.production.yml exec redis \
  redis-cli --rdb /data/dump.rdb
```

### Update Services

```bash
# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Rebuild custom images
docker-compose -f docker-compose.production.yml build --no-cache

# Restart services
docker-compose -f docker-compose.production.yml up -d
```

### Scale Services

```bash
# Scale API servers (requires load balancer config)
docker-compose -f docker-compose.production.yml up -d --scale api-server=3
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs <service-name>

# Check environment variables
docker-compose -f docker-compose.production.yml config

# Restart specific service
docker-compose -f docker-compose.production.yml restart <service-name>
```

### Health Check Failing

```bash
# Execute health check manually
docker-compose -f docker-compose.production.yml exec <service-name> \
  wget --no-verbose --tries=1 --spider http://localhost:<port>/health

# Check service logs
docker-compose -f docker-compose.production.yml logs <service-name>
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U hrms_user -d hrms -c "SELECT 1"

# Test Redis connection
docker-compose -f docker-compose.production.yml exec redis \
  redis-cli -a $REDIS_PASSWORD ping
```

### Reset Everything

```bash
# Stop and remove all containers
docker-compose -f docker-compose.production.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.production.yml down -v

# Start fresh
docker-compose -f docker-compose.production.yml up -d
```

## Security Considerations

1. **Change all default passwords** in `.env.production`
2. **Use strong SSL certificates** from a trusted CA
3. **Enable firewall** rules to restrict access
4. **Regular backups** of PostgreSQL and Redis data
5. **Monitor logs** for suspicious activity
6. **Keep Docker images updated** with security patches
7. **Use Docker secrets** for sensitive data in production
8. **Restrict network access** to internal services
9. **Enable audit logging** for compliance
10. **Regular security scans** of Docker images

## Performance Tuning

### PostgreSQL

Edit `docker-compose.production.yml` to add:

```yaml
postgres:
  command: postgres -c max_connections=200 -c shared_buffers=256MB
```

### Redis

Edit `docker-compose.production.yml` to add:

```yaml
redis:
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Nginx

Adjust worker processes in `config/nginx/proxy.conf`:

```nginx
worker_processes 4;
worker_connections 2048;
```

## Production Checklist

- [ ] All environment variables configured
- [ ] SSL certificates installed
- [ ] Frontend applications built
- [ ] Nginx domains configured
- [ ] All services start successfully
- [ ] All health checks pass within 2 minutes
- [ ] Database migrations completed
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Firewall rules applied
- [ ] DNS records configured
- [ ] Load testing completed
- [ ] Disaster recovery plan documented

## Support

For issues or questions:
- Check logs: `docker-compose -f docker-compose.production.yml logs`
- Review health checks: `docker-compose -f docker-compose.production.yml ps`
- Consult documentation in `/docs`
- Contact system administrator

## License

Copyright © 2024 HR-SM. All rights reserved.
