import React from 'react';
import { Navigate } from 'react-router-dom';
import { useModule } from '../hooks/useModuleAccess';
import { useAuth } from '../store/providers/ReduxAuthProvider';
import { Box, Alert, CircularProgress, Button } from '@mui/material';
import { Lock as LockIcon, Refresh as RefreshIcon } from '@mui/icons-material';

/**
 * Component that protects routes based on module access
 * Usage: <ModuleProtectedRoute module="payroll" component={PayrollPage} />
 */
export default function ModuleProtectedRoute({ 
  module, 
  component: Component, 
  fallbackPath = '/dashboard',
  showAccessDenied = true,
  ...props 
}) {
  const { user } = useAuth();
  const { hasAccess, moduleInfo, loading, error } = useModule(module);

  // Admin users bypass module restrictions
  if (user && user.role === 'admin') {
    return <Component {...props} />;
  }

  // Show loading state
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Box>Checking module access...</Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        >
          Failed to check module access: {error}
        </Alert>
      </Box>
    );
  }

  // Check access
  if (!hasAccess) {
    if (showAccessDenied) {
      return (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          minHeight="400px" 
          textAlign="center"
          p={3}
        >
          <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Alert severity="warning" sx={{ maxWidth: 500 }}>
            <Box>
              <strong>Module Access Required</strong>
              <br />
              You need access to the "{module}" module to view this page.
              <br />
              Please contact your administrator to enable this module.
            </Box>
          </Alert>
          {moduleInfo && (
            <Box mt={2} color="text.secondary" fontSize="0.875rem">
              Module Status: {moduleInfo.enabled ? 'Enabled' : 'Disabled'}
              {moduleInfo.tier && ` | Tier: ${moduleInfo.tier}`}
            </Box>
          )}
        </Box>
      );
    }
    
    // Redirect to fallback path
    return <Navigate to={fallbackPath} replace />;
  }

  // Render the component if access is granted
  return <Component {...props} />;
}
