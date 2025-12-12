import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import systemService from '../../services/systemService';

const SystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHealth();
    // Refresh every 30 seconds
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    try {
      setError('');
      const response = await systemService.getHealth();
      setHealth(response.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Overall Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getStatusIcon(health?.status)}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">
                    System Status
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last checked: {new Date().toLocaleTimeString()}
                  </Typography>
                </Box>
                <Chip
                  label={health?.status || 'Unknown'}
                  color={getStatusColor(health?.status)}
                  size="large"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Status */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon(health?.database?.status)}
                <Typography variant="h6">
                  Database
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: {health?.database?.status || 'Unknown'}
              </Typography>
              {health?.database?.responseTime && (
                <Typography variant="body2" color="text.secondary">
                  Response Time: {health.database.responseTime}ms
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Redis Status */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon(health?.redis?.status)}
                <Typography variant="h6">
                  Redis Cache
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: {health?.redis?.status || 'Not configured'}
              </Typography>
              {health?.redis?.responseTime && (
                <Typography variant="body2" color="text.secondary">
                  Response Time: {health.redis.responseTime}ms
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* API Status */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon(health?.api?.status)}
                <Typography variant="h6">
                  API Server
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status: {health?.api?.status || 'Unknown'}
              </Typography>
              {health?.api?.uptime && (
                <Typography variant="body2" color="text.secondary">
                  Uptime: {Math.floor(health.api.uptime / 3600)}h
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Resources */}
        {health?.resources && (
          <>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Memory Usage
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={health.resources.memoryUsagePercent || 0}
                        color={
                          health.resources.memoryUsagePercent > 80
                            ? 'error'
                            : health.resources.memoryUsagePercent > 60
                            ? 'warning'
                            : 'success'
                        }
                      />
                    </Box>
                    <Typography variant="body2">
                      {health.resources.memoryUsagePercent?.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {((health.resources.memoryUsed || 0) / 1024 / 1024 / 1024).toFixed(2)} GB / {((health.resources.memoryTotal || 0) / 1024 / 1024 / 1024).toFixed(2)} GB
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    CPU Usage
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={health.resources.cpuUsagePercent || 0}
                        color={
                          health.resources.cpuUsagePercent > 80
                            ? 'error'
                            : health.resources.cpuUsagePercent > 60
                            ? 'warning'
                            : 'success'
                        }
                      />
                    </Box>
                    <Typography variant="body2">
                      {health.resources.cpuUsagePercent?.toFixed(1)}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
};

export default SystemHealth;
