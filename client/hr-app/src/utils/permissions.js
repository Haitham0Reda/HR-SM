/**
 * Permission Constants and Utilities
 * Defines all system permissions and provides helper functions for permission checks
 * 
 * ADMIN ROLE:
 * - Has ALL permissions by default (full system access)
 * - Can assign ANY permission to ANY role
 * - Can create custom roles with any combination of permissions
 * - Cannot have permissions restricted
 */

// All Available System Permissions
// Admin has access to ALL of these by default
export const ALL_PERMISSIONS = [
    // Dashboard
    'dashboard.view',
    'dashboard.admin-view',
    
    // User Management
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.list',
    'users.manage-roles',
    'users.manage-permissions',
    'users.forgot-password-manage',
    
    // Employee Management
    'employees.list',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'employees.view',
    'employees.import',
    'employees.export',
    'employees.print-credentials',
    'employees.reports',
    'employees.status-change',
    'employees.employee-of-month',
    'employees.position-repair',
    'employees.bulk-edit',
    'employees.admin-edit',
    'employees.birthday-validation-edit',
    'employees.birthday-validation-view',
    'employees.photo-management-edit',
    'employees.photo-management-view',
    'employees.supervision-management-edit',
    'employees.supervision-management-view',
    'employees.management-hub-view',
    
    // Department Management
    'departments.view',
    'departments.create',
    'departments.edit',
    'departments.delete',
    'departments.list',
    'departments.manage',
    'departments.statistics-view',
    
    // Position Management
    'positions.view',
    'positions.create',
    'positions.edit',
    'positions.delete',
    'positions.list',
    'positions.manage',
    
    // Section Management
    'sections.view',
    'sections.create',
    'sections.edit',
    'sections.delete',
    'sections.list',
    'sections.manage',
    
    // Removed business management - not needed for general HR system
    
    // Leave Management
    'leaves.view',
    'leaves.view-own',
    'leaves.create',
    'leaves.edit',
    'leaves.delete',
    'leaves.approve',
    'leaves.manage-all',
    
    // Permission Requests
    'permissions.view',
    'permissions.view-own',
    'permissions.create',
    'permissions.edit',
    'permissions.delete',
    'permissions.list',
    'permissions.approve',
    'permissions.reports',
    'permissions.request',
    
    // Attendance Management
    'attendance.view',
    'attendance.view-own',
    'attendance.create',
    'attendance.edit',
    'attendance.delete',
    'attendance.list',
    'attendance.manage',
    'attendance.reports',
    
    // Forgot Check (Attendance)
    'forgot-check.view',
    'forgot-check.create',
    'forgot-check.approve',
    'forgot-check.reject',
    'forgot-check.view-hr',
    'forgot-check.view-supervisor',
    
    // Payroll Management
    'payroll.view',
    'payroll.view-own',
    'payroll.create',
    'payroll.edit',
    'payroll.delete',
    'payroll.list',
    'payroll.upload',
    'payroll.download',
    'payroll.manage',
    'payroll.history-view',
    
    // Vacation Management
    'vacations.view',
    'vacations.create',
    'vacations.edit',
    'vacations.delete',
    'vacations.list',
    'vacations.approve',
    'vacations.reports',
    'vacations.request',
    'vacations.manage',
    
    // Sick Leave Management
    'sickleave.view',
    'sickleave.create',
    'sickleave.edit',
    'sickleave.delete',
    'sickleave.list',
    'sickleave.approve',
    'sickleave.reports',
    'sickleave.manage',
    
    // Document Management
    'documents.view',
    'documents.view-own',
    'documents.upload',
    'documents.download',
    'documents.edit',
    'documents.delete',
    'documents.approve',
    'documents.bulk-upload',
    'documents.reports',
    'documents.manage',
    'documents.view-confidential',
    'documents.documentation-view',
    
    // Document Templates
    'templates.view',
    'templates.create',
    'templates.edit',
    'templates.delete',
    
    // Announcements
    'announcements.view',
    'announcements.create',
    'announcements.edit',
    'announcements.delete',
    
    // Event Management
    'events.view',
    'events.create',
    'events.edit',
    'events.delete',
    'events.list',
    'events.manage',
    'events.manage-attendees',
    
    // Survey Management
    'surveys.view',
    'surveys.create',
    'surveys.edit',
    'surveys.delete',
    'surveys.list',
    'surveys.respond',
    'surveys.view-responses',
    'surveys.statistics',
    
    // Notification Management
    'notifications.view-own',
    'notifications.create',
    'notifications.manage',
    'notifications.send',
    'notifications.center-view',
    
    // Email Communication
    'email.view',
    'email.create',
    'email.send',
    'email.logs-view',
    'email.report-send',
    
    // ID Card Management
    'id-cards.view',
    'id-cards.create',
    'id-cards.edit',
    'id-cards.delete',
    'id-cards.print',
    'id-cards.batch-print',
    'id-cards.manage-batches',
    'id-cards.logs',
    'id-cards.export',
    'id-cards.email',
    
    // Photo Management
    'photos.view',
    'photos.upload',
    'photos.download',
    'photos.delete',
    'photos.bulk-upload',
    'photos.cleanup',
    'photos.migrate',
    'photos.manage',
    
    // Reports
    'reports.view',
    'reports.view-own',
    'reports.create',
    'reports.export',
    'reports.configure',
    'reports.generate',
    'reports.schedule',
    'reports.daily-attendance',
    'reports.weekly-attendance',
    'reports.today-attendance',
    'reports.department-attendance',
    'reports.employee-attendance',
    'reports.sickleave-requests',
    'reports.late-early-departure',
    'reports.pending-requests',
    'reports.permission-requests',
    'reports.vacation-requests',
    'reports.documentation',
    'reports.id-card-logs',
    'reports.email-logs',
    'reports.custom-builder',
    'reports.audit-logs',
    'reports.reminder-settings',
    'reports.employee-deductions',
    'reports.comprehensive-deduction',
    'reports.employee-status',
    'reports.employee-tenure',
    'reports.forgot-check',
    
    // Custom Reports
    'custom-reports.view',
    'custom-reports.create',
    'custom-reports.edit',
    'custom-reports.delete',
    
    // Removed organization management - not needed for general HR system
    
    // Request Controls
    'request-controls.view',
    'request-controls.manage',
    
    // Reminder Settings
    'reminder-settings.view',
    'reminder-settings.edit',
    
    // Settings Management
    'settings.view',
    'settings.edit',
    'settings.manage',
    'settings.security',
    'settings.security-view',
    'settings.security-manage',
    
    // Security Management
    'security.ip-whitelist-edit',
    'security.logs-view',
    'security.session-terminate',
    
    // Role Management
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
    'roles.list',
    'roles.manage',
    
    // Audit Logs
    'audit.view',
    'audit.export',
    
    // System Administration
    'system.view-logs',
    'system.logs-view',
    'system.logs-clear',
    'system.logs-hub-view',
    'system.backup',
    'system.restore',
    'system.maintenance',
    'system.status-view',
    'system.administration-hub-view',
    
    // Backup Management
    'backups.manage',
    
    // Cache Management
    'cache.clear',
    
    // Data Management
    'data.management-hub-view',
    'data.import',
    'data.export',
    'data.bulk-operations',
    
    // Active Directory
    'ad.password-management',
    'ad.user-list',
    'ad.user-create',
    'ad.user-edit',
    'ad.user-delete',
    'ad.user-view',
    
    // Admin Tools
    'admin-tools.unused-departments-positions-edit',
    'admin-tools.unused-departments-positions-view',
    
    // Advanced Features
    'advanced.license-manage',
    'advanced.schedule-manage',
    
    // Issue Management
    'issues.view',
    'issues.create',
    'issues.list',
    'tickets.view',
    'tickets.list',
    
    // Resigned Management
    'resigned.view',
    'resigned.manage',
    'resigned.print'
];

