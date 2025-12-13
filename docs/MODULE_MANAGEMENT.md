# Module Management System

This document describes the comprehensive module control system for managing company licenses and permissions in the HR platform.

## Overview

The module management system allows platform administrators to:
- Control which modules each company can access
- Set usage limits and tiers for each module
- Generate and manage license files
- Track usage statistics
- Bulk manage modules across multiple companies

## Architecture

### Backend Components

1. **Company Model** (`server/platform/models/Company.js`)
   - Stores company information and module configurations
   - Tracks usage statistics and subscription details
   - Manages license keys and data

2. **Module Management Service** (`server/platform/services/ModuleManagementService.js`)
   - Core business logic for module operations
   - Handles enabling/disabling modules
   - Manages usage limits and tiers

3. **Module Access Service** (`server/services/ModuleAccessService.js`)
   - Runtime access checking for HR applications
   - Caching for performance
   - Usage tracking and updates

4. **Platform Controllers** (`server/platform/controllers/ModuleController.js`)
   - REST API endpoints for platform administration
   - Handles bulk operations and statistics

### Frontend Components

1. **Platform Admin Interface** (`client/platform-admin/src/pages/ModuleManagement.jsx`)
   - Web interface for managing company modules
   - Statistics dashboard and bulk operations

2. **HR App Integration** (`client/hr-app/src/hooks/useModuleAccess.js`)
   - React hooks for checking module access
   - Components for protecting features and routes

## Available Modules

The system supports the following modules:

- **hr-core**: Essential HR functionality (always required)
- **attendance**: Time tracking and attendance management
- **leave**: Leave requests and balance tracking
- **payroll**: Salary processing and payslips
- **documents**: Document management and storage
- **reports**: Advanced reporting and analytics
- **tasks**: Task and project management
- **surveys**: Employee feedback and surveys
- **announcements**: Company-wide communications
- **events**: Event and calendar management

## Pricing Tiers

Each module can be assigned to different tiers:

- **Starter**: Basic functionality with limited usage
- **Business**: Enhanced features with higher limits
- **Enterprise**: Full functionality with unlimited usage

### Default Limits by Tier

| Tier | Employees | Storage | API Calls/Month |
|------|-----------|---------|-----------------|
| Starter | 50 | 1 GB | 10,000 |
| Business | 200 | 10 GB | 50,000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Usage

### Platform Administration

#### CLI Commands

```bash
# List all companies and their module status
npm run modules:list

# Show modules for a specific company
npm run modules:show -- --company techcorp_solutions

# Enable a module for a company
npm run modules:enable -- --company techcorp_solutions --module payroll --tier business

# Disable a module
npm run modules:disable -- --company techcorp_solutions --module payroll

# Generate license file
npm run modules:license -- --company techcorp_solutions

# Bulk enable module for all companies
npm run modules:bulk-enable -- --module attendance --tier starter

# Show module statistics
npm run modules:stats
```

#### Advanced CLI Options

```bash
# Enable module with custom limits
npm run modules:enable -- \
  --company techcorp_solutions \
  --module payroll \
  --tier business \
  --employees 500 \
  --storage 21474836480 \
  --api-calls 100000
```

#### REST API Endpoints

**Platform Admin Endpoints** (require platform authentication):

```javascript
// Get all companies with module status
GET /api/platform/modules/companies

// Get specific company modules
GET /api/platform/modules/companies/:companyId

// Enable module for company
POST /api/platform/modules/companies/:companyId/enable
{
  "moduleKey": "payroll",
  "tier": "business",
  "customLimits": {
    "employees": 500,
    "storage": 21474836480,
    "apiCalls": 100000
  }
}

// Disable module
POST /api/platform/modules/companies/:companyId/disable
{
  "moduleKey": "payroll"
}

// Generate license
POST /api/platform/modules/companies/:companyId/license

// Bulk enable module
POST /api/platform/modules/bulk/enable
{
  "companyIds": ["company1", "company2"],
  "moduleKey": "attendance",
  "tier": "starter"
}

// Get module statistics
GET /api/platform/modules/stats
```

### HR Application Integration

#### React Hooks

```javascript
import { useModuleAccess, useModule, ModuleGuard } from '../hooks/useModuleAccess';

// Check access to a specific module
function PayrollPage() {
  const { hasAccess, moduleInfo, loading } = useModule('payroll');
  
  if (loading) return <div>Loading...</div>;
  if (!hasAccess) return <div>Access denied</div>;
  
  return <div>Payroll content</div>;
}

// Check multiple modules
function ReportsPage() {
  const { hasAnyAccess, hasAllAccess } = useModules(['reports', 'analytics']);
  
  return (
    <div>
      {hasAnyAccess && <BasicReports />}
      {hasAllAccess && <AdvancedAnalytics />}
    </div>
  );
}
```

#### Component Protection

```javascript
import { ModuleFeature, ModuleProtectedRoute } from '../components';

// Protect entire routes
<ModuleProtectedRoute 
  module="payroll" 
  component={PayrollPage} 
  fallbackPath="/dashboard"
/>

// Protect individual features
<ModuleFeature module="reports" showUpgrade={true}>
  <AdvancedReportsWidget />
</ModuleFeature>

// Conditional rendering
<ModuleGuard modules={['payroll']} fallback={<UpgradePrompt />}>
  <PayrollSummary />
</ModuleGuard>
```

#### Usage Tracking

