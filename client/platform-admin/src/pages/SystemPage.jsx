import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  fetchSystemHealthAsync, 
  fetchSystemStatsAsync, 
  fetchSystemSettingsAsync,
  clearError 
} from '../store/slices/systemSettingsSlice';
import SystemHealth from '../components/system/SystemHealth';
import UsageMetrics from '../components/system/UsageMetrics';
import ThemeSettings from '../components/theme/ThemeSettings';

const TabPanel = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const SystemPage = () => {
  const dispatch = useAppDispatch();
  const { systemHealth, systemStats, settings, loading, error } = useAppSelector(state => state.systemSettings);
  
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    // Load system data when component mounts
    dispatch(fetchSystemHealthAsync());
    dispatch(fetchSystemStatsAsync());
    dispatch(fetchSystemSettingsAsync());
  }, [dispatch]);

  // Handle Redux errors
  useEffect(() => {
    if (error) {
      console.error('System page error:', error.message);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Health & Metrics
      </Typography>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="System Health" />
        <Tab label="Usage Metrics" />
        <Tab label="Theme Settings" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <SystemHealth 
          systemHealth={systemHealth}
          loading={loading}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <UsageMetrics 
          systemStats={systemStats}
          loading={loading}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ThemeSettings 
          settings={settings}
          loading={loading}
        />
      </TabPanel>
    </Box>
  );
};

export default SystemPage;