// Admin Permissions (ALL PERMISSIONS)
// Admin has unrestricted access to the entire system
export const ADMIN_PERMISSIONS = [...ALL_PERMISSIONS];

// HR Role Permissions (98 permissions)
export const HR_PERMISSIONS = [
    // Dashboard
    'dashboard.view',
    
    // Attendance (11 permissions)
    'attendance.list',
    'attendance.create',
    'attendance.edit',
    'attendance.delete',
    'attendance.view',
    'attendance.reports',
    'attendance.manage',
    'attendance.approve-forget-check',
    'attendance.reject-forget-check',
    'attendance.create-forget-check',
    'attendance.view-forget-check-hr',
    
    // Departments (6 permissions)
    'departments.list',
    'departments.create',
    'departments.edit',
    'departments.delete',
    'departments.view',
    'departments.manage',
    
    // Employees (7 permissions)
    'employees.list',
    'employees.create',
    'employees.edit',
    'employees.view',
    'employees.print-credentials',
    'employees.reports',
    
    // Documents (7 permissions)
    'documents.view',
    'documents.upload',
    'documents.download',
    'documents.approve',
    'documents.bulk-upload',
    'documents.reports',
    'documents.manage',
    
    // Permissions (Leave Permission) (6 permissions)
    'permissions.approve',
    'permissions.create',
    'permissions.edit',
    'permissions.list',
    'permissions.view',
    'permissions.reports',
    
    // Positions (6 permissions)
    'positions.list',
    'positions.create',
    'positions.edit',
    'positions.delete',
    'positions.view',
    'positions.manage',
    
    // Vacations (6 permissions)
    'vacations.list',
    'vacations.create',
    'vacations.edit',
    'vacations.view',
    'vacations.approve',
    'vacations.reports',
    
    // Reports (20+ permissions)
    'reports.daily-attendance',
    'reports.weekly-attendance',
    'reports.department-attendance',
    'reports.employee-attendance',
    'reports.sick-leave',
    'reports.early-departure',
    'reports.late-departure',
    'reports.pending-requests',
    'reports.permission-requests',
    'reports.vacation-requests',
    'reports.documentation',
    'reports.id-card-logs',
    'reports.email-logs',
    'reports.custom-builder',
    'reports.audit-logs',
    'reports.reminder-settings',
    'reports.view',
    'reports.create',
    'reports.export',
    'reports.configure',
    'reports.employee-of-month',
    
    // Settings (3 permissions)
    'settings.view',
    'settings.edit',
    'settings.reminder-view',
    
    // Roles (3 permissions)
    'roles.view',
    'roles.edit',
    'roles.list',
    
    // Additional HR permissions
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.manage-roles',
    'users.manage-permissions',
    'leaves.view',
    'leaves.create',
    'leaves.edit',
    'leaves.delete',
    'leaves.approve',
    'leaves.manage-all',
    'payroll.view',
    'payroll.create',
    'payroll.edit',
    'payroll.delete',
    'payroll.manage',
    'announcements.view',
    'announcements.create',
    'announcements.edit',
    'announcements.delete',
    'events.view',
    'events.create',
    'events.edit',
    'events.delete',
    'events.manage-attendees',
    'surveys.view',
    'surveys.create',
    'surveys.edit',
    'surveys.delete',
    'surveys.respond',
    'surveys.view-responses',
    'notifications.view-own',
    'notifications.create',
    'notifications.manage',
    'templates.view',
    'templates.create',
    'templates.edit',
    'templates.delete',
    'request-controls.view',
    'request-controls.manage',
    'audit.view',
    'audit.export'
];

