/**
 * Standardized Tabs Component
 * 
 * A wrapper around MUI Tabs with consistent styling.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Tabs as MuiTabs, Tab, Box } from '@mui/material';
import { designTokens } from '../../theme/designTokens';

const Tabs = ({
  tabs,
  defaultValue = 0,
  onChange,
  variant = 'standard',
  orientation = 'horizontal',
  sx = {},
}) => {
  const [value, setValue] = useState(defaultValue);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <Box sx={{ width: '100%', ...sx }}>
      <MuiTabs
        value={value}
        onChange={handleChange}
        variant={variant}
        orientation={orientation}
        sx={{
          borderBottom: orientation === 'horizontal' ? '1px solid' : 'none',
          borderRight: orientation === 'vertical' ? '1px solid' : 'none',
          borderColor: 'divider',
          
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: designTokens.typography.fontWeight.medium,
            fontSize: designTokens.typography.fontSize.md,
            minHeight: 48,
            transition: 'all 0.2s ease-in-out',
            
            '&:hover': {
              bgcolor: 'action.hover',
            },
            
            '&.Mui-selected': {
              fontWeight: designTokens.typography.fontWeight.semibold,
            },
          },
          
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: designTokens.borderRadius.pill,
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={tab.label}
            icon={tab.icon}
            iconPosition={tab.iconPosition || 'start'}
            disabled={tab.disabled}
          />
        ))}
      </MuiTabs>
      
      {tabs.map((tab, index) => (
        <Box
          key={index}
          role="tabpanel"
          hidden={value !== index}
          sx={{
            padding: designTokens.spacing.lg,
          }}
        >
          {value === index && tab.content}
        </Box>
      ))}
    </Box>
  );
};

Tabs.propTypes = {
  /** Tab definitions */
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
      icon: PropTypes.node,
      iconPosition: PropTypes.oneOf(['start', 'end', 'top', 'bottom']),
      disabled: PropTypes.bool,
    })
  ).isRequired,
  
  /** Default selected tab index */
  defaultValue: PropTypes.number,
  
  /** Change handler */
  onChange: PropTypes.func,
  
  /** Tabs variant */
  variant: PropTypes.oneOf(['standard', 'scrollable', 'fullWidth']),
  
  /** Tabs orientation */
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),
  
  /** Custom styles */
  sx: PropTypes.object,
};

export default Tabs;
