# Design Document

## Overview

This design document outlines the architecture and implementation strategy for refactoring the monolithic Leave management system into a modular, specialized system with five distinct models: Mission, SickLeave, Permissions, Overtime, and Vacation. Each model will have dedicated controllers, routes, middleware, and client-side services.

The refactoring maintains backward compatibility during transition while providing a cleaner separation of concerns, improved type safety, and better maintainability. The design leverages existing patterns from the current Leave system including workflow management, approval chains, email notifications, and vacation balance tracking.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                     │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Mission  │  Sick    │Permission│ Overtime │ Vacation │  │
│  │   UI     │ Leave UI │    UI    │    UI    │    UI    │  │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘  │
│       │          │          │          │          │         │
│  ┌────┴──────────┴──────────┴──────────┴──────────┴─────┐  │
│  │              Service Layer (API Clients)             │  │
│  └──────────────────────────┬───────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTP/REST
┌─────────────────────────────┼───────────────────────────────┐
│                     Server Layer (Node.js/Express)          │
│  ┌──────────────────────────┴───────────────────────────┐  │
│  │              Route Layer (API Endpoints)             │  │
│  └────┬─────┬────┬─────┬────┬─────┬────┬─────┬────┬────┘  │
│       │     │    │     │    │     │    │     │    │        │
│  ┌────┴─┐ ┌─┴────┴─┐ ┌─┴────┴─┐ ┌─┴────┴─┐ ┌─┴────┴─┐     │
│  │Mission│ │ Sick  │ │Permiss-│ │Overtime│ │Vacation│     │
│  │ Ctrl  │ │Leave  │ │ion Ctrl│ │  Ctrl  │ │  Ctrl  │     │
│  │       │ │ Ctrl  │ │        │ │        │ │        │     │
│  └───┬───┘ └───┬───┘ └───┬────┘ └───┬────┘ └───┬────┘     │
│      │         │         │          │          │           │
│  ┌───┴─────────┴─────────┴──────────┴──────────┴───────┐  │
│  │              Middleware Layer                        │  │
│  │  (Auth, Validation, Balance, Notifications)          │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────┴───────────────────────────┐  │
│  │              Model Layer (Mongoose)                  │  │
│  │  ┌────────┬─────────┬──────────┬────────┬─────────┐ │  │
│  │  │Mission │SickLeave│Permission│Overtime│Vacation │ │  │
│  │  │ Model  │  Model  │  Model   │ Model  │  Model  │ │  │
│  │  └────────┴─────────┴──────────┴────────┴─────────┘ │  │
│  └──────────────────────────┬───────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────┐
│                        MongoDB Database                     │
│  ┌────────┬─────────┬──────────┬────────┬─────────┬──────┐ │
│  │missions│sickleave│permission│overtime│vacations│ ...  │ │
│  └────────┴─────────┴──────────┴────────┴─────────┴──────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Each leave type has its own model, controller, and routes
2. **Reusability**: Common functionality (auth, validation, notifications) shared via middleware
3. **Consistency**: All models follow similar structure and naming conventions
4. **Backward Compatibility**: Legacy Leave model remains functional during transition
5. **Type Safety**: Clear schema definitions with validation
6. **Scalability**: Modular design allows easy addition of new leave types

## Components and Interfaces

### 1. Mission Model

**Purpose**: Track employee business trips and field assignments with location and purpose tracking.

**Schema Structure**:
```javascript
{
  employee: ObjectId (ref: User, required, indexed),
  startDate: Date (required),
  endDate: Date (required, validated >= startDate),
  startTime: String (HH:MM format),
  endTime: String (HH:MM format),
  duration: Number (in days, required),
  location: String (required, max 200 chars),
  purpose: String (required, max 500 chars),
  relatedDepartment: ObjectId (ref: Department),
  status: String (enum: pending/approved/rejected/cancelled, default: pending),
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  rejectedBy: ObjectId (ref: User),
  rejectedAt: Date,
  rejectionReason: String,
  cancelledBy: ObjectId (ref: User),
  cancelledAt: Date,
  cancellationReason: String,
  approverNotes: String,
  department: ObjectId (ref: Department, indexed, denormalized),
  position: ObjectId (ref: Position, denormalized),
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date
  }],
  notifications: {
    submitted: { sent: Boolean, sentAt: Date },
    approved: { sent: Boolean, sentAt: Date },
    rejected: { sent: Boolean, sentAt: Date }
  },
  timestamps: true
}
```

