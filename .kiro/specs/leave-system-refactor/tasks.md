# Implementation Plan

- [x] 1. Create Mission Model and Infrastructure



  - Create Mission model file with schema, validation, instance methods, static methods, and indexes
  - Implement approval, rejection, and cancellation instance methods
  - Implement static query methods for employee missions, pending missions, active missions, and overlap checking
  - Add compound indexes for performance optimization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 1.1 Write unit tests for Mission model


  - Create test file for Mission model validation, methods, and queries
  - Test schema validation rules (date validation, required fields, string length limits)
  - Test instance methods (approve, reject, cancel)
  - Test static methods (query methods, overlap checking)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Create SickLeave Model and Infrastructure





  - Create SickLeave model file with schema including medical documentation and workflow fields
  - Implement two-step approval workflow (supervisor then doctor)
  - Implement supervisor approval, doctor approval, supervisor rejection, and doctor rejection methods
  - Implement request additional documentation method
  - Add workflow state management and validation
  - Add compound indexes for workflow queries
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 2.1 Write unit tests for SickLeave model


  - Create test file for SickLeave model validation and workflow
  - Test medical documentation requirements (>3 days)
  - Test two-step workflow transitions
  - Test supervisor and doctor approval/rejection methods
  - Test additional documentation request functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Create Permissions Model and Infrastructure





  - Create Permissions model file with schema for late arrival and early departure tracking
  - Implement time-based validation (HH:MM format)
  - Implement duration calculation in hours
  - Implement approval and rejection instance methods
  - Implement static query methods for employee permissions, pending permissions, and date range queries
  - Add indexes for date and employee queries
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3.1 Write unit tests for Permissions model


  - Create test file for Permissions model validation and methods
  - Test permission type validation (late-arrival, early-departure)
  - Test time format validation
  - Test duration calculation
  - Test approval and rejection methods
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4. Create Overtime Model and Infrastructure





  - Create Overtime model file with schema for overtime tracking
  - Implement time range validation (start time to end time)
  - Implement duration calculation in hours
  - Implement compensation type tracking (paid, time-off, none)
  - Implement approval, rejection, and mark compensated methods
  - Implement static query methods for employee overtime, pending overtime, and statistics
  - Add indexes for date and compensation queries
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 4.1 Write unit tests for Overtime model


  - Create test file for Overtime model validation and methods
  - Test time range validation
  - Test duration calculation
  - Test compensation type validation
  - Test approval, rejection, and compensation tracking
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 5. Create Vacation Model and Infrastructure





  - Create Vacation model file with schema for vacation types (annual, casual, sick, unpaid)
  - Implement date range validation
  - Implement duration calculation in days
  - Implement approval, rejection, and cancellation instance methods
  - Implement vacation balance reference tracking
  - Implement static query methods for employee vacations, pending vacations, active vacations, and overlap checking
  - Add compound indexes for vacation type and status queries
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 5.1 Write unit tests for Vacation model


  - Create test file for Vacation model validation and methods
  - Test vacation type validation
  - Test date range and duration validation
  - Test approval, rejection, and cancellation methods
  - Test overlap checking
  - Test vacation balance integration
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 6. Create Mission Controller and Routes





  - Create mission controller file with CRUD operations (create, getAll, getById, update, delete)
  - Implement approve and reject controller functions with permission checks
  - Add role-based authorization (supervisor, HR, admin can approve)
  - Integrate with notification system for status changes
  - Create mission routes file with all endpoints (POST /missions, GET /missions, GET /missions/:id, PUT /missions/:id, DELETE /missions/:id, POST /missions/:id/approve, POST /missions/:id/reject)
  - Add authentication middleware to all routes
  - Add validation middleware for mission creation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [x] 6.1 Write integration tests for Mission API endpoints


  - Create test file for mission routes
  - Test CRUD operations with authentication
  - Test approval and rejection workflows
  - Test permission checks for different roles
  - Test error handling and validation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [x] 7. Create SickLeave Controller and Routes





  - Create sick leave controller file with CRUD operations
  - Implement supervisor approval controller function with workflow advancement
  - Implement doctor approval controller function with final approval
  - Implement supervisor rejection and doctor rejection controller functions
  - Implement get pending doctor review controller function (doctor role only)
  - Add role-based authorization (supervisor for first step, doctor for second step)
  - Integrate with notification system for workflow transitions
  - Create sick leave routes file with all endpoints (POST /sick-leaves, GET /sick-leaves, GET /sick-leaves/pending-doctor-review, GET /sick-leaves/:id, POST /sick-leaves/:id/approve-supervisor, POST /sick-leaves/:id/approve-doctor, POST /sick-leaves/:id/reject-supervisor, POST /sick-leaves/:id/reject-doctor)
  - Add authentication middleware and file upload support for medical documents
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

