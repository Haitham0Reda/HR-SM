/**
 * Standardized Chip Component
 * 
 * A wrapper around MUI Chip with consistent styling and status variants.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Chip as MuiChip } from '@mui/material';
import { designTokens } from '../../theme/designTokens';

const Chip = React.forwardRef(({
  label,
  variant = 'filled',
  color = 'default',
  size = 'medium',
  icon,
  avatar,
  onDelete,
  onClick,
  sx = {},
  ...props
}, ref) => {
  return (
    <MuiChip
      ref={ref}
      label={label}
      variant={variant}
      color={color}
      size={size}
      icon={icon}
      avatar={avatar}
      onDelete={onDelete}
      onClick={onClick}
      sx={{
        borderRadius: designTokens.borderRadius.md,
        fontWeight: designTokens.typography.fontWeight.medium,
        fontSize: size === 'small' ? designTokens.typography.fontSize.xs : designTokens.typography.fontSize.sm,
        transition: 'all 0.2s ease-in-out',
        
        ...(onClick && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }),
        
        ...sx,
      }}
      {...props}
    />
  );
});

Chip.displayName = 'Chip';

Chip.propTypes = {
  /** Chip label */
  label: PropTypes.node.isRequired,
  
  /** Chip variant */
  variant: PropTypes.oneOf(['filled', 'outlined']),
  
  /** Chip color */
  color: PropTypes.oneOf(['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info']),
  
  /** Chip size */
  size: PropTypes.oneOf(['small', 'medium']),
  
  /** Icon element */
  icon: PropTypes.node,
  
  /** Avatar element */
  avatar: PropTypes.node,
  
  /** Delete handler */
  onDelete: PropTypes.func,
  
  /** Click handler */
  onClick: PropTypes.func,
  
  /** Custom styles */
  sx: PropTypes.object,
};

// Status Chip variants for common use cases
export const StatusChip = ({ status, ...props }) => {
  const statusConfig = {
    active: { color: 'success', label: 'Active' },
    inactive: { color: 'default', label: 'Inactive' },
    pending: { color: 'warning', label: 'Pending' },
    approved: { color: 'success', label: 'Approved' },
    rejected: { color: 'error', label: 'Rejected' },
    cancelled: { color: 'default', label: 'Cancelled' },
  };

  const config = statusConfig[status] || { color: 'default', label: status };

  return <Chip color={config.color} label={config.label} size="small" {...props} />;
};

StatusChip.propTypes = {
  status: PropTypes.oneOf(['active', 'inactive', 'pending', 'approved', 'rejected', 'cancelled']).isRequired,
};

export default Chip;