// Manager Permissions
export const MANAGER_PERMISSIONS = [
    // Employee permissions
    'leaves.view-own',
    'leaves.create',
    'permissions.view-own',
    'permissions.create',
    'attendance.view-own',
    'payroll.view-own',
    'documents.view-own',
    'documents.upload',
    'announcements.view',
    'events.view',
    'surveys.view',
    'surveys.respond',
    'notifications.view-own',
    'templates.view',
    'departments.view',
    'positions.view',
    // Manager-specific permissions
    'users.view',
    'leaves.view',
    'leaves.approve',
    'permissions.view',
    'permissions.approve',
    'attendance.view',
    'attendance.manage',
    'payroll.view',
    'documents.view',
    'documents.edit',
    'reports.view',
    'reports.create',
    'reports.export',
    'events.create',
    'events.edit',
    'events.manage-attendees'
];

// Employee Permissions
export const EMPLOYEE_PERMISSIONS = [
    'leaves.view-own',
    'leaves.create',
    'permissions.view-own',
    'permissions.create',
    'attendance.view-own',
    'payroll.view-own',
    'documents.view-own',
    'documents.upload',
    'announcements.view',
    'events.view',
    'surveys.view',
    'surveys.respond',
    'notifications.view-own',
    'templates.view',
    'departments.view',
    'positions.view'
];

