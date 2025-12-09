/**
 * DashboardPage Template
 * 
 * A reusable template for dashboard pages with stat cards, widgets, and responsive grid layout.
 * 
 * Features:
 * - Consistent layout structure
 * - Stat cards for key metrics
 * - Widget grid with responsive sizing
 * - Loading and empty states
 * - Customizable actions
 * - Responsive design
 * 
 * Usage:
 * ```jsx
 * <DashboardPage
 *   title="Dashboard"
 *   stats={stats}
 *   widgets={widgets}
 *   loading={loading}
 * />
 * ```
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { spacing } from '../../theme/designTokens';
import StatCard from '../composite/StatCard';
import DataGrid, { DataGridItem } from '../composite/DataGrid';

const DashboardPage = ({
  title = 'Dashboard',
  subtitle,
  stats = [],
  widgets = [],
  loading = false,
  error = null,
  onRefresh,
  onSettings,
  actions,
  emptyMessage = 'No dashboard data available',
  showStats = true,
  statsSpacing = 3,
  widgetsSpacing = 3,
}) => {
  return (
    <Box sx={{ padding: spacing(3) }}>
      {/* Header */}
      <Box sx={{ marginBottom: spacing(3) }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            {onRefresh && (
              <IconButton onClick={onRefresh} size="small" disabled={loading}>
                <RefreshIcon />
              </IconButton>
            )}
            {onSettings && (
              <IconButton onClick={onSettings} size="small">
                <SettingsIcon />
              </IconButton>
            )}
            {actions}
          </Stack>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ marginBottom: spacing(3) }}>
          {error}
        </Alert>
      )}

      {/* Stats Section */}
      {showStats && stats.length > 0 && (
        <Box sx={{ marginBottom: spacing(4) }}>
          <DataGrid loading={loading} spacing={statsSpacing}>
            {stats.map((stat, index) => (
              <DataGridItem key={stat.id || index} size={stat.size || 'small'}>
                <StatCard
                  icon={stat.icon}
                  label={stat.label}
                  value={stat.value}
                  trend={stat.trend}
                  color={stat.color || 'primary'}
                />
              </DataGridItem>
            ))}
          </DataGrid>
        </Box>
      )}

      {/* Widgets Section */}
      <DataGrid
        loading={loading && stats.length === 0}
        empty={!loading && widgets.length === 0}
        emptyMessage={emptyMessage}
        spacing={widgetsSpacing}
      >
        {widgets.map((widget, index) => (
          <DataGridItem key={widget.id || index} size={widget.size || 'medium'}>
            {widget.content}
          </DataGridItem>
        ))}
      </DataGrid>
    </Box>
  );
};

DashboardPage.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      icon: PropTypes.node.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      trend: PropTypes.shape({
        value: PropTypes.number.isRequired,
        direction: PropTypes.oneOf(['up', 'down']).isRequired,
      }),
      color: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info']),
      size: PropTypes.oneOf(['small', 'medium', 'large', 'full']),
    })
  ),
  widgets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      content: PropTypes.node.isRequired,
      size: PropTypes.oneOf(['small', 'medium', 'large', 'full']),
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRefresh: PropTypes.func,
  onSettings: PropTypes.func,
  actions: PropTypes.node,
  emptyMessage: PropTypes.string,
  showStats: PropTypes.bool,
  statsSpacing: PropTypes.number,
  widgetsSpacing: PropTypes.number,
};

export default DashboardPage;
