# Multi-Tenant Attendance Device Management

## Overview

The attendance device management system is designed to support multi-tenant architecture, ensuring that each company using the system can manage their own attendance devices independently and securely.

## Key Features

### 🏢 Tenant Isolation
- Each attendance device belongs to a specific tenant (company)
- Devices are completely isolated between tenants
- No cross-tenant data access or visibility

### 🔒 Security
- All API endpoints require authentication and tenant context
- Automatic tenant filtering on all database queries
- Device names must be unique within each tenant (but can be duplicated across tenants)

### 📊 Device Management
- Register and manage various device types:
  - ZKTeco biometric devices
  - Cloud-based attendance systems
  - Mobile apps
  - QR code systems
  - CSV import systems
  - Manual entry systems

## API Endpoints

All endpoints are prefixed with `/api/v1/attendance-devices` and require:
- Valid JWT token with tenant information
- Appropriate user roles (admin/hr for management operations)

### Device Management
- `GET /` - List all devices for the current tenant
- `POST /register` - Register a new device for the current tenant
- `GET /:id` - Get device details (tenant-filtered)
- `PUT /:id` - Update device (tenant-filtered)
- `DELETE /:id` - Delete device (tenant-filtered)

### Device Operations
- `POST /:id/test-connection` - Test device connectivity
- `POST /:id/sync` - Sync logs from a specific device
- `POST /sync-all` - Sync all active devices for the tenant
- `GET /stats` - Get device statistics for the tenant

### Data Import/Export
- `POST /import/csv` - Import attendance data from CSV/Excel
- `POST /push` - Receive pushed logs from devices (public endpoint with device validation)

## Database Schema

### AttendanceDevice Model
```javascript
{
  tenantId: ObjectId,        // Required - links device to tenant
  deviceName: String,        // Unique within tenant
  deviceType: String,        // zkteco, cloud, mobile, qr, csv, etc.
  ipAddress: String,         // For network devices
  port: Number,              // For network devices
  apiKey: String,            // For cloud services
  token: String,             // Authentication token
  apiUrl: String,            // For cloud services
  status: String,            // active, inactive, error, syncing
  lastSync: Date,            // Last successful sync
  autoSync: Boolean,         // Enable automatic syncing
  departments: [ObjectId],   // Associated departments
  config: Object,            // Device-specific configuration
  stats: {                   // Usage statistics
    totalSyncs: Number,
    successfulSyncs: Number,
    failedSyncs: Number,
    lastRecordCount: Number
  },
  createdBy: ObjectId,       // User who registered the device
  // ... other fields
}
```

### Indexes
- `{ tenantId: 1, deviceType: 1, status: 1 }` - Performance
- `{ tenantId: 1, deviceName: 1 }` - Unique constraint per tenant
- `{ tenantId: 1, autoSync: 1, isActive: 1 }` - Sync operations

## Migration

### Existing Systems
If you have existing attendance devices that need to be migrated to the multi-tenant structure:

1. Set the default tenant ID:
   ```bash
   export DEFAULT_TENANT_ID="your_tenant_objectid_here"
   ```

2. Run the migration script:
   ```bash
   npm run migrate-attendance-devices
   ```

### New Installations
For new installations, devices will automatically be assigned to the tenant of the user who registers them.

## Usage Examples

### Register a ZKTeco Device
```javascript
POST /api/v1/attendance-devices/register
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "deviceName": "Main Office ZKTeco",
  "deviceType": "zkteco",
  "ipAddress": "192.168.1.100",
  "port": 4370,
  "departments": ["dept_id_1", "dept_id_2"],
  "autoSync": true,
  "syncInterval": 5
}
```

### Register a Cloud Service
```javascript
POST /api/v1/attendance-devices/register
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "deviceName": "Cloud Attendance Service",
  "deviceType": "cloud",
  "apiUrl": "https://api.attendance-service.com",
  "apiKey": "your_api_key_here",
  "autoSync": true,
  "syncInterval": 10
}
```

### Sync All Devices
```javascript
POST /api/v1/attendance-devices/sync-all
Authorization: Bearer <jwt_token>
```

### Device Push Logs (for devices that push data)
```javascript
POST /api/v1/attendance-devices/push
Content-Type: application/json

{
  "deviceId": "device_object_id",
  "tenantId": "tenant_object_id", // Optional but recommended
  "logs": [
    {
      "employeeId": "EMP001",
      "timestamp": "2024-01-15T08:30:00Z",
      "type": "check_in",
      "deviceId": "device_serial_number"
    }
  ]
}
```

## Security Considerations

### Authentication
- All protected endpoints require valid JWT tokens
- Tokens must contain tenant information
- Public endpoints (like `/push`) validate device ownership

### Authorization
- Device registration requires admin or HR role
- Device deletion requires admin role
- Regular users can view device statistics

### Data Isolation
- Automatic tenant filtering prevents cross-tenant access
- All database queries include tenant context
- Device names are unique per tenant, not globally

## Monitoring and Logging

### Device Statistics
Each tenant can view:
- Total devices by type
- Active/inactive device counts
- Sync success/failure rates
- Last sync timestamps

### Audit Logging
All device operations are logged with:
- User information
- Tenant context
- Operation details
- Timestamps

## Troubleshooting

### Common Issues

1. **404 Device Not Found**
   - Verify the device belongs to your tenant
   - Check if the device ID is correct

2. **Sync Failures**
   - Check device connectivity
   - Verify API credentials for cloud services
   - Review device logs for specific errors

3. **Permission Denied**
   - Ensure user has appropriate role (admin/hr)
   - Verify JWT token contains tenant information

### Migration Issues

1. **Missing DEFAULT_TENANT_ID**
   - Set the environment variable before running migration
   - Use a valid MongoDB ObjectId

2. **Devices Still Missing tenantId**
   - Check if devices were created after migration
   - Verify migration script completed successfully

## Best Practices

### Device Naming
- Use descriptive names that identify location/purpose
- Include department or floor information
- Avoid special characters that might cause issues

### Sync Configuration
- Set appropriate sync intervals based on usage
- Enable auto-sync for critical devices
- Monitor sync performance and adjust as needed

### Security
- Regularly rotate API keys for cloud services
- Use strong authentication for device access
- Monitor device access logs for suspicious activity

### Performance
- Limit the number of devices per tenant based on usage
- Use appropriate sync intervals to balance data freshness and performance
- Monitor database performance with multiple tenants

## Support

For technical support or questions about the multi-tenant attendance device system:
1. Check the troubleshooting section above
2. Review server logs for specific error messages
3. Contact your system administrator
4. Refer to the main API documentation for additional details