// Permission Categories for UI Organization
// Admin can assign any of these permissions to any role
export const PERMISSION_CATEGORIES = {
    DASHBOARD: {
        label: 'Dashboard',
        description: 'Dashboard access and views',
        permissions: [
            'dashboard.view',
            'dashboard.admin-view'
        ]
    },
    USERS: {
        label: 'User Management',
        description: 'User account management',
        permissions: [
            'users.view',
            'users.create',
            'users.edit',
            'users.delete',
            'users.list',
            'users.manage-roles',
            'users.manage-permissions',
            'users.forgot-password-manage'
        ]
    },
    EMPLOYEES: {
        label: 'Employee Management',
        description: 'Employee records and information management',
        permissions: [
            'employees.list',
            'employees.create',
            'employees.edit',
            'employees.delete',
            'employees.view',
            'employees.import',
            'employees.export',
            'employees.print-credentials',
            'employees.reports',
            'employees.status-change',
            'employees.employee-of-month',
            'employees.position-repair',
            'employees.bulk-edit',
            'employees.admin-edit',
            'employees.birthday-validation-edit',
            'employees.birthday-validation-view',
            'employees.photo-management-edit',
            'employees.photo-management-view',
            'employees.supervision-management-edit',
            'employees.supervision-management-view',
            'employees.management-hub-view'
        ]
    },
    DEPARTMENTS: {
        label: 'Department Management',
        description: 'Organizational department management',
        permissions: [
            'departments.view',
            'departments.create',
            'departments.edit',
            'departments.delete',
            'departments.list',
            'departments.manage',
            'departments.statistics-view'
        ]
    },
    POSITIONS: {
        label: 'Position Management',
        description: 'Job position and role definitions',
        permissions: [
            'positions.view',
            'positions.create',
            'positions.edit',
            'positions.delete',
            'positions.list',
            'positions.manage'
        ]
    },
    SECTIONS: {
        label: 'Section Management',
        description: 'Section organization and management',
        permissions: [
            'sections.view',
            'sections.create',
            'sections.edit',
            'sections.delete',
            'sections.list',
            'sections.manage'
        ]
    },
    // MAJORS section removed - not needed for general HR system
    LEAVES: {
        label: 'Leave Management',
        description: 'Employee leave requests and approvals',
        permissions: [
            'leaves.view',
            'leaves.view-own',
            'leaves.create',
            'leaves.edit',
            'leaves.delete',
            'leaves.approve',
            'leaves.manage-all'
        ]
    },
    PERMISSIONS: {
        label: 'Permission Requests',
        description: 'Employee permission requests',
        permissions: [
            'permissions.view',
            'permissions.view-own',
            'permissions.create',
            'permissions.edit',
            'permissions.delete',
            'permissions.list',
            'permissions.approve',
            'permissions.reports',
            'permissions.request'
        ]
    },
    ATTENDANCE: {
        label: 'Attendance Management',
        description: 'Employee attendance tracking and management',
        permissions: [
            'attendance.view',
            'attendance.view-own',
            'attendance.create',
            'attendance.edit',
            'attendance.delete',
            'attendance.list',
            'attendance.manage',
            'attendance.reports'
        ]
    },
    FORGOT_CHECK: {
        label: 'Forgot Check',
        description: 'Forgot check-in/out request management',
        permissions: [
            'forgot-check.view',
            'forgot-check.create',
            'forgot-check.approve',
            'forgot-check.reject',
            'forgot-check.view-hr',
            'forgot-check.view-supervisor'
        ]
    },
    PAYROLL: {
        label: 'Payroll Management',
        description: 'Employee payroll and compensation',
        permissions: [
            'payroll.view',
            'payroll.view-own',
            'payroll.create',
            'payroll.edit',
            'payroll.delete',
            'payroll.list',
            'payroll.upload',
            'payroll.download',
            'payroll.manage',
            'payroll.history-view'
        ]
    },
    VACATIONS: {
        label: 'Vacation Management',
        description: 'Employee vacation requests and management',
        permissions: [
            'vacations.view',
            'vacations.create',
            'vacations.edit',
            'vacations.delete',
            'vacations.list',
            'vacations.approve',
            'vacations.reports',
            'vacations.request',
            'vacations.manage'
        ]
    },
    SICKLEAVE: {
        label: 'Sick Leave Management',
        description: 'Sick leave tracking and management',
        permissions: [
            'sickleave.view',
            'sickleave.create',
            'sickleave.edit',
            'sickleave.delete',
            'sickleave.list',
            'sickleave.approve',
            'sickleave.reports',
            'sickleave.manage'
        ]
    },
    DOCUMENTS: {
        label: 'Document Management',
        description: 'Employee document storage and management',
        permissions: [
            'documents.view',
            'documents.view-own',
            'documents.upload',
            'documents.download',
            'documents.edit',
            'documents.delete',
            'documents.approve',
            'documents.bulk-upload',
            'documents.reports',
            'documents.manage',
            'documents.view-confidential',
            'documents.documentation-view'
        ]
    },
    TEMPLATES: {
        label: 'Document Templates',
        description: 'Document template management',
        permissions: [
            'templates.view',
            'templates.create',
            'templates.edit',
            'templates.delete'
        ]
    },
    ANNOUNCEMENTS: {
        label: 'Announcements',
        description: 'Company announcements and communications',
        permissions: [
            'announcements.view',
            'announcements.create',
            'announcements.edit',
            'announcements.delete'
        ]
    },
    EVENTS: {
        label: 'Event Management',
        description: 'Company events and calendar',
        permissions: [
            'events.view',
            'events.create',
            'events.edit',
            'events.delete',
            'events.list',
            'events.manage',
            'events.manage-attendees'
        ]
    },
    SURVEYS: {
        label: 'Survey Management',
        description: 'Employee surveys and feedback',
        permissions: [
            'surveys.view',
            'surveys.create',
            'surveys.edit',
            'surveys.delete',
            'surveys.list',
            'surveys.respond',
            'surveys.view-responses',
            'surveys.statistics'
        ]
    },
    NOTIFICATIONS: {
        label: 'Notification Management',
        description: 'System notifications and alerts',
        permissions: [
            'notifications.view-own',
            'notifications.create',
            'notifications.manage',
            'notifications.send',
            'notifications.center-view'
        ]
    },
    EMAIL: {
        label: 'Email Communication',
        description: 'Email communication and logs',
        permissions: [
            'email.view',
            'email.create',
            'email.send',
            'email.logs-view',
            'email.report-send'
        ]
    },
    ID_CARDS: {
        label: 'ID Card Management',
        description: 'Employee ID card creation and printing',
        permissions: [
            'id-cards.view',
            'id-cards.create',
            'id-cards.edit',
            'id-cards.delete',
            'id-cards.print',
            'id-cards.batch-print',
            'id-cards.manage-batches',
            'id-cards.logs',
            'id-cards.export',
            'id-cards.email'
        ]
    },
    PHOTOS: {
        label: 'Photo Management',
        description: 'Employee photo management',
        permissions: [
            'photos.view',
            'photos.upload',
            'photos.download',
            'photos.delete',
            'photos.bulk-upload',
            'photos.cleanup',
            'photos.migrate',
            'photos.manage'
        ]
    },
    REPORTS: {
        label: 'Reports & Analytics',
        description: 'System reports and data analytics',
        permissions: [
            'reports.view',
            'reports.view-own',
            'reports.create',
            'reports.export',
            'reports.configure',
            'reports.generate',
            'reports.schedule',
            'reports.daily-attendance',
            'reports.weekly-attendance',
            'reports.today-attendance',
            'reports.department-attendance',
            'reports.employee-attendance',
            'reports.sickleave-requests',
            'reports.late-early-departure',
            'reports.pending-requests',
            'reports.permission-requests',
            'reports.vacation-requests',
            'reports.documentation',
            'reports.id-card-logs',
            'reports.email-logs',
            'reports.custom-builder',
            'reports.audit-logs',
            'reports.reminder-settings',
            'reports.employee-deductions',
            'reports.comprehensive-deduction',
            'reports.employee-status',
            'reports.employee-tenure',
            'reports.forgot-check'
        ]
    },
    CUSTOM_REPORTS: {
        label: 'Custom Reports',
        description: 'Custom report builder',
        permissions: [
            'custom-reports.view',
            'custom-reports.create',
            'custom-reports.edit',
            'custom-reports.delete'
        ]
    },

    // organizationS section removed - not needed for general HR system
    REQUEST_CONTROLS: {
        label: 'Request Controls',
        description: 'Request workflow and approval settings',
        permissions: [
            'request-controls.view',
            'request-controls.manage'
        ]
    },
    REMINDER_SETTINGS: {
        label: 'Reminder Settings',
        description: 'System reminder configuration',
        permissions: [
            'reminder-settings.view',
            'reminder-settings.edit'
        ]
    },
    SETTINGS: {
        label: 'Settings Management',
        description: 'Application configuration and settings',
        permissions: [
            'settings.view',
            'settings.edit',
            'settings.manage',
            'settings.security',
            'settings.security-view',
            'settings.security-manage'
        ]
    },
    SECURITY: {
        label: 'Security Management',
        description: 'Security and access control',
        permissions: [
            'security.ip-whitelist-edit',
            'security.logs-view',
            'security.session-terminate'
        ]
    },
    ROLES: {
        label: 'Role Management',
        description: 'User role and permission management',
        permissions: [
            'roles.view',
            'roles.create',
            'roles.edit',
            'roles.delete',
            'roles.list',
            'roles.manage'
        ]
    },
    AUDIT: {
        label: 'Audit Logs',
        description: 'System audit trail and logs',
        permissions: [
            'audit.view',
            'audit.export'
        ]
    },
    SYSTEM: {
        label: 'System Administration',
        description: 'Full system control and administration',
        permissions: [
            'system.view-logs',
            'system.logs-view',
            'system.logs-clear',
            'system.logs-hub-view',
            'system.backup',
            'system.restore',
            'system.maintenance',
            'system.status-view',
            'system.administration-hub-view'
        ]
    },
    BACKUPS: {
        label: 'Backup Management',
        description: 'Database and file backup operations',
        permissions: [
            'backups.manage'
        ]
    },
    CACHE: {
        label: 'Cache Management',
        description: 'System cache management',
        permissions: [
            'cache.clear'
        ]
    },
    DATA: {
        label: 'Data Management',
        description: 'Data import, export, and operations',
        permissions: [
            'data.management-hub-view',
            'data.import',
            'data.export',
            'data.bulk-operations'
        ]
    },
    ACTIVE_DIRECTORY: {
        label: 'Active Directory',
        description: 'Active Directory integration and management',
        permissions: [
            'ad.password-management',
            'ad.user-list',
            'ad.user-create',
            'ad.user-edit',
            'ad.user-delete',
            'ad.user-view'
        ]
    },
    ADMIN_TOOLS: {
        label: 'Admin Tools',
        description: 'Administrative utilities and tools',
        permissions: [
            'admin-tools.unused-departments-positions-edit',
            'admin-tools.unused-departments-positions-view'
        ]
    },
    ADVANCED: {
        label: 'Advanced Features',
        description: 'Advanced system features',
        permissions: [
            'advanced.license-manage',
            'advanced.schedule-manage'
        ]
    },
    ISSUES: {
        label: 'Issue Management',
        description: 'Issue and ticket tracking',
        permissions: [
            'issues.view',
            'issues.create',
            'issues.list',
            'tickets.view',
            'tickets.list'
        ]
    },
    RESIGNED: {
        label: 'Resigned Management',
        description: 'Resigned employee management',
        permissions: [
            'resigned.view',
            'resigned.manage',
            'resigned.print'
        ]
    }
};