**Instance Methods**:
- `approve(approverId, notes)`: Approve mission
- `reject(rejecterId, reason)`: Reject mission
- `cancel(userId, reason)`: Cancel mission

**Static Methods**:
- `getMissionsByEmployee(employeeId, filters)`: Get employee's missions
- `getPendingMissions(departmentId)`: Get pending missions for approval
- `getActiveMissions(departmentId)`: Get currently active missions
- `getMissionsByDepartment(departmentId, filters)`: Get department missions
- `hasOverlappingMission(employeeId, startDate, endDate, excludeId)`: Check for overlaps

**Indexes**:
- `{ employee: 1, status: 1 }`
- `{ department: 1, status: 1 }`
- `{ startDate: 1, endDate: 1 }`
- `{ status: 1, createdAt: 1 }`

### 2. SickLeave Model

**Purpose**: Manage medical leave with two-step approval workflow (supervisor → doctor) and medical documentation tracking.

**Schema Structure**:
```javascript
{
  employee: ObjectId (ref: User, required, indexed),
  startDate: Date (required),
  endDate: Date (required, validated >= startDate),
  duration: Number (in days, required),
  reason: String (max 500 chars),
  status: String (enum: pending/approved/rejected/cancelled, default: pending),
  medicalDocumentation: {
    required: Boolean (default: false),
    provided: Boolean (default: false),
    documents: [{
      filename: String,
      url: String,
      uploadedAt: Date,
      uploadedBy: ObjectId (ref: User)
    }],
    reviewedByDoctor: Boolean (default: false),
    doctorReviewedBy: ObjectId (ref: User),
    doctorReviewedAt: Date,
    doctorNotes: String,
    additionalDocRequested: Boolean (default: false),
    requestNotes: String
  },
  workflow: {
    supervisorApprovalStatus: String (enum: pending/approved/rejected, default: pending),
    doctorApprovalStatus: String (enum: pending/approved/rejected/not-required, default: pending),
    currentStep: String (enum: supervisor-review/doctor-review/completed/rejected, default: supervisor-review)
  },
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  rejectedBy: ObjectId (ref: User),
  rejectedAt: Date,
  rejectionReason: String,
  cancelledBy: ObjectId (ref: User),
  cancelledAt: Date,
  cancellationReason: String,
  approverNotes: String,
  vacationBalance: ObjectId (ref: VacationBalance),
  department: ObjectId (ref: Department, indexed, denormalized),
  position: ObjectId (ref: Position, denormalized),
  notifications: {
    submitted: { sent: Boolean, sentAt: Date },
    supervisorApproved: { sent: Boolean, sentAt: Date },
    doctorApproved: { sent: Boolean, sentAt: Date },
    rejected: { sent: Boolean, sentAt: Date }
  },
  timestamps: true
}
```

**Instance Methods**:
- `approveBySupervisor(supervisorId, notes)`: Supervisor approval (moves to doctor review)
- `approveByDoctor(doctorId, notes)`: Doctor approval (final approval)
- `rejectBySupervisor(supervisorId, reason)`: Supervisor rejection
- `rejectByDoctor(doctorId, reason)`: Doctor rejection
- `requestAdditionalDocs(doctorId, requestNotes)`: Request more medical documentation
- `cancel(userId, reason)`: Cancel sick leave

**Static Methods**:
- `getSickLeavesByEmployee(employeeId, filters)`: Get employee's sick leaves
- `getPendingSupervisorReview(departmentId)`: Get sick leaves pending supervisor review
- `getPendingDoctorReview(departmentId)`: Get sick leaves pending doctor review
- `getSickLeavesByDepartment(departmentId, filters)`: Get department sick leaves
- `hasOverlappingSickLeave(employeeId, startDate, endDate, excludeId)`: Check for overlaps

**Indexes**:
- `{ employee: 1, status: 1 }`
- `{ department: 1, status: 1 }`
- `{ 'workflow.currentStep': 1 }`
- `{ 'workflow.supervisorApprovalStatus': 1 }`
- `{ 'workflow.doctorApprovalStatus': 1 }`
- `{ startDate: 1, endDate: 1 }`

### 3. Permissions Model

**Purpose**: Track late arrivals and early departures with time-based tracking.

