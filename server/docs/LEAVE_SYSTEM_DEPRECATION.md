# Leave System Deprecation Guide

## Overview

The legacy monolithic Leave API (`/api/leaves`) is being deprecated in favor of specialized endpoints for different types of leave and time tracking. This document outlines the deprecation timeline, replacement endpoints, and migration guide.

## Deprecation Timeline

| Date | Milestone | Status |
|------|-----------|--------|
| **2025-12-01** | Deprecation Announcement | Legacy endpoints marked as deprecated with warning headers |
| **2026-01-01** | Migration Period Begins | Both old and new endpoints available |
| **2026-03-01** | Migration Deadline | All clients should migrate to new endpoints |
| **2026-06-01** | Sunset Date | Legacy endpoints will be removed (HTTP 410 Gone) |

## Deprecated Endpoint

**Legacy Endpoint:** `/api/leaves`

This single endpoint previously handled all types of leave requests:
- Missions (business trips)
- Sick leave
- Permissions (late arrival/early departure)
- Overtime
- Vacations (annual, casual, unpaid)

## Replacement Endpoints

The legacy endpoint has been replaced with five specialized endpoints:

### 1. Missions API - `/api/missions`

**Purpose:** Business trips and field assignments

**Endpoints:**
- `POST /api/missions` - Create mission request
- `GET /api/missions` - Get all missions
- `GET /api/missions/:id` - Get mission by ID
- `PUT /api/missions/:id` - Update mission
- `DELETE /api/missions/:id` - Delete mission
- `POST /api/missions/:id/approve` - Approve mission
- `POST /api/missions/:id/reject` - Reject mission

**Migration:** Replace `leaveType: 'mission'` with dedicated mission endpoints.

---

### 2. Sick Leave API - `/api/sick-leaves`

**Purpose:** Medical leave with two-step approval workflow (supervisor → doctor)

**Endpoints:**
- `POST /api/sick-leaves` - Create sick leave request
- `GET /api/sick-leaves` - Get all sick leaves
- `GET /api/sick-leaves/pending-doctor-review` - Get pending doctor reviews
- `GET /api/sick-leaves/:id` - Get sick leave by ID
- `POST /api/sick-leaves/:id/approve-supervisor` - Supervisor approval
- `POST /api/sick-leaves/:id/approve-doctor` - Doctor approval
- `POST /api/sick-leaves/:id/reject-supervisor` - Supervisor rejection
- `POST /api/sick-leaves/:id/reject-doctor` - Doctor rejection

**Migration:** Replace `leaveType: 'sick'` with dedicated sick leave endpoints.

---

### 3. Permissions API - `/api/permissions`

**Purpose:** Late arrivals and early departures

**Endpoints:**
- `POST /api/permissions` - Create permission request
- `GET /api/permissions` - Get all permissions
- `GET /api/permissions/:id` - Get permission by ID
- `PUT /api/permissions/:id` - Update permission
- `DELETE /api/permissions/:id` - Delete permission
- `POST /api/permissions/:id/approve` - Approve permission
- `POST /api/permissions/:id/reject` - Reject permission

**Migration:** Replace `leaveType: 'late-arrival'` or `'early-departure'` with dedicated permission endpoints.

---

### 4. Overtime API - `/api/overtime`

**Purpose:** Extra working hours tracking with compensation

**Endpoints:**
- `POST /api/overtime` - Create overtime record
- `GET /api/overtime` - Get all overtime records
- `GET /api/overtime/:id` - Get overtime by ID
- `PUT /api/overtime/:id` - Update overtime
- `DELETE /api/overtime/:id` - Delete overtime
- `POST /api/overtime/:id/approve` - Approve overtime
- `POST /api/overtime/:id/reject` - Reject overtime

**Migration:** Replace `leaveType: 'overtime'` with dedicated overtime endpoints.

---

### 5. Vacations API - `/api/vacations`

**Purpose:** Various types of vacation leave (annual, casual, sick, unpaid)

