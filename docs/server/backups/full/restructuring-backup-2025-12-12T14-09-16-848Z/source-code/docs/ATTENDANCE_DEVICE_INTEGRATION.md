# Attendance Device Integration System

## Overview

This system provides comprehensive integration with various attendance tracking devices and methods, including biometric devices (ZKTeco), cloud services, mobile check-ins, QR code scanning, and CSV imports.

## Features

### 1. Multi-Device Support
- **ZKTeco Biometric Devices**: Direct integration with ZKTeco fingerprint/face recognition devices
- **Cloud Attendance Services**: Integration with cloud-based attendance APIs
- **Mobile Check-in**: Support for mobile app-based attendance
- **QR Code Scanning**: QR code-based attendance tracking
- **CSV Import**: Bulk import from CSV/Excel files
- **Manual Entry**: HR/Admin manual attendance entry

### 2. Automated Synchronization
- Auto-sync every 5 minutes (configurable)
- Manual sync on-demand
- Sync all devices with one click
- Sync status tracking and error logging

### 3. Normalized Data Format
All attendance sources are normalized to a standard format:
```javascript
{
    employeeId: "EMP001",
    timestamp: "2024-01-15T09:00:00Z",
    type: "checkin" | "checkout",
    source: "biometric" | "cloud" | "mobile" | "qr" | "manual" | "csv",
    rawData: { /* original device data */ }
}
```

## Backend API Endpoints

### Device Management

#### Register Device
```
POST /api/attendance-devices/register
```
**Body:**
```json
{
    "deviceName": "Main Office Biometric",
    "deviceType": "zkteco",
    "ipAddress": "192.168.1.100",
    "port": 4370,
    "syncInterval": 5,
    "autoSync": true
}
```

#### Get All Devices
```
GET /api/attendance-devices
```

#### Update Device
```
PUT /api/attendance-devices/:id
```

#### Delete Device
```
DELETE /api/attendance-devices/:id
```

#### Test Connection
```
POST /api/attendance-devices/:id/test-connection
```

#### Sync Device
```
POST /api/attendance-devices/:id/sync
```

#### Sync All Devices
```
POST /api/attendance-devices/sync-all
```

### Attendance Operations

#### Push Logs (for devices that push data)
```
POST /api/attendance-devices/push
```
**Body:**
```json
{
    "deviceId": "device_id_here",
    "logs": [
        {
            "userId": "EMP001",
            "timestamp": "2024-01-15T09:00:00Z",
            "type": "checkin"
        }
    ]
}
```

#### Import CSV
```
POST /api/attendance-devices/import/csv
```
**Form Data:**
- `file`: CSV/Excel file
- `deviceId`: (optional) Device ID

#### Get Today's Attendance
```
GET /api/attendance/today
```

#### Get Monthly Attendance
```
GET /api/attendance/monthly?year=2024&month=1
```

#### Manual Check-in
```
POST /api/attendance/manual/checkin
```
**Body:**
```json
{
    "employeeId": "employee_id",
    "date": "2024-01-15",
    "time": "2024-01-15T09:00:00Z",
    "notes": "Manual entry by HR"
}
```

#### Manual Check-out
```
POST /api/attendance/manual/checkout
```

## Database Models

### AttendanceDevice Model
```javascript
{
    deviceName: String,
    deviceType: String, // zkteco, cloud, mobile, qr, csv, biometric-generic, manual
    ipAddress: String,
    port: Number,
    apiKey: String,
    token: String,
    apiUrl: String,
    status: String, // active, inactive, error, syncing
    lastSync: Date,
    lastSyncStatus: String, // success, failed, partial
    syncInterval: Number, // in minutes
    autoSync: Boolean,
    stats: {
        totalSyncs: Number,
        successfulSyncs: Number,
        failedSyncs: Number,
        lastRecordCount: Number
    }
}
```

### Enhanced Attendance Model
Added fields:
```javascript
{
    source: String, // biometric, cloud, mobile, qr, manual, csv, system
    rawDeviceData: Mixed, // Original device data for audit trail
    device: ObjectId // Reference to AttendanceDevice
}
```

## Cron Jobs

### Auto-Sync Task
- **Schedule**: Every 5 minutes (configurable via `ATTENDANCE_SYNC_INTERVAL`)
- **Function**: Automatically syncs all active devices with `autoSync: true`
- **Logging**: Logs sync results and errors

### Daily Summary Task
- **Schedule**: 11:59 PM daily
- **Function**: Generates daily attendance summary
- **Output**: Logs summary statistics (can be extended to send emails)

