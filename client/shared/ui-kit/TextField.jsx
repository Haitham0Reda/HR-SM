/**
 * Standardized TextField Component
 * 
 * A wrapper around MUI TextField with consistent styling.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { TextField as MuiTextField } from '@mui/material';

// Design tokens - can be customized per app
const defaultDesignTokens = {
  borderRadius: {
    md: '8px',
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  typography: {
    fontWeight: {
      medium: 500,
    },
  },
};

const TextField = React.forwardRef(({
  variant = 'outlined',
  size = 'medium',
  fullWidth = false,
  error = false,
  helperText,
  designTokens = defaultDesignTokens,
  sx = {},
  ...props
}, ref) => {
  return (
    <MuiTextField
      ref={ref}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      error={error}
      helperText={helperText}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: designTokens.borderRadius.md,
          transition: 'all 0.2s ease-in-out',
          
          '&:hover': {
            boxShadow: designTokens.shadows.xs,
          },
          
          '&.Mui-focused': {
            boxShadow: designTokens.shadows.sm,
          },
        },
        
        '& .MuiInputLabel-root': {
          fontWeight: designTokens.typography.fontWeight.medium,
        },
        
        ...sx,
      }}
      {...props}
    />
  );
});

TextField.displayName = 'TextField';

TextField.propTypes = {
  variant: PropTypes.oneOf(['outlined', 'filled', 'standard']),
  size: PropTypes.oneOf(['small', 'medium']),
  fullWidth: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.node,
  designTokens: PropTypes.object,
  sx: PropTypes.object,
};

export default TextField;
