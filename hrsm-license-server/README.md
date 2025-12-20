# HR-SM License Server

A separate microservice for managing licenses in the HR-SM platform. This server handles license generation, validation, and enforcement using RSA-signed JWT tokens.

## 🏗️ Architecture

- **Port**: 4000 (separate from main HR-SM backend on port 5000)
- **Database**: MongoDB (`hrsm-licenses` database)
- **Security**: RSA 4096-bit key pair for JWT signing
- **Framework**: Node.js + Express.js + Mongoose

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB running on localhost:27017
- Git

### Installation

1. **Navigate to license server directory**:
   ```bash
   cd hrsm-license-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Generate RSA key pair**:
   ```bash
   npm run generate-keys
   ```

4. **Create environment file**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=4000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/hrsm-licenses
   ADMIN_API_KEY=your-secure-api-key-here
   ```

5. **Start the server**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔐 Security Configuration

### RSA Key Generation

The license server uses 4096-bit RSA keys for JWT signing:

```bash
npm run generate-keys
```

This creates:
- `keys/private.pem` - Used for signing JWT tokens (keep secure!)
- `keys/public.pem` - Used for verification (copy to HR-SM backend)

### API Authentication

All admin endpoints require API key authentication:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:4000/licenses
```

## 📡 API Endpoints

### License Management (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/licenses/create` | Create new license |
| GET | `/licenses/:licenseNumber` | Get license details |
| PATCH | `/licenses/:licenseNumber/renew` | Renew license |
| DELETE | `/licenses/:licenseNumber` | Revoke license |
| GET | `/licenses/tenant/:tenantId` | Get tenant's licenses |
| GET | `/licenses` | List all licenses (paginated) |

### License Validation (HR-SM Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/licenses/validate` | Validate license token |
| PATCH | `/licenses/:licenseNumber/usage` | Update usage stats |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed system status |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 4000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/hrsm-licenses |
| `JWT_PRIVATE_KEY_PATH` | RSA private key path | ./keys/private.pem |
| `JWT_PUBLIC_KEY_PATH` | RSA public key path | ./keys/public.pem |
| `ADMIN_API_KEY` | Admin API key | (required) |
| `ALLOWED_ORIGINS` | CORS origins | localhost URLs |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

### License Types

| Type | Description | Default Limits |
|------|-------------|----------------|
| `trial` | Trial license | 10 users, 1GB storage |
| `basic` | Basic plan | 50 users, 10GB storage |
| `professional` | Professional plan | 200 users, 50GB storage |
| `enterprise` | Enterprise plan | 1000 users, 500GB storage |
| `unlimited` | Unlimited plan | No limits |

### Supported Modules

- `hr-core` - Core HR functionality (always included)
- `tasks` - Task management
- `clinic` - Medical clinic management
- `payroll` - Payroll processing
- `reports` - Advanced reporting
- `life-insurance` - Life insurance management

## 🚀 Deployment

### PM2 (Recommended)

1. **Install PM2**:
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

3. **Monitor**:
   ```bash
   pm2 status
   pm2 logs hrsm-license-server
   pm2 monit
   ```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### Systemd Service

```ini
[Unit]
Description=HR-SM License Server
After=network.target

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

## 🔍 Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:4000/health

# Detailed health check
curl http://localhost:4000/health/detailed
```

### Logs

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/requests.log` - HTTP request logs

### Metrics

The server exposes metrics for monitoring:
- Response times
- Request counts
- Error rates
- Database connection status
- Memory usage

## 🧪 Testing

```bash
# Run tests
npm test

# Test license creation
curl -X POST http://localhost:4000/licenses/create \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "tenantName": "Test Company",
    "type": "professional",
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "modules": ["hr-core", "tasks", "life-insurance"]
  }'

# Test license validation
curl -X POST http://localhost:4000/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-jwt-token-here",
    "machineId": "test-machine-id"
  }'
```

## 🔒 Security Best Practices

1. **Keep private key secure**:
   - Never commit `keys/private.pem` to Git
   - Set proper file permissions (600)
   - Backup securely

2. **Use strong API keys**:
   - Generate cryptographically secure keys
   - Rotate keys regularly
   - Use different keys for different environments

3. **Network security**:
   - Use HTTPS in production
   - Configure firewall rules
   - Limit access to port 4000

4. **Database security**:
   - Use MongoDB authentication
   - Enable SSL/TLS for MongoDB connections
   - Regular backups

## 🚨 Troubleshooting

### Common Issues

1. **"Private key not found"**:
   ```bash
   npm run generate-keys
   ```

2. **MongoDB connection failed**:
   - Check MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity

3. **Port 4000 already in use**:
   ```bash
   # Find process using port 4000
   netstat -tulpn | grep :4000
   
   # Kill process
   kill -9 <PID>
   ```

4. **CORS errors**:
   - Check `ALLOWED_ORIGINS` in `.env`
   - Verify frontend URLs are included

### Debug Mode

```bash
LOG_LEVEL=debug npm run dev
```

## 📚 Integration with HR-SM Backend

1. **Copy public key** to HR-SM backend:
   ```bash
   cp keys/public.pem ../server/keys/license-public.pem
   ```

2. **Configure HR-SM backend** to call license server:
   ```javascript
   const LICENSE_SERVER_URL = 'http://localhost:4000';
   const LICENSE_API_KEY = 'your-api-key';
   ```

3. **Test integration**:
   - Create license via Platform Admin
   - Verify HR-SM backend can validate license
   - Check module access control works

## 📖 API Documentation

For complete API documentation with examples, see:
- [API Documentation](./docs/API.md)
- [Integration Guide](./docs/INTEGRATION.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review logs in `logs/` directory
3. Check health endpoints
4. Contact the development team

---

**⚠️ Important**: This is a critical security component. Always follow security best practices and keep the private key secure!