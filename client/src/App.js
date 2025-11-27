import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeConfigProvider } from './context/ThemeContext';
import PrivateRoute from './routes/PrivateRoute';
import logger from './utils/logger';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import DashboardEditPage from './pages/dashboard/DashboardEditPage';
import ThemeEditorPage from './pages/theme/ThemeEditorPage';
import DashboardLayout from './components/DashboardLayout';
import UsersPage from './pages/users/UsersPage';
import CreateUserPage from './pages/users/CreateUserPage';
import UserDetailsPage from './pages/users/UserDetailsPage';
import EditUserPage from './pages/users/EditUserPage';

import DepartmentsPage from './pages/departments/DepartmentsPage';
import PositionsPage from './pages/positions/PositionsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import LeavesPage from './pages/leaves/LeavesPage';
import CreateLeavePage from './pages/leaves/CreateLeavePage';
import ForgetCheckPage from './pages/forgetCheck/ForgetCheckPage';
import CreateForgetCheckPage from './pages/forgetCheck/CreateForgetCheckPage';
import PermissionsPage from './pages/permissions/PermissionsPage';
import CreatePermissionPage from './pages/permissions/CreatePermissionPage';
import OvertimePage from './pages/overtime/OvertimePage';
import CreateOvertimePage from './pages/overtime/CreateOvertimePage';
import RequestsPage from './pages/requests/RequestsPage';
import RequestDetailsPage from './pages/requests/RequestDetailsPage';
import VacationRequestPage from './pages/vacation/VacationRequestPage';
import VacationPage from './pages/vacation/VacationPage';
import PayrollPage from './pages/payroll/PayrollPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import HardCopiesPage from './pages/hardcopies/HardCopiesPage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import EventsPage from './pages/events/EventsPage';
import SurveysPage from './pages/surveys/SurveysPage';
import HolidaysPage from './pages/holidays/HolidaysPage';
import VacationsPage from './pages/vacations/VacationsPage';
import ReportsPage from './pages/reports/ReportsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SecurityPage from './pages/security/SecurityPage';
import BackupsPage from './pages/backups/BackupsPage';
import ResignedPage from './pages/resigned/ResignedPage';
import SystemSettingsPage from './pages/settings/SystemSettingsPage';
import SeasonalSettingsPage from './pages/settings/SeasonalSettingsPage';
import RequestControlPage from './pages/settings/RequestControlPage';
import EmailCreationPage from './pages/settings/EmailCreationPage';
import EmailManagementPage from './pages/settings/EmailManagementPage';
import MaintenancePage from './pages/settings/MaintenancePage';
import NotificationsPage from './pages/settings/NotificationsPage';
import HRManagementPage from './pages/settings/HRManagementPage';
import WorkSchedulesPage from './pages/settings/WorkSchedulesPage';
import VacationManagementPage from './pages/settings/VacationManagementPage';
import VacationBalancesPage from './pages/settings/VacationBalancesPage';
import MixedVacationPage from './pages/settings/MixedVacationPage';
import EmployeeOfMonthPage from './pages/settings/EmployeeOfMonthPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import './App.css';

function App() {
  useEffect(() => {
    // Setup global error handler
    logger.setupGlobalErrorHandler();
    logger.info('Application started');
  }, []);

  return (
    <ThemeConfigProvider>
      <CssBaseline enableColorScheme />
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route
                path="/app"
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
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
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="leaves" element={<LeavesPage />} />
                <Route path="leaves/create" element={<CreateLeavePage />} />
                <Route path="forget-checks" element={<ForgetCheckPage />} />
                <Route path="forget-checks/create" element={<CreateForgetCheckPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
                <Route path="permissions/create" element={<CreatePermissionPage />} />
                <Route path="overtime" element={<OvertimePage />} />
                <Route path="overtime/create" element={<CreateOvertimePage />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="requests/:id" element={<RequestDetailsPage />} />
                <Route path="vacation-request" element={<VacationRequestPage />} />
                <Route path="vacation" element={<VacationPage />} />
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
                <Route path="reports" element={<ReportsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />

                {/* Administration */}
                <Route path="security" element={<SecurityPage />} />
                <Route path="backups" element={<BackupsPage />} />
                <Route path="resigned" element={<ResignedPage />} />
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
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeConfigProvider>
  );
}

export default App;