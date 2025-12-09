import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import systemService from '../../services/systemService';

const UsageMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMetrics();
    // Refresh every 60 seconds
    const interval = setInterval(loadMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      setError('');
      const response = await systemService.getUsageStats();
      setMetrics(response.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load usage metrics');
    } finally {
      setLoading(false);
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
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Tenants
              </Typography>
              <Typography variant="h4">
                {metrics?.summary?.totalTenants || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics?.summary?.activeTenants || 0} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">
                {metrics?.summary?.totalUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                API Calls (Today)
              </Typography>
              <Typography variant="h4">
                {metrics?.summary?.apiCallsToday || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Storage
              </Typography>
              <Typography variant="h4">
                {((metrics?.summary?.totalStorage || 0) / 1024 / 1024 / 1024).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                GB
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Per-Tenant Usage Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Per-Tenant Usage Statistics
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tenant</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Users</TableCell>
                      <TableCell align="right">Storage (GB)</TableCell>
                      <TableCell align="right">API Calls (Month)</TableCell>
                      <TableCell align="right">Modules</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics?.tenantUsage && metrics.tenantUsage.length > 0 ? (
                      metrics.tenantUsage.map((tenant) => (
                        <TableRow key={tenant.tenantId}>
                          <TableCell>{tenant.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={tenant.status}
                              color={tenant.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {tenant.usage?.userCount || 0}
                          </TableCell>
                          <TableCell align="right">
                            {((tenant.usage?.storageUsed || 0) / 1024 / 1024 / 1024).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {tenant.usage?.apiCallsThisMonth || 0}
                          </TableCell>
                          <TableCell align="right">
                            {tenant.enabledModules?.length || 0}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No tenant usage data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UsageMetrics;
