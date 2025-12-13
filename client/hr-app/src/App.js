import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ModuleProvider } from './contexts/ModuleContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeConfigProvider } from './context/ThemeContext';
import { LicenseProvider } from './context/LicenseContext';
import PrivateRoute from './routes/PrivateRoute';
import CompanyRouteHandler from './components/routing/CompanyRouteHandler';
import CompanyRouter from './components/routing/CompanyRouter';

import logger from './utils/logger';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import NotFound from './pages/errors/NotFound';
import ServerError from './pages/errors/ServerError';
import AuthDebug from './pages/debug/AuthDebug';
import ErrorBoundary from './components/ErrorBoundary';
import LicenseNotificationToast from './components/license/LicenseNotificationToast';
import SeasonalEffectsManager from './components/seasonal/SeasonalEffectsManager';
import './components/seasonal/SeasonalEffects.css';
import './App.css';

function App() {
  const [seasonalSettings, setSeasonalSettings] = React.useState(() => {
    const saved = localStorage.getItem('seasonalSettings');
    return saved ? JSON.parse(saved) : {
      enabled: true,
      autoDetect: false,
      manualSeason: 'christmas',
      opacity: 0.8,
      enableMobile: true,
      christmas: { enabled: true, snow: true },
      newyear: { enabled: true, fireworks: true },
      eidFitr: { enabled: true, moon: true },
      eidAdha: { enabled: true, lantern: true }
    };
  });

  useEffect(() => {
    // Setup global error handler
    logger.setupGlobalErrorHandler();
    logger.info('Application started');

    // Listen for localStorage changes (from Settings page)
    const handleStorageChange = (e) => {
      if (e.key === 'seasonalSettings' && e.newValue) {
        setSeasonalSettings(JSON.parse(e.newValue));
      }
    };

    // Listen for custom event (for same-tab updates)
    const handleSettingsUpdate = (e) => {
      const saved = localStorage.getItem('seasonalSettings');
      if (saved) {
        setSeasonalSettings(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('seasonalSettingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('seasonalSettingsUpdated', handleSettingsUpdate);
    };
  }, []);

  return (
    <ThemeConfigProvider>
      <CssBaseline enableColorScheme />
      <AuthProvider>
        <ModuleProvider>
          <LicenseProvider>
            <NotificationProvider>
              <ErrorBoundary>
                <LicenseNotificationToast />
                <Router>
                  <CompanyRouteHandler>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<Login />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password/:token" element={<ResetPassword />} />
                      
                      {/* Error Routes */}
                      <Route path="/error" element={<ServerError />} />
                      <Route path="/404" element={<NotFound />} />
                      
                      {/* Debug Route */}
                      <Route path="/debug" element={<AuthDebug />} />
                      
                      {/* Simple test route */}
                      <Route path="/test" element={<div>Test Route - No Auth Required</div>} />

                      {/* Legacy /app routes - redirect to company routes */}
                      <Route path="/app/*" element={<Navigate to="/" replace />} />

                      {/* Company-scoped routes - ALL authenticated routes go here */}
                      <Route path="/company/:companySlug/*" element={
                        <PrivateRoute>
                          <CompanyRouter />
                        </PrivateRoute>
                      } />

                      {/* Redirect any other authenticated routes to company routes */}
                      <Route path="/dashboard" element={<Navigate to="/company/techcorp-solutions/dashboard" replace />} />
                      <Route path="/users" element={<Navigate to="/company/techcorp-solutions/users" replace />} />
                      <Route path="/profile" element={<Navigate to="/company/techcorp-solutions/profile" replace />} />
                      <Route path="/settings" element={<Navigate to="/company/techcorp-solutions/settings" replace />} />
                      <Route path="/departments" element={<Navigate to="/company/techcorp-solutions/departments" replace />} />
                      <Route path="/positions" element={<Navigate to="/company/techcorp-solutions/positions" replace />} />
                      <Route path="/attendance" element={<Navigate to="/company/techcorp-solutions/attendance" replace />} />
                      <Route path="/reports" element={<Navigate to="/company/techcorp-solutions/reports" replace />} />
                      <Route path="/analytics" element={<Navigate to="/company/techcorp-solutions/analytics" replace />} />

                      {/* Catch all - 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </CompanyRouteHandler>
                </Router>

              {/* Seasonal Effects */}
              <SeasonalEffectsManager
                key={JSON.stringify(seasonalSettings)}
                settings={seasonalSettings}
              />
            </ErrorBoundary>
          </NotificationProvider>
        </LicenseProvider>
        </ModuleProvider>
      </AuthProvider>
    </ThemeConfigProvider>
  );
}

export default App;