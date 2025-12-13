# Attendance Device Integration - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Environment Variables
The environment variables have already been added to your `.env` file:
```env
DEVICE_DEFAULT_PORT=4370
ATTENDANCE_SYNC_INTERVAL=5
CLOUD_ATTENDANCE_API_URL=
CLOUD_ATTENDANCE_API_KEY=
```

### Step 2: Start the Server
```bash
npm start
```

The attendance cron jobs will start automatically!

### Step 3: Access the Frontend
Navigate to these new pages in your React app:
- **Attendance Dashboard**: `/attendance/dashboard`
- **Device Management**: `/attendance/devices`
- **Import Attendance**: `/attendance/import`

## 📋 API Endpoints Available

### Device Management
- `POST /api/attendance-devices/register` - Register new device
- `GET /api/attendance-devices` - List all devices
- `PUT /api/attendance-devices/:id` - Update device
- `DELETE /api/attendance-devices/:id` - Delete device
- `POST /api/attendance-devices/:id/test-connection` - Test connection
- `POST /api/attendance-devices/:id/sync` - Sync device
- `POST /api/attendance-devices/sync-all` - Sync all devices

### Attendance Operations
- `POST /api/attendance-devices/push` - Receive pushed logs
- `POST /api/attendance-devices/import/csv` - Import CSV
- `GET /api/attendance/today` - Today's attendance
- `GET /api/attendance/monthly` - Monthly attendance
- `POST /api/attendance/manual/checkin` - Manual check-in
- `POST /api/attendance/manual/checkout` - Manual check-out

## 🔧 Testing the Integration

### Test 1: Register a Test Device
```bash
curl -X POST http://localhost:5000/api/attendance-devices/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deviceName": "Test Device",
    "deviceType": "manual",
    "autoSync": false
  }'
```

### Test 2: Push Sample Logs
```bash
curl -X POST http://localhost:5000/api/attendance-devices/push \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "DEVICE_ID_FROM_STEP_1",
    "logs": [
      {
        "userId": "EMP001",
        "timestamp": "2024-01-15T09:00:00Z",
        "type": "checkin"
      }
    ]
  }'
```

### Test 3: Get Today's Attendance
```bash
curl http://localhost:5000/api/attendance/today \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 CSV Import Format

Create a CSV file with this format:

```csv
employeeId,date,timestamp,type
EMP001,2024-01-15,2024-01-15 09:00:00,checkin
EMP001,2024-01-15,2024-01-15 17:30:00,checkout
EMP002,2024-01-15,2024-01-15 08:55:00,checkin
EMP002,2024-01-15,2024-01-15 17:00:00,checkout
```

Then upload via:
1. Frontend: Go to `/attendance/import`
2. API: `POST /api/attendance-devices/import/csv` with file

## 🎯 Common Use Cases

### Use Case 1: ZKTeco Biometric Device

1. Register the device:
```javascript
{
    "deviceName": "Main Office ZKTeco",
    "deviceType": "zkteco",
    "ipAddress": "192.168.1.100",
    "port": 4370,
    "autoSync": true,
    "syncInterval": 5
}
```

2. The system will automatically:
   - Connect every 5 minutes
   - Pull attendance logs
   - Save to database
   - Update sync status

### Use Case 2: Cloud Attendance Service

1. Register the cloud service:
```javascript
{
    "deviceName": "Cloud Attendance API",
    "deviceType": "cloud",
    "apiUrl": "https://api.attendance-service.com/logs",
    "apiKey": "your-api-key",
    "token": "Bearer your-token",
    "autoSync": true,
    "syncInterval": 10
}
```

2. Configure the API endpoint and credentials
3. System will fetch logs automatically

### Use Case 3: Manual Entry by HR

Use the manual check-in/check-out endpoints:

```javascript
// Check-in
POST /api/attendance/manual/checkin
{
    "employeeId": "employee_id",
    "date": "2024-01-15",
    "time": "2024-01-15T09:00:00Z",
    "notes": "Forgot to check in"
}

// Check-out
POST /api/attendance/manual/checkout
{
    "employeeId": "employee_id",
    "date": "2024-01-15",
    "time": "2024-01-15T17:30:00Z",
    "notes": "Forgot to check out"
}
```

### Use Case 4: Bulk Import from CSV

1. Prepare CSV file with attendance records
2. Upload via frontend or API
3. System validates and imports
4. Review import results

## 🔄 Cron Jobs

Two cron jobs run automatically:

### 1. Auto-Sync (Every 5 minutes)
- Syncs all active devices with `autoSync: true`
- Logs results
- Updates device status

### 2. Daily Summary (11:59 PM)
- Generates daily attendance summary
- Logs statistics
- Can be extended to send email reports

## 🛠️ Customization

### Change Sync Interval
Update `.env`:
```env
ATTENDANCE_SYNC_INTERVAL=10  # Sync every 10 minutes
```

### Add Custom Device Type

1. Update `server/models/attendanceDevice.model.js`:
```javascript
deviceType: {
    type: String,
    enum: [..., 'your-custom-type']
}
```

2. Add normalization logic in `server/services/attendanceDevice.service.js`:
```javascript
case 'your-custom-type':
    normalized.employeeId = rawLog.yourEmployeeField;
    normalized.timestamp = new Date(rawLog.yourTimeField);
    normalized.type = rawLog.yourTypeField;
    break;
```

3. Update frontend dropdown in `client/src/pages/attendance/DeviceManagement.jsx`

## 📱 Frontend Integration

Add routes to your React app:

```javascript
import { AttendanceDashboard, DeviceManagement, AttendanceImport } from './pages/attendance';

// In your routes
<Route path="/attendance/dashboard" element={<AttendanceDashboard />} />
<Route path="/attendance/devices" element={<DeviceManagement />} />
<Route path="/attendance/import" element={<AttendanceImport />} />
```

## 🔐 Security Notes

1. **Device Push Endpoint**: Currently public for device access. In production:
   - Add device authentication
   - Use API keys or tokens
   - Whitelist device IPs

2. **Manual Entry**: Restricted to HR/Admin roles

3. **Device Management**: Restricted to HR/Admin roles

## 📈 Monitoring

Check these for system health:

1. **Device Status**: View in Device Management page
2. **Sync Logs**: Check server logs for sync results
3. **Error Tracking**: Review device `lastSyncError` field
4. **Statistics**: View device stats via API or frontend

## 🆘 Troubleshooting

### Device Not Syncing
1. Check device status is "active"
2. Verify `autoSync` is true
3. Test connection manually
4. Review server logs

### Import Errors
1. Verify CSV format
2. Check employee IDs exist
3. Validate date/time formats
4. Review error messages

### Connection Issues
1. Verify IP address and port
2. Check network connectivity
3. Test device credentials
4. Review firewall settings

## 🎉 You're Ready!

Your attendance device integration system is now fully operational. Start by:

1. Registering your first device
2. Testing the connection
3. Syncing some data
4. Viewing results in the dashboard

For detailed documentation, see `ATTENDANCE_DEVICE_INTEGRATION.md`
