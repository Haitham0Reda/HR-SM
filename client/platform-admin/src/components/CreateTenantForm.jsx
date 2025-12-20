import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  Security as SecurityIcon,
  Extension as ExtensionIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useApi } from '../contexts/ApiContext';

const AVAILABLE_MODULES = [
  { id: 'hr-core', name: 'HR Core', description: 'Essential HR functionality', required: true },
  { id: 'tasks', name: 'Task Management', description: 'Project and task tracking', required: false },
  { id: 'clinic', name: 'Medical Clinic', description: 'Healthcare management', required: false },
  { id: 'payroll', name: 'Payroll', description: 'Salary and benefits management', required: false },
  { id: 'reports', name: 'Advanced Reports', description: 'Analytics and reporting', required: false },
  { id: 'life-insurance', name: 'Life Insurance', description: 'Employee insurance management', required: false }
];

const LICENSE_TYPES = [
  { value: 'trial', label: 'Trial', maxUsers: 10, duration: 30, features: ['hr-core'] },
  { value: 'basic', label: 'Basic', maxUsers: 50, duration: 365, features: ['hr-core', 'tasks'] },
  { value: 'professional', label: 'Professional', maxUsers: 200, duration: 365, features: ['hr-core', 'tasks', 'clinic', 'payroll'] },
  { value: 'enterprise', label: 'Enterprise', maxUsers: 1000, duration: 365, features: ['hr-core', 'tasks', 'clinic', 'payroll', 'reports', 'life-insurance'] },
  { value: 'unlimited', label: 'Unlimited', maxUsers: 99999, duration: 365, features: ['hr-core', 'tasks', 'clinic', 'payroll', 'reports', 'life-insurance'] }
];

