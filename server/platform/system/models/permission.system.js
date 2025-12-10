/**
 * Permission System Configuration
 * 
 * Defines all system permissions and role-based defaults
 * 
 * OVERVIEW:
 * This system implements Role-Based Access Control (RBAC) with granular permission overrides.
 * 
 * KEY FEATURES:
 * 1. Role-Based Permissions: Each role has default permissions
 * 2. Permission Overrides: Add or remove permissions per user
 * 3. Audit Trail: All permission changes are logged
 * 4. Flexible Control: Mix of role-based and custom permissions
 * 
 * ROLES:
 * - admin: Full system access (all permissions)
 * - employee: Basic access to own data
 * - hr: HR management functions
 * - manager: Team and department management
 * - id-card-admin: ID card operations only
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Check permission in route:
 *    import { checkPermission } from '../middleware/index.js';
 *    router.get('/reports', protect, checkPermission('reports.view'), getReports);
 * 
 * 2. Check multiple permissions (any):
 *    router.post('/payroll', protect, checkPermission(['payroll.create', 'payroll.edit']), ...);
 * 
 * 3. Check multiple permissions (all required):
 *    router.put('/settings', protect, checkPermission(['settings.view', 'settings.edit'], {requireAll: true}), ...);
 * 
 * 4. Resource-specific permissions:
 *    import { resourcePermission } from '../middleware/index.js';
 *    router.get('/leaves', protect, resourcePermission('leaves', 'view'), getLeaves);
 *    // This will check 'leaves.view' or 'leaves.view-own' and filter accordingly
 * 
 * 5. Check permission in code:
 *    const hasAccess = await req.user.hasPermission('documents.view-confidential');
 *    const permissions = await req.user.getEffectivePermissions();
 * 
 * 6. Add/Remove permissions:
 *    POST /api/permissions/user/:userId/add
 *    { permissions: ['reports.export', 'audit.view'], reason: 'Temporary access for audit' }
 * 
 * DOCUMENTATION ACCESS CONTROL:
 * - Restricted to users with 'reports.view' permission
 * - By default: Admin, HR, and Manager roles
 * - Employee and ID Card Admin roles: NO ACCESS
 * - Can be overridden per user using permission management
 * 
 * SECURITY NOTES:
 * - All permission changes are logged in PermissionAudit
 * - Permission overrides require 'users.manage-permissions'
 * - Role changes require 'users.manage-roles'
 * - IP and user agent tracked for audit
 */

