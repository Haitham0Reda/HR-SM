import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
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
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Tenant ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Domain</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Subscription</TableCell>
            <TableCell>Users</TableCell>
            <TableCell>Industry</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center">
                No tenants found
              </TableCell>
            </TableRow>
          ) : (
            tenants.map((tenant) => (
              <TableRow key={tenant.tenantId}>
                <TableCell>
                  <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {tenant.tenantId}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Box sx={{ fontWeight: 'medium' }}>{tenant.name}</Box>
                    {tenant.contactInfo?.adminEmail && (
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {tenant.contactInfo.adminEmail}
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{tenant.domain || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={tenant.status}
                    color={getStatusColor(tenant.status)}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Chip
                      label={tenant.subscription?.status || 'trial'}
                      color={tenant.subscription?.status === 'active' ? 'success' : 'warning'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                    {tenant.subscription?.expiresAt && (
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                        Expires: {new Date(tenant.subscription.expiresAt).toLocaleDateString()}
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Box sx={{ fontWeight: 'medium' }}>
                      {tenant.usage?.userCount || 0} / {tenant.limits?.maxUsers || 100}
                    </Box>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      users
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ textTransform: 'capitalize' }}>
                    {tenant.metadata?.industry || '-'}
                  </Box>
                </TableCell>
                <TableCell>
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onView(tenant)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(tenant)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  {tenant.status === 'active' ? (
                    <Tooltip title="Suspend">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onSuspend(tenant)}
                      >
                        <BlockIcon />
                      </IconButton>
                    </Tooltip>
                  ) : tenant.status === 'suspended' ? (
                    <Tooltip title="Reactivate">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => onReactivate(tenant)}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TenantList;