**Endpoints:**
- `POST /api/vacations` - Create vacation request
- `GET /api/vacations` - Get all vacations
- `GET /api/vacations/:id` - Get vacation by ID
- `PUT /api/vacations/:id` - Update vacation
- `DELETE /api/vacations/:id` - Delete vacation
- `POST /api/vacations/:id/approve` - Approve vacation
- `POST /api/vacations/:id/reject` - Reject vacation
- `POST /api/vacations/:id/cancel` - Cancel vacation

**Migration:** Replace `leaveType: 'annual'`, `'casual'`, or `'unpaid'` with dedicated vacation endpoints.

---

## Migration Guide

### Step 1: Identify Legacy API Usage

Check your codebase for calls to `/api/leaves`:

```javascript
// Legacy code (DEPRECATED)
fetch('/api/leaves', {
  method: 'POST',
  body: JSON.stringify({ leaveType: 'mission', ... })
})
```

### Step 2: Update to New Endpoints

Replace with appropriate specialized endpoint:

```javascript
// New code
fetch('/api/missions', {
  method: 'POST',
  body: JSON.stringify({ location: '...', purpose: '...', ... })
})
```

### Step 3: Update Request Payloads

The new endpoints have specialized fields. Update your request payloads accordingly:

#### Mission Request Example

```javascript
// Legacy
{
  leaveType: 'mission',
  startDate: '2025-12-01',
  endDate: '2025-12-05',
  mission: {
    location: 'New York',
    purpose: 'Client meeting'
  }
}

// New
{
  startDate: '2025-12-01',
  endDate: '2025-12-05',
  location: 'New York',
  purpose: 'Client meeting',
  relatedDepartment: '...'
}
```

#### Sick Leave Request Example

```javascript
// Legacy
{
  leaveType: 'sick',
  startDate: '2025-12-01',
  endDate: '2025-12-03',
  reason: 'Flu',
  medicalDocumentation: { ... }
}

// New
{
  startDate: '2025-12-01',
  endDate: '2025-12-03',
  reason: 'Flu',
  medicalDocumentation: {
    required: true,
    provided: true,
    documents: [...]
  }
}
```

#### Permission Request Example

```javascript
// Legacy
{
  leaveType: 'late-arrival',
  date: '2025-12-01',
  time: '09:30',
  reason: 'Doctor appointment'
}

// New
{
  permissionType: 'late-arrival',
  date: '2025-12-01',
  time: '09:30',
  duration: 0.5,
  reason: 'Doctor appointment'
}
```

#### Overtime Request Example

```javascript
// Legacy
{
  leaveType: 'overtime',
  date: '2025-12-01',
  startTime: '18:00',
  endTime: '21:00',
  reason: 'Project deadline'
}

// New
{
  date: '2025-12-01',
  startTime: '18:00',
  endTime: '21:00',
  duration: 3,
  reason: 'Project deadline',
  compensationType: 'paid'
}
```

#### Vacation Request Example

```javascript
// Legacy
{
  leaveType: 'annual',
  startDate: '2025-12-15',
  endDate: '2025-12-20',
  reason: 'Family vacation'
}

// New
{
  vacationType: 'annual',
  startDate: '2025-12-15',
  endDate: '2025-12-20',
  duration: 5,
  reason: 'Family vacation'
}
```

### Step 4: Update Response Handling

Response structures remain largely the same, but some fields have been renamed or restructured. Review the API documentation for each endpoint.

### Step 5: Test Thoroughly

- Test all CRUD operations with new endpoints
- Verify approval workflows work correctly
- Check error handling and validation
- Ensure notifications are sent properly

## Detecting Deprecation Warnings

### HTTP Headers

Legacy endpoints return deprecation headers:

```
X-Deprecated: true
X-Deprecation-Date: 2025-12-01
X-Sunset: 2026-06-01
X-Replacement: /api/missions, /api/sick-leaves, /api/permissions, /api/overtime, /api/vacations
Warning: 299 - "Deprecated API: /api/leaves will be removed on 2026-06-01..."
```

### Client-Side Detection

Check for deprecation headers in your API client:

```javascript
fetch('/api/leaves')
  .then(response => {
    if (response.headers.get('X-Deprecated') === 'true') {
      console.warn('Using deprecated API:', response.headers.get('X-Replacement'));
    }
    return response.json();
  });
```

## Feature Flags

The system supports feature flags for gradual migration:

