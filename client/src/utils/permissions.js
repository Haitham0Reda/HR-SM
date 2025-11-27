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
    
    // Attendance
    'attendance.list',
    'attendance.create',
    'attendance.edit',
    'attendance.delete',
    'attendance.view',
    'attendance.view-own',
    'attendance.reports',
    'attendance.manage',
    'attendance.approve-forget-check',
    'attendance.reject-forget-check',
    'attendance.create-forget-check',
    'attendance.view-forget-check-hr',
    'attendance.view-forget-check-supervisor',
    
    // Departments
    'departments.list',
    'departments.create',
    'departments.edit',
    'departments.delete',
    'departments.view',
    'departments.manage',
    
    // Employees
    'employees.list',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'employees.view',
    'employees.copy-campus',
    'employees.print-credentials',
    'employees.reports',
    'employees.employee-of-month',
    
    // Documents
    'documents.view',
    'documents.view-own',
    'documents.upload',
    'documents.download',
    'documents.approve',
    'documents.bulk-upload',
    'documents.reports',
    'documents.manage',
    'documents.delete',
    
    // Permissions (Leave Permission)
    'permissions.approve',
    'permissions.create',
    'permissions.edit',
    'permissions.delete',
    'permissions.list',
    'permissions.view',
    'permissions.view-own',
    'permissions.reports',
    
    // Positions
    'positions.list',
    'positions.create',
    'positions.edit',
    'positions.delete',
    'positions.view',
    'positions.manage',
    
    // Vacations & Leaves
    'vacations.list',
    'vacations.create',
    'vacations.edit',
    'vacations.delete',
    'vacations.view',
    'vacations.approve',
    'vacations.reports',
    'leaves.view',
    'leaves.view-own',
    'leaves.create',
    'leaves.edit',
    'leaves.delete',
    'leaves.approve',
    'leaves.manage-all',
    
    // Reports
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
    
    // Settings
    'settings.view',
    'settings.edit',
    'settings.reminder-view',
    'settings.security',
    'settings.backup',
    'settings.system',
    
    // Roles & Permissions
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
    'roles.list',
    'roles.assign',
    
    // User Management
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.manage-roles',
    'users.manage-permissions',
    'users.activate',
    'users.deactivate',
    
    // Payroll
    'payroll.view',
    'payroll.view-own',
    'payroll.create',
    'payroll.edit',
    'payroll.delete',
    'payroll.process',
    'payroll.approve',
    
    // Announcements
    'announcements.view',
    'announcements.create',
    'announcements.edit',
    'announcements.delete',
    'announcements.publish',
    
    // Events
    'events.view',
    'events.create',
    'events.edit',
    'events.delete',
    'events.manage-attendees',
    
    // Surveys
    'surveys.view',
    'surveys.create',
    'surveys.edit',
    'surveys.delete',
    'surveys.respond',
    'surveys.view-responses',
    'surveys.publish',
    
    // Notifications
    'notifications.view-own',
    'notifications.create',
    'notifications.manage-all',
    'notifications.send',
    
    // Templates
    'templates.view',
    'templates.create',
    'templates.edit',
    'templates.delete',
    
    // Request Controls
    'request-controls.view',
    'request-controls.manage',
    
    // Audit Logs
    'audit.view',
    'audit.export',
    'audit.delete',
    
    // Backups
    'backups.view',
    'backups.create',
    'backups.restore',
    'backups.delete',
    
    // ID Cards
    'id-cards.view',
    'id-cards.create',
    'id-cards.edit',
    'id-cards.print',
    'id-cards.batch-print',
    'id-cards.manage-batches',
    
    // Hardcopy Management
    'hardcopy.view',
    'hardcopy.create',
    'hardcopy.edit',
    'hardcopy.delete',
    
    // System Administration
    'system.view-logs',
    'system.manage-database',
    'system.manage-security',
    'system.manage-integrations'
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
    'employees.copy-campus',
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
    'payroll.process',
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
    'notifications.manage-all',
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
    'attendance.manage-all',
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
    SYSTEM: {
        label: 'System Administration',
        description: 'Full system control and administration',
        permissions: [
            'system.view-logs',
            'system.manage-database',
            'system.manage-security',
            'system.manage-integrations'
        ],
        adminOnly: true
    },
    BACKUPS: {
        label: 'Backup Management',
        description: 'Database and file backup operations',
        permissions: [
            'backups.view',
            'backups.create',
            'backups.restore',
            'backups.delete'
        ]
    },
    ID_CARDS: {
        label: 'ID Card Management',
        description: 'Employee ID card creation and printing',
        permissions: [
            'id-cards.view',
            'id-cards.create',
            'id-cards.edit',
            'id-cards.print',
            'id-cards.batch-print',
            'id-cards.manage-batches'
        ]
    },
    HARDCOPY: {
        label: 'Hardcopy Management',
        description: 'Physical document tracking',
        permissions: [
            'hardcopy.view',
            'hardcopy.create',
            'hardcopy.edit',
            'hardcopy.delete'
        ]
    },
    DASHBOARD: {
        label: 'Dashboard',
        description: 'Main dashboard access',
        permissions: ['dashboard.view']
    },
    ATTENDANCE: {
        label: 'Attendance Management',
        description: 'Employee attendance tracking and management',
        permissions: [
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
            'attendance.view-own',
            'attendance.view-forget-check-supervisor'
        ]
    },
    DEPARTMENTS: {
        label: 'Department Management',
        description: 'Organizational department management',
        permissions: [
            'departments.list',
            'departments.create',
            'departments.edit',
            'departments.delete',
            'departments.view',
            'departments.manage'
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
            'employees.copy-campus',
            'employees.print-credentials',
            'employees.reports',
            'employees.employee-of-month'
        ]
    },
    DOCUMENTS: {
        label: 'Document Management',
        description: 'Employee document storage and management',
        permissions: [
            'documents.view',
            'documents.upload',
            'documents.download',
            'documents.approve',
            'documents.bulk-upload',
            'documents.reports',
            'documents.manage',
            'documents.view-own',
            'documents.delete'
        ]
    },
    PERMISSIONS: {
        label: 'Leave Permissions',
        description: 'Employee leave permission requests',
        permissions: [
            'permissions.approve',
            'permissions.create',
            'permissions.edit',
            'permissions.list',
            'permissions.view',
            'permissions.reports',
            'permissions.view-own',
            'permissions.delete'
        ]
    },
    POSITIONS: {
        label: 'Position Management',
        description: 'Job position and role definitions',
        permissions: [
            'positions.list',
            'positions.create',
            'positions.edit',
            'positions.delete',
            'positions.view',
            'positions.manage'
        ]
    },
    VACATIONS: {
        label: 'Vacations & Leaves',
        description: 'Employee vacation and leave management',
        permissions: [
            'vacations.list',
            'vacations.create',
            'vacations.edit',
            'vacations.view',
            'vacations.approve',
            'vacations.reports',
            'vacations.delete',
            'leaves.view',
            'leaves.create',
            'leaves.edit',
            'leaves.delete',
            'leaves.approve',
            'leaves.manage-all',
            'leaves.view-own'
        ]
    },
    REPORTS: {
        label: 'Reports & Analytics',
        description: 'System reports and data analytics',
        permissions: [
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
            'reports.employee-of-month'
        ]
    },
    SETTINGS: {
        label: 'System Settings',
        description: 'Application configuration and settings',
        permissions: [
            'settings.view',
            'settings.edit',
            'settings.reminder-view',
            'settings.security',
            'settings.backup',
            'settings.system'
        ]
    },
    ROLES: {
        label: 'Roles & Permissions',
        description: 'User role and permission management',
        permissions: [
            'roles.view',
            'roles.create',
            'roles.edit',
            'roles.delete',
            'roles.list',
            'roles.assign'
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
            'users.manage-roles',
            'users.manage-permissions',
            'users.activate',
            'users.deactivate'
        ]
    },
    PAYROLL: {
        label: 'Payroll Management',
        description: 'Employee payroll and compensation',
        permissions: [
            'payroll.view',
            'payroll.create',
            'payroll.edit',
            'payroll.delete',
            'payroll.process',
            'payroll.approve',
            'payroll.view-own'
        ]
    },
    ANNOUNCEMENTS: {
        label: 'Announcements',
        description: 'Company announcements and communications',
        permissions: [
            'announcements.view',
            'announcements.create',
            'announcements.edit',
            'announcements.delete',
            'announcements.publish'
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
            'surveys.respond',
            'surveys.view-responses',
            'surveys.publish'
        ]
    },
    NOTIFICATIONS: {
        label: 'Notifications',
        description: 'System notifications and alerts',
        permissions: [
            'notifications.view-own',
            'notifications.create',
            'notifications.manage-all',
            'notifications.send'
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
    REQUEST_CONTROLS: {
        label: 'Request Controls',
        description: 'Request workflow and approval settings',
        permissions: [
            'request-controls.view',
            'request-controls.manage'
        ]
    },
    AUDIT: {
        label: 'Audit Logs',
        description: 'System audit trail and logs',
        permissions: [
            'audit.view',
            'audit.export',
            'audit.delete'
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
