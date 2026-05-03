# HR-SM Docker Quick Start

Get the HR-SM system running in production mode with Docker Compose in under 10 minutes.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB disk space

## Quick Deploy

### 1. Configure Environment (2 minutes)

```bash
# Copy and edit environment file
cp .env.production.example .env.production
nano .env.production
```

**Required variables:**
```bash
POSTGRES_PASSWORD=your-secure-password
REDIS_PASSWORD=your-secure-password
LICENSE_SERVER_API_KEY=your-64-char-random-string
SESSION_SECRET=your-64-char-random-string
CORS_ORIGIN=https://your-domain.com,https://admin.your-domain.com
```

### 2. SSL Certificates (1 minute)

```bash
# For production - use your real certificates
mkdir -p config/nginx/ssl
cp /path/to/cert.pem config/nginx/ssl/
cp /path/to/key.pem config/nginx/ssl/

# For testing - generate self-signed
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout config/nginx/ssl/key.pem \
  -out config/nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### 3. Build Frontend Apps (3 minutes)

```bash
# HR App
cd client/hr-app
npm install && npm run build

# Platform Admin
cd ../platform-admin
npm install && npm run build

cd ../..
```

### 4. Update Domains (1 minute)

Edit `config/nginx/proxy.conf`:
- Replace `your-domain.com` with your actual domain
- Replace `admin.your-domain.com` with your admin subdomain

### 5. Start Services (2 minutes)

```bash
# Start all 7 services
docker-compose -f docker-compose.production.yml up -d

# Watch logs
docker-compose -f docker-compose.production.yml logs -f
```

### 6. Verify Deployment (1 minute)

```bash
# Run verification script
./verify-docker-deployment.sh
# or on Windows:
./verify-docker-deployment.ps1

# Manual check
docker-compose -f docker-compose.production.yml ps
# All services should show "healthy"
```

## Access Your System

- **HR App**: https://your-domain.com
- **Platform Admin**: https://admin.your-domain.com
- **API**: https://your-domain.com/api

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart a service
docker-compose -f docker-compose.production.yml restart api-server

# Stop all services
docker-compose -f docker-compose.production.yml down

# Stop and remove all data (WARNING: destructive)
docker-compose -f docker-compose.production.yml down -v
```

## Troubleshooting

**Services won't start?**
```bash
docker-compose -f docker-compose.production.yml logs <service-name>
```

**Health checks failing?**
```bash
# Wait up to 2 minutes for all services to be healthy
docker-compose -f docker-compose.production.yml ps
```

**Need to reset?**
```bash
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
```

## Full Documentation

See [DOCKER-DEPLOYMENT.md](./DOCKER-DEPLOYMENT.md) for complete documentation including:
- Detailed service configuration
- Security best practices
- Performance tuning
- Backup procedures
- Monitoring setup
- Production checklist

## Support

- Check logs: `docker-compose -f docker-compose.production.yml logs`
- View status: `docker-compose -f docker-compose.production.yml ps`
- Review docs: `./DOCKER-DEPLOYMENT.md`
