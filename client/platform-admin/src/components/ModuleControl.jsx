import React, { useState, useEffect } from 'react';
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
  Switch,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';

const AVAILABLE_MODULES = [
  {
    id: 'hr-core',
    name: 'HR Core',
    description: 'Essential HR functionality including employee management, basic reporting, and user administration',
    category: 'Core',
    required: true,
    dependencies: [],
    features: ['Employee Management', 'User Administration', 'Basic Reports', 'Profile Management'],
    licenseRequired: ['trial', 'basic', 'professional', 'enterprise', 'unlimited']
  },
  {
    id: 'tasks',
    name: 'Task Management',
    description: 'Project and task tracking with assignment, progress monitoring, and deadline management',
    category: 'Productivity',
    required: false,
    dependencies: ['hr-core'],
    features: ['Task Creation', 'Project Management', 'Progress Tracking', 'Deadline Alerts'],
    licenseRequired: ['basic', 'professional', 'enterprise', 'unlimited']
  },
  {
    id: 'clinic',
    name: 'Medical Clinic',
    description: 'Healthcare management including appointments, medical records, and health tracking',
    category: 'Healthcare',
    required: false,
    dependencies: ['hr-core'],
    features: ['Appointment Scheduling', 'Medical Records', 'Health Tracking', 'Doctor Management'],
    licenseRequired: ['professional', 'enterprise', 'unlimited']
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Comprehensive salary and benefits management with tax calculations and reporting',
    category: 'Finance',
    required: false,
    dependencies: ['hr-core'],
    features: ['Salary Management', 'Benefits Administration', 'Tax Calculations', 'Payroll Reports'],
    licenseRequired: ['professional', 'enterprise', 'unlimited']
  },
  {
    id: 'reports',
    name: 'Advanced Reports',
    description: 'Advanced analytics and reporting with custom dashboards and data visualization',
    category: 'Analytics',
    required: false,
    dependencies: ['hr-core'],
    features: ['Custom Dashboards', 'Data Visualization', 'Export Options', 'Scheduled Reports'],
    licenseRequired: ['enterprise', 'unlimited']
  },
  {
    id: 'life-insurance',
    name: 'Life Insurance',
    description: 'Employee life insurance management including policies, claims, and beneficiary management',
    category: 'Insurance',
    required: false,
    dependencies: ['hr-core'],
    features: ['Policy Management', 'Claims Processing', 'Beneficiary Management', 'Insurance Reports'],
    licenseRequired: ['enterprise', 'unlimited']
  }
];

