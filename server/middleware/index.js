/**
 * Middleware Index
 * 
 * Central export point for all middleware modules organized by domain.
 * Import middleware from here for easier management.
 * 
 * Usage Example:
 * ```javascript
 * import { 
 *   protect, 
 *   hrOrAdmin, 
 *   validateLeaveRequest,
 *   calculateDuration,
 *   checkDuplicateAttendance 
 * } from '../middleware/index.js';
 * 
 * // Leave creation route with full validation chain
 * router.post('/leave',
 *   protect,                      // Auth
 *   checkActive,                  // Active employee
 *   validateLeaveRequest,         // Request control
 *   calculateDuration,            // Calculate days
 *   validateVacationBalance,      // Check balance
 *   createLeave                   // Controller
 * );
 * ```
 * 
 * Available Middleware Categories:
 * 
 * 1. AUTHENTICATION & AUTHORIZATION (authMiddleware.js)
 *    - protect, admin, hr, hrOrAdmin, managerOrAbove, supervisorOrAbove
 *    - idCardAdmin, checkRole, checkActive, selfOrAdmin
 * 
 * 2. REQUEST CONTROL (requestControlMiddleware.js)
 *    - validateVacationRequest, validatePermissionRequest
 *    - validateSickLeaveRequest, validateMissionRequest
 *    - validateForgotCheckRequest, validateLeaveRequest
 *    - checkRequestControlStatus, sendRequestControlNotifications
 * 
 * 3. VALIDATION (validationMiddleware.js)
 *    - populateEmployeeFields, validateVacationBalance
 *    - validateMissionFields, validateDateNotPast
 *    - validateOverlappingLeave, validateIDCardData
 *    - validateAttendanceData, validateReportDateRange
 *    - sanitizeInput, validateRequiredFields
 *    NOTE: calculateLeaveDuration, calculatePermissionDuration, 
 *          validateMedicalDocumentation, initializeLeaveWorkflow 
 *          have been removed (duplicates - use leaveMiddleware/permissionMiddleware)
 * 
 * 4. ATTENDANCE (attendanceMiddleware.js)
 *    - validateCheckIn, validateCheckOut
 *    - calculateAttendanceHours, validateWFHRequest
 *    - checkDuplicateAttendance, determineAttendanceStatus
 * 
 * 5. PAYROLL (payrollMiddleware.js)
 *    - validatePayrollPeriod, checkDuplicatePayroll
 *    - validatePayrollAmounts, calculatePayrollTotals
 * 
 * 6. VACATION BALANCE (vacationBalanceMiddleware.js)
 *    - validateSufficientBalance, calculateTenure
 *    - validateCarryOver
 * 
 * 7. ID CARD (idCardMiddleware.js)
 *    - validateIDCardExpiry, checkActiveIDCard
 *    - generateCardNumber, validateBatchCards
 * 
 * 8. ID CARD BATCH (idCardBatchMiddleware.js)
 *    - generateBatchNumber, updateBatchProgress
 * 
 * 9. LEAVE (leaveMiddleware.js)
 *    - populateDepartmentPosition, calculateDuration
 *    - setMedicalDocRequirement, reserveVacationBalance
 *    - initializeWorkflow, handleVacationBalanceUpdate
 *    - createLeaveNotifications
 * 
 * 10. PERMISSION (permissionMiddleware.js)
 *     - calculatePermissionDuration, createPermissionNotification
 * 
 * 11. REPORT (reportMiddleware.js)
 *     - validateReportDateRange, validateReportType
 *     - validateExportFormat, validateReportConfig
 *     - checkReportPermissions, limitReportSize
 * 
 * 12. REPORT EXPORT (reportExportMiddleware.js)
 *     - setReportSubtitle, generateReportFilename
 * 
 * 13. USER (userMiddleware.js)
 *     - checkEmailUnique, checkUsernameUnique
 *     - validateHireDate, validateDateOfBirth
 *     - validatePhoneNumber, validateNationalID
 *     - validatePassword
 * 
 * 14. NOTIFICATION (notificationMiddleware.js)
 *     - validateNotificationRecipient, validateBulkNotification
 *     - checkNotificationPermissions
 * 
 * 15. ANNOUNCEMENT (announcementMiddleware.js)
 *     - validateAnnouncementDates, validateTargetAudience
 *     - setCreatedBy, createAnnouncementNotifications
 * 
 * 16. DEPARTMENT (departmentMiddleware.js)
 *     - checkDepartmentCodeUnique, validateManager
 *     - validateSchool
 * 
 * 17. DOCUMENT (documentMiddleware.js)
 *     - validateFileUpload, validateDocumentEmployee
 *     - setUploadedBy, validateDocumentExpiry
 *     - checkDocumentAccess
 * 
 * 18. DOCUMENT TEMPLATE (documentTemplateMiddleware.js)
 *     - validateTemplateFileType, checkTemplateNameUnique
 *     - setTemplateCreatedBy, validateTemplateFile
 * 
 * 19. EVENT (eventMiddleware.js)
 *     - validateEventDates, setEventCreatedBy
 *     - validateAttendees, createEventNotifications
 *     - validateEventNotPast
 * 
 * 20. POSITION (positionMiddleware.js)
 *     - checkPositionCodeUnique, validatePositionDepartment
 *     - validatePositionDeletion
 * 
 * 21. REQUEST (requestMiddleware.js)
 *     - validateRequestType, validateRequestEmployee
 *     - setRequestEmployee, validateReviewer
 *     - setReviewMetadata, createRequestNotification
 * 
 * 22. SURVEY (surveyMiddleware.js)
 *     - validateSurveyQuestions, setSurveyCreatedBy
 *     - validateSurveyResponse, checkDuplicateResponse
 * 
 * 24. PERMISSION CHECK (permissionCheckMiddleware.js)
 *     - checkPermission, canViewReports, canManagePermissions
 *     - canManageRoles, canViewConfidential, canApproveLeaves
 *     - canManagePayroll, canPrintIDCards, canManageBatches
 *     - canViewAudit, canManageSettings, canManageSecurity
 *     - attachUserPermissions, checkOwnership, resourcePermission
 * 
 * 25. RESIGNED EMPLOYEE (resignedEmployeeMiddleware.js)
 *     - validateResignationDates, validatePenalty
 *     - checkCanModify, validateEmployee, validateResignationType
 * 
 * 26. SECURITY (securityMiddleware.js)
 *     - checkIPWhitelist, checkDevelopmentMode, checkAccountLocked
 *     - checkPasswordExpiration, require2FA, validatePasswordStrength
 *     - checkPasswordHistory, logSecurityEvent, validateSecuritySettings
 *     - validateIPAddress
 * 
 * 27. REPORT (reportMiddleware.js)
 *     - validateReportFields, validateReportFilters, validateReportSchedule
 *     - validateVisualization, validateExportSettings, validateReportType
 *     - checkReportAccess
 * 
 * 28. HOLIDAY (holidayMiddleware.js)
 *     - validateDateFormat, validateCampus, validateHolidayData
 *     - validateWeekendWorkDay, validateSuggestions, validateYear
 *     - validateCountryCode
 * 
 * 29. BACKUP (backupMiddleware.js)
 *     - validateBackupType, validateBackupSchedule, validateEncryption
 *     - validateCompression, validateRetention, validateNotification
 *     - validateSources, validateStorage
 * 
 * 30. MIXED VACATION (mixedVacationMiddleware.js)
 *     - validateDateRange, validateTotalDays, validateDeductionStrategy
 *     - validateApplicableScope, validateEmployeeId, validatePolicyStatus
 *     - checkPolicyExists, checkEmployeeExists
 * 
 * 31. ERROR HANDLING (errorMiddleware.js)
 *     - notFound, errorHandler
 */