- [x] 7.1 Write integration tests for SickLeave API endpoints


  - Create test file for sick leave routes
  - Test two-step approval workflow
  - Test supervisor and doctor role permissions
  - Test medical documentation upload
  - Test workflow state transitions
  - Test error handling for invalid workflow states
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

- [x] 8. Create Permissions Controller and Routes





  - Create permissions controller file with CRUD operations
  - Implement approve and reject controller functions
  - Add role-based authorization for approval
  - Integrate with notification system
  - Create permissions routes file with all endpoints (POST /permissions, GET /permissions, GET /permissions/:id, PUT /permissions/:id, DELETE /permissions/:id, POST /permissions/:id/approve, POST /permissions/:id/reject)
  - Add authentication middleware and validation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 8.1 Write integration tests for Permissions API endpoints


  - Create test file for permissions routes
  - Test CRUD operations
  - Test approval and rejection workflows
  - Test time validation
  - Test permission type validation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 9. Create Overtime Controller and Routes





  - Create overtime controller file with CRUD operations
  - Implement approve and reject controller functions
  - Add compensation tracking functionality
  - Add role-based authorization for approval
  - Integrate with notification system
  - Create overtime routes file with all endpoints (POST /overtime, GET /overtime, GET /overtime/:id, PUT /overtime/:id, DELETE /overtime/:id, POST /overtime/:id/approve, POST /overtime/:id/reject)
  - Add authentication middleware and validation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 9.1 Write integration tests for Overtime API endpoints


  - Create test file for overtime routes
  - Test CRUD operations
  - Test approval and rejection workflows
  - Test compensation type validation
  - Test time range validation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 10. Create Vacation Controller and Routes





  - Create vacation controller file with CRUD operations
  - Implement approve, reject, and cancel controller functions
  - Add vacation balance integration for balance checking and deduction
  - Add role-based authorization for approval
  - Integrate with notification system
  - Create vacation routes file with all endpoints (POST /vacations, GET /vacations, GET /vacations/:id, PUT /vacations/:id, DELETE /vacations/:id, POST /vacations/:id/approve, POST /vacations/:id/reject, POST /vacations/:id/cancel)
  - Add authentication middleware and validation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

- [x] 10.1 Write integration tests for Vacation API endpoints


  - Create test file for vacation routes
  - Test CRUD operations
  - Test approval, rejection, and cancellation workflows
  - Test vacation type validation
  - Test vacation balance integration
  - Test overlap checking
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

- [x] 11. Register New Routes in Server





  - Import all new route modules in server index.js or main app file
  - Register mission routes at /api/missions
  - Register sick leave routes at /api/sick-leaves
  - Register permissions routes at /api/permissions
  - Register overtime routes at /api/overtime
  - Register vacation routes at /api/vacations
  - Ensure proper middleware order (authentication, error handling)
  - _Requirements: 6.2, 7.2, 8.2, 9.2, 10.2_

- [x] 12. Create Client Mission Service





  - Create mission.service.js file in client services directory
  - Implement getAll function with query parameter support
  - Implement getById function
  - Implement create function with FormData support for file uploads
  - Implement update function
  - Implement delete function
  - Implement approve function with notes parameter
  - Implement reject function with reason parameter
  - Add error handling and notification event dispatching
  - _Requirements: 11.1, 11.6, 11.7_

- [x] 13. Create Client SickLeave Service





  - Create sickLeave.service.js file in client services directory
  - Implement getAll function with query parameter support
  - Implement getById function
  - Implement create function with FormData support for medical document uploads
  - Implement update function
  - Implement delete function
  - Implement approveBySupervisor function
  - Implement approveByDoctor function
  - Implement rejectBySupervisor function
  - Implement rejectByDoctor function
  - Implement getPendingDoctorReview function
  - Add error handling and notification event dispatching
  - _Requirements: 11.2, 11.6, 11.7_

- [x] 14. Create Client Permissions Service





  - Create permissions.service.js file in client services directory
  - Implement getAll function with query parameter support
  - Implement getById function
  - Implement create function
  - Implement update function
  - Implement delete function
  - Implement approve function with notes parameter
  - Implement reject function with reason parameter
  - Add error handling and notification event dispatching
  - _Requirements: 11.3, 11.6, 11.7_

