import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import tenantService from '../../services/tenantService';

const TenantList = ({ onEdit, onView, onSuspend, onReactivate, refreshKey }) => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTenants();
  }, [refreshKey]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await tenantService.getAllTenants();
      // Handle the nested data structure from the API
      const tenantsData = response.data?.data?.tenants || response.data?.tenants || [];
      setTenants(tenantsData);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'error';
      case 'trial':
        return 'warning';
      case 'cancelled':
        return 'default';
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
    <Box>
      {tenants.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="info">
            No tenants found
          </Alert>
        </Paper>
      ) : (
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {tenants.map((tenant) => (
            <Paper 
              key={tenant.tenantId} 
              sx={{ 
                p: 3,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' },
                gap: 2,
                '&:hover': {
                  boxShadow: 2,
                  transform: 'translateY(-1px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            >
              {/* Main Info Section */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                flex: '1 1 auto',
                gap: 1
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2,
                  mb: 1
                }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {tenant.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      ID: {tenant.tenantId}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={tenant.status}
                      color={getStatusColor(tenant.status)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                    <Chip
                      label={tenant.subscription?.status || 'trial'}
                      color={tenant.subscription?.status === 'active' ? 'success' : 'warning'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>
                </Box>

                {/* Details Grid */}
                <Box sx={{ 
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 3,
                  mt: 1
                }}>
                  <Box sx={{ minWidth: '120px' }}>
                    <Typography variant="caption" color="text.secondary">
                      Domain
                    </Typography>
                    <Typography variant="body2">
                      {tenant.domain || '-'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ minWidth: '120px' }}>
                    <Typography variant="caption" color="text.secondary">
                      Users
                    </Typography>
                    <Typography variant="body2">
                      {tenant.usage?.userCount || 0} / {tenant.limits?.maxUsers || 100}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ minWidth: '120px' }}>
                    <Typography variant="caption" color="text.secondary">
                      Industry
                    </Typography>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {tenant.metadata?.industry || '-'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ minWidth: '120px' }}>
                    <Typography variant="caption" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body2">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  {tenant.contactInfo?.adminEmail && (
                    <Box sx={{ minWidth: '200px' }}>
                      <Typography variant="caption" color="text.secondary">
                        Admin Email
                      </Typography>
                      <Typography variant="body2">
                        {tenant.contactInfo.adminEmail}
                      </Typography>
                    </Box>
                  )}
                  
                  {tenant.subscription?.expiresAt && (
                    <Box sx={{ minWidth: '120px' }}>
                      <Typography variant="caption" color="text.secondary">
                        Expires
                      </Typography>
                      <Typography variant="body2">
                        {new Date(tenant.subscription.expiresAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Actions Section */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: { xs: 'row', md: 'column' },
                gap: 1,
                flex: '0 0 auto',
                justifyContent: { xs: 'flex-end', md: 'center' }
              }}>
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={() => onView(tenant)}
                    sx={{ 
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' }
                    }}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    onClick={() => onEdit(tenant)}
                    sx={{ 
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'info.light', color: 'info.contrastText' }
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                
                {tenant.status === 'active' ? (
                  <Tooltip title="Suspend">
                    <IconButton
                      size="small"
                      onClick={() => onSuspend(tenant)}
                      sx={{ 
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' }
                      }}
                    >
                      <BlockIcon />
                    </IconButton>
                  </Tooltip>
                ) : tenant.status === 'suspended' ? (
                  <Tooltip title="Reactivate">
                    <IconButton
                      size="small"
                      onClick={() => onReactivate(tenant)}
                      sx={{ 
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'success.light', color: 'success.contrastText' }
                      }}
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TenantList;
