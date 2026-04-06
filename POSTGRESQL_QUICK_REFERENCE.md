# PostgreSQL Configuration Quick Reference

## Essential Environment Variables

### Required (Must Set)
```env
LICENSE_DATABASE_URL=postgresql://username:password@localhost:5432/hrsm-licenses
MAIN_DATABASE_URL=postgresql://username:password@localhost:5432/hrsm_platform
```

### Optional (Recommended for Production)
```env
# Connection Pool
PG_MAX_POOL_SIZE=20
PG_MIN_POOL_SIZE=5
PG_IDLE_TIMEOUT=10000
PG_CONNECTION_TIMEOUT=30000

# SSL/TLS
PG_SSL_ENABLED=true
PG_SSL_REJECT_UNAUTHORIZED=true
```

## Quick Setup

### Local Development
```bash
# 1. Copy example file
cp .env.example .env

# 2. Update database URLs
LICENSE_DATABASE_URL=postgresql://postgres:password@localhost:5432/hrsm-licenses
MAIN_DATABASE_URL=postgresql://postgres:password@localhost:5432/hrsm_platform

# 3. Start application
npm start
```

### Production
```bash
# 1. Set environment variables
export LICENSE_DATABASE_URL="postgresql://user:pass@host:5432/hrsm-licenses?sslmode=require"
export MAIN_DATABASE_URL="postgresql://user:pass@host:5432/hrsm_platform?sslmode=require"
export PG_SSL_ENABLED=true
export NODE_ENV=production

# 2. Start application
npm run start:prod
```

## Connection String Format

```
postgresql://[username]:[password]@[host]:[port]/[database]?[options]
```

### Examples

**Local:**
```
postgresql://postgres:password@localhost:5432/hrsm_platform
```

**With SSL:**
```
postgresql://user:pass@host:5432/db?sslmode=require
```

**AWS RDS:**
```
postgresql://user:pass@instance.region.rds.amazonaws.com:5432/db?sslmode=require
```

## Common Commands

### Test Connection
```bash
node server/scripts/testDatabaseConnections.js
```

### Check Health
```bash
curl http://localhost:5000/health/database
```

### View Logs
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm start
```

## Troubleshooting

### Connection Refused
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
echo $MAIN_DATABASE_URL
```

### Authentication Failed
```bash
# Verify credentials
psql -h localhost -U username -d hrsm_platform

# Check pg_hba.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf
```

### SSL Error
```bash
# Add sslmode to connection string
?sslmode=require

# Or disable SSL for development
PG_SSL_ENABLED=false
```

### Pool Exhausted
```bash
# Increase pool size
export PG_MAX_POOL_SIZE=50

# Check for connection leaks
curl http://localhost:5000/health/database
```

## Pool Size Guidelines

| Users | MAX_POOL | MIN_POOL |
|-------|----------|----------|
| < 100 | 10-20 | 2-5 |
| 100-1K | 20-50 | 5-10 |
| > 1K | 50-100 | 10-20 |

## SSL Modes

| Mode | Security | Use Case |
|------|----------|----------|
| disable | None | Development only |
| require | Basic | Standard production |
| verify-ca | Medium | Verified CA |
| verify-full | High | Full verification |

## Health Check Response

```json
{
  "licenseServer": {
    "status": "healthy",
    "host": "localhost",
    "database": "hrsm-licenses",
    "poolSize": 10,
    "poolAvailable": 8,
    "ssl": "enabled"
  },
  "mainApp": {
    "status": "healthy",
    "host": "localhost",
    "database": "hrsm_platform",
    "poolSize": 20,
    "poolAvailable": 15,
    "ssl": "enabled"
  },
  "overall": "healthy"
}
```

## Migration from MongoDB

### Old (MongoDB)
```env
MONGODB_URI=mongodb://localhost:27017/hrms
```

### New (PostgreSQL)
```env
LICENSE_DATABASE_URL=postgresql://localhost:5432/hrsm-licenses
MAIN_DATABASE_URL=postgresql://localhost:5432/hrsm_platform
```

## Need More Help?

- 📖 Full Guide: [POSTGRESQL_CONFIGURATION_GUIDE.md](./POSTGRESQL_CONFIGURATION_GUIDE.md)
- 🔧 Migration: [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md)
- ✅ Summary: [CONFIGURATION_MIGRATION_SUMMARY.md](./CONFIGURATION_MIGRATION_SUMMARY.md)