// System Permissions
export const PERMISSIONS = {
    // Dashboard
    'dashboard.view': 'Dashboard View',
    'dashboard.admin-view': 'Admin Dashboard View',

    // User Management
    'users.view': 'View Users',
    'users.create': 'User Create',
    'users.edit': 'User Edit',
    'users.delete': 'User Delete',
    'users.list': 'User List',
    'users.manage-roles': 'Manage Roles',
    'users.manage-permissions': 'User Permissions',
    'users.forgot-password-manage': 'Forgot Password Manage',

    // Employee Management
    'employees.list': 'Employee List',
    'employees.create': 'Employee Create',
    'employees.edit': 'Employee Edit',
    'employees.delete': 'Employee Delete',
    'employees.view': 'View Employees',
    'employees.import': 'Employee Import',
    'employees.export': 'Employee Export',

    'employees.print-credentials': 'Employee Print Credentials',
    'employees.reports': 'Employee Reports',
    'employees.status-change': 'Employee Status Change',
    'employees.employee-of-month': 'Employee Of Month Manage',
    'employees.position-repair': 'Employee Position Repair',
    'employees.bulk-edit': 'Employee Bulk Edit',
    'employees.admin-edit': 'Employee Admin Edit',
    'employees.birthday-validation-edit': 'Birthday Validation Edit',
    'employees.birthday-validation-view': 'Birthday Validation View',
    'employees.photo-management-edit': 'Photo Management Edit',
    'employees.photo-management-view': 'Photo Management View',
    'employees.supervision-management-edit': 'Supervision Management Edit',
    'employees.supervision-management-view': 'Supervision Management View',
    'employees.management-hub-view': 'Employee Management Hub View',

    // Department Management
    'departments.view': 'View Departments',
    'departments.create': 'Department Create',
    'departments.edit': 'Department Edit',
    'departments.delete': 'Department Delete',
    'departments.list': 'Department List',
    'departments.manage': 'Manage Departments',
    'departments.statistics-view': 'Department Statistics View',

    // Position Management
    'positions.view': 'View Positions',
    'positions.create': 'Position Create',
    'positions.edit': 'Position Edit',
    'positions.delete': 'Position Delete',
    'positions.list': 'Position List',
    'positions.manage': 'Manage Positions',

    // Section Management
    'sections.view': 'View Sections',
    'sections.create': 'Section Create',
    'sections.edit': 'Section Edit',
    'sections.delete': 'Section Delete',
    'sections.list': 'Section List',
    'sections.manage': 'Manage Sections',

    // Major Management (Academic)
    'majors.view': 'Major View',
    'majors.create': 'Major Create',
    'majors.edit': 'Major Edit',
    'majors.delete': 'Major Delete',
    'majors.list': 'Major List',

    // Leave Management
    'leaves.view': 'View leaves',
    'leaves.view-own': 'View own leaves',
    'leaves.create': 'Create leave requests',
    'leaves.edit': 'Edit leave requests',
    'leaves.delete': 'Delete leave requests',
    'leaves.approve': 'Approve leave requests',
    'leaves.manage-all': 'Manage all leave requests',

    // Permission Requests
    'permissions.view': 'View Permissions',
    'permissions.view-own': 'View own permission requests',
    'permissions.create': 'Permission Create',
    'permissions.edit': 'Permission Edit',
    'permissions.delete': 'Permission Delete',
    'permissions.list': 'Permission List',
    'permissions.approve': 'Permission Approve',
    'permissions.reports': 'Permission Reports',
    'permissions.request': 'Request Permission',

    // Attendance
    'attendance.view': 'View Attendance',
    'attendance.view-own': 'View Own Attendance',
    'attendance.create': 'Attendance Create',
    'attendance.edit': 'Attendance Edit',
    'attendance.delete': 'Attendance Delete',
    'attendance.list': 'Attendance List',
    'attendance.manage': 'Manage Attendance',
    'attendance.reports': 'Attendance Reports',

    // Forgot Check (Attendance)
    'forgot-check.view': 'View Forgot Check Requests',
    'forgot-check.create': 'Create Forgot Check Requests',
    'forgot-check.approve': 'Approve Forgot Check Requests',
    'forgot-check.reject': 'Reject Forgot Check Requests',
    'forgot-check.view-hr': 'View Hr Forgot Check Requests',
    'forgot-check.view-supervisor': 'View Supervisor Forgot Check Requests',

    // Payroll Management
    'payroll.view': 'Payroll View',
    'payroll.view-own': 'View Own Payroll',
    'payroll.create': 'Payroll Create',
    'payroll.edit': 'Payroll Edit',
    'payroll.delete': 'Payroll Delete',
    'payroll.list': 'Payroll List',
    'payroll.upload': 'Payroll Upload',
    'payroll.download': 'Payroll Download',
    'payroll.manage': 'Manage Payroll',
    'payroll.history-view': 'View Payroll History',

    // Vacation Management
    'vacations.view': 'View Vacations',
    'vacations.create': 'Vacation Create',
    'vacations.edit': 'Vacation Edit',
    'vacations.delete': 'Vacation Delete',
    'vacations.list': 'Vacation List',
    'vacations.approve': 'Vacation Approve',
    'vacations.reports': 'Vacation Reports',
    'vacations.request': 'Request Vacation',
    'vacations.manage': 'Manage Vacations',

    // Sick Leave Management
    'sickleave.view': 'View Sickleave',
    'sickleave.create': 'Sickleave Create',
    'sickleave.edit': 'Sickleave Edit',
    'sickleave.delete': 'Sickleave Delete',
    'sickleave.list': 'Sickleave List',
    'sickleave.approve': 'Sickleave Approve',
    'sickleave.reports': 'Sickleave Reports',
    'sickleave.manage': 'Manage Sickleave',

    // Documents
    'documents.view': 'View Documents',
    'documents.view-own': 'View own documents',
    'documents.upload': 'Document Upload',
    'documents.download': 'Document Download',
    'documents.edit': 'Edit documents',
    'documents.delete': 'Delete documents',
    'documents.approve': 'Document Approve',
    'documents.bulk-upload': 'Document Bulk Upload',
    'documents.reports': 'Document Report',
    'documents.manage': 'Manage Documents',
    'documents.view-confidential': 'View confidential documents',
    'documents.documentation-view': 'Documentation View',

    // Document Templates
    'templates.view': 'View document templates',
    'templates.create': 'Create document templates',
    'templates.edit': 'Edit document templates',
    'templates.delete': 'Delete document templates',

    // Announcements
    'announcements.view': 'View announcements',
    'announcements.create': 'Create announcements',
    'announcements.edit': 'Edit announcements',
    'announcements.delete': 'Delete announcements',

    // Events
    'events.view': 'View Events',
    'events.create': 'Event Create',
    'events.edit': 'Event Edit',
    'events.delete': 'Event Delete',
    'events.list': 'Event List',
    'events.manage': 'Manage Events',
    'events.manage-attendees': 'Manage event attendees',

    // Surveys
    'surveys.view': 'Survey View',
    'surveys.create': 'Survey Create',
    'surveys.edit': 'Survey Edit',
    'surveys.delete': 'Survey Delete',
    'surveys.list': 'Survey List',
    'surveys.respond': 'Employee Survey Take',
    'surveys.view-responses': 'Survey Responses',
    'surveys.statistics': 'Survey Statistics',

    // Notifications
    'notifications.view-own': 'View own notifications',
    'notifications.create': 'Notification Create',
    'notifications.manage': 'Notification Manage',
    'notifications.send': 'Notification Send',
    'notifications.center-view': 'Notification Center View',

    // Email Communication
    'email.view': 'Email Communication View',
    'email.create': 'Email Communication Create',
    'email.send': 'Email Communication Send',
    'email.logs-view': 'View Email Logs',
    'email.report-send': 'Report Email',

    // ID Card Management
    'id-cards.view': 'View ID cards',
    'id-cards.create': 'Create ID cards',
    'id-cards.edit': 'Edit ID cards',
    'id-cards.delete': 'Delete ID cards',
    'id-cards.print': 'Id Card Print',
    'id-cards.batch-print': 'Batch print ID cards',
    'id-cards.manage-batches': 'Manage ID card batches',
    'id-cards.logs': 'Id Card Logs',
    'id-cards.export': 'Id Card Export',
    'id-cards.email': 'Id Card Email',

    // Photo Management
    'photos.view': 'Photo View',
    'photos.upload': 'Photo Upload',
    'photos.download': 'Photo Download',
    'photos.delete': 'Photo Delete',
    'photos.bulk-upload': 'Photo Bulk Upload',
    'photos.cleanup': 'Photo Cleanup',
    'photos.migrate': 'Photo Migrate',
    'photos.manage': 'Photo Management',

    // Reports
    'reports.view': 'View Reports',
    'reports.view-own': 'View Own Reports',
    'reports.create': 'Report Create',
    'reports.export': 'Report Export',
    'reports.configure': 'Configure reports',
    'reports.generate': 'Report Generate',
    'reports.schedule': 'Report Schedule',
    'reports.daily-attendance': 'Report Daily Attendance',
    'reports.weekly-attendance': 'Report Weekly Attendance',
    'reports.today-attendance': 'Report Today Attendance',
    'reports.department-attendance': 'Report Department Attendance',
    'reports.employee-attendance': 'Report Employee Attendance',
    'reports.sickleave-requests': 'Report Sickleave Requests',
    'reports.late-early-departure': 'Report Late Early Departure',
    'reports.pending-requests': 'Report Pending Requests',
    'reports.permission-requests': 'Report Permission Requests',
    'reports.vacation-requests': 'Report Vacation Requests',
    'reports.documentation': 'Report Documentation',
    'reports.id-card-logs': 'Report Id Card Logs',
    'reports.email-logs': 'Report Email Logs',
    'reports.custom-builder': 'Report Custom Builder',
    'reports.audit-logs': 'Report Audit Logs',
    'reports.reminder-settings': 'Report Reminder Settings',
    'reports.employee-deductions': 'Report Employee Deductions',
    'reports.comprehensive-deduction': 'Report Comprehensive Deduction',
    'reports.employee-status': 'Report Employee Status',
    'reports.employee-tenure': 'Report Employee Tenure',
    'reports.forgot-check': 'Report Forgot Check',

    // Custom Reports
    'custom-reports.view': 'Custom Reports View',
    'custom-reports.create': 'Custom Reports Create',
    'custom-reports.edit': 'Custom Reports Edit',
    'custom-reports.delete': 'Custom Reports Delete',


    // School Management
    'schools.view': 'View schools',
    'schools.create': 'Create schools',
    'schools.edit': 'Edit schools',
    'schools.delete': 'Delete schools',

    // Request Controls
    'request-controls.view': 'View request controls',
    'request-controls.manage': 'Manage request controls',

    // Reminder Settings
    'reminder-settings.view': 'Reminder Settings View',
    'reminder-settings.edit': 'Reminder Settings Edit',

    // System Settings
    'settings.view': 'View Settings',
    'settings.edit': 'Setting Edit',
    'settings.manage': 'Manage Settings',
    'settings.security': 'Security Settings Edit',
    'settings.security-view': 'Security Settings View',
    'settings.security-manage': 'Security Manage',

    // Security Management
    'security.ip-whitelist-edit': 'Ip Whitelist Edit',
    'security.logs-view': 'Security Logs View',
    'security.session-terminate': 'Session Terminate',

    // Roles & Permissions
    'roles.view': 'View Roles',
    'roles.create': 'Role Create',
    'roles.edit': 'Role Edit',
    'roles.delete': 'Role Delete',
    'roles.list': 'Role List',
    'roles.manage': 'Manage Roles',

    // Audit & Logs
    'audit.view': 'Audit View',
    'audit.export': 'Audit Export',

    // System Administration
    'system.view-logs': 'System Logs',
    'system.logs-view': 'System Logs View',
    'system.logs-clear': 'System Logs Clear',
    'system.logs-hub-view': 'Logs Hub View',
    'system.backup': 'System Backup',
    'system.restore': 'System Restore',
    'system.maintenance': 'System Maintenance',
    'system.status-view': 'System Status View',
    'system.administration-hub-view': 'System Administration Hub View',

    // Backup Management
    'backups.manage': 'Backup Manage',

    // Cache Management
    'cache.clear': 'Cache Clear',

    // Data Management
    'data.management-hub-view': 'Data Management Hub View',
    'data.import': 'Data Import',
    'data.export': 'Data Export',
    'data.bulk-operations': 'Bulk Operations',

    // Active Directory
    'ad.password-management': 'Ad Password Management',
    'ad.user-list': 'Ad User List',
    'ad.user-create': 'Ad User Create',
    'ad.user-edit': 'Ad User Edit',
    'ad.user-delete': 'Ad User Delete',
    'ad.user-view': 'Ad User View',

    // Admin Tools
    'admin-tools.unused-departments-positions-edit': 'Unused Departments Positions Edit',
    'admin-tools.unused-departments-positions-view': 'Unused Departments Positions View',

    // Advanced Features
    'advanced.license-manage': 'License Manage',
    'advanced.schedule-manage': 'Schedule Manage',

    // Issue Management
    'issues.view': 'Issue View',
    'issues.create': 'Issue Create',
    'issues.list': 'Issue List',
    'tickets.view': 'Ticket View',
    'tickets.list': 'Ticket List',

    // Resigned Management
    'resigned.view': 'Resigned Employees View',
    'resigned.manage': 'Resigned Employees Manage',
    'resigned.print': 'Resigned Employees Print'
};