const ModuleControl = ({ open, onClose, tenantId, tenantName, currentLicense }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState([]);
  const [enabledModules, setEnabledModules] = useState([]);
  const [error, setError] = useState(null);
  const [changes, setChanges] = useState({});

  const { api } = useApi();

  useEffect(() => {
    if (open && tenantId) {
      loadModuleData();
    }
  }, [open, tenantId]);

  const loadModuleData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get tenant information to see currently enabled modules
      const tenantResponse = await api.platform.getTenant(tenantId);
      if (tenantResponse.success) {
        const tenant = tenantResponse.data;
        setEnabledModules(tenant.enabledModules || ['hr-core']);
      }
      
      // Set available modules
      setModules(AVAILABLE_MODULES);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isModuleAllowedByLicense = (moduleId) => {
    if (!currentLicense) return false;
    const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
    if (!module) return false;
    
    return module.licenseRequired.includes(currentLicense.type);
  };

  const canEnableModule = (moduleId) => {
    const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
    if (!module) return false;
    
    // Check license requirements
    if (!isModuleAllowedByLicense(moduleId)) return false;
    
    // Check dependencies
    const missingDependencies = module.dependencies.filter(dep => 
      !enabledModules.includes(dep) && !changes[dep]
    );
    
    return missingDependencies.length === 0;
  };

  const canDisableModule = (moduleId) => {
    const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
    if (!module || module.required) return false;
    
    // Check if other enabled modules depend on this one
    const dependentModules = AVAILABLE_MODULES.filter(m => 
      m.dependencies.includes(moduleId) && 
      (enabledModules.includes(m.id) || changes[m.id])
    );
    
    return dependentModules.length === 0;
  };

  const handleModuleToggle = (moduleId, enabled) => {
    setChanges(prev => ({
      ...prev,
      [moduleId]: enabled
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const promises = [];
      
      // Process each change
      for (const [moduleId, enabled] of Object.entries(changes)) {
        if (enabled) {
          promises.push(api.platform.enableModule(tenantId, moduleId));
        } else {
          promises.push(api.platform.disableModule(tenantId, moduleId));
        }
      }
      
      await Promise.all(promises);
      
      // Update local state
      const newEnabledModules = [...enabledModules];
      for (const [moduleId, enabled] of Object.entries(changes)) {
        if (enabled && !newEnabledModules.includes(moduleId)) {
          newEnabledModules.push(moduleId);
        } else if (!enabled && newEnabledModules.includes(moduleId)) {
          const index = newEnabledModules.indexOf(moduleId);
          newEnabledModules.splice(index, 1);
        }
      }
      
      setEnabledModules(newEnabledModules);
      setChanges({});
      
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setChanges({});
  };

  const isModuleEnabled = (moduleId) => {
    if (changes.hasOwnProperty(moduleId)) {
      return changes[moduleId];
    }
    return enabledModules.includes(moduleId);
  };

  const getModuleStatus = (moduleId) => {
    const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
    const enabled = isModuleEnabled(moduleId);
    const allowedByLicense = isModuleAllowedByLicense(moduleId);
    
    if (module.required) return 'required';
    if (!allowedByLicense) return 'license-restricted';
    if (enabled) return 'enabled';
    return 'disabled';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'required':
        return <CheckCircleIcon color="primary" />;
      case 'enabled':
        return <CheckCircleIcon color="success" />;
      case 'disabled':
        return <CancelIcon color="disabled" />;
      case 'license-restricted':
        return <SecurityIcon color="error" />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'required':
        return 'primary';
      case 'enabled':
        return 'success';
      case 'disabled':
        return 'default';
      case 'license-restricted':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'required':
        return 'Required';
      case 'enabled':
        return 'Enabled';
      case 'disabled':
        return 'Disabled';
      case 'license-restricted':
        return 'License Required';
      default:
        return 'Unknown';
    }
  };

  const groupedModules = modules.reduce((groups, module) => {
    const category = module.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(module);
    return groups;
  }, {});

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <ExtensionIcon sx={{ mr: 1 }} />
            Module Control - {tenantName}
          </Box>
          <IconButton onClick={loadModuleData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {hasChanges && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You have unsaved changes. Click "Save Changes" to apply them.
          </Alert>
        )}

        {/* License Information */}
        {currentLicense && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SecurityIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Current License</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <Typography variant="body1">{currentLicense.type?.toUpperCase()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Max Users</Typography>
                  <Typography variant="body1">{currentLicense.features?.maxUsers || 'Unlimited'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Expires</Typography>
                  <Typography variant="body1">
                    {new Date(currentLicense.expiresAt).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={currentLicense.status?.toUpperCase()} 
                    color={currentLicense.status === 'active' ? 'success' : 'error'}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Module Categories */}
        {Object.entries(groupedModules).map(([category, categoryModules]) => (
          <Accordion key={category} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">{category} Modules</Typography>
              <Chip 
                label={`${categoryModules.filter(m => isModuleEnabled(m.id)).length}/${categoryModules.length} enabled`}
                size="small"
                sx={{ ml: 2 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {categoryModules.map((module) => {
                  const status = getModuleStatus(module.id);
                  const enabled = isModuleEnabled(module.id);
                  const canEnable = canEnableModule(module.id);
                  const canDisable = canDisableModule(module.id);
                  
                  return (
                    <Grid item xs={12} md={6} key={module.id}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          height: '100%',
                          opacity: status === 'license-restricted' ? 0.6 : 1
                        }}
                      >
                        <CardContent>
                          <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                            <Box display="flex" alignItems="center">
                              {getStatusIcon(status)}
                              <Box ml={1}>
                                <Typography variant="h6">{module.name}</Typography>
                                <Chip
                                  label={getStatusLabel(status)}
                                  color={getStatusColor(status)}
                                  size="small"
                                />
                              </Box>
                            </Box>
                            
                            {!module.required && status !== 'license-restricted' && (
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={enabled}
                                    onChange={(e) => handleModuleToggle(module.id, e.target.checked)}
                                    disabled={enabled ? !canDisable : !canEnable}
                                  />
                                }
                                label=""
                              />
                            )}
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {module.description}
                          </Typography>
                          
                          {/* Dependencies */}
                          {module.dependencies.length > 0 && (
                            <Box mt={2}>
                              <Typography variant="caption" color="text.secondary">
                                Dependencies:
                              </Typography>
                              <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                                {module.dependencies.map((dep) => (
                                  <Chip
                                    key={dep}
                                    label={AVAILABLE_MODULES.find(m => m.id === dep)?.name || dep}
                                    size="small"
                                    variant="outlined"
                                    color={isModuleEnabled(dep) ? 'success' : 'default'}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                          
                          {/* Features */}
                          <Box mt={2}>
                            <Typography variant="caption" color="text.secondary">
                              Features:
                            </Typography>
                            <List dense sx={{ mt: 0.5 }}>
                              {module.features.slice(0, 3).map((feature, index) => (
                                <ListItem key={index} sx={{ py: 0, px: 0 }}>
                                  <Typography variant="caption">• {feature}</Typography>
                                </ListItem>
                              ))}
                              {module.features.length > 3 && (
                                <ListItem sx={{ py: 0, px: 0 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    +{module.features.length - 3} more...
                                  </Typography>
                                </ListItem>
                              )}
                            </List>
                          </Box>
                          
                          {/* License Requirements */}
                          {status === 'license-restricted' && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                              <Typography variant="caption">
                                Requires license: {module.licenseRequired.join(', ')}
                              </Typography>
                            </Alert>
                          )}
                          
                          {/* Change indicator */}
                          {changes.hasOwnProperty(module.id) && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                              <Typography variant="caption">
                                {changes[module.id] ? 'Will be enabled' : 'Will be disabled'}
                              </Typography>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
        
        {hasChanges && (
          <>
            <Button onClick={handleDiscardChanges} disabled={saving}>
              Discard Changes
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ModuleControl;