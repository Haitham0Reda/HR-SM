import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
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
  Tooltip,
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
  Tooltip,
  Legend,
  TimeScale
);

const PerformanceAnalytics = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState({
    responseTime: { average: 0, p95: 0, p99: 0 },
    throughput: { requestsPerSecond: 0, totalRequests: 0 },
    errorRate: { percentage: 0, totalErrors: 0 },
    uptime: { percentage: 99.9, downtime: 0 }
  });
  const [chartData, setChartData] = useState({
    responseTime: { labels: [], datasets: [] },
    throughput: { labels: [], datasets: [] },
    errorDistribution: { labels: [], datasets: [] }
  });

  const { api, status } = useApi();

  useEffect(() => {
    loadPerformanceData();
  }, [timeRange]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      const dateRange = getDateRange(timeRange);
      const response = await api.platform.getPerformanceMetrics(dateRange);
      
      if (response.success) {
        setPerformanceData(response.data.summary);
        generateChartData(response.data.timeSeries);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (range) => {
    const now = new Date();
    const start = new Date();
    
    switch (range) {
      case '1h':
        start.setHours(now.getHours() - 1);
        break;
      case '24h':
        start.setDate(now.getDate() - 1);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      default:
        start.setDate(now.getDate() - 1);
    }
    
    return { start: start.toISOString(), end: now.toISOString() };
  };

  const generateChartData = (timeSeries) => {
    const labels = timeSeries.map(point => new Date(point.timestamp));
    
    // Response Time Chart
    const responseTimeChart = {
      labels,
      datasets: [
        {
          label: 'Average Response Time (ms)',
          data: timeSeries.map(point => point.responseTime.average),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: '95th Percentile (ms)',
          data: timeSeries.map(point => point.responseTime.p95),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }
      ]
    };

    // Throughput Chart
    const throughputChart = {
      labels,
      datasets: [
        {
          label: 'Requests per Second',
          data: timeSeries.map(point => point.throughput.requestsPerSecond),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };

    // Error Distribution Chart
    const errorTypes = ['4xx Client Errors', '5xx Server Errors', 'Timeout Errors', 'Network Errors'];
    const errorCounts = [
      timeSeries.reduce((sum, point) => sum + (point.errors.client || 0), 0),
      timeSeries.reduce((sum, point) => sum + (point.errors.server || 0), 0),
      timeSeries.reduce((sum, point) => sum + (point.errors.timeout || 0), 0),
      timeSeries.reduce((sum, point) => sum + (point.errors.network || 0), 0)
    ];

    const errorDistributionChart = {
      labels: errorTypes,
      datasets: [
        {
          data: errorCounts,
          backgroundColor: [
            'rgba(255, 206, 86, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 206, 86, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    };

    setChartData({
      responseTime: responseTimeChart,
      throughput: throughputChart,
      errorDistribution: errorDistributionChart
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM dd'
          }
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    }
  };

  const getPerformanceStatus = (metric, value) => {
    switch (metric) {
      case 'responseTime':
        if (value < 200) return 'excellent';
        if (value < 500) return 'good';
        if (value < 1000) return 'warning';
        return 'critical';
      case 'errorRate':
        if (value < 0.1) return 'excellent';
        if (value < 1) return 'good';
        if (value < 5) return 'warning';
        return 'critical';
      case 'uptime':
        if (value >= 99.9) return 'excellent';
        if (value >= 99.5) return 'good';
        if (value >= 99) return 'warning';
        return 'critical';
      default:
        return 'good';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'info';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Analytics
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" component="h2">
          Performance Analytics
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {!status.platform.connected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Platform API disconnected. Performance data may be unavailable.
        </Alert>
      )}

      {/* Performance Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <SpeedIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Response Time</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {performanceData.responseTime.average}ms
              </Typography>
              <Chip
                label={getPerformanceStatus('responseTime', performanceData.responseTime.average)}
                color={getStatusColor(getPerformanceStatus('responseTime', performanceData.responseTime.average))}
                size="small"
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                P95: {performanceData.responseTime.p95}ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Throughput</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {performanceData.throughput.requestsPerSecond}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                req/sec
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Total: {performanceData.throughput.totalRequests.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Error Rate</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {performanceData.errorRate.percentage}%
              </Typography>
              <Chip
                label={getPerformanceStatus('errorRate', performanceData.errorRate.percentage)}
                color={getStatusColor(getPerformanceStatus('errorRate', performanceData.errorRate.percentage))}
                size="small"
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Errors: {performanceData.errorRate.totalErrors}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <TimelineIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Uptime</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {performanceData.uptime.percentage}%
              </Typography>
              <Chip
                label={getPerformanceStatus('uptime', performanceData.uptime.percentage)}
                color={getStatusColor(getPerformanceStatus('uptime', performanceData.uptime.percentage))}
                size="small"
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Downtime: {performanceData.uptime.downtime}min
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3}>
        {/* Response Time Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response Time Trends
              </Typography>
              <Box height={300}>
                <Line data={chartData.responseTime} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Throughput Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Request Throughput
              </Typography>
              <Box height={300}>
                <Bar data={chartData.throughput} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Distribution
              </Typography>
              <Box height={300}>
                <Doughnut data={chartData.errorDistribution} options={doughnutOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Insights */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Insights
              </Typography>
              <Box>
                {performanceData.responseTime.average > 500 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    High response times detected. Consider optimizing database queries or adding caching.
                  </Alert>
                )}
                
                {performanceData.errorRate.percentage > 1 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Elevated error rate. Check application logs for issues.
                  </Alert>
                )}
                
                {performanceData.uptime.percentage < 99.5 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Uptime below target. Review infrastructure stability.
                  </Alert>
                )}
                
                {performanceData.responseTime.average <= 200 && 
                 performanceData.errorRate.percentage < 0.1 && 
                 performanceData.uptime.percentage >= 99.9 && (
                  <Alert severity="success">
                    System performance is excellent across all metrics.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PerformanceAnalytics;