**Schema Structure**:
```javascript
{
  employee: ObjectId (ref: User, required, indexed),
  permissionType: String (enum: late-arrival/early-departure, required),
  date: Date (required, indexed),
  time: String (HH:MM format, required),
  duration: Number (in hours, required),
  reason: String (required, max 300 chars),
  status: String (enum: pending/approved/rejected, default: pending),
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  rejectedBy: ObjectId (ref: User),
  rejectedAt: Date,
  rejectionReason: String,
  approverNotes: String,
  department: ObjectId (ref: Department, indexed, denormalized),
  position: ObjectId (ref: Position, denormalized),
  notifications: {
    submitted: { sent: Boolean, sentAt: Date },
    approved: { sent: Boolean, sentAt: Date },
    rejected: { sent: Boolean, sentAt: Date }
  },
  timestamps: true
}
```

**Instance Methods**:
- `approve(approverId, notes)`: Approve permission
- `reject(rejecterId, reason)`: Reject permission

**Static Methods**:
- `getPermissionsByEmployee(employeeId, filters)`: Get employee's permissions
- `getPendingPermissions(departmentId)`: Get pending permissions for approval
- `getPermissionsByDepartment(departmentId, filters)`: Get department permissions
- `getPermissionsByDateRange(employeeId, startDate, endDate)`: Get permissions in date range
- `getMonthlyStats(employeeId, year, month)`: Get monthly permission statistics

**Indexes**:
- `{ employee: 1, date: 1 }`
- `{ employee: 1, status: 1 }`
- `{ department: 1, status: 1 }`
- `{ date: 1, status: 1 }`
- `{ permissionType: 1, status: 1 }`

### 4. Overtime Model

**Purpose**: Track extra working hours with compensation type tracking.

**Schema Structure**:
```javascript
{
  employee: ObjectId (ref: User, required, indexed),
  date: Date (required, indexed),
  startTime: String (HH:MM format, required),
  endTime: String (HH:MM format, required),
  duration: Number (in hours, required),
  reason: String (required, max 300 chars),
  compensationType: String (enum: paid/time-off/none, required),
  status: String (enum: pending/approved/rejected, default: pending),
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  rejectedBy: ObjectId (ref: User),
  rejectedAt: Date,
  rejectionReason: String,
  approverNotes: String,
  compensated: Boolean (default: false),
  compensatedAt: Date,
  department: ObjectId (ref: Department, indexed, denormalized),
  position: ObjectId (ref: Position, denormalized),
  notifications: {
    submitted: { sent: Boolean, sentAt: Date },
    approved: { sent: Boolean, sentAt: Date },
    rejected: { sent: Boolean, sentAt: Date }
  },
  timestamps: true
}
```

**Instance Methods**:
- `approve(approverId, notes)`: Approve overtime
- `reject(rejecterId, reason)`: Reject overtime
- `markCompensated()`: Mark overtime as compensated

**Static Methods**:
- `getOvertimeByEmployee(employeeId, filters)`: Get employee's overtime records
- `getPendingOvertime(departmentId)`: Get pending overtime for approval
- `getOvertimeByDepartment(departmentId, filters)`: Get department overtime
- `getOvertimeByDateRange(employeeId, startDate, endDate)`: Get overtime in date range
- `getMonthlyStats(employeeId, year, month)`: Get monthly overtime statistics
- `getTotalUncompensatedHours(employeeId)`: Get total uncompensated hours

**Indexes**:
- `{ employee: 1, date: 1 }`
- `{ employee: 1, status: 1 }`
- `{ department: 1, status: 1 }`
- `{ date: 1, status: 1 }`
- `{ compensationType: 1, compensated: 1 }`

### 5. Vacation Model

**Purpose**: Manage various types of vacation leave (annual, casual, sick, unpaid) with balance tracking.

**Schema Structure**:
```javascript
{
  employee: ObjectId (ref: User, required, indexed),
  vacationType: String (enum: annual/casual/sick/unpaid, required),
  startDate: Date (required),
  endDate: Date (required, validated >= startDate),
  startTime: String (HH:MM format),
  endTime: String (HH:MM format),
  duration: Number (in days, required),
  reason: String (max 500 chars),
  status: String (enum: pending/approved/rejected/cancelled, default: pending),
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  rejectedBy: ObjectId (ref: User),
  rejectedAt: Date,
  rejectionReason: String,
  cancelledBy: ObjectId (ref: User),
  cancelledAt: Date,
  cancellationReason: String,
  approverNotes: String,
  vacationBalance: ObjectId (ref: VacationBalance),
  department: ObjectId (ref: Department, indexed, denormalized),
  position: ObjectId (ref: Position, denormalized),
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date
  }],
  notifications: {
    submitted: { sent: Boolean, sentAt: Date },
    approved: { sent: Boolean, sentAt: Date },
    rejected: { sent: Boolean, sentAt: Date },
    reminder: { sent: Boolean, sentAt: Date }
  },
  timestamps: true
}
```

