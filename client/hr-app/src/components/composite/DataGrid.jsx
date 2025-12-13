import React from 'react';
import { Box, Grid, CircularProgress, Typography } from '@mui/material';
import { Inbox } from '@mui/icons-material';
import { designTokens } from '../../theme/designTokens';

/**
 * DataGrid Component
 * 
 * Responsive grid layout for dashboard widgets with loading and empty states.
 * Supports different widget sizes and automatically adjusts to viewport.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Grid items (widgets) to display
 * @param {boolean} [props.loading=false] - Whether to show loading state
 * @param {boolean} [props.empty=false] - Whether to show empty state
 * @param {string} [props.emptyMessage='No data available'] - Message to show in empty state
 * @param {number} [props.spacing=3] - Spacing between grid items (in theme spacing units)
 * @param {Object} [props.sx] - Additional MUI sx prop for styling
 */
const DataGrid = ({
  children,
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  spacing = 3,
  sx = {}
}) => {
  // Loading State
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
          ...sx
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 2,
              fontSize: designTokens.typography.fontSize.sm,
            }}
          >
            Loading...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Empty State
  if (empty || !children || (Array.isArray(children) && children.length === 0)) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
          ...sx
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <Inbox
            sx={{
              fontSize: 64,
              color: 'text.disabled',
              mb: 2,
            }}
          />
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontWeight: designTokens.typography.fontWeight.medium,
              fontSize: designTokens.typography.fontSize.md,
              mb: 1,
            }}
          >
            {emptyMessage}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: designTokens.typography.fontSize.sm,
            }}
          >
            There are no items to display at this time.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Grid Layout
  return (
    <Grid
      container
      spacing={spacing}
      sx={{
        ...sx
      }}
    >
      {children}
    </Grid>
  );
};

/**
 * DataGridItem Component
 * 
 * Individual grid item wrapper with responsive sizing.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to display in the grid item
 * @param {'small'|'medium'|'large'|'full'} [props.size='medium'] - Size of the grid item
 * @param {Object} [props.sx] - Additional MUI sx prop for styling
 */
export const DataGridItem = ({
  children,
  size = 'medium',
  sx = {}
}) => {
  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { xs: 12, sm: 6, md: 4, lg: 3 };
      case 'medium':
        return { xs: 12, sm: 6, md: 6, lg: 4 };
      case 'large':
        return { xs: 12, sm: 12, md: 8, lg: 6 };
      case 'full':
        return { xs: 12 };
      default:
        return { xs: 12, sm: 6, md: 6, lg: 4 };
    }
  };

  return (
    <Grid size={getSizeProps()} sx={{ display: 'flex', ...sx }}>
      {children}
    </Grid>
  );
};

export default DataGrid;
