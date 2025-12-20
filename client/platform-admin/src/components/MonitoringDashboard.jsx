import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  Snackbar,
  Fab,
  Tooltip,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon
} from '@mui/icons-material';
import SystemMetrics from './SystemMetrics';
import TenantHealthMonitor from './TenantHealthMonitor';
import LicenseMonitor from './LicenseMonitor';
import { useRealtime, useSystemAlerts } from '../hooks/useRealtime';
import { useApi } from '../contexts/ApiContext';

const MonitoringDashboard = () => {
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  const { connected } = useRealtime();
  const { alerts, currentAlert, dismissCurrentAlert } = useSystemAlerts();
  const { status, isHealthy, hasErrors } = useApi();

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefreshAll();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Fullscreen handling
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'F11') {
        event.preventDefault();
        setFullscreen(!fullscreen);
      }
      if (event.key === 'Escape' && fullscreen) {
        setFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [fullscreen]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      // Trigger refresh for all components
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const handleSettingsClick = (event) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
    if (!fullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const getOverallHealthStatus = () => {
    if (!isHealthy) return 'critical';
    if (hasErrors) return 'warning';
    if (!connected) return 'warning';
    return 'healthy';
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const containerStyle = fullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'background.default',
    overflow: 'auto',
    p: 2
  } : { flexGrow: 1, p: 3 };

  return (
    <Box sx={containerStyle}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            System Monitoring Dashboard
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              label={`Overall Status: ${getOverallHealthStatus()}`}
              color={getHealthStatusColor(getOverallHealthStatus())}
              variant="outlined"
            />
            <Chip
              label={connected ? 'Real-time Active' : 'Real-time Disconnected'}
              color={connected ? 'success' : 'error'}
              size="small"
            />
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {/* Auto-refresh indicator */}
          {autoRefresh && (
            <Chip
              label={`Auto-refresh: ${refreshInterval}s`}
              color="primary"
              size="small"
              variant="outlined"
            />
          )}
          
          {/* Settings menu */}
          <IconButton onClick={handleSettingsClick}>
            <SettingsIcon />
          </IconButton>
          
          {/* Fullscreen toggle */}
          <IconButton onClick={toggleFullscreen}>
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* System Status Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary">
                Platform API
              </Typography>
              <Chip
                label={status.platform.connected ? 'Connected' : 'Disconnected'}
                color={status.platform.connected ? 'success' : 'error'}
                size="small"
                sx={{ mt: 1 }}
              />
              {status.platform.lastCheck && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  Last check: {status.platform.lastCheck.toLocaleTimeString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary">
                License Server
              </Typography>
              <Chip
                label={status.licenseServer.connected ? 'Connected' : 'Disconnected'}
                color={status.licenseServer.connected ? 'success' : 'error'}
                size="small"
                sx={{ mt: 1 }}
              />
              {status.licenseServer.lastCheck && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  Last check: {status.licenseServer.lastCheck.toLocaleTimeString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary">
                Real-time
              </Typography>
              <Chip
                label={status.realtime.connected ? 'Connected' : 'Disconnected'}
                color={status.realtime.connected ? 'success' : 'error'}
                size="small"
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                WebSocket monitoring
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary">
                Active Alerts
              </Typography>
              <Typography variant="h4" color={alerts.length > 0 ? 'error.main' : 'success.main'}>
                {alerts.length}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                System notifications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Critical Alert Banner */}
      {alerts.length > 0 && alerts[0].level === 'critical' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Critical Alert: {alerts[0].message}
          </Typography>
          <Typography variant="caption" display="block">
            {alerts[0].timestamp?.toLocaleString()}
          </Typography>
        </Alert>
      )}

      {/* Main Monitoring Components */}
      <Grid container spacing={3}>
        {/* System Metrics */}
        <Grid item xs={12} lg={6}>
          <SystemMetrics />
        </Grid>

        {/* License Monitor */}
        <Grid item xs={12} lg={6}>
          <LicenseMonitor />
        </Grid>

        {/* Tenant Health Monitor - Full width */}
        <Grid item xs={12}>
          <TenantHealthMonitor />
        </Grid>
      </Grid>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: { minWidth: 250 }
        }}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto-refresh"
          />
        </MenuItem>
        
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
            }
            label="Notifications"
          />
        </MenuItem>
        
        <MenuItem onClick={handleSettingsClose}>
          <Typography variant="body2">
            Refresh Interval: {refreshInterval}s
          </Typography>
        </MenuItem>
      </Menu>

      {/* Floating Action Button for Manual Refresh */}
      <Tooltip title="Refresh all data">
        <Fab
          color="primary"
          aria-label="refresh"
          onClick={handleRefreshAll}
          disabled={refreshing}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <RefreshIcon />
        </Fab>
      </Tooltip>

      {/* Notification Toggle FAB */}
      <Tooltip title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}>
        <Fab
          color="secondary"
          aria-label="notifications"
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
          }}
        >
          {notificationsEnabled ? <NotificationsIcon /> : <NotificationsOffIcon />}
        </Fab>
      </Tooltip>

      {/* Snackbar for Current Alert */}
      <Snackbar
        open={!!currentAlert && notificationsEnabled}
        autoHideDuration={6000}
        onClose={dismissCurrentAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {currentAlert && (
          <Alert
            onClose={dismissCurrentAlert}
            severity={currentAlert.severity}
            sx={{ width: '100%' }}
          >
            {currentAlert.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default MonitoringDashboard;