- [x] 15. Create Client Overtime Service





  - Create overtime.service.js file in client services directory
  - Implement getAll function with query parameter support
  - Implement getById function
  - Implement create function
  - Implement update function
  - Implement delete function
  - Implement approve function with notes parameter
  - Implement reject function with reason parameter
  - Add error handling and notification event dispatching
  - _Requirements: 11.4, 11.6, 11.7_

- [x] 16. Create Client Vacation Service





  - Create vacation.service.js file in client services directory
  - Implement getAll function with query parameter support
  - Implement getById function
  - Implement create function with FormData support for attachments
  - Implement update function
  - Implement delete function
  - Implement approve function with notes parameter
  - Implement reject function with reason parameter
  - Implement cancel function with cancellation reason parameter
  - Add error handling and notification event dispatching
  - _Requirements: 11.5, 11.6, 11.7_

- [x] 17. Create Mission UI Components





  - Create MissionsPage.jsx component with list view, filtering, and sorting
  - Create MissionForm.jsx component with fields for location, purpose, dates, related department
  - Create MissionDetails.jsx component with approval actions and status display
  - Add routing for /missions path
  - Integrate with mission service for API calls
  - Add loading and error states
  - Add form validation for required fields and date ranges
  - _Requirements: 12.1, 12.6, 12.7, 12.8_

- [x] 18. Create SickLeave UI Components





  - Create SickLeavesPage.jsx component with list view, filtering by workflow status
  - Create SickLeaveForm.jsx component with medical documentation upload
  - Create SickLeaveDetails.jsx component with two-step workflow visualization
  - Create DoctorReviewQueue.jsx component for doctors to view pending reviews
  - Add routing for /sick-leaves path
  - Integrate with sick leave service for API calls
  - Add workflow status indicators (supervisor review, doctor review, completed)
  - Add loading and error states
  - _Requirements: 12.2, 12.6, 12.7, 12.8_

- [x] 19. Create Permissions UI Components





  - Create PermissionsPage.jsx component with list view and calendar view option
  - Create PermissionForm.jsx component with permission type selector, date picker, time input
  - Create PermissionDetails.jsx component with approval actions
  - Add routing for /permissions path
  - Integrate with permissions service for API calls
  - Add time format validation (HH:MM)
  - Add loading and error states
  - _Requirements: 12.3, 12.6, 12.7, 12.8_

- [x] 20. Create Overtime UI Components




  - Create OvertimePage.jsx component with list view and monthly summary
  - Create OvertimeForm.jsx component with date, time range, compensation type selector
  - Create OvertimeDetails.jsx component with approval actions and compensation status
  - Add routing for /overtime path
  - Integrate with overtime service for API calls
  - Add time range validation
  - Add loading and error states
  - _Requirements: 12.4, 12.6, 12.7, 12.8_

- [x] 21. Create Vacation UI Components





  - Create VacationsPage.jsx component with list view, filtering by vacation type
  - Create VacationForm.jsx component with vacation type selector, date range picker, balance display
  - Create VacationDetails.jsx component with approval, rejection, and cancellation actions
  - Add routing for /vacations path
  - Integrate with vacation service for API calls
  - Add vacation balance checking before submission
  - Add loading and error states
  - _Requirements: 12.5, 12.6, 12.7, 12.8_

- [x] 22. Update Navigation and Routing










  - Add navigation menu items for Missions, Sick Leaves, Permissions, Overtime, Vacations
  - Update main routing configuration with new paths
  - Add role-based menu visibility (e.g., Doctor Review Queue only for doctors)
  - Update breadcrumbs and page titles
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 23. Create Data Migration Scripts






  - Create migration script to transfer mission-type leaves from Leave model to Mission model
  - Create migration script to transfer sick-type leaves from Leave model to SickLeave model
  - Create migration script to transfer annual/casual/unpaid leaves from Leave model to Vacation model
  - Preserve all original field values, timestamps, and references in migrations
  - Add validation checks after each migration to verify data integrity
  - Create backup script to backup Leave collection before migration
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 23.1 Test migration scripts


  - Create test database with sample leave data
  - Run migration scripts on test data
  - Verify migrated data integrity
  - Test rollback procedures
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_


- [x] 24. Implement Backward Compatibility Features




  - Add feature flags for legacy endpoints and new models in configuration
  - Add deprecation warning headers to legacy Leave endpoints
  - Create configuration file for feature toggles (ENABLE_LEGACY_LEAVE, ENABLE_NEW_LEAVE_MODELS)
  - Add logging for legacy endpoint usage
  - Document deprecation timeline and replacement endpoints
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

