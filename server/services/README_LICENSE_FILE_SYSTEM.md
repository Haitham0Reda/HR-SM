# On-Premise License File System

This document describes the On-Premise license file system for the HRMS application.

## Overview

The license file system enables On-Premise deployments to manage module licensing through a local license file instead of a database. It provides:

- **License File Loading**: Automatic loading and validation of license files
- **Digital Signature Verification**: Ensures license files haven't been tampered with
- **Hot-Reload**: Automatically reloads license when the file changes
- **Grace Period Fallback**: Uses cached license for 24 hours if file becomes unavailable
- **Module Control**: Enables/disables modules based on license configuration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  License File Loader                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   File       │  │   Signature  │  │   Cache      │  │
│  │   Watcher    │  │   Verifier   │  │   Manager    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              License Validator Service                   │
│         (Routes to File or Database based on mode)       │
└─────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Deployment mode
DEPLOYMENT_MODE=on-premise  # or 'saas'

# License file path (optional, defaults to ./config/license.json)
LICENSE_FILE_PATH=/path/to/license.json

# Secret key for signature verification (REQUIRED)
LICENSE_SECRET_KEY=your-secret-key-here
```

### License File Format

License files are JSON documents with the following structure:

```json
{
  "licenseKey": "HRMS-XXXX-XXXX-XXXX",
  "companyId": "company-123",
  "companyName": "Acme Corporation",
  "issuedAt": "2025-01-01",
  "expiresAt": "2026-01-01",
  "modules": {
    "hr-core": {
      "enabled": true,
      "tier": "enterprise",
      "limits": {}
    },
    "attendance": {
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200,
        "devices": 10,
        "storage": 10737418240,
        "apiCalls": 50000
      }
    }
  },
  "signature": "digital-signature-hash",
  "metadata": {
    "contactEmail": "admin@acme.com",
    "supportLevel": "premium",
    "notes": "Annual enterprise license"
  }
}
```

## Generating License Files

### Using the CLI Tool

```bash
# Generate a trial license (30 days, all modules)
node server/scripts/generateLicenseFile.js \
  --type trial \
  --company "Acme Corp" \
  --id "acme-123" \
  --output ./config/license.json

# Generate an enterprise license (1 year, unlimited)
node server/scripts/generateLicenseFile.js \
  --type enterprise \
  --company "Big Corp" \
  --id "big-456" \
  --days 365 \
  --output ./config/license.json

# Generate a custom license
node server/scripts/generateLicenseFile.js \
  --type custom \
  --company "Custom Corp" \
  --id "custom-789" \
  --days 180 \
  --modules "attendance,leave,payroll" \
  --tier business \
  --output ./config/license.json
```

### Using the API

```javascript
import {
  generateTrialLicense,
  generateEnterpriseLicense,
  generateLicenseFile,
  saveLicenseFile,
} from "./utils/licenseFileGenerator.js";

// Generate a trial license
const trialLicense = generateTrialLicense(
  "company-123",
  "Acme Corp",
  "your-secret-key"
);

// Save to file
saveLicenseFile(trialLicense, "./config/license.json");

// Generate a custom license
const customLicense = generateLicenseFile(
  {
    companyId: "company-456",
    companyName: "Custom Corp",
    validityDays: 365,
    modules: {
      "hr-core": { enabled: true, tier: "enterprise", limits: {} },
      attendance: {
        enabled: true,
        tier: "business",
        limits: { employees: 200, devices: 10 },
      },
    },
  },
  "your-secret-key"
);
```

## Features

### 1. Automatic Loading

The license file is automatically loaded when the server starts in On-Premise mode:

```javascript
// In server/index.js
if (process.env.DEPLOYMENT_MODE === "on-premise") {
  await licenseFileLoader.initialize();
}
```

### 2. Hot-Reload

The system watches the license file for changes and automatically reloads:

```javascript
// Changes to license.json are detected and reloaded automatically
// No server restart required
```

### 3. Signature Verification

All license files must have a valid digital signature:

```javascript
import { verifyLicenseSignature } from "./config/licenseFileSchema.js";

const isValid = verifyLicenseSignature(licenseData, secretKey);
```

### 4. Grace Period Fallback

If the license file becomes unavailable, the system uses a cached copy for 24 hours:

```javascript
// If license file is deleted or corrupted
// System continues using cached license for 24 hours
// Allows time to fix issues without service disruption
```

### 5. Module Control

Modules are enabled/disabled based on the license file:

```javascript
// Check if module is enabled
const isEnabled = licenseFileLoader.isModuleEnabled("attendance");

