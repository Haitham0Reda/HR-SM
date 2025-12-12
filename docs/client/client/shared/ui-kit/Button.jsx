/**
 * Standardized Button Component
 * 
 * A wrapper around MUI Button with consistent default props and styling.
 * All buttons in the application should use this component to ensure
 * visual consistency.
 * 
 * Features:
 * - Consistent border radius, padding, and font weight
 * - Loading state support
 * - Disabled state styling
 * - Hover effects
 * - Multiple variants (contained, outlined, text)
 * - Multiple sizes (small, medium, large)
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Button as MuiButton, CircularProgress } from '@mui/material';

// Design tokens - can be customized per app
const defaultDesignTokens = {
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
  },
  typography: {
    fontSize: {
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
    },
    fontWeight: {
      medium: 500,
    },
  },
  borderRadius: {
    md: '8px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
};

const Button = React.forwardRef(({
  children,
  loading = false,
  disabled = false,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  fullWidth = false,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  designTokens = defaultDesignTokens,
  sx = {},
  ...props
}, ref) => {
  // Determine if button should be disabled
  const isDisabled = disabled || loading;

  // Size-specific padding
  const sizeStyles = {
    small: {
      padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
      fontSize: designTokens.typography.fontSize.sm,
    },
    medium: {
      padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
      fontSize: designTokens.typography.fontSize.md,
    },
    large: {
      padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
      fontSize: designTokens.typography.fontSize.lg,
    },
  };

  return (
    <MuiButton
      ref={ref}
      variant={variant}
      size={size}
      color={color}
      fullWidth={fullWidth}
      disabled={isDisabled}
      onClick={onClick}
      type={type}
      startIcon={loading ? null : startIcon}
      endIcon={loading ? null : endIcon}
      sx={{
        // Base styles
        textTransform: 'none',
        fontWeight: designTokens.typography.fontWeight.medium,
        borderRadius: designTokens.borderRadius.md,
        boxShadow: variant === 'contained' ? designTokens.shadows.sm : 'none',
        transition: 'all 0.2s ease-in-out',
        
        // Size-specific styles
        ...sizeStyles[size],
        
        // Hover effects
        '&:hover': {
          boxShadow: variant === 'contained' ? designTokens.shadows.md : 'none',
          transform: 'translateY(-1px)',
        },
        
        // Active state
        '&:active': {
          transform: 'translateY(0)',
        },
        
        // Disabled state
        '&.Mui-disabled': {
          opacity: 0.6,
          cursor: 'not-allowed',
        },
        
        // Loading state
        ...(loading && {
          position: 'relative',
          color: 'transparent',
        }),
        
        // Custom styles
        ...sx,
      }}
      {...props}
    >
      {loading && (
        <CircularProgress
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: size === 'small' ? '-8px' : size === 'large' ? '-12px' : '-10px',
            marginLeft: size === 'small' ? '-8px' : size === 'large' ? '-12px' : '-10px',
            color: variant === 'contained' ? 'inherit' : color,
          }}
        />
      )}
      {children}
    </MuiButton>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  /** Button content */
  children: PropTypes.node.isRequired,
  
  /** Loading state - shows spinner and disables button */
  loading: PropTypes.bool,
  
  /** Disabled state */
  disabled: PropTypes.bool,
  
  /** Button variant */
  variant: PropTypes.oneOf(['contained', 'outlined', 'text']),
  
  /** Button size */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  
  /** Button color */
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info', 'inherit']),
  
  /** Full width button */
  fullWidth: PropTypes.bool,
  
  /** Icon before button text */
  startIcon: PropTypes.node,
  
  /** Icon after button text */
  endIcon: PropTypes.node,
  
  /** Click handler */
  onClick: PropTypes.func,
  
  /** Button type */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  
  /** Design tokens for theming */
  designTokens: PropTypes.object,
  
  /** Custom styles */
  sx: PropTypes.object,
};

export default Button;
