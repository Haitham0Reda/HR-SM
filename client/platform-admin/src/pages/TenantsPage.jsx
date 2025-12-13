import { useState, useEffect } from 'react';
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
      const response = await tenantService.getTenantStats();
      setStats(response.data.statistics);
    } catch (error) {
      console.error('Failed to load tenant statistics:', error);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3,
      p: 3,
      minHeight: '100vh'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" sx={{ flex: '1 1 auto' }}>
          Tenant Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ flex: '0 0 auto' }}
        >
          Create Tenant
        </Button>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Box 
          sx={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            mb: 4,
            '& > *': {
              flex: '1 1 200px',
              minWidth: '200px',
            }
          }}
        >
          <Card sx={{ flex: '1 1 200px' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Tenants
              </Typography>
              <Typography variant="h4" component="div">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: '1 1 200px' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Active
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {stats.active}
              </Typography>
              <Chip label="Active" color="success" size="small" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
          
          <Card sx={{ flex: '1 1 200px' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Trial
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {stats.trial}
              </Typography>
              <Chip label="Trial" color="warning" size="small" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
          
          <Card sx={{ flex: '1 1 200px' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Suspended
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {stats.suspended}
              </Typography>
              <Chip label="Suspended" color="error" size="small" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
          
          <Card sx={{ flex: '1 1 200px' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Cancelled
              </Typography>
              <Typography variant="h4" component="div" color="text.secondary">
                {stats.cancelled}
              </Typography>
              <Chip label="Cancelled" color="default" size="small" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Box>
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
