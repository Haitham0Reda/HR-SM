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
import theme from './theme/customizations';
import './App.css';

// Placeholder components for routes not yet implemented
const PlaceholderPage = ({ title }) => (
  <div style={{ padding: '24px' }}>
    <h2>{title}</h2>
    <p>This page is under construction.</p>
  </div>
);

const DepartmentsPage = () => <PlaceholderPage title="Departments" />;
const PositionsPage = () => <PlaceholderPage title="Positions" />;
const AttendancePage = () => <PlaceholderPage title="Attendance" />;
const LeavesPage = () => <PlaceholderPage title="Leaves" />;
const PermissionsPage = () => <PlaceholderPage title="Permissions" />;
const RequestsPage = () => <PlaceholderPage title="Requests" />;
const PayrollPage = () => <PlaceholderPage title="Payroll" />;
const DocumentsPage = () => <PlaceholderPage title="Documents" />;
const TemplatesPage = () => <PlaceholderPage title="Templates" />;
const AnnouncementsPage = () => <PlaceholderPage title="Announcements" />;
const EventsPage = () => <PlaceholderPage title="Events" />;
const SurveysPage = () => <PlaceholderPage title="Surveys" />;
const HolidaysPage = () => <PlaceholderPage title="Holidays" />;
const VacationsPage = () => <PlaceholderPage title="Vacations" />;
const ReportsPage = () => <PlaceholderPage title="Reports" />;
const AnalyticsPage = () => <PlaceholderPage title="Analytics" />;
const SecurityPage = () => <PlaceholderPage title="Security" />;
const BackupsPage = () => <PlaceholderPage title="Backups" />;
const ResignedPage = () => <PlaceholderPage title="Resigned Employees" />;

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
