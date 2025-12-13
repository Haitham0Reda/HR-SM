# Multi-Tenant Database Setup Guide

This guide explains how to set up and manage separate databases for each company in the HR-SM system.

## Overview

The multi-tenant system creates:
- **Separate database** for each company (e.g., `hrsm_company_name`)
- **Backup directory** for each company (`backups/company_name/`)
- **Upload directory** for each company (`uploads/company_name/`)

## Quick Start

### 1. Create a New Company Database

```bash
# Create a company database
npm run create-company -- --name "Acme Corporation" --admin-email admin@acme.com

# With additional details
npm run create-company -- --name "Tech Solutions Ltd" --admin-email admin@techsolutions.com --phone "+1-555-0123" --address "123 Tech Street, Silicon Valley"
```

### 2. List All Companies

```bash
# View all company databases and their status
npm run list-companies
```

### 3. Backup Company Data

```bash
# Backup specific company
npm run backup-company -- --name "acme_corporation"

# Backup all companies
npm run backup-all-companies
```

## Directory Structure

After creating companies, your directory structure will look like:

```
project-root/
├── backups/
│   ├── acme_corporation/
│   │   ├── hrsm_acme_corporation_backup_2024-12-13T10-30-00-000Z.gz
│   │   └── hrsm_acme_corporation_backup_2024-12-13T10-30-00-000Z.json
│   └── tech_solutions_ltd/
│       ├── hrsm_tech_solutions_ltd_backup_2024-12-13T11-00-00-000Z.gz
│       └── hrsm_tech_solutions_ltd_backup_2024-12-13T11-00-00-000Z.json
├── uploads/
│   ├── acme_corporation/
│   └── tech_solutions_ltd/
└── server/
    ├── backups/
    │   ├── acme_corporation/
    │   └── tech_solutions_ltd/
    └── uploads/
        ├── acme_corporation/
        └── tech_solutions_ltd/
```

## Database Structure

Each company gets its own MongoDB database:
- **Main database**: `hrsm_db` (original/default)
- **Company databases**: `hrsm_company_name` (sanitized)

### Database Naming Rules

Company names are sanitized for database usage:
- Converted to lowercase
- Special characters replaced with underscores
- Multiple underscores collapsed to single
- Limited to 50 characters
- Leading/trailing underscores removed

Examples:
- "Acme Corporation" → `hrsm_acme_corporation`
- "Tech Solutions Ltd." → `hrsm_tech_solutions_ltd`
- "ABC-123 Company!" → `hrsm_abc_123_company`

## Using in Your Application

### 1. Add Tenant Middleware

```javascript
import { tenantMiddleware, requireCompany } from './server/middleware/tenantMiddleware.js';

// Apply to all routes that need company context
app.use('/api', tenantMiddleware);

// For routes that require a valid company
app.use('/api/employees', requireCompany);
```

### 2. Access Company Database in Routes

```javascript
import { getCompanyModel } from './server/middleware/tenantMiddleware.js';

app.get('/api/employees', async (req, res) => {
    try {
        // Get Employee model for the current company
        const Employee = getCompanyModel(req, 'Employee', employeeSchema);
        
        const employees = await Employee.find();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### 3. Company Identification Methods

The system identifies companies through:

1. **JWT Token** (recommended):
```javascript
// Include company in JWT payload
const token = jwt.sign({ 
    userId: user._id, 
    company: 'acme_corporation' 
}, process.env.JWT_SECRET);
```

2. **HTTP Header**:
```bash
curl -H "x-company-id: acme_corporation" http://localhost:5000/api/employees
```

3. **Query Parameter**:
```bash
curl http://localhost:5000/api/employees?company=acme_corporation
```

4. **Subdomain** (if configured):
```bash
curl http://acme.yourdomain.com/api/employees
```

## File Upload Handling

Update your file upload configuration to use company-specific directories:

```javascript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use company-specific upload directory
        const uploadPath = req.company?.uploadPath || 'uploads/default';
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
```

## Backup Management

### Automated Backups

Set up automated backups using cron jobs:

```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * cd /path/to/your/project && npm run backup-all-companies

# Weekly backup on Sundays at 3 AM
0 3 * * 0 cd /path/to/your/project && npm run backup-all-companies
```

### Backup Restoration

To restore a backup:

```bash
# Extract and restore using mongorestore
mongorestore --uri="mongodb+srv://user:pass@cluster/hrsm_company_name" --gzip --archive=backup_file.gz
```

## Environment Variables

Ensure your `.env` file has the correct MongoDB URI:

```env
# Use the base connection without database name
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrsm_db?retryWrites=true&w=majority

# The system will automatically create company-specific databases
```

## Security Considerations

1. **Company Isolation**: Each company's data is completely isolated in separate databases
2. **Access Control**: Implement proper authentication to ensure users can only access their company's data
3. **Backup Security**: Store backups in secure locations with proper access controls
4. **Connection Pooling**: The system manages connection pools per company database

## Monitoring

Monitor your multi-tenant setup:

```bash
# Check company status
npm run list-companies

# View logs for database connections
tail -f logs/application.log | grep "company database"
```

## Troubleshooting

### Common Issues

1. **Company not found**: Ensure the company database was created properly
2. **Connection errors**: Check MongoDB URI and network connectivity
3. **Permission errors**: Verify MongoDB user has proper permissions for database creation
4. **Backup failures**: Ensure `mongodump` is installed and accessible

### Debug Mode

Set `NODE_ENV=development` to see detailed error messages and connection logs.

## Migration from Single Tenant

If you have existing data in `hrsm_db`, you can migrate it to company-specific databases:

1. Create the new company database
2. Export data from `hrsm_db`
3. Import data to the new company database
4. Update application configuration

## Support

For issues or questions:
1. Check the logs in `logs/` directory
2. Verify company database exists with `npm run list-companies`
3. Test database connectivity
4. Review MongoDB Atlas/server logs