// Authentication & Authorization
export * from './authMiddleware.js';

// Request Control
export * from './requestControlMiddleware.js';

// Validation
export * from './validationMiddleware.js';

// Attendance
export * from './attendanceMiddleware.js';

// Payroll
export * from './payrollMiddleware.js';

// Vacation Balance
export * from './vacationBalanceMiddleware.js';

// ID Card
export * from './idCardMiddleware.js';

// Report
export * from './reportMiddleware.js';

// User
export * from './userMiddleware.js';

// Notification
export * from './notificationMiddleware.js';

// ID Card Batch
export * from './idCardBatchMiddleware.js';

// Leave
export * from './leaveMiddleware.js';

// Permission
export * from './permissionMiddleware.js';

// Report Export
export * from './reportExportMiddleware.js';

// Announcement
export * from './announcementMiddleware.js';

// Department
export * from './departmentMiddleware.js';

// Document
export * from './documentMiddleware.js';

// Document Template
export * from './documentTemplateMiddleware.js';

// Event
export * from './eventMiddleware.js';

// Position
export * from './positionMiddleware.js';

// Request
export * from './requestMiddleware.js';

// Survey
export * from './surveyMiddleware.js';

// Permission Check
export * from './permissionCheckMiddleware.js';

// Resigned Employee
export * from './resignedEmployeeMiddleware.js';

// Security
export * from './securityMiddleware.js';

// Holiday
export * from './holidayMiddleware.js';

// Backup
export * from './backupMiddleware.js';

// Mixed Vacation
export * from './mixedVacationMiddleware.js';

// Error Handling
export * from './errorMiddleware.js';
