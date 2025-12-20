import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { licenseService } from '../services/licenseApi';
import realtimeService from '../services/realtimeService';

const LicenseMonitor = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [analytics, setAnalytics] = useState({
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    revoked: 0
  });

  useEffect(() => {
    loadLicenseAnalytics();

    // Subscribe to real-time license updates
    const unsubscribeLicenses = realtimeService.subscribe('licenses', (data) => {
      if (data.type === 'license-update') {
        updateLicense(data.licenseNumber, data.updates);
      } else if (data.type === 'license-created') {
        addLicense(data.license);
      } else if (data.type === 'license-revoked') {
        updateLicense(data.licenseNumber, { status: 'revoked' });
      }
    });

    // Subscribe to connection status
    const unsubscribeConnection = realtimeService.subscribe('connection', (status) => {
      setConnected(status.connected);
    });

    return () => {
      unsubscribeLicenses();
      unsubscribeConnection();
    };
  }, []);

  const loadLicenseAnalytics = async () => {
    try {
      setLoading(true);
      const response = await licenseService.getLicenseAnalytics();
      
      if (response.success) {
        setLicenses(response.data.licenses || []);
        setAnalytics(response.data.summary || {
          total: 0,
          active: 0,
          expiring: 0,
          expired: 0,
          revoked: 0
        });
      }
    } catch (error) {
      console.error('Failed to load license analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLicense = (licenseNumber, updates) => {
    setLicenses(prev => prev.map(license => 
      license.licenseNumber === licenseNumber 
        ? { ...license, ...updates }
        : license
    ));
  };

  const addLicense = (newLicense) => {
    setLicenses(prev => [newLicense, ...prev]);
    setAnalytics(prev => ({
      ...prev,
      total: prev.total + 1,
      active: prev.active + 1
    }));
  };

  const getLicenseStatus = (license) => {
    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (license.status === 'revoked') return 'revoked';
    if (license.status === 'suspended') return 'suspended';
    if (expiresAt < now) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'active';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon color="success" />;
      case 'expiring':
        return <ScheduleIcon color="warning" />;
      case 'expired':
        return <ErrorIcon color="error" />;
      case 'revoked':
      case 'suspended':
        return <BlockIcon color="error" />;
      default:
        return <SecurityIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expiring':
        return 'warning';
      case 'expired':
      case 'revoked':
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  const refreshLicense = async (licenseNumber) => {
    try {
      const response = await licenseService.getLicense(licenseNumber);
      if (response.success) {
        updateLicense(licenseNumber, response.data);
      }
    } catch (error) {
      console.error('Failed to refresh license:', error);
    }
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          License Monitor
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          License Monitor
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={connected ? 'Live' : 'Offline'}
            color={connected ? 'success' : 'error'}
            size="small"
          />
          <IconButton onClick={loadLicenseAnalytics} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {!connected && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Real-time license updates unavailable. Data may be outdated.
        </Alert>
      )}

      {/* License Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">
                {analytics.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {analytics.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                {analytics.expiring}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expiring
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {analytics.expired}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expired
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {analytics.revoked}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Revoked
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* License List */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <List>
            {licenses.map((license, index) => {
              const status = getLicenseStatus(license);
              const daysUntilExpiry = getDaysUntilExpiry(license.expiresAt);
              
              return (
                <ListItem
                  key={license.licenseNumber}
                  divider={index < licenses.length - 1}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    {getStatusIcon(status)}
                  </Avatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {license.tenantName}
                        </Typography>
                        <Chip
                          label={status}
                          color={getStatusColor(status)}
                          size="small"
                        />
                        <Chip
                          label={license.type}
                          color="primary"
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          License: {license.licenseNumber}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Expires: {formatDate(license.expiresAt)}
                          {status === 'expiring' && (
                            <Typography component="span" color="warning.main" sx={{ ml: 1 }}>
                              ({daysUntilExpiry} days left)
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Features: {license.features?.modules?.join(', ') || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Max Users: {license.features?.maxUsers || 'N/A'} | 
                          Activations: {license.activations?.length || 0}/{license.maxActivations || 1}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Tooltip title="Refresh license">
                      <IconButton
                        edge="end"
                        onClick={() => refreshLicense(license.licenseNumber)}
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
          
          {licenses.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                No licenses found
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Paper>
  );
};

export default LicenseMonitor;