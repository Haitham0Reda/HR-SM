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
 * - hr: HR management functions
 * - manager: Team and department management
 * - employee: Basic access to own data
 * - id-card-admin: ID card operations only
 * - supervisor: Team supervision (approvals)
 * - head-of-department: Department-level management
 * - dean: School-level management
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
    // User Management
    'users.view': 'View users',
    'users.create': 'Create users',
    'users.edit': 'Edit users',
    'users.delete': 'Delete users',
    'users.manage-roles': 'Manage user roles',
    'users.manage-permissions': 'Manage user permissions',

    // Department Management
    'departments.view': 'View departments',
    'departments.create': 'Create departments',
    'departments.edit': 'Edit departments',
    'departments.delete': 'Delete departments',

    // Position Management
    'positions.view': 'View positions',
    'positions.create': 'Create positions',
    'positions.edit': 'Edit positions',
    'positions.delete': 'Delete positions',

    // Leave Management
    'leaves.view': 'View leaves',
    'leaves.view-own': 'View own leaves',
    'leaves.create': 'Create leave requests',
    'leaves.edit': 'Edit leave requests',
    'leaves.delete': 'Delete leave requests',
    'leaves.approve': 'Approve leave requests',
    'leaves.manage-all': 'Manage all leave requests',

    // Permission Requests
    'permissions.view': 'View permission requests',
    'permissions.view-own': 'View own permission requests',
    'permissions.create': 'Create permission requests',
    'permissions.edit': 'Edit permission requests',
    'permissions.delete': 'Delete permission requests',
    'permissions.approve': 'Approve permission requests',

    // Attendance
    'attendance.view': 'View attendance',
    'attendance.view-own': 'View own attendance',
    'attendance.create': 'Create attendance records',
    'attendance.edit': 'Edit attendance records',
    'attendance.delete': 'Delete attendance records',
    'attendance.manage-all': 'Manage all attendance',

    // Payroll
    'payroll.view': 'View payroll',
    'payroll.view-own': 'View own payroll',
    'payroll.create': 'Create payroll',
    'payroll.edit': 'Edit payroll',
    'payroll.delete': 'Delete payroll',
    'payroll.process': 'Process payroll',

    // Documents
    'documents.view': 'View documents',
    'documents.view-own': 'View own documents',
    'documents.upload': 'Upload documents',
    'documents.edit': 'Edit documents',
    'documents.delete': 'Delete documents',
    'documents.view-confidential': 'View confidential documents',

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
    'events.view': 'View events',
    'events.create': 'Create events',
    'events.edit': 'Edit events',
    'events.delete': 'Delete events',
    'events.manage-attendees': 'Manage event attendees',

    // Surveys
    'surveys.view': 'View surveys',
    'surveys.create': 'Create surveys',
    'surveys.edit': 'Edit surveys',
    'surveys.delete': 'Delete surveys',
    'surveys.respond': 'Respond to surveys',
    'surveys.view-responses': 'View survey responses',

    // Notifications
    'notifications.view-own': 'View own notifications',
    'notifications.create': 'Create notifications',
    'notifications.manage-all': 'Manage all notifications',

    // ID Card Management
    'id-cards.view': 'View ID cards',
    'id-cards.create': 'Create ID cards',
    'id-cards.edit': 'Edit ID cards',
    'id-cards.delete': 'Delete ID cards',
    'id-cards.print': 'Print ID cards',
    'id-cards.batch-print': 'Batch print ID cards',
    'id-cards.manage-batches': 'Manage ID card batches',

    // Reports
    'reports.view': 'View reports',
    'reports.create': 'Create reports',
    'reports.export': 'Export reports',
    'reports.configure': 'Configure reports',

    // School Management
    'schools.view': 'View schools',
    'schools.create': 'Create schools',
    'schools.edit': 'Edit schools',
    'schools.delete': 'Delete schools',

    // Request Controls
    'request-controls.view': 'View request controls',
    'request-controls.manage': 'Manage request controls',

    // System Settings
    'settings.view': 'View system settings',
    'settings.edit': 'Edit system settings',
    'settings.manage-security': 'Manage security settings',

    // Audit & Logs
    'audit.view': 'View audit logs',
    'audit.export': 'Export audit logs'
};