const CreateTenantForm = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdTenant, setCreatedTenant] = useState(null);
  const [createdLicense, setCreatedLicense] = useState(null);

  const { api } = useApi();

  const steps = ['Company Details', 'License Configuration', 'Module Selection', 'Review & Create'];

  const validationSchema = Yup.object({
    // Company details
    name: Yup.string()
      .required('Company name is required')
      .min(2, 'Company name must be at least 2 characters')
      .max(100, 'Company name must be less than 100 characters'),
    subdomain: Yup.string()
      .required('Subdomain is required')
      .matches(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
      .min(3, 'Subdomain must be at least 3 characters')
      .max(50, 'Subdomain must be less than 50 characters'),
    contactEmail: Yup.string()
      .email('Invalid email address')
      .required('Contact email is required'),
    contactPhone: Yup.string()
      .matches(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number'),
    
    // License configuration
    licenseType: Yup.string()
      .required('License type is required'),
    maxUsers: Yup.number()
      .positive('Max users must be positive')
      .required('Max users is required'),
    expiresAt: Yup.date()
      .min(new Date(), 'Expiry date must be in the future')
      .required('Expiry date is required'),
    
    // Module selection
    selectedModules: Yup.array()
      .min(1, 'At least one module must be selected')
  });

  const formik = useFormik({
    initialValues: {
      // Company details
      name: '',
      subdomain: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      
      // License configuration
      licenseType: 'trial',
      maxUsers: 10,
      maxStorage: 1024,
      maxAPICallsPerMonth: 10000,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      
      // Module selection
      selectedModules: ['hr-core'],
      
      // Additional settings
      dataResidency: 'US',
      gdprCompliant: false,
      notes: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      await handleCreateTenant(values);
    }
  });

  // Update form when license type changes
  React.useEffect(() => {
    const selectedLicenseType = LICENSE_TYPES.find(type => type.value === formik.values.licenseType);
    if (selectedLicenseType) {
      formik.setFieldValue('maxUsers', selectedLicenseType.maxUsers);
      formik.setFieldValue('selectedModules', selectedLicenseType.features);
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + selectedLicenseType.duration);
      formik.setFieldValue('expiresAt', expiryDate);
    }
  }, [formik.values.licenseType]);

  const handleCreateTenant = async (values) => {
    try {
      setLoading(true);
      setError(null);

      // Prepare tenant data
      const tenantData = {
        name: values.name,
        subdomain: values.subdomain,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        address: values.address,
        billing: {
          currentPlan: values.licenseType,
          billingCycle: 'monthly',
          paymentStatus: 'active'
        },
        restrictions: {
          maxUsers: values.maxUsers,
          maxStorage: values.maxStorage,
          maxAPICallsPerMonth: values.maxAPICallsPerMonth
        },
        compliance: {
          dataResidency: values.dataResidency,
          gdprCompliant: values.gdprCompliant
        },
        enabledModules: values.selectedModules
      };

      // Prepare license data
      const licenseData = {
        type: values.licenseType,
        modules: values.selectedModules,
        maxUsers: values.maxUsers,
        maxStorage: values.maxStorage,
        maxAPICallsPerMonth: values.maxAPICallsPerMonth,
        expiresAt: values.expiresAt.toISOString(),
        domain: `${values.subdomain}.hrms.local`,
        notes: values.notes
      };

      // Create tenant with license using the combined API method
      const result = await api.createTenantWithLicense(tenantData, licenseData);
      
      setCreatedTenant(result.tenant);
      setCreatedLicense(result.license);
      setActiveStep(steps.length); // Move to success step
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      formik.handleSubmit();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClose = () => {
    if (!loading) {
      formik.resetForm();
      setActiveStep(0);
      setError(null);
      setCreatedTenant(null);
      setCreatedLicense(null);
      onClose();
    }
  };

  const isStepValid = (step) => {
    switch (step) {
      case 0: // Company details
        return !formik.errors.name && !formik.errors.subdomain && !formik.errors.contactEmail && 
               formik.values.name && formik.values.subdomain && formik.values.contactEmail;
      case 1: // License configuration
        return !formik.errors.licenseType && !formik.errors.maxUsers && !formik.errors.expiresAt &&
               formik.values.licenseType && formik.values.maxUsers && formik.values.expiresAt;
      case 2: // Module selection
        return formik.values.selectedModules.length > 0;
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Company Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="name"
                label="Company Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="subdomain"
                label="Subdomain"
                value={formik.values.subdomain}
                onChange={formik.handleChange}
                error={formik.touched.subdomain && Boolean(formik.errors.subdomain)}
                helperText={formik.touched.subdomain && formik.errors.subdomain}
                InputProps={{
                  endAdornment: '.hrms.local'
                }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="contactEmail"
                label="Contact Email"
                type="email"
                value={formik.values.contactEmail}
                onChange={formik.handleChange}
                error={formik.touched.contactEmail && Boolean(formik.errors.contactEmail)}
                helperText={formik.touched.contactEmail && formik.errors.contactEmail}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="contactPhone"
                label="Contact Phone"
                value={formik.values.contactPhone}
                onChange={formik.handleChange}
                error={formik.touched.contactPhone && Boolean(formik.errors.contactPhone)}
                helperText={formik.touched.contactPhone && formik.errors.contactPhone}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="address"
                label="Address"
                multiline
                rows={3}
                value={formik.values.address}
                onChange={formik.handleChange}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                License Configuration
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>License Type</InputLabel>
                <Select
                  name="licenseType"
                  value={formik.values.licenseType}
                  onChange={formik.handleChange}
                  label="License Type"
                >
                  {LICENSE_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box>
                        <Typography variant="body1">{type.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Up to {type.maxUsers} users, {type.duration} days
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="maxUsers"
                label="Maximum Users"
                type="number"
                value={formik.values.maxUsers}
                onChange={formik.handleChange}
                error={formik.touched.maxUsers && Boolean(formik.errors.maxUsers)}
                helperText={formik.touched.maxUsers && formik.errors.maxUsers}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="License Expires"
                value={formik.values.expiresAt}
                onChange={(value) => formik.setFieldValue('expiresAt', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={formik.touched.expiresAt && Boolean(formik.errors.expiresAt)}
                    helperText={formik.touched.expiresAt && formik.errors.expiresAt}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Data Residency</InputLabel>
                <Select
                  name="dataResidency"
                  value={formik.values.dataResidency}
                  onChange={formik.handleChange}
                  label="Data Residency"
                >
                  <MenuItem value="US">United States</MenuItem>
                  <MenuItem value="EU">European Union</MenuItem>
                  <MenuItem value="ASIA">Asia Pacific</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="gdprCompliant"
                    checked={formik.values.gdprCompliant}
                    onChange={formik.handleChange}
                  />
                }
                label="GDPR Compliant"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Module Selection
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select the modules to enable for this tenant
              </Typography>
            </Grid>
            
            {AVAILABLE_MODULES.map((module) => (
              <Grid item xs={12} sm={6} key={module.id}>
                <Card 
                  variant="outlined"
                  sx={{ 
                    cursor: module.required ? 'default' : 'pointer',
                    opacity: module.required ? 0.7 : 1,
                    border: formik.values.selectedModules.includes(module.id) ? 2 : 1,
                    borderColor: formik.values.selectedModules.includes(module.id) ? 'primary.main' : 'divider'
                  }}
                  onClick={() => {
                    if (!module.required) {
                      const currentModules = formik.values.selectedModules;
                      if (currentModules.includes(module.id)) {
                        formik.setFieldValue('selectedModules', currentModules.filter(m => m !== module.id));
                      } else {
                        formik.setFieldValue('selectedModules', [...currentModules, module.id]);
                      }
                    }
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <ExtensionIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">{module.name}</Typography>
                      {module.required && (
                        <Chip label="Required" color="primary" size="small" sx={{ ml: 1 }} />
                      )}
                      {formik.values.selectedModules.includes(module.id) && (
                        <CheckCircleIcon color="success" sx={{ ml: 'auto' }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {module.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review & Confirm
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BusinessIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Company Details</Typography>
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Name:</strong> {formik.values.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Subdomain:</strong> {formik.values.subdomain}.hrms.local
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Contact:</strong> {formik.values.contactEmail}
                  </Typography>
                  {formik.values.contactPhone && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Phone:</strong> {formik.values.contactPhone}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <SecurityIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">License Details</Typography>
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Type:</strong> {LICENSE_TYPES.find(t => t.value === formik.values.licenseType)?.label}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Max Users:</strong> {formik.values.maxUsers}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Expires:</strong> {formik.values.expiresAt?.toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Data Residency:</strong> {formik.values.dataResidency}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <ExtensionIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Selected Modules</Typography>
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {formik.values.selectedModules.map((moduleId) => {
                      const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
                      return (
                        <Chip
                          key={moduleId}
                          label={module?.name}
                          color="primary"
                          variant="outlined"
                        />
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {formik.values.notes && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Notes"
                  multiline
                  rows={3}
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                />
              </Grid>
            )}
          </Grid>
        );

      default:
        return null;
    }
  };

  const renderSuccessContent = () => (
    <Box textAlign="center" py={4}>
      <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Company Created Successfully!
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {createdTenant?.name} has been created with license integration.
      </Typography>
      
      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Company Details
              </Typography>
              <Typography variant="body2">
                <strong>ID:</strong> {createdTenant?._id}
              </Typography>
              <Typography variant="body2">
                <strong>Subdomain:</strong> {createdTenant?.subdomain}.hrms.local
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                License Details
              </Typography>
              <Typography variant="body2">
                <strong>License Number:</strong> {createdLicense?.licenseNumber}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {createdLicense?.type}
              </Typography>
              <Typography variant="body2">
                <strong>Expires:</strong> {new Date(createdLicense?.expiresAt).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <BusinessIcon sx={{ mr: 1 }} />
          Create New Company
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep < steps.length ? (
          <>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            {renderStepContent(activeStep)}
          </>
        ) : (
          renderSuccessContent()
        )}
      </DialogContent>
      
      <DialogActions>
        {activeStep < steps.length ? (
          <>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleBack} 
              disabled={activeStep === 0 || loading}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepValid(activeStep) || loading}
            >
              {activeStep === steps.length - 1 ? 'Create Company' : 'Next'}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={handleClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateTenantForm;