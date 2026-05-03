# License Server - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+
- PostgreSQL 12+

### Step 1: Install Dependencies
```bash
cd hrsm-license-server
npm install
```

### Step 2: Generate RSA Keys
```bash
npm run generate-keys
```

### Step 3: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
LICENSE_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hrsm_licenses
```

### Step 4: Create Database
```sql
CREATE DATABASE hrsm_licenses;
```

### Step 5: Start Server
```bash
npm start
```

Server runs on **http://localhost:4000**

## 🐳 Docker Quick Start

### With Docker Compose (Easiest)
```bash
cd hrsm-license-server
npm run generate-keys
docker-compose up -d
```

### Manual Docker
```bash
docker build -t license-server .
docker run -d -p 4000:4000 \
  -e LICENSE_DATABASE_URL=postgresql://user:pass@host:5432/db \
  -v $(pwd)/keys:/app/keys:ro \
  license-server
```

## 📋 Test the API

### Health Check
```bash
curl http://localhost:4000/health
```

### Create License
```bash
curl -X POST http://localhost:4000/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-company",
    "features": ["payroll", "attendance"],
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

Save the `licenseKey` from the response.

### Validate License
```bash
curl http://localhost:4000/licenses/YOUR_LICENSE_KEY/validate
```

### Revoke License
```bash
curl -X PUT http://localhost:4000/licenses/YOUR_LICENSE_KEY/revoke \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing revocation"}'
```

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.

## 🆘 Troubleshooting

**Database connection failed?**
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`

**RSA keys not found?**
- Run: `npm run generate-keys`

**Port 4000 in use?**
- Change `PORT` in `.env`
- Or stop the process: `lsof -ti:4000 | xargs kill`

## 🔗 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/licenses` | Create license |
| GET | `/licenses/:key/validate` | Validate license |
| PUT | `/licenses/:key/revoke` | Revoke license |
| GET | `/health` | Health check |

## 📊 Architecture

```
License Server (Port 4000)
    ↓
PostgreSQL Database (hrsm_licenses)
    ↓
RSA-signed JWT Licenses
```

**Independent from main HR-SM app!**
