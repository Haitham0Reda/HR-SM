/**
 * Custom DateInput Component with dd/mm/yy format
 * 
 * A TextField wrapper that handles dd/mm/yy date format input and validation
 * Includes a clickable calendar icon that opens a native date picker
 */

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { formatDateForInput, parseDateInput } from '../../utils/formatters';

// Enable custom parse format plugin
dayjs.extend(customParseFormat);

const DateInput = React.forwardRef(({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  shortYear = false, // Changed: now shortYear instead of fullYear, defaults to false (full year)
  placeholder,
  minDate,
  maxDate,
  ...props
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const hiddenDateInputRef = useRef(null);

  // Format for display (dd/mm/yyyy by default, dd/mm/yy if shortYear is true)
  const dateFormat = shortYear ? 'DD/MM/YY' : 'DD/MM/YYYY';
  const placeholderText = placeholder || (shortYear ? 'dd/mm/yy' : 'dd/mm/yyyy');

  // Update input value when prop value changes
  useEffect(() => {
    if (value) {
      const formatted = formatDateForInput(value, shortYear);
      setInputValue(formatted);
    } else {
      setInputValue('');
    }
  }, [value, shortYear]);

  // Handle input change
  const handleInputChange = (event) => {
    const rawValue = event.target.value;
    setInputValue(rawValue);

    // Clear error state when user starts typing
    if (inputError) {
      setInputError(false);
    }

    // Try to parse the input
    if (rawValue) {
      const parsed = parseDateInput(rawValue);
      if (parsed) {
        // Valid date - call onChange with ISO format
        onChange && onChange({
          target: {
            name: event.target.name,
            value: parsed
          }
        });
      } else {
        // Invalid date - set error state
        setInputError(true);
      }
    } else {
      // Empty input
      onChange && onChange({
        target: {
          name: event.target.name,
          value: ''
        }
      });
    }
  };

  // Handle blur - format the input if valid
  const handleBlur = (event) => {
    if (inputValue) {
      const parsed = parseDateInput(inputValue);
      if (parsed) {
        const formatted = formatDateForInput(parsed, shortYear);
        setInputValue(formatted);
        setInputError(false);
      } else {
        setInputError(true);
      }
    }
    
    // Call original onBlur if provided
    props.onBlur && props.onBlur(event);
  };

  // Handle calendar icon click - open native date picker
  const handleCalendarClick = () => {
    if (!disabled && hiddenDateInputRef.current) {
      try {
        // Try to use the modern showPicker API
        if (hiddenDateInputRef.current.showPicker) {
          hiddenDateInputRef.current.showPicker();
        } else {
          // Fallback: focus and click the input
          hiddenDateInputRef.current.focus();
          hiddenDateInputRef.current.click();
        }
      } catch (error) {
        console.warn('Could not open date picker:', error);
        // Final fallback: just focus the hidden input
        hiddenDateInputRef.current.focus();
      }
    }
  };

  // Handle native date picker change
  const handleNativeDateChange = (event) => {
    const selectedDate = event.target.value; // This will be in YYYY-MM-DD format
    if (selectedDate) {
      const formatted = formatDateForInput(selectedDate, shortYear);
      setInputValue(formatted);
      setInputError(false);
      
      // Call onChange with ISO format
      onChange && onChange({
        target: {
          name: props.name || event.target.name,
          value: selectedDate
        }
      });
    }
  };

  const hasError = error || inputError;
  const errorText = helperText || (inputError ? `Please enter date in ${dateFormat} format` : '');

  return (
    <div style={{ position: 'relative' }}>
      <TextField
        ref={ref}
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        error={hasError}
        helperText={errorText}
        required={required}
        disabled={disabled}
        placeholder={placeholderText}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleCalendarClick}
                disabled={disabled}
                size="small"
                aria-label="Open calendar"
                title="Click to open date picker"
              >
                <CalendarTodayIcon color={disabled ? 'disabled' : 'action'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        inputProps={{
          pattern: shortYear ? '\\d{2}/\\d{2}/\\d{2}' : '\\d{2}/\\d{2}/\\d{4}',
          maxLength: shortYear ? 8 : 10,
        }}
        {...props}
      />
      
      {/* Hidden native date input for calendar picker */}
      <input
        ref={hiddenDateInputRef}
        type="date"
        value={value || ''}
        onChange={handleNativeDateChange}
        min={minDate}
        max={maxDate}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
          zIndex: -1,
        }}
        tabIndex={-1}
      />
    </div>
  );
});

DateInput.displayName = 'DateInput';

DateInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string, // ISO date string (YYYY-MM-DD)
  onChange: PropTypes.func,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  shortYear: PropTypes.bool, // Use dd/mm/yy instead of dd/mm/yyyy (default: false)
  placeholder: PropTypes.string,
  onBlur: PropTypes.func,
  minDate: PropTypes.string, // ISO date string for minimum date
  maxDate: PropTypes.string, // ISO date string for maximum date
  name: PropTypes.string,
};

export default DateInput;