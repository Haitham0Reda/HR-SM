import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import tenantService from '../../services/tenantService';
import ModuleControl from '../ModuleControl';
import LicenseManager from '../LicenseManager';
import { useApi } from '../../contexts/ApiContext';

const TabPanel = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const TenantDetails = ({ open, onClose, tenant, onSuccess, mode = 'view' }) => {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    status: 'active',
    deploymentMode: 'saas',
    adminEmail: '',
    adminName: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(mode === 'edit');
  const [moduleControlOpen, setModuleControlOpen] = useState(false);
  const [licenseManagerOpen, setLicenseManagerOpen] = useState(false);
  const [tenantLicense, setTenantLicense] = useState(null);

  const { api } = useApi();

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        domain: tenant.domain || '',
        status: tenant.status || 'active',
        deploymentMode: tenant.deploymentMode || 'saas',
        adminEmail: tenant.contactInfo?.adminEmail || '',
        adminName: tenant.contactInfo?.adminName || '',
        phone: tenant.contactInfo?.phone || '',
        address: tenant.contactInfo?.address || '',
      });
      
      // Load tenant license information
      loadTenantLicense();
    }
  }, [tenant, loadTenantLicense]);

  const loadTenantLicense = useCallback(async () => {
    if (!tenant?.tenantId) return;
    
    try {
      const response = await api.license.getTenantLicense(tenant.tenantId);
      if (response.success) {
        setTenantLicense(response.data);
      }
    } catch (error) {
      console.error('Failed to load tenant license:', error);
      // Don't show error to user as license might not exist yet
    }
  }, [tenant?.tenantId, api.license]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await tenantService.updateTenant(tenant.tenantId, {
        name: formData.name,
        domain: formData.domain,
        status: formData.status,
        contactInfo: {
          adminEmail: formData.adminEmail,
          adminName: formData.adminName,
          phone: formData.phone,
          address: formData.address,
        },
      });
      onSuccess();
      setIsEditMode(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTabValue(0);
    setIsEditMode(mode === 'edit');
    setError('');
    setModuleControlOpen(false);
    setLicenseManagerOpen(false);
    onClose();
  };

  const handleModuleControlSuccess = () => {
    // Refresh tenant data after module changes
    if (onSuccess) {
      onSuccess();
    }
    loadTenantLicense(); // Refresh license data as well
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Edit Tenant' : 'Tenant Details'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="General" />
          <Tab label="Configuration" />
          <Tab label="Usage" />
          <Tab label="Modules" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Tenant ID"
                  value={tenant.tenantId}
                  disabled
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Tenant Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditMode}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Domain"
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth disabled={!isEditMode}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                    <MenuItem value="trial">Trial</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Deployment Mode"
                  value={formData.deploymentMode}
                  disabled
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Admin Name"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Admin Email"
                  name="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditMode}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </form>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Timezone
              </Typography>
              <Typography variant="body1">
                {tenant.config?.timezone || 'UTC'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Locale
              </Typography>
              <Typography variant="body1">
                {tenant.config?.locale || 'en-US'}
              </Typography>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">
                User Count
              </Typography>
              <Typography variant="h6">
                {tenant.usage?.userCount || 0} / {tenant.limits?.maxUsers || 'Unlimited'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Storage Used
              </Typography>
              <Typography variant="h6">
                {((tenant.usage?.storageUsed || 0) / 1024 / 1024 / 1024).toFixed(2)} GB
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">
                API Calls (This Month)
              </Typography>
              <Typography variant="h6">
                {tenant.usage?.apiCallsThisMonth || 0}
              </Typography>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2">
              Module Management
            </Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Manage License">
                <IconButton
                  size="small"
                  onClick={() => setLicenseManagerOpen(true)}
                  color="primary"
                >
                  <SecurityIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Manage Modules">
                <IconButton
                  size="small"
                  onClick={() => setModuleControlOpen(true)}
                  color="primary"
                >
                  <ExtensionIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* License Status */}
          {tenantLicense && (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                License Status
              </Typography>
              <Box display="flex" gap={2} alignItems="center">
                <Chip
                  label={tenantLicense.status?.toUpperCase() || 'UNKNOWN'}
                  color={tenantLicense.status === 'active' ? 'success' : 'error'}
                  size="small"
                />
                <Chip
                  label={tenantLicense.type?.toUpperCase() || 'UNKNOWN'}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  Expires: {tenantLicense.expiresAt ? new Date(tenantLicense.expiresAt).toLocaleDateString() : 'Unknown'}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Enabled Modules */}
          <Typography variant="subtitle2" gutterBottom>
            Enabled Modules
          </Typography>
          {tenant.enabledModules && tenant.enabledModules.length > 0 ? (
            <List>
              {tenant.enabledModules.map((module) => (
                <ListItem key={module.moduleId || module}>
                  <ListItemText
                    primary={typeof module === 'string' ? module : module.moduleId}
                    secondary={
                      typeof module === 'object' && module.enabledAt
                        ? `Enabled: ${new Date(module.enabledAt).toLocaleDateString()}`
                        : 'Module enabled'
                    }
                  />
                  <Chip label="Active" color="success" size="small" />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              No modules enabled. Click the module management button to enable modules for this tenant.
            </Alert>
          )}

          {/* License Features */}
          {tenantLicense?.features && (
            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>
                Licensed Features
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {tenantLicense.features.modules?.map((module) => (
                  <Chip
                    key={module}
                    label={module}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {isEditMode ? 'Cancel' : 'Close'}
        </Button>
        {!isEditMode && (
          <Button
            variant="contained"
            onClick={() => setIsEditMode(true)}
          >
            Edit
          </Button>
        )}
        {isEditMode && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        )}
      </DialogActions>

      {/* Module Control Dialog */}
      <ModuleControl
        open={moduleControlOpen}
        onClose={() => setModuleControlOpen(false)}
        tenantId={tenant?.tenantId}
        tenantName={tenant?.name}
        currentLicense={tenantLicense}
        onSuccess={handleModuleControlSuccess}
      />

      {/* License Manager Dialog */}
      <LicenseManager
        open={licenseManagerOpen}
        onClose={() => setLicenseManagerOpen(false)}
        tenantId={tenant?.tenantId}
        tenantName={tenant?.name}
      />
    </Dialog>
  );
};

export default TenantDetails;
