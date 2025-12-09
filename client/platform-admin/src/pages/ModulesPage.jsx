import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import ModuleRegistry from '../components/modules/ModuleRegistry';

const TabPanel = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const ModulesPage = () => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Module Management
      </Typography>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="Module Registry" />
        <Tab label="Tenant Modules" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <ModuleRegistry />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Alert severity="info">
          Tenant-specific module configuration is available from the Tenants page.
          Select a tenant and manage their enabled modules from the tenant details.
        </Alert>
      </TabPanel>
    </Box>
  );
};

export default ModulesPage;
