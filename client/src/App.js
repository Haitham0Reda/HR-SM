import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './routes/PrivateRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import DashboardLayout from './components/DashboardLayout';
import UsersPage from './pages/users/UsersPage';
import SchoolsPage from './pages/schools/SchoolsPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import PositionsPage from './pages/positions/PositionsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import LeavesPage from './pages/leaves/LeavesPage';
import PermissionsPage from './pages/permissions/PermissionsPage';
import RequestsPage from './pages/requests/RequestsPage';
import PayrollPage from './pages/payroll/PayrollPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import TemplatesPage from './pages/templates/TemplatesPage';
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
import theme from './theme/customizations';
import './App.css';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* User Management */}
                <Route path="users" element={<UsersPage />} />

                {/* Organization */}
                <Route path="schools" element={<SchoolsPage />} />
                <Route path="departments" element={<DepartmentsPage />} />
                <Route path="positions" element={<PositionsPage />} />

                {/* HR Operations */}
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="leaves" element={<LeavesPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="payroll" element={<PayrollPage />} />

                {/* Documents */}
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="templates" element={<TemplatesPage />} />

                {/* Communication */}
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="surveys" element={<SurveysPage />} />

                {/* Advanced */}
                <Route path="holidays" element={<HolidaysPage />} />
                <Route path="vacations" element={<VacationsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />

                {/* Administration */}
                <Route path="security" element={<SecurityPage />} />
                <Route path="backups" element={<BackupsPage />} />
                <Route path="resigned" element={<ResignedPage />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
