import React from 'react';
import { ModuleGuard, useModule } from '../hooks/useModuleAccess';
import { Box, Card, CardContent, Typography, Button, Chip } from '@mui/material';
import { Lock as LockIcon, Star as StarIcon } from '@mui/icons-material';

/**
 * Component that conditionally renders features based on module access
 * Usage: 
 *   <ModuleFeature module="payroll">
 *     <PayrollWidget />
 *   </ModuleFeature>
 */
export function ModuleFeature({ 
  module, 
  modules,
  requireAll = false,
  children, 
  showUpgrade = true,
  upgradeMessage,
  className,
  ...props 
}) {
  const moduleArray = modules || [module];
  
  const defaultFallback = showUpgrade ? (
    <ModuleUpgradeCard 
      modules={moduleArray} 
      message={upgradeMessage}
    />
  ) : null;

  return (
    <ModuleGuard
      modules={moduleArray}
      requireAll={requireAll}
      fallback={defaultFallback}
      loadingComponent={<ModuleLoadingCard />}
      {...props}
    >
      <div className={className}>
        {children}
      </div>
    </ModuleGuard>
  );
}

/**
 * Loading card for module features
 */
function ModuleLoadingCard() {
  return (
    <Card variant="outlined" sx={{ opacity: 0.7 }}>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Loading module...
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Upgrade card shown when module access is not available
 */
function ModuleUpgradeCard({ modules, message }) {
  const moduleNames = modules.join(', ');
  
  return (
    <Card variant="outlined" sx={{ border: '2px dashed', borderColor: 'warning.main' }}>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
          <LockIcon sx={{ fontSize: 40, color: 'warning.main', mr: 1 }} />
          <StarIcon sx={{ fontSize: 40, color: 'warning.main' }} />
        </Box>
        
        <Typography variant="h6" gutterBottom>
          Premium Feature
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          {message || `This feature requires access to: ${moduleNames}`}
        </Typography>
        
        <Box display="flex" justifyContent="center" gap={1} mb={2}>
          {modules.map(module => (
            <Chip 
              key={module}
              label={module}
              size="small"
              color="warning"
              variant="outlined"
            />
          ))}
        </Box>
        
        <Button 
          variant="contained" 
          color="warning"
          startIcon={<StarIcon />}
          onClick={() => {
            // Could open upgrade dialog or redirect to billing
            console.log('Upgrade clicked for modules:', modules);
          }}
        >
          Upgrade Plan
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Inline module guard for smaller features
 */
export function InlineModuleGuard({ module, children, fallback = null }) {
  return (
    <ModuleGuard
      modules={[module]}
      fallback={fallback}
      loadingComponent={null}
    >
      {children}
    </ModuleGuard>
  );
}

/**
 * Module badge component to show module status
 */
export function ModuleBadge({ module, showTier = true }) {
  const { hasAccess, moduleInfo } = useModule(module);
  
  if (!moduleInfo) return null;
  
  const color = hasAccess ? 'success' : 'default';
  const label = hasAccess 
    ? (showTier && moduleInfo.tier ? `${module} (${moduleInfo.tier})` : module)
    : `${module} (disabled)`;
  
  return (
    <Chip 
      label={label}
      size="small"
      color={color}
      variant={hasAccess ? 'filled' : 'outlined'}
    />
  );
}

export default ModuleFeature;