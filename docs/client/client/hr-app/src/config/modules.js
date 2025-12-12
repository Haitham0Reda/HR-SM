// Frontend module configuration
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

export const MODULE_ROUTES = {
    [MODULES.HR_CORE]: [
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/profile', name: 'Profile' },
        { path: '/users', name: 'Users', roles: ['Admin', 'HR'] },
        { path: '/departments', name: 'Departments', roles: ['Admin', 'HR'] }
    ],
    [MODULES.TASKS]: [
        { path: '/tasks', name: 'Tasks' },
        { path: '/tasks/my-tasks', name: 'My Tasks' },
        { path: '/tasks/assigned', name: 'Assigned Tasks', roles: ['Manager', 'HR', 'Admin'] },
        { path: '/tasks/analytics', name: 'Task Analytics', roles: ['Manager', 'HR', 'Admin'] }
    ],
    [MODULES.ATTENDANCE]: [
        { path: '/attendance', name: 'Attendance' },
        { path: '/attendance/reports', name: 'Reports', roles: ['Manager', 'HR', 'Admin'] }
    ],
    [MODULES.LEAVE]: [
        { path: '/leave', name: 'Leave Requests' },
        { path: '/leave/balance', name: 'Leave Balance' }
    ],
    [MODULES.PAYROLL]: [
        { path: '/payroll', name: 'Payroll', roles: ['HR', 'Admin'] }
    ],
    [MODULES.DOCUMENTS]: [
        { path: '/documents', name: 'Documents' }
    ],
    [MODULES.COMMUNICATION]: [
        { path: '/messages', name: 'Messages' },
        { path: '/announcements', name: 'Announcements' }
    ],
    [MODULES.REPORTING]: [
        { path: '/reports', name: 'Reports', roles: ['Manager', 'HR', 'Admin'] }
    ]
};

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
