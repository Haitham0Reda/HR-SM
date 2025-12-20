# Module-Aware Backup System

## Overview

The Module-Aware Backup System extends the existing HR-SM backup functionality to include module-specific collections and files based on enabled modules and license features. This ensures that backups only contain data from modules that are actually enabled and licensed for each tenant or system-wide installation.

## Key Features

### 🔧 Module Integration
- **Automatic Collection Detection**: Automatically includes collections from enabled modules
- **License-Aware**: Only backs up data from licensed modules (e.g., life-insurance requires 'life-insurance' license feature)
- **Tenant-Specific**: Can create tenant-specific backups with only their enabled modules
- **System-Wide**: Can create comprehensive system backups including all modules

### 📦 Enhanced Backup Components
- **Database Collections**: Module-specific MongoDB collections
- **File Uploads**: Module-specific upload directories
- **Configuration**: Module configurations and settings
- **Metadata**: Module enablement and license information

### 🔍 Verification & Monitoring
- **Collection Verification**: Ensures expected collections exist before backup
- **Relationship Validation**: Verifies data relationships between module collections
- **Backup Integrity**: Enhanced verification including module-specific checks

## Architecture

### Core Components

1. **ModuleAwareBackupService** (`server/services/moduleAwareBackupService.js`)
   - Extends the base BackupService with module awareness
   - Integrates with module registry and loader
   - Handles collection discovery and backup creation

2. **ModuleAwareBackupScheduler** (`server/services/moduleAwareBackupScheduler.js`)
   - Extends the base BackupScheduler
   - Schedules module-aware backups
   - Supports tenant-specific backup scheduling

3. **Module Backup Configuration** (`server/config/moduleBackupConfig.js`)
   - Central configuration for module backup settings
   - Defines collections, priorities, and retention policies
   - Configures file upload directories per module

4. **CLI Management Tool** (`server/scripts/moduleAwareBackupManager.js`)
   - Command-line interface for module-aware backup operations
   - Supports manual backups, verification, and statistics

## Module Configuration

### Life Insurance Module Example

The life-insurance module is configured in `server/modules/life-insurance/module.config.js`:

```javascript
export default {
    name: 'life-insurance',
    displayName: 'Life Insurance Management',
    
    // License requirements
    license: {
        requiredFeature: 'life-insurance',
        description: 'Requires life-insurance feature in license'
    },
    
    // Collections included in backup
    backupCollections: [
        'insurancepolicies',
        'familymembers',
        'insuranceclaims',
        'beneficiaries'
    ],
    
    // Module metadata
    metadata: {
        required: false,
        canBeDisabled: true,
        isCore: false,
        supportsMultiTenant: true,
        requiresTenantContext: true,
        requiresLicense: true
    }
};
```

### Backup Integration Process

1. **Module Registration**: Modules register their backup collections in `module.config.js`
2. **License Validation**: System checks if module's required license feature is available
3. **Collection Discovery**: Backup service queries enabled modules and their collections
4. **Backup Creation**: Only collections from enabled/licensed modules are included
5. **Verification**: Post-backup verification ensures all expected collections are present

## Usage

### System-Wide Backup

Create a backup including all enabled modules:

```bash
# Using the CLI tool
node server/scripts/moduleAwareBackupManager.js create --verbose

# Programmatically
import ModuleAwareBackupService from './services/moduleAwareBackupService.js';
const backupService = new ModuleAwareBackupService();
const result = await backupService.createModuleAwareDailyBackup();
```

### Tenant-Specific Backup

Create a backup for a specific tenant with only their enabled modules:

```bash
# Using the CLI tool
node server/scripts/moduleAwareBackupManager.js create --tenant TENANT_ID --verbose

# Programmatically
const result = await backupService.createModuleAwareDailyBackup('TENANT_ID');
```

### Module Collection Verification

Verify that expected collections exist in the database:

```bash
# System-wide verification
node server/scripts/moduleAwareBackupManager.js verify-collections --verbose

# Tenant-specific verification
node server/scripts/moduleAwareBackupManager.js verify-collections --tenant TENANT_ID
```

### List Enabled Modules

View enabled modules and their backup collections:

