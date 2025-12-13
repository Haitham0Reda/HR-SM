import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
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
  const [tabValue, setTabValue] = useState(0);

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
        <SystemHealth />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <UsageMetrics />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ThemeSettings />
      </TabPanel>
    </Box>
  );
};

export default SystemPage;
