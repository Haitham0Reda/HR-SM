import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAvailableModulesAsync, clearError } from '../store/slices/moduleManagementSlice';
import ModuleRegistry from '../components/modules/ModuleRegistry';

const TabPanel = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const ModulesPage = () => {
  const dispatch = useAppDispatch();
  const { availableModules, loading, error } = useAppSelector(state => state.moduleManagement);
  
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    dispatch(fetchAvailableModulesAsync());
  }, [dispatch]);

  // Handle Redux errors
  useEffect(() => {
    if (error) {
      console.error('Module management error:', error.message);
      dispatch(clearError());
    }
  }, [error, dispatch]);

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
        <ModuleRegistry 
          modules={availableModules}
          loading={loading}
        />
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
