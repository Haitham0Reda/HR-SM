import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { designTokens } from '../../theme/designTokens';

/**
 * StatCard Component
 * 
 * Displays key metrics and statistics with icon, label, value, and optional trend indicator.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon to display in the avatar
 * @param {string} props.label - Label describing the statistic
 * @param {string|number} props.value - The statistic value to display
 * @param {Object} [props.trend] - Optional trend information
 * @param {number} props.trend.value - Percentage change value
 * @param {'up'|'down'} props.trend.direction - Direction of the trend
 * @param {'primary'|'secondary'|'success'|'error'|'warning'|'info'} [props.color='primary'] - Color theme for the icon
 * @param {Object} [props.sx] - Additional MUI sx prop for styling
 */
const StatCard = ({ 
  icon, 
  label, 
  value, 
  trend, 
  color = 'primary',
  sx = {}
}) => {
  const getTrendColor = () => {
    if (!trend) return null;
    return trend.direction === 'up' ? 'success.main' : 'error.main';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend.direction === 'up' ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />;
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: designTokens.borderRadius.lg,
        border: `1px solid`,
        borderColor: 'divider',
        transition: `box-shadow ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}, transform ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}`,
        '&:hover': {
          boxShadow: designTokens.shadows.md,
          transform: 'translateY(-2px)',
        },
        ...sx
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Icon */}
        <Avatar
          sx={{
            bgcolor: `${color}.main`,
            width: 56,
            height: 56,
          }}
        >
          {icon}
        </Avatar>

        {/* Label */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontWeight: designTokens.typography.fontWeight.medium,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: designTokens.typography.fontSize.sm,
          }}
        >
          {label}
        </Typography>

        {/* Value */}
        <Typography
          variant="h3"
          component="div"
          sx={{
            fontWeight: designTokens.typography.fontWeight.bold,
            fontSize: designTokens.typography.fontSize.xxl,
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>

        {/* Trend Indicator */}
        {trend && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: getTrendColor(),
            }}
          >
            {getTrendIcon()}
            <Typography
              variant="body2"
              sx={{
                fontWeight: designTokens.typography.fontWeight.semibold,
                fontSize: designTokens.typography.fontSize.sm,
              }}
            >
              {Math.abs(trend.value)}%
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: designTokens.typography.fontSize.sm,
              }}
            >
              vs last period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
