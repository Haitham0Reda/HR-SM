/**
 * Standardized DatePicker Component
 * 
 * A wrapper around MUI DatePicker with consistent styling.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { designTokens } from '../../theme/designTokens';
import TextField from './TextField';

const DatePicker = React.forwardRef(({
  label,
  value,
  onChange,
  error = false,
  helperText,
  fullWidth = false,
  disabled = false,
  minDate,
  maxDate,
  format = 'MM/DD/YYYY',
  sx = {},
  ...props
}, ref) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        ref={ref}
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        format={format}
        slotProps={{
          textField: {
            fullWidth,
            error,
            helperText,
            sx: {
              '& .MuiOutlinedInput-root': {
                borderRadius: designTokens.borderRadius.md,
              },
              ...sx,
            },
          },
        }}
        {...props}
      />
    </LocalizationProvider>
  );
});

DatePicker.displayName = 'DatePicker';

DatePicker.propTypes = {
  label: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
  error: PropTypes.bool,
  helperText: PropTypes.node,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  minDate: PropTypes.any,
  maxDate: PropTypes.any,
  format: PropTypes.string,
  sx: PropTypes.object,
};

export default DatePicker;
