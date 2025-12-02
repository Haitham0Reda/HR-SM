/**
 * Standardized Select Component
 * 
 * A wrapper around MUI Select with consistent styling.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, InputLabel, Select as MuiSelect, FormHelperText } from '@mui/material';
import { designTokens } from '../../theme/designTokens';

const Select = React.forwardRef(({
  label,
  value,
  onChange,
  children,
  error = false,
  helperText,
  fullWidth = false,
  size = 'medium',
  variant = 'outlined',
  required = false,
  disabled = false,
  sx = {},
  ...props
}, ref) => {
  const labelId = `select-label-${label?.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      variant={variant}
      error={error}
      required={required}
      disabled={disabled}
      sx={sx}
    >
      {label && <InputLabel id={labelId}>{label}</InputLabel>}
      <MuiSelect
        ref={ref}
        labelId={label ? labelId : undefined}
        label={label}
        value={value}
        onChange={onChange}
        sx={{
          borderRadius: designTokens.borderRadius.md,
          transition: 'all 0.2s ease-in-out',
          
          '&:hover': {
            boxShadow: designTokens.shadows.xs,
          },
          
          '&.Mui-focused': {
            boxShadow: designTokens.shadows.sm,
          },
        }}
        {...props}
      >
        {children}
      </MuiSelect>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
});

Select.displayName = 'Select';

Select.propTypes = {
  label: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
  children: PropTypes.node.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.node,
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium']),
  variant: PropTypes.oneOf(['outlined', 'filled', 'standard']),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  sx: PropTypes.object,
};

export default Select;