// Get module license details
const moduleLicense = licenseFileLoader.getModuleLicense("attendance");
```

## API Reference

### LicenseFileLoader

#### Methods

- `initialize()` - Initialize the loader and load license file
- `loadLicenseFile()` - Manually reload the license file
- `getLicense()` - Get current license data (with fallback to cache)
- `isModuleEnabled(moduleKey)` - Check if a module is enabled
- `getModuleLicense(moduleKey)` - Get module license details
- `getEnabledModules()` - Get array of enabled module keys
- `isLicenseExpired()` - Check if license is expired
- `getDaysUntilExpiration()` - Get days until expiration
- `getStatus()` - Get loader status information
- `reload()` - Manually reload license file
- `shutdown()` - Stop file watcher and cleanup

### License File Generator

#### Functions

- `generateLicenseFile(params, secretKey)` - Generate a license file
- `generateLicenseKey()` - Generate a random license key
- `saveLicenseFile(licenseData, outputPath)` - Save license to disk
- `generateTrialLicense(companyId, companyName, secretKey)` - Generate trial license
- `generateEnterpriseLicense(companyId, companyName, secretKey)` - Generate enterprise license
- `extendLicense(existingLicense, additionalDays, secretKey)` - Extend expiration
- `enableModule(existingLicense, moduleKey, tier, limits, secretKey)` - Enable a module
- `disableModule(existingLicense, moduleKey, secretKey)` - Disable a module

## Security Considerations

### Secret Key Management

- **Never commit the secret key to version control**
- Store the secret key in environment variables
- Use different keys for development and production
- Rotate keys periodically

### File Permissions

License files are automatically set to restrictive permissions (600 - owner read/write only):

```bash
chmod 600 config/license.json
```

### Signature Verification

All license files must have a valid signature. Tampering with the file will invalidate the signature and disable all modules except Core HR.

## Troubleshooting

### License File Not Found

```
Error: License file not found at /path/to/license.json
```

**Solution**: Create a license file using the generator tool or place a valid license file at the specified path.

### Invalid Signature

```
Error: Invalid license signature
```

**Solution**: Ensure the LICENSE_SECRET_KEY environment variable matches the key used to generate the license file.

### License Expired

```
Warning: License file is expired
```

**Solution**: Generate a new license file with an extended expiration date or contact your license provider.

### Module Not Enabled

```
Error: Module not included in license file
```

**Solution**: Update the license file to enable the required module or upgrade your license.

## Monitoring

### Check License Status

```javascript
const status = licenseFileLoader.getStatus();
console.log(status);
```

Output:

```json
{
  "isOnPremiseMode": true,
  "licenseFilePath": "/path/to/license.json",
  "hasCurrentLicense": true,
  "isLicenseExpired": false,
  "daysUntilExpiration": 180,
  "loadAttempts": 1,
  "lastLoadError": null,
  "fileWatcherActive": true,
  "cacheStatus": {
    "hasCachedLicense": true,
    "cacheAge": 3600000,
    "canUseCached": true,
    "remainingGracePeriod": 82800000
  },
  "enabledModules": ["hr-core", "attendance", "leave"]
}
```

### Logs

The license file loader logs important events:

- License file loaded successfully
- License file validation failed
- License file change detected
- Hot-reload successful/failed
- Using cached license during grace period

## Best Practices

1. **Backup License Files**: Keep backups of license files in a secure location
2. **Monitor Expiration**: Set up alerts for licenses expiring within 30 days
3. **Test Hot-Reload**: Verify hot-reload works before relying on it in production
4. **Secure Secret Keys**: Use strong, unique secret keys and store them securely
5. **Regular Updates**: Keep license files up to date with current module requirements
6. **Audit Logging**: Monitor license validation logs for suspicious activity

## Migration from SaaS to On-Premise

To migrate from SaaS mode to On-Premise mode:

1. Generate a license file matching the current subscription
2. Set `DEPLOYMENT_MODE=on-premise` in environment variables
3. Set `LICENSE_FILE_PATH` and `LICENSE_SECRET_KEY`
4. Restart the server
5. Verify all modules are accessible

## Support

For issues with the license file system:

1. Check the server logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure the license file has valid JSON syntax
4. Verify the signature using the correct secret key
5. Check file permissions on the license file

For license generation or renewal, contact your license provider.
