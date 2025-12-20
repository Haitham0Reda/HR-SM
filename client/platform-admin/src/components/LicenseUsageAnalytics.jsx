import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useApi } from '../contexts/ApiContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  TimeScale
);

const LicenseUsageAnalytics = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [licenseData, setLicenseData] = useState({
    summary: {
      totalLicenses: 0,
      activeLicenses: 0,
      expiringLicenses: 0,
      expiredLicenses: 0,
      revokedLicenses: 0,
      utilizationRate: 0
    },
    timeSeries: [],
    byType: [],
    expiringLicenses: [],
    usageStats: []
  });

  const { api, status } = useApi();

  useEffect(() => {
    loadLicenseData();
  }, [timeRange]);

  const loadLicenseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateRange = getDateRange(timeRange);
      const [analyticsResponse, expiringResponse, usageResponse] = await Promise.all([
        api.license.getLicenseAnalytics(),
        api.license.getExpiringLicenses(30),
        api.license.getLicenseUsageAnalytics(dateRange)
      ]);
      
      if (analyticsResponse.success && expiringResponse.success && usageResponse.success) {
        setLicenseData({
          summary: analyticsResponse.data.summary,
          timeSeries: usageResponse.data.timeSeries || [],
          byType: analyticsResponse.data.byType || [],
          expiringLicenses: expiringResponse.data.licenses || [],
          usageStats: usageResponse.data.usageStats || []
        });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (range) => {
    const now = new Date();
    const start = new Date();
    
    switch (range) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }
    
    return { start: start.toISOString(), end: now.toISOString() };
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
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expiring':
        return 'warning';
      case 'expired':
      case 'revoked':
        return 'error';
      default:
        return 'default';
    }
  };

  // Chart configurations
  const licenseUsageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'License Usage Over Time',
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };

  const licenseUsageChartData = {
    labels: licenseData.timeSeries.map(point => new Date(point.date)),
    datasets: [
      {
        label: 'Active Licenses',
        data: licenseData.timeSeries.map(point => point.activeLicenses),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Total Validations',
        data: licenseData.timeSeries.map(point => point.totalValidations),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        yAxisID: 'y1'
      }
    ]
  };

  // Add second y-axis for validations
  licenseUsageChartOptions.scales.y1 = {
    type: 'linear',
    display: true,
    position: 'right',
    grid: {
      drawOnChartArea: false,
    },
  };

  const licenseTypeDistributionData = {
    labels: licenseData.byType.map(type => type.type.toUpperCase()),
    datasets: [
      {
        data: licenseData.byType.map(type => type.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'License Distribution by Type',
      },
    }
  };

  const handleExport = () => {
    // Create CSV data
    const csvData = [
      ['Date', 'Active Licenses', 'Total Validations', 'New Licenses', 'Expired Licenses'],
      ...licenseData.timeSeries.map(point => [
        new Date(point.date).toLocaleDateString(),
        point.activeLicenses,
        point.totalValidations,
        point.newLicenses || 0,
        point.expiredLicenses || 0
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-analytics-${timeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          License Usage Analytics
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" component="h2">
          License Usage Analytics
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Export Data">
            <IconButton onClick={handleExport}>
              <ExportIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh">
            <IconButton onClick={loadLicenseData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {!status.licenseServer.connected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          License server disconnected. License data may be unavailable.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* License Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <SecurityIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {licenseData.summary.totalLicenses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All licenses
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Active</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {licenseData.summary.activeLicenses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <ScheduleIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Expiring</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {licenseData.summary.expiringLicenses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Next 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Expired</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {licenseData.summary.expiredLicenses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Past expiry
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Utilization</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {licenseData.summary.utilizationRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average usage
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* License Usage Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box height={400}>
                <Line data={licenseUsageChartData} options={licenseUsageChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* License Type Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Box height={400}>
                <Doughnut data={licenseTypeDistributionData} options={doughnutOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Information */}
      <Grid container spacing={3}>
        {/* Expiring Licenses */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Expiring Licenses ({licenseData.expiringLicenses.length})
                </Typography>
              </Box>
              
              {licenseData.expiringLicenses.length > 0 ? (
                <List>
                  {licenseData.expiringLicenses.slice(0, 5).map((license, index) => {
                    const daysLeft = getDaysUntilExpiry(license.expiresAt);
                    return (
                      <ListItem key={index} divider={index < 4}>
                        <ListItemText
                          primary={license.tenantName}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                License: {license.licenseNumber}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Type: {license.type?.toUpperCase()}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Chip
                            label={`${daysLeft} days`}
                            color={daysLeft <= 7 ? 'error' : 'warning'}
                            size="small"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                  {licenseData.expiringLicenses.length > 5 && (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary">
                            +{licenseData.expiringLicenses.length - 5} more licenses expiring...
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No licenses expiring in the next 30 days
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* License Type Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                License Types
              </Typography>
              {licenseData.byType.map((type, index) => (
                <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box display="flex" alignItems="center">
                    <Chip
                      label={type.type.toUpperCase()}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ mr: 2, minWidth: 80 }}
                    />
                    <Typography variant="body2">
                      {((type.count / licenseData.summary.totalLicenses) * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary">
                    {type.count}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Statistics */}
        {licenseData.usageStats.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top License Usage
                </Typography>
                <Grid container spacing={2}>
                  {licenseData.usageStats.slice(0, 6).map((stat, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Box p={2} border={1} borderColor="divider" borderRadius={1}>
                        <Typography variant="subtitle2" gutterBottom>
                          {stat.tenantName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          License: {stat.licenseNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Validations: {stat.totalValidations?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Users: {stat.currentUsers || 0}/{stat.maxUsers || 'Unlimited'}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((stat.currentUsers / (stat.maxUsers || 100)) * 100, 100)}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default LicenseUsageAnalytics;