/**
 * Get all available permissions in the system
 * Admin can assign any of these to any role
 * @returns {Array} - Array of all permission strings
 */
export const getAllAvailablePermissions = () => {
    return [...ALL_PERMISSIONS];
};

/**
 * Get permissions grouped by category
 * Useful for permission assignment UI
 * @returns {Object} - Permission categories with descriptions
 */
export const getPermissionCategories = () => {
    return { ...PERMISSION_CATEGORIES };
};

/**
 * Get default permissions by role
 * Admin can override these and assign custom permissions to any role
 * @param {string} role - User role
 * @returns {Array} - Array of permission strings
 */
export const getPermissionsByRole = (role) => {
    switch (role) {
        case 'admin':
            // Admin has ALL permissions - cannot be restricted
            return ADMIN_PERMISSIONS;
        case 'hr':
            return HR_PERMISSIONS;
        case 'manager':
            return MANAGER_PERMISSIONS;
        case 'employee':
            return EMPLOYEE_PERMISSIONS;
        default:
            return [];
    }
};

/**
 * Check if a role can be assigned custom permissions
 * Admin role cannot have permissions modified
 * @param {string} role - User role
 * @returns {boolean} - Whether role can have custom permissions
 */
export const canRoleHaveCustomPermissions = (role) => {
    return role !== 'admin';
};