// Role-Based Default Permissions
// Define employee permissions
const employeePermissions = [
    // Own data access
    'leaves.view-own',
    'leaves.create',
    'permissions.view-own',
    'permissions.create',
    'attendance.view-own',
    'payroll.view-own',
    'documents.view-own',
    'documents.upload',

    // General viewing
    'announcements.view',
    'events.view',
    'surveys.view',
    'surveys.respond',
    'notifications.view-own',
    'templates.view',
    'departments.view',
    'positions.view'
];

// Define manager permissions (employee + team management)
const managerPermissions = [
    ...employeePermissions,

    // Team management
    'users.view',
    'leaves.view',
    'leaves.approve',
    'permissions.view',
    'permissions.approve',
    'attendance.view',
    'attendance.manage',
    'payroll.view',

    // Documents
    'documents.view',
    'documents.edit',

    // Reports
    'reports.view',
    'reports.create',
    'reports.export',

    // Events
    'events.create',
    'events.edit',
    'events.manage-attendees'
];

// Define HR permissions (manager + HR-specific)
const hrPermissions = [
    ...managerPermissions,

    // User Management
    'users.create',
    'users.edit',
    'users.delete',
    'users.manage-roles',
    'users.manage-permissions',

    // Department & Position Management
    'departments.create',
    'departments.edit',
    'departments.delete',
    'positions.create',
    'positions.edit',
    'positions.delete',

    // Leave Management
    'leaves.edit',
    'leaves.delete',
    'leaves.manage-all',

    // Permission Requests
    'permissions.edit',
    'permissions.delete',

    // Attendance
    'attendance.create',
    'attendance.edit',
    'attendance.delete',

    // Payroll
    'payroll.create',
    'payroll.edit',
    'payroll.delete',
    'payroll.manage',

    // Documents
    'documents.delete',
    'documents.view-confidential',

    // Templates
    'templates.create',
    'templates.edit',
    'templates.delete',

    // Announcements
    'announcements.create',
    'announcements.edit',
    'announcements.delete',

    // Surveys
    'surveys.create',
    'surveys.edit',
    'surveys.delete',
    'surveys.view-responses',

    // Notifications
    'notifications.create',
    'notifications.manage',

    // Reports
    'reports.configure',

    // Request Controls
    'request-controls.view',
    'request-controls.manage',

    // Settings & Audit
    'settings.view',
    'settings.edit',
    'audit.view',
    'audit.export'
];

