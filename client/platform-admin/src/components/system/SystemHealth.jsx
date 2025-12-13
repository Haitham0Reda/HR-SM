import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import systemService from '../../services/systemService';

const SystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const loadHealth = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setError('');
      }
      
      const response = await systemService.getHealth();
      setHealth(response.data);
      setConnectionStatus('connected');
      setRetryCount(0);
      
      // If we were in error state and now successful, show recovery message briefly
      if (error && !isRetry) {
        setError('Connection restored');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.warn('Health check failed:', err.message);
      
      // Determine error type and set appropriate status
      if (err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_REFUSED') {
        setConnectionStatus('error');
        setError('Server is not responding. Retrying...');
      } else if (err.response?.status === 503) {
        setConnectionStatus('unstable');
        setError('System is restarting or under maintenance');
      } else if (err.response?.status >= 500) {
        setConnectionStatus('unstable');
        setError('Server error. Monitoring...');
      } else {
        setConnectionStatus('error');
        setError(err.response?.data?.error?.message || 'Failed to load system health');
      }

      // Implement retry logic with exponential backoff for network errors
      if ((err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_REFUSED') && retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 second delay
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadHealth(true);
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [error, retryCount]);

  useEffect(() => {
    loadHealth();
    
    // Adaptive polling based on connection status
    let interval;
    const setupInterval = () => {
      if (interval) clearInterval(interval);
      
      let intervalTime;
      if (connectionStatus === 'error') {
        intervalTime = 30000; // Retry every 30 seconds if error
      } else if (connectionStatus === 'unstable') {
        intervalTime = 45000; // Check every 45 seconds if unstable
      } else {
        intervalTime = 60000; // Normal interval (60s) to reduce server load
      }
      
      interval = setInterval(loadHealth, intervalTime);
    };

    setupInterval();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus, loadHealth]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircleIcon color="success" />;
      case 'degraded':
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'unhealthy':
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <CheckCircleIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'success';
      case 'degraded':
      case 'warning':
        return 'warning';
      case 'unhealthy':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !health) {
    const severity = connectionStatus === 'unstable' ? 'warning' : 'error';
    return (
      <Box>
        <Alert severity={severity} sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            {error}
          </Typography>
          {connectionStatus === 'unstable' && (
            <Typography variant="caption" color="text.secondary">
              The server appears to be restarting frequently. This is normal during development when using nodemon.
            </Typography>
          )}
        </Alert>
        {loading && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* Connection Status Alert */}
      {connectionStatus === 'unstable' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Connection is unstable - the server is restarting frequently. This is normal in development mode with nodemon.
          </Typography>
        </Alert>
      )}
      
      {error && health && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Overall Status */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getStatusIcon(health?.status)}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">
                    System Status
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Never'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Connection: {connectionStatus}
                    {retryCount > 0 && ` (Retry ${retryCount}/3)`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={health?.status || 'Unknown'}
                      color={getStatusColor(health?.status)}
                      size="large"
                    />
                    <Tooltip title="Refresh health status">
                      <IconButton 
                        size="small" 
                        onClick={() => loadHealth()}
                        disabled={loading}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Chip
                    label={connectionStatus}
                    color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'unstable' ? 'warning' : 'error'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Status */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon(health?.checks?.database?.status)}
                <Typography variant="h6">
                  Database
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: {health?.checks?.database?.status || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                State: {health?.checks?.database?.state || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Status */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon(health?.checks?.memory?.status)}
                <Typography variant="h6">
                  Memory
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: {health?.checks?.memory?.status || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usage: {health?.checks?.memory?.usagePercent || 0}% ({health?.checks?.memory?.heapUsed || 0}MB / {health?.checks?.memory?.heapTotal || 0}MB)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Disk Status */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon(health?.checks?.disk?.status)}
                <Typography variant="h6">
                  Disk Storage
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: {health?.checks?.disk?.status || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {health?.checks?.disk?.message || 'Disk monitoring available'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Uptime */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">
                  System Uptime
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Uptime: {Math.floor((health?.uptime || 0) / 3600)}h {Math.floor(((health?.uptime || 0) % 3600) / 60)}m
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Version: {health?.version || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Usage Progress */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memory Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={health?.checks?.memory?.usagePercent || 0}
                    color={
                      (health?.checks?.memory?.usagePercent || 0) > 80
                        ? 'error'
                        : (health?.checks?.memory?.usagePercent || 0) > 60
                        ? 'warning'
                        : 'success'
                    }
                  />
                </Box>
                <Typography variant="body2">
                  {health?.checks?.memory?.usagePercent || 0}%
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {health?.checks?.memory?.heapUsed || 0} MB / {health?.checks?.memory?.heapTotal || 0} MB
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Check: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {health?.status || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemHealth;
