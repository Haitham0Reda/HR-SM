/**
 * Shared Constants
 * 
 * Constants shared between client and server
 * This file should be imported by both frontend and backend
 */

// ========================================
// MODULES
// ========================================
export const MODULES = {
    HR_CORE: 'hr-core',
    ATTENDANCE: 'attendance',
    LEAVE: 'leave',
    PAYROLL: 'payroll',
    DOCUMENTS: 'documents',
    COMMUNICATION: 'communication',
    REPORTING: 'reporting',
    TASKS: 'tasks'
};

export const MODULE_METADATA = {
    [MODULES.HR_CORE]: {
        name: 'HR Core',
        description: 'Core HR functionality - always enabled',
        locked: true,
        dependencies: []
    },
    [MODULES.ATTENDANCE]: {
        name: 'Attendance & Time Tracking',
        description: 'Track employee attendance and working hours',
        locked: false,
        dependencies: [MODULES.HR_CORE]
    },
    [MODULES.LEAVE]: {
        name: 'Leave Management',
        description: 'Manage employee leave requests and balances',
        locked: false,
        dependencies: [MODULES.HR_CORE]
    },
    [MODULES.PAYROLL]: {
        name: 'Payroll Management',
        description: 'Process payroll and manage compensation',
        locked: false,
        dependencies: [MODULES.HR_CORE, MODULES.ATTENDANCE]
    },
    [MODULES.DOCUMENTS]: {
        name: 'Document Management',
        description: 'Store and manage employee documents',
        locked: false,
        dependencies: [MODULES.HR_CORE]
    },
    [MODULES.COMMUNICATION]: {
        name: 'Communication & Notifications',
        description: 'Internal messaging and notifications',
        locked: false,
        dependencies: [MODULES.HR_CORE]
    },
    [MODULES.REPORTING]: {
        name: 'Reporting & Analytics',
        description: 'Generate reports and analytics',
        locked: false,
        dependencies: [MODULES.HR_CORE]
    },
    [MODULES.TASKS]: {
        name: 'Task & Work Reporting',
        description: 'Task assignment and employee work reporting',
        locked: false,
        dependencies: [MODULES.HR_CORE]
    }
};

// ========================================
// USER ROLES & PERMISSIONS
// ========================================
export const ROLES = {
    ADMIN: 'Admin',
    HR: 'HR',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee'
};

export const ROLE_HIERARCHY = {
    [ROLES.ADMIN]: 4,
    [ROLES.HR]: 3,
    [ROLES.MANAGER]: 2,
    [ROLES.EMPLOYEE]: 1
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

// ========================================
// TASK STATUS & WORKFLOW
// ========================================
export const TASK_STATUS = {
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in-progress',
    SUBMITTED: 'submitted',
    REVIEWED: 'reviewed',
    COMPLETED: 'completed',
    REJECTED: 'rejected'
};

export const TASK_STATUS_TRANSITIONS = {
    [TASK_STATUS.ASSIGNED]: [TASK_STATUS.IN_PROGRESS],
    [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.SUBMITTED],
    [TASK_STATUS.SUBMITTED]: [TASK_STATUS.REVIEWED],
    [TASK_STATUS.REVIEWED]: [TASK_STATUS.COMPLETED, TASK_STATUS.REJECTED],
    [TASK_STATUS.REJECTED]: [TASK_STATUS.IN_PROGRESS],
    [TASK_STATUS.COMPLETED]: []
};

export const REPORT_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

// ========================================
// API STRUCTURE
// ========================================
export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

export const API_ROUTES = {
    HR_CORE: `${API_BASE_PATH}/hr-core`,
    TASKS: `${API_BASE_PATH}/tasks`,
    ATTENDANCE: `${API_BASE_PATH}/attendance`,
    LEAVE: `${API_BASE_PATH}/leave`,
    PAYROLL: `${API_BASE_PATH}/payroll`,
    DOCUMENTS: `${API_BASE_PATH}/documents`,
    COMMUNICATION: `${API_BASE_PATH}/communication`,
    REPORTING: `${API_BASE_PATH}/reporting`
};

// ========================================
// DEPLOYMENT MODES
// ========================================
export const DEPLOYMENT_MODES = {
    SAAS: 'saas',
    ON_PREMISE: 'on-premise'
};

// ========================================
// DEFAULT EXPORT
// ========================================
export default {
    MODULES,
    MODULE_METADATA,
    ROLES,
    ROLE_HIERARCHY,
    REQUEST_STATUS,
    LEAVE_TYPES,
    ATTENDANCE_STATUS,
    DATE_FORMATS,
    PRIORITY_LEVELS,
    TASK_STATUS,
    TASK_STATUS_TRANSITIONS,
    REPORT_STATUS,
    API_VERSION,
    API_BASE_PATH,
    API_ROUTES,
    DEPLOYMENT_MODES
};