**Instance Methods**:
- `approve(approverId, notes)`: Approve vacation
- `reject(rejecterId, reason)`: Reject vacation
- `cancel(userId, reason)`: Cancel vacation

**Static Methods**:
- `getVacationsByEmployee(employeeId, filters)`: Get employee's vacations
- `getPendingVacations(departmentId)`: Get pending vacations for approval
- `getActiveVacations(departmentId)`: Get currently active vacations
- `getVacationsByDepartment(departmentId, filters)`: Get department vacations
- `hasOverlappingVacation(employeeId, startDate, endDate, excludeId)`: Check for overlaps
- `getVacationStats(departmentId, year)`: Get vacation statistics

**Indexes**:
- `{ employee: 1, status: 1 }`
- `{ employee: 1, vacationType: 1 }`
- `{ department: 1, status: 1 }`
- `{ startDate: 1, endDate: 1 }`
- `{ vacationType: 1, status: 1 }`
- `{ vacationBalance: 1 }`

## Data Models

### Shared Field Patterns

All models share common patterns for consistency:

**Approval Tracking**:
```javascript
{
  status: String (enum),
  approvedBy: ObjectId,
  approvedAt: Date,
  rejectedBy: ObjectId,
  rejectedAt: Date,
  rejectionReason: String,
  approverNotes: String
}
```

**Denormalized References** (for query performance):
```javascript
{
  department: ObjectId (ref: Department),
  position: ObjectId (ref: Position)
}
```

**Notification Tracking**:
```javascript
{
  notifications: {
    submitted: { sent: Boolean, sentAt: Date },
    approved: { sent: Boolean, sentAt: Date },
    rejected: { sent: Boolean, sentAt: Date }
  }
}
```

