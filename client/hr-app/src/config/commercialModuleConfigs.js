/**
 * Commercial Module Configurations (Client-side)
 * 
 * This is a client-side copy of the module configurations for UI display purposes.
 * The authoritative source is server/config/commercialModuleRegistry.js
 */

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

export const commercialModuleConfigs = {
    [MODULES.HR_CORE]: {
        key: MODULES.HR_CORE,
        displayName: 'HR Core',
        version: '1.0.0',
        commercial: {
            description: 'Essential HR functionality including user management, authentication, roles, departments, and audit logging.',
            targetSegment: 'All customers - included in every deployment',
            valueProposition: 'Secure user management, role-based access control, and comprehensive audit trails for compliance'
        }
    },

    [MODULES.ATTENDANCE]: {
        key: MODULES.ATTENDANCE,
        displayName: 'Attendance & Time Tracking',
        version: '1.0.0',
        commercial: {
            description: 'Track employee attendance, working hours, and time-off with automated reporting and biometric device integration',
            targetSegment: 'Businesses with hourly or shift-based employees, manufacturing, retail, healthcare',
            valueProposition: 'Reduce time theft by up to 5%, automate timesheet processing, ensure labor law compliance'
        }
    },

    [MODULES.LEAVE]: {
        key: MODULES.LEAVE,
        displayName: 'Leave Management',
        version: '1.0.0',
        commercial: {
            description: 'Comprehensive leave request management with automated approval workflows, balance tracking, and policy enforcement',
            targetSegment: 'All businesses managing employee time-off, vacation, and sick leave',
            valueProposition: 'Eliminate manual leave tracking, ensure policy compliance, reduce administrative overhead by 70%'
        }
    },

    [MODULES.PAYROLL]: {
        key: MODULES.PAYROLL,
        displayName: 'Payroll Management',
        version: '1.0.0',
        commercial: {
            description: 'Automated payroll processing with tax calculations, deductions, benefits management, and compliance reporting',
            targetSegment: 'Businesses processing payroll in-house, SMBs to enterprises',
            valueProposition: 'Reduce payroll processing time by 80%, ensure tax compliance, automate salary calculations'
        }
    },

    [MODULES.DOCUMENTS]: {
        key: MODULES.DOCUMENTS,
        displayName: 'Document Management',
        version: '1.0.0',
        commercial: {
            description: 'Secure document storage, version control, e-signatures, and automated document workflows for employee files',
            targetSegment: 'Businesses managing employee contracts, certifications, and compliance documents',
            valueProposition: 'Eliminate paper filing, ensure document security, automate expiration tracking'
        }
    },

    [MODULES.COMMUNICATION]: {
        key: MODULES.COMMUNICATION,
        displayName: 'Communication & Notifications',
        version: '1.0.0',
        commercial: {
            description: 'Internal messaging, announcements, notifications, and employee communication hub with mobile push support',
            targetSegment: 'Organizations needing internal communication tools, remote teams, distributed workforce',
            valueProposition: 'Centralize employee communications, reduce email clutter, ensure message delivery'
        }
    },

    [MODULES.REPORTING]: {
        key: MODULES.REPORTING,
        displayName: 'Reporting & Analytics',
        version: '1.0.0',
        commercial: {
            description: 'Advanced analytics, custom reports, dashboards, and data visualization for HR metrics and insights',
            targetSegment: 'Data-driven organizations, HR analytics teams, management requiring insights',
            valueProposition: 'Make data-driven decisions, identify trends, automate compliance reporting'
        }
    },

    [MODULES.TASKS]: {
        key: MODULES.TASKS,
        displayName: 'Task & Work Reporting',
        version: '1.0.0',
        commercial: {
            description: 'Task assignment, work reporting, project tracking, and productivity monitoring for employee work management',
            targetSegment: 'Project-based organizations, consulting firms, teams requiring work tracking',
            valueProposition: 'Track project progress, monitor productivity, assign and manage tasks'
        }
    }
};

/**
 * Get module configuration by key
 */
export function getModuleConfig(moduleKey) {
    return commercialModuleConfigs[moduleKey] || null;
}

/**
 * Get all module configurations
 */
export function getAllModuleConfigs() {
    return { ...commercialModuleConfigs };
}

export default {
    MODULES,
    commercialModuleConfigs,
    getModuleConfig,
    getAllModuleConfigs
};
