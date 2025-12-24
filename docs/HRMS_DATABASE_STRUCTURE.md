# HRMS Database Structure Documentation

## Overview

The HR-SM platform uses a multi-database architecture where the main `hrms` database contains all platform-level and system-wide data, while tenant-specific data is stored in separate databases.

## Database Architecture

### Main Application Database: `hrms`

The `hrms` database contains all main application data including:

#### 1. Platform Administration Data
- **Tenants Collection** (`tenants`) - Master tenant registry and metadata
- **Platform Users Collection** (`platformusers`) - Platform administrators and super users
- **Companies Collection** (`companies`) - Company registration and configuration data
- **Subscription Plans Collection** (`plans`) - Available subscription plans and pricing tiers

#### 2. System Management Data
- **Licenses Collection** (`licenses`) - Platform-level license records and validation data
- **License Audits Collection** (`licenseaudits`) - Complete audit trail of license operations
- **Security Audits Collection** (`securityaudits`) - System-wide security event logs
- **Usage Tracking Collection** (`usagetrackings`) - Platform usage metrics and analytics
- **Permissions Collection** (`permissions`) - System-level permissions and access controls
- **Security Settings Collection** (`securitysettings`) - Global security configuration

#### 3. Shared System Configuration
- **Permission Audits Collection** (`permissionaudits`) - Permission change audit logs
- **System Metrics** - Performance and monitoring data
- **Global Settings** - Platform-wide configuration settings

### Tenant-Specific Databases: `hrsm_{tenant_name}`

Each tenant gets their own database containing:
- Employee data (`users`)
- Attendance records (`attendances`)
- Leave management (`vacations`, `sickleaves`)
- Payroll data (`payrolls`)
- Department structure (`departments`)
- And other tenant-specific operational data

### License Server Database: `hrsm-licenses` (Separate Microservice)

The license server maintains its own database with:
- License tokens and validation data
- Machine binding information
- License activation tracking
- License audit logs

## Database Connection Configuration

### Environment Configuration

```bash
# Main application database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hrms?retryWrites=true&w=majority

# License server database (separate microservice)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hrsm-licenses?retryWrites=true&w=majority
```

### Connection Patterns

1. **Main Application** - Connects to `hrms` database using `mongoose.connect()`
2. **Tenant Operations** - Creates separate connections to `hrsm_{tenant}` databases
3. **License Server** - Separate microservice with its own database connection

## Data Flow and Separation

### Platform-Level Operations (hrms database)
```
Platform Admin → hrms database → Tenant Management
                              → License Management  
                              → System Monitoring
                              → Security Auditing
```

### Tenant-Level Operations (tenant databases)
```
HR Users → hrsm_{tenant} database → Employee Management
                                 → Attendance Tracking
                                 → Leave Management
                                 → Payroll Processing
```

### License Operations (license server database)
```
License Server → hrsm-licenses database → License Validation
                                       → Machine Binding
                                       → Usage Tracking
```

## Key Benefits of This Architecture

### 1. **Data Isolation**
- Complete separation between platform administration and tenant data
- Each tenant's data is isolated in their own database
- License data is completely separate for security

### 2. **Scalability**
- Platform can scale independently of tenant data
- Individual tenant databases can be optimized separately
- License server can scale independently

### 3. **Security**
- Platform administrators cannot directly access tenant data
- License validation is handled by separate secure microservice
- Clear audit trails for all platform operations

### 4. **Compliance**
- Easy to implement data residency requirements per tenant
- Clear data ownership and access patterns
- Comprehensive audit logging at all levels

## Verification Commands

To verify the database structure is correctly configured:

```bash
# Verify main database configuration
node server/scripts/verify-database-config.js

# Verify database connectivity and structure
node server/scripts/simple-db-verify.js

# Full database verification
node server/scripts/verify-hrms-database.js
```

## Migration and Backup Considerations

### Backup Strategy
- **hrms database**: Contains critical platform configuration - high priority backup
- **Tenant databases**: Contains operational data - regular backup schedule
- **License database**: Contains security-critical data - encrypted backup required

### Migration Patterns
- Platform upgrades affect `hrms` database
- Tenant migrations affect individual `hrsm_{tenant}` databases
- License server migrations are independent

## Monitoring and Health Checks

The system monitors:
- Connection health to `hrms` database
- Individual tenant database performance
- License server database availability
- Cross-database operation integrity

## Conclusion

The `hrms` database serves as the central hub for all platform administration, system management, and shared configuration data. This architecture ensures proper separation of concerns while maintaining system integrity and scalability.