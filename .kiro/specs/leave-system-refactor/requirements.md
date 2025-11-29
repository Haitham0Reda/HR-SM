# Requirements Document

## Introduction

This specification defines the requirements for refactoring the existing monolithic leave management system into a modular, specialized system with separate models for different types of employee time-off and attendance tracking. The current system uses a single Leave model that handles missions, sick leave, vacations, and other leave types. This refactoring will separate these concerns into dedicated models: Mission, SickLeave, Permissions (late arrival/early departure), Overtime, and Vacation, each with their own controllers, routes, and client-side functionality.

## Glossary

- **Leave System**: The overall employee time-off and attendance management system
- **Mission Model**: A database model representing employee business trips or field assignments
- **SickLeave Model**: A database model representing employee medical leave with doctor approval workflow
- **Permissions Model**: A database model representing late arrivals and early departures
- **Overtime Model**: A database model representing extra working hours beyond regular schedule
- **Vacation Model**: A database model representing various types of paid and unpaid time off (annual, casual, sick, unpaid)
- **Controller**: Server-side logic that handles HTTP requests and business operations
- **Route**: API endpoint definition that maps HTTP requests to controller functions
- **Client Functionality**: Frontend user interface components and services
- **Workflow**: Multi-step approval process for leave requests
- **VacationBalance**: Employee's available leave balance tracking system
- **Employee**: A user with employee role in the system
- **Supervisor**: A user with authority to approve leave requests
- **Doctor**: A user with medical authority to approve sick leave
- **HR**: Human Resources personnel with administrative privileges

## Requirements

### Requirement 1: Mission Model Separation

**User Story:** As an HR administrator, I want missions to be managed separately from other leave types, so that business trips have their own specialized tracking and approval workflow.

#### Acceptance Criteria

1. THE Leave System SHALL create a Mission model with fields for employee reference, start date, end date, location, purpose, related department, supervisor approval status, and timestamps
2. WHEN a mission record is created, THE Leave System SHALL validate that the end date is not before the start date
3. THE Leave System SHALL store mission location as a required text field with maximum 200 characters
4. THE Leave System SHALL store mission purpose as a required text field with maximum 500 characters
5. THE Leave System SHALL reference the related department for the mission
6. THE Leave System SHALL track supervisor approval status with approved timestamp
7. THE Leave System SHALL maintain workflow status indicating current approval step

### Requirement 2: SickLeave Model Separation

**User Story:** As a doctor, I want sick leave requests to be managed in a dedicated model, so that I can efficiently review medical documentation and approve sick leave separately from other requests.

#### Acceptance Criteria

1. THE Leave System SHALL create a SickLeave model with fields for employee reference, start date, end date, duration, reason, medical documentation, workflow status, and approval tracking
2. THE Leave System SHALL require medical documentation for sick leave exceeding 3 days duration
3. WHEN a sick leave is created, THE Leave System SHALL initialize a two-step workflow with supervisor review followed by doctor review
4. THE Leave System SHALL store medical documentation with fields for required status, provided status, document attachments, doctor review status, and doctor notes
5. THE Leave System SHALL allow doctors to request additional medical documentation
6. WHEN supervisor approves sick leave, THE Leave System SHALL advance workflow to doctor review step
7. WHEN doctor approves sick leave, THE Leave System SHALL mark the sick leave as fully approved and complete the workflow

### Requirement 3: Permissions Model Creation

**User Story:** As an employee, I want to request permission for late arrival or early departure, so that my attendance exceptions are properly documented and approved.

#### Acceptance Criteria

1. THE Leave System SHALL create a Permissions model with fields for employee reference, permission type, date, time, duration, reason, and approval status
2. THE Leave System SHALL support permission types of "late-arrival" and "early-departure"
3. THE Leave System SHALL store the specific date for the permission request
4. THE Leave System SHALL store time in HH:MM format for the late arrival or early departure
5. THE Leave System SHALL calculate duration in hours based on the time difference from standard schedule
6. THE Leave System SHALL require a reason text field with maximum 300 characters
7. THE Leave System SHALL track approval status with values of pending, approved, or rejected
8. THE Leave System SHALL store approver reference and approval timestamp when approved

### Requirement 4: Overtime Model Creation

**User Story:** As an employee, I want to log my overtime hours, so that my extra work time is tracked and can be compensated or converted to time off.

#### Acceptance Criteria

1. THE Leave System SHALL create an Overtime model with fields for employee reference, date, start time, end time, duration, reason, approval status, and compensation type
2. THE Leave System SHALL store overtime date as a required field
3. THE Leave System SHALL store start time and end time in HH:MM format
4. THE Leave System SHALL calculate duration in hours from start time to end time
5. THE Leave System SHALL require a reason text field with maximum 300 characters
6. THE Leave System SHALL support compensation types of "paid", "time-off", or "none"
7. THE Leave System SHALL track approval status with values of pending, approved, or rejected
8. THE Leave System SHALL reference the approver and store approval timestamp

