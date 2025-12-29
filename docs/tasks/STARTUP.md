# License Server Startup Guide

## Prerequisites

Before starting the license server, ensure you have:

1. ✅ Node.js 18+ installed
2. ✅ MongoDB running (or connection string to remote MongoDB)
3. ✅ RSA keys generated
4. ✅ Environment variables configured

## Step-by-Step Startup

### 1. Install Dependencies

```bash
cd hrsm-license-server
npm install
```

### 2. Generate RSA Keys

```bash
npm run generate-keys
```

This creates:
- `keys/private.pem` - Private key for signing JWT tokens
- `keys/public.pem` - Public key for verification

**Important**: Copy `keys/public.pem` to your HR-SM backend for license validation.

### 3. Configure Environment

Create `.env` file (or copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/hrsm-licenses

# RSA Keys
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Security
ADMIN_API_KEY=your-secure-api-key-here
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Start MongoDB

Ensure MongoDB is running:

```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# If not running, start MongoDB
# Windows: Start MongoDB service
# Linux/Mac: sudo systemctl start mongod
```

### 5. Start the License Server

**Development Mode** (with auto-reload):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

**With PM2** (recommended for production):
```bash
pm2 start ecosystem.config.js --env production
```

### 6. Verify Server is Running

Check health endpoint:
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-20T14:00:00.000Z",
    "uptime": 10.5,
    "version": "1.0.0",
    "environment": "development",
    "checks": {
      "database": "healthy",
      "rsaKeys": "healthy",
      "memory": "healthy"
    }
  }
}
```

## Troubleshooting

### MongoDB Connection Failed

**Error**: `MongoDB connection error: ECONNREFUSED`

**Solution**:
1. Check MongoDB is running: `mongosh`
2. Verify connection string in `.env`
3. Check MongoDB port (default: 27017)

### Private Key Not Found

**Error**: `Private key not found`

**Solution**:
```bash
npm run generate-keys
```

### Port 4000 Already in Use

**Error**: `EADDRINUSE: address already in use :::4000`

**Solution**:
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

### CORS Errors

**Error**: `Access-Control-Allow-Origin`

**Solution**:
Add your frontend URL to `ALLOWED_ORIGINS` in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5000
```

## Production Deployment

### Using PM2

1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Start server:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

3. Save PM2 configuration:
   ```bash
   pm2 save
   pm2 startup
   ```

4. Monitor:
   ```bash
   pm2 status
   pm2 logs hrsm-license-server
   pm2 monit
   ```

### Using Docker

1. Build image:
   ```bash
   docker build -t hrsm-license-server .
   ```

2. Run container:
   ```bash
   docker run -d \
     -p 4000:4000 \
     -e MONGODB_URI=mongodb://host.docker.internal:27017/hrsm-licenses \
     -e ADMIN_API_KEY=your-secure-key \
     -v $(pwd)/keys:/app/keys \
     --name license-server \
     hrsm-license-server
   ```

### Using Systemd

1. Create service file `/etc/systemd/system/hrsm-license-server.service`:
   ```ini
   [Unit]
   Description=HR-SM License Server
   After=network.target mongodb.service

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/hrsm-license-server
   ExecStart=/usr/bin/node src/server.js
   Restart=on-failure
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start:
   ```bash
   sudo systemctl enable hrsm-license-server
   sudo systemctl start hrsm-license-server
   sudo systemctl status hrsm-license-server
   ```

## Security Checklist

Before deploying to production:

- [ ] Generate new RSA keys (don't use development keys)
- [ ] Set strong `ADMIN_API_KEY` (use cryptographically secure random string)
- [ ] Configure `ALLOWED_ORIGINS` with production URLs only
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS (configure reverse proxy like Nginx)
- [ ] Set proper file permissions on `keys/private.pem` (600)
- [ ] Backup RSA keys securely
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation

## Integration with HR-SM Backend

1. **Copy public key** to HR-SM backend:
   ```bash
   cp keys/public.pem ../server/keys/license-public.pem
   ```

2. **Configure HR-SM backend** to use license server:
   ```javascript
   // In HR-SM backend .env
   LICENSE_SERVER_URL=http://localhost:4000
   LICENSE_API_KEY=your-admin-api-key
   LICENSE_PUBLIC_KEY_PATH=./keys/license-public.pem
   ```

3. **Test integration**:
   - Create a test license via Platform Admin
   - Verify HR-SM backend can validate the license
   - Check module access control works

## Monitoring

### Health Checks

Set up automated health checks:

```bash
# Basic health check
curl http://localhost:4000/health

# Detailed health check
curl http://localhost:4000/health/detailed
```

### Logs

Monitor logs:

```bash
# PM2 logs
pm2 logs hrsm-license-server

# File logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Metrics

The server exposes metrics for monitoring tools like Prometheus.

## Support

For issues:
1. Check logs in `logs/` directory
2. Verify health endpoints
3. Review this troubleshooting guide
4. Contact development team

---

**Ready to start?** Run `npm start` and check `http://localhost:4000/health`!