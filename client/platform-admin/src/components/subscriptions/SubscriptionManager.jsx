import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Grid,
  Chip,
} from '@mui/material';
import subscriptionService from '../../services/subscriptionService';
import tenantService from '../../services/tenantService';

const SubscriptionManager = ({ open, onClose, tenant, onSuccess }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && tenant) {
      loadData();
    }
  }, [open, tenant]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      setError('');

      // Load plans
      const plansResponse = await subscriptionService.getAllPlans();
      setPlans(plansResponse.data || []);

      // Load current tenant data
      const tenantResponse = await tenantService.getTenantById(tenant.tenantId);
      const tenantData = tenantResponse.data;
      setCurrentSubscription(tenantData.subscription);
      setSelectedPlanId(tenantData.subscription?.planId || '');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await subscriptionService.assignPlanToTenant(tenant.tenantId, selectedPlanId);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to assign plan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPlanId('');
    setError('');
    onClose();
  };

  const selectedPlan = plans.find(p => p._id === selectedPlanId);
  const currentPlan = plans.find(p => p._id === currentSubscription?.planId);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          Manage Subscription - {tenant?.name}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loadingData ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {currentSubscription && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Subscription
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Plan
                      </Typography>
                      <Typography variant="body1">
                        {currentPlan?.displayName || 'Unknown'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        label={currentSubscription.status}
                        color={currentSubscription.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Grid>
                    {currentSubscription.expiresAt && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Expires
                        </Typography>
                        <Typography variant="body1">
                          {new Date(currentSubscription.expiresAt).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Plan</InputLabel>
                <Select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  label="Select Plan"
                  required
                >
                  {plans.map((plan) => (
                    <MenuItem key={plan._id} value={plan._id}>
                      {plan.displayName} - ${plan.pricing.monthly}/month ({plan.tier})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedPlan && (
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Plan Details
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedPlan.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Included Modules: {selectedPlan.includedModules?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Max Users: {selectedPlan.limits?.maxUsers || 'Unlimited'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Max Storage: {selectedPlan.limits?.maxStorage ? `${(selectedPlan.limits.maxStorage / 1024 / 1024 / 1024).toFixed(0)} GB` : 'Unlimited'}
                  </Typography>
                </Box>
              )}

              {selectedPlanId && selectedPlanId !== currentSubscription?.planId && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {currentPlan && selectedPlan && (
                    <>
                      {selectedPlan.tier > currentPlan.tier
                        ? 'This is an upgrade. New modules will be enabled immediately.'
                        : 'This is a downgrade. Data will be preserved but some modules may be disabled.'}
                    </>
                  )}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || loadingData || !selectedPlanId}
          >
            {loading ? <CircularProgress size={24} /> : 'Assign Plan'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SubscriptionManager;