### Requirement 5: Vacation Model Creation

**User Story:** As an employee, I want to request different types of vacation leave, so that my annual leave, casual leave, and unpaid leave are properly categorized and tracked against my balance.

#### Acceptance Criteria

1. THE Leave System SHALL create a Vacation model with fields for employee reference, vacation type, start date, end date, duration, reason, status, and vacation balance reference
2. THE Leave System SHALL support vacation types of "annual", "casual", "sick", and "unpaid"
3. WHEN a vacation is created, THE Leave System SHALL validate that end date is not before start date
4. THE Leave System SHALL calculate duration in days from start date to end date
5. THE Leave System SHALL track status with values of pending, approved, rejected, or cancelled
6. THE Leave System SHALL reference the linked vacation balance record for balance deduction tracking
7. THE Leave System SHALL store approver reference and approval timestamp when status changes
8. THE Leave System SHALL allow vacation cancellation with cancellation reason and timestamp

### Requirement 6: Mission Controller and Routes

**User Story:** As a developer, I want dedicated API endpoints for mission management, so that the frontend can perform CRUD operations on missions independently.

#### Acceptance Criteria

1. THE Leave System SHALL create a mission controller with functions for create, read, update, delete, approve, and reject operations
2. THE Leave System SHALL expose a POST route at /api/missions for creating new missions
3. THE Leave System SHALL expose a GET route at /api/missions for retrieving all missions with filtering
4. THE Leave System SHALL expose a GET route at /api/missions/:id for retrieving a single mission
5. THE Leave System SHALL expose a PUT route at /api/missions/:id for updating mission details
6. THE Leave System SHALL expose a DELETE route at /api/missions/:id for deleting missions
7. THE Leave System SHALL expose a POST route at /api/missions/:id/approve for supervisor approval
8. THE Leave System SHALL expose a POST route at /api/missions/:id/reject for supervisor rejection
9. THE Leave System SHALL protect all mission routes with authentication middleware

### Requirement 7: SickLeave Controller and Routes

**User Story:** As a developer, I want dedicated API endpoints for sick leave management, so that the frontend can handle the two-step approval workflow.

#### Acceptance Criteria

1. THE Leave System SHALL create a sick leave controller with functions for create, read, update, delete, supervisor approve, doctor approve, supervisor reject, and doctor reject operations
2. THE Leave System SHALL expose a POST route at /api/sick-leaves for creating new sick leave requests
3. THE Leave System SHALL expose a GET route at /api/sick-leaves for retrieving all sick leaves with filtering
4. THE Leave System SHALL expose a GET route at /api/sick-leaves/pending-doctor-review for doctors to view pending reviews
5. THE Leave System SHALL expose a GET route at /api/sick-leaves/:id for retrieving a single sick leave
6. THE Leave System SHALL expose a POST route at /api/sick-leaves/:id/approve-supervisor for supervisor approval
7. THE Leave System SHALL expose a POST route at /api/sick-leaves/:id/approve-doctor for doctor approval
8. THE Leave System SHALL expose a POST route at /api/sick-leaves/:id/reject-supervisor for supervisor rejection
9. THE Leave System SHALL expose a POST route at /api/sick-leaves/:id/reject-doctor for doctor rejection
10. THE Leave System SHALL protect all sick leave routes with authentication middleware

### Requirement 8: Permissions Controller and Routes

**User Story:** As a developer, I want dedicated API endpoints for permission management, so that employees can request and supervisors can approve late arrivals and early departures.

#### Acceptance Criteria

1. THE Leave System SHALL create a permissions controller with functions for create, read, update, delete, approve, and reject operations
2. THE Leave System SHALL expose a POST route at /api/permissions for creating new permission requests
3. THE Leave System SHALL expose a GET route at /api/permissions for retrieving all permissions with filtering
4. THE Leave System SHALL expose a GET route at /api/permissions/:id for retrieving a single permission
5. THE Leave System SHALL expose a PUT route at /api/permissions/:id for updating permission details
6. THE Leave System SHALL expose a DELETE route at /api/permissions/:id for deleting permissions
7. THE Leave System SHALL expose a POST route at /api/permissions/:id/approve for approval
8. THE Leave System SHALL expose a POST route at /api/permissions/:id/reject for rejection
9. THE Leave System SHALL protect all permission routes with authentication middleware

### Requirement 9: Overtime Controller and Routes

**User Story:** As a developer, I want dedicated API endpoints for overtime management, so that employees can log overtime and supervisors can approve it.

#### Acceptance Criteria

