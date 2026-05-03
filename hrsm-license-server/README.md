# HR-SM License Server - Standalone Microservice

A fully independent Express.js microservice for managing software licenses with RSA-signed JWT tokens and PostgreSQL storage.

## Overview

The License Server is a standalone service that runs independently from the main HR-SM application. It provides secure license generation, validation, and revocation capabilities using RSA cryptography.

## Features

- **Standalone Operation**: Runs independently on port 4000 with its own PostgreSQL database
- **RSA-Signed JWT Licenses**: Cryptographically secure license keys using RS256 algorithm
- **PostgreSQL Storage**: Dedicated database for license persistence and audit trails
- **RESTful API**: Four simple endpoints for complete license lifecycle management
- **Docker Ready**: Includes Dockerfile with health checks and non-root user
- **Production Ready**: Graceful shutdown, error handling, and comprehensive logging

## Architecture

```
┌─────────────────────────────────────┐
│   HR-SM License Server (Port 4000)  │
├─────────────────────────────────────┤
│  POST   /licenses                   │  Create license
│  GET    /licenses/:key/validate     │  Validate license
│  PUT    /licenses/:key/revoke       │  Revoke license
│  GET    /health                     │  Health check
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  PostgreSQL Database (Separate DB)  │
│  - licenses table                   │
│  - RSA signature verification       │
│  - Revocation tracking              │
└─────────────────────────────────────┘
```

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- RSA key pair (generated via `npm run generate-keys`)

## Installation

### 1. Install Dependencies

```bash
cd hrsm-license-server
npm install
```

### 2. Configure Environment

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=4000
NODE_ENV=production

# PostgreSQL Configuration (Separate Database)
LICENSE_DATABASE_URL=postgresql://license_user:license_password@localhost:5432/hrsm_licenses

# RSA Keys
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# CORS
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3001
```

### 3. Generate RSA Keys

```bash
npm run generate-keys
```

This creates `keys/private.pem` and `keys/public.pem` for JWT signing.

### 4. Create Database

```sql
CREATE DATABASE hrsm_licenses;
CREATE USER license_user WITH PASSWORD 'license_password';
GRANT ALL PRIVILEGES ON DATABASE hrsm_licenses TO license_user;
```

The server will automatically create the required tables on first run.

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on port 4000 and display:

```
🚀 License Server running on port 4000
📊 Environment: production
🔗 PostgreSQL: localhost:5432/hrsm_licenses
🔐 RSA Keys: Loaded and ready

📋 Available Endpoints:
   POST   /licenses              - Create new license
   GET    /licenses/:key/validate - Validate license
   PUT    /licenses/:key/revoke   - Revoke license
   GET    /health                 - Health check
```

## API Endpoints

### 1. Create License

**POST** `/licenses`

Generate and store a new RSA-signed JWT license.

**Request Body:**
```json
{
  "tenantId": "company-123",
  "features": ["payroll", "attendance", "leave"],
  "expiresAt": "2026-12-31T23:59:59Z",
  "metadata": {
    "companyName": "Acme Corp",
    "plan": "enterprise"
  }
}
```

**Response:**
```json
{
  "success": true,
  "licenseKey": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "features": ["payroll", "attendance", "leave"],
  "tenantId": "company-123"
}
```

### 2. Validate License

**GET** `/licenses/:key/validate`

Verify signature, expiry, and revocation status.

**Response (Valid):**
```json
{
  "success": true,
  "valid": true,
  "features": ["payroll", "attendance", "leave"],
  "tenantId": "company-123",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "metadata": {
    "companyName": "Acme Corp",
    "plan": "enterprise"
  }
}
```

**Response (Invalid):**
```json
{
  "success": true,
  "valid": false,
  "reason": "License has expired"
}
```

### 3. Revoke License

**PUT** `/licenses/:key/revoke`

Mark a license as revoked. Subsequent validation calls will return `valid: false`.

**Request Body:**
```json
{
  "reason": "Subscription cancelled"
}
```

**Response:**
```json
{
  "success": true,
  "message": "License revoked successfully",
  "licenseKey": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "revokedAt": "2026-05-03T10:30:00.000Z"
}
```

### 4. Health Check

**GET** `/health`

Used by Docker health checks and monitoring systems.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600.5,
  "timestamp": "2026-05-03T10:30:00.000Z",
  "version": "1.0.0",
  "database": "connected",
  "memory": {
    "heapUsed": 45,
    "heapTotal": 89,
    "unit": "MB"
  }
}
```

## Docker Deployment

### Build Image

```bash
docker build -t hrsm-license-server:latest .
```

### Run Container

```bash
docker run -d \
  --name license-server \
  -p 4000:4000 \
  -e LICENSE_DATABASE_URL=postgresql://user:pass@postgres:5432/hrsm_licenses \
  -v $(pwd)/keys:/app/keys:ro \
  hrsm-license-server:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  license-server:
    build: ./hrsm-license-server
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - LICENSE_DATABASE_URL=postgresql://license_user:license_password@postgres:5432/hrsm_licenses
      - ALLOWED_ORIGINS=http://localhost:5000
    volumes:
      - ./hrsm-license-server/keys:/app/keys:ro
      - ./hrsm-license-server/logs:/app/logs
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hrsm_licenses
      - POSTGRES_USER=license_user
      - POSTGRES_PASSWORD=license_password
    volumes:
      - license-db-data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

volumes:
  license-db-data:
```

Start with:
```bash
docker-compose up -d
```

## Database Schema

The server automatically creates the following table:

```sql
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  signature TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_licenses_tenant_id ON licenses(tenant_id);
CREATE INDEX idx_licenses_is_revoked ON licenses(is_revoked);
```

## Security Features

- **RSA-256 Signing**: Asymmetric cryptography prevents license forgery
- **Non-root User**: Docker container runs as user ID 1001
- **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: Request body validation on all endpoints
- **Rate Limiting**: Can be added via middleware
- **Graceful Shutdown**: Proper cleanup of database connections

## Monitoring

### Health Checks

The `/health` endpoint provides:
- Service uptime
- Database connectivity status
- Memory usage statistics
- Timestamp for monitoring

### Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (development mode)

Log format: JSON with timestamps

```json
{
  "level": "info",
  "message": "License created",
  "timestamp": "2026-05-03T10:30:00.000Z",
  "service": "license-server",
  "licenseId": 123,
  "tenantId": "company-123"
}
```

## Testing

```bash
npm test
```

## Troubleshooting

### Database Connection Failed

```
❌ Unable to connect to License Server PostgreSQL
```

**Solution:**
- Verify PostgreSQL is running
- Check `LICENSE_DATABASE_URL` in `.env`
- Ensure database exists and user has permissions

### RSA Keys Not Found

```
❌ Failed to load RSA keys
```

**Solution:**
```bash
npm run generate-keys
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solution:**
- Change `PORT` in `.env`
- Or stop the process using port 4000

## Differences from Main App

| Aspect | License Server | Main HR-SM App |
|--------|---------------|----------------|
| Port | 4000 | 5000 |
| Database | `hrsm_licenses` (separate) | `hrsm_platform` |
| Dependencies | Minimal (Express, Sequelize, JWT) | Full stack |
| Startup | Independent | Part of monorepo |
| Docker | Standalone container | Multi-container |

## Migration Notes

The license server has been extracted from the monorepo and now runs independently:

- **Before**: Started via `npm run dev` in root (concurrently)
- **After**: Started independently via `cd hrsm-license-server && npm start`

The root `package.json` no longer includes the license server in the `dev` script.

## License

ISC

## Support

For issues or questions, contact the HR-SM development team.
