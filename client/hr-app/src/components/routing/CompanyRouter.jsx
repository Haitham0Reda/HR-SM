import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import PrivateRoute from '../../routes/PrivateRoute';
import DashboardLayout from '../DashboardLayout';

// Import all pages
import Dashboard from '../../pages/dashboard/Dashboard';
import DashboardEditPage from '../../pages/dashboard/DashboardEditPage';
import ThemeEditorPage from '../../pages/theme/ThemeEditorPage';
import UsersPage from '../../pages/users/UsersPage';
import CreateUserPage from '../../pages/users/CreateUserPage';
import UserDetailsPage from '../../pages/users/UserDetailsPage';
import EditUserPage from '../../pages/users/EditUserPage';
import DepartmentsPage from '../../pages/departments/DepartmentsPage';
import PositionsPage from '../../pages/positions/PositionsPage';
import AttendanceManagementPage from '../../pages/attendance/AttendanceManagementPage';
import AttendanceImport from '../../pages/attendance/AttendanceImport';
import DeviceManagement from '../../pages/attendance/DeviceManagement';
import MissionsPage from '../../pages/missions/MissionsPage';
import MissionForm from '../../pages/missions/MissionForm';
import MissionDetails from '../../pages/missions/MissionDetails';
import SickLeavesPage from '../../pages/sick-leaves/SickLeavesPage';
import SickLeaveForm from '../../pages/sick-leaves/SickLeaveForm';
import SickLeaveDetails from '../../pages/sick-leaves/SickLeaveDetails';
import DoctorReviewQueue from '../../pages/sick-leaves/DoctorReviewQueue';
import ForgetCheckPage from '../../pages/forgetCheck/ForgetCheckPage';
import CreateForgetCheckPage from '../../pages/forgetCheck/CreateForgetCheckPage';
import PermissionsPage from '../../pages/permissions/PermissionsPage';
import CreatePermissionPage from '../../pages/permissions/CreatePermissionPage';
import PermissionForm from '../../pages/permissions/PermissionForm';
import PermissionDetails from '../../pages/permissions/PermissionDetails';
import OvertimePage from '../../pages/overtime/OvertimePage';
import OvertimeForm from '../../pages/overtime/OvertimeForm';
import OvertimeDetails from '../../pages/overtime/OvertimeDetails';
import RequestsPage from '../../pages/requests/RequestsPage';
import RequestDetailsPage from '../../pages/requests/RequestDetailsPage';
import VacationRequestPage from '../../pages/vacation/VacationRequestPage';
import VacationPage from '../../pages/vacation/VacationPage';
import VacationDebug from '../../pages/debug/VacationDebug';
import PayrollPage from '../../pages/payroll/PayrollPage';
import DocumentsPage from '../../pages/documents/DocumentsPage';
import TemplatesPage from '../../pages/templates/TemplatesPage';
import HardCopiesPage from '../../pages/hardcopies/HardCopiesPage';
import AnnouncementsPage from '../../pages/announcements/AnnouncementsPage';
import EventsPage from '../../pages/events/EventsPage';
import SurveysPage from '../../pages/surveys/SurveysPage';
import HolidaysPage from '../../pages/holidays/HolidaysPage';
import VacationsPage from '../../pages/vacations/VacationsPage';
import VacationRequestsPage from '../../pages/vacations/VacationRequestsPage';
import VacationRequestForm from '../../pages/vacations/VacationRequestForm';
import VacationRequestDetails from '../../pages/vacations/VacationRequestDetails';
import ReportsPage from '../../pages/reports/ReportsPage';
import AnalyticsPage from '../../pages/analytics/AnalyticsPage';
import SecurityPage from '../../pages/security/SecurityPage';
import TasksPage from '../../pages/tasks/TasksPage';
import TaskDetailsPage from '../../pages/tasks/TaskDetailsPage';
import BackupsPage from '../../pages/backups/BackupsPage';
import PricingPage from '../../pages/pricing/PricingPage';
import LicenseStatusPage from '../../pages/license/LicenseStatusPage';
import ResignedPage from '../../pages/resigned/ResignedPage';
import RolesPage from '../../pages/roles/RolesPage';
import RoleEditPage from '../../pages/roles/RoleEditPage';
import RoleViewPage from '../../pages/roles/RoleViewPage';
import SystemSettingsPage from '../../pages/settings/SystemSettingsPage';
import SeasonalSettingsPage from '../../pages/settings/SeasonalSettingsPage';
import RequestControlPage from '../../pages/settings/RequestControlPage';
import EmailCreationPage from '../../pages/settings/EmailCreationPage';
import EmailManagementPage from '../../pages/settings/EmailManagementPage';
import MaintenancePage from '../../pages/settings/MaintenancePage';
import NotificationsPage from '../../pages/settings/NotificationsPage';
import HRManagementPage from '../../pages/settings/HRManagementPage';
import WorkSchedulesPage from '../../pages/settings/WorkSchedulesPage';
import VacationManagementPage from '../../pages/settings/VacationManagementPage';
import VacationBalancesPage from '../../pages/settings/VacationBalancesPage';
import MixedVacationPage from '../../pages/settings/MixedVacationPage';
import EmployeeOfMonthPage from '../../pages/settings/EmployeeOfMonthPage';
import ProfilePage from '../../pages/profile/ProfilePage';
import SettingsPage from '../../pages/settings/SettingsPage';
import UserActivityTracker from '../../pages/admin/UserActivityTracker';
import AuthDebug from '../../pages/debug/AuthDebug';
import APIDebugger from '../debug/APIDebugger';
import AnnouncementDebugger from '../debug/AnnouncementDebugger';
import SimpleAnnouncementTest from '../debug/SimpleAnnouncementTest';
import AuthTokenTest from '../debug/AuthTokenTest';
import DirectAPITest from '../debug/DirectAPITest';
import ComprehensiveAnnouncementDebug from '../debug/ComprehensiveAnnouncementDebug';

