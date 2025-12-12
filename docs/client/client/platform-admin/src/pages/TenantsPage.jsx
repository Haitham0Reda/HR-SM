import React, { useState } from 'react';
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

      <TenantList
        key={refreshKey}
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