```javascript
import { useUsageTracking } from '../hooks/useModuleAccess';

function EmployeeList() {
  const { trackEmployeeCount, trackApiCall } = useUsageTracking();
  
  useEffect(() => {
    // Track employee count
    trackEmployeeCount(employees.length);
    
    // Track API usage
    trackApiCall('hr-core');
  }, [employees]);
}
```

### Company-Level API

**HR Application Endpoints** (require tenant authentication):

```javascript
// Get company modules
GET /api/company/modules

// Check specific module access
GET /api/company/modules/payroll/access

// Check multiple modules
POST /api/company/modules/check-access
{
  "moduleKeys": ["payroll", "reports"]
}

// Update usage statistics
PUT /api/company/usage
{
  "usage": {
    "employees": 150,
    "storage": 5368709120,
    "apiCalls": 25000
  }
}
```

## License Management

### License File Structure

```json
{
  "licenseKey": "HRMS-ABCD-1234-EFGH",
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
    "payroll": {
      "enabled": true,
      "tier": "business",
      "limits": {
        "employees": 200,
        "apiCalls": 50000
      }
    }
  },
  "signature": "digital-signature-hash",
  "metadata": {
    "contactEmail": "admin@acme.com",
    "supportLevel": "premium"
  }
}
```

### License Generation

```javascript
// Generate license for a company
const result = await ModuleManagementService.generateCompanyLicense(
  companyId, 
  secretKey
);

if (result.success) {
  console.log('License Key:', result.licenseData.licenseKey);
  console.log('File Path:', result.licensePath);
}
```

## Security

### Authentication

- **Platform Routes**: Require platform JWT tokens with appropriate permissions
- **Company Routes**: Require tenant JWT tokens with company context
- **License Files**: Digitally signed with HMAC-SHA256

### Permissions

Platform users need specific permissions:
- `manage_modules`: Enable/disable modules and update limits
- `manage_companies`: View and manage company information
- `manage_licenses`: Generate and manage license files
- `view_analytics`: Access module statistics and reports

### Rate Limiting

- Platform admin routes: 200 requests per 15 minutes (production)
- Company API routes: 100 requests per 15 minutes (production)
- Higher limits in development mode

## Monitoring and Analytics

### Usage Tracking

The system automatically tracks:
- Employee count per company
- Storage usage in bytes
- API call counts per module
- Module adoption rates

### Statistics Available

- Total companies and active companies
- Module adoption percentages
- Companies with expired subscriptions
- Usage trends and limits violations

### Alerts and Notifications

- Subscription expiration warnings
- Usage limit violations
- License generation events
- Module access changes

## Best Practices

### For Platform Administrators

1. **Regular Monitoring**: Check module statistics and expired subscriptions regularly
2. **Gradual Rollouts**: Use bulk operations for phased module deployments
3. **License Management**: Generate licenses before subscription renewals
4. **Usage Tracking**: Monitor usage patterns to optimize pricing tiers

### For Developers

1. **Graceful Degradation**: Always provide fallbacks for disabled modules
2. **Performance**: Use module guards to avoid unnecessary API calls
3. **User Experience**: Show clear upgrade prompts for premium features
4. **Caching**: Leverage the built-in caching for module access checks

### For HR Applications

1. **Route Protection**: Use `ModuleProtectedRoute` for entire pages
2. **Feature Flags**: Use `ModuleFeature` for individual components
3. **Usage Reporting**: Track usage to help with capacity planning
4. **Error Handling**: Handle module access errors gracefully

## Troubleshooting

### Common Issues

1. **Module Not Enabled**: Check company module configuration
2. **License Expired**: Generate new license or extend subscription
3. **Usage Limits Exceeded**: Increase limits or upgrade tier
4. **Authentication Errors**: Verify JWT tokens and permissions

### Debug Commands

```bash
# Check company module status
npm run modules:show -- --company company_slug

# Verify license generation
npm run modules:license -- --company company_slug

# Check module statistics
npm run modules:stats
```

### Logs

Module operations are logged with structured data:
- Company operations: `logs/companies/{company}/application.log`
- Platform operations: `logs/platform.log`
- Module access: `logs/module-access.log`

## Migration Guide

### From Legacy System

1. **Create Company Records**: Import existing companies into the new system
2. **Enable Default Modules**: Enable hr-core and other basic modules
3. **Set Usage Limits**: Configure appropriate limits based on current usage
4. **Generate Licenses**: Create license files for existing customers
5. **Update Applications**: Integrate module access checks into HR applications

### Database Migration

```javascript
// Example migration script
const companies = await LegacyCompany.find({});

for (const legacyCompany of companies) {
  const company = new Company({
    name: legacyCompany.name,
    slug: legacyCompany.slug,
    adminEmail: legacyCompany.adminEmail,
    subscription: {
      plan: legacyCompany.plan,
      endDate: legacyCompany.subscriptionEnd
    }
  });
  
  // Enable default modules
  company.enableModule('hr-core', 'enterprise');
  company.enableModule('attendance', legacyCompany.plan);
  
  await company.save();
}
```

## API Reference

See the complete API documentation in the respective controller files:
- Platform API: `server/platform/controllers/ModuleController.js`
- Company API: `server/routes/companyModuleRoutes.js`

## Support

For technical support or questions about the module management system:
1. Check the troubleshooting section above
2. Review the logs for error details
3. Use the CLI tools for debugging
4. Contact the development team with specific error messages