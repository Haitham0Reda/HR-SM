/**
 * Application Constants
 * Central location for all application-wide constants
 */

// Import shared constants
import {
    ROLES,
    LEAVE_TYPES,
    REQUEST_STATUS,
    ATTENDANCE_STATUS,
    PRIORITY_LEVELS,
    DATE_FORMATS as SHARED_DATE_FORMATS
} from '../shared-constants.js';

// Re-export shared constants
export { ROLES, LEAVE_TYPES, REQUEST_STATUS, ATTENDANCE_STATUS, PRIORITY_LEVELS };

// Layout Constants
export const DRAWER_WIDTH = 305;
export const MINI_DRAWER_WIDTH = 64;
export const APP_NAME = 'HR SM';

// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const API_TIMEOUT = 30000; // 30 seconds

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

// Date Formats (client-specific display formats)
export const DATE_FORMAT = SHARED_DATE_FORMATS.ISO;
export const DATETIME_FORMAT = SHARED_DATE_FORMATS.DATETIME;
export const DISPLAY_DATE_FORMAT = SHARED_DATE_FORMATS.DISPLAY;
export const DISPLAY_DATETIME_FORMAT = 'MMM DD, YYYY HH:mm';

// File Upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Local Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',
    USER_DATA: 'userData',
    THEME: 'theme',
    LANGUAGE: 'language',
    SIDEBAR_STATE: 'sidebarState',
};

// Export theme constants
export * from './theme';
