import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { usePlatformAuth } from '../store/providers/ReduxPlatformAuthProvider';
import { CircularProgress, Box } from '@mui/material';

// Pages
import LoginPage from '../pages/LoginPage';
import PlatformDashboard from '../pages/PlatformDashboard';
import TenantsPage from '../pages/TenantsPage';
import SubscriptionsPage from '../pages/SubscriptionsPage';
import ModulesPage from '../pages/ModulesPage';
import SystemPage from '../pages/SystemPage';
import CompaniesPage from '../pages/CompaniesPage';
import AnalyticsPage from '../pages/AnalyticsPage';

// Layout
import PlatformLayout from '../components/layout/PlatformLayout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = usePlatformAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = usePlatformAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const PlatformRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PlatformLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PlatformDashboard />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="system" element={<SystemPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default PlatformRoutes;
