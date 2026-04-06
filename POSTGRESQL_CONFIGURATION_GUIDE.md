# PostgreSQL Configuration Guide

This guide provides detailed information on configuring PostgreSQL connections for the HR-SM application after migration from MongoDB.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Connection String Format](#connection-string-format)
4. [Connection Pooling](#connection-pooling)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Cloud Provider Examples](#cloud-provider-examples)
7. [Performance Tuning](#performance-tuning)
8. [Troubleshooting](#troubleshooting)

## Overview

The HR-SM application uses two separate PostgreSQL databases:

1. **License Server Database** (`hrsm-licenses`): Stores license information, tenant metadata, and validation records
2. **Main Application Database** (`hrsm_platform`): Stores HR business data for all tenants using tenant_id column for isolation

## Environment Variables

### Required Variables

#### Main Application (.env)

```env
# License Server Database Connection
LICENSE_DATABASE_URL=postgresql://username:password@localhost:5432/hrsm-licenses

# Main Application Database Connection
MAIN_DATABASE_URL=postgresql://username:password@localhost:5432/hrsm_platform
```

#### License Server (hrsm-license-server/.env)

```env
# License Server Database Connection
LICENSE_DATABASE_URL=postgresql://username:password@localhost:5432/hrsm-licenses
```

### Optional Configuration Variables

#### Connection Pool Settings

```env
# Maximum number of connections in the pool
PG_MAX_POOL_SIZE=20

# Minimum number of connections in the pool
PG_MIN_POOL_SIZE=5

# Maximum time (ms) a connection can be idle before being released
PG_IDLE_TIMEOUT=10000

# Maximum time (ms) to wait for a connection from the pool
PG_CONNECTION_TIMEOUT=30000
```

**Recommended Values by Environment:**

| Environment | MAX_POOL_SIZE | MIN_POOL_SIZE | IDLE_TIMEOUT | CONNECTION_TIMEOUT |
|-------------|---------------|---------------|--------------|-------------------|
| Development | 10            | 2             | 10000        | 30000             |
| Staging     | 20            | 5             | 10000        | 30000             |
| Production  | 50            | 10            | 10000        | 30000             |

#### SSL/TLS Settings

```env
# Enable SSL connections (recommended for production)
PG_SSL_ENABLED=true

# Reject unauthorized SSL certificates
PG_SSL_REJECT_UNAUTHORIZED=true

# Optional: Custom SSL certificate paths
PG_SSL_CA_PATH=/path/to/ca-certificate.crt
PG_SSL_KEY_PATH=/path/to/client-key.key
PG_SSL_CERT_PATH=/path/to/client-cert.crt
```

## Connection String Format

### Basic Format

```
postgresql://[username]:[password]@[host]:[port]/[database]
```

### With Query Parameters

```
postgresql://[username]:[password]@[host]:[port]/[database]?[param1=value1&param2=value2]
```

### Common Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `sslmode` | SSL connection mode | `require`, `verify-full`, `disable` |
| `connect_timeout` | Connection timeout in seconds | `10` |
| `application_name` | Application identifier | `hrms-app` |
| `options` | PostgreSQL options | `-c statement_timeout=30000` |

### Examples

**Local Development:**
```env
LICENSE_DATABASE_URL=postgresql://hrms_user:hrms_pass@localhost:5432/hrsm-licenses
MAIN_DATABASE_URL=postgresql://hrms_user:hrms_pass@localhost:5432/hrsm_platform
```

**With SSL:**
```env
LICENSE_DATABASE_URL=postgresql://user:pass@host:5432/hrsm-licenses?sslmode=require
MAIN_DATABASE_URL=postgresql://user:pass@host:5432/hrsm_platform?sslmode=require
```

**With Application Name:**
```env
LICENSE_DATABASE_URL=postgresql://user:pass@host:5432/hrsm-licenses?application_name=hrms-license-server
MAIN_DATABASE_URL=postgresql://user:pass@host:5432/hrsm_platform?application_name=hrms-main-app
```

## Connection Pooling

### Overview

Connection pooling reuses database connections to improve performance and reduce overhead. The application uses Sequelize's built-in connection pooling.

### Configuration

Connection pool settings are configured via environment variables and applied in `server/config/database.js`:

```javascript
pool: {
  max: parseInt(process.env.PG_MAX_POOL_SIZE) || 20,
  min: parseInt(process.env.PG_MIN_POOL_SIZE) || 5,
  acquire: parseInt(process.env.PG_CONNECTION_TIMEOUT) || 30000,
  idle: parseInt(process.env.PG_IDLE_TIMEOUT) || 10000
}
```

### Pool Size Guidelines

**Calculating Optimal Pool Size:**

```
connections = ((core_count * 2) + effective_spindle_count)
```

For most applications:
- **Small apps (< 100 concurrent users):** 10-20 connections
- **Medium apps (100-1000 users):** 20-50 connections
- **Large apps (> 1000 users):** 50-100 connections

**Important:** PostgreSQL has a default `max_connections` of 100. Ensure your pool size doesn't exceed this limit across all application instances.

### Monitoring Pool Usage

The application logs pool metrics when `LOG_LEVEL=debug`:

```
License Server DB: Connection acquired from pool
Main App DB: Connection released back to pool
```

## SSL/TLS Configuration

### Why Use SSL?

- **Encryption:** Protects data in transit
- **Authentication:** Verifies server identity
- **Compliance:** Required for many security standards (PCI-DSS, HIPAA)

### SSL Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `disable` | No SSL | Local development only |
| `require` | SSL required, no verification | Basic encryption |
| `verify-ca` | SSL with CA verification | Standard production |
| `verify-full` | SSL with full verification | High security environments |

### Configuration Methods

#### Method 1: Connection String Parameter

```env
LICENSE_DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

#### Method 2: Environment Variables

```env
PG_SSL_ENABLED=true
PG_SSL_REJECT_UNAUTHORIZED=true
```

#### Method 3: Custom Certificates

```env
PG_SSL_ENABLED=true
PG_SSL_CA_PATH=/etc/ssl/certs/ca-certificate.crt
PG_SSL_KEY_PATH=/etc/ssl/private/client-key.key
PG_SSL_CERT_PATH=/etc/ssl/certs/client-cert.crt
```

### SSL Certificate Setup

**1. Obtain Certificates:**
- From your cloud provider (AWS RDS, Google Cloud SQL, Azure)
- From your certificate authority
- Self-signed for development

**2. Place Certificates:**
```bash
mkdir -p /etc/ssl/certs
mkdir -p /etc/ssl/private
chmod 600 /etc/ssl/private/client-key.key
```

**3. Configure Environment:**
```env
PG_SSL_CA_PATH=/etc/ssl/certs/ca-certificate.crt
PG_SSL_KEY_PATH=/etc/ssl/private/client-key.key
PG_SSL_CERT_PATH=/etc/ssl/certs/client-cert.crt
```

## Cloud Provider Examples

### AWS RDS

**Connection String:**
```env
LICENSE_DATABASE_URL=postgresql://username:password@instance.region.rds.amazonaws.com:5432/hrsm-licenses?sslmode=require
MAIN_DATABASE_URL=postgresql://username:password@instance.region.rds.amazonaws.com:5432/hrsm_platform?sslmode=require
```

**With SSL Certificate:**
```bash
# Download RDS CA certificate
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -O /etc/ssl/certs/rds-ca-bundle.pem
```

```env
PG_SSL_ENABLED=true
PG_SSL_CA_PATH=/etc/ssl/certs/rds-ca-bundle.pem
```

**Recommended Settings:**
```env
PG_MAX_POOL_SIZE=50
PG_MIN_POOL_SIZE=10
PG_CONNECTION_TIMEOUT=30000
PG_IDLE_TIMEOUT=10000
```

### Google Cloud SQL

**Connection String:**
```env
LICENSE_DATABASE_URL=postgresql://username:password@/hrsm-licenses?host=/cloudsql/project:region:instance
MAIN_DATABASE_URL=postgresql://username:password@/hrsm_platform?host=/cloudsql/project:region:instance
```

**With Public IP:**
```env
LICENSE_DATABASE_URL=postgresql://username:password@public-ip:5432/hrsm-licenses?sslmode=require
MAIN_DATABASE_URL=postgresql://username:password@public-ip:5432/hrsm_platform?sslmode=require
```

**Recommended Settings:**
```env
PG_MAX_POOL_SIZE=40
PG_MIN_POOL_SIZE=8
PG_CONNECTION_TIMEOUT=30000
```

### Azure Database for PostgreSQL

**Connection String:**
```env
LICENSE_DATABASE_URL=postgresql://username@servername:password@servername.postgres.database.azure.com:5432/hrsm-licenses?sslmode=require
MAIN_DATABASE_URL=postgresql://username@servername:password@servername.postgres.database.azure.com:5432/hrsm_platform?sslmode=require
```

**Recommended Settings:**
```env
PG_MAX_POOL_SIZE=45
PG_MIN_POOL_SIZE=9
PG_CONNECTION_TIMEOUT=30000
```

### Heroku Postgres

**Connection String:**
```env
# Heroku provides DATABASE_URL automatically
LICENSE_DATABASE_URL=${DATABASE_URL}
MAIN_DATABASE_URL=${HEROKU_POSTGRESQL_MAIN_URL}
```

**Note:** Heroku rotates credentials periodically. Use the provided environment variables instead of hardcoding.

### DigitalOcean Managed Databases

**Connection String:**
```env
LICENSE_DATABASE_URL=postgresql://username:password@host.db.ondigitalocean.com:25060/hrsm-licenses?sslmode=require
MAIN_DATABASE_URL=postgresql://username:password@host.db.ondigitalocean.com:25060/hrsm_platform?sslmode=require
```

## Performance Tuning

### Database-Level Settings

**Recommended PostgreSQL Configuration:**

```sql
-- Connection settings
max_connections = 200

-- Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB

-- Query planning
random_page_cost = 1.1
effective_io_concurrency = 200

-- Write-ahead log
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Application-Level Optimization

**1. Use Connection Pooling:**
```env
PG_MAX_POOL_SIZE=50
PG_MIN_POOL_SIZE=10
```

**2. Set Appropriate Timeouts:**
```env
PG_CONNECTION_TIMEOUT=30000
PG_IDLE_TIMEOUT=10000
```

**3. Enable Query Logging (Development Only):**
```env
NODE_ENV=development
LOG_LEVEL=debug
```

**4. Monitor Pool Metrics:**
```javascript
const health = await checkDatabaseHealth();
console.log('Pool size:', health.mainApp.poolSize);
console.log('Available connections:', health.mainApp.poolAvailable);
```

### Index Optimization

Ensure proper indexes exist on frequently queried columns:

```sql
-- Tenant isolation indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_attendances_tenant_id ON attendances(tenant_id);

-- Composite indexes for common queries
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_attendances_tenant_date ON attendances(tenant_id, date);
```

## Troubleshooting

### Connection Refused

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
2. Check firewall rules
3. Verify host and port in connection string
4. Check PostgreSQL `listen_addresses` in `postgresql.conf`

### Authentication Failed

**Error:**
```
Error: password authentication failed for user "username"
```

**Solutions:**
1. Verify username and password
2. Check `pg_hba.conf` authentication method
3. Ensure user has database access: `GRANT ALL PRIVILEGES ON DATABASE hrsm_platform TO username;`

### SSL Connection Error

**Error:**
```
Error: SSL connection required
```

**Solutions:**
1. Add `?sslmode=require` to connection string
2. Set `PG_SSL_ENABLED=true`
3. Verify SSL certificates are valid and accessible

### Too Many Connections

**Error:**
```
Error: sorry, too many clients already
```

**Solutions:**
1. Reduce `PG_MAX_POOL_SIZE`
2. Increase PostgreSQL `max_connections`
3. Check for connection leaks in application code
4. Scale horizontally with read replicas

### Connection Pool Exhausted

**Error:**
```
Error: Timeout acquiring connection from pool
```

**Solutions:**
1. Increase `PG_MAX_POOL_SIZE`
2. Increase `PG_CONNECTION_TIMEOUT`
3. Optimize slow queries
4. Check for long-running transactions

### Health Check

Use the built-in health check endpoint:

```bash
curl http://localhost:5000/health/database
```

**Expected Response:**
```json
{
  "licenseServer": {
    "status": "healthy",
    "host": "localhost",
    "database": "hrsm-licenses",
    "poolSize": 10,
    "poolAvailable": 8
  },
  "mainApp": {
    "status": "healthy",
    "host": "localhost",
    "database": "hrsm_platform",
    "poolSize": 20,
    "poolAvailable": 15
  },
  "overall": "healthy"
}
```

### Testing Connections

Run the connection test script:

```bash
node server/scripts/testDatabaseConnections.js
```

This will verify:
- Connection to both databases
- SSL configuration
- Pool settings
- Query execution
- Transaction support

## Best Practices

1. **Never commit credentials:** Use environment variables, never hardcode
2. **Use SSL in production:** Always enable SSL for production databases
3. **Monitor pool usage:** Track connection pool metrics
4. **Set appropriate timeouts:** Prevent hanging connections
5. **Use read replicas:** For read-heavy workloads
6. **Regular backups:** Automated daily backups with retention
7. **Connection string validation:** Validate format before deployment
8. **Rotate credentials:** Regularly update database passwords
9. **Least privilege:** Grant only necessary permissions
10. **Monitor slow queries:** Use `pg_stat_statements` extension

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [Node.js PostgreSQL Best Practices](https://node-postgres.com/guides/project-structure)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Google Cloud SQL PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/en-us/azure/postgresql/)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review application logs: `tail -f logs/application.log`
3. Run health check: `curl http://localhost:5000/health/database`
4. Contact your database administrator