// Insurance pages
import {
    InsurancePoliciesPage,
    CreatePolicyPage,
    EditPolicyPage,
    PolicyDetailsPage,
    ClaimsPage,
    CreateClaimPage,
    ClaimDetailsPage,
    InsuranceReportsPage
} from '../../pages/insurance';

/**
 * Company-scoped router component
 * Handles all routes within a company context
 */
const CompanyRouter = () => {
    const { user, tenant, loading } = useAuth();
    const { companySlug, isValidCompanyRoute } = useCompanyRouting();

    // If still loading, don't render anything yet
    if (loading) {
        return null;
    }

    // If user is not authenticated, redirect to login
    if (!user) {
        console.log('CompanyRouter: No user found, redirecting to login');
        return <Navigate to="/" replace />;
    }

    // Temporarily disable strict company route validation to prevent logout loops
    // TODO: Re-enable once we fix the underlying issue
    const shouldAllowRoute = !!user;

    if (!shouldAllowRoute) {
        if (process.env.NODE_ENV === 'development') {
            console.log('CompanyRouter: No user, redirecting to login');
        }
        return <Navigate to="/" replace />;
    }

    // Only log in development mode to reduce console noise
    if (process.env.NODE_ENV === 'development') {
        console.log('CompanyRouter: Rendering routes', { 
            user: user?.email, 
            companySlug, 
            isValidCompanyRoute,
            tenant: tenant?.name
        });
    }

    return (
        <Routes>
            <Route
                path="/*"
                element={<DashboardLayout />}
            >
                {/* Default redirect to dashboard */}
                <Route index element={<Navigate to="dashboard" replace />} />
                
                {/* Dashboard */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard/edit" element={<DashboardEditPage />} />

                {/* User Management */}
                <Route path="profile" element={<ProfilePage />} />
                <Route path="profile/settings" element={<SettingsPage />} />
                <Route path="theme" element={<ThemeEditorPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="users/create" element={<CreateUserPage />} />
                <Route path="users/:id" element={<UserDetailsPage />} />
                <Route path="users/:id/edit" element={<EditUserPage />} />

                {/* Organization */}
                <Route path="departments" element={<DepartmentsPage />} />
                <Route path="positions" element={<PositionsPage />} />

                {/* HR Operations */}
                <Route path="attendance" element={<AttendanceManagementPage />} />
                <Route path="attendance/import" element={<PrivateRoute requiredRole="hr"><AttendanceImport /></PrivateRoute>} />
                <Route path="attendance/devices" element={<PrivateRoute requiredRole="hr"><DeviceManagement /></PrivateRoute>} />
                <Route path="missions" element={<MissionsPage />} />
                <Route path="missions/create" element={<MissionForm />} />
                <Route path="missions/:id" element={<MissionDetails />} />
                <Route path="missions/:id/edit" element={<MissionForm />} />
                <Route path="sick-leaves" element={<SickLeavesPage />} />
                <Route path="sick-leaves/create" element={<SickLeaveForm />} />
                <Route path="sick-leaves/doctor-queue" element={<DoctorReviewQueue />} />
                <Route path="sick-leaves/:id" element={<SickLeaveDetails />} />
                <Route path="sick-leaves/:id/edit" element={<SickLeaveForm />} />
                <Route path="forget-checks" element={<ForgetCheckPage />} />
                <Route path="forget-checks/create" element={<CreateForgetCheckPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
                <Route path="permissions/create" element={<CreatePermissionPage />} />
                <Route path="permissions/:id" element={<PermissionDetails />} />
                <Route path="permissions/:id/edit" element={<PermissionForm />} />
                <Route path="overtime" element={<OvertimePage />} />
                <Route path="overtime/create" element={<OvertimeForm />} />
                <Route path="overtime/:id" element={<OvertimeDetails />} />
                <Route path="overtime/:id/edit" element={<OvertimeForm />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="requests/:id" element={<RequestDetailsPage />} />
                <Route path="vacation-request" element={<VacationRequestPage />} />
                <Route path="vacation" element={<VacationPage />} />
                <Route path="vacation-debug" element={<VacationDebug />} />
                <Route path="payroll" element={<PayrollPage />} />

                {/* Documents */}
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="hardcopies" element={<HardCopiesPage />} />

                {/* Communication */}
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="surveys" element={<SurveysPage />} />
                <Route path="surveys/:id" element={<SurveysPage />} />

                {/* Advanced */}
                <Route path="holidays" element={<HolidaysPage />} />
                <Route path="vacations" element={<VacationsPage />} />
                <Route path="vacation-requests" element={<VacationRequestsPage />} />
                <Route path="vacation-requests/create" element={<VacationRequestForm />} />
                <Route path="vacation-requests/:id" element={<VacationRequestDetails />} />
                <Route path="vacation-requests/:id/edit" element={<VacationRequestForm />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />

                {/* Task Management */}
                <Route path="tasks" element={<TasksPage />} />
                <Route path="tasks/:id" element={<TaskDetailsPage />} />

                {/* Insurance Management */}
                <Route path="insurance" element={<Navigate to="insurance/policies" replace />} />
                <Route path="insurance/policies" element={<InsurancePoliciesPage />} />
                <Route path="insurance/policies/new" element={<CreatePolicyPage />} />
                <Route path="insurance/policies/:policyId" element={<PolicyDetailsPage />} />
                <Route path="insurance/policies/:policyId/edit" element={<EditPolicyPage />} />
                <Route path="insurance/claims" element={<ClaimsPage />} />
                <Route path="insurance/claims/new" element={<CreateClaimPage />} />
                <Route path="insurance/claims/:claimId" element={<ClaimDetailsPage />} />
                <Route path="insurance/reports" element={<InsuranceReportsPage />} />

                {/* Pricing */}
                <Route path="pricing" element={<PricingPage />} />
                <Route path="license-status" element={<LicenseStatusPage />} />

                {/* Administration */}
                <Route path="security" element={<SecurityPage />} />
                <Route path="backups" element={<BackupsPage />} />
                <Route path="resigned" element={<ResignedPage />} />
                <Route path="user-activity-tracker" element={<PrivateRoute requiredRole="admin"><UserActivityTracker /></PrivateRoute>} />
                <Route path="roles" element={<PrivateRoute requiredRole="admin"><RolesPage /></PrivateRoute>} />
                <Route path="roles/create" element={<PrivateRoute requiredRole="admin"><RoleEditPage /></PrivateRoute>} />
                <Route path="roles/:id" element={<PrivateRoute requiredRole="admin"><RoleViewPage /></PrivateRoute>} />
                <Route path="roles/:id/edit" element={<PrivateRoute requiredRole="admin"><RoleEditPage /></PrivateRoute>} />
                <Route path="system-settings" element={<SystemSettingsPage />} />
                <Route path="system-settings/seasonal" element={<SeasonalSettingsPage />} />
                <Route path="system-settings/request-control" element={<RequestControlPage />} />
                <Route path="system-settings/email-creation" element={<EmailCreationPage />} />
                <Route path="system-settings/email-management" element={<EmailManagementPage />} />
                <Route path="system-settings/maintenance" element={<MaintenancePage />} />
                <Route path="system-settings/notifications" element={<NotificationsPage />} />
                <Route path="system-settings/hr-management" element={<HRManagementPage />} />
                <Route path="system-settings/work-schedules" element={<WorkSchedulesPage />} />
                <Route path="system-settings/vacation-management" element={<VacationManagementPage />} />
                <Route path="system-settings/vacation-balances" element={<VacationBalancesPage />} />
                <Route path="system-settings/mixed-vacation" element={<MixedVacationPage />} />
                <Route path="system-settings/employee-of-month" element={<EmployeeOfMonthPage />} />
                
                {/* Debug routes */}
                <Route path="debug" element={<AuthDebug />} />
                <Route path="debug/api" element={<APIDebugger />} />
                <Route path="debug/announcements" element={<AnnouncementDebugger />} />
                <Route path="debug/simple-announcements" element={<SimpleAnnouncementTest />} />
                <Route path="debug/auth-token" element={<AuthTokenTest />} />
                <Route path="debug/direct-api" element={<DirectAPITest />} />
                <Route path="debug/comprehensive" element={<ComprehensiveAnnouncementDebug />} />
            </Route>
        </Routes>
    );
};

export default CompanyRouter;