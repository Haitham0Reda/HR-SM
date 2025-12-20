import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  Snackbar,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import SystemMetrics from './SystemMetrics';
import TenantHealthMonitor from './TenantHealthMonitor';
import LicenseMonitor from './LicenseMonitor';
import realtimeService from '../services/realtimeService';

const EnhancedDashboard = () => {
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Initialize real-time connection
    realtimeService.connect();

    // Subscribe to connection status
    const unsubscribeConnection = realtimeService.subscribe('connection', (status) => {
      setConnected(status.connected);
      
      if (status.connected && status.reconnected) {
        setCurrentAlert({
          severity: 'success',
          message: 'Real-time connection restored'
        });
      } else if (!status.connected) {
        setCurrentAlert({
          severity: 'warning',
          message: 'Real-time connection lost. Attempting to reconnect...'
        });
      }
    });

    // Subscribe to system alerts
    const unsubscribeAlerts = realtimeService.subscribe('alerts', (alert) => {
      const newAlert = {
        id: Date.now(),
        timestamp: new Date(),
        ...alert
      };
      
      setAlerts(prev => [newAlert, ...prev.slice(0, 49)]); // Keep last 50 alerts
      
      // Show critical alerts immediately
      if (alert.level === 'critical') {
        setCurrentAlert({
          severity: 'error',
          message: `Critical Alert: ${alert.message}`
        });
      } else if (alert.level === 'warning') {
        setCurrentAlert({
          severity: 'warning',
          message: `Warning: ${alert.message}`
        });
      }
    });

    return () => {
      unsubscribeConnection();
      unsubscribeAlerts();
    };
  }, []);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      // Request fresh data from all components
      realtimeService.requestMetricsUpdate();
      
      // Show success message
      setCurrentAlert({
        severity: 'info',
        message: 'Dashboard refreshed'
      });
    } catch (error) {
      setCurrentAlert({
        severity: 'error',
        message: 'Failed to refresh dashboard'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCloseAlert = () => {
    setCurrentAlert(null);
  };

  const getConnectionStatusColor = () => {
    return connected ? 'success' : 'error';
  };

  const getConnectionStatusText = () => {
    return connected ? 'Real-time monitoring active' : 'Real-time monitoring disconnected';
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Platform Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Alert 
            severity={getConnectionStatusColor()} 
            variant="outlined"
            sx={{ py: 0 }}
          >
            {getConnectionStatusText()}
          </Alert>
        </Box>
      </Box>

      {/* Alert Banner for Critical Issues */}
      {alerts.length > 0 && alerts[0].level === 'critical' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Latest Critical Alert: {alerts[0].message}
          </Typography>
          <Typography variant="caption" display="block">
            {alerts[0].timestamp.toLocaleString()}
          </Typography>
        </Alert>
      )}

      {/* Dashboard Grid */}
      <Grid container spacing={3}>
        {/* System Metrics - Full width on mobile, half on desktop */}
        <Grid item xs={12} lg={6}>
          <SystemMetrics />
        </Grid>

        {/* License Monitor - Full width on mobile, half on desktop */}
        <Grid item xs={12} lg={6}>
          <LicenseMonitor />
        </Grid>

        {/* Tenant Health Monitor - Full width */}
        <Grid item xs={12}>
          <TenantHealthMonitor />
        </Grid>

        {/* Recent Alerts Panel */}
        {alerts.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <NotificationsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Recent Alerts ({alerts.length})
                </Typography>
              </Box>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {alerts.slice(0, 10).map((alert) => (
                  <Alert
                    key={alert.id}
                    severity={alert.level === 'critical' ? 'error' : alert.level}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>{alert.type}:</strong> {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.timestamp.toLocaleString()}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

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

      {/* Snackbar for Alerts */}
      <Snackbar
        open={!!currentAlert}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {currentAlert && (
          <Alert
            onClose={handleCloseAlert}
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

export default EnhancedDashboard;