```bash
# System-wide modules
node server/scripts/moduleAwareBackupManager.js list-modules --verbose

# Tenant-specific modules
node server/scripts/moduleAwareBackupManager.js list-modules --tenant TENANT_ID
```

## Backup Structure

### Enhanced Backup Manifest

Module-aware backups include additional metadata:

```json
{
  "id": "system-backup-2025-12-20T10-30-00-000Z",
  "type": "daily",
  "tenantId": "system-wide",
  "timestamp": "2025-12-20T10:30:00.000Z",
  "moduleAware": true,
  "enabledModules": [
    "hr-core",
    "life-insurance", 
    "tasks",
    "clinic"
  ],
  "components": [
    {
      "type": "mongodb",
      "database": "hrms",
      "moduleAware": true,
      "collectionsIncluded": [
        "attendances", "requests", "holidays",
        "insurancepolicies", "familymembers", "insuranceclaims", "beneficiaries",
        "tasks", "taskreports",
        "appointments", "prescriptions"
      ],
      "size": 15728640,
      "timestamp": "2025-12-20T10:30:15.000Z"
    }
  ]
}
```

### File Organization

```
backups/
├── daily/
│   └── system-backup-2025-12-20T10-30-00-000Z/
│       ├── hrms.archive                    # Module-aware database backup
│       ├── hrsm-licenses.archive          # License server database
│       ├── uploads.tar.gz                 # Module-specific uploads
│       ├── configuration.tar.gz           # System configuration
│       ├── rsa-keys.encrypted             # License server keys
│       └── application-code.tar.gz        # Application source
├── weekly/
├── monthly/
└── metadata/
    └── system-backup-2025-12-20T10-30-00-000Z.json
```

## Scheduling

### Automated Scheduling

The ModuleAwareBackupScheduler runs the following automated tasks:

- **Daily System Backup**: 2:00 AM - Full system backup with all enabled modules
- **Weekly System Backup**: Sunday 3:00 AM - Weekly retention backup
- **Monthly System Backup**: 1st day 4:00 AM - Monthly retention backup
- **Collection Verification**: 1:30 AM - Verify module collections before backup
- **Retention Cleanup**: 5:00 AM - Apply retention policies
- **Key Rotation**: 15th day 6:00 AM - Rotate encryption keys

### Tenant-Specific Scheduling

Schedule backups for specific tenants:

```javascript
import ModuleAwareBackupScheduler from './services/moduleAwareBackupScheduler.js';

const scheduler = new ModuleAwareBackupScheduler();
scheduler.start();

// Schedule daily backups for specific tenants at 1:00 AM
scheduler.scheduleTenantsBackup(['tenant1', 'tenant2'], '0 1 * * *');
```

## Configuration

### Module Backup Configuration

Configure module backup settings in `server/config/moduleBackupConfig.js`:

```javascript
export const MODULE_BACKUP_CONFIG = {
    'life-insurance': {
        required: false,
        licenseFeature: 'life-insurance',
        collections: [
            'insurancepolicies',
            'familymembers',
            'insuranceclaims', 
            'beneficiaries'
        ],
        priority: 2,
        description: 'Life insurance management data',
        fileUploads: [
            'insurance-documents',
            'claim-documents',
            'policy-attachments'
        ]
    }
};
```

### Retention Policies

Different retention policies based on module criticality:

```javascript
export const MODULE_RETENTION_POLICIES = {
    critical: {
        modules: ['hr-core', 'life-insurance', 'payroll'],
        daily: 60,    // 60 days
        weekly: 24,   // 24 weeks
        monthly: 24   // 24 months
    },
    important: {
        modules: ['tasks', 'clinic', 'documents'],
        daily: 30,    // 30 days
        weekly: 12,   // 12 weeks
        monthly: 12   // 12 months
    }
};
```

## Verification

### Collection Verification

The system verifies that expected collections exist:

```javascript
const verification = await backupService.verifyModuleCollections();

console.log(verification);
// {
//   tenantId: 'system-wide',
//   expectedCollections: ['attendances', 'insurancepolicies', ...],
//   existingCollections: ['attendances', 'insurancepolicies', ...],
//   missingCollections: [],
//   extraCollections: ['temp_collection'],
//   verificationStatus: 'passed'
// }
```

