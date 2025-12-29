import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Computer as ComputerIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useApi } from '../contexts/ApiContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  fetchTenantLicenseAsync, 
  renewLicenseAsync, 
  revokeLicenseAsync,
  clearError 
} from '../store/slices/licenseManagementSlice';

const LicenseManager = ({ open, onClose, tenantId, tenantName }) => {
  const dispatch = useAppDispatch();
  const { currentLicense: license, loading, error } = useAppSelector(state => state.licenseManagement);
  
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [renewalData, setRenewalData] = useState({
    expiresAt: null,
    type: '',
    maxUsers: 0
  });
  const [revokeReason, setRevokeReason] = useState('');

  const loadLicenseData = useCallback(async () => {
    try {
      await dispatch(fetchTenantLicenseAsync(tenantId));
      
      // Initialize renewal data with current license info
      if (license) {
        setRenewalData({
          expiresAt: new Date(new Date(license.expiresAt).getTime() + 365 * 24 * 60 * 60 * 1000),
          type: license.type,
          maxUsers: license.features?.maxUsers || 50
        });
      }
    } catch (error) {
      console.error('Failed to load license data:', error);
    }
  }, [dispatch, tenantId, license]);

  useEffect(() => {
    if (open && tenantId) {
      loadLicenseData();
    }
  }, [open, tenantId, loadLicenseData]);

  const handleRenewLicense = async () => {
    try {
      await dispatch(renewLicenseAsync({
        licenseNumber: license.licenseNumber,
        renewalData: {
          expiresAt: renewalData.expiresAt.toISOString(),
          type: renewalData.type,
          maxUsers: renewalData.maxUsers
        }
      }));
      setRenewDialogOpen(false);
    } catch (error) {
      console.error('Failed to renew license:', error);
    }
  };

  const handleRevokeLicense = async () => {
    try {
      await dispatch(revokeLicenseAsync({
        licenseNumber: license.licenseNumber,
        reason: revokeReason
      }));
      setRevokeDialogOpen(false);
      setRevokeReason('');
    } catch (error) {
      console.error('Failed to revoke license:', error);
    }
  };

  const getLicenseStatus = () => {
    if (!license) return 'unknown';
    
    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (license.status === 'revoked') return 'revoked';
    if (license.status === 'suspended') return 'suspended';
    if (expiresAt < now) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'active';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon color="success" />;
      case 'expiring':
        return <ScheduleIcon color="warning" />;
      case 'expired':
        return <ErrorIcon color="error" />;
      case 'revoked':
      case 'suspended':
        return <BlockIcon color="error" />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expiring':
        return 'warning';
      case 'expired':
      case 'revoked':
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilExpiry = () => {
    if (!license) return 0;
    const now = new Date();
    const expiry = new Date(license.expiresAt);
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  };

  const licenseStatus = getLicenseStatus();
  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <SecurityIcon sx={{ mr: 1 }} />
              License Manager - {tenantName}
            </Box>
            <IconButton onClick={loadLicenseData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
              {error.message}
            </Alert>
          )}

          {license && (
            <Grid container spacing={3}>
              {/* License Status Overview */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center">
                        {getStatusIcon(licenseStatus)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          License Status
                        </Typography>
                      </Box>
                      <Chip
                        label={licenseStatus.toUpperCase()}
                        color={getStatusColor(licenseStatus)}
                        variant="outlined"
                      />
                    </Box>
                    
                    {licenseStatus === 'expiring' && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        License expires in {daysUntilExpiry} days. Consider renewing soon.
                      </Alert>
                    )}
                    
                    {licenseStatus === 'expired' && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        License has expired. Tenant access may be restricted.
                      </Alert>
                    )}
                    
                    {licenseStatus === 'revoked' && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        License has been revoked. Tenant access is blocked.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* License Details */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      License Information
                    </Typography>
                    
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="License Number"
                          secondary={license.licenseNumber}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Type"
                          secondary={license.type?.toUpperCase()}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Issued Date"
                          secondary={formatDate(license.issuedAt)}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Expires Date"
                          secondary={formatDate(license.expiresAt)}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Domain Binding"
                          secondary={license.binding?.boundDomain || 'Not bound'}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* License Features */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      License Features
                    </Typography>
                    
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Maximum Users"
                          secondary={license.features?.maxUsers || 'Unlimited'}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Storage Limit"
                          secondary={`${license.features?.maxStorage || 0} MB`}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="API Calls/Month"
                          secondary={license.features?.maxAPICallsPerMonth?.toLocaleString() || 'Unlimited'}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Enabled Modules"
                          secondary={
                            <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                              {license.features?.modules?.map((module) => (
                                <Chip
                                  key={module}
                                  label={module}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          }
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* License Activations */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      License Activations ({license.activations?.length || 0}/{license.maxActivations || 1})
                    </Typography>
                    
                    {license.activations && license.activations.length > 0 ? (
                      <List>
                        {license.activations.map((activation, index) => (
                          <ListItem key={index} divider={index < license.activations.length - 1}>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center">
                                  <ComputerIcon sx={{ mr: 1, fontSize: 20 }} />
                                  Machine ID: {activation.machineId}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Activated: {formatDate(activation.activatedAt)}
                                  </Typography>
                                  {activation.lastValidatedAt && (
                                    <Typography variant="caption" display="block">
                                      Last Validated: {formatDate(activation.lastValidatedAt)}
                                    </Typography>
                                  )}
                                  {activation.ipAddress && (
                                    <Typography variant="caption" display="block">
                                      IP Address: {activation.ipAddress}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No active license activations
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Usage Statistics */}
              {license.usage && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Usage Statistics
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="primary">
                              {license.usage.totalValidations || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Total Validations
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="primary">
                              {license.usage.currentUsers || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Current Users
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="primary">
                              {Math.round((license.usage.currentStorage || 0) / 1024 / 1024)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Storage (MB)
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="primary">
                              {license.usage.lastValidatedAt ? 
                                new Date(license.usage.lastValidatedAt).toLocaleDateString() : 'Never'
                              }
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Last Validation
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* License Notes */}
              {license.notes && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Notes
                      </Typography>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {license.notes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>
            Close
          </Button>
          
          {license && licenseStatus !== 'revoked' && (
            <>
              <Button
                startIcon={<EditIcon />}
                onClick={() => setRenewDialogOpen(true)}
                disabled={loading}
              >
                Renew License
              </Button>
              
              <Button
                startIcon={<BlockIcon />}
                color="error"
                onClick={() => setRevokeDialogOpen(true)}
                disabled={loading}
              >
                Revoke License
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Renew License Dialog */}
      <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Renew License</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <DatePicker
                label="New Expiry Date"
                value={renewalData.expiresAt}
                onChange={(value) => setRenewalData({ ...renewalData, expiresAt: value })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>License Type</InputLabel>
                <Select
                  value={renewalData.type}
                  onChange={(e) => setRenewalData({ ...renewalData, type: e.target.value })}
                  label="License Type"
                >
                  <MenuItem value="trial">Trial</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                  <MenuItem value="unlimited">Unlimited</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Users"
                type="number"
                value={renewalData.maxUsers}
                onChange={(e) => setRenewalData({ ...renewalData, maxUsers: parseInt(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRenewLicense} disabled={loading}>
            Renew License
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke License Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke License</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The tenant will lose access to the system.
          </Alert>
          <TextField
            fullWidth
            label="Reason for Revocation"
            multiline
            rows={3}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="Please provide a reason for revoking this license..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleRevokeLicense} 
            disabled={loading || !revokeReason.trim()}
          >
            Revoke License
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LicenseManager;