import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { designTokens } from '../../theme/designTokens';

/**
 * FormSection Component
 * 
 * Wrapper for form field groups with section title and description.
 * Provides consistent spacing and visual separation between form sections.
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} [props.description] - Optional description text
 * @param {React.ReactNode} props.children - Form fields to display in this section
 * @param {boolean} [props.divider=true] - Whether to show a divider after the section
 * @param {Object} [props.sx] - Additional MUI sx prop for styling
 */
const FormSection = ({
  title,
  description,
  children,
  divider = true,
  sx = {}
}) => {
  return (
    <Box
      sx={{
        mb: 4,
        ...sx
      }}
    >
      {/* Section Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontWeight: designTokens.typography.fontWeight.semibold,
            fontSize: designTokens.typography.fontSize.lg,
            mb: description ? 1 : 0,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: designTokens.typography.fontSize.sm,
              lineHeight: 1.6,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {/* Form Fields */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {children}
      </Box>

      {/* Divider */}
      {divider && (
        <Divider sx={{ mt: 4 }} />
      )}
    </Box>
  );
};

export default FormSection;
