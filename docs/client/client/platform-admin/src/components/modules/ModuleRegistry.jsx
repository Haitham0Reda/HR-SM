import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import moduleService from '../../services/moduleService';

const ModuleRegistry = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await moduleService.getAllModules();
      setModules(response.data.modules || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      core: 'primary',
      communication: 'secondary',
      productivity: 'success',
      finance: 'warning',
      medical: 'info',
    };
    return colors[category] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      {modules.length === 0 ? (
        <Grid item xs={12}>
          <Alert severity="info">
            No modules found in the registry.
          </Alert>
        </Grid>
      ) : (
        modules.map((module) => (
          <Grid item xs={12} md={6} key={module.name}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ExtensionIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="div">
                    {module.displayName || module.name}
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <Chip
                      label={module.category}
                      color={getCategoryColor(module.category)}
                      size="small"
                    />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {module.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Version: {module.version} | Author: {module.author}
                  </Typography>
                </Box>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Dependencies</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {module.dependencies && module.dependencies.length > 0 ? (
                      <List dense>
                        {module.dependencies.map((dep, index) => (
                          <ListItem key={index} disablePadding>
                            <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                            <ListItemText primary={dep} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No dependencies
                      </Typography>
                    )}
                    
                    {module.optionalDependencies && module.optionalDependencies.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 2 }}>
                          Optional Dependencies
                        </Typography>
                        <List dense>
                          {module.optionalDependencies.map((dep, index) => (
                            <ListItem key={index} disablePadding>
                              <ListItemText primary={dep} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>

                {module.pricing && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Pricing
                    </Typography>
                    <Typography variant="body2">
                      Tier: {module.pricing.tier}
                    </Typography>
                    {module.pricing.monthlyPrice && (
                      <Typography variant="body2">
                        ${module.pricing.monthlyPrice}/month
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );
};

export default ModuleRegistry;