### Environment Variables

```bash
# Enable/disable legacy endpoints (default: true)
ENABLE_LEGACY_LEAVE=true

# Enable/disable new specialized endpoints (default: true)
ENABLE_NEW_LEAVE_MODELS=true

# Log legacy endpoint usage (default: true)
LOG_LEGACY_USAGE=true

# Send deprecation headers (default: true)
SEND_DEPRECATION_HEADERS=true

# Custom deprecation date (default: 2025-12-01)
LEGACY_DEPRECATION_DATE=2025-12-01

# Custom sunset date (default: 2026-06-01)
LEGACY_SUNSET_DATE=2026-06-01
```

### Disabling Legacy Endpoints

To disable legacy endpoints before the sunset date:

```bash
ENABLE_LEGACY_LEAVE=false
```

This will return HTTP 410 Gone for all `/api/leaves` requests.

## Monitoring Migration Progress

### Server Logs

Legacy endpoint usage is logged with the following information:
- Endpoint accessed
- HTTP method
- User ID and role
- Leave type requested
- Timestamp
- User agent and IP address

### Log Format

```json
{
  "level": "warn",
  "message": "Legacy endpoint accessed",
  "category": "LEGACY_API_USAGE",
  "endpoint": "/api/leaves",
  "method": "POST",
  "userId": "507f1f77bcf86cd799439011",
  "userRole": "employee",
  "leaveType": "mission",
  "timestamp": "2025-11-29T10:30:00.000Z"
}
```

### Monitoring Queries

Query logs to track migration progress:

```bash
# Count legacy API usage by endpoint
grep "LEGACY_API_USAGE" logs/*.log | wc -l

# Group by leave type
grep "LEGACY_API_USAGE" logs/*.log | grep -o '"leaveType":"[^"]*"' | sort | uniq -c

# Identify users still using legacy API
grep "LEGACY_API_USAGE" logs/*.log | grep -o '"userId":"[^"]*"' | sort | uniq
```

## Benefits of New Architecture

### 1. Separation of Concerns
Each leave type has its own model, controller, and routes, making the codebase more maintainable.

### 2. Type-Specific Validation
Each endpoint validates only the fields relevant to that leave type.

### 3. Specialized Workflows
- Sick leave: Two-step approval (supervisor → doctor)
- Missions: Location and purpose tracking
- Permissions: Time-based tracking
- Overtime: Compensation type tracking
- Vacations: Balance integration

### 4. Better Performance
- Optimized indexes for each model
- Reduced query complexity
- Faster response times

### 5. Improved Developer Experience
- Clear API structure
- Better documentation
- Type safety
- Easier testing

## Support and Questions

For questions or issues during migration:

1. **Documentation:** Review the API documentation for each new endpoint
2. **Migration Scripts:** Data migration scripts are available in `server/scripts/migrations/`
3. **Support:** Contact the development team or open an issue

## Rollback Plan

If critical issues arise:

1. Set `ENABLE_LEGACY_LEAVE=true` to re-enable legacy endpoints
2. Set `ENABLE_NEW_LEAVE_MODELS=false` to disable new endpoints
3. Report issues to the development team
4. Migration will be paused until issues are resolved

## Checklist for Migration

- [ ] Identify all legacy API calls in codebase
- [ ] Update API calls to use new endpoints
- [ ] Update request payloads to match new schemas
- [ ] Update response handling for new structures
- [ ] Test all CRUD operations
- [ ] Test approval workflows
- [ ] Verify error handling
- [ ] Check notification delivery
- [ ] Update API documentation
- [ ] Train users on new UI (if applicable)
- [ ] Monitor logs for errors
- [ ] Remove legacy API calls from codebase

## Timeline Summary

- **Now - 2025-12-01:** Preparation period, both APIs available
- **2025-12-01:** Deprecation announced, warnings added
- **2025-12-01 - 2026-03-01:** Active migration period
- **2026-03-01:** Migration deadline, final warnings
- **2026-06-01:** Legacy endpoints removed (HTTP 410 Gone)

---

**Last Updated:** November 29, 2025  
**Status:** Active Migration Period  
**Next Milestone:** Deprecation Announcement (2025-12-01)
