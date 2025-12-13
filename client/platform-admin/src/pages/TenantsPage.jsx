import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import TenantList from '../components/tenants/TenantList';
import TenantCreate from '../components/tenants/TenantCreate';
import TenantDetails from '../components/tenants/TenantDetails';
import tenantService from '../services/tenantService';

const TenantsPage = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [detailsMode, setDetailsMode] = useState('view');
  const [confirmAction, setConfirmAction] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const handleCreateSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    showSnackbar('Tenant created successfully', 'success');
  };

  const handleUpdateSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    showSnackbar('Tenant updated successfully', 'success');
  };

  const handleView = (tenant) => {
    setSelectedTenant(tenant);
    setDetailsMode('view');
    setDetailsDialogOpen(true);
  };

  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setDetailsMode('edit');
    setDetailsDialogOpen(true);
  };

  const handleSuspend = (tenant) => {
    setSelectedTenant(tenant);
    setConfirmAction('suspend');
    setConfirmDialogOpen(true);
  };

  const handleReactivate = (tenant) => {
    setSelectedTenant(tenant);
    setConfirmAction('reactivate');
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmAction === 'suspend') {
        await tenantService.suspendTenant(selectedTenant.tenantId);
        showSnackbar('Tenant suspended successfully', 'success');
      } else if (confirmAction === 'reactivate') {
        await tenantService.reactivateTenant(selectedTenant.tenantId);
        showSnackbar('Tenant reactivated successfully', 'success');
      }
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      showSnackbar(
        error.response?.data?.error?.message || 'Action failed',
        'error'
      );
    } finally {
      setConfirmDialogOpen(false);
      setSelectedTenant(null);
      setConfirmAction(null);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const response = await tenantService.getTenantStats();
      setStats(response.data.statistics);
    } catch (error) {
      console.error('Failed to load tenant statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Tenant Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Tenant
        </Button>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Tenants
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Active
                </Typography>
                <Typography variant="h4" component="div" color="success.main">
                  {stats.active}
                </Typography>
                <Chip label="Active" color="success" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Trial
                </Typography>
                <Typography variant="h4" component="div" color="warning.main">
                  {stats.trial}
                </Typography>
                <Chip label="Trial" color="warning" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Suspended
                </Typography>
                <Typography variant="h4" component="div" color="error.main">
                  {stats.suspended}
                </Typography>
                <Chip label="Suspended" color="error" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Cancelled
                </Typography>
                <Typography variant="h4" component="div" color="text.secondary">
                  {stats.cancelled}
                </Typography>
                <Chip label="Cancelled" color="default" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <TenantList
        refreshKey={refreshKey}
        onView={handleView}
        onEdit={handleEdit}
        onSuspend={handleSuspend}
        onReactivate={handleReactivate}
      />

      <TenantCreate
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <TenantDetails
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        tenant={selectedTenant}
        mode={detailsMode}
        onSuccess={handleUpdateSuccess}
      />

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          Confirm {confirmAction === 'suspend' ? 'Suspension' : 'Reactivation'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {confirmAction} tenant "{selectedTenant?.name}"?
            {confirmAction === 'suspend' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Suspending a tenant will block all API access for this tenant.
              </Alert>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={confirmAction === 'suspend' ? 'error' : 'success'}
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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

export default TenantsPage;
