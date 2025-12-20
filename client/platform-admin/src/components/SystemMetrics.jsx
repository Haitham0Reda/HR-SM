import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Computer as ComputerIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import realtimeService from '../services/realtimeService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const SystemMetrics = () => {
  const [metrics, setMetrics] = useState({
    cpu: { usage: 0, loadAverage: [0, 0, 0], cores: 0 },
    memory: { total: 0, free: 0, used: 0, percentage: 0 },
    uptime: 0,
    platform: '',
    nodeVersion: '',
    database: { connected: false, collections: 0, dataSize: 0 }
  });
  const [connected, setConnected] = useState(false);
  const [historicalData, setHistoricalData] = useState({
    labels: [],
    cpu: [],
    memory: []
  });

  useEffect(() => {
    // Subscribe to real-time metrics updates
    const unsubscribeMetrics = realtimeService.subscribe('metrics', (data) => {
      if (data.system) {
        setMetrics(data.system);
        
        // Update historical data for charts
        const now = new Date();
        setHistoricalData(prev => {
          const newLabels = [...prev.labels, now].slice(-20); // Keep last 20 points
          const newCpu = [...prev.cpu, data.system.cpu.loadAverage[0] * 100].slice(-20);
          const newMemory = [...prev.memory, data.system.memory.percentage].slice(-20);
          
          return {
            labels: newLabels,
            cpu: newCpu,
            memory: newMemory
          };
        });
      }
    });

    // Subscribe to connection status
    const unsubscribeConnection = realtimeService.subscribe('connection', (status) => {
      setConnected(status.connected);
    });

    // Request initial metrics
    realtimeService.requestMetricsUpdate();

    return () => {
      unsubscribeMetrics();
      unsubscribeConnection();
    };
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusColor = (percentage) => {
    if (percentage < 60) return 'success';
    if (percentage < 80) return 'warning';
    return 'error';
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'System Performance (Last 10 minutes)',
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm'
          }
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };

  const chartData = {
    labels: historicalData.labels,
    datasets: [
      {
        label: 'CPU Usage',
        data: historicalData.cpu,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      },
      {
        label: 'Memory Usage',
        data: historicalData.memory,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.2)',
        tension: 0.1
      }
    ]
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          System Metrics
        </Typography>
        <Chip
          label={connected ? 'Live' : 'Disconnected'}
          color={connected ? 'success' : 'error'}
          size="small"
        />
      </Box>

      {!connected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Real-time connection lost. Metrics may be outdated.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* CPU Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SpeedIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">CPU</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Load Average: {metrics.cpu.loadAverage.map(load => load.toFixed(2)).join(', ')}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cores: {metrics.cpu.cores}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(metrics.cpu.loadAverage[0] * 100, 100)}
                color={getStatusColor(metrics.cpu.loadAverage[0] * 100)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MemoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Memory</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Used: {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Free: {formatBytes(metrics.memory.free)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.memory.percentage}
                color={getStatusColor(metrics.memory.percentage)}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {metrics.memory.percentage.toFixed(1)}% used
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ComputerIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">System Info</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Platform: {metrics.platform}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Node.js: {metrics.nodeVersion}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uptime: {formatUptime(metrics.uptime)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Database</Typography>
              </Box>
              <Box display="flex" alignItems="center" mb={1}>
                <Chip
                  label={metrics.database.connected ? 'Connected' : 'Disconnected'}
                  color={metrics.database.connected ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Collections: {metrics.database.collections}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Data Size: {formatBytes(metrics.database.dataSize)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box height={300}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SystemMetrics;