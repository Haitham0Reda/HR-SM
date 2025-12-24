// Module definitions and registry
export const MODULES = {
    HR_CORE: 'hr-core',
    ATTENDANCE: 'attendance',
    LEAVE: 'leave',
    PAYROLL: 'payroll',
    DOCUMENTS: 'documents',
    COMMUNICATION: 'communication',
    REPORTING: 'reporting',
    TASKS: 'tasks',
    LIFE_INSURANCE: 'life-insurance'
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
    },
    [MODULES.LIFE_INSURANCE]: {
        name: 'Life Insurance Management',
        description: 'Comprehensive life insurance management including policies, family members, claims processing, and beneficiary management',
        locked: false,
        dependencies: [MODULES.HR_CORE],
        requiresLicense: true,
        licenseFeature: 'life-insurance'
    }
};

export const ROLES = {
    ADMIN: 'admin',
    HR: 'hr',
    MANAGER: 'manager',
    EMPLOYEE: 'employee'
};

export const ROLE_HIERARCHY = {
    [ROLES.ADMIN]: 4,
    [ROLES.HR]: 3,
    [ROLES.MANAGER]: 2,
    [ROLES.EMPLOYEE]: 1
};
