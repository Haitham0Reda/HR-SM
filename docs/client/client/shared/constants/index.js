/**
 * Shared constants across hr-app and platform-admin
 */

// API Base URLs
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
export const PLATFORM_API_BASE = `${API_BASE_URL}/api/platform`;
export const TENANT_API_BASE = `${API_BASE_URL}/api/v1`;

// Authentication
export const TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user_data';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

// Date Formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';

// Status Colors
export const STATUS_COLORS = {
    active: 'success',
    inactive: 'default',
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    cancelled: 'default',
    suspended: 'error',
    trial: 'info',
    expired: 'error',
};

// Module Status
export const MODULE_STATUS = {
    ENABLED: 'enabled',
    DISABLED: 'disabled',
    LOADING: 'loading',
    ERROR: 'error',
};

// Tenant Status
export const TENANT_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    TRIAL: 'trial',
    CANCELLED: 'cancelled',
};

// Subscription Status
export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    TRIAL: 'trial',
};

// Platform Roles
export const PLATFORM_ROLES = {
    SUPER_ADMIN: 'super-admin',
    SUPPORT: 'support',
    OPERATIONS: 'operations',
};

// Tenant Roles
export const TENANT_ROLES = {
    ADMIN: 'Admin',
    HR: 'HR',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
};

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.',
    GENERIC_ERROR: 'An error occurred. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
    SAVED: 'Changes saved successfully',
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
};
