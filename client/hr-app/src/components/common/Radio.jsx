/**
 * Standardized Radio Component
 * 
 * A wrapper around MUI Radio with consistent styling.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Radio as MuiRadio, RadioGroup, FormControlLabel, FormControl, FormLabel } from '@mui/material';
import { designTokens } from '../../theme/designTokens';

const Radio = React.forwardRef(({
  label,
  checked,
  onChange,
  disabled = false,
  color = 'primary',
  size = 'medium',
  sx = {},
  ...props
}, ref) => {
  const radio = (
    <MuiRadio
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
        control={radio}
        label={label}
        sx={{
          '& .MuiFormControlLabel-label': {
            fontWeight: designTokens.typography.fontWeight.regular,
          },
        }}
      />
    );
  }

  return radio;
});

Radio.displayName = 'Radio';

Radio.propTypes = {
  label: PropTypes.node,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info', 'default']),
  size: PropTypes.oneOf(['small', 'medium']),
  sx: PropTypes.object,
};

// RadioGroup wrapper for convenience
export const RadioGroupWrapper = ({ label, value, onChange, children, row = false, sx = {} }) => {
  return (
    <FormControl sx={sx}>
      {label && <FormLabel>{label}</FormLabel>}
      <RadioGroup value={value} onChange={onChange} row={row}>
        {children}
      </RadioGroup>
    </FormControl>
  );
};

RadioGroupWrapper.propTypes = {
  label: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
  children: PropTypes.node.isRequired,
  row: PropTypes.bool,
  sx: PropTypes.object,
};

export default Radio;
