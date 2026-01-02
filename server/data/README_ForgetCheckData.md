# Forget Check Data Creation Guide

This directory contains scripts and sample data for creating forget check-in and check-out records in the HR-SM system.

## Files Overview

### 1. `seedForgetCheckData.js`
**Purpose:** Automated script to create realistic forget check data for testing
**Location:** `server/scripts/seedForgetCheckData.js`

**Features:**
- Creates 30 days of sample forget check records
- Includes both check-in and check-out requests
- Generates realistic times and reasons
- Creates records with different statuses (pending, approved, rejected)
- Includes approval/rejection details with proper user references

**Usage:**
```bash
cd server
node scripts/seedForgetCheckData.js
```

### 2. `forgetCheckSampleData.json`
**Purpose:** Static sample data for manual insertion or reference
**Location:** `server/data/forgetCheckSampleData.json`

**Features:**
- 15 pre-defined forget check records
- Realistic scenarios and reasons
- Different request types and statuses
- Proper date/time formatting examples

### 3. `testForgetCheckAPI.js`
**Purpose:** API endpoint testing and validation
**Location:** `server/scripts/testForgetCheckAPI.js`

**Features:**
- Tests all CRUD operations
- Tests approval/rejection workflow
- Validates different user permissions
- Includes sample data for manual testing

**Usage:**
```bash
cd server
node scripts/testForgetCheckAPI.js
```

## Data Structure

### Forget Check Record Schema
```javascript
{
  tenantId: String,           // Company identifier
  employee: ObjectId,         // Reference to User
  date: Date,                 // Date of the forget check incident
  requestType: String,        // 'check-in' or 'check-out'
  requestedTime: String,      // Time in HH:MM format
  reason: String,             // Detailed explanation (min 10 chars)
  status: String,             // 'pending', 'approved', 'rejected'
  approvedBy: ObjectId,       // Reference to approver (if approved)
  approvedAt: Date,           // Approval timestamp
  rejectedBy: ObjectId,       // Reference to rejector (if rejected)
  rejectedAt: Date,           // Rejection timestamp
  rejectionReason: String,    // Reason for rejection
  department: ObjectId,       // Reference to Department
  position: ObjectId,         // Reference to Position
  createdAt: Date,            // Record creation timestamp
  updatedAt: Date             // Last update timestamp
}
```

## Sample Scenarios

### Check-in Forget Reasons
- System/card reader malfunctions
- Urgent meetings upon arrival
- Network connectivity issues
- Emergency situations
- Early arrival for projects
- Technical difficulties

### Check-out Forget Reasons
- Medical emergencies
- Family emergencies
- System maintenance during departure
- Off-site meetings
- Working late and forgetting
- Transportation urgency

## Status Workflow

1. **Pending** - Initial status when request is created
2. **Approved** - HR/Admin approves the request
3. **Rejected** - HR/Admin rejects with reason

## User Permissions

- **Employees:** Can create, view own records, update pending records
- **HR/Admin:** Can view all records, approve/reject requests
- **System:** Automatically sets department/position from user profile

## Testing Instructions

### 1. Automated Data Creation
```bash
# Navigate to server directory
cd server

# Run the seeding script
node scripts/seedForgetCheckData.js

# Expected output: 30+ forget check records created
```

### 2. Manual Data Insertion
Use the sample data from `forgetCheckSampleData.json` to manually create records through the UI or API.

### 3. API Testing
```bash
# Test all API endpoints
node scripts/testForgetCheckAPI.js

# This will test:
# - User authentication
# - Record creation
# - Record retrieval
# - Record updates
# - Approval workflow
# - Rejection workflow
# - Record deletion
```

### 4. UI Testing
1. Login as employee (john.doe@techcorpsolutions.com / User@123)
2. Navigate to Forget Check page
3. Create new forget check requests
4. Login as HR (hr@techcorpsolutions.com / HR@123)
5. Review and approve/reject requests

## Validation Rules

### Time Format
- Must be in HH:MM format (24-hour)
- Examples: "08:30", "17:45", "09:15"

### Reason Requirements
- Minimum 10 characters
- Maximum 500 characters
- Should provide clear explanation

### Date Constraints
- Cannot be future dates
- Should be within reasonable timeframe (typically 7 days)

### Request Types
- **check-in:** For missed morning check-ins
- **check-out:** For missed evening check-outs

## Troubleshooting

### Common Issues

1. **"No users found" error**
   - Ensure user data is seeded first
   - Check database connection
   - Verify tenant ID matches

2. **Authentication failures**
   - Verify user credentials in USER_CREDENTIALS.md
   - Check tenant database exists
   - Ensure proper environment variables

3. **Permission errors**
   - Verify user roles (hr, admin, employee)
   - Check authentication tokens
   - Validate tenant context

### Database Verification
```javascript
// Check if data was created successfully
use hrsm_techcorp_solutions
db.forgetchecks.count()
db.forgetchecks.find().limit(5)
```

## Integration Notes

- Forget check records integrate with attendance system
- Approved requests should update attendance records
- Email notifications can be sent on status changes
- Reports can include forget check statistics
- Audit trail maintains all status changes

## Next Steps

After creating the data:
1. Test the UI functionality
2. Verify email notifications (if configured)
3. Check reporting integration
4. Test mobile app compatibility
5. Validate audit trail functionality