// Helper to remove duplicates from permission arrays
const deduplicatePermissions = (permissions) => [...new Set(permissions)];

// Export ROLE_PERMISSIONS object
export const ROLE_PERMISSIONS = {
    'admin': deduplicatePermissions([
        // All permissions
        ...Object.keys(PERMISSIONS)
    ]),

    'employee': deduplicatePermissions(employeePermissions),

    'manager': deduplicatePermissions(managerPermissions),

    'hr': deduplicatePermissions(hrPermissions),

    'id-card-admin': deduplicatePermissions([
        // Basic employee permissions
        'leaves.view-own',
        'leaves.create',
        'permissions.view-own',
        'permissions.create',
        'attendance.view-own',
        'payroll.view-own',
        'notifications.view-own',
        'announcements.view',
        'events.view',

        // ID Card specific permissions
        'id-cards.view',
        'id-cards.create',
        'id-cards.edit',
        'id-cards.print',
        'id-cards.batch-print',
        'id-cards.manage-batches',
        'users.view', // Need to view users for ID card creation
        'documents.view' // May need to view documents for ID card photos
    ])
};

// Permission Categories (for UI grouping)
export const PERMISSION_CATEGORIES = {
    'Dashboard': [
        'dashboard.view',
        'dashboard.admin-view'
    ],
    'User Management': [
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'users.list',
        'users.manage-roles',
        'users.manage-permissions',
        'users.forgot-password-manage'
    ],
    'Employee Management': [
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
    ],
    'Department Management': [
        'departments.view',
        'departments.create',
        'departments.edit',
        'departments.delete',
        'departments.list',
        'departments.manage',
        'departments.statistics-view'
    ],
    'Position Management': [
        'positions.view',
        'positions.create',
        'positions.edit',
        'positions.delete',
        'positions.list',
        'positions.manage'
    ],
    'Section Management': [
        'sections.view',
        'sections.create',
        'sections.edit',
        'sections.delete',
        'sections.list',
        'sections.manage'
    ],
    'Academic Management': [
        'majors.view',
        'majors.create',
        'majors.edit',
        'majors.delete',
        'majors.list'
    ],
    'Leave Management': [
        'leaves.view',
        'leaves.view-own',
        'leaves.create',
        'leaves.edit',
        'leaves.delete',
        'leaves.approve',
        'leaves.manage-all'
    ],
    'Permission Requests': [
        'permissions.view',
        'permissions.view-own',
        'permissions.create',
        'permissions.edit',
        'permissions.delete',
        'permissions.list',
        'permissions.approve',
        'permissions.reports',
        'permissions.request'
    ],
    'Attendance Management': [
        'attendance.view',
        'attendance.view-own',
        'attendance.create',
        'attendance.edit',
        'attendance.delete',
        'attendance.list',
        'attendance.manage',
        'attendance.reports'
    ],
    'Forgot Check': [
        'forgot-check.view',
        'forgot-check.create',
        'forgot-check.approve',
        'forgot-check.reject',
        'forgot-check.view-hr',
        'forgot-check.view-supervisor'
    ],
    'Payroll Management': [
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
    ],
    'Vacation Management': [
        'vacations.view',
        'vacations.create',
        'vacations.edit',
        'vacations.delete',
        'vacations.list',
        'vacations.approve',
        'vacations.reports',
        'vacations.request',
        'vacations.manage'
    ],
    'Sick Leave Management': [
        'sickleave.view',
        'sickleave.create',
        'sickleave.edit',
        'sickleave.delete',
        'sickleave.list',
        'sickleave.approve',
        'sickleave.reports',
        'sickleave.manage'
    ],
    'Document Management': [
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
        'templates.view',
        'templates.create',
        'templates.edit',
        'templates.delete'
    ],
    'Announcements': [
        'announcements.view',
        'announcements.create',
        'announcements.edit',
        'announcements.delete'
    ],
    'Event Management': [
        'events.view',
        'events.create',
        'events.edit',
        'events.delete',
        'events.list',
        'events.manage',
        'events.manage-attendees'
    ],
    'Survey Management': [
        'surveys.view',
        'surveys.create',
        'surveys.edit',
        'surveys.delete',
        'surveys.list',
        'surveys.respond',
        'surveys.view-responses',
        'surveys.statistics'
    ],
    'Notification Management': [
        'notifications.view-own',
        'notifications.create',
        'notifications.manage',
        'notifications.send',
        'notifications.center-view'
    ],
    'Email Communication': [
        'email.view',
        'email.create',
        'email.send',
        'email.logs-view',
        'email.report-send'
    ],
    'ID Card Management': [
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
    ],
    'Photo Management': [
        'photos.view',
        'photos.upload',
        'photos.download',
        'photos.delete',
        'photos.bulk-upload',
        'photos.cleanup',
        'photos.migrate',
        'photos.manage'
    ],
    'Reports': [
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
    ],
    'Custom Reports': [
        'custom-reports.view',
        'custom-reports.create',
        'custom-reports.edit',
        'custom-reports.delete'
    ],

    'School Management': [
        'schools.view',
        'schools.create',
        'schools.edit',
        'schools.delete'
    ],
    'Request Controls': [
        'request-controls.view',
        'request-controls.manage'
    ],
    'Reminder Settings': [
        'reminder-settings.view',
        'reminder-settings.edit'
    ],
    'Settings Management': [
        'settings.view',
        'settings.edit',
        'settings.manage',
        'settings.security',
        'settings.security-view',
        'settings.security-manage'
    ],
    'Security Management': [
        'security.ip-whitelist-edit',
        'security.logs-view',
        'security.session-terminate'
    ],
    'Role Management': [
        'roles.view',
        'roles.create',
        'roles.edit',
        'roles.delete',
        'roles.list',
        'roles.manage'
    ],
    'Audit Logs': [
        'audit.view',
        'audit.export'
    ],
    'System Administration': [
        'system.view-logs',
        'system.logs-view',
        'system.logs-clear',
        'system.logs-hub-view',
        'system.backup',
        'system.restore',
        'system.maintenance',
        'system.status-view',
        'system.administration-hub-view'
    ],
    'Backup Management': [
        'backups.manage'
    ],
    'Cache Management': [
        'cache.clear'
    ],
    'Data Management': [
        'data.management-hub-view',
        'data.import',
        'data.export',
        'data.bulk-operations'
    ],
    'Active Directory': [
        'ad.password-management',
        'ad.user-list',
        'ad.user-create',
        'ad.user-edit',
        'ad.user-delete',
        'ad.user-view'
    ],
    'Admin Tools': [
        'admin-tools.unused-departments-positions-edit',
        'admin-tools.unused-departments-positions-view'
    ],
    'Advanced Features': [
        'advanced.license-manage',
        'advanced.schedule-manage'
    ],
    'Issue Management': [
        'issues.view',
        'issues.create',
        'issues.list',
        'tickets.view',
        'tickets.list'
    ],
    'Resigned Management': [
        'resigned.view',
        'resigned.manage',
        'resigned.print'
    ]
};

// Helper function to get all permissions for a role
export const getRolePermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

// Helper function to check if a permission exists
export const isValidPermission = (permission) => {
    return Object.keys(PERMISSIONS).includes(permission);
};

// Helper function to get permission description
export const getPermissionDescription = (permission) => {
    return PERMISSIONS[permission] || '';
};