1. THE Leave System SHALL create an overtime controller with functions for create, read, update, delete, approve, and reject operations
2. THE Leave System SHALL expose a POST route at /api/overtime for creating new overtime records
3. THE Leave System SHALL expose a GET route at /api/overtime for retrieving all overtime records with filtering
4. THE Leave System SHALL expose a GET route at /api/overtime/:id for retrieving a single overtime record
5. THE Leave System SHALL expose a PUT route at /api/overtime/:id for updating overtime details
6. THE Leave System SHALL expose a DELETE route at /api/overtime/:id for deleting overtime records
7. THE Leave System SHALL expose a POST route at /api/overtime/:id/approve for approval
8. THE Leave System SHALL expose a POST route at /api/overtime/:id/reject for rejection
9. THE Leave System SHALL protect all overtime routes with authentication middleware

### Requirement 10: Vacation Controller and Routes

**User Story:** As a developer, I want dedicated API endpoints for vacation management, so that the frontend can handle various vacation types with balance tracking.

#### Acceptance Criteria

1. THE Leave System SHALL create a vacation controller with functions for create, read, update, delete, approve, reject, and cancel operations
2. THE Leave System SHALL expose a POST route at /api/vacations for creating new vacation requests
3. THE Leave System SHALL expose a GET route at /api/vacations for retrieving all vacations with filtering
4. THE Leave System SHALL expose a GET route at /api/vacations/:id for retrieving a single vacation
5. THE Leave System SHALL expose a PUT route at /api/vacations/:id for updating vacation details
6. THE Leave System SHALL expose a DELETE route at /api/vacations/:id for deleting vacations
7. THE Leave System SHALL expose a POST route at /api/vacations/:id/approve for approval
8. THE Leave System SHALL expose a POST route at /api/vacations/:id/reject for rejection
9. THE Leave System SHALL expose a POST route at /api/vacations/:id/cancel for cancellation
10. THE Leave System SHALL protect all vacation routes with authentication middleware

### Requirement 11: Client Service Layer Updates

**User Story:** As a frontend developer, I want separate service modules for each leave type, so that I can make API calls with proper type safety and error handling.

#### Acceptance Criteria

1. THE Leave System SHALL create a mission service module with functions for all mission API operations
2. THE Leave System SHALL create a sick leave service module with functions for all sick leave API operations
3. THE Leave System SHALL create a permissions service module with functions for all permission API operations
4. THE Leave System SHALL create an overtime service module with functions for all overtime API operations
5. THE Leave System SHALL create a vacation service module with functions for all vacation API operations
6. WHEN an API call fails, THE Leave System SHALL return error messages with appropriate HTTP status codes
7. THE Leave System SHALL handle authentication tokens in all service API calls

### Requirement 12: Client UI Component Updates

**User Story:** As an employee, I want separate pages or tabs for each leave type, so that I can easily navigate and manage different types of requests.

#### Acceptance Criteria

1. THE Leave System SHALL create or update a missions page component for viewing and managing missions
2. THE Leave System SHALL create or update a sick leave page component for viewing and managing sick leave
3. THE Leave System SHALL create or update a permissions page component for viewing and managing late arrivals and early departures
4. THE Leave System SHALL create or update an overtime page component for viewing and managing overtime
5. THE Leave System SHALL create or update a vacations page component for viewing and managing vacation requests
6. THE Leave System SHALL display appropriate forms for creating each leave type with type-specific fields
7. THE Leave System SHALL display approval workflows visually for sick leave showing supervisor and doctor steps
8. THE Leave System SHALL allow filtering and sorting of records by date, status, and type

### Requirement 13: Data Migration Strategy

**User Story:** As a system administrator, I want existing leave data to be migrated to the new models, so that historical records are preserved and accessible.

#### Acceptance Criteria

1. THE Leave System SHALL provide a migration script that transfers mission records from Leave model to Mission model
2. THE Leave System SHALL provide a migration script that transfers sick leave records from Leave model to SickLeave model
3. THE Leave System SHALL provide a migration script that transfers vacation records from Leave model to Vacation model
4. WHEN migrating records, THE Leave System SHALL preserve all original field values including timestamps
5. WHEN migrating records, THE Leave System SHALL maintain references to related models such as employee, department, and vacation balance
6. THE Leave System SHALL validate migrated data integrity after migration completion
7. THE Leave System SHALL create a backup of the original Leave collection before migration

### Requirement 14: Backward Compatibility

**User Story:** As a system administrator, I want the old Leave model to remain functional during transition, so that the system continues operating while migration is in progress.

#### Acceptance Criteria

1. THE Leave System SHALL maintain the existing Leave model and routes during the transition period
2. WHEN new models are deployed, THE Leave System SHALL support both old and new API endpoints simultaneously
3. THE Leave System SHALL provide a configuration flag to enable or disable legacy endpoints
4. THE Leave System SHALL log warnings when legacy endpoints are accessed
5. THE Leave System SHALL document the deprecation timeline for legacy endpoints
