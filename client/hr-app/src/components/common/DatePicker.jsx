/**
 * Standardized DatePicker Component with dd/mm/yyyy format
 * 
 * A wrapper around MUI DatePicker with consistent styling and dd/mm/yyyy format.
 */

import { useMemo, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { designTokens } from '../../theme/designTokens';

// Enable custom parse format plugin
dayjs.extend(customParseFormat);

const DatePicker = forwardRef(({
  label,
  value,
  onChange,
  error = false,
  helperText,
  fullWidth = false,
  disabled = false,
  minDate,
  maxDate,
  format, // Will be overridden to use dd/mm/yyyy
  shortYear = false, // New prop to use dd/mm/yy instead of dd/mm/yyyy (default: false)
  sx = {},
  ...props
}, ref) => {

  // Use dd/mm/yyyy by default, dd/mm/yy if shortYear is true
  const dateFormat = shortYear ? 'DD/MM/YY' : 'DD/MM/YYYY';

  // Convert string value to dayjs object if needed, with proper validation
  const dayjsValue = useMemo(() => {
    if (!value) return null;

    if (dayjs.isDayjs(value)) {
      return value.isValid() ? value : null;
    }

    // Handle Date objects
    if (value instanceof Date) {
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed : null;
    }

    // Handle strings and other values
    try {
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed : null;
    } catch (error) {
      console.warn('DatePicker: Invalid date value provided:', value);
      return null;
    }
  }, [value]);

  // Handle change - ensure we return the format expected by the parent
  const handleChange = (newValue) => {
    if (onChange) {
      // Validate the new value first
      if (!newValue || !dayjs.isDayjs(newValue) || !newValue.isValid()) {
        onChange(null);
        return;
      }

      // If parent expects dayjs object, return dayjs
      // If parent expects string, return ISO string
      if (typeof value === 'string' || value === null || value === undefined) {
        const isoString = newValue.format('YYYY-MM-DD');
        onChange(isoString);
      } else {
        onChange(newValue);
      }
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        ref={ref}
        label={label}
        value={dayjsValue}
        onChange={handleChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        format={dateFormat}
        slotProps={{
          textField: {
            fullWidth,
            error,
            helperText,
            placeholder: shortYear ? 'dd/mm/yy' : 'dd/mm/yyyy',
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
  format: PropTypes.string, // Will be overridden
  shortYear: PropTypes.bool, // Use dd/mm/yy instead of dd/mm/yyyy (default: false)
  sx: PropTypes.object,
};

export default DatePicker;
