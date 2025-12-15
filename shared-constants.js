/**
 * Shared Constants
 * 
 * Constants shared between client and server
 * This file should be imported by both frontend and backend
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

// Date Formats
export const DATE_FORMATS = {
    ISO: 'YYYY-MM-DD',
    DISPLAY: 'MMM DD, YYYY',
    DATETIME: 'YYYY-MM-DD HH:mm:ss',
};

// Priority Levels
export const PRIORITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
};

const sharedConstants = {
    ROLES,
    REQUEST_STATUS,
    LEAVE_TYPES,
    ATTENDANCE_STATUS,
    DATE_FORMATS,
    PRIORITY_LEVELS,
};

export default sharedConstants;