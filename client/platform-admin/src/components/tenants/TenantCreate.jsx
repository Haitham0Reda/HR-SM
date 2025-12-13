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
    contactInfo: {
      adminEmail: '',
      adminName: '',
      phone: '',
    },
    adminUser: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
    metadata: {
      industry: '',
      companySize: '',
    },
    limits: {
      maxUsers: 100,
      maxStorage: 10737418240, // 10GB
      apiCallsPerMonth: 100000,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nameParts = name.split('.');
    
    if (nameParts.length === 1) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [nameParts[0]]: {
          ...prev[nameParts[0]],
          [nameParts[1]]: value,
        },
      }));
    }
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
      contactInfo: {
        adminEmail: '',
        adminName: '',
        phone: '',
      },
      adminUser: {
        email: '',
        password: '',
        firstName: '',
        lastName: '',
      },
      metadata: {
        industry: '',
        companySize: '',
      },
      limits: {
        maxUsers: 100,
        maxStorage: 10737418240,
        apiCallsPerMonth: 100000,
      },
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
            {/* Basic Information */}
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Basic Information</strong>
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Company Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
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
                helperText="Optional for on-premise deployments"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Industry</InputLabel>
                <Select
                  name="metadata.industry"
                  value={formData.metadata.industry}
                  onChange={handleChange}
                  label="Industry"
                >
                  <MenuItem value="Technology">Technology</MenuItem>
                  <MenuItem value="Manufacturing">Manufacturing</MenuItem>
                  <MenuItem value="Healthcare">Healthcare</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Education">Education</MenuItem>
                  <MenuItem value="Retail">Retail</MenuItem>
                  <MenuItem value="Consulting">Consulting</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Admin User Information */}
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                <strong>Admin User Account</strong> - This will be the primary administrator for the tenant
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Admin First Name"
                name="adminUser.firstName"
                value={formData.adminUser.firstName}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Admin Last Name"
                name="adminUser.lastName"
                value={formData.adminUser.lastName}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Admin Email"
                name="adminUser.email"
                type="email"
                value={formData.adminUser.email}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Admin Password"
                name="adminUser.password"
                type="password"
                value={formData.adminUser.password}
                onChange={handleChange}
                required
                helperText="Minimum 8 characters"
              />
            </Grid>

            {/* Contact Information */}
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <strong>Contact Information</strong>
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Contact Name"
                name="contactInfo.adminName"
                value={formData.contactInfo.adminName}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Contact Email"
                name="contactInfo.adminEmail"
                type="email"
                value={formData.contactInfo.adminEmail}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Phone"
                name="contactInfo.phone"
                value={formData.contactInfo.phone}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Company Size</InputLabel>
                <Select
                  name="metadata.companySize"
                  value={formData.metadata.companySize}
                  onChange={handleChange}
                  label="Company Size"
                >
                  <MenuItem value="1-10">1-10 employees</MenuItem>
                  <MenuItem value="11-50">11-50 employees</MenuItem>
                  <MenuItem value="51-200">51-200 employees</MenuItem>
                  <MenuItem value="201-500">201-500 employees</MenuItem>
                  <MenuItem value="501-1000">501-1000 employees</MenuItem>
                  <MenuItem value="1000+">1000+ employees</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Limits */}
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <strong>Resource Limits</strong>
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Max Users"
                name="limits.maxUsers"
                type="number"
                value={formData.limits.maxUsers}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Storage (GB)"
                name="limits.maxStorage"
                type="number"
                value={Math.round(formData.limits.maxStorage / (1024 * 1024 * 1024))}
                onChange={(e) => {
                  const gb = parseInt(e.target.value) || 0;
                  handleChange({
                    target: {
                      name: 'limits.maxStorage',
                      value: gb * 1024 * 1024 * 1024
                    }
                  });
                }}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="API Calls/Month"
                name="limits.apiCallsPerMonth"
                type="number"
                value={formData.limits.apiCallsPerMonth}
                onChange={handleChange}
                inputProps={{ min: 1000 }}
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
