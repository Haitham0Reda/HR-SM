/**
 * Standardized Checkbox Component
 * 
 * A wrapper around MUI Checkbox with consistent styling.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox as MuiCheckbox, FormControlLabel } from '@mui/material';
import { designTokens } from '../../theme/designTokens';

const Checkbox = React.forwardRef(({
  label,
  checked,
  onChange,
  disabled = false,
  color = 'primary',
  size = 'medium',
  sx = {},
  ...props
}, ref) => {
  const checkbox = (
    <MuiCheckbox
      ref={ref}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      color={color}
      size={size}
      sx={{
        transition: 'all 0.2s ease-in-out',
        
        '&:hover': {
          transform: 'scale(1.05)',
        },
        
        ...sx,
      }}
      {...props}
    />
  );

  if (label) {
    return (
      <FormControlLabel
        control={checkbox}
        label={label}
        sx={{
          '& .MuiFormControlLabel-label': {
            fontWeight: designTokens.typography.fontWeight.regular,
          },
        }}
      />
    );
  }

  return checkbox;
});

Checkbox.displayName = 'Checkbox';

Checkbox.propTypes = {
  label: PropTypes.node,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info', 'default']),
  size: PropTypes.oneOf(['small', 'medium']),
  sx: PropTypes.object,
};

export default Checkbox;