**Timestamps**:
```javascript
{
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### Validation Rules

**Date Validation**:
- End date must be >= start date
- Dates cannot be in the past (except for overtime and permissions)
- Duration must be calculated and validated

**Time Validation**:
- Time format: HH:MM (24-hour)
- End time must be after start time for same-day records

**String Validation**:
- Reason fields: max 300-500 chars depending on type
- Location: max 200 chars
- Rejection reason: min 10 chars, required when rejecting

**Reference Validation**:
- Employee must exist and be active
- Department and position must match employee's current assignment
- Approver must have appropriate role

## Error Handling

### Error Response Format

All API endpoints return consistent error responses:

```javascript
{
  error: "Error message",
  details: [  // Optional, for validation errors
    {
      field: "fieldName",
      message: "Specific error message"
    }
  ]
}
```

### HTTP Status Codes

- `200 OK`: Successful GET, PUT operations
- `201 Created`: Successful POST operations
- `400 Bad Request`: Validation errors, invalid data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side errors

### Error Scenarios

**Mission Errors**:
- Overlapping missions for same employee
- Invalid location or purpose
- Missing required fields

**SickLeave Errors**:
- Medical documentation required but not provided (>3 days)
- Doctor approval attempted before supervisor approval
- Invalid workflow state transition

**Permissions Errors**:
- Permission request for future date beyond allowed range
- Duplicate permission for same date and type
- Invalid time format

**Overtime Errors**:
- Overtime date in future
- Invalid time range (end before start)
- Missing compensation type

**Vacation Errors**:
- Insufficient vacation balance
- Overlapping vacation requests
- Invalid vacation type

## Testing Strategy

### Unit Tests

**Model Tests** (for each model):
- Schema validation
- Instance method functionality
- Static method queries
- Virtual properties
- Pre/post hooks

**Controller Tests** (for each controller):
- CRUD operations
- Approval/rejection logic
- Permission checks
- Error handling
- Response formatting

**Middleware Tests**:
- Authentication
- Authorization
- Validation
- Balance calculation
- Notification creation

### Integration Tests

**API Endpoint Tests** (for each route):
- Request/response cycle
- Authentication flow
- Authorization checks
- Database operations
- Error responses

**Workflow Tests**:
- Sick leave two-step approval
- Mission approval flow
- Vacation balance deduction
- Notification sending

### Test Data

**Test Users**:
- Employee (basic user)
- Supervisor (can approve most requests)
- Doctor (can approve sick leave)
- HR (can approve all requests)
- Admin (full access)

**Test Scenarios**:
- Happy path (successful creation and approval)
- Validation failures
- Permission denials
- Workflow state transitions
- Overlapping requests
- Balance insufficiency

### Test Coverage Goals

- Models: 90%+ coverage
- Controllers: 85%+ coverage
- Routes: 85%+ coverage
- Middleware: 90%+ coverage

## Migration Strategy

### Phase 1: Model Creation (Week 1)

1. Create new models (Mission, SickLeave, Permissions, Overtime, Vacation)
2. Add indexes and validation
3. Write unit tests for models
4. Deploy models to staging

### Phase 2: Controller and Route Creation (Week 2)

1. Create controllers for each model
2. Create route files with all endpoints
3. Add middleware integration
4. Write controller and route tests
5. Deploy to staging

### Phase 3: Client Service Layer (Week 3)

1. Create service modules for each leave type
2. Update API client configuration
3. Add error handling
4. Write service tests
5. Deploy to staging

### Phase 4: Client UI Updates (Week 4)

1. Create/update page components for each leave type
2. Add forms with type-specific fields
3. Update navigation and routing
4. Add workflow visualization
5. Deploy to staging

### Phase 5: Data Migration (Week 5)

1. Create migration scripts
2. Backup existing Leave collection
3. Run migration in staging
4. Validate migrated data
5. Test all functionality with migrated data

### Phase 6: Production Deployment (Week 6)

1. Deploy new models, controllers, routes to production
2. Run data migration in production
3. Monitor for errors
4. Keep legacy endpoints active
5. Gradual rollout to users

### Phase 7: Legacy Deprecation (Week 8+)

1. Add deprecation warnings to legacy endpoints
2. Monitor usage of legacy endpoints
3. Communicate deprecation timeline
4. Remove legacy endpoints after grace period

### Migration Scripts

**Script 1: Migrate Missions**
```javascript
// Migrate mission-type leaves to Mission model
// Preserve all fields, references, and timestamps
```

**Script 2: Migrate Sick Leaves**
```javascript
// Migrate sick-type leaves to SickLeave model
// Preserve workflow state and medical documentation
```

**Script 3: Migrate Vacations**
```javascript
// Migrate annual/casual/unpaid leaves to Vacation model
// Preserve balance references
```

**Script 4: Validation**
```javascript
// Validate all migrated records
// Check reference integrity
// Verify counts match
```

## Backward Compatibility

### Dual Endpoint Support

During transition period, both old and new endpoints will be active:

**Legacy Endpoints** (to be deprecated):
- `POST /api/leaves`
- `GET /api/leaves`
- `GET /api/leaves/:id`
- `PUT /api/leaves/:id`
- `DELETE /api/leaves/:id`
- `POST /api/leaves/:id/approve`
- `POST /api/leaves/:id/reject`

**New Endpoints**:
- Mission: `/api/missions/*`
- SickLeave: `/api/sick-leaves/*`
- Permissions: `/api/permissions/*`
- Overtime: `/api/overtime/*`
- Vacation: `/api/vacations/*`

### Configuration Flag

```javascript
// config/features.js
export const FEATURES = {
  LEGACY_LEAVE_ENDPOINTS: process.env.ENABLE_LEGACY_LEAVE === 'true',
  NEW_LEAVE_MODELS: process.env.ENABLE_NEW_LEAVE_MODELS === 'true'
};
```

### Deprecation Warnings

Legacy endpoints will return deprecation headers:
```
X-Deprecated: true
X-Deprecation-Date: 2026-03-01
X-Sunset: 2026-06-01
X-Replacement: /api/missions, /api/sick-leaves, /api/vacations
```

## Performance Considerations

### Database Indexes

All models include strategic indexes for common query patterns:
- Employee + status (for user dashboards)
- Department + status (for manager views)
- Date ranges (for reports)
- Workflow states (for approval queues)

### Query Optimization

- Use `.lean()` for read-only queries
- Populate only required fields
- Implement pagination for list endpoints
- Cache frequently accessed data (department lists, user roles)

### Denormalization

Department and position are denormalized in all models to avoid joins on every query. These fields are updated via middleware when employee assignments change.

## Security Considerations

### Authentication

All endpoints require valid JWT token via `protect` middleware.

### Authorization

Role-based access control:
- **Employee**: Can create own requests, view own records
- **Supervisor**: Can approve requests for their department
- **Doctor**: Can approve sick leave after supervisor approval
- **HR**: Can approve all request types, view all records
- **Admin**: Full access to all operations

### Data Validation

- Input sanitization for all text fields
- SQL injection prevention (Mongoose handles this)
- XSS prevention (sanitize HTML in text fields)
- File upload validation (type, size limits)

### Audit Trail

All approval/rejection actions are logged with:
- Who performed the action
- When it was performed
- What reason was provided
- Previous state and new state

## Notification System

### Email Notifications

Each model integrates with the existing email notification system:

**Notification Events**:
- Request submitted → Notify supervisor/approver
- Request approved → Notify employee
- Request rejected → Notify employee with reason
- Additional docs requested (sick leave) → Notify employee
- Reminder for pending approvals → Notify approver

**Notification Templates**:
- Mission request notification
- Sick leave request notification
- Permission request notification
- Overtime request notification
- Vacation request notification
- Approval notification
- Rejection notification

### In-App Notifications

Integration with existing notification system:
- Create notification record on status change
- Dispatch `notificationUpdate` event to client
- Update notification badge count

## Client Architecture

### Service Layer Structure

```
client/src/services/
├── mission.service.js
├── sickLeave.service.js
├── permissions.service.js
├── overtime.service.js
├── vacation.service.js
└── api.js (shared axios instance)
```

Each service module exports:
```javascript
{
  getAll(params),
  getById(id),
  create(data),
  update(id, data),
  delete(id),
  approve(id, notes),
  reject(id, reason),
  // Type-specific methods
}
```

### UI Component Structure

```
client/src/pages/
├── missions/
│   ├── MissionsPage.jsx
│   ├── MissionForm.jsx
│   └── MissionDetails.jsx
├── sick-leaves/
│   ├── SickLeavesPage.jsx
│   ├── SickLeaveForm.jsx
│   ├── SickLeaveDetails.jsx
│   └── DoctorReviewQueue.jsx
├── permissions/
│   ├── PermissionsPage.jsx
│   ├── PermissionForm.jsx
│   └── PermissionDetails.jsx
├── overtime/
│   ├── OvertimePage.jsx
│   ├── OvertimeForm.jsx
│   └── OvertimeDetails.jsx
└── vacations/
    ├── VacationsPage.jsx
    ├── VacationForm.jsx
    └── VacationDetails.jsx
```

### Routing

```javascript
// App.jsx or routes configuration
<Route path="/missions" element={<MissionsPage />} />
<Route path="/sick-leaves" element={<SickLeavesPage />} />
<Route path="/permissions" element={<PermissionsPage />} />
<Route path="/overtime" element={<OvertimePage />} />
<Route path="/vacations" element={<VacationsPage />} />
```

### State Management

Each page component manages its own state:
- List of records
- Loading states
- Error states
- Filter/sort preferences
- Selected record for details view

### Form Validation

Client-side validation before API calls:
- Required fields
- Date range validation
- Time format validation
- String length limits
- File type and size validation

## Dependencies

### Server Dependencies

Existing dependencies (no new packages required):
- `mongoose`: Database ORM
- `express`: Web framework
- `jsonwebtoken`: Authentication
- `multer`: File uploads
- `nodemailer`: Email notifications

### Client Dependencies

Existing dependencies (no new packages required):
- `react`: UI framework
- `react-router-dom`: Routing
- `axios`: HTTP client
- `date-fns` or `moment`: Date formatting

## Deployment Considerations

### Environment Variables

```
# Feature flags
ENABLE_LEGACY_LEAVE=true
ENABLE_NEW_LEAVE_MODELS=true

# Migration settings
MIGRATION_BATCH_SIZE=100
MIGRATION_DRY_RUN=false
```

### Database Migrations

- Run migrations during low-traffic periods
- Use transactions where possible
- Implement rollback capability
- Monitor migration progress
- Validate data after migration

### Rollback Plan

If issues arise after deployment:
1. Disable new endpoints via feature flag
2. Re-enable legacy endpoints
3. Investigate and fix issues
4. Re-deploy with fixes
5. Resume migration

### Monitoring

Monitor key metrics:
- API response times
- Error rates by endpoint
- Database query performance
- Migration progress
- User adoption of new endpoints
