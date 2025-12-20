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
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
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

const RevenueAnalytics = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revenueData, setRevenueData] = useState({
    summary: {
      mrr: 0,
      arr: 0,
      churnRate: 0,
      growthRate: 0,
      totalRevenue: 0,
      activeSubscriptions: 0
    },
    timeSeries: [],
    byPlan: [],
    byRegion: []
  });

  const { api, status } = useApi();

  useEffect(() => {
    loadRevenueData();
  }, [timeRange]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch comprehensive revenue analytics from new service
      const [dashboardResponse, securityResponse] = await Promise.all([
        api.platform.get(`/analytics/revenue/dashboard?period=${getPeriodFromTimeRange(timeRange)}`),
        api.platform.get(`/analytics/security?groupBy=${getPeriodFromTimeRange(timeRange)}`).catch(() => null)
      ]);
      
      if (dashboardResponse.data.success) {
        const dashboardData = dashboardResponse.data.data.dashboard;
        
        // Transform data to match existing component structure
        setRevenueData({
          summary: {
            mrr: dashboardData.keyMetrics.mrr || 0,
            arr: dashboardData.keyMetrics.arr || 0,
            churnRate: dashboardData.keyMetrics.churnRate || 0,
            growthRate: dashboardData.keyMetrics.growthRate || 0,
            totalRevenue: dashboardData.keyMetrics.mrr || 0,
            activeSubscriptions: dashboardData.keyMetrics.totalCustomers || 0
          },
          timeSeries: dashboardData.usage?.data?.map(point => ({
            date: new Date(point._id.year, (point._id.month || 1) - 1, point._id.day || 1),
            mrr: dashboardData.keyMetrics.mrr || 0,
            totalRevenue: dashboardData.keyMetrics.mrr || 0,
            activeSubscriptions: point.tenantCount || 0
          })) || [],
          byPlan: dashboardData.mrr?.planBreakdown?.map(plan => ({
            name: plan.plan,
            revenue: plan.revenue,
            subscriptions: plan.customers
          })) || [],
          byRegion: [], // Will be populated from tenant data if available
          // Add new analytics data
          licenses: dashboardData.licenses,
          security: securityResponse?.data?.success ? securityResponse.data.data.security : null,
          usage: dashboardData.usage,
          churn: dashboardData.churn
        });
      }
    } catch (error) {
      console.error('Error loading revenue data:', error);
      setError(error.message || 'Failed to load revenue analytics');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodFromTimeRange = (range) => {
    switch (range) {
      case '7d':
        return 'day';
      case '30d':
        return 'day';
      case '90d':
        return 'week';
      case '1y':
        return 'month';
      default:
        return 'day';
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthColor = (value) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.secondary';
  };

  const getGrowthIcon = (value) => {
    return value >= 0 ? '↗' : '↘';
  };

  // Chart configurations
  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Revenue Trends',
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
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const revenueChartData = {
    labels: revenueData.timeSeries.map(point => new Date(point.date)),
    datasets: [
      {
        label: 'Monthly Recurring Revenue',
        data: revenueData.timeSeries.map(point => point.mrr),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Total Revenue',
        data: revenueData.timeSeries.map(point => point.totalRevenue),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }
    ]
  };

  const planDistributionData = {
    labels: revenueData.byPlan.map(plan => plan.name),
    datasets: [
      {
        data: revenueData.byPlan.map(plan => plan.revenue),
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
        text: 'Revenue by Plan',
      },
    }
  };

  const handleExport = () => {
    // Create CSV data
    const csvData = [
      ['Date', 'MRR', 'Total Revenue', 'Active Subscriptions'],
      ...revenueData.timeSeries.map(point => [
        new Date(point.date).toLocaleDateString(),
        point.mrr,
        point.totalRevenue,
        point.activeSubscriptions
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-analytics-${timeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Revenue Analytics
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" component="h2">
          Revenue Analytics
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
            <IconButton onClick={loadRevenueData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {!status.platform.connected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Platform API disconnected. Revenue data may be unavailable.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Revenue Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">MRR</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(revenueData.summary.mrr)}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
                <Typography 
                  variant="body2" 
                  color={getGrowthColor(revenueData.summary.growthRate)}
                >
                  {getGrowthIcon(revenueData.summary.growthRate)} {formatPercentage(Math.abs(revenueData.summary.growthRate))}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">ARR</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(revenueData.summary.arr)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Annual Recurring Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Churn Rate</Typography>
              </Box>
              <Typography variant="h4" color={getGrowthColor(-revenueData.summary.churnRate)}>
                {formatPercentage(revenueData.summary.churnRate)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monthly churn rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <BusinessIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Subs</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {revenueData.summary.activeSubscriptions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active subscriptions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue Charts */}
      <Grid container spacing={3}>
        {/* Revenue Trends Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box height={400}>
                <Line data={revenueChartData} options={revenueChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Plan Distribution Chart */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Box height={400}>
                <Doughnut data={planDistributionData} options={doughnutOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue by Plan Table */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue by Plan
              </Typography>
              {revenueData.byPlan.map((plan, index) => (
                <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box display="flex" alignItems="center">
                    <Chip
                      label={plan.name}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ mr: 2 }}
                    />
                    <Typography variant="body2">
                      {plan.subscriptions} subscriptions
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(plan.revenue)}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue by Region */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue by Region
              </Typography>
              {revenueData.byRegion.map((region, index) => (
                <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box display="flex" alignItems="center">
                    <Chip
                      label={region.region}
                      color="secondary"
                      variant="outlined"
                      size="small"
                      sx={{ mr: 2 }}
                    />
                    <Typography variant="body2">
                      {region.customers} customers
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(region.revenue)}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RevenueAnalytics;