### Relationship Validation

For modules with related collections, the system validates relationships:

```javascript
// Life insurance module relationships
{
    parent: 'insurancepolicies',
    child: 'familymembers', 
    foreignKey: 'policyId'
}
```

## Monitoring & Alerts

### Backup Notifications

Enhanced notifications include module information:

```javascript
{
    type: 'daily-system',
    status: 'success',
    moduleAware: true,
    enabledModules: ['hr-core', 'life-insurance', 'tasks'],
    tenantId: 'system-wide',
    backupId: 'system-backup-2025-12-20T10-30-00-000Z',
    size: 15728640,
    duration: '45s'
}
```

### Statistics

Get enhanced backup statistics:

```bash
node server/scripts/moduleAwareBackupManager.js stats
```

Output includes:
- Standard backup statistics (file counts, sizes)
- Module information (registered modules, collections per module)
- Tenant vs system backup counts
- Last backup details with module information

## Integration with Existing System

### Backward Compatibility

The module-aware backup system is fully backward compatible:

- Existing backup scripts continue to work
- Standard BackupService can still be used
- Module-aware features are additive, not replacing

### Migration Path

1. **Phase 1**: Deploy module-aware backup services alongside existing system
2. **Phase 2**: Update backup schedules to use module-aware scheduler
3. **Phase 3**: Migrate existing backup verification to include module checks
4. **Phase 4**: Update monitoring and alerting to include module information

## Best Practices

### Module Development

When creating new modules:

1. **Define Backup Collections**: Always specify `backupCollections` in `module.config.js`
2. **License Integration**: Set `license.requiredFeature` for licensed modules
3. **File Upload Organization**: Use module-specific upload directories
4. **Relationship Documentation**: Document collection relationships for verification

### Backup Management

1. **Regular Verification**: Run collection verification before important operations
2. **Tenant-Specific Backups**: Use for large multi-tenant deployments
3. **Monitor Module Changes**: Watch for module enablement/disablement
4. **Test Restoration**: Regularly test backup restoration with module awareness

### Performance Optimization

1. **Collection Filtering**: Only backup collections from enabled modules
2. **Parallel Processing**: Process module collections in parallel where possible
3. **Incremental Backups**: Consider incremental backups for large module datasets
4. **Compression**: Use appropriate compression for module-specific data types

## Troubleshooting

### Common Issues

1. **Missing Collections**: Module enabled but collections don't exist
   - **Solution**: Run collection verification and check module initialization

2. **License Validation Failures**: Module requires license feature not available
   - **Solution**: Verify license includes required features

3. **Large Backup Sizes**: All modules included in backup
   - **Solution**: Use tenant-specific backups or disable unused modules

4. **Backup Verification Failures**: Expected collections missing from backup
   - **Solution**: Check module registry initialization and collection names

### Debug Commands

```bash
# Verify module registry
node server/scripts/moduleAwareBackupManager.js list-modules --verbose

# Check collection existence
node server/scripts/moduleAwareBackupManager.js verify-collections --verbose

# Test backup creation
node server/scripts/moduleAwareBackupManager.js create --verbose
```

## Future Enhancements

### Planned Features

1. **Incremental Module Backups**: Only backup changed module data
2. **Module-Specific Encryption**: Different encryption keys per module
3. **Cross-Module Relationship Validation**: Validate relationships between modules
4. **Module Backup Policies**: Per-module backup frequency and retention
5. **Real-Time Module Sync**: Sync module changes to backup configuration

### API Extensions

1. **REST API**: HTTP endpoints for module-aware backup operations
2. **WebSocket Updates**: Real-time backup progress with module details
3. **Webhook Integration**: Module-aware backup event notifications
4. **GraphQL Support**: Query backup data with module filtering

## Conclusion

The Module-Aware Backup System provides a robust, scalable solution for backing up HR-SM installations with varying module configurations. By integrating with the module registry and license system, it ensures that backups are both comprehensive and efficient, containing only the data that is actually relevant to each installation.

The system maintains full backward compatibility while providing enhanced functionality for modern multi-tenant, multi-module deployments. With proper configuration and monitoring, it provides enterprise-grade backup capabilities that scale with the system's modular architecture.