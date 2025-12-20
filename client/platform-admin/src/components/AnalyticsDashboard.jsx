import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import RevenueAnalytics from './RevenueAnalytics';
import LicenseUsageAnalytics from './LicenseUsageAnalytics';
import PerformanceAnalytics from './PerformanceAnalytics';
import { useApi } from '../contexts/ApiContext';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { status, isHealthy } = useApi();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getTabIcon = (index) => {
    switch (index) {
      case 0:
        return <TrendingUpIcon />;
      case 1:
        return <SecurityIcon />;
      case 2:
        return <SpeedIcon />;
      default:
        return <AssessmentIcon />;
    }
  };

  const handleExportAll = () => {
    // Trigger export for the current active tab
    const event = new CustomEvent('export-analytics', { 
      detail: { tab: activeTab } 
    });
    window.dispatchEvent(event);
  };

  const handleRefreshAll = () => {
    // Trigger refresh for the current active tab
    const event = new CustomEvent('refresh-analytics', { 
      detail: { tab: activeTab } 
    });
    window.dispatchEvent(event);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive insights into revenue, licenses, and system performance
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          {/* System Status Indicators */}
          <Box display="flex" gap={1}>
            <Chip
              label="Platform API"
              color={status.platform.connected ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
            <Chip
              label="License Server"
              color={status.licenseServer.connected ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
            <Chip
              label="Real-time"
              color={status.realtime.connected ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
          </Box>
          
          <Tooltip title="Export Current Data">
            <IconButton onClick={handleExportAll}>
              <ExportIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh Current Data">
            <IconButton onClick={handleRefreshAll}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* System Health Alert */}
      {!isHealthy && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Some services are unavailable. Analytics data may be incomplete or outdated.
          </Typography>
          <Box display="flex" gap={1} mt={1}>
            {!status.platform.connected && (
              <Chip label="Platform API Offline" color="error" size="small" />
            )}
            {!status.licenseServer.connected && (
              <Chip label="License Server Offline" color="error" size="small" />
            )}
            {!status.realtime.connected && (
              <Chip label="Real-time Updates Offline" color="warning" size="small" />
            )}
          </Box>
        </Alert>
      )}

      {/* Quick Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" color="primary">
                Revenue Analytics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                MRR, ARR, churn rates, and growth metrics
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SecurityIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" color="primary">
                License Usage
              </Typography>
              <Typography variant="body2" color="text.secondary">
                License distribution, usage, and expiry tracking
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SpeedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" color="primary">
                Performance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Response times, throughput, and system health
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" color="primary">
                Custom Reports
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tailored insights and data visualization
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analytics Tabs */}
      <Paper elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="analytics tabs"
            variant="fullWidth"
          >
            <Tab 
              icon={<TrendingUpIcon />} 
              label="Revenue Analytics" 
              id="analytics-tab-0"
              aria-controls="analytics-tabpanel-0"
            />
            <Tab 
              icon={<SecurityIcon />} 
              label="License Usage" 
              id="analytics-tab-1"
              aria-controls="analytics-tabpanel-1"
            />
            <Tab 
              icon={<SpeedIcon />} 
              label="Performance" 
              id="analytics-tab-2"
              aria-controls="analytics-tabpanel-2"
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <RevenueAnalytics />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <LicenseUsageAnalytics />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <PerformanceAnalytics />
        </TabPanel>
      </Paper>

      {/* Analytics Insights */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AnalyticsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Key Insights</Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" gutterBottom>
                  • Monitor revenue trends and identify growth opportunities
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • Track license utilization to optimize capacity planning
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • Analyze performance metrics to ensure optimal user experience
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • Identify expiring licenses to prevent service disruptions
                </Typography>
                <Typography variant="body2">
                  • Use data-driven insights for strategic decision making
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Data Sources</Typography>
              </Box>
              
              <Box>
                <Box display="flex" alignItems="center" mb={1}>
                  <Chip
                    label="Platform API"
                    color={status.platform.connected ? 'success' : 'error'}
                    size="small"
                    sx={{ mr: 1, minWidth: 100 }}
                  />
                  <Typography variant="body2">
                    Tenant data, revenue, subscriptions
                  </Typography>
                </Box>
                
                <Box display="flex" alignItems="center" mb={1}>
                  <Chip
                    label="License Server"
                    color={status.licenseServer.connected ? 'success' : 'error'}
                    size="small"
                    sx={{ mr: 1, minWidth: 100 }}
                  />
                  <Typography variant="body2">
                    License usage, validations, expiry data
                  </Typography>
                </Box>
                
                <Box display="flex" alignItems="center" mb={1}>
                  <Chip
                    label="Real-time"
                    color={status.realtime.connected ? 'success' : 'error'}
                    size="small"
                    sx={{ mr: 1, minWidth: 100 }}
                  />
                  <Typography variant="body2">
                    Live metrics, system performance
                  </Typography>
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Data is automatically refreshed every 30 seconds when real-time connection is active.
                  Manual refresh is available for immediate updates.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;