/**
 * Check if user can assign permissions to roles
 * Only admins can assign permissions
 * @param {Object} user - User object
 * @returns {boolean} - Whether user can assign permissions
 */
export const canAssignPermissions = (user) => {
    if (!user) return false;
    return user.role === 'admin' || hasPermission(user, 'roles.assign');
};

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with role and permissions
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has permission
 */
export const hasPermission = (user, permission) => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check if user has the specific permission
    const userPermissions = user.permissions || getPermissionsByRole(user.role);
    return userPermissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - User object with role and permissions
 * @param {Array} permissions - Array of permissions to check
 * @returns {boolean} - Whether user has any of the permissions
 */
export const hasAnyPermission = (user, permissions) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {Object} user - User object with role and permissions
 * @param {Array} permissions - Array of permissions to check
 * @returns {boolean} - Whether user has all of the permissions
 */
export const hasAllPermissions = (user, permissions) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Get user's permission categories
 * @param {Object} user - User object with role and permissions
 * @returns {Object} - Object with categories as keys and boolean values
 */
export const getUserPermissionCategories = (user) => {
    if (!user) return {};
    
    const result = {};
    Object.entries(PERMISSION_CATEGORIES).forEach(([key, category]) => {
        result[key] = hasAnyPermission(user, category.permissions);
    });
    
    return result;
};

export default {
    ALL_PERMISSIONS,
    ADMIN_PERMISSIONS,
    HR_PERMISSIONS,
    MANAGER_PERMISSIONS,
    EMPLOYEE_PERMISSIONS,
    PERMISSION_CATEGORIES,
    getAllAvailablePermissions,
    getPermissionCategories,
    getPermissionsByRole,
    canRoleHaveCustomPermissions,
    canAssignPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissionCategories
};
