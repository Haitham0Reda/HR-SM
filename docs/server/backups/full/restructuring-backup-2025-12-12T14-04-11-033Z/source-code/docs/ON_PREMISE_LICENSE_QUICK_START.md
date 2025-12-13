# On-Premise License Quick Start Guide

This guide will help you get started with On-Premise licensing in 5 minutes.

## Prerequisites

- HRMS application installed
- Node.js environment configured
- Access to server configuration files

## Step 1: Set Environment Variables

Add these to your `.env` file:

```bash
# Enable On-Premise mode
DEPLOYMENT_MODE=on-premise

# License file location (default: ./config/license.json)
LICENSE_FILE_PATH=./config/license.json

# Secret key for signature verification (REQUIRED - keep secure!)
LICENSE_SECRET_KEY=your-secret-key-here-change-in-production
```

⚠️ **Important**: Use a strong, unique secret key and keep it secure!

## Step 2: Generate a License File

### Option A: Trial License (Quick Start)

Generate a 30-day trial with all modules enabled:

```bash
npm run generate-license -- \
  --type trial \
  --company "Your Company Name" \
  --id "your-company-id" \
  --key "your-secret-key-here"
```

### Option B: Enterprise License

Generate a 1-year enterprise license with unlimited usage:

```bash
npm run generate-license -- \
  --type enterprise \
  --company "Your Company Name" \
  --id "your-company-id" \
  --days 365 \
  --key "your-secret-key-here"
```

### Option C: Custom License

Generate a custom license with specific modules:

```bash
npm run generate-license -- \
  --type custom \
  --company "Your Company Name" \
  --id "your-company-id" \
  --days 180 \
  --modules "attendance,leave,payroll" \
  --tier business \
  --key "your-secret-key-here"
```

## Step 3: Verify License File

Check that the license file was created:

```bash
# Linux/Mac
ls -la config/license.json

# Windows
dir config\license.json
```

The file should exist and have restrictive permissions (600 on Linux/Mac).

## Step 4: Start the Server

```bash
npm start
```

You should see:

```
🔐 Initializing On-Premise license file loader...
✓ License file loaded: 8 modules enabled

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 HRMS Server Running                                  ║
║                                                           ║
║   Port: 5000                                              ║
║   Environment: production                                 ║
║   Mode: on-premise                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Step 5: Verify Module Access

Test that licensed modules are accessible:

```bash
# Check license status
curl http://localhost:5000/api/v1/licenses/status

# Try accessing a licensed module
curl http://localhost:5000/api/v1/attendance/records
```

## Common Tasks

### Update License File

Simply replace the license file and the system will automatically reload it:

```bash
# Generate new license
npm run generate-license -- --type enterprise --company "Your Company" --id "your-id"

# The server will detect the change and reload automatically
# No restart required!
```

### Check License Status

```bash
# View license details
cat config/license.json | jq .

# Check expiration
cat config/license.json | jq '.expiresAt'

# List enabled modules
cat config/license.json | jq '.modules | to_entries[] | select(.value.enabled) | .key'
```

### Extend License

```javascript
// In Node.js
import {
  extendLicense,
  saveLicenseFile,
} from "./server/utils/licenseFileGenerator.js";
import fs from "fs";

const currentLicense = JSON.parse(
  fs.readFileSync("./config/license.json", "utf8")
);
const extendedLicense = extendLicense(currentLicense, 90, "your-secret-key");
saveLicenseFile(extendedLicense, "./config/license.json");
```

### Enable/Disable Modules

```javascript
// Enable a module
import {
  enableModule,
  saveLicenseFile,
} from "./server/utils/licenseFileGenerator.js";
import fs from "fs";

const currentLicense = JSON.parse(
  fs.readFileSync("./config/license.json", "utf8")
);
const updatedLicense = enableModule(
  currentLicense,
  "payroll",
  "business",
  { employees: 200, apiCalls: 50000 },
  "your-secret-key"
);
saveLicenseFile(updatedLicense, "./config/license.json");
```

## Troubleshooting

### License File Not Found

**Error**: `License file not found at ./config/license.json`

**Solution**: Generate a license file using the CLI tool or place a valid license file at the specified path.

### Invalid Signature

**Error**: `Invalid license signature`

**Solution**: Ensure the `LICENSE_SECRET_KEY` environment variable matches the key used to generate the license.

### License Expired

**Warning**: `License file is expired`

**Solution**: Generate a new license with an extended expiration date:

```bash
npm run generate-license -- --type enterprise --company "Your Company" --id "your-id" --days 365
```

### Module Not Enabled

**Error**: `Module not included in license file`

**Solution**: Update the license file to enable the required module or generate a new license with the module included.

### Server Won't Start

**Check**:

1. Environment variables are set correctly
2. License file exists and is readable
3. Secret key matches the one used to generate the license
4. License file has valid JSON syntax

**Debug**:

```bash
# Test license file system
node server/scripts/testLicenseFileSystem.js

# Check server logs
npm start 2>&1 | tee server.log
```

## Security Best Practices

1. **Protect Secret Key**

   - Never commit to version control
   - Store in environment variables
   - Use different keys for dev/prod
   - Rotate periodically

2. **Secure License File**

   - Set restrictive permissions (600)
   - Store in secure location
   - Backup regularly
   - Monitor for unauthorized changes

3. **Monitor Expiration**

   - Set up alerts for licenses expiring within 30 days
   - Plan renewals in advance
   - Test renewal process before expiration

4. **Audit Access**
   - Review license validation logs regularly
   - Monitor for suspicious activity
   - Track module usage patterns

## Getting Help

### Documentation

- Full documentation: `server/services/README_LICENSE_FILE_SYSTEM.md`
- Implementation details: `server/services/IMPLEMENTATION_SUMMARY.md`

### Testing

```bash
# Run license system tests
node server/scripts/testLicenseFileSystem.js
```

### Support

For issues with the license system:

1. Check server logs for detailed error messages
2. Verify environment variables
3. Test with the test script
4. Review the full documentation

## Next Steps

- Set up license expiration monitoring
- Configure backup procedures for license files
- Plan license renewal process
- Review security best practices
- Test hot-reload functionality

---

**Need more help?** See the full documentation in `server/services/README_LICENSE_FILE_SYSTEM.md`
