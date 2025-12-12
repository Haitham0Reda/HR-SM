import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import tenantService from '../../services/tenantService';

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
    }
  }, [tenant]);

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
    onClose();
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tenant ID"
                  value={tenant.tenantId}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Domain"
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Deployment Mode"
                  value={formData.deploymentMode}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Admin Name"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </Grid>
              <Grid item xs={12}>
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
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Timezone
              </Typography>
              <Typography variant="body1">
                {tenant.config?.timezone || 'UTC'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                User Count
              </Typography>
              <Typography variant="h6">
                {tenant.usage?.userCount || 0} / {tenant.limits?.maxUsers || 'Unlimited'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Storage Used
              </Typography>
              <Typography variant="h6">
                {((tenant.usage?.storageUsed || 0) / 1024 / 1024 / 1024).toFixed(2)} GB
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
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
          <Typography variant="subtitle2" gutterBottom>
            Enabled Modules
          </Typography>
          {tenant.enabledModules && tenant.enabledModules.length > 0 ? (
            <List>
              {tenant.enabledModules.map((module) => (
                <ListItem key={module.moduleId}>
                  <ListItemText
                    primary={module.moduleId}
                    secondary={`Enabled: ${new Date(module.enabledAt).toLocaleDateString()}`}
                  />
                  <Chip label="Active" color="success" size="small" />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No modules enabled
            </Typography>
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
    </Dialog>
  );
};

export default TenantDetails;
