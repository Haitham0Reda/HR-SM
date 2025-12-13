# HRMS Deployment Guide

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [SaaS Deployment](#saas-deployment)
3. [On-Premise Deployment](#on-premise-deployment)
4. [License Management](#license-management)
5. [Module Configuration](#module-configuration)
6. [Production Checklist](#production-checklist)

---

## Environment Setup

### Prerequisites

- Node.js 18+ and npm
- MongoDB 6.0+
- 2GB RAM minimum (4GB recommended)
- 10GB disk space

### Environment Variables

Create `.env` file in root directory:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/hrms

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Deployment Mode
DEPLOYMENT_MODE=saas
# Options: saas | on-premise

# File Upload
MAX_FILE_SIZE=10485760
# 10MB in bytes

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# License Validation (for on-premise)
LICENSE_PUBLIC_KEY=your-public-key-for-signature-verification
```

---

## SaaS Deployment

### 1. Install Dependencies

```bash
npm install
cd client && npm install
```

### 2. Build Client

```bash
cd client
npm run build
```

### 3. Configure MongoDB

Ensure MongoDB is running and accessible:

```bash
mongosh
use hrms
db.createUser({
  user: "hrms_user",
  pwd: "secure_password",
  roles: [{ role: "readWrite", db: "hrms" }]
})
```

### 4. Start Server

```bash
npm start
```

### 5. Create First Tenant

```bash
curl -X POST http://localhost:5000/api/v1/hr-core/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company1.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "Admin",
    "tenantId": "company1",
    "companyName": "Company One Inc"
  }'
```

### 6. Enable Modules for Tenant

```bash
# Login first to get token
TOKEN="your-jwt-token"

# Enable tasks module
curl -X POST http://localhost:5000/api/v1/hr-core/tenant/modules/tasks/enable \
  -H "Authorization: Bearer $TOKEN"
```

### Multi-Tenant Considerations

**Database Strategy:**

- Single database with `tenantId` field (current implementation)
- Scales to ~1000 tenants
- For larger scale, consider database-per-tenant

**Tenant Isolation:**

- All queries automatically filtered by `tenantId`
- Middleware enforces tenant context
- No cross-tenant data leakage

**Subscription Management:**

```javascript
// Update tenant subscription
await TenantConfig.findOneAndUpdate(
  { tenantId: "company1" },
  {
    "subscription.plan": "professional",
    "subscription.maxEmployees": 500,
    "subscription.endDate": new Date("2025-12-31"),
  }
);
```

---

## On-Premise Deployment

### 1. Generate License File

Create a license generation script:

```javascript
// scripts/generateLicense.js
import crypto from "crypto";
import fs from "fs";

const generateLicense = (config) => {
  const license = {
    licenseKey: crypto.randomBytes(32).toString("hex"),
    companyName: config.companyName,
    maxEmployees: config.maxEmployees,
    enabledModules: config.enabledModules,
    issuedAt: new Date(),
    expiresAt: new Date(config.expiryDate),
  };

  // Sign license with private key
  const sign = crypto.createSign("SHA256");
  sign.update(JSON.stringify(license));
  license.signature = sign.sign(privateKey, "hex");

  return license;
};

const license = generateLicense({
  companyName: "Acme Corporation",
  maxEmployees: 500,
  enabledModules: ["hr-core", "attendance", "tasks", "leave"],
  expiryDate: "2025-12-31",
});

fs.writeFileSync("license.json", JSON.stringify(license, null, 2));
console.log("License generated successfully!");
```

### 2. Install on Client Server

```bash
# Copy application files
scp -r hrms-package user@client-server:/opt/hrms

# SSH into server
ssh user@client-server

# Navigate to directory
cd /opt/hrms

# Install dependencies
npm install --production

# Copy license file
cp /path/to/license.json ./license.json
```

### 3. Configure for On-Premise

Update `.env`:

```env
DEPLOYMENT_MODE=on-premise
LICENSE_FILE_PATH=./license.json
```

### 4. Initialize Tenant

```javascript
// scripts/initOnPremise.js
import TenantConfig from "./server/modules/hr-core/models/TenantConfig.js";
import fs from "fs";

const license = JSON.parse(fs.readFileSync("./license.json", "utf8"));

const tenant = await TenantConfig.create({
  tenantId: "on-premise",
  companyName: license.companyName,
  deploymentMode: "on-premise",
  license: {
    key: license.licenseKey,
    signature: license.signature,
    issuedAt: license.issuedAt,
    expiresAt: license.expiresAt,
    maxEmployees: license.maxEmployees,
    enabledModules: license.enabledModules,
  },
});

// Enable licensed modules
license.enabledModules.forEach((module) => {
  tenant.enableModule(module);
});

await tenant.save();
console.log("On-premise tenant initialized!");
```

### 5. Run as Service

Create systemd service file `/etc/systemd/system/hrms.service`:

```ini
[Unit]
Description=HRMS Application
After=network.target mongodb.service

[Service]
Type=simple
User=hrms
WorkingDirectory=/opt/hrms
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable hrms
sudo systemctl start hrms
sudo systemctl status hrms
```

---

## License Management

### License Validation Flow

```javascript
// Automatic validation on startup and login
const validateLicense = (tenant) => {
  if (tenant.deploymentMode !== "on-premise") return true;

  // Check expiry
  if (new Date() > tenant.license.expiresAt) {
    throw new Error("License expired");
  }

  // Verify signature
  const verify = crypto.createVerify("SHA256");
  verify.update(
    JSON.stringify({
      licenseKey: tenant.license.key,
      companyName: tenant.companyName,
      maxEmployees: tenant.license.maxEmployees,
      enabledModules: tenant.license.enabledModules,
      issuedAt: tenant.license.issuedAt,
      expiresAt: tenant.license.expiresAt,
    })
  );

  if (!verify.verify(publicKey, tenant.license.signature, "hex")) {
    throw new Error("Invalid license signature");
  }

  return true;
};
```

### License Renewal

```bash
# Generate new license with extended expiry
node scripts/generateLicense.js --renew --license-key=EXISTING_KEY

# Update on client server
scp license.json user@client-server:/opt/hrms/license.json

# Restart service
ssh user@client-server 'sudo systemctl restart hrms'
```

---

## Module Configuration

### Enable/Disable Modules via API

```javascript
// Enable module
POST / api / v1 / hr - core / tenant / modules / tasks / enable;

// Disable module
POST / api / v1 / hr - core / tenant / modules / tasks / disable;

// Get enabled modules
GET / api / v1 / hr - core / tenant / modules;
```

### Module Dependencies

Modules have dependencies that must be enabled:

```javascript
{
  'payroll': ['hr-core', 'attendance'],  // Payroll requires attendance
  'reporting': ['hr-core']                // Reporting requires hr-core
}
```

System automatically validates dependencies when enabling modules.

---

## Production Checklist

### Security

- [ ] Change JWT_SECRET to strong random value
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall (allow only 443, 22)
- [ ] Set up MongoDB authentication
- [ ] Enable MongoDB encryption at rest
- [ ] Configure rate limiting
- [ ] Set up CORS properly
- [ ] Disable MongoDB remote access (bind to localhost)
- [ ] Regular security updates

### Performance

- [ ] Enable MongoDB indexes
- [ ] Configure connection pooling
- [ ] Set up Redis for caching (optional)
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Set up load balancer (for high traffic)

### Monitoring

- [ ] Set up application logging
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Monitor server resources
- [ ] Set up uptime monitoring
- [ ] Configure backup alerts
- [ ] Database performance monitoring

### Backup

- [ ] Automated daily MongoDB backups
- [ ] Backup uploaded files
- [ ] Test restore procedures
- [ ] Off-site backup storage
- [ ] Backup retention policy (30 days)

### Documentation

- [ ] Document deployment process
- [ ] Create admin user guide
- [ ] Document backup/restore procedures
- [ ] Create troubleshooting guide
- [ ] Document API endpoints

---

## Scaling Strategies

### Horizontal Scaling (SaaS)

1. **Load Balancer Setup**

```nginx
upstream hrms_backend {
    server 10.0.1.10:5000;
    server 10.0.1.11:5000;
    server 10.0.1.12:5000;
}

server {
    listen 443 ssl;
    server_name hrms.example.com;

    location / {
        proxy_pass http://hrms_backend;
    }
}
```

2. **Session Management**

- Use JWT (stateless) - already implemented
- No server-side session storage needed

3. **File Storage**

- Move to S3/cloud storage
- Update file upload paths

### Database Scaling

1. **MongoDB Replica Set**

```javascript
mongoose.connect("mongodb://host1,host2,host3/hrms?replicaSet=rs0");
```

2. **Sharding by tenantId**

```javascript
sh.shardCollection("hrms.users", { tenantId: 1, _id: 1 });
```

---

## Troubleshooting

### Common Issues

**License Validation Failed**

```bash
# Check license file
cat license.json

# Verify expiry date
node -e "console.log(new Date(require('./license.json').expiresAt))"

# Check server time
date
```

**Module Not Loading**

```bash
# Check module cache
# Restart server to clear cache
sudo systemctl restart hrms

# Check logs
journalctl -u hrms -f
```

**Database Connection Failed**

```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017/hrms

# Check MongoDB status
sudo systemctl status mongodb
```

---

## Support

For deployment assistance:

- Email: support@hrms.example.com
- Documentation: https://docs.hrms.example.com
- Community: https://community.hrms.example.com
