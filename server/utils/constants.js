/**
 * Server Constants
 * 
 * Central location for all server-side constants
 * Provides type-safe constants for the entire application
 */

// User Roles
export const ROLES = {
    ADMIN: 'admin',
    HR: 'hr',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
};

// Request Status
export const REQUEST_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
};

// Leave Types
export const LEAVE_TYPES = {
    SICK: 'sick',
    ANNUAL: 'annual',
    CASUAL: 'casual',
    PERSONAL: 'personal',
    MATERNITY: 'maternity',
    PATERNITY: 'paternity',
    UNPAID: 'unpaid',
    MISSION: 'mission',
};

// Attendance Status
export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    HALF_DAY: 'half-day',
    ON_LEAVE: 'on-leave',
};

// Document Types
export const DOCUMENT_TYPES = {
    CONTRACT: 'contract',
    CERTIFICATE: 'certificate',
    REPORT: 'report',
    POLICY: 'policy',
    FORM: 'form',
    OTHER: 'other',
};

// Notification Types
export const NOTIFICATION_TYPES = {
    LEAVE_REQUEST: 'leave_request',
    LEAVE_APPROVED: 'leave_approved',
    LEAVE_REJECTED: 'leave_rejected',
    PERMISSION_REQUEST: 'permission_request',
    PERMISSION_APPROVED: 'permission_approved',
    PERMISSION_REJECTED: 'permission_rejected',
    ANNOUNCEMENT: 'announcement',
    SURVEY: 'survey',
    DOCUMENT: 'document',
    SYSTEM: 'system',
};

// Priority Levels
export const PRIORITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
};

// Backup Types
export const BACKUP_TYPES = {
    FULL: 'full',
    INCREMENTAL: 'incremental',
    DIFFERENTIAL: 'differential',
};

// Report Types
export const REPORT_TYPES = {
    ATTENDANCE: 'attendance',
    LEAVE: 'leave',
    PAYROLL: 'payroll',
    PERFORMANCE: 'performance',
    CUSTOM: 'custom',
};

// File Upload Limits
export const FILE_LIMITS = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
};

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
};

// Token Expiration
export const TOKEN_EXPIRATION = {
    ACCESS_TOKEN: '2d', // 2 days
    REFRESH_TOKEN: '7d', // 7 days
    RESET_PASSWORD: '1h', // 1 hour
};

// Rate Limiting
export const RATE_LIMITS = {
    GENERAL: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100,
    },
    AUTH: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 5,
    },
};

// Email Configuration
export const EMAIL_CONFIG = {
    FROM_NAME: 'HR Management System',
    TEMPLATES: {
        LEAVE_REQUEST: 'leave_request',
        LEAVE_APPROVAL: 'leave_approval',
        PERMISSION_REQUEST: 'permission_request',
        ANNOUNCEMENT: 'announcement',
        SURVEY: 'survey',
    },
};

// Date Formats
export const DATE_FORMATS = {
    ISO: 'YYYY-MM-DD',
    DISPLAY: 'MMM DD, YYYY',
    DATETIME: 'YYYY-MM-DD HH:mm:ss',
};

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    SERVER_ERROR: 'Internal server error',
    INVALID_CREDENTIALS: 'Invalid credentials',
    TOKEN_EXPIRED: 'Token expired',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
};

// Success Messages
export const SUCCESS_MESSAGES = {
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
};

export default {
    ROLES,
    REQUEST_STATUS,
    LEAVE_TYPES,
    ATTENDANCE_STATUS,
    DOCUMENT_TYPES,
    NOTIFICATION_TYPES,
    PRIORITY_LEVELS,
    BACKUP_TYPES,
    REPORT_TYPES,
    FILE_LIMITS,
    PAGINATION,
    TOKEN_EXPIRATION,
    RATE_LIMITS,
    EMAIL_CONFIG,
    DATE_FORMATS,
    HTTP_STATUS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
};
