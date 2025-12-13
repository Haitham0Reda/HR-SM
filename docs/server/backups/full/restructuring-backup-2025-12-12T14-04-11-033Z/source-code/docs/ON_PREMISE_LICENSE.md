# On-Premise License Guide

## Overview

This guide provides detailed instructions for managing licenses in On-Premise deployments of the Modular HRMS system. On-Premise licenses use file-based licensing with offline validation, digital signatures, and hot-reload capabilities.

## Table of Contents

1. [Understanding On-Premise Licensing](#understanding-on-premise-licensing)
2. [Installation](#installation)
3. [License File Format](#license-file-format)
4. [Configuration](#configuration)
5. [Validation and Security](#validation-and-security)
6. [Updates and Renewals](#updates-and-renewals)
7. [Troubleshooting](#troubleshooting)
8. [Migration from SaaS](#migration-from-saas)

## Understanding On-Premise Licensing

### Key Differences from SaaS

| Feature | On-Premise | SaaS |
|---------|------------|------|
| Storage | JSON file | Database |
| Validation | Offline | Online |
| Updates | Manual file replacement | Automatic |
| Renewal | New license file | Subscription renewal |
| Grace Period | 24 hours (cached) | None |
| Hot-Reload | Yes | N/A |

### Benefits of On-Premise Licensing

1. **Offline Operation**: No internet connectivity required for validation
2. **Data Sovereignty**: All license data stays on-premise
3. **Predictable Costs**: One-time purchase model
4. **Full Control**: Complete control over license management
5. **Security**: No external license server communication

### License File Lifecycle

```
┌─────────────────┐
│  Vendor Issues  │
│  License File   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Customer      │
│   Receives      │
│   license.json  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Install to    │
│   config/       │
│   directory     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   System Auto-  │
│   Validates &   │
│   Loads         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Modules       │
│   Enabled       │
└─────────────────┘
```

## Installation

### Prerequisites

- Modular HRMS system installed
- Access to server filesystem
- Root or administrator privileges
- License file from vendor

### Step-by-Step Installation

#### 1. Locate Configuration Directory

```bash
cd /path/to/hrms/server/config
```

Default locations:
- Linux: `/opt/hrms/server/config`
- Windows: `C:\Program Files\HRMS\server\config`
- Docker: `/app/server/config`

#### 2. Backup Existing License (if any)

```bash
# Create backup
cp license.json license.json.backup.$(date +%Y%m%d)

# Or move to backup directory
mv license.json ../backups/license.json.$(date +%Y%m%d)
```

#### 3. Install New License File

```bash
# Copy license file
cp /path/to/new/license.json ./license.json

# Set proper ownership
chown hrms:hrms license.json

# Set restrictive permissions (read-only for owner)
chmod 600 license.json
```

**Windows:**
```powershell
# Copy license file
Copy-Item "C:\path\to\license.json" -Destination ".\license.json"

# Set permissions (remove inheritance, grant read to SYSTEM and Administrators)
icacls license.json /inheritance:r
icacls license.json /grant:r "SYSTEM:(R)"
icacls license.json /grant:r "Administrators:(R)"
```

#### 4. Verify Installation

```bash
# Check file exists and has correct permissions
ls -la license.json

# Expected output:
# -rw------- 1 hrms hrms 2048 Dec 09 10:00 license.json
```

#### 5. Validate License

The system automatically validates the license on startup and every 60 seconds. Check logs:

```bash
# View recent logs
tail -f ../logs/application.log | grep -i license

# Expected output:
# [INFO] License file loaded successfully
# [INFO] License validated: expires 2026-01-01
# [INFO] Enabled modules: attendance, leave, payroll
```

#### 6. Verify Module Activation

**Via UI:**
1. Log in as administrator
2. Navigate to Settings → License Status
3. Verify all purchased modules show as "Active"

**Via API:**
```bash
curl -X GET http://localhost:5000/api/v1/licenses/system \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## License File Format

### Complete Example

```json
{
  "licenseKey": "HRMS-2025-ACME-1234-5678",
  "companyId": "acme-corp-001",
  "companyName": "Acme Corporation",
  "contactEmail": "admin@acmecorp.com",
  "issuedAt": "2025-01-01T00:00:00Z",
  "expiresAt": "2026-01-01T00:00:00Z",
  "licenseType": "on-premise",
  "version": "1.0",
  "modules": {
    "attendance": {
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200,
        "devices": 10,
        "storage": 10737418240,
        "apiCalls": 50000
      },
      "features": {
        "biometricDevices": true,
        "geoFencing": true,
        "aiAnomalyDetection": false
      }
    },
    "leave": {
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200,
        "workflows": 10
      },
      "features": {
        "advancedApprovals": true,
        "carryOverRules": true
      }
    },
    "payroll": {
      "enabled": true,
      "tier": "enterprise",
      "limits": {
        "employees": 200,
        "payrollRuns": "unlimited"
      },
      "features": {
        "multiCurrency": true,
        "taxCalculation": true,
        "directDeposit": true
      }
    },
    "documents": {
      "enabled": true,
      "tier": "starter",
      "limits": {
        "employees": 200,
        "storage": 5368709120,
        "templates": 20
      }
    },
    "communication": {
      "enabled": false,
      "tier": "business",
      "limits": {}
    },
    "reporting": {
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200,
        "customReports": 50,
        "scheduledReports": 20
      }
    },
    "tasks": {
      "enabled": false,
      "tier": "starter",
      "limits": {}
    }
  },
  "globalLimits": {
    "maxEmployees": 200,
    "maxStorage": 53687091200,
    "maxApiCallsPerDay": 100000
  },
  "restrictions": {
    "allowedIpRanges": ["192.168.1.0/24", "10.0.0.0/8"],
    "maxConcurrentUsers": 50,
    "allowExternalAccess": false
  },
  "support": {
    "level": "business",
    "expiresAt": "2026-01-01T00:00:00Z",
    "contactEmail": "support@vendor.com",
    "phone": "+1-555-0123"
  },
  "signature": "SHA256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

### Field Descriptions

#### Root Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `licenseKey` | String | Yes | Unique license identifier |
| `companyId` | String | Yes | Customer company identifier |
| `companyName` | String | Yes | Customer company name |
| `contactEmail` | String | No | Primary contact email |
| `issuedAt` | ISO 8601 | Yes | License issue date |
| `expiresAt` | ISO 8601 | Yes | License expiration date |
| `licenseType` | String | Yes | Must be "on-premise" |
| `version` | String | Yes | License format version |
| `signature` | String | Yes | Digital signature for validation |

#### Module Configuration

Each module in the `modules` object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | Boolean | Yes | Whether module is active |
| `tier` | String | Yes | Pricing tier: starter, business, enterprise |
| `limits` | Object | Yes | Usage limits for this module |
| `features` | Object | No | Feature flags within module |

#### Common Limit Types

| Limit | Type | Description |
|-------|------|-------------|
| `employees` | Number | Maximum number of employees |
| `storage` | Number | Storage limit in bytes |
| `apiCalls` | Number | API calls per month |
| `devices` | Number | Connected devices (attendance) |
| `workflows` | Number | Custom workflows |
| `templates` | Number | Document templates |
| `customReports` | Number | Custom report definitions |

**Special Values:**
- `"unlimited"`: No limit enforced
- `0`: Feature disabled
- Omitted: Uses default limit

#### Global Limits

System-wide restrictions that apply across all modules:

```json
"globalLimits": {
  "maxEmployees": 200,        // Total employees across system
  "maxStorage": 53687091200,  // Total storage (50GB)
  "maxApiCallsPerDay": 100000 // Daily API call limit
}
```

#### Restrictions

Optional security and access restrictions:

```json
"restrictions": {
  "allowedIpRanges": ["192.168.1.0/24"],  // IP whitelist
  "maxConcurrentUsers": 50,                // Concurrent sessions
  "allowExternalAccess": false             // Internet access allowed
}
```

#### Support Information

Support contract details:

```json
"support": {
  "level": "business",                    // Support tier
  "expiresAt": "2026-01-01T00:00:00Z",   // Support expiration
  "contactEmail": "support@vendor.com",   // Support contact
  "phone": "+1-555-0123"                  // Support phone
}
```

## Configuration

### Environment Variables

Configure On-Premise licensing behavior:

```bash
# .env file
LICENSE_MODE=on-premise
LICENSE_FILE_PATH=./server/config/license.json
LICENSE_VALIDATION_INTERVAL=60000  # milliseconds
LICENSE_CACHE_DURATION=86400000    # 24 hours in milliseconds
LICENSE_STRICT_MODE=true           # Fail if license invalid
```

### System Configuration

**config/index.js:**

```javascript
module.exports = {
  license: {
    mode: process.env.LICENSE_MODE || 'on-premise',
    filePath: process.env.LICENSE_FILE_PATH || './server/config/license.json',
    validationInterval: parseInt(process.env.LICENSE_VALIDATION_INTERVAL) || 60000,
    cacheDuration: parseInt(process.env.LICENSE_CACHE_DURATION) || 86400000,
    strictMode: process.env.LICENSE_STRICT_MODE === 'true',
    gracePeriod: 24 * 60 * 60 * 1000, // 24 hours
  }
};
```

### File Watching

The system automatically watches for license file changes:

```javascript
// Automatic hot-reload enabled by default
// No configuration needed

// To disable hot-reload (requires restart for updates):
LICENSE_HOT_RELOAD=false
```

## Validation and Security

### Digital Signature Verification

Every license file includes a digital signature that the system validates:

#### How Signatures Work

1. **Vendor Side:**
   - Vendor creates license JSON
   - Computes SHA-256 hash of license content
   - Signs hash with private key
   - Includes signature in license file

2. **System Side:**
   - Reads license file
   - Extracts signature
   - Computes hash of license content
   - Verifies signature using vendor's public key
   - Rejects license if signature invalid

#### Public Key Configuration

The vendor's public key must be installed:

```bash
# Copy public key to config directory
cp vendor-public-key.pem server/config/license-public-key.pem

# Set permissions
chmod 644 server/config/license-public-key.pem
```

**Environment variable:**
```bash
LICENSE_PUBLIC_KEY_PATH=./server/config/license-public-key.pem
```

### Validation Checks

The system performs these validations:

1. **File Format**: Valid JSON structure
2. **Required Fields**: All mandatory fields present
3. **Digital Signature**: Cryptographic verification
4. **Expiration Date**: Not expired
5. **Module Definitions**: Valid module keys
6. **Limit Values**: Positive numbers or "unlimited"
7. **Date Formats**: Valid ISO 8601 dates

### Security Best Practices

#### 1. File Permissions

```bash
# Restrictive permissions
chmod 600 license.json
chown hrms:hrms license.json

# Verify
ls -la license.json
# Should show: -rw------- 1 hrms hrms
```

#### 2. Backup Security

```bash
# Encrypt backups
gpg --encrypt --recipient admin@company.com license.json

# Store encrypted backup
mv license.json.gpg /secure/backup/location/
```

#### 3. Access Control

- Limit filesystem access to license file
- Use separate service account for HRMS
- Enable audit logging for file access
- Implement change detection

#### 4. Network Security

If using IP restrictions:

```json
"restrictions": {
  "allowedIpRanges": [
    "192.168.1.0/24",  // Internal network
    "10.0.0.0/8"       // VPN range
  ],
  "allowExternalAccess": false
}
```

#### 5. Monitoring

```bash
# Monitor license file changes
auditctl -w /opt/hrms/server/config/license.json -p wa -k license_changes

# View audit logs
ausearch -k license_changes
```

## Updates and Renewals

### Updating License File

#### Scenario 1: Adding a New Module

1. **Request Update:**
   - Contact vendor
   - Specify new module and tier
   - Receive updated license file

2. **Install Update:**
   ```bash
   # Backup current license
   cp license.json license.json.backup
   
   # Install new license
   cp new-license.json license.json
   
   # System auto-reloads within 60 seconds
   ```

3. **Verify:**
   ```bash
   # Check logs
   tail -f logs/application.log | grep "license"
   
   # Expected: "License reloaded successfully"
   ```

#### Scenario 2: Increasing Limits

1. **Request Update:**
   - Contact vendor
   - Specify new limits
   - Receive updated license

2. **Install Update:**
   ```bash
   cp updated-license.json license.json
   ```

3. **Verify:**
   - Check Settings → License Status
   - Confirm new limits displayed

#### Scenario 3: Extending Expiration

1. **Request Renewal:**
   - Contact vendor 30 days before expiration
   - Receive renewed license file

2. **Install Renewal:**
   ```bash
   cp renewed-license.json license.json
   ```

3. **Verify:**
   - Check new expiration date
   - Confirm no service interruption

### Renewal Process

#### Timeline

- **90 days before**: Plan renewal, budget approval
- **30 days before**: Contact vendor, request renewal
- **7 days before**: Receive and test new license
- **1 day before**: Install new license
- **Expiration day**: Verify renewal successful

#### Renewal Checklist

- [ ] Review current usage and needs
- [ ] Determine if module changes needed
- [ ] Contact vendor for renewal quote
- [ ] Approve budget and purchase order
- [ ] Receive new license file
- [ ] Test license file in staging environment
- [ ] Schedule installation window
- [ ] Backup current license
- [ ] Install new license
- [ ] Verify all modules active
- [ ] Document renewal in records

### Grace Period

If license expires before renewal installed:

1. **24-Hour Grace Period:**
   - System uses cached license
   - All modules remain functional
   - Warning messages displayed
   - Audit logs record grace period usage

2. **After Grace Period:**
   - All modules except Core HR disabled
   - Users see expiration messages
   - Data preserved
   - Must install valid license to restore

## Troubleshooting

### Common Issues

#### Issue: License File Not Found

**Symptoms:**
- All modules disabled except Core HR
- Log message: "License file not found"

**Solution:**
```bash
# Check file exists
ls -la server/config/license.json

# If missing, install license file
cp /path/to/license.json server/config/license.json
chmod 600 server/config/license.json
```

#### Issue: Invalid Signature

**Symptoms:**
- License rejected
- Log message: "License signature validation failed"

**Solution:**
```bash
# Verify public key installed
ls -la server/config/license-public-key.pem

# If missing, install public key
cp vendor-public-key.pem server/config/license-public-key.pem

# Verify license file not corrupted
md5sum license.json
# Compare with vendor-provided checksum
```

#### Issue: License Expired

**Symptoms:**
- Modules disabled
- UI shows expiration message
- Log message: "License expired"

**Solution:**
```bash
# Check expiration date
grep expiresAt server/config/license.json

# Install renewed license
cp renewed-license.json server/config/license.json
```

#### Issue: Hot-Reload Not Working

**Symptoms:**
- Updated license not taking effect
- Old limits still enforced

**Solution:**
```bash
# Check file watcher
grep "file.*watch" logs/application.log

# Manual reload
kill -HUP $(cat server/hrms.pid)

# Or restart service
systemctl restart hrms
```

#### Issue: Module Not Enabled

**Symptoms:**
- Module shows as disabled
- License file shows enabled: true

**Solution:**
```bash
# Verify module key spelling
grep -A 5 "moduleName" server/config/license.json

# Check for dependency issues
# Example: payroll requires attendance
# Ensure all dependencies enabled

# Verify no validation errors
grep -i "validation.*failed" logs/application.log
```

### Diagnostic Commands

```bash
# View license details
cat server/config/license.json | jq .

# Check license validation
grep "license.*validat" logs/application.log | tail -20

# View enabled modules
grep "module.*enabled" logs/application.log | tail -20

# Check for errors
grep -i "error.*license" logs/error.log | tail -20

# Monitor real-time
tail -f logs/application.log | grep -i license
```

### Getting Support

If issues persist:

1. **Collect Information:**
   ```bash
   # System info
   uname -a
   node --version
   
   # License info (redact sensitive data)
   cat license.json | jq 'del(.signature)'
   
   # Recent logs
   tail -100 logs/application.log > license-debug.log
   ```

2. **Contact Support:**
   - Email: support@vendor.com
   - Include: System info, redacted license, logs
   - Reference: License key from license file

## Migration from SaaS

### Converting SaaS to On-Premise

#### 1. Export SaaS Configuration

```bash
# Export current license configuration
curl -X GET https://saas.hrms.com/api/v1/licenses/:tenantId \
  -H "Authorization: Bearer TOKEN" \
  > saas-license.json
```

#### 2. Request On-Premise License

Contact vendor with:
- Current SaaS configuration
- Desired modules and tiers
- Employee count
- Expiration date preference

#### 3. Receive and Install License

```bash
# Install On-Premise license
cp on-premise-license.json server/config/license.json
chmod 600 server/config/license.json
```

#### 4. Update Configuration

```bash
# Update .env
LICENSE_MODE=on-premise
LICENSE_FILE_PATH=./server/config/license.json

# Restart system
systemctl restart hrms
```

#### 5. Verify Migration

- Check all modules enabled
- Verify limits match SaaS configuration
- Test module functionality
- Confirm data intact

### Data Considerations

- All data is preserved during migration
- No data export/import needed
- License change only affects access control
- Usage history maintained

## Appendix

### License File Schema

JSON Schema for validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["licenseKey", "companyId", "issuedAt", "expiresAt", "modules", "signature"],
  "properties": {
    "licenseKey": { "type": "string", "pattern": "^HRMS-" },
    "companyId": { "type": "string" },
    "companyName": { "type": "string" },
    "issuedAt": { "type": "string", "format": "date-time" },
    "expiresAt": { "type": "string", "format": "date-time" },
    "modules": {
      "type": "object",
      "patternProperties": {
        "^[a-z-]+$": {
          "type": "object",
          "required": ["enabled", "tier"],
          "properties": {
            "enabled": { "type": "boolean" },
            "tier": { "enum": ["starter", "business", "enterprise"] },
            "limits": { "type": "object" },
            "features": { "type": "object" }
          }
        }
      }
    },
    "signature": { "type": "string" }
  }
}
```

### Sample Licenses

See `server/config/license.example.json` for sample license files.

### Related Documentation

- [LICENSE_MANAGEMENT.md](LICENSE_MANAGEMENT.md) - General license management
- [LICENSE_TROUBLESHOOTING.md](LICENSE_TROUBLESHOOTING.md) - Troubleshooting guide
- [LICENSE_API.md](LICENSE_API.md) - API reference
