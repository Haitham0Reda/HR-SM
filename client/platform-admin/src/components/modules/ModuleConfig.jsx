import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import moduleService from '../../services/moduleService';
import tenantService from '../../services/tenantService';

const ModuleConfig = ({ open, onClose, tenant, onSuccess }) => {
  const [allModules, setAllModules] = useState([]);
  const [enabledModules, setEnabledModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [processingModule, setProcessingModule] = useState(null);

  useEffect(() => {
    if (open && tenant) {
      loadData();
    }
  }, [open, tenant]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      setError('');

      // Load all modules
      const modulesResponse = await moduleService.getAllModules();
      setAllModules(modulesResponse.data || []);

      // Load tenant data to get enabled modules
      const tenantResponse = await tenantService.getTenantById(tenant.tenantId);
      const tenantData = tenantResponse.data;
      setEnabledModules(tenantData.enabledModules?.map(m => m.moduleId) || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleModule = async (moduleId, currentlyEnabled) => {
    setProcessingModule(moduleId);
    setError('');

    try {
      if (currentlyEnabled) {
        await moduleService.disableModule(tenant.tenantId, moduleId);
        setEnabledModules(prev => prev.filter(id => id !== moduleId));
      } else {
        await moduleService.enableModule(tenant.tenantId, moduleId);
        setEnabledModules(prev => [...prev, moduleId]);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to toggle module');
    } finally {
      setProcessingModule(null);
    }
  };

  const isModuleEnabled = (moduleId) => {
    return enabledModules.includes(moduleId);
  };

  const canDisableModule = (module) => {
    // HR-Core cannot be disabled
    if (module.name === 'hr-core') {
      return false;
    }
    return true;
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Module Configuration - {tenant?.name}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loadingData ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              HR-Core is always enabled and cannot be disabled. It's the foundation of the system.
            </Alert>

            <List>
              {allModules.map((module) => {
                const enabled = isModuleEnabled(module.name);
                const canDisable = canDisableModule(module);
                const isProcessing = processingModule === module.name;

                return (
                  <React.Fragment key={module.name}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {module.displayName || module.name}
                            </Typography>
                            {module.name === 'hr-core' && (
                              <Chip label="Required" color="primary" size="small" />
                            )}
                            {module.category && (
                              <Chip label={module.category} size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        primaryTypographyProps={{ component: 'div' }}
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {module.description}
                            </Typography>
                            {module.dependencies && module.dependencies.length > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                Dependencies: {module.dependencies.join(', ')}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        {isProcessing ? (
                          <CircularProgress size={24} />
                        ) : (
                          <Switch
                            edge="end"
                            checked={enabled}
                            onChange={() => handleToggleModule(module.name, enabled)}
                            disabled={!canDisable}
                          />
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModuleConfig;