## Frontend Components

### 1. Attendance Dashboard (`/attendance/dashboard`)
- Real-time today's attendance overview
- Summary cards: Total, Present, Absent, Late, Early Leave
- Detailed attendance table with filters
- Status indicators and source tracking

### 2. Device Management (`/attendance/devices`)
- List all registered devices
- Add/Edit/Delete devices
- Test device connections
- Manual sync buttons
- Device status monitoring
- Last sync time tracking

### 3. Attendance Import (`/attendance/import`)
- CSV/Excel file upload
- Data preview before import
- Import progress tracking
- Error reporting
- Success/failure statistics

## Environment Variables

Add to `.env`:
```env
# Attendance Device Configuration
DEVICE_DEFAULT_PORT=4370
ATTENDANCE_SYNC_INTERVAL=5
CLOUD_ATTENDANCE_API_URL=
CLOUD_ATTENDANCE_API_KEY=
```

## Integration Examples

### ZKTeco Device Integration

1. **Register Device:**
```javascript
const device = {
    deviceName: "Main Office ZKTeco",
    deviceType: "zkteco",
    ipAddress: "192.168.1.100",
    port: 4370,
    autoSync: true,
    syncInterval: 5
};
```

2. **The system will:**
   - Connect to the device every 5 minutes
   - Pull attendance logs
   - Normalize the data
   - Save to database
   - Update device sync status

### Cloud Service Integration

1. **Register Cloud Service:**
```javascript
const device = {
    deviceName: "Cloud Attendance API",
    deviceType: "cloud",
    apiUrl: "https://api.attendance-service.com/logs",
    apiKey: "your-api-key",
    token: "your-bearer-token",
    autoSync: true
};
```

2. **The system will:**
   - Make API calls to fetch logs
   - Handle authentication
   - Normalize response data
   - Save to database

### CSV Import

1. **Prepare CSV file:**
```csv
employeeId,date,timestamp,type
EMP001,2024-01-15,2024-01-15 09:00:00,checkin
EMP001,2024-01-15,2024-01-15 17:30:00,checkout
```

2. **Upload via UI or API:**
   - Preview data before import
   - Validate format
   - Import with error handling
   - Report success/failures

## Extending the System

### Adding a New Device Type

1. **Update Device Model:**
   - Add new device type to enum in `attendanceDevice.model.js`

2. **Implement Service Methods:**
   - Add connection logic in `attendanceDevice.service.js`
   - Implement data fetching method
   - Add normalization logic

3. **Update Frontend:**
   - Add device type to dropdown in `DeviceManagement.jsx`
   - Update form fields as needed

### Custom Data Normalization

Modify the `normalizeLogData` method in `attendanceDevice.service.js`:

```javascript
case 'custom-device':
    normalized.employeeId = rawLog.customEmployeeField;
    normalized.timestamp = new Date(rawLog.customTimeField);
    normalized.type = rawLog.customTypeField === 'IN' ? 'checkin' : 'checkout';
    break;
```

## Security Considerations

1. **Device Authentication:**
   - Store API keys/tokens securely
   - Use environment variables for sensitive data
   - Implement device-level authentication for push endpoints

2. **Data Validation:**
   - Validate all incoming data
   - Sanitize employee IDs
   - Verify timestamps

3. **Access Control:**
   - Only HR/Admin can manage devices
   - Only HR/Admin can perform manual entries
   - Audit trail for all manual changes

## Troubleshooting

### Device Not Syncing

1. Check device status in Device Management
2. Test connection using "Test Connection" button
3. Review error logs in server logs
4. Verify network connectivity
5. Check device credentials

### Import Failures

1. Verify CSV format matches expected structure
2. Check for missing required fields
3. Validate employee IDs exist in system
4. Review error details in import results

### Sync Errors

1. Check cron job logs
2. Verify device is active and autoSync is enabled
3. Test manual sync
4. Review device-specific error messages

## Performance Optimization

1. **Batch Processing:**
   - Process logs in batches
   - Use bulk insert operations

2. **Caching:**
   - Cache employee lookups
   - Store device configurations

3. **Indexing:**
   - Indexes on employee, date, source
   - Compound indexes for common queries

## Future Enhancements

- [ ] Real-time push notifications for attendance events
- [ ] Geofencing for mobile check-ins
- [ ] Face recognition integration
- [ ] Attendance anomaly detection
- [ ] Automated email reports
- [ ] Dashboard widgets
- [ ] Mobile app for device management
- [ ] Multi-location support
- [ ] Shift-based attendance rules
- [ ] Integration with payroll system
