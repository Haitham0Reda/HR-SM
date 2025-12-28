import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSubscriptionPlansAsync, clearError } from '../store/slices/subscriptionSlice';
import PlanList from '../components/subscriptions/PlanList';

const TabPanel = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const SubscriptionsPage = () => {
  const dispatch = useAppDispatch();
  const { plans, loading, error } = useAppSelector(state => state.subscription);
  
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchSubscriptionPlansAsync());
  }, [dispatch]);

  // Handle Redux errors
  useEffect(() => {
    if (error) {
      showSnackbar(error.message || 'An error occurred', 'error');
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleEditPlan = (plan) => {
    // TODO: Implement plan editing
    showSnackbar('Plan editing will be implemented', 'info');
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Subscription Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => showSnackbar('Create plan feature coming soon', 'info')}
        >
          Create Plan
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="Plans" />
        <Tab label="Tenant Subscriptions" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <PlanList 
          plans={plans}
          loading={loading}
          onEdit={handleEditPlan} 
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Alert severity="info">
          Tenant subscription management is available from the Tenants page.
        </Alert>
      </TabPanel>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SubscriptionsPage;