// Role-Based Default Permissions
// Define employee permissions first
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

// Define manager permissions (employee + additional)
const managerPermissions = [
    ...employeePermissions,

    // Team management
    'users.view',
    'leaves.view',
    'leaves.approve',
    'permissions.view',
    'permissions.approve',
    'attendance.view',
    'attendance.manage-all',
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

// Define HR permissions (manager + additional)
const hrPermissions = [
    ...managerPermissions,

    // HR-specific
    'users.create',
    'users.edit',
    'users.delete',
    'users.manage-roles',

    'departments.create',
    'departments.edit',
    'departments.delete',

    'positions.create',
    'positions.edit',
    'positions.delete',

    'leaves.manage-all',
    'payroll.create',
    'payroll.edit',
    'payroll.process',

    'documents.view-confidential',
    'documents.delete',

    'templates.create',
    'templates.edit',
    'templates.delete',

    'announcements.create',
    'announcements.edit',
    'announcements.delete',

    'surveys.create',
    'surveys.edit',
    'surveys.delete',
    'surveys.view-responses',

    'notifications.create',
    'notifications.manage-all',

    'request-controls.view',
    'request-controls.manage',

    'reports.configure',
    'settings.view',
    'audit.view'
];

// Export ROLE_PERMISSIONS object
export const ROLE_PERMISSIONS = {
    'employee': employeePermissions,

    'manager': managerPermissions,

    'hr': hrPermissions,

    'admin': [
        // All permissions
        ...Object.keys(PERMISSIONS)
    ],

    'id-card-admin': [
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
    ],

    'supervisor': [
        ...employeePermissions,
        'leaves.approve',
        'permissions.approve',
        'attendance.view',
        'users.view'
    ],

    'head-of-department': [
        ...managerPermissions,
        'departments.edit',
        'positions.create',
        'positions.edit'
    ],

    'dean': [
        ...managerPermissions,
        'schools.view',
        'schools.edit',
        'departments.view',
        'departments.create',
        'departments.edit',
        'users.create',
        'users.edit'
    ]
};

// Permission Categories (for UI grouping)
export const PERMISSION_CATEGORIES = {
    'User Management': [
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'users.manage-roles',
        'users.manage-permissions'
    ],
    'Department & Position': [
        'departments.view',
        'departments.create',
        'departments.edit',
        'departments.delete',
        'positions.view',
        'positions.create',
        'positions.edit',
        'positions.delete'
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
    'Attendance': [
        'attendance.view',
        'attendance.view-own',
        'attendance.create',
        'attendance.edit',
        'attendance.delete',
        'attendance.manage-all'
    ],
    'Payroll': [
        'payroll.view',
        'payroll.view-own',
        'payroll.create',
        'payroll.edit',
        'payroll.delete',
        'payroll.process'
    ],
    'Documents': [
        'documents.view',
        'documents.view-own',
        'documents.upload',
        'documents.edit',
        'documents.delete',
        'documents.view-confidential',
        'templates.view',
        'templates.create',
        'templates.edit',
        'templates.delete'
    ],
    'Communication': [
        'announcements.view',
        'announcements.create',
        'announcements.edit',
        'announcements.delete',
        'events.view',
        'events.create',
        'events.edit',
        'events.delete',
        'notifications.view-own',
        'notifications.create',
        'notifications.manage-all'
    ],
    'ID Cards': [
        'id-cards.view',
        'id-cards.create',
        'id-cards.edit',
        'id-cards.delete',
        'id-cards.print',
        'id-cards.batch-print',
        'id-cards.manage-batches'
    ],
    'Reports': [
        'reports.view',
        'reports.create',
        'reports.export',
        'reports.configure'
    ],
    'System': [
        'schools.view',
        'schools.create',
        'schools.edit',
        'schools.delete',
        'request-controls.view',
        'request-controls.manage',
        'settings.view',
        'settings.edit',
        'settings.manage-security',
        'audit.view',
        'audit.export'
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
