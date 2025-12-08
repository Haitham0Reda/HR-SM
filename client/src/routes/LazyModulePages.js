/**
 * Lazy-loaded module pages for performance optimization
 * 
 * This file provides lazy-loaded versions of module-specific pages
 * to reduce initial bundle size and improve load times.
 * 
 * Pages are loaded on-demand when the user navigates to them.
 */

import { lazy } from 'react';

// Attendance Module
export const AttendanceManagementPage = lazy(() => 
    import('../pages/attendance/AttendanceManagementPage')
);

// Leave Module (Missions, Sick Leaves, Permissions, Overtime)
export const MissionsPage = lazy(() => 
    import('../pages/missions/MissionsPage')
);
export const MissionForm = lazy(() => 
    import('../pages/missions/MissionForm')
);
export const MissionDetails = lazy(() => 
    import('../pages/missions/MissionDetails')
);

export const SickLeavesPage = lazy(() => 
    import('../pages/sick-leaves/SickLeavesPage')
);
export const SickLeaveForm = lazy(() => 
    import('../pages/sick-leaves/SickLeaveForm')
);
export const SickLeaveDetails = lazy(() => 
    import('../pages/sick-leaves/SickLeaveDetails')
);
export const DoctorReviewQueue = lazy(() => 
    import('../pages/sick-leaves/DoctorReviewQueue')
);

export const PermissionsPage = lazy(() => 
    import('../pages/permissions/PermissionsPage')
);
export const CreatePermissionPage = lazy(() => 
    import('../pages/permissions/CreatePermissionPage')
);
export const PermissionForm = lazy(() => 
    import('../pages/permissions/PermissionForm')
);
export const PermissionDetails = lazy(() => 
    import('../pages/permissions/PermissionDetails')
);

export const OvertimePage = lazy(() => 
    import('../pages/overtime/OvertimePage')
);
export const OvertimeForm = lazy(() => 
    import('../pages/overtime/OvertimeForm')
);
export const OvertimeDetails = lazy(() => 
    import('../pages/overtime/OvertimeDetails')
);

export const VacationRequestPage = lazy(() => 
    import('../pages/vacation/VacationRequestPage')
);
export const VacationPage = lazy(() => 
    import('../pages/vacation/VacationPage')
);
export const VacationsPage = lazy(() => 
    import('../pages/vacations/VacationsPage')
);
export const VacationRequestsPage = lazy(() => 
    import('../pages/vacations/VacationRequestsPage')
);
export const VacationRequestForm = lazy(() => 
    import('../pages/vacations/VacationRequestForm')
);
export const VacationRequestDetails = lazy(() => 
    import('../pages/vacations/VacationRequestDetails')
);

// Payroll Module
export const PayrollPage = lazy(() => 
    import('../pages/payroll/PayrollPage')
);

// Documents Module
export const DocumentsPage = lazy(() => 
    import('../pages/documents/DocumentsPage')
);
export const TemplatesPage = lazy(() => 
    import('../pages/templates/TemplatesPage')
);
export const HardCopiesPage = lazy(() => 
    import('../pages/hardcopies/HardCopiesPage')
);

// Communication Module
export const AnnouncementsPage = lazy(() => 
    import('../pages/announcements/AnnouncementsPage')
);
export const EventsPage = lazy(() => 
    import('../pages/events/EventsPage')
);
export const SurveysPage = lazy(() => 
    import('../pages/surveys/SurveysPage')
);

// Reporting Module
export const ReportsPage = lazy(() => 
    import('../pages/reports/ReportsPage')
);
export const AnalyticsPage = lazy(() => 
    import('../pages/analytics/AnalyticsPage')
);

// Tasks Module
export const TasksPage = lazy(() => 
    import('../pages/tasks/TasksPage')
);
export const TaskDetailsPage = lazy(() => 
    import('../pages/tasks/TaskDetailsPage')
);

// Settings pages that may be module-specific
export const VacationManagementPage = lazy(() => 
    import('../pages/settings/VacationManagementPage')
);
export const VacationBalancesPage = lazy(() => 
    import('../pages/settings/VacationBalancesPage')
);
export const MixedVacationPage = lazy(() => 
    import('../pages/settings/MixedVacationPage')
);
export const WorkSchedulesPage = lazy(() => 
    import('../pages/settings/WorkSchedulesPage')
);
