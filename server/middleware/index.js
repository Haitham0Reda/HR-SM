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
 *     - hashPassword
 * 
 * 14. NOTIFICATION (notificationMiddleware.js)
 *     - validateNotificationRecipient, validateBulkNotification
 *     - checkNotificationPermissions
 * 
 * 15. ERROR HANDLING (errorMiddleware.js)
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

// Error Handling
export * from './errorMiddleware.js';
