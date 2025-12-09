import React, { useState } from 'react';
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
} from '@mui/material';
import tenantService from '../../services/tenantService';

const TenantCreate = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    deploymentMode: 'saas',
    adminEmail: '',
    adminName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      await tenantService.createTenant(formData);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      domain: '',
      deploymentMode: 'saas',
      adminEmail: '',
      adminName: '',
      phone: '',
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New Tenant</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tenant Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
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
                helperText="Optional for on-premise deployments"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Deployment Mode</InputLabel>
                <Select
                  name="deploymentMode"
                  value={formData.deploymentMode}
                  onChange={handleChange}
                  label="Deployment Mode"
                >
                  <MenuItem value="saas">SaaS</MenuItem>
                  <MenuItem value="on-premise">On-Premise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Admin Name"
                name="adminName"
                value={formData.adminName}
                onChange={handleChange}
                required
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
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Tenant'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TenantCreate;
