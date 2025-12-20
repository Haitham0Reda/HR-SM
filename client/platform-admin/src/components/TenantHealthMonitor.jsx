import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Business as BusinessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  People as PeopleIcon,
  Api as ApiIcon
} from '@mui/icons-material';
import realtimeService from '../services/realtimeService';
import { platformService } from '../services/platformApi';

const TenantHealthMonitor = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [healthSummary, setHealthSummary] = useState({
    total: 0,
    healthy: 0,
    warning: 0,
    critical: 0
  });

  useEffect(() => {
    loadTenants();

    // Subscribe to real-time tenant updates
    const unsubscribeTenants = realtimeService.subscribe('tenants', (data) => {
      if (data.type === 'tenant-update') {
        setTenants(prev => prev.map(tenant => 
          tenant._id === data.tenantId ? { ...tenant, ...data.updates } : tenant
        ));
      } else if (data.type === 'tenant-metrics') {
        updateTenantMetrics(data.tenantId, data.metrics);
      }
    });

    // Subscribe to connection status
    const unsubscribeConnection = realtimeService.subscribe('connection', (status) => {
      setConnected(status.connected);
    });

    return () => {
      unsubscribeTenants();
      unsubscribeConnection();
    };
  }, []);

  useEffect(() => {
    // Calculate health summary when tenants change
    const summary = tenants.reduce((acc, tenant) => {
      acc.total++;
      const health = getTenantHealth(tenant);
      acc[health]++;
      return acc;
    }, { total: 0, healthy: 0, warning: 0, critical: 0 });
    
    setHealthSummary(summary);
  }, [tenants]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const response = await platformService.getTenants();
      setTenants(response.data || []);
    } catch (error) {
      console.error('Failed to load tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTenantMetrics = (tenantId, metrics) => {
    setTenants(prev => prev.map(tenant => 
      tenant._id === tenantId 
        ? { ...tenant, metrics: { ...tenant.metrics, ...metrics } }
        : tenant
    ));
  };

  const getTenantHealth = (tenant) => {
    if (!tenant.metrics) return 'warning';
    
    const { storageUsed = 0, maxStorage = 1024, activeUsers = 0, maxUsers = 50 } = tenant.metrics;
    const storagePercentage = (storageUsed / maxStorage) * 100;
    const userPercentage = (activeUsers / maxUsers) * 100;
    
    // Critical conditions
    if (storagePercentage > 90 || userPercentage > 95 || tenant.status === 'suspended') {
      return 'critical';
    }
    
    // Warning conditions
    if (storagePercentage > 75 || userPercentage > 80) {
      return 'warning';
    }
    
    return 'healthy';
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return <BusinessIcon color="disabled" />;
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
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

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const refreshTenant = async (tenantId) => {
    try {
      const response = await platformService.getTenantMetrics(tenantId);
      updateTenantMetrics(tenantId, response.data);
    } catch (error) {
      console.error('Failed to refresh tenant metrics:', error);
    }
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Tenant Health Monitor
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Tenant Health Monitor
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={connected ? 'Live' : 'Offline'}
            color={connected ? 'success' : 'error'}
            size="small"
          />
          <IconButton onClick={loadTenants} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {!connected && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Real-time updates unavailable. Data may be outdated.
        </Alert>
      )}

      {/* Health Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">
                {healthSummary.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Tenants
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {healthSummary.healthy}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Healthy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                {healthSummary.warning}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Warning
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {healthSummary.critical}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Critical
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tenant List */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <List>
            {tenants.map((tenant, index) => {
              const health = getTenantHealth(tenant);
              const metrics = tenant.metrics || {};
              
              return (
                <ListItem
                  key={tenant._id}
                  divider={index < tenants.length - 1}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getHealthIcon(health)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {tenant.name}
                        </Typography>
                        <Chip
                          label={health}
                          color={getHealthColor(health)}
                          size="small"
                        />
                        <Chip
                          label={tenant.status || 'active'}
                          color={tenant.status === 'suspended' ? 'error' : 'success'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <PeopleIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {metrics.activeUsers || 0}/{metrics.maxUsers || 50} users
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <StorageIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {formatBytes(metrics.storageUsed || 0)}/{formatBytes(metrics.maxStorage || 1024)}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <ApiIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {metrics.apiCallsThisMonth || 0} calls
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        
                        {/* Usage bars */}
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Storage: {((metrics.storageUsed || 0) / (metrics.maxStorage || 1024) * 100).toFixed(1)}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min((metrics.storageUsed || 0) / (metrics.maxStorage || 1024) * 100, 100)}
                            color={((metrics.storageUsed || 0) / (metrics.maxStorage || 1024) * 100) > 75 ? 'warning' : 'primary'}
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Tooltip title="Refresh metrics">
                      <IconButton
                        edge="end"
                        onClick={() => refreshTenant(tenant._id)}
                        size="small"
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
          
          {tenants.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                No tenants found
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Paper>
  );
};

export default TenantHealthMonitor;