import React, { useEffect, useCallback, useMemo, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { ReduxAuthProvider } from './store/providers/ReduxAuthProvider';
import { ReduxModuleProvider } from './store/providers/ReduxModuleProvider';
import { ReduxNotificationProvider } from './store/providers/ReduxNotificationProvider';
import { ThemeConfigProvider } from './context/ThemeContext';
import { LicenseProvider } from './context/LicenseContext';
import DialogsProvider from './hooks/useDialogs/DialogsProvider';
import NotificationsProvider from './hooks/useNotifications/NotificationsProvider';
import PrivateRoute from './routes/PrivateRoute';
import CompanyRouteHandler from './components/routing/CompanyRouteHandler';
import CompanyRouter from './components/routing/CompanyRouter';
import LazyWrapper from './components/performance/LazyWrapper';

import logger from './utils/logger';
import './utils/performanceConfig'; // Import performance optimizations
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import NotFound from './pages/errors/NotFound';
import ServerError from './pages/errors/ServerError';
import AuthDebug from './pages/debug/AuthDebug';
import ErrorBoundary from './components/ErrorBoundary';
import LicenseNotificationToast from './components/license/LicenseNotificationToast';
import './components/seasonal/SeasonalEffects.css';
import './App.css';

// Lazy load heavy components
const SeasonalEffectsManager = lazy(() => import('./components/seasonal/SeasonalEffectsManager'));

// Memoized components to prevent unnecessary re-renders
const MemoizedPrivateRoute = React.memo(PrivateRoute);
const MemoizedCompanyRouter = React.memo(CompanyRouter);

// Lazy-loaded seasonal effects with wrapper
const LazySeasonalEffects = React.memo(({ settings, settingsKey }) => (
  <LazyWrapper>
    <SeasonalEffectsManager
      key={settingsKey}
      settings={settings}
    />
  </LazyWrapper>
));

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

  // Memoize the seasonal settings key to prevent unnecessary re-renders
  const seasonalSettingsKey = useMemo(() => 
    JSON.stringify(seasonalSettings), 
    [seasonalSettings]
  );

  // Optimize event handlers with useCallback
  const handleStorageChange = useCallback((e) => {
    if (e.key === 'seasonalSettings' && e.newValue) {
      try {
        setSeasonalSettings(JSON.parse(e.newValue));
      } catch (error) {
        console.error('Failed to parse seasonal settings:', error);
      }
    }
  }, []);

  const handleSettingsUpdate = useCallback(() => {
    const saved = localStorage.getItem('seasonalSettings');
    if (saved) {
      try {
        setSeasonalSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse seasonal settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Setup global error handler
    logger.setupGlobalErrorHandler();
    logger.info('Application started');

    // Use passive listeners for better performance
    window.addEventListener('storage', handleStorageChange, { passive: true });
    window.addEventListener('seasonalSettingsUpdated', handleSettingsUpdate, { passive: true });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('seasonalSettingsUpdated', handleSettingsUpdate);
    };
  }, [handleStorageChange, handleSettingsUpdate]);

  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <ThemeConfigProvider>
          <CssBaseline enableColorScheme />
          <ReduxAuthProvider>
            <ReduxModuleProvider>
              <LicenseProvider>
                <ReduxNotificationProvider>
                  <DialogsProvider>
                    <NotificationsProvider>
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
                            <MemoizedPrivateRoute>
                              <MemoizedCompanyRouter />
                            </MemoizedPrivateRoute>
                          } />

                          {/* Redirect any other authenticated routes to company routes */}
                          {/* These will be handled by CompanyRouteHandler for dynamic company routing */}
                          <Route path="/dashboard" element={<Navigate to="/" replace />} />
                          <Route path="/users" element={<Navigate to="/" replace />} />
                          <Route path="/profile" element={<Navigate to="/" replace />} />
                          <Route path="/settings" element={<Navigate to="/" replace />} />
                          <Route path="/departments" element={<Navigate to="/" replace />} />
                          <Route path="/positions" element={<Navigate to="/" replace />} />
                          <Route path="/attendance" element={<Navigate to="/" replace />} />
                          <Route path="/forget-checks" element={<Navigate to="/" replace />} />
                          <Route path="/missions" element={<Navigate to="/" replace />} />
                          <Route path="/sick-leaves" element={<Navigate to="/" replace />} />
                          <Route path="/permissions" element={<Navigate to="/" replace />} />
                          <Route path="/overtime" element={<Navigate to="/" replace />} />
                          <Route path="/requests" element={<Navigate to="/" replace />} />
                          <Route path="/vacation" element={<Navigate to="/" replace />} />
                          <Route path="/payroll" element={<Navigate to="/" replace />} />
                          <Route path="/documents" element={<Navigate to="/" replace />} />
                          <Route path="/templates" element={<Navigate to="/" replace />} />
                          <Route path="/hardcopies" element={<Navigate to="/" replace />} />
                          <Route path="/announcements" element={<Navigate to="/" replace />} />
                          <Route path="/events" element={<Navigate to="/" replace />} />
                          <Route path="/surveys" element={<Navigate to="/" replace />} />
                          <Route path="/holidays" element={<Navigate to="/" replace />} />
                          <Route path="/vacations" element={<Navigate to="/" replace />} />
                          <Route path="/reports" element={<Navigate to="/" replace />} />
                          <Route path="/analytics" element={<Navigate to="/" replace />} />
                          <Route path="/tasks" element={<Navigate to="/" replace />} />
                          <Route path="/pricing" element={<Navigate to="/" replace />} />
                          <Route path="/security" element={<Navigate to="/" replace />} />
                          <Route path="/backups" element={<Navigate to="/" replace />} />
                          <Route path="/resigned" element={<Navigate to="/" replace />} />
                          <Route path="/roles" element={<Navigate to="/" replace />} />
                          <Route path="/system-settings" element={<Navigate to="/" replace />} />

                          {/* Catch all - 404 */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </CompanyRouteHandler>
                    </Router>

                  {/* Seasonal Effects - Lazy loaded */}
                  <LazySeasonalEffects
                    settings={seasonalSettings}
                    settingsKey={seasonalSettingsKey}
                  />
                </ErrorBoundary>
              </NotificationsProvider>
            </DialogsProvider>
          </ReduxNotificationProvider>
            </LicenseProvider>
            </ReduxModuleProvider>
          </ReduxAuthProvider>
        </ThemeConfigProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;