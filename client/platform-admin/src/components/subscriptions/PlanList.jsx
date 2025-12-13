import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import subscriptionService from '../../services/subscriptionService';

const PlanList = ({ onEdit }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await subscriptionService.getAllPlans();
      setPlans(response.data?.plans || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'free':
        return 'default';
      case 'basic':
        return 'primary';
      case 'professional':
        return 'secondary';
      case 'enterprise':
        return 'success';
      default:
        return 'default';
    }
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
      {plans.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            No subscription plans found. Create your first plan to get started.
          </Alert>
        </Grid>
      ) : (
        plans.map((plan) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plan._id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" component="div">
                    {plan.displayName}
                  </Typography>
                  <Chip
                    label={plan.tier}
                    color={getTierColor(plan.tier)}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {plan.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h4" component="div">
                    ${plan.pricing.monthly}
                    <Typography variant="caption" color="text.secondary">
                      /month
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${plan.pricing.yearly}/year
                  </Typography>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Included Modules:
                </Typography>
                <List dense>
                  {plan.includedModules && plan.includedModules.length > 0 ? (
                    plan.includedModules.map((module, index) => (
                      <ListItem key={index} disablePadding>
                        <CheckIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                        <ListItemText primary={module.moduleId} />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem disablePadding>
                      <ListItemText
                        primary="No modules included"
                        primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      />
                    </ListItem>
                  )}
                </List>

                {plan.limits && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Limits:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Max Users: {plan.limits.maxUsers || 'Unlimited'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Max Storage: {plan.limits.maxStorage ? `${(plan.limits.maxStorage / 1024 / 1024 / 1024).toFixed(0)} GB` : 'Unlimited'}
                    </Typography>
                  </Box>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => onEdit(plan)}>
                  Edit
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );
};